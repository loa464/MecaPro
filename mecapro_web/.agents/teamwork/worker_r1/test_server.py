import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    print("Health response:", res.status_code, res.json())
    assert res.status_code == 200

def test_index():
    res = client.get("/")
    print("Index response:", res.status_code, len(res.content))
    assert res.status_code == 200

def test_index_html():
    res = client.get("/index.html")
    print("Index.html response:", res.status_code, len(res.content))
    assert res.status_code == 200

def test_static_files():
    res_css = client.get("/css/styles.css")
    print("CSS response:", res_css.status_code, res_css.headers.get("content-type"))
    assert res_css.status_code == 200

    res_js_app = client.get("/js/app.js")
    print("JS app response:", res_js_app.status_code, res_js_app.headers.get("content-type"))
    assert res_js_app.status_code == 200

    res_js_data = client.get("/js/data.js")
    print("JS data response:", res_js_data.status_code, res_js_data.headers.get("content-type"))
    assert res_js_data.status_code == 200

    res_styles = client.get("/styles.css")
    print("Root styles response:", res_styles.status_code, res_styles.headers.get("content-type"))
    assert res_styles.status_code == 200

    res_logo = client.get("/LOGO.jpg")
    print("Logo response:", res_logo.status_code, res_logo.headers.get("content-type"))
    assert res_logo.status_code == 200

    res_preview = client.get("/preview_comparativa.html")
    print("Preview response:", res_preview.status_code)
    assert res_preview.status_code == 200

if __name__ == "__main__":
    test_health()
    test_index()
    test_index_html()
    test_static_files()
    print("All server tests passed!")
