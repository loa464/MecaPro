import hashlib
import os

pairs = [
    ('public/index.html', 'index.html'),
    ('public/css/styles.css', 'css/styles.css'),
    ('public/css/styles.css', 'styles.css'),
    ('public/js/app.js', 'js/app.js'),
    ('public/js/data.js', 'js/data.js'),
]

for p1, p2 in pairs:
    if os.path.exists(p1) and os.path.exists(p2):
        h1 = hashlib.sha256(open(p1, 'rb').read()).hexdigest()
        h2 = hashlib.sha256(open(p2, 'rb').read()).hexdigest()
        match = (h1 == h2)
        print(f"{p1} <-> {p2}: {'IDENTICAL' if match else 'DIFFERENT'}")
    else:
        print(f"{p1} or {p2} does not exist!")
