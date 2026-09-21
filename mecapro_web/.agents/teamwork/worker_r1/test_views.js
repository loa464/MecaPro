const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const views = ['dashboard', 'clientes', 'vehiculos', 'ordenes', 'diagnostico', 'tracking', 'inventario', 'caja', 'reportes', 'usuarios'];

views.forEach(v => {
  const hasView = html.includes(`id="view-${v}"`);
  const hasNav = html.includes(`id="nav-${v}"`);
  console.log(`view-${v}: ${hasView ? 'EXISTS' : 'MISSING'} | nav-${v}: ${hasNav ? 'EXISTS' : 'MISSING'}`);
});
