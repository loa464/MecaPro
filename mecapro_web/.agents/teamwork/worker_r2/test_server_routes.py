import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

routes_to_test = [
    ("/", 200),
    ("/index.html", 200),
    ("/styles.css", 200),
    ("/favicon.ico", 200),
    ("/assets/logo_white.png", 200),
    ("/assets/logo_badge.png", 200),
    ("/js/app.js", 200),
    ("/js/data.js", 200),
    ("/css/styles.css", 200),
]

failed = False
print("Testing Server Static Routes:")
for path, expected_status in routes_to_test:
    res = client.get(path)
    status_match = (res.status_code == expected_status)
    print(f"  {path} -> Status {res.status_code} (expected {expected_status}): {'PASS' if status_match else 'FAIL'}")
    if not status_match:
        failed = True

if failed:
    sys.exit(1)
else:
    print("All static routes returned expected status 200!")
