import re
from html.parser import HTMLParser

with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

label_fors = set(re.findall(r'<label[^>]*for=["\']([^"\']+)["\']', html))
all_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))

# Find input/select/textarea ids
input_ids = re.findall(r'<(?:input|select|textarea)[^>]*id=["\']([^"\']+)["\']', html)

print(f"Total inputs/selects/textareas with ID: {len(input_ids)}")
missing_labels = []
for i_id in input_ids:
    if i_id not in label_fors:
        # Check if it has aria-label or placeholder
        tag_match = re.search(r'<(?:input|select|textarea)[^>]*id=["\']' + re.escape(i_id) + r'["\'][^>]*>', html)
        tag_str = tag_match.group(0) if tag_match else ''
        has_aria = 'aria-label=' in tag_str or 'placeholder=' in tag_str
        missing_labels.append((i_id, has_aria, tag_str))

print(f"Inputs without explicit <label for>: {len(missing_labels)}")
for i_id, has_aria, tag_str in missing_labels[:20]:
    print(f" - {i_id} (has aria/placeholder: {has_aria})")
