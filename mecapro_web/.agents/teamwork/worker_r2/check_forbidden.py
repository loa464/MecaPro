import re
import os

FORBIDDEN_WORDS = [
    'vibecoding', 'taste-skill', 'ui-ux-pro-max', 'emil-design', '21st.dev',
    'haptic', 'scandinavian', 'netbeans', 'jdialog', 'jtabbedpane',
    'frmprincipal', 'panelinicio', '===='
]

FILES = [
    'public/index.html',
    'public/css/styles.css',
    'server.py',
    'firebase.json'
]

print("=== CHECKING FORBIDDEN TERMS ===")
for path in FILES:
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for word in FORBIDDEN_WORDS:
        matches = list(re.finditer(re.escape(word), content, re.IGNORECASE))
        if matches:
            print(f"[{path}] Found '{word}' ({len(matches)} matches) at positions: {[m.start() for m in matches[:5]]}")

print("\n=== CHECKING EMOJIS ===")
emoji_pattern = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F1E0-\U0001F1FF"  # flags (iOS)
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"
    "\U0001FA70-\U0001FAFF"
    "]+", flags=re.UNICODE
)

for path in FILES:
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    emojis = emoji_pattern.findall(content)
    if emojis:
        print(f"[{path}] Found emojis: {set(emojis)}")
    else:
        print(f"[{path}] 0 emojis found")
