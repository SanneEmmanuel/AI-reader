from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import threading
import time
import random
import pyautogui
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
import secrets

app = FastAPI()

app.mount("/src", StaticFiles(directory="src"), name="static")

# Session and key tracking (thread-safe with lock)
active_sessions = {}    # name -> True/False
user_owners = {}        # name -> api_key
api_keys = {}           # api_key -> usage_count
session_lock = threading.Lock()

# Models
class ReadRequest(BaseModel):
    name: str
    url: str

class EndRequest(BaseModel):
    name: str

# Routes

@app.get("/", response_class=HTMLResponse)
def serve_index():
    with open("src/index.html", "r", encoding="utf-8") as file:
        return file.read()

@app.post("/API/sanne")
def generate_api_key():
    key = secrets.token_hex(16)
    with session_lock:
        api_keys[key] = 0
    return {"api_key": key}

def validate_api_key(key: str):
    with session_lock:
        if key not in api_keys:
            raise HTTPException(status_code=401, detail="Invalid or missing API key")
        if api_keys[key] >= 2:
            raise HTTPException(status_code=403, detail="API key usage limit reached")
        api_keys[key] += 1

def simulate_reading_loop(name: str, url: str):
    try:
        options = uc.ChromeOptions()
        options.add_argument("--start-maximized")
        driver = uc.Chrome(options=options)
        driver.get(url)
        time.sleep(random.uniform(3, 6))

        while True:
            with session_lock:
                if not active_sessions.get(name):
                    break

            paragraphs = driver.find_elements(By.TAG_NAME, 'p')
            for para in paragraphs:
                with session_lock:
                    if not active_sessions.get(name):
                        break

                words = para.text.split()
                for i in range(0, len(words), random.randint(10, 20)):
                    with session_lock:
                        if not active_sessions.get(name):
                            break
                    pyautogui.moveTo(
                        random.randint(300, 800), random.randint(300, 600),
                        duration=random.uniform(0.2, 0.5)
                    )
                    pyautogui.scroll(-1 * random.randint(3, 6))
                    time.sleep(random.uniform(0.6, 1.5))

            time.sleep(random.uniform(5, 10))

        driver.quit()
        print(f"[INFO] Reading session for '{name}' ended.")

    except Exception as e:
        print(f"[ERROR] Reading session for '{name}' failed: {e}")
    finally:
        with session_lock:
            active_sessions.pop(name, None)
            user_owners.pop(name, None)

@app.post("/read")
def start_reading(
    request: ReadRequest,
    x_api_key: str = Header(None)
):
    validate_api_key(x_api_key)

    with session_lock:
        if request.name in active_sessions:
            raise HTTPException(status_code=400, detail="Reader with this name is already active.")
        active_sessions[request.name] = True
        user_owners[request.name] = x_api_key

    thread = threading.Thread(
        target=simulate_reading_loop,
        args=(request.name, request.url),
        daemon=True
    )
    thread.start()

    return {"message": f"Reading started for '{request.name}'."}

@app.post("/end")
def stop_reading(
    request: EndRequest,
    x_api_key: str = Header(None)
):
    with session_lock:
        if request.name not in active_sessions:
            raise HTTPException(status_code=404, detail="No active reader found with this name.")
        if x_api_key != user_owners.get(request.name):
            raise HTTPException(status_code=403, detail="You are not authorized to stop this session.")
        active_sessions[request.name] = False

    return {"message": f"Reading session for '{request.name}' has been stopped."}

@app.get("/users/list")
def list_users():
    with session_lock:
        return {
            "active_users": [
                {"name": name, "api_key": user_owners[name]}
                for name in active_sessions if active_sessions[name]
            ]
        }
