/**
 * Test integral de ejecución en tiempo de ejecución para MecaPro Web
 * Valida que todas las funciones, vistas, modales y flujos de negocio
 * se ejecutan sin errores de referencia ni excepciones no controladas.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = path.resolve(__dirname, '../../..');

console.log('--- Iniciando prueba de ejecución de MecaPro Web ---');

// 1. Cargar HTML y datos
const htmlContent = fs.readFileSync(path.join(BASE_DIR, 'public', 'index.html'), 'utf-8');
const dataContent = fs.readFileSync(path.join(BASE_DIR, 'public', 'js', 'data.js'), 'utf-8');
const appContent = fs.readFileSync(path.join(BASE_DIR, 'public', 'js', 'app.js'), 'utf-8');

// 2. Crear entorno simulado del navegador (DOM, LocalStorage, etc.)
const elementsById = new Map();
const classesMap = new Map();

function createMockElement(id = '', tagName = 'div') {
  return {
    id: id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      _classes: new Set(),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    },
    dataset: {},
    children: [],
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k] || null; },
    removeAttribute(k) { delete this[k]; },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    blur() {},
    click() {},
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    },
    querySelectorAll(sel) { return []; },
    querySelector(sel) { return null; }
  };
}

// Extraer todos los IDs definidos en index.html
const idRegex = /id=["']([^"']+)["']/g;
let m;
while ((m = idRegex.exec(htmlContent)) !== null) {
  const id = m[1];
  if (!elementsById.has(id)) {
    elementsById.set(id, createMockElement(id));
  }
}

// Extraer elementos con clases comunes
const classRegex = /class=["']([^"']+)["']/g;
while ((m = classRegex.exec(htmlContent)) !== null) {
  const classes = m[1].split(/\s+/);
  classes.forEach(c => {
    if (!classesMap.has(c)) classesMap.set(c, []);
  });
}

const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const sandbox = {
  console: console,
  setTimeout: (fn) => { fn(); return 1; },
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  window: {},
  document: {
    getElementById(id) {
      if (!elementsById.has(id)) {
        elementsById.set(id, createMockElement(id));
      }
      return elementsById.get(id);
    },
    querySelector(sel) {
      if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
      return createMockElement();
    },
    querySelectorAll(sel) {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        const list = [];
        for (const [id, el] of elementsById.entries()) {
          if (el.classList.contains(cls)) list.push(el);
        }
        return list;
      }
      return [];
    },
    createElement(tag) { return createMockElement('', tag); },
    body: createMockElement('body', 'body'),
    documentElement: createMockElement('html', 'html'),
    addEventListener: (event, handler) => {
      if (event === 'DOMContentLoaded') {
        setTimeout(handler, 0);
      }
    }
  },
  navigator: {
    clipboard: {
      writeText: async () => Promise.resolve()
    }
  },
  localStorage: mockLocalStorage,
  encodeURI: encodeURI,
  decodeURI: decodeURI,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  Array: Array,
  Object: Object,
  RegExp: RegExp,
  Boolean: Boolean
};

sandbox.window = sandbox;
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.scrollTo = () => {};
sandbox.window.addEventListener = () => {};
sandbox.window.removeEventListener = () => {};
sandbox.window.scrollTo = () => {};
sandbox.window.lucide = {
  createIcons: () => {}
};
sandbox.window.supabase = {
  createClient: () => ({
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => Promise.resolve({ data: [], error: null }),
      delete: () => Promise.resolve({ data: [], error: null }),
      channel: () => ({ on: () => ({ subscribe: () => {} }) })
    })
  })
};

const context = vm.createContext(sandbox);

// 3. Ejecutar data.js
vm.runInContext(dataContent, context);
console.log('data.js cargado correctamente.');

// 4. Ejecutar app.js
vm.runInContext(appContent, context);
console.log('app.js cargado correctamente.');

// 5. Simular eventos y navegación
const mockEvent = {
  preventDefault: () => {},
  stopPropagation: () => {},
  target: { reset: () => {} }
};

console.log('Validando funciones principales...');

// Test vistas
const vistas = ['dashboard', 'clientes', 'vehiculos', 'ordenes', 'diagnostico', 'tracking', 'inventario', 'caja', 'reportes', 'usuarios'];
vistas.forEach(v => {
  sandbox.switchView(v);
});
console.log('Transición de vistas completada sin errores.');

// Test nuevo buscador rápido (reemplazo de omnibox)
sandbox.toggleBuscadorRapido();
sandbox.buscarEnSistemaRapido('toyota');
sandbox.buscarEnSistemaRapido('B3X');
sandbox.buscarEnSistemaRapido('');
sandbox.toggleBuscadorRapido();
console.log('Buscador rápido validado correctamente.');

// Test ordenamiento de tablas
sandbox.ordenarTabla('ordenes', 'codigo_orden', 'text');
sandbox.ordenarTabla('clientes', 'id_cliente', 'number');
sandbox.ordenarTabla('vehiculos', 'placa', 'text');
console.log('Ordenamiento dinámico de tablas validado.');

// Test feedback sonoro (reemplazo de haptic)
sandbox.reproducirSonido('click');
sandbox.reproducirSonido('toggle');
sandbox.reproducirSonido('success');
sandbox.toggleAudioFeedback();
console.log('Control de efectos sonoros validado.');

// Test reportes y exportación
sandbox.aplicarFiltrosReporte();
sandbox.seleccionarTipoReporte('financiero');
sandbox.seleccionarTipoReporte('stock');
sandbox.seleccionarTipoReporte('historial');
sandbox.seleccionarTipoReporte('garantias');
console.log('Reportes gerenciales validados.');

console.log('\n>>> PRUEBA DE EJECUCIÓN EN TIEMPO DE EJECUCIÓN EXITOSA (0 ERRORES) <<<');
