const fs = require('fs');

// Simple DOM emulator
class ClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  contains(c) { return this.classes.has(c); }
  toggle(c) {
    if (this.contains(c)) { this.remove(c); return false; }
    else { this.add(c); return true; }
  }
}

class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new ClassList();
    this.style = {};
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] || null; }
  removeAttribute(k) { delete this.attributes[k]; }
  focus() {}
  reset() { this.value = ''; }
  remove() {}
  appendChild(child) { return child; }
  removeChild(child) { return child; }
  querySelector(sel) { return new MockElement('mock-' + sel); }
  querySelectorAll(sel) { return [new MockElement('mock-' + sel)]; }
}

const elements = new Map();
function getOrCreateElement(id) {
  if (!elements.has(id)) {
    elements.set(id, new MockElement(id));
  }
  return elements.get(id);
}

// Global browser mocks
global.window = {
  innerWidth: 1200,
  addEventListener: () => {},
  scrollTo: () => {},
  print: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  lucide: { createIcons: () => {} }
};
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.lucide = global.window.lucide;
global.document = {
  documentElement: new MockElement('html'),
  body: new MockElement('body'),
  getElementById: (id) => getOrCreateElement(id),
  querySelector: (sel) => new MockElement('sel-' + sel),
  querySelectorAll: (sel) => [new MockElement('sel-' + sel)],
  addEventListener: () => {},
  createElement: (tag) => new MockElement('created', tag)
};
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// Load data.js
const dataCode = fs.readFileSync('public/js/data.js', 'utf8');
eval(dataCode.replace('const WORKSHOP_DATA', 'global.WORKSHOP_DATA'));

// Load app.js
const appCode = fs.readFileSync('public/js/app.js', 'utf8');
// Evaluate in global context
eval(appCode);

console.log('--- Initialized Environment Successfully ---');

const mockEvent = {
  preventDefault: () => {},
  stopPropagation: () => {}
};

try {
  console.log('Testing initTheme...');
  initTheme();

  console.log('Testing initSidebarState...');
  initSidebarState();

  console.log('Testing applyRolePermissions...');
  applyRolePermissions();

  console.log('Testing switchView(dashboard)...');
  switchView('dashboard');

  console.log('Testing switchView(clientes)...');
  switchView('clientes');
  buscarClientesWeb('roberto');
  cargarClientesWeb();
  seleccionarClienteFilaWeb(1);
  abrirModalCliente();
  editarClienteSeleccionadoWeb();
  guardarClienteWeb(mockEvent);

  console.log('Testing switchView(vehiculos)...');
  switchView('vehiculos');
  buscarVehiculosWeb('toyota');
  cargarVehiculosWeb();
  seleccionarVehiculoFilaWeb(1);
  abrirModalVehiculo();
  editarVehiculoSeleccionadoWeb();
  guardarVehiculoWeb(mockEvent);

  console.log('Testing switchView(ordenes)...');
  switchView('ordenes');
  filtrarOrdenesWeb();
  cargarOrdenesWeb();
  seleccionarOrdenFilaWeb(1);
  abrirModalCambiarEstadoWeb();
  guardarCambioEstadoWeb(mockEvent);
  verDetalleOrdenSeleccionadaWeb();
  verDetalleOrdenDirectaWeb(1);

  console.log('Testing switchView(diagnostico)...');
  switchView('diagnostico');
  cargarDiagnosticoSeleccionado('OT-2026-0001');
  cambiarEstadoSubsistema(0, 'BUENO');
  actualizarNotaSubsistema(0, 'Nota de prueba');
  guardarDiagnosticoWeb();

  console.log('Testing switchView(tracking)...');
  switchView('tracking');
  buscarTrackingWeb();
  consultarTrackingRapido('OT-2026-0001');

  console.log('Testing switchView(inventario)...');
  switchView('inventario');
  switchInventarioTab('repuestos');
  filtrarRepuestosWeb('filtro');
  cargarRepuestosWeb();
  seleccionarRepuestoFilaWeb(1);
  abrirModalRepuesto();
  guardarRepuestoWeb(mockEvent);
  abrirModalAjusteStockWeb();
  guardarAjusteStockWeb(mockEvent);

  switchInventarioTab('servicios');
  filtrarServiciosWeb('alineacion');
  cargarServiciosWeb();
  abrirModalServicio();
  guardarServicioWeb(mockEvent);

  console.log('Testing switchView(caja)...');
  switchView('caja');
  switchCajaTab('pendientes');
  filtrarCajaPendientesWeb('OT');
  seleccionarCajaPendienteFilaWeb(1);
  cobrarOrdenSeleccionadaCajaWeb();
  confirmarCobroEfectivoWeb(mockEvent);
  switchCajaTab('emitidos');
  filtrarCajaEmitidosWeb('B001');
  seleccionarCajaEmitidoFilaWeb(1);

  console.log('Testing switchView(reportes)...');
  switchView('reportes');
  seleccionarTipoReporte('financiero');
  setRangoReporte('mes_actual');
  seleccionarTipoReporte('stock');
  seleccionarTipoReporte('historial');
  seleccionarTipoReporte('garantias');

  console.log('Testing switchView(usuarios)...');
  switchView('usuarios');
  cargarUsuariosWeb();
  seleccionarUsuarioFilaWeb(1);
  abrirModalUsuario();
  guardarUsuarioWeb(mockEvent);
  cambiarEstadoUsuarioSeleccionadoWeb();

  console.log('Testing new order flow...');
  openNewOrderModal();
  onNuevaOrdenClienteDocInput('72418596');
  onNuevaOrdenClienteNombreInput('Roberto');
  onNuevaOrdenPlacaInput('B3X-892');
  handleCreateOrder(mockEvent);
  closeNewOrderModal();

  console.log('Testing quick search / omnibox...');
  toggleOmnibox();
  handleOmniboxSearch('toyota');
  handleOmniboxSearch('');
  toggleOmnibox();

  console.log('Testing table sorting...');
  ordenarTabla('ordenes', 'codigo_orden', 'text');
  ordenarTabla('clientes', 'id_cliente', 'number');
  ordenarTabla('vehiculos', 'placa', 'text');

  console.log('\n>>> ALL BUSINESS FLOWS EXECUTED SUCCESSFULLY WITHOUT ERRORS! <<<');
} catch (err) {
  console.error('\n!!! ERROR DETECTED DURING TEST EXECUTION !!!');
  console.error(err);
  process.exit(1);
}
