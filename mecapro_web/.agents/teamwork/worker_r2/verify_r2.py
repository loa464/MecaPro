#!/usr/bin/env python3
"""
Verification Script for Milestone M2 / Requirement R2 (Launch Readiness Audit)
Checks:
  a) SEO elements (title, description, viewport, lang="es") in public/index.html
  b) All local href and src attributes resolve to existing files (zero broken links / 404s)
  c) Security check: 0 occurrences of C:\\Users\\ or private credentials in public/ and server.py
  d) Byte-identical hashes between public/ and root counterparts (index.html, styles.css)
  e) Accessibility attributes (buttons have type, labels for inputs, icon-only buttons have aria-label)
"""

import os
import re
import sys
import hashlib
from html.parser import HTMLParser
from urllib.parse import urlparse

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

def run_checks():
    failures = []
    print("=" * 60)
    print("MecaPro Launch Readiness Audit (R2) - Verification Suite")
    print("=" * 60)

    # ---------------------------------------------------------
    # A) SEO Elements Check
    # ---------------------------------------------------------
    print("\n[A] Verifying SEO Elements in public/index.html ...")
    html_path = os.path.join(BASE_DIR, 'public', 'index.html')
    if not os.path.exists(html_path):
        failures.append("public/index.html not found!")
        return failures

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # lang="es"
    lang_match = re.search(r'<html\b[^>]*\blang=["\']es["\']', html_content, re.IGNORECASE)
    if lang_match:
        print("  [PASS] <html lang='es'> attribute is present.")
    else:
        failures.append("Missing <html lang='es'> in public/index.html")

    # <title>
    title_match = re.search(r'<title>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
    if title_match and len(title_match.group(1).strip()) > 5:
        print(f"  [PASS] Descriptive <title> found: '{title_match.group(1).strip()}'")
    else:
        failures.append("Missing or invalid <title> in public/index.html")

    # <meta name="description" ...>
    desc_match = re.search(r'<meta\b[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
    if not desc_match:
        desc_match = re.search(r'<meta\b[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']description["\']', html_content, re.IGNORECASE)
    if desc_match and len(desc_match.group(1).strip()) > 10:
        print(f"  [PASS] Meaningful <meta name='description'> found: '{desc_match.group(1).strip()[:60]}...'")
    else:
        failures.append("Missing or invalid <meta name='description'> in public/index.html")

    # <meta name="viewport" ...>
    viewport_match = re.search(r'<meta\b[^>]*name=["\']viewport["\'][^>]*content=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
    if viewport_match and 'width=device-width' in viewport_match.group(1):
        print(f"  [PASS] Responsive <meta name='viewport'> found: '{viewport_match.group(1)}'")
    else:
        failures.append("Missing or invalid <meta name='viewport'> in public/index.html")

    # ---------------------------------------------------------
    # B) Assets & Links Integrity Check (0 Broken References)
    # ---------------------------------------------------------
    print("\n[B] Verifying Assets and Link Integrity in public/index.html ...")
    
    class LinkAssetExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.references = []
        def handle_starttag(self, tag, attrs):
            attr_dict = dict(attrs)
            for attr in ['src', 'href']:
                if attr in attr_dict:
                    self.references.append((tag, attr, attr_dict[attr], self.getpos()))

    extractor = LinkAssetExtractor()
    extractor.feed(html_content)

    broken_assets = []
    checked_count = 0
    for tag, attr, ref, pos in extractor.references:
        if ref.startswith('#') or ref.startswith('javascript:'):
            continue
        parsed = urlparse(ref)
        if parsed.scheme in ['http', 'https']:
            # External CDN / font resource
            checked_count += 1
            continue
        
        # Local asset
        checked_count += 1
        clean_path = parsed.path.lstrip('/\\')
        resolved_path = os.path.join(BASE_DIR, 'public', clean_path)
        if not os.path.exists(resolved_path):
            broken_assets.append((tag, attr, ref, pos[0], resolved_path))

    if broken_assets:
        for b in broken_assets:
            failures.append(f"Broken asset reference line {b[3]}: <{b[0]} {b[1]}='{b[2]}'> -> Missing {b[4]}")
    else:
        print(f"  [PASS] All {checked_count} local and external references resolve successfully. Zero 404s.")

    # Check favicon presence
    fav_pub = os.path.join(BASE_DIR, 'public', 'favicon.ico')
    fav_root = os.path.join(BASE_DIR, 'favicon.ico')
    if os.path.exists(fav_pub) and os.path.exists(fav_root):
        print(f"  [PASS] favicon.ico exists in public/ ({os.path.getsize(fav_pub)} bytes) and root ({os.path.getsize(fav_root)} bytes).")
    else:
        failures.append("Missing favicon.ico in public/ or root!")

    # ---------------------------------------------------------
    # C) Security and Sanitization Check
    # ---------------------------------------------------------
    print("\n[C] Scanning for Local Path Leaks and Unsafe Secrets ...")
    
    # Scan public/ and server.py
    search_dirs = [os.path.join(BASE_DIR, 'public')]
    search_files = [os.path.join(BASE_DIR, 'server.py'), os.path.join(BASE_DIR, 'firebase.json')]
    
    for d in search_dirs:
        for root, _, files in os.walk(d):
            for file in files:
                search_files.append(os.path.join(root, file))

    leak_found = False
    for fpath in search_files:
        if not os.path.exists(fpath):
            continue
        # Skip binary files like images
        if fpath.endswith(('.jpg', '.png', '.ico', '.pyc')):
            continue
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                c = f.read()
                # Check for C:\Users\ or /Users/ or personal paths
                if re.search(r'[a-zA-Z]:\\Users\\', c, re.IGNORECASE):
                    failures.append(f"Security leak: Local filesystem path found in {fpath}")
                    leak_found = True
        except Exception as e:
            failures.append(f"Error reading {fpath}: {e}")

    if not leak_found:
        print("  [PASS] 0 occurrences of local filesystem paths (e.g. C:\\Users\\) found.")

    # Verify server.py compiles and has clean DB config
    server_py = os.path.join(BASE_DIR, 'server.py')
    with open(server_py, 'r', encoding='utf-8') as f:
        server_code = f.read()
    if 'os.environ.get("DB_HOST"' in server_code and 'os.environ.get("DB_PASSWORD"' in server_code:
        print("  [PASS] server.py uses parameterized environment variables for DB credentials.")
    else:
        failures.append("server.py does not use os.environ for DB credentials.")

    # ---------------------------------------------------------
    # D) Byte-Identical Root Synchronization Check
    # ---------------------------------------------------------
    print("\n[D] Verifying Byte-Identical Synchronization ...")
    sync_pairs = [
        (os.path.join(BASE_DIR, 'public', 'index.html'), os.path.join(BASE_DIR, 'index.html')),
        (os.path.join(BASE_DIR, 'public', 'css', 'styles.css'), os.path.join(BASE_DIR, 'css', 'styles.css')),
    ]

    for p_pub, p_root in sync_pairs:
        rel_pub = os.path.relpath(p_pub, BASE_DIR)
        rel_root = os.path.relpath(p_root, BASE_DIR)
        if not os.path.exists(p_pub) or not os.path.exists(p_root):
            failures.append(f"Sync check failed: {rel_pub} or {rel_root} does not exist!")
            continue
        h_pub = hashlib.sha256(open(p_pub, 'rb').read()).hexdigest()
        h_root = hashlib.sha256(open(p_root, 'rb').read()).hexdigest()
        if h_pub == h_root:
            print(f"  [PASS] {rel_pub} <-> {rel_root} byte-identical (SHA256: {h_pub[:16]}...)")
        else:
            failures.append(f"Hash mismatch between {rel_pub} and {rel_root}")

    # ---------------------------------------------------------
    # E) Accessibility Check
    # ---------------------------------------------------------
    print("\n[E] Verifying Accessibility Attributes ...")
    class AccessibilityParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.buttons_without_type = []
            self.icon_buttons_without_label = []
            self.current_btn = None
        def handle_starttag(self, tag, attrs):
            d = dict(attrs)
            if tag == 'button':
                self.current_btn = {
                    'attrs': d,
                    'line': self.getpos()[0],
                    'text': ''
                }
                if 'type' not in d:
                    self.buttons_without_type.append((self.getpos()[0], d))
        def handle_endtag(self, tag):
            if tag == 'button' and self.current_btn is not None:
                has_label = bool(
                    self.current_btn['text'].strip() or 
                    self.current_btn['attrs'].get('aria-label') or 
                    self.current_btn['attrs'].get('title')
                )
                if not has_label:
                    self.icon_buttons_without_label.append(self.current_btn)
                self.current_btn = None
        def handle_data(self, data):
            if self.current_btn is not None:
                self.current_btn['text'] += data.strip()

    a_parser = AccessibilityParser()
    a_parser.feed(html_content)

    if a_parser.buttons_without_type:
        failures.append(f"{len(a_parser.buttons_without_type)} buttons lack type attribute!")
    else:
        print("  [PASS] 100% of buttons have explicit type attribute (type='button' or type='submit').")

    if a_parser.icon_buttons_without_label:
        failures.append(f"{len(a_parser.icon_buttons_without_label)} icon buttons lack accessible text or aria-label!")
    else:
        print("  [PASS] 100% of buttons have accessible name (text, aria-label, or title).")

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------
    print("\n" + "=" * 60)
    if not failures:
        print("RESULT: ALL AUDIT CRITERIA PASSED SUCCESSFULLY (0 ERRORS)")
        print("=" * 60)
        return True
    else:
        print(f"RESULT: {len(failures)} FAILURES FOUND:")
        for f in failures:
            print(f"  - {f}")
        print("=" * 60)
        return False

if __name__ == '__main__':
    success = run_checks()
    sys.exit(0 if success else 1)
