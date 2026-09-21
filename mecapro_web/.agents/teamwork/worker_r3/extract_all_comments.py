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

all_comments = []

for rel in files:
    path = os.path.join(BASE_DIR, rel)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.splitlines()

    print(f"\n=================== ALL COMMENTS IN {rel} ===================")
    # JS/CSS/Python comments
    if rel.endswith('.py'):
        for i, line in enumerate(lines, 1):
            if '#' in line:
                comment_part = line[line.index('#'):]
                print(f"{i}: {comment_part}")
    elif rel.endswith('.js'):
        for i, line in enumerate(lines, 1):
            s = line.strip()
            if s.startswith('//'):
                print(f"{i}: {s}")
            elif '//' in line and not ('://' in line or '"://' in line):
                print(f"{i}: {line[line.index('//'):]}")
    elif rel.endswith('.css'):
        matches = re.finditer(r'/\*.*?\*/', content, re.DOTALL)
        for m in matches:
            print(m.group(0))
    elif rel.endswith('.html'):
        matches = re.finditer(r'<!--.*?-->', content, re.DOTALL)
        for m in matches:
            print(m.group(0))
