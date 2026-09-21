const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

// Match document.getElementById('...')
const getByIdRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const uniqueById = new Set();
let match;
while ((match = getByIdRegex.exec(js)) !== null) {
  uniqueById.add(match[1]);
}

// Match document.querySelector('...')
const qsRegex = /document\.querySelector(?:All)?\(['"]([^'"]+)['"]\)/g;
const uniqueQs = new Set();
while ((match = qsRegex.exec(js)) !== null) {
  uniqueQs.add(match[1]);
}

console.log('Total unique getElementById targets:', uniqueById.size);
console.log('Total unique querySelector(All) targets:', uniqueQs.size);

const missingIds = [];
for (const id of uniqueById) {
  const inHtml = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  const inJs = js.includes(`id="${id}"`) || js.includes(`id='${id}'`);
  if (!inHtml && !inJs) {
    missingIds.push(id);
  }
}

console.log('\n--- Missing IDs (not in index.html or dynamically created in JS) ---');
console.log('Count:', missingIds.length);
missingIds.forEach(id => console.log('  -', id));

console.log('\n--- Checking querySelector targets ---');
const problematicSelectors = [];
for (const sel of uniqueQs) {
  if (sel.startsWith('#')) {
    const id = sel.slice(1);
    const inHtml = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    const inJs = js.includes(`id="${id}"`) || js.includes(`id='${id}'`);
    if (!inHtml && !inJs) {
      problematicSelectors.push(sel);
    }
  }
}
console.log('Problematic #selectors:', problematicSelectors);
