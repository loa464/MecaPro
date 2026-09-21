import os
import re

BASE_DIR = r"c:\Users\Loa\Documents\Integrador\mecapro_web"

files = [
    "public/js/app.js",
    "public/js/data.js",
    "public/css/styles.css",
    "public/index.html",
    "server.py"
]

for rel in files:
    path = os.path.join(BASE_DIR, rel)
    print(f"\n=================== COMMENTS IN {rel} ===================")
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        # Find single line comments or start of block comments
        if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*') or stripped.startswith('#') or stripped.startswith('<!--'):
            if any(k in stripped for k in ['===', '---', '***', 'TODO', 'FIXME', 'NOTE', 'SECTION', 'MODULE', 'CONTROLLER', 'API', 'UI', 'STATE', 'HELPER', 'ROUTER', 'VIEW', 'MODAL', 'EVENT', 'INIT', 'CONFIG']):
                print(f"Line {idx}: {stripped}")
            elif len(stripped) > 50 or stripped.isupper():
                print(f"Line {idx}: {stripped}")
