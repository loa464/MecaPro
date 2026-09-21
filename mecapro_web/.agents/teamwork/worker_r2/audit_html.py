import os
import re
from html.parser import HTMLParser
from urllib.parse import urlparse

class DetailedAuditParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.assets = []
        self.buttons = []
        self.inputs = []
        self.images = []
        self.links = []
        self.meta = {}
        self.title = None
        self.html_lang = None
        self.in_title = False
        self.current_button = None

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        self.tags.append((tag, attr_dict))

        if tag == 'html':
            self.html_lang = attr_dict.get('lang')
        elif tag == 'title':
            self.in_title = True
        elif tag == 'meta':
            name = attr_dict.get('name') or attr_dict.get('property')
            content = attr_dict.get('content')
            if name and content:
                self.meta[name.lower()] = content

        # Check assets (src, href)
        for attr in ['src', 'href']:
            if attr in attr_dict:
                val = attr_dict[attr]
                self.assets.append((tag, attr, val, self.getpos()))

        if tag == 'img':
            self.images.append((attr_dict, self.getpos()))

        if tag == 'button':
            self.current_button = {
                'attrs': attr_dict,
                'pos': self.getpos(),
                'text': ''
            }

        if tag in ['input', 'select', 'textarea']:
            self.inputs.append((tag, attr_dict, self.getpos()))

        if tag == 'a':
            self.links.append((attr_dict, self.getpos()))

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'button' and self.current_button is not None:
            self.buttons.append(self.current_button)
            self.current_button = None

    def handle_data(self, data):
        if self.in_title:
            self.title = (self.title or '') + data
        if self.current_button is not None:
            self.current_button['text'] += data.strip()

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

parser = DetailedAuditParser()
parser.feed(content)

print(f"HTML lang: {parser.html_lang}")
print(f"Title: {parser.title}")
print(f"Meta tags found: {parser.meta}")

print("\n--- ASSETS AUDIT ---")
for tag, attr, val, pos in parser.assets:
    if val.startswith('#') or val.startswith('javascript:'):
        continue
    parsed = urlparse(val)
    if parsed.scheme in ['http', 'https']:
        # External
        pass
    else:
        # Local asset
        path_without_query = parsed.path
        local_path = os.path.join('public', path_without_query.lstrip('/\\'))
        exists = os.path.exists(local_path)
        if not exists:
            print(f"FAILED: line {pos[0]}: <{tag} {attr}='{val}'> -> File not found: {local_path}")
        else:
            print(f"OK: line {pos[0]}: <{tag} {attr}='{val}'> -> Exists")

print("\n--- BUTTON AUDIT ---")
button_issues = 0
for b in parser.buttons:
    attrs = b['attrs']
    pos = b['pos']
    text = b['text']
    b_type = attrs.get('type')
    aria_label = attrs.get('aria-label') or attrs.get('title')
    
    # Check if button has type
    if not b_type:
        print(f"Notice: line {pos[0]}: button without type attribute: id={attrs.get('id')} class={attrs.get('class')}")
        button_issues += 1
    # Check if button is icon-only and lacks accessible name
    if not text and not aria_label:
        print(f"WARNING: line {pos[0]}: icon-only button without text, aria-label, or title: id={attrs.get('id')}")
        button_issues += 1

print(f"Total buttons: {len(parser.buttons)}, issues: {button_issues}")

print("\n--- INPUT AUDIT ---")
input_issues = 0
for tag, attrs, pos in parser.inputs:
    i_id = attrs.get('id')
    i_type = attrs.get('type', 'text')
    aria_label = attrs.get('aria-label') or attrs.get('placeholder')
    if not i_id and not aria_label:
        print(f"Notice: line {pos[0]}: {tag} type={i_type} has no id or aria-label/placeholder")
        input_issues += 1
print(f"Total inputs/selects/textareas: {len(parser.inputs)}, issues: {input_issues}")

print("\n--- IMG AUDIT ---")
img_issues = 0
for attrs, pos in parser.images:
    src = attrs.get('src')
    alt = attrs.get('alt')
    if not alt:
        print(f"Notice: line {pos[0]}: img src={src} without alt attribute")
        img_issues += 1
print(f"Total images: {len(parser.images)}, issues: {img_issues}")
