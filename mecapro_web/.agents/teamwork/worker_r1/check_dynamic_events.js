const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');

// Match on<event>="functionName(...)" inside strings in app.js
const regex = /on[a-z]+=["']([a-zA-Z0-9_$]+)\s*\(/gi;
const dynamicCalls = new Set();
let m;
while ((m = regex.exec(js)) !== null) {
  dynamicCalls.add(m[1]);
}

console.log('Unique functions called from dynamic HTML strings in app.js:', dynamicCalls.size);
const missing = [];
for (const fn of dynamicCalls) {
  const defRegex = new RegExp(`(?:function\\s+${fn}\\s*\\(|window\\.${fn}\\s*=|const\\s+${fn}\\s*=|let\\s+${fn}\\s*=)`);
  if (!defRegex.test(js)) {
    missing.push(fn);
  }
}

console.log('Missing dynamic functions:', missing.length);
missing.forEach(f => console.log('  -', f));
