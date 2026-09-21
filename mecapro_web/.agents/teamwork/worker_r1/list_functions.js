const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');
const lines = js.split('\n');

const fnRegex = /^(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/;
const fns = [];
lines.forEach((l, idx) => {
  const m = fnRegex.exec(l);
  if (m) {
    fns.push({ name: m[1], line: idx + 1 });
  }
});

console.log('Total functions found:', fns.length);
fns.forEach(f => console.log(`${String(f.line).padStart(4, ' ')}: ${f.name}`));
