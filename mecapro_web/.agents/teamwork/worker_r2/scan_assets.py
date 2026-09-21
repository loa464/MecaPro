import os
import re

html_path = 'public/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

src_matches = re.findall(r'src=["\']([^"\']+)["\']', content)
href_matches = re.findall(r'href=["\']([^"\']+)["\']', content)

print("=== SRC ATTRIBUTES ===")
for s in sorted(set(src_matches)):
    is_external = s.startswith('http://') or s.startswith('https://') or s.startswith('//')
    if is_external:
        print(f"[EXT] {s}")
    else:
        # Check in public folder
        local_path = os.path.join('public', s.lstrip('/\\'))
        exists = os.path.exists(local_path)
        print(f"[{'OK' if exists else 'MISSING'}] {s} (resolved: {local_path})")

print("\n=== HREF ATTRIBUTES ===")
for h in sorted(set(href_matches)):
    if h.startswith('#') or h.startswith('javascript:'):
        continue
    is_external = h.startswith('http://') or h.startswith('https://') or h.startswith('//')
    if is_external:
        print(f"[EXT] {h}")
    else:
        local_path = os.path.join('public', h.lstrip('/\\'))
        exists = os.path.exists(local_path)
        print(f"[{'OK' if exists else 'MISSING'}] {h} (resolved: {local_path})")
