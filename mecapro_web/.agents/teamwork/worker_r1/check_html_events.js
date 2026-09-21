const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

// Find all on<event> attributes
const eventAttrRegex = /\s(on[a-z]+)=["']([^"']+)["']/gi;
const handlers = [];
let m;
while ((m = eventAttrRegex.exec(html)) !== null) {
  const eventName = m[1];
  const code = m[2];
  handlers.push({ eventName, code });
}

console.log('Total inline event attributes found:', handlers.length);

// Extract function calls from handlers, e.g. fnName(...)
const fnCallRegex = /([a-zA-Z0-9_$]+)\s*\(/g;
const calledFns = new Set();

handlers.forEach(h => {
  let fm;
  while ((fm = fnCallRegex.exec(h.code)) !== null) {
    // Ignore native JS / control structures
    const fn = fm[1];
    if (!['if', 'for', 'while', 'switch', 'alert', 'confirm', 'prompt', 'parseInt', 'parseFloat', 'Number', 'String'].includes(fn)) {
      calledFns.add(fn);
    }
  }
});

console.log('Total unique functions called from HTML:', calledFns.size);

const missingFunctions = [];
for (const fn of calledFns) {
  // Check if defined in js: function fn(...) or window.fn = ... or const/let fn = ...
  const defRegex = new RegExp(`(?:function\\s+${fn}\\s*\\(|window\\.${fn}\\s*=|const\\s+${fn}\\s*=|let\\s+${fn}\\s*=)`);
  if (!defRegex.test(js)) {
    missingFunctions.push(fn);
  }
}

console.log('\nMissing functions (called in HTML but not defined in app.js):', missingFunctions.length);
missingFunctions.forEach(f => console.log('  -', f));
