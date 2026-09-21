const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Find all buttons or elements that have onclick that closes modals
const closeCalls = [...html.matchAll(/onclick="([^"]*cerrarModal[^"]*|[^"]*close[^"]*Modal[^"]*)"/gi)].map(m => m[1]);
console.log('Close modal onclicks in HTML:');
closeCalls.forEach(c => console.log('  -', c));
