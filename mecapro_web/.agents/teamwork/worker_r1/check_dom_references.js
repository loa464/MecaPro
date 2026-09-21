const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

// Find all document.getElementById calls in app.js
const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const found = new Map();
let m;
while ((m = regex.exec(js)) !== null) {
  const id = m[1];
  if (!found.has(id)) {
    found.set(id, []);
  }
  // Find line number
  const lineNum = js.substring(0, m.index).split('\n').length;
  found.get(id).push(lineNum);
}

console.log('Unique IDs queried with document.getElementById:', found.size);

const results = [];
for (const [id, lines] of found.entries()) {
  const inHtml = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  const inJs = js.includes(`id="${id}"`) || js.includes(`id='${id}'`);
  results.push({
    id,
    lines,
    status: inHtml ? 'HTML' : (inJs ? 'DYNAMIC_JS' : 'MISSING')
  });
}

const missing = results.filter(r => r.status === 'MISSING');
console.log('\nMissing elements count:', missing.length);
missing.forEach(r => console.log(`  - "${r.id}" at lines: ${r.lines.join(', ')}`));

// Check querySelector/All calls
const qsRegex = /document\.querySelector(?:All)?\(['"]([^'"]+)['"]\)/g;
const qsFound = new Map();
while ((m = qsRegex.exec(js)) !== null) {
  const sel = m[1];
  if (!qsFound.has(sel)) {
    qsFound.set(sel, []);
  }
  const lineNum = js.substring(0, m.index).split('\n').length;
  qsFound.get(sel).push(lineNum);
}

console.log('\nUnique selectors queried with querySelector/All:', qsFound.size);
for (const [sel, lines] of qsFound.entries()) {
  console.log(`  Selector: "${sel}" at lines: ${lines.join(', ')}`);
}
