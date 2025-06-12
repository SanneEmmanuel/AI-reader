import Fastify from 'fastify';
import cors from '@fastify/cors';
import { chromium } from 'playwright';
import { v4 as uuidv4 } from 'uuid';

const fastify = Fastify({ logger: true });
await fastify.register(cors);

// In-memory stores
const apiKeys = new Map(); // apiKey => { usesLeft: 2 }
const sessions = new Map(); // name => { browser, context, page, apiKey }

// Generate API key endpoint
fastify.post('/API/sanne', async (request, reply) => {
  const key = uuidv4();
  apiKeys.set(key, { usesLeft: 2 });
  return { api_key: key };
});

// Middleware: check API key
fastify.addHook('preHandler', async (request, reply) => {
  if (request.routerPath === '/API/sanne') return;
  const apiKey = request.headers['x-api-key'];
  if (!apiKey || !apiKeys.has(apiKey)) {
    reply.code(401).send({ error: 'Invalid or missing API key' });
    return;
  }
  request.apiKey = apiKey;
});

// POST /read to start reading
fastify.post('/read', async (request, reply) => {
  const { name, url } = request.body;
  if (!name || !url) {
    return reply.code(400).send({ error: 'Missing name or url' });
  }
  if (sessions.has(name)) {
    return reply.code(400).send({ error: 'Session name already exists' });
  }

  // Check API key usage
  const keyData = apiKeys.get(request.apiKey);
  if (keyData.usesLeft <= 0) {
    return reply.code(403).send({ error: 'API key usage limit reached' });
  }

  keyData.usesLeft -= 1;

  // Launch headless browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Function to simulate smooth scrolling over ~1-3 minutes
  const scrollSimulate = async () => {
    const totalHeight = await page.evaluate(() => document.body.scrollHeight);
    let current = 0;
    const interval = 500; // ms
    const scrollStep = totalHeight / (120000 / interval); // scroll over 2 minutes approx

    while (current < totalHeight) {
      await page.evaluate((pos) => window.scrollTo(0, pos), current);
      await new Promise(r => setTimeout(r, interval + Math.random() * 300)); // jittered delay
      current += scrollStep;
    }

    // Scroll back up gently
    current = totalHeight;
    while (current > 0) {
      await page.evaluate((pos) => window.scrollTo(0, pos), current);
      await new Promise(r => setTimeout(r, interval + Math.random() * 300));
      current -= scrollStep / 2;
    }
  };

  // Start continuous reading simulation loop
  let active = true;
  const loop = async () => {
    while (active) {
      try {
        await scrollSimulate();
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 4000)); // random pause
      } catch (e) {
        fastify.log.error(e);
        break;
      }
    }
  };

  loop();

  sessions.set(name, { browser, context, page, apiKey: request.apiKey, stop: () => { active = false; } });

  return { message: `Started reading session "${name}" on ${url}` };
});

// POST /end to stop session
fastify.post('/end', async (request, reply) => {
  const { name } = request.body;
  if (!name) return reply.code(400).send({ error: 'Missing name' });
  if (!sessions.has(name)) return reply.code(404).send({ error: 'No such session' });

  const session = sessions.get(name);
  if (session.apiKey !== request.apiKey) {
    return reply.code(403).send({ error: 'Not authorized to stop this session' });
  }

  session.stop();
  await session.page.close();
  await session.context.close();
  await session.browser.close();
  sessions.delete(name);

  return { message: `Stopped reading session "${name}"` };
});

// GET /users/list
fastify.get('/users/list', async () => {
  const active_users = [];
  for (const [name, session] of sessions.entries()) {
    active_users.push({ name, api_key: session.apiKey });
  }
  return { active_users };
});

const PORT = process.env.PORT || 8000;
fastify.listen({ port: PORT, host: '0.0.0.0' });
