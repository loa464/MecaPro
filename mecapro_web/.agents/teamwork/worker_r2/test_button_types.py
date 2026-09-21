import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect all <button tags
pattern = re.compile(r'<button\b([^>]*)>', re.IGNORECASE)

def process_button(match):
    attrs = match.group(1)
    # Check type
    new_attrs = attrs
    if 'type=' not in attrs:
        # Check if inside a form where it should be submit or button
        # In our inspection, submit buttons already have type="submit"
        new_attrs = ' type="button"' + new_attrs
    return f'<button{new_attrs}>'

# Let's test how many buttons would be updated
matches = list(pattern.finditer(content))
print(f"Total <button> tags: {len(matches)}")
no_type = [m.group(0) for m in matches if 'type=' not in m.group(1)]
print(f"Buttons without type: {len(no_type)}")
for b in no_type[:10]:
    print(" -", b[:80])
