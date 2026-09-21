const fs = require('fs');
const content = fs.readFileSync('public/js/data.js', 'utf8');
eval(content.replace('const WORKSHOP_DATA', 'global.WORKSHOP_DATA'));
const d = global.WORKSHOP_DATA;

console.log('=== DATA INTEGRITY AUDIT ===');
for (const [key, arr] of Object.entries(d)) {
  if (!Array.isArray(arr)) {
    console.log(`Key ${key} is NOT an array! Type: ${typeof arr}`);
    continue;
  }
  console.log(`Collection "${key}": ${arr.length} records`);
}

// Check clientes
let invalidClientes = 0;
d.clientes.forEach((c, i) => {
  if (!c.id_cliente || !c.nombre_razon_social) {
    console.log(`Cliente #${i} invalid:`, c);
    invalidClientes++;
  }
});
console.log('Invalid clientes:', invalidClientes);

// Check vehiculos
let invalidVehiculos = 0;
d.vehiculos.forEach((v, i) => {
  if (!v.id_vehiculo || !v.placa) {
    console.log(`Vehiculo #${i} invalid:`, v);
    invalidVehiculos++;
  }
});
console.log('Invalid vehiculos:', invalidVehiculos);

// Check ordenes
let invalidOrdenes = 0;
d.ordenes.forEach((o, i) => {
  if (!o.id_orden || !o.codigo_orden || !o.placa || !o.estado) {
    console.log(`Orden #${i} invalid:`, o);
    invalidOrdenes++;
  }
});
console.log('Invalid ordenes:', invalidOrdenes);

// Check repuestos
let invalidRepuestos = 0;
d.repuestos.forEach((r, i) => {
  if (!r.id_repuesto || !r.codigo || !r.nombre) {
    console.log(`Repuesto #${i} invalid:`, r);
    invalidRepuestos++;
  }
});
console.log('Invalid repuestos:', invalidRepuestos);

// Check comprobantes
let invalidComprobantes = 0;
d.comprobantes.forEach((c, i) => {
  if (!c.id_comprobante || !c.codigo_orden) {
    console.log(`Comprobante #${i} invalid:`, c);
    invalidComprobantes++;
  }
});
console.log('Invalid comprobantes:', invalidComprobantes);
