Here is your `README.md` for **AI-Reader by Dr Sanne Karibo**:

---

# 📖 AI-Reader

### by Dr Sanne Karibo

**AI-Reader** is a FastAPI-based tool that simulates human-like reading behavior on websites using browser automation. It includes an API-secured backend, a built-in HTML frontend, and support for multiple concurrent reading sessions.

---

## 🚀 Features

* Simulates realistic human scrolling, movement, and pacing
* API key system for controlled access
* Each API key is limited to two `/read` calls
* Multi-session support with named readers
* View active users and their associated API keys
* Simple browser frontend for triggering sessions

---

## 📁 Project Structure

```
AI-Reader/
├── main.py              # FastAPI backend and core logic
├── requirements.txt     # Python dependencies
├── src/
│   └── index.html       # Frontend user interface
```

---

## 📦 Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd AI-Reader
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Run the server**

```bash
uvicorn main:app --reload
```

> Ensure Google Chrome is installed and `pyautogui` is allowed to control your mouse.

---

## 🌐 Frontend Access

Visit the homepage at:
**[http://localhost:8000](http://localhost:8000)**

Use the UI to:

* Enter a session name and URL
* Start/stop a reading session
* Monitor reading activity

---

## 🔐 API Usage

### 1. Generate API Key

```
POST /API/sanne
```

**Response:**

```json
{ "api_key": "abc123..." }
```

---

### 2. Start a Reading Session

```
POST /read
Headers:
  X-API-Key: <your_api_key>
Body (JSON):
{
  "name": "session1",
  "url": "https://example.com"
}
```

> Each API key is valid for only **2 read calls**

---

### 3. Stop a Reading Session

```
POST /end
Headers:
  X-API-Key: <your_api_key>
Body (JSON):
{
  "name": "session1"
}
```

> Only the API key that created the session can stop it.

---

### 4. View Active Users

```
GET /users/list
```

**Response:**

```json
{
  "active_users": [
    { "name": "session1", "api_key": "abc123..." },
    ...
  ]
}
```

---

## 📋 Requirements

* Python 3.8+
* Google Chrome (latest)
* Mouse and screen access for `pyautogui`

---

## 🧑‍💻 Author

**Dr Sanne Karibo**
Creator of AI-Reader – Human behavior simulation meets automation.

---

Would you like this version saved as a file or published to GitHub with version control and environment setup?
