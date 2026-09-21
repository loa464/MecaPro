const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');
const lines = js.split('\n');

const dynamicCalls = [];
lines.forEach((line, idx) => {
  if (line.includes('getElementById') || line.includes('querySelector')) {
    dynamicCalls.push({ lineNum: idx + 1, text: line.trim() });
  }
});

console.log('Total lines with getElementById or querySelector:', dynamicCalls.length);
// Print ones with template literals or variables (backticks or not starting with quotes)
const nonSimple = dynamicCalls.filter(c => c.text.includes('`') || (!c.text.includes('("') && !c.text.includes("('") && !c.text.includes('(`')));
console.log('Non-simple / template literal calls:', nonSimple.length);
nonSimple.forEach(c => console.log(`L${c.lineNum}: ${c.text}`));
