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

def scan():
    files_to_scan = []
    for root, dirs, files in os.walk(BASE_DIR):
        if ".git" in root or ".agents" in root or "node_modules" in root or "__pycache__" in root:
            continue
        for f in files:
            if f.endswith(('.html', '.css', '.js', '.py')):
                files_to_scan.append(os.path.join(root, f))

    matches_forbidden = []
    matches_emojis = []

    for filepath in files_to_scan:
        rel = os.path.relpath(filepath, BASE_DIR)
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        for line_no, line in enumerate(lines, 1):
            for term in FORBIDDEN_TERMS:
                pattern = re.compile(re.escape(term), re.IGNORECASE)
                for m in pattern.finditer(line):
                    matches_forbidden.append((rel, line_no, term, m.group(0), line.strip()))

            emojis = [c for c in line if is_emoji(c)]
            if emojis:
                matches_emojis.append((rel, line_no, ''.join(emojis), line.strip()))

    with open(os.path.join(BASE_DIR, ".agents", "teamwork", "worker_r3", "full_scan_report.txt"), "w", encoding="utf-8") as out:
        out.write(f"Total forbidden term matches: {len(matches_forbidden)}\n")
        out.write(f"Total emoji matches: {len(matches_emojis)}\n\n")
        out.write("=== FORBIDDEN TERMS ===\n")
        for rel, line_no, term, match, content in matches_forbidden:
            out.write(f"[{rel}:{line_no}] Term: '{term}' (Found: '{match}') -> {content}\n")
        out.write("\n=== EMOJIS ===\n")
        for rel, line_no, emojis, content in matches_emojis:
            out.write(f"[{rel}:{line_no}] Emojis: '{emojis}' -> {content}\n")

    print(f"Report written. Forbidden: {len(matches_forbidden)}, Emojis: {len(matches_emojis)}")

if __name__ == '__main__':
    scan()
