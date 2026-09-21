const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');
const lines = js.split('\n');

const unsafeDirectAccessRegex = /document\.getElementById\(['"]([^'"]+)['"]\)\s*\.\s*([a-zA-Z_$][0-9a-zA-Z_$]*)/g;

const idMap = new Map();

lines.forEach((line, index) => {
  let m;
  while ((m = unsafeDirectAccessRegex.exec(line)) !== null) {
    const id = m[1];
    const prop = m[2];
    if (!idMap.has(id)) {
      idMap.set(id, []);
    }
    idMap.get(id).push({ lineNum: index + 1, prop, line: line.trim() });
  }
});

console.log('Unique IDs directly accessed without null guard:', idMap.size);
for (const [id, occurrences] of idMap.entries()) {
  console.log(`\nID: "${id}" (${occurrences.length} occurrences):`);
  occurrences.forEach(o => console.log(`  L${o.lineNum}: .${o.prop}`));
}
