const fs = require('fs');
const js = fs.readFileSync('public/js/app.js', 'utf8');
const lines = js.split('\n');

const addEvRegex = /(.*?)\.addEventListener\(['"]([^'"]+)['"]/g;
const listeners = [];

lines.forEach((line, idx) => {
  let m;
  while ((m = addEvRegex.exec(line)) !== null) {
    listeners.push({
      lineNum: idx + 1,
      target: m[1].trim(),
      event: m[2],
      fullLine: line.trim()
    });
  }
});

console.log('Total addEventListener calls found:', listeners.length);
listeners.forEach(l => {
  console.log(`L${l.lineNum}: [${l.target}].addEventListener('${l.event}')`);
});
