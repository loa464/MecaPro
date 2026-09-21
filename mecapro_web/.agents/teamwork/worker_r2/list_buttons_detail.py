import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<button' in line:
        has_type = 'type=' in line
        has_aria = 'aria-label=' in line or 'title=' in line
        # Check if button has inner text on same line or next lines
        print(f"Line {i+1}: type={has_type} aria/title={has_aria} | {line.strip()[:100]}")
