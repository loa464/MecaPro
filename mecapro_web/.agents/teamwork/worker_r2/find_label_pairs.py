import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

pairs = []
for i, line in enumerate(lines):
    if '<label' in line and 'for=' not in line:
        # Check next few lines for an input/select/textarea with an id
        for j in range(i+1, min(i+5, len(lines))):
            target_match = re.search(r'<(?:input|select|textarea)[^>]*id=["\']([^"\']+)["\']', lines[j])
            if target_match:
                target_id = target_match.group(1)
                pairs.append((i+1, j+1, line.strip(), target_id))
                break

print(f"Found {len(pairs)} label-input pairs without 'for' attribute:")
for l_line, i_line, label_text, target_id in pairs:
    print(f"Line {l_line} -> {target_id}: {label_text[:50]}")
