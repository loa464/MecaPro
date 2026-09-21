import os
import shutil
import hashlib
import re
import unicodedata
import subprocess

BASE_DIR = r"c:\Users\Loa\Documents\Integrador\mecapro_web"

FORBIDDEN_TERMS = [
    "vibecoding",
    "taste-skill",
    "ui-ux-pro-max",
    "emil-design",
    "21st.dev",
    "omnibox",
    "haptic",
    "scandinavian",
    "netbeans",
    "jdialog",
    "jtabbedpane",
    "frmprincipal",
    "panelinicio",
    "===="
]

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def is_emoji(char):
    cp = ord(char)
    if (0x1F600 <= cp <= 0x1F64F or  # Emoticons
        0x1F300 <= cp <= 0x1F5FF or  # Misc Symbols and Pictographs
        0x1F680 <= cp <= 0x1F6FF or  # Transport and Map
        0x1F1E0 <= cp <= 0x1F1FF or  # Regional indicator symbols
        0x2600 <= cp <= 0x26FF or    # Misc symbols
        0x2700 <= cp <= 0x27BF or    # Dingbats
        0xFE00 <= cp <= 0xFE0F or    # Variation Selectors
        0x1F900 <= cp <= 0x1F9FF or  # Supplemental Symbols and Pictographs
        0x1FA70 <= cp <= 0x1FAFF):   # Symbols and Pictographs Extended-A
        return True
    cat = unicodedata.category(char)
    if cat == 'So' and cp > 0x2000:
        return True
    return False

def sync_files():
    print("--- 1. SYNCHRONIZING FILES ---")
    pairs = [
        ("public/index.html", "index.html"),
        ("public/css/styles.css", "css/styles.css"),
        ("public/css/styles.css", "styles.css"),
        ("public/css/styles.css", "public/styles.css"),
        ("public/js/app.js", "js/app.js"),
        ("public/js/data.js", "js/data.js")
    ]
    for src_rel, dst_rel in pairs:
        src = os.path.join(BASE_DIR, src_rel)
        dst = os.path.join(BASE_DIR, dst_rel)
        shutil.copy2(src, dst)
        src_hash = sha256_file(src)
        dst_hash = sha256_file(dst)
        assert src_hash == dst_hash, f"Hash mismatch between {src_rel} and {dst_rel}!"
        print(f"Synced {src_rel} -> {dst_rel} [SHA256: {src_hash[:16]}...]")

def verify_all():
    print("\n--- 2. VERIFYING ZERO FORBIDDEN TERMS & ZERO EMOJIS ---")
    files_to_check = [
        "public/index.html", "index.html",
        "public/css/styles.css", "css/styles.css", "styles.css", "public/styles.css",
        "public/js/app.js", "js/app.js",
        "public/js/data.js", "js/data.js",
        "server.py"
    ]

    total_forbidden = 0
    total_emojis = 0

    for rel in files_to_check:
        filepath = os.path.join(BASE_DIR, rel)
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()

        file_forbidden = 0
        file_emojis = 0

        for line_no, line in enumerate(lines, 1):
            for term in FORBIDDEN_TERMS:
                pattern = re.compile(re.escape(term), re.IGNORECASE)
                matches = pattern.findall(line)
                if matches:
                    file_forbidden += len(matches)
                    print(f"[{rel}:{line_no}] FORBIDDEN MATCH '{term}': {line.strip()[:80]}")

            emojis = [c for c in line if is_emoji(c)]
            if emojis:
                file_emojis += len(emojis)
                print(f"[{rel}:{line_no}] EMOJI MATCH '{''.join(emojis)}': {line.strip()[:80]}")

        total_forbidden += file_forbidden
        total_emojis += file_emojis
        print(f"{rel}: Forbidden={file_forbidden}, Emojis={file_emojis}")

    assert total_forbidden == 0, f"FAILED: Found {total_forbidden} forbidden matches!"
    assert total_emojis == 0, f"FAILED: Found {total_emojis} emoji matches!"
    print(f"\nSUCCESS: 0 forbidden matches and 0 emojis across all {len(files_to_check)} files!")

def verify_syntax():
    print("\n--- 3. VERIFYING SYNTAX COMPILATION ---")
    commands = [
        ["node", "-c", "public/js/app.js"],
        ["node", "-c", "public/js/data.js"],
        ["node", "-c", "js/app.js"],
        ["node", "-c", "js/data.js"],
        ["python", "-m", "py_compile", "server.py"]
    ]
    for cmd in commands:
        res = subprocess.run(cmd, cwd=BASE_DIR, capture_output=True, text=True)
        assert res.returncode == 0, f"Command {' '.join(cmd)} failed with code {res.returncode}:\n{res.stderr}"
        print(f"Command '{' '.join(cmd)}' passed with exit code 0.")

if __name__ == "__main__":
    sync_files()
    verify_all()
    verify_syntax()
    print("\n>>> ALL CHECKS PASSED PERFECTLY! <<<")
