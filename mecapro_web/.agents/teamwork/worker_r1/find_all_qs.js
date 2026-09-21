const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');

const qsRegex = /\.querySelector(?:All)?\(['"]([^'"]+)['"]\)/g;
const qsFound = new Map();
let m;
while ((m = qsRegex.exec(js)) !== null) {
  const sel = m[1];
  if (!qsFound.has(sel)) {
    qsFound.set(sel, []);
  }
  const lineNum = js.substring(0, m.index).split('\n').length;
  qsFound.get(sel).push(lineNum);
}

console.log('Unique selectors queried with ANY .querySelector/All:', qsFound.size);
for (const [sel, lines] of qsFound.entries()) {
  console.log(`  Selector: "${sel}" at lines: ${lines.join(', ')}`);
}
