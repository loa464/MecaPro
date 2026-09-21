const fs = require('fs');

const files = ['server.py', 'public/js/app.js', 'public/js/data.js'];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/[a-zA-Z]:[/\\][^\s'"<>;)]+/g) || [];
  console.log(`Matches in ${f}:`, matches);
});
