const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');
const lines = js.split('\n');

const unsafeDirectAccessRegex = /document\.getElementById\(['"]([^'"]+)['"]\)\s*\.\s*([a-zA-Z_$][0-9a-zA-Z_$]*)/g;

const unsafeAccesses = [];

lines.forEach((line, index) => {
  let m;
  while ((m = unsafeDirectAccessRegex.exec(line)) !== null) {
    unsafeAccesses.push({
      lineNum: index + 1,
      id: m[1],
      prop: m[2],
      fullLine: line.trim()
    });
  }
});

console.log('Total unsafe direct accesses:', unsafeAccesses.length);
unsafeAccesses.forEach(a => {
  console.log(`L${a.lineNum}: document.getElementById('${a.id}').${a.prop}`);
});
