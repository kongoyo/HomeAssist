import json
import logging
import threading
from flask import Flask, request, Response
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

_LOGGER = logging.getLogger(__name__)

DOMAIN = "google_cookie_login"
COOKIE_PATH = "/config/google_maps_cookies.json"
FLASK_PORT = 5000

app = Flask(__name__)
login_done = threading.Event()
captured_cookies = []

# Global driver variable to access from Flask routes
driver = None

@app.route("/proxy")
def proxy():
    url = request.args.get("url")
    if not url:
        return "Missing url parameter", 400

    if driver is None:
        return "Selenium driver not initialized", 500

    # Fetch the requested URL using selenium, then return page source
    driver.get(url)
    return Response(driver.page_source, mimetype="text/html")

@app.route("/callback")
def callback():
    global captured_cookies
    captured_cookies: list[dict[str, str]] = driver.get_cookies()
    login_done.set()
    return "✅ Login successful! You can close this tab now."

def run_flask():
    # Run Flask server in thread; accessible on all interfaces
    app.run(host="0.0.0.0", port=FLASK_PORT)

def setup(hass, config):
    hass.services.register(DOMAIN, "login", lambda call: handle_login_service())
    return True

def handle_login_service():
    global driver
    _LOGGER.info("Starting Google login session with proxy...")

    # Start Flask server thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Selenium options - visible browser for full login UI
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    # Remove headless to see browser UI:
    # chrome_options.add_argument("--headless=new")
    chrome_options.binary_location = "/usr/bin/chromium-browser"

    service = Service("/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        login_url = "https://accounts.google.com/ServiceLogin"
        proxy_url = f"http://<your-HA-IP>:{FLASK_PORT}/proxy?url={login_url}"
        _LOGGER.info(f"Open this URL in your browser to log in:\n{proxy_url}")

        # Wait for login to complete (trigger /callback)
        login_done.wait(timeout=300)

        if captured_cookies:
            with open(COOKIE_PATH, "w") as f:
                json.dump(captured_cookies, f)
            _LOGGER.info(f"✅ Cookies saved to {COOKIE_PATH}")
        else:
            _LOGGER.error("❌ Login not completed or cookies not captured.")

    except Exception as e:
        _LOGGER.error(f"Error during login: {e}")

    finally:
        driver.quit()