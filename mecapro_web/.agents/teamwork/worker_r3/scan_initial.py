import os
import re
import unicodedata

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

def is_emoji(char):
    # Check if character is emoji or symbol in emoji range
    cp = ord(char)
    # Common emoji ranges
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
    # Also check unicodedata category 'So' (Symbol, other) for things like checkmarks or sparkles if emoji
    cat = unicodedata.category(char)
    if cat == 'So' and cp > 0x2000:
        return True
    return False

def scan():
    print(f"Scanning project directory: {BASE_DIR}")
    files_to_scan = []
    for root, dirs, files in os.walk(BASE_DIR):
        # Exclude .git, .agents, node_modules
        if ".git" in root or ".agents" in root or "node_modules" in root or "__pycache__" in root:
            continue
        for f in files:
            if f.endswith(('.html', '.css', '.js', '.py')):
                files_to_scan.append(os.path.join(root, f))

    print(f"Found {len(files_to_scan)} source files to scan:")
    for f in files_to_scan:
        rel = os.path.relpath(f, BASE_DIR)
        print(f" - {rel}")

    total_forbidden = 0
    total_emojis = 0

    print("\n--- FORBIDDEN TERMS SCAN ---")
    for filepath in files_to_scan:
        rel = os.path.relpath(filepath, BASE_DIR)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except Exception as e:
            print(f"Error reading {rel}: {e}")
            continue

        for line_no, line in enumerate(lines, 1):
            for term in FORBIDDEN_TERMS:
                pattern = re.compile(re.escape(term), re.IGNORECASE)
                matches = pattern.findall(line)
                if matches:
                    total_forbidden += len(matches)
                    print(f"[{rel}:{line_no}] Match '{term}': {line.strip()[:100]}")

    print(f"\nTotal forbidden term matches: {total_forbidden}")

    print("\n--- EMOJI SCAN ---")
    for filepath in files_to_scan:
        rel = os.path.relpath(filepath, BASE_DIR)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except Exception as e:
            continue

        for line_no, line in enumerate(lines, 1):
            emojis_in_line = [c for c in line if is_emoji(c)]
            if emojis_in_line:
                total_emojis += len(emojis_in_line)
                print(f"[{rel}:{line_no}] Emoji ({''.join(emojis_in_line)}): {line.strip()[:100]}")

    print(f"\nTotal emojis found: {total_emojis}")

if __name__ == '__main__':
    scan()
