import re
from html.parser import HTMLParser

class ButtonParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.buttons = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == 'button':
            self.current = {
                'tag': tag,
                'attrs': dict(attrs),
                'pos': self.getpos(),
                'text': '',
                'inner_tags': []
            }
        elif self.current is not None:
            self.current['inner_tags'].append((tag, dict(attrs)))

    def handle_endtag(self, tag):
        if tag == 'button' and self.current is not None:
            self.buttons.append(self.current)
            self.current = None

    def handle_data(self, data):
        if self.current is not None:
            self.current['text'] += data.strip()

with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

parser = ButtonParser()
parser.feed(html)

print(f"Total buttons: {len(parser.buttons)}")
for i, b in enumerate(parser.buttons):
    attrs = b['attrs']
    text = b['text'].strip()
    b_type = attrs.get('type')
    aria = attrs.get('aria-label')
    title = attrs.get('title')
    b_id = attrs.get('id')
    onclick = attrs.get('onclick')
    
    # Check if icon only
    has_accessible_name = bool(text or aria or title)
    has_type = bool(b_type)
    
    if not has_accessible_name or not has_type:
        print(f"[{i+1}] Line {b['pos'][0]}: id='{b_id}' type='{b_type}' aria='{aria}' title='{title}' text='{text}' onclick='{onclick}'")
