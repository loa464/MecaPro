import os
import re

css_path = 'public/css/styles.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

urls = re.findall(r'url\s*\(\s*["\']?([^"\'\)]+)["\']?\s*\)', css)
imports = re.findall(r'@import\s+["\']([^"\']+)["\']', css)

print("CSS URLs:", urls)
print("CSS Imports:", imports)

for u in urls:
    if u.startswith('data:'):
        print(f"Data URI: length {len(u)}")
        continue
    if u.startswith('http://') or u.startswith('https://'):
        print(f"External URL: {u}")
        continue
    local_path = os.path.normpath(os.path.join(os.path.dirname(css_path), u))
    exists = os.path.exists(local_path)
    print(f"Local URL: {u} -> exists: {exists} ({local_path})")
