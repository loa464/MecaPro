import os
import re

for js_name in ['app.js', 'data.js']:
    js_path = os.path.join('public', 'js', js_name)
    with open(js_path, 'r', encoding='utf-8') as f:
        code = f.read()

    matches = re.findall(r'["\']([^"\']+\.(?:png|jpg|jpeg|gif|svg|ico|webp)[^"\']*)["\']', code, re.IGNORECASE)
    print(f"\n=== Image/asset references in {js_name} ===")
    for m in set(matches):
        clean_path = m.split('?')[0]
        local_path = os.path.join('public', clean_path.lstrip('/\\'))
        exists = os.path.exists(local_path)
        print(f"[{'OK' if exists else 'MISSING'}] {m} (resolved: {local_path})")
