const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/js/app.js', 'utf8');

const modalRegex = /id="([^"]*modal[^"]*)"/gi;
const modals = [];
let match;
while ((match = modalRegex.exec(html)) !== null) {
  modals.push(match[1]);
}

console.log('Modals in HTML:', modals);

modals.forEach(m => {
  const referencedInJs = js.includes(m);
  console.log(`Modal: ${m} -> referenced in JS: ${referencedInJs}`);
});
