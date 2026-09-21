import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    # Find inputs without id
    if '<input' in line and 'id=' not in line:
        print(f"Line {i+1}: input without id: {line.strip()[:100]}")
    if '<select' in line and 'id=' not in line:
        print(f"Line {i+1}: select without id: {line.strip()[:100]}")
    if '<textarea' in line and 'id=' not in line:
        print(f"Line {i+1}: textarea without id: {line.strip()[:100]}")
