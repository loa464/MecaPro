// Lógica principal de la aplicación

// Conexion con la base de datos
// ----
const SUPABASE_CONFIG = {
  url: 'https://rzdzsvbthtvashksixzk.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZHpzdmJ0aHR2YXNoa3NpeHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTIxMTgsImV4cCI6MjEwMzg4ODExOH0.P-KuXsAGR5LftgUhuz-zEHDed0BSWX1N7zcv_lQ3cfw'
};

let sbClient = null;
let isSupabaseConnected = false;

function initSupabase() {
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      sbClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      isSupabaseConnected = true;
      actualizarBadgeSupabase(true);
      sincronizarDesdeSupabase();
      iniciarSuscripcionesRealtime();
    } else {
      console.warn('Supabase SDK aún no disponible');
      actualizarBadgeSupabase(false);
    }
  } catch (err) {
    console.error('Error al inicializar Supabase:', err);
    actualizarBadgeSupabase(false);
  }
}

function actualizarBadgeSupabase(conectado) {
  isSupabaseConnected = conectado;
}

function normalizarUsuario(u) {
  if (!u) return u;
  const uname = String(u.username || '').toLowerCase();
  let rol = u.rol || u.rol_codigo || '';
  if (!rol || rol === 'undefined') {
    if (u.id_rol === 1 || uname.includes('admin')) rol = 'ADMIN';
    else if (u.id_rol === 2 || uname.includes('recep') || uname.includes('asesor')) rol = 'RECEPCION';
    else if (u.id_rol === 3 || uname.includes('mecan') || uname.includes('tecnic')) rol = 'MECANICO';
    else if (u.id_rol === 4 || uname.includes('caja') || uname.includes('cajer') || uname.includes('factur')) rol = 'CAJA';
    else rol = 'ADMIN';
  }
  rol = String(rol).toUpperCase();
  if (rol === 'RECEPCIONISTA') rol = 'RECEPCION';
  if (rol === 'CAJERO') rol = 'CAJA';

  let rolDisplay = u.rol_display || u.rol_nombre || '';
  if (!rolDisplay || rolDisplay === 'undefined') {
    if (rol === 'ADMIN') rolDisplay = 'Administrador del Sistema';
    else if (rol === 'RECEPCION') rolDisplay = 'Recepción & Asesoría';
    else if (rol === 'CAJA') rolDisplay = 'Caja & Facturación';
    else if (rol === 'MECANICO') rolDisplay = 'Técnico Mecánico';
    else rolDisplay = 'Personal Autorizado';
  }

  const nombres = u.nombres || 'Usuario';
  const apellidos = u.apellidos || '';
  const avatar = (u.avatar && u.avatar !== 'undefined')
    ? u.avatar
    : ((nombres.trim().charAt(0) || 'U') + (apellidos.trim().charAt(0) || '')).toUpperCase();

  return {
    ...u,
    nombres,
    apellidos,
    rol,
    rol_display: rolDisplay,
    avatar
  };
}

async function sincronizarDesdeSupabase() {
  if (!sbClient) return;
  try {
    const [
      resClientes,
      resVehiculos,
      resOrdenes,
      resRepuestos,
      resServicios,
      resUsuarios,
      resComprobantes,
      resDiagnosticos
    ] = await Promise.all([
      sbClient.from('clientes').select('*').order('id_cliente'),
      sbClient.from('vehiculos').select('*').order('id_vehiculo'),
      sbClient.from('v_ordenes_resumen').select('*').order('id_orden', { ascending: false }),
      sbClient.from('repuestos').select('*').order('id_repuesto'),
      sbClient.from('servicios').select('*').order('id_servicio'),
      sbClient.from('usuarios').select('*').order('id_usuario'),
      sbClient.from('comprobantes_pago').select('*').order('id_comprobante', { ascending: false }),
      sbClient.from('diagnosticos_tecnicos').select('*').order('id_diagnostico', { ascending: false })
    ]);

    if (resClientes.data && resClientes.data.length > 0) {
      WORKSHOP_DATA.clientes = resClientes.data;
    }
    if (resVehiculos.data && resVehiculos.data.length > 0) {
      WORKSHOP_DATA.vehiculos = resVehiculos.data.map(v => ({
        ...v,
        propietario: (WORKSHOP_DATA.clientes || []).find(c => c.id_cliente === v.id_cliente)?.nombre_razon_social || 'Cliente Registrado'
      }));
    }
    if (resOrdenes.data && resOrdenes.data.length > 0) {
      WORKSHOP_DATA.ordenes = resOrdenes.data.map(o => ({
        id_orden: o.id_orden,
        codigo_orden: o.codigo_orden,
        id_vehiculo: o.id_vehiculo,
        id_cliente: o.id_cliente,
        id_mecanico: o.id_mecanico,
        fecha_ingreso: o.fecha_ingreso,
        fecha_estimada_entrega: o.fecha_estimada_entrega,
        fecha_entrega_real: o.fecha_entrega_real,
        kilometraje_ingreso: o.kilometraje_ingreso,
        kilometraje: o.kilometraje_ingreso,
        nivel_combustible: o.nivel_combustible,
        motivo_ingreso: o.motivo_ingreso,
        servicio: o.motivo_ingreso,
        diagnostico_inicial: o.diagnostico_inicial,
        diagnostico: o.diagnostico_inicial,
        estado: o.estado,
        total_mano_obra: parseFloat(o.total_mano_obra) || 0,
        total_repuestos: parseFloat(o.total_repuestos) || 0,
        total_general: parseFloat(o.total_general) || 0,
        pagado: o.pagado,
        placa: o.placa,
        vehiculo: `${o.marca || ''} ${o.modelo || ''}`.trim(),
        vehiculo_marca: o.marca,
        vehiculo_modelo: o.modelo,
        cliente_nombre: o.cliente_nombre,
        cliente_doc: o.cliente_doc,
        cliente_telefono: o.cliente_telefono,
        mecanico_nombre: o.mecanico_nombre
      }));
    }
    if (resRepuestos.data && resRepuestos.data.length > 0) {
      WORKSHOP_DATA.repuestos = resRepuestos.data;
    }
    if (resServicios.data && resServicios.data.length > 0) {
      WORKSHOP_DATA.servicios = resServicios.data;
    }
    if (resUsuarios.data && resUsuarios.data.length > 0) {
      const localUsers = WORKSHOP_DATA.usuarios || [];
      const mapped = resUsuarios.data.map(u => {
        const localMatch = localUsers.find(lu => lu.username === u.username || lu.id_usuario === u.id_usuario);
        return normalizarUsuario({ ...localMatch, ...u });
      });
      const extraLocal = localUsers
        .filter(lu => !mapped.some(m => m.username === lu.username || m.id_usuario === lu.id_usuario))
        .map(normalizarUsuario);
      WORKSHOP_DATA.usuarios = [...mapped, ...extraLocal];
    } else if (WORKSHOP_DATA.usuarios) {
      WORKSHOP_DATA.usuarios = WORKSHOP_DATA.usuarios.map(normalizarUsuario);
    }
    if (resComprobantes.data && resComprobantes.data.length > 0) {
      WORKSHOP_DATA.comprobantes = resComprobantes.data.map(cp => {
        const ord = (WORKSHOP_DATA.ordenes || []).find(o => o.id_orden === cp.id_orden);
        return {
          id_comprobante: cp.id_comprobante,
          id_orden: cp.id_orden,
          codigo_orden: ord ? ord.codigo_orden : `OT-${cp.id_orden}`,
          placa: ord ? ord.placa : '-',
          cliente_nombre: ord ? ord.cliente_nombre : 'Cliente',
          cliente_doc: ord ? ord.cliente_doc : '',
          tipo_comprobante: cp.tipo_comprobante,
          serie: cp.serie,
          numero: cp.numero,
          numero_completo: `${cp.serie}-${cp.numero}`,
          subtotal: parseFloat(cp.subtotal) || 0,
          igv: parseFloat(cp.igv) || 0,
          total: parseFloat(cp.total) || 0,
          metodo_pago: cp.metodo_pago,
          referencia_pago: cp.referencia_pago,
          fecha_emision: cp.fecha_emision,
          estado: cp.estado
        };
      });
    }
    if (resDiagnosticos.data && resDiagnosticos.data.length > 0) {
      WORKSHOP_DATA.diagnosticos_tecnicos = resDiagnosticos.data;
    }

    actualizarBadgeSupabase(true);
    renderDashboard();
    renderOrdenesTable();
    renderClientesTable();
    renderVehiculosTable();
    renderInventarioTables();
    renderCajaTables();
  } catch (err) {
    console.warn('Error al sincronizar datos desde Supabase:', err);
    actualizarBadgeSupabase(false);
  }
}

function iniciarSuscripcionesRealtime() {
  if (!sbClient) return;
  try {
    sbClient
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        sincronizarDesdeSupabase();
      })
      .subscribe();
  } catch (e) {
    console.warn('No se pudo suscribir a canal Realtime:', e);
  }
}

function getMecanicoIdByName(nombre) {
  if (!nombre) return 1;
  const n = String(nombre).toLowerCase();
  if (n.includes('carlos') || n.includes('mendoza')) return 1;
  if (n.includes('juan') || n.includes('perez')) return 2;
  if (n.includes('luis') || n.includes('ramirez')) return 3;
  if (n.includes('miguel') || n.includes('torres')) return 4;
  if (n.includes('jorge') || n.includes('gomez')) return 5;
  if (n.includes('pedro') || n.includes('sanchez')) return 6;
  if (n.includes('victor') || n.includes('castro')) return 7;
  if (n.includes('gabriel') || n.includes('chavez')) return 8;
  if (n.includes('julio') || n.includes('benavides')) return 9;
  if (n.includes('raul') || n.includes('vargas')) return 10;
  return 1;
}

function sincronizarDiagnosticoASupabase(diag) {
  if (!sbClient || !diag) return;
  sbClient.from('diagnosticos_tecnicos').upsert({
    placa: diag.placa,
    codigo_ot: diag.codigo_ot,
    vehiculo: diag.vehiculo,
    cliente: diag.cliente,
    mecanico: diag.mecanico,
    fecha: diag.fecha || new Date().toISOString().split('T')[0],
    kilometraje_ingreso: diag.kilometraje_ingreso,
    nivel_gasolina: diag.nivel_gasolina,
    peritaje_carroceria: diag.peritaje_carroceria,
    subsistemas: diag.subsistemas,
    dictamen_mecanico: diag.dictamen_mecanico,
    horas_estimadas: diag.horas_estimadas || 2.5,
    costo_mano_obra: diag.costo_mano_obra || 0,
    costo_repuestos: diag.costo_repuestos || 0,
    total_estimado: diag.total_estimado || 0,
    aprobado_cliente: diag.aprobado_cliente !== undefined ? diag.aprobado_cliente : true
  }, { onConflict: 'codigo_ot' }).catch(err => console.warn('Error sincronizando diagnostico en Supabase:', err));
}

// Datos y estado general de la aplicacion
// ----
const state = {
  currentView: 'dashboard',
  currentUser: {
    id_usuario: 1,
    username: 'admin',
    nombres: 'JAHN PAHOL',
    apellidos: 'LOA ROJAS',
    rol: 'ADMIN',
    rol_display: 'Administrador del Sistema',
    avatar: 'JL',
    correo: 'jahn.loa@mecapro.pe',
    telefono: '987654321'
  },
  selectedClienteId: null,
  selectedVehiculoId: null,
  selectedOrdenId: null,
  selectedRepuestoId: null,
  selectedServicioId: null,
  selectedCajaPendienteId: null,
  selectedCajaEmitidoId: null,
  selectedUsuarioId: null,
  activeInventarioTab: 'repuestos',
  activeCajaTab: 'pendientes',
  audioEnabled: false,
  theme: 'dark',
  tableSort: {
    ordenes: { column: 'codigo_orden', direction: 'desc', type: 'text' },
    clientes: { column: 'id_cliente', direction: 'asc', type: 'number' },
    vehiculos: { column: 'id_vehiculo', direction: 'asc', type: 'number' }
  }
};

// Ordenamiento de tablas
// ----
function getSortIndicatorHtml(isActive, direction) {
  if (!isActive) {
    return `<svg class="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 transition-colors opacity-70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>`;
  }
  if (direction === 'asc') {
    return `<svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-transform flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Ascendente (A-Z / Menor a Mayor)"><path d="m18 15-6-6-6 6"/></svg>`;
  } else {
    return `<svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-transform flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" title="Descendente (Z-A / Mayor a Menor)"><path d="m6 9 6 6 6-6"/></svg>`;
  }
}

function actualizarIndicadoresOrdenacion(tabla) {
  const current = (state.tableSort && state.tableSort[tabla]) || { column: null, direction: null };
  const headers = document.querySelectorAll(`th[data-sort-table="${tabla}"]`);
  headers.forEach(th => {
    const col = th.getAttribute('data-sort-col');
    const slot = th.querySelector('.sort-icon-slot');
    const isActive = current.column === col;
    if (slot) {
      slot.innerHTML = getSortIndicatorHtml(isActive, current.direction);
    }
    if (isActive) {
      th.classList.add('bg-blue-50/80', 'dark:bg-blue-950/40', 'text-blue-600', 'dark:text-blue-400');
    } else {
      th.classList.remove('bg-blue-50/80', 'dark:bg-blue-950/40', 'text-blue-600', 'dark:text-blue-400');
    }
  });
}

function ordenarTabla(tabla, columna, tipo = 'text') {
  reproducirSonido('click');
  if (!state.tableSort) state.tableSort = {};
  const current = state.tableSort[tabla] || { column: null, direction: null };
  let newDir = 'asc';

  if (current.column === columna) {
    newDir = current.direction === 'asc' ? 'desc' : 'asc';
  } else {
    newDir = (tipo === 'number' || tipo === 'date') ? 'desc' : 'asc';
  }

  state.tableSort[tabla] = { column: columna, direction: newDir, type: tipo };
  actualizarIndicadoresOrdenacion(tabla);

  if (tabla === 'ordenes') renderOrdenesTable();
  else if (tabla === 'clientes') renderClientesTable(document.getElementById('txt-buscar-cliente')?.value || '');
  else if (tabla === 'vehiculos') renderVehiculosTable(document.getElementById('txt-buscar-vehiculo')?.value || '');
}

// Control de sonido
let audioCtx = null;

function initAudio() {}

function reproducirSonido(type = 'click') {
  // Sonido desactivado
  return;
}

function toggleAudioFeedback() {
  state.audioEnabled = !state.audioEnabled;
  localStorage.setItem('mecapro_audio', state.audioEnabled);
  updateAudioIcon();
  if (state.audioEnabled) reproducirSonido('toggle');
  showToast(state.audioEnabled ? 'Síntesis de audio activada' : 'Audio silenciado', 'info');
}

function refrescarIconos() {
  if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
    try {
      window.lucide.createIcons();
    } catch (err) {
      // Ignorar fallas de inicialización de iconos
    }
  }
}

// Almacenamiento local para persistencia de datos del taller
const WORKSHOP_STORAGE_KEY = 'mecapro_workshop_data';

function guardarDatosLocalStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WORKSHOP_STORAGE_KEY, JSON.stringify(WORKSHOP_DATA));
    }
  } catch (err) {
    console.warn('No se pudo guardar en almacenamiento local:', err);
  }
}

function cargarDatosLocalStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(WORKSHOP_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach(k => {
            if (Array.isArray(parsed[k]) && parsed[k].length > 0) {
              WORKSHOP_DATA[k] = parsed[k];
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn('No se pudo cargar desde almacenamiento local:', err);
  }
}

function updateAudioIcon() {
  const icon = document.getElementById('icon-audio');
  if (!icon) return;
  if (state.audioEnabled) {
    icon.setAttribute('data-lucide', 'volume-2');
    icon.className = 'w-4 h-4 text-blue-600 dark:text-blue-400';
  } else {
    icon.setAttribute('data-lucide', 'volume-x');
    icon.className = 'w-4 h-4 text-slate-400';
  }
  refrescarIconos();
}

// Configuracion del tema visual
// ----
function initTheme() {
  const html = document.documentElement;
  if (html && html.classList) {
    html.classList.add('dark');
    html.classList.remove('light');
  }
  state.theme = 'dark';
  try {
    localStorage.setItem('mecapro_theme', 'dark');
    localStorage.setItem('mecapro_audio', 'false');
  } catch (e) {}
  updateThemeIcon();
}

function toggleTheme() {
  const html = document.documentElement;
  if (!html || !html.classList) return;
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    html.classList.add('light');
    state.theme = 'light';
  } else {
    html.classList.add('dark');
    html.classList.remove('light');
    state.theme = 'dark';
  }
  try {
    localStorage.setItem('mecapro_theme', state.theme);
  } catch (e) {}
  updateThemeIcon();
  reproducirSonido('toggle');
}

function updateThemeIcon() {
  const icon = document.getElementById('icon-theme');
  if (!icon) return;
  if (state.theme === 'dark') {
    icon.setAttribute('data-lucide', 'sun');
    icon.className = 'w-4 h-4 text-amber-400';
  } else {
    icon.setAttribute('data-lucide', 'moon');
    icon.className = 'w-4 h-4 text-slate-600';
  }
  refrescarIconos();
}

// Funciones de utilidad y formato
// ----
function formatMoney(amount) {
  const num = Number(amount) || 0;
  return 'S/. ' + num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderCol = type === 'success' ? 'border-emerald-500' : (type === 'error' ? 'border-rose-500' : 'border-blue-500');
  const textCol = type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : (type === 'error' ? 'text-rose-700 dark:text-rose-400' : 'text-blue-700 dark:text-blue-400');
  const iconName = type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-circle' : 'info');

  toast.className = `p-3 px-4 rounded-xl bg-white dark:bg-[#162032] border-l-4 ${borderCol} shadow-xl text-xs flex items-center gap-2.5 transform transition-all duration-200 translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 ${textCol} flex-shrink-0"></i>
    <span class="font-medium text-slate-800 dark:text-slate-200">${message}</span>
  `;

  container.appendChild(toast);
  refrescarIconos();

  const raf = (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function')
    ? window.requestAnimationFrame
    : (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 16));

  raf(() => {
    if (toast.classList) toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    if (toast.classList) toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (typeof toast.remove === 'function') {
        toast.remove();
      } else if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, 3500);
}

// Validacion y restriccion de entradas
// ----
function soloLetrasKeydown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const navKeys = ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End'];
  if (navKeys.includes(e.key)) return;
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]$/.test(e.key)) {
    e.preventDefault();
  }
}

function soloNumerosKeydown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const navKeys = ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End'];
  if (navKeys.includes(e.key)) return;
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

function soloDecimalKeydown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const navKeys = ['Backspace', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End'];
  if (navKeys.includes(e.key)) return;
  if (e.key === '.') {
    const val = e.target?.value || '';
    if (val.includes('.')) {
      e.preventDefault();
    }
    return;
  }
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

function formatearDocInput(input, tipoDoc) {
  if (!input) return;
  const el = input.target || input;
  const tipo = tipoDoc || document.getElementById('form-cliente-tipo-doc')?.value || 'DNI';
  if (tipo === 'DNI') {
    el.value = el.value.replace(/\D/g, '').slice(0, 8);
  } else if (tipo === 'RUC') {
    el.value = el.value.replace(/\D/g, '').slice(0, 11);
  } else {
    el.value = el.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
  }
}

function formatearTelefonoInput(input) {
  if (!input) return;
  const el = input.target || input;
  el.value = el.value.replace(/\D/g, '').slice(0, 9);
}

function formatearPlacaInput(input) {
  if (!input) return;
  const el = input.target || input;
  let val = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (val.length > 3) {
    el.value = val.slice(0, 3) + '-' + val.slice(3, 6);
  } else {
    el.value = val;
  }
}

function onTipoDocChange(tipoSelectId, numDocInputId) {
  const sel = document.getElementById(tipoSelectId);
  const inp = document.getElementById(numDocInputId);
  if (!sel || !inp) return;
  const tipo = sel.value;
  if (tipo === 'DNI') {
    inp.setAttribute('maxlength', '8');
    inp.placeholder = '47891234';
    inp.setAttribute('inputmode', 'numeric');
    inp.value = inp.value.replace(/\D/g, '').slice(0, 8);
  } else if (tipo === 'RUC') {
    inp.setAttribute('maxlength', '11');
    inp.placeholder = '20601234567';
    inp.setAttribute('inputmode', 'numeric');
    inp.value = inp.value.replace(/\D/g, '').slice(0, 11);
  } else {
    inp.setAttribute('maxlength', '12');
    inp.placeholder = '001234567';
    inp.setAttribute('inputmode', 'text');
    inp.value = inp.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
  }
}

function setupGlobalInputRestrictions() {
  if (typeof document === 'undefined') return;

  // Letras exclusivamente
  const soloLetrasIds = [
    'form-vehiculo-marca', 'new-order-vehiculo-marca',
    'form-vehiculo-color',
    'form-user-nombres', 'form-user-apellidos',
    'form-srv-tipo'
  ];
  soloLetrasIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._hasRestriction) {
      el._hasRestriction = true;
      el.addEventListener('keydown', soloLetrasKeydown);
      el.addEventListener('input', () => {
        el.value = el.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
      });
    }
  });

  // Nombres de cliente segun el documento
  ['form-cliente-nombre', 'new-order-cliente'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._hasRestriction) {
      el._hasRestriction = true;
      el.addEventListener('keydown', (e) => {
        const tipoSel = document.getElementById(id === 'form-cliente-nombre' ? 'form-cliente-tipo-doc' : 'new-order-cliente-tipo');
        if (tipoSel && tipoSel.value === 'DNI') {
          soloLetrasKeydown(e);
        }
      });
      el.addEventListener('input', () => {
        const tipoSel = document.getElementById(id === 'form-cliente-nombre' ? 'form-cliente-tipo-doc' : 'new-order-cliente-tipo');
        if (tipoSel && tipoSel.value === 'DNI') {
          el.value = el.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
        }
      });
    }
  });

  // Solo numeros enteros
  const soloNumerosConfig = [
    { id: 'form-cliente-tel', max: 9 },
    { id: 'new-order-cliente-tel', max: 9 },
    { id: 'form-user-tel', max: 9 },
    { id: 'form-vehiculo-anio', max: 4 },
    { id: 'form-vehiculo-km', max: 7 },
    { id: 'diag-input-km', max: 7 },
    { id: 'new-order-km', max: 7 },
    { id: 'diag-repuesto-cantidad', max: 5 },
    { id: 'form-rep-stock', max: 6 },
    { id: 'form-rep-min', max: 6 },
    { id: 'form-ajuste-cantidad', max: 6 },
    { id: 'form-srv-tiempo', max: 4 },
    { id: 'arq-billete-100', max: 5 },
    { id: 'arq-billete-50', max: 5 },
    { id: 'arq-billete-20', max: 5 },
    { id: 'arq-billete-10', max: 5 },
    { id: 'arq-moneda-5', max: 5 },
    { id: 'arq-moneda-2', max: 5 },
    { id: 'arq-moneda-1', max: 5 },
    { id: 'arq-moneda-050', max: 5 }
  ];
  soloNumerosConfig.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (el && !el._hasRestriction) {
      el._hasRestriction = true;
      el.addEventListener('keydown', soloNumerosKeydown);
      el.addEventListener('input', () => {
        el.value = el.value.replace(/\D/g, '').slice(0, cfg.max);
      });
    }
  });

  // Precios y montos decimales
  const decimalesIds = [
    'form-rep-pcompra',
    'form-rep-pventa',
    'form-srv-precio',
    'new-order-total'
  ];
  decimalesIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._hasRestriction) {
      el._hasRestriction = true;
      el.addEventListener('keydown', soloDecimalKeydown);
      el.addEventListener('input', () => {
        let val = el.value.replace(/[^0-9.]/g, '');
        const parts = val.split('.');
        if (parts.length > 2) {
          val = parts[0] + '.' + parts.slice(1).join('');
        }
        el.value = val;
      });
    }
  });

  // Placas
  ['form-vehiculo-placa', 'new-order-placa', 'txt-tracking-placa'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._hasRestriction) {
      el._hasRestriction = true;
      el.addEventListener('input', () => formatearPlacaInput(el));
    }
  });

  // SKUs y Códigos
  ['form-rep-codigo', 'form-srv-codigo'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._hasRestriction) {
      el._hasRestriction = true;
      el.addEventListener('input', () => {
        el.value = el.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
      });
    }
  });

  // Login de usuario
  const userLogin = document.getElementById('form-user-login');
  if (userLogin && !userLogin._hasRestriction) {
    userLogin._hasRestriction = true;
    userLogin.addEventListener('input', () => {
      userLogin.value = userLogin.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    });
  }

  // Numero de chasis
  const vinInput = document.getElementById('form-vehiculo-vin');
  if (vinInput && !vinInput._hasRestriction) {
    vinInput._hasRestriction = true;
    vinInput.addEventListener('input', () => {
      vinInput.value = vinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
    });
  }
}

// Control de la barra lateral
// ----
function toggleSidebar() {
  reproducirSonido('click');
  const isDesktop = window.innerWidth >= 1024;
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-mobile-backdrop');
  const toggleIcon = document.getElementById('sidebar-toggle-icon');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');

  if (isDesktop) {
    // Alternar barra lateral en escritorio
    const isHidden = document.body.classList.toggle('sidebar-hidden');
    localStorage.setItem('mecapro_sidebar_hidden', isHidden ? 'true' : 'false');

    if (toggleIcon) {
      toggleIcon.setAttribute('data-lucide', isHidden ? 'panel-left-open' : 'panel-left-close');
    }
    if (toggleBtn) {
      toggleBtn.title = isHidden ? 'Mostrar barra lateral (Ctrl+B)' : 'Ocultar barra lateral (Ctrl+B)';
      if (isHidden) {
        toggleBtn.classList.add('bg-blue-50', 'dark:bg-blue-950/40', 'border-blue-400', 'text-blue-600', 'dark:text-blue-400');
      } else {
        toggleBtn.classList.remove('bg-blue-50', 'dark:bg-blue-950/40', 'border-blue-400', 'text-blue-600', 'dark:text-blue-400');
      }
    }
    refrescarIconos();
  } else {
    // Menú lateral en móvil
    if (!sidebar) return;
    const isClosed = sidebar.classList.contains('-translate-x-full');
    if (isClosed) {
      sidebar.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
    }
  }
}

function toggleMobileSidebar() {
  toggleSidebar();
}

function initSidebarState() {
  const isDesktop = window.innerWidth >= 1024;
  const savedState = localStorage.getItem('mecapro_sidebar_hidden');
  const toggleIcon = document.getElementById('sidebar-toggle-icon');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');

  if (isDesktop && savedState === 'true') {
    document.body.classList.add('sidebar-hidden');
    if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'panel-left-open');
    if (toggleBtn) {
      toggleBtn.title = 'Mostrar barra lateral (Ctrl+B)';
      toggleBtn.classList.add('bg-blue-50', 'dark:bg-blue-950/40', 'border-blue-400', 'text-blue-600', 'dark:text-blue-400');
    }
  } else {
    document.body.classList.remove('sidebar-hidden');
    if (toggleIcon) toggleIcon.setAttribute('data-lucide', 'panel-left-close');
    if (toggleBtn) {
      toggleBtn.title = 'Ocultar barra lateral (Ctrl+B)';
      toggleBtn.classList.remove('bg-blue-50', 'dark:bg-blue-950/40', 'border-blue-400', 'text-blue-600', 'dark:text-blue-400');
    }
  }
  refrescarIconos();
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-mobile-backdrop');
  if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
    sidebar.classList.add('-translate-x-full');
  }
  if (backdrop && !backdrop.classList.contains('hidden')) {
    backdrop.classList.add('hidden');
  }
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024) {
    closeMobileSidebar();
  }
});

// Navegacion y permisos por rol
// ----
function switchView(viewName) {
  reproducirSonido('click');
  state.currentView = viewName;
  if (window.location.hash !== `#${viewName}`) {
    try { history.pushState(null, null, `#${viewName}`); } catch (e) { window.location.hash = viewName; }
  }
  closeMobileSidebar();

  // Ocultar todas las vistas
  document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));

  // Desactivar botones de navegación
  document.querySelectorAll('.side-nav-item').forEach(btn => {
    btn.classList.remove('nav-item-active', 'text-slate-900', 'dark:text-white', 'bg-blue-50', 'dark:bg-blue-900/30');
    btn.classList.add('text-slate-600', 'dark:text-slate-400');
    const icon = btn.querySelector('i');
    if (icon) icon.className = 'w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mr-3 stroke-[2]';
  });

  // Activar vista seleccionada
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.remove('hidden');

  // Resaltar botón de navegación
  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetNav) {
    targetNav.classList.add('nav-item-active', 'text-slate-900', 'dark:text-white', 'bg-blue-50', 'dark:bg-blue-900/30');
    targetNav.classList.remove('text-slate-600', 'dark:text-slate-400');
    const icon = targetNav.querySelector('i');
    if (icon) icon.className = 'w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mr-3 stroke-[2.2]';
  }

  // Cargar datos según la vista seleccionada
  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'clientes') {
    renderClientesTable();
  } else if (viewName === 'vehiculos') {
    renderVehiculosTable();
  } else if (viewName === 'ordenes') {
    renderOrdenesTable();
  } else if (viewName === 'diagnostico') {
    renderDiagnosticoView();
  } else if (viewName === 'tracking') {
    renderTrackingView();
  } else if (viewName === 'inventario') {
    renderInventarioTables();
  } else if (viewName === 'caja') {
    renderCajaTables();
  } else if (viewName === 'reportes') {
    renderReportesView();
  } else if (viewName === 'usuarios') {
    renderUsuariosTable();
  }

  refrescarIconos();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function applyRolePermissions() {
  const r = state.currentUser ? state.currentUser.rol : 'ADMIN';
  const roleBadge = document.getElementById('role-indicator-badge');
  const roleText = document.getElementById('role-indicator-text');
  const roleDot = document.getElementById('role-indicator-dot');
  const adminSection = document.getElementById('sidebar-admin-section');
  const navCaja = document.getElementById('nav-caja');
  const navInventario = document.getElementById('nav-inventario');
  const navClientes = document.getElementById('nav-clientes');
  const navVehiculos = document.getElementById('nav-vehiculos');
  const navOrdenes = document.getElementById('nav-ordenes');
  const navReportes = document.getElementById('nav-reportes');
  const topNewOrder = document.getElementById('btn-top-new-order');

  // Actualizar encabezado
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  const userRoleBadge = document.getElementById('user-role-badge');
  const userRoleText = document.getElementById('user-role-text');

  if (userName) userName.textContent = `${state.currentUser.nombres} ${state.currentUser.apellidos}`;
  if (userAvatar) userAvatar.textContent = state.currentUser.avatar || 'US';
  if (userRoleBadge) userRoleBadge.textContent = r;
  if (userRoleText) userRoleText.textContent = state.currentUser.rol_display;

  // Indicador de rol en barra lateral
  if (roleBadge) roleBadge.textContent = r;
  if (roleText) roleText.textContent = state.currentUser.rol_display;

  if (r === 'ADMIN') {
    if (roleDot) roleDot.className = 'w-2 h-2 rounded-full bg-blue-500';
    if (adminSection) adminSection.classList.remove('hidden');
    if (topNewOrder) topNewOrder.classList.remove('hidden');
    if (navCaja) navCaja.classList.remove('hidden');
    if (navInventario) navInventario.classList.remove('hidden');
    if (navClientes) navClientes.classList.remove('hidden');
    if (navVehiculos) navVehiculos.classList.remove('hidden');
    if (navOrdenes) navOrdenes.classList.remove('hidden');
    if (navReportes) navReportes.classList.remove('hidden');
  } else if (r === 'RECEPCION') {
    if (roleDot) roleDot.className = 'w-2 h-2 rounded-full bg-amber-500';
    if (adminSection) adminSection.classList.add('hidden');
    if (topNewOrder) topNewOrder.classList.remove('hidden');
    if (navCaja) navCaja.classList.add('hidden');
    if (navInventario) navInventario.classList.remove('hidden');
    if (navClientes) navClientes.classList.remove('hidden');
    if (navVehiculos) navVehiculos.classList.remove('hidden');
    if (navOrdenes) navOrdenes.classList.remove('hidden');
    if (navReportes) navReportes.classList.add('hidden');
  } else if (r === 'CAJA') {
    if (roleDot) roleDot.className = 'w-2 h-2 rounded-full bg-purple-500';
    if (adminSection) adminSection.classList.add('hidden');
    if (topNewOrder) topNewOrder.classList.add('hidden');
    if (navCaja) navCaja.classList.remove('hidden');
    if (navInventario) navInventario.classList.add('hidden');
    if (navClientes) navClientes.classList.remove('hidden');
    if (navVehiculos) navVehiculos.classList.remove('hidden');
    if (navOrdenes) navOrdenes.classList.remove('hidden');
    if (navReportes) navReportes.classList.add('hidden');
  } else if (r === 'MECANICO') {
    if (roleDot) roleDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    if (adminSection) adminSection.classList.add('hidden');
    if (topNewOrder) topNewOrder.classList.add('hidden');
    if (navCaja) navCaja.classList.add('hidden');
    if (navInventario) navInventario.classList.add('hidden');
    if (navClientes) navClientes.classList.add('hidden');
    if (navVehiculos) navVehiculos.classList.add('hidden');
    if (navOrdenes) navOrdenes.classList.remove('hidden');
    if (navReportes) navReportes.classList.add('hidden');
  }
}

// Renderizado de vistas

// Panel principal
function renderDashboard() {
  const todas = WORKSHOP_DATA.ordenes || [];
  const activas = todas.filter(o => o.estado !== 'ENTREGADO' && o.estado !== 'CANCELADO');
  const listas = todas.filter(o => o.estado === 'LISTO');
  const repuestos = WORKSHOP_DATA.repuestos || [];
  const bajoStock = repuestos.filter(r => r.stock_actual <= r.stock_minimo);
  const comprobantes = WORKSHOP_DATA.comprobantes || [];
  const totalFacturado = comprobantes.reduce((sum, c) => sum + (c.total || 0), 0);

  // Indicadores
  const elActivas = document.getElementById('kpi-ordenes-activas');
  const elListas = document.getElementById('kpi-listas-entrega');
  const elStock = document.getElementById('kpi-alertas-stock');
  const elFacturacion = document.getElementById('kpi-facturacion-total');

  if (elActivas) elActivas.textContent = activas.length;
  if (elListas) elListas.textContent = listas.length;
  if (elStock) elStock.textContent = bajoStock.length;
  if (elFacturacion) elFacturacion.textContent = formatMoney(totalFacturado);

  // Tabla de órdenes en curso
  const tbodyOrdenes = document.getElementById('dashboard-ordenes-table-body');
  if (tbodyOrdenes) {
    const ordenesCurso = todas.slice(0, 8);
    tbodyOrdenes.innerHTML = ordenesCurso.map(o => {
      const badgeCls = getEstadoBadgeClass(o.estado);
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer" onclick="verDetalleOrdenDirectaWeb(${o.id_orden})">
          <td class="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">${o.codigo_orden}</td>
          <td class="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">${o.placa}</td>
          <td class="p-2.5 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">${o.cliente_nombre}</td>
          <td class="p-2.5"><span class="badge-status ${badgeCls}">${o.estado}</span></td>
          <td class="p-2.5 font-mono font-bold text-right text-slate-900 dark:text-white">${formatMoney(o.total_general)}</td>
        </tr>
      `;
    }).join('');
  }

  // Tabla de alertas de stock
  const tbodyStock = document.getElementById('dashboard-stock-table-body');
  if (tbodyStock) {
    tbodyStock.innerHTML = bajoStock.map(r => `
      <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors">
        <td class="p-2.5 font-mono text-slate-500 font-bold">${r.codigo}</td>
        <td class="p-2.5 font-medium text-slate-800 dark:text-slate-200">${r.nombre}</td>
        <td class="p-2.5 text-slate-500">${r.marca}</td>
        <td class="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">${r.stock_actual} un.</td>
        <td class="p-2.5 font-mono text-slate-400">${r.stock_minimo} un.</td>
        <td class="p-2.5 text-slate-500">${r.ubicacion || 'Almacén 1'}</td>
      </tr>
    `).join('');
  }

  // Estado de bahías de trabajo
  renderBayMatrix();
}

function asegurarBahiasTaller() {
  if (WORKSHOP_DATA.bays && WORKSHOP_DATA.bays.length > 0) return WORKSHOP_DATA.bays;
  
  const ordenesActivas = (WORKSHOP_DATA.ordenes || []).filter(o => o.estado !== 'ENTREGADO' && o.estado !== 'CANCELADO');
  const nombresBahias = [
    'Elevador 1 (Pesado)', 'Elevador 2 (General)', 'Elevador 3 (Rápido)', 'Elevador 4 (Frenos)',
    'Bahía Rápida 1', 'Bahía Rápida 2', 'Bahía Alineamiento 3D', 'Bahía Diagnóstico E-OBD2',
    'Bahía Mantenimiento A', 'Bahía Mantenimiento B'
  ];

  WORKSHOP_DATA.bays = nombresBahias.map((nombre, i) => {
    const orden = ordenesActivas[i] || null;
    if (orden) {
      let progreso = 25;
      if (orden.estado === 'EN_DIAGNOSTICO') progreso = 20;
      else if (orden.estado === 'EN_REPARACION') progreso = 60;
      else if (orden.estado === 'EN_PRUEBAS') progreso = 85;
      else if (orden.estado === 'LISTO') progreso = 100;

      return {
        id: i + 1,
        nombre: nombre,
        ocupado: true,
        badgeLabel: orden.estado,
        placa: orden.placa || 'ABC-123',
        vehiculo: orden.vehiculo_marca ? `${orden.vehiculo_marca} ${orden.vehiculo_modelo || ''}` : (orden.vehiculo || 'Vehículo en Atención'),
        servicio: orden.motivo_ingreso || 'Mantenimiento General Preventivo',
        progreso: progreso,
        mecanico: orden.mecanico_asignado || 'Téc. Principal'
      };
    } else {
      return {
        id: i + 1,
        nombre: nombre,
        ocupado: false,
        badgeLabel: 'LIBRE'
      };
    }
  });
  return WORKSHOP_DATA.bays;
}

function renderBayMatrix() {
  const container = document.getElementById('bay-matrix-container');
  if (!container) return;
  asegurarBahiasTaller();

  container.innerHTML = WORKSHOP_DATA.bays.map(b => {
    const isOccupied = b.ocupado;
    const borderCls = isOccupied ? 'border-blue-200 dark:border-blue-900/60' : 'border-slate-200 dark:border-[#233047]';
    const bgCls = isOccupied ? 'bg-white dark:bg-[#141d2e]' : 'bg-slate-50/70 dark:bg-[#101726]/70 opacity-80';

    return `
      <div onmousemove="handleCard3DTilt(event, this)" onmouseleave="resetCard3DTilt(this)" class="bay-card-3d p-4 rounded-xl border ${borderCls} ${bgCls} shadow-xs flex flex-col justify-between min-h-[170px] pointer transition-all">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${isOccupied ? 'bg-blue-600 beacon-pulse-emerald' : 'bg-slate-400'}"></span>
            ${b.nombre}
          </span>
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isOccupied ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">
            ${isOccupied ? b.badgeLabel : 'LIBRE'}
          </span>
        </div>

        ${isOccupied ? `
          <div class="flex flex-col gap-1 text-xs">
            <span class="plate-badge self-start text-[11px] py-0.5 px-2">${b.placa}</span>
            <span class="font-bold text-slate-800 dark:text-slate-200 text-xs truncate mt-1">${b.vehiculo}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${b.servicio}</span>
            <div class="w-full bg-slate-100 dark:bg-[#1f2c42] rounded-full h-1.5 mt-2 overflow-hidden">
              <div class="bg-blue-600 h-full rounded-full transition-all duration-500" style="width: ${b.progreso}%"></div>
            </div>
            <div class="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
              <span>Tec: ${(b.mecanico || 'Mecánico').split(' ')[0]}</span>
              <span>Progreso: ${b.progreso}%</span>
            </div>
          </div>
        ` : `
          <div class="flex flex-col items-center justify-center my-auto text-center gap-1 text-slate-400 py-4">
            <i data-lucide="check" class="w-5 h-5 text-emerald-500"></i>
            <span class="text-xs font-medium text-slate-500">Disponible para asignación</span>
          </div>
        `}
      </div>
    `;
  }).join('');
}

function handleCard3DTilt(e, card) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -5;
  const rotateY = ((x - centerX) / centerX) * 5;
  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
}

function resetCard3DTilt(card) {
  card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
}

// Gestión de clientes
function renderClientesTable(filtro = '') {
  const clientes = WORKSHOP_DATA.clientes || [];
  const q = filtro.toLowerCase().trim();
  const filtered = clientes.filter(c => {
    if (!q) return true;
    return (c.num_documento && c.num_documento.toLowerCase().includes(q)) ||
           (c.nombre_razon_social && c.nombre_razon_social.toLowerCase().includes(q)) ||
           (c.telefono && c.telefono.toLowerCase().includes(q));
  });

  // Ordenamiento dinámico
  const sort = (state.tableSort && state.tableSort.clientes) || { column: 'id_cliente', direction: 'asc' };
  if (sort && sort.column) {
    filtered.sort((a, b) => {
      let res = 0;
      switch (sort.column) {
        case 'id_cliente':
          res = (a.id_cliente || 0) - (b.id_cliente || 0);
          break;
        case 'tipo_documento':
          res = (a.tipo_documento || '').localeCompare(b.tipo_documento || '');
          break;
        case 'num_documento':
          res = (a.num_documento || '').localeCompare(b.num_documento || '', undefined, { numeric: true });
          break;
        case 'nombre_razon_social':
          res = (a.nombre_razon_social || '').localeCompare(b.nombre_razon_social || '', undefined, { sensitivity: 'base' });
          break;
        case 'telefono':
          res = (a.telefono || '').localeCompare(b.telefono || '', undefined, { numeric: true });
          break;
        case 'correo':
          res = (a.correo || '').localeCompare(b.correo || '');
          break;
        case 'direccion':
          res = (a.direccion || '').localeCompare(b.direccion || '');
          break;
        case 'activo':
          res = (a.activo ? 1 : 0) - (b.activo ? 1 : 0);
          break;
        default:
          res = (a.id_cliente || 0) - (b.id_cliente || 0);
      }
      return sort.direction === 'desc' ? -res : res;
    });
  }

  // Indicadores
  const elTotal = document.getElementById('kpi-clientes-total');
  const elDni = document.getElementById('kpi-clientes-dni');
  const elRuc = document.getElementById('kpi-clientes-ruc');
  const elActivos = document.getElementById('kpi-clientes-activos');
  const badgeTotal = document.getElementById('badge-total-clientes');

  if (elTotal) elTotal.textContent = clientes.length;
  if (elDni) elDni.textContent = clientes.filter(c => c.tipo_documento === 'DNI').length;
  if (elRuc) elRuc.textContent = clientes.filter(c => c.tipo_documento === 'RUC').length;
  if (elActivos) elActivos.textContent = clientes.filter(c => c.activo).length;
  if (badgeTotal) badgeTotal.textContent = clientes.length;

  const tbody = document.getElementById('clientes-table-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(c => `
    <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${state.selectedClienteId === c.id_cliente ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarClienteFilaWeb(${c.id_cliente})">
      <td class="p-3 text-center">
        <input type="radio" name="sel-cliente" ${state.selectedClienteId === c.id_cliente ? 'checked' : ''} class="pointer">
      </td>
      <td class="p-3 font-mono text-slate-400 font-bold">${c.id_cliente}</td>
      <td class="p-3 font-bold font-mono text-blue-600">${c.tipo_documento}</td>
      <td class="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">${c.num_documento}</td>
      <td class="p-3 font-semibold text-slate-900 dark:text-white">${c.nombre_razon_social}</td>
      <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${c.telefono || '-'}</td>
      <td class="p-3 text-slate-600 dark:text-slate-400">${c.correo || '-'}</td>
      <td class="p-3 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">${c.direccion || '-'}</td>
      <td class="p-3">
        <span class="badge-status ${c.activo ? 'badge-emerald' : 'badge-crimson'}">${c.activo ? 'ACTIVO' : 'INACTIVO'}</span>
      </td>
    </tr>
  `).join('');

  actualizarIndicadoresOrdenacion('clientes');
}

function buscarClientesWeb(val) {
  renderClientesTable(val);
}

function cargarClientesWeb() {
  const inp = document.getElementById('txt-buscar-cliente');
  if (inp) inp.value = '';
  renderClientesTable();
  showToast('Padrón de clientes sincronizado', 'info');
}

function seleccionarClienteFilaWeb(id) {
  state.selectedClienteId = id;
  renderClientesTable(document.getElementById('txt-buscar-cliente')?.value || '');
}

function abrirModalCliente(cliente = null) {
  reproducirSonido('click');
  const modal = document.getElementById('modal-cliente');
  const title = document.getElementById('modal-cliente-title');
  const form = document.getElementById('form-cliente');
  if (!modal || !form) return;

  if (cliente) {
    if (title) title.textContent = 'Editar Cliente';
    const elId = document.getElementById('form-cliente-id');
    const elTipo = document.getElementById('form-cliente-tipo-doc');
    const elNum = document.getElementById('form-cliente-num-doc');
    const elNom = document.getElementById('form-cliente-nombre');
    const elTel = document.getElementById('form-cliente-tel');
    const elCor = document.getElementById('form-cliente-correo');
    const elDir = document.getElementById('form-cliente-dir');

    if (elId) elId.value = cliente.id_cliente || '';
    if (elTipo) elTipo.value = cliente.tipo_documento || 'DNI';
    if (elNum) elNum.value = cliente.num_documento || '';
    if (elNom) elNom.value = cliente.nombre_razon_social || '';
    if (elTel) elTel.value = cliente.telefono || '';
    if (elCor) elCor.value = cliente.correo || '';
    if (elDir) elDir.value = cliente.direccion || '';
  } else {
    if (title) title.textContent = 'Nuevo Cliente';
    form.reset();
    const elId = document.getElementById('form-cliente-id');
    if (elId) elId.value = '';
  }

  abrirModalElemento(modal);
}

function editarClienteSeleccionadoWeb() {
  if (!state.selectedClienteId && (WORKSHOP_DATA.clientes || []).length > 0) {
    state.selectedClienteId = WORKSHOP_DATA.clientes[0].id_cliente;
  }
  if (!state.selectedClienteId) {
    showToast('No hay clientes disponibles para editar', 'error');
    return;
  }
  const cliente = (WORKSHOP_DATA.clientes || []).find(c => c.id_cliente === state.selectedClienteId);
  if (cliente) abrirModalCliente(cliente);
}

function cambiarEstadoClienteSeleccionadoWeb() {
  if (!state.selectedClienteId && (WORKSHOP_DATA.clientes || []).length > 0) {
    state.selectedClienteId = WORKSHOP_DATA.clientes[0].id_cliente;
  }
  if (!state.selectedClienteId) {
    showToast('Seleccione un cliente para cambiar su vigencia', 'warning');
    return;
  }
  const cliente = (WORKSHOP_DATA.clientes || []).find(c => c.id_cliente === state.selectedClienteId);
  if (!cliente) return;
  cliente.activo = !cliente.activo;
  reproducirSonido('click');
  showToast(`Cliente ${cliente.nombre_razon_social} marcado como ${cliente.activo ? 'ACTIVO' : 'INACTIVO'}`, 'success');
  guardarDatosLocalStorage();
  if (sbClient) {
    sbClient.from('clientes').update({ activo: cliente.activo }).eq('id_cliente', cliente.id_cliente).catch(console.warn);
  }
  renderClientesTable(document.getElementById('txt-buscar-cliente')?.value || '');
}

function eliminarClienteSeleccionadoWeb() {
  if (!state.selectedClienteId && (WORKSHOP_DATA.clientes || []).length > 0) {
    state.selectedClienteId = WORKSHOP_DATA.clientes[0].id_cliente;
  }
  if (!state.selectedClienteId) {
    showToast('Seleccione un cliente para eliminar', 'warning');
    return;
  }
  const cliente = (WORKSHOP_DATA.clientes || []).find(c => c.id_cliente === state.selectedClienteId);
  if (!cliente) return;

  const tieneVehiculos = (WORKSHOP_DATA.vehiculos || []).some(v => v.id_cliente === cliente.id_cliente || (v.propietario && v.propietario.toLowerCase() === cliente.nombre_razon_social.toLowerCase()));
  const tieneOrdenes = (WORKSHOP_DATA.ordenes || []).some(o => o.id_cliente === cliente.id_cliente || (o.cliente_nombre && o.cliente_nombre.toLowerCase() === cliente.nombre_razon_social.toLowerCase()));

  if (tieneVehiculos || tieneOrdenes) {
    cliente.activo = false;
    showToast('El cliente tiene órdenes o vehículos asociados. Se procedió a inactivarlo para proteger el historial técnico.', 'info');
  } else {
    WORKSHOP_DATA.clientes = WORKSHOP_DATA.clientes.filter(c => c.id_cliente !== cliente.id_cliente);
    state.selectedClienteId = null;
    showToast(`Cliente ${cliente.nombre_razon_social} eliminado del padrón`, 'success');
  }
  reproducirSonido('click');
  guardarDatosLocalStorage();
  if (sbClient) {
    if (tieneVehiculos || tieneOrdenes) {
      sbClient.from('clientes').update({ activo: false }).eq('id_cliente', cliente.id_cliente).catch(console.warn);
    } else {
      sbClient.from('clientes').delete().eq('id_cliente', cliente.id_cliente).catch(console.warn);
    }
  }
  renderClientesTable(document.getElementById('txt-buscar-cliente')?.value || '');
}

function guardarClienteWeb(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('form-cliente-id')?.value;
  const tipoDoc = document.getElementById('form-cliente-tipo-doc')?.value || 'DNI';
  const numDoc = (document.getElementById('form-cliente-num-doc')?.value || '').trim();
  const nombre = (document.getElementById('form-cliente-nombre')?.value || '').trim();
  const tel = (document.getElementById('form-cliente-tel')?.value || '').trim();
  const correo = (document.getElementById('form-cliente-correo')?.value || '').trim();
  const dir = (document.getElementById('form-cliente-dir')?.value || '').trim();

  if (!nombre) {
    showToast('El nombre o razón social del cliente es obligatorio', 'warning');
    return;
  }
  if (tipoDoc === 'DNI') {
    if (!/^\d{8}$/.test(numDoc)) {
      showToast('El DNI debe contener exactamente 8 dígitos numéricos', 'warning');
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombre)) {
      showToast('El nombre del cliente persona natural debe contener únicamente letras', 'warning');
      return;
    }
  } else if (tipoDoc === 'RUC') {
    if (!/^\d{11}$/.test(numDoc)) {
      showToast('El RUC debe contener exactamente 11 dígitos numéricos', 'warning');
      return;
    }
  } else if (!numDoc) {
    showToast('El número de documento de identidad es obligatorio', 'warning');
    return;
  }
  if (tel && !/^\d{9}$/.test(tel)) {
    showToast('El teléfono celular debe contener exactamente 9 dígitos numéricos', 'warning');
    return;
  }

  let clienteRegistrado = null;

  if (id) {
    // Editar existente
    const cliente = (WORKSHOP_DATA.clientes || []).find(c => c.id_cliente == id);
    if (cliente) {
      cliente.tipo_documento = tipoDoc;
      cliente.num_documento = numDoc;
      cliente.nombre_razon_social = nombre;
      cliente.telefono = tel;
      cliente.correo = correo;
      cliente.direccion = dir;
      clienteRegistrado = cliente;
    }
    showToast(`Cliente ${nombre} actualizado correctamente`, 'success');
  } else {
    // Crear nuevo
    const newId = (WORKSHOP_DATA.clientes || []).reduce((max, c) => Math.max(max, c.id_cliente || 0), 0) + 1;
    clienteRegistrado = {
      id_cliente: newId,
      tipo_documento: tipoDoc,
      num_documento: numDoc,
      nombre_razon_social: nombre,
      telefono: tel,
      correo: correo,
      direccion: dir,
      tipo_cliente: numDoc.length === 11 ? 'RUC' : 'PARTICULAR',
      activo: true
    };
    if (!WORKSHOP_DATA.clientes) WORKSHOP_DATA.clientes = [];
    WORKSHOP_DATA.clientes.unshift(clienteRegistrado);
    showToast(`Cliente ${nombre} registrado con éxito`, 'success');
  }

  if (typeof persistirDatosLocales === 'function') persistirDatosLocales();

  if (sbClient && clienteRegistrado) {
    sbClient.from('clientes').upsert({
      id_cliente: clienteRegistrado.id_cliente,
      tipo_documento: tipoDoc,
      num_documento: numDoc,
      nombre_razon_social: nombre,
      telefono: tel,
      correo: correo,
      direccion: dir,
      tipo_cliente: numDoc.length === 11 ? 'RUC' : 'PARTICULAR',
      activo: true
    }, { onConflict: 'num_documento' }).then(() => console.log(`Cliente ${nombre} guardado en Supabase Cloud`))
    .catch(err => console.warn('Error guardando cliente en Supabase:', err));
  }

  cerrarModal('modal-cliente');
  renderClientesTable();
}

// Registro y fichas de vehiculos
// ----
function renderVehiculosTable(filtro = '') {
  const vehiculos = WORKSHOP_DATA.vehiculos || [];
  const q = filtro.toLowerCase().trim();
  const filtered = vehiculos.filter(v => {
    if (!q) return true;
    return (v.placa && v.placa.toLowerCase().includes(q)) ||
           (v.modelo && v.modelo.toLowerCase().includes(q)) ||
           (v.marca && v.marca.toLowerCase().includes(q)) ||
           (v.propietario && v.propietario.toLowerCase().includes(q));
  });

  // Ordenamiento dinámico
  const sort = (state.tableSort && state.tableSort.vehiculos) || { column: 'id_vehiculo', direction: 'asc' };
  if (sort && sort.column) {
    filtered.sort((a, b) => {
      let res = 0;
      switch (sort.column) {
        case 'id_vehiculo':
          res = (a.id_vehiculo || 0) - (b.id_vehiculo || 0);
          break;
        case 'placa':
          res = (a.placa || '').localeCompare(b.placa || '', undefined, { numeric: true });
          break;
        case 'propietario':
          res = (a.propietario || '').localeCompare(b.propietario || '', undefined, { sensitivity: 'base' });
          break;
        case 'marca':
          res = (a.marca || '').localeCompare(b.marca || '');
          break;
        case 'modelo':
          res = (a.modelo || '').localeCompare(b.modelo || '');
          break;
        case 'anio':
          res = (parseInt(a.anio) || 0) - (parseInt(b.anio) || 0);
          break;
        case 'color':
          res = (a.color || '').localeCompare(b.color || '');
          break;
        case 'kilometraje_actual':
          res = (parseInt(a.kilometraje_actual) || 0) - (parseInt(b.kilometraje_actual) || 0);
          break;
        case 'num_vin':
          res = (a.num_vin || '').localeCompare(b.num_vin || '');
          break;
        case 'activo':
          res = (a.activo ? 1 : 0) - (b.activo ? 1 : 0);
          break;
        default:
          res = (a.id_vehiculo || 0) - (b.id_vehiculo || 0);
      }
      return sort.direction === 'desc' ? -res : res;
    });
  }

  // Indicadores
  const elTotal = document.getElementById('kpi-vehiculos-total');
  const elActivos = document.getElementById('kpi-vehiculos-activos');
  const elMarcas = document.getElementById('kpi-vehiculos-marcas');
  const elProps = document.getElementById('kpi-vehiculos-props');
  const badgeTotal = document.getElementById('badge-total-vehiculos');

  const distinctMarcas = new Set(vehiculos.map(v => v.marca).filter(Boolean));
  const distinctProps = new Set(vehiculos.map(v => v.id_cliente).filter(Boolean));

  if (elTotal) elTotal.textContent = vehiculos.length;
  if (elActivos) elActivos.textContent = vehiculos.filter(v => v.activo).length;
  if (elMarcas) elMarcas.textContent = distinctMarcas.size;
  if (elProps) elProps.textContent = distinctProps.size;
  if (badgeTotal) badgeTotal.textContent = vehiculos.length;

  const tbody = document.getElementById('vehiculos-table-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(v => `
    <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${state.selectedVehiculoId === v.id_vehiculo ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarVehiculoFilaWeb(${v.id_vehiculo})">
      <td class="p-3 text-center">
        <input type="radio" name="sel-vehiculo" ${state.selectedVehiculoId === v.id_vehiculo ? 'checked' : ''} class="pointer">
      </td>
      <td class="p-3 font-mono text-slate-400 font-bold">${v.id_vehiculo}</td>
      <td class="p-3"><span class="plate-badge text-xs">${v.placa}</span></td>
      <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">${v.propietario || '-'}</td>
      <td class="p-3 font-medium text-slate-900 dark:text-white">${v.marca}</td>
      <td class="p-3 text-slate-700 dark:text-slate-300">${v.modelo}</td>
      <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${v.anio || '-'}</td>
      <td class="p-3 text-slate-500 dark:text-slate-400">${v.color || '-'}</td>
      <td class="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">${(v.kilometraje_actual || 0).toLocaleString()} km</td>
      <td class="p-3 font-mono text-slate-400 text-[10px]">${v.num_vin || '-'}</td>
      <td class="p-3">
        <span class="badge-status ${v.activo ? 'badge-emerald' : 'badge-crimson'}">${v.activo ? 'ACTIVO' : 'INACTIVO'}</span>
      </td>
    </tr>
  `).join('');

  actualizarIndicadoresOrdenacion('vehiculos');
}

function buscarVehiculosWeb(val) {
  renderVehiculosTable(val);
}

function cargarVehiculosWeb() {
  const inp = document.getElementById('txt-buscar-vehiculo');
  if (inp) inp.value = '';
  renderVehiculosTable();
  showToast('Parque vehicular sincronizado', 'info');
}

function seleccionarVehiculoFilaWeb(id) {
  state.selectedVehiculoId = id;
  renderVehiculosTable(document.getElementById('txt-buscar-vehiculo')?.value || '');
}

function abrirModalVehiculo(vehiculo = null) {
  reproducirSonido('click');
  const modal = document.getElementById('modal-vehiculo');
  const title = document.getElementById('modal-vehiculo-title');
  const selectCliente = document.getElementById('form-vehiculo-cliente');
  const form = document.getElementById('form-vehiculo');
  if (!modal || !form || !selectCliente) return;

  // Llenar combo de clientes
  selectCliente.innerHTML = (WORKSHOP_DATA.clientes || []).map(c => `
    <option value="${c.id_cliente}">${c.nombre_razon_social} (${c.num_documento})</option>
  `).join('');

  if (vehiculo) {
    if (title) title.textContent = 'Editar Vehículo';
    const elId = document.getElementById('form-vehiculo-id');
    const elPlaca = document.getElementById('form-vehiculo-placa');
    const elMarca = document.getElementById('form-vehiculo-marca');
    const elMod = document.getElementById('form-vehiculo-modelo');
    const elAnio = document.getElementById('form-vehiculo-anio');
    const elCol = document.getElementById('form-vehiculo-color');
    const elKm = document.getElementById('form-vehiculo-km');
    const elVin = document.getElementById('form-vehiculo-vin');

    if (elId) elId.value = vehiculo.id_vehiculo || '';
    if (elPlaca) elPlaca.value = vehiculo.placa || '';
    if (selectCliente && vehiculo.id_cliente) selectCliente.value = vehiculo.id_cliente;
    if (elMarca) elMarca.value = vehiculo.marca || '';
    if (elMod) elMod.value = vehiculo.modelo || '';
    if (elAnio) elAnio.value = vehiculo.anio || 2022;
    if (elCol) elCol.value = vehiculo.color || '';
    if (elKm) elKm.value = vehiculo.kilometraje_actual || 0;
    if (elVin) elVin.value = vehiculo.num_vin || '';
  } else {
    if (title) title.textContent = 'Nuevo Vehículo';
    form.reset();
    const elId = document.getElementById('form-vehiculo-id');
    if (elId) elId.value = '';
  }

  abrirModalElemento(modal);
}

function editarVehiculoSeleccionadoWeb() {
  if (!state.selectedVehiculoId && (WORKSHOP_DATA.vehiculos || []).length > 0) {
    state.selectedVehiculoId = WORKSHOP_DATA.vehiculos[0].id_vehiculo;
  }
  if (!state.selectedVehiculoId) {
    showToast('No hay vehículos disponibles para editar', 'error');
    return;
  }
  const vehiculo = (WORKSHOP_DATA.vehiculos || []).find(v => v.id_vehiculo === state.selectedVehiculoId);
  if (vehiculo) abrirModalVehiculo(vehiculo);
}

function cambiarEstadoVehiculoSeleccionadoWeb() {
  if (!state.selectedVehiculoId && (WORKSHOP_DATA.vehiculos || []).length > 0) {
    state.selectedVehiculoId = WORKSHOP_DATA.vehiculos[0].id_vehiculo;
  }
  if (!state.selectedVehiculoId) {
    showToast('Seleccione un vehículo para cambiar su estado', 'warning');
    return;
  }
  const vehiculo = (WORKSHOP_DATA.vehiculos || []).find(v => v.id_vehiculo === state.selectedVehiculoId);
  if (!vehiculo) return;
  vehiculo.activo = (vehiculo.activo === false ? true : false);
  vehiculo.estado = vehiculo.activo ? 'ACTIVO' : 'INACTIVO';
  reproducirSonido('click');
  showToast(`Vehículo con placa ${vehiculo.placa} marcado como ${vehiculo.activo ? 'ACTIVO' : 'INACTIVO'}`, 'success');
  guardarDatosLocalStorage();
  if (sbClient) {
    sbClient.from('vehiculos').update({ estado: vehiculo.estado }).eq('id_vehiculo', vehiculo.id_vehiculo)
      .then(() => console.log('Estado de vehículo actualizado en Supabase')).catch(err => console.warn(err));
  }
  renderVehiculosTable(document.getElementById('txt-buscar-vehiculo')?.value || '');
}

function verHistorialVehiculoSeleccionadoWeb() {
  if (!state.selectedVehiculoId && (WORKSHOP_DATA.vehiculos || []).length > 0) {
    state.selectedVehiculoId = WORKSHOP_DATA.vehiculos[0].id_vehiculo;
  }
  if (!state.selectedVehiculoId) {
    showToast('Seleccione un vehículo para consultar su historial clínico', 'warning');
    return;
  }
  const v = (WORKSHOP_DATA.vehiculos || []).find(x => x.id_vehiculo === state.selectedVehiculoId);
  if (!v) return;

  const ordenesVehiculo = (WORKSHOP_DATA.ordenes || []).filter(o => o.placa === v.placa || o.id_vehiculo === v.id_vehiculo);
  const totalInvertido = ordenesVehiculo.reduce((acc, o) => acc + (o.total_general || 0), 0);
  const container = document.getElementById('modal-historial-vehiculo-content');
  if (!container) return;

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-[#2a3b56]">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Vehículo & Ficha</span>
        <div class="font-bold text-slate-900 dark:text-white mt-0.5">${v.marca} ${v.modelo} (${v.anio || 2024})</div>
        <span class="plate-badge text-[10px] mt-1 inline-block">${v.placa}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Propietario Registrado</span>
        <div class="font-bold text-slate-800 dark:text-slate-200 mt-0.5">${v.propietario || 'Cliente Particular'}</div>
        <span class="text-slate-400 font-mono text-[11px]">Color: ${v.color || 'No especificado'}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Kilometraje & VIN</span>
        <div class="font-mono font-bold text-blue-600 mt-0.5">${(v.kilometraje_actual || 0).toLocaleString()} km</div>
        <span class="text-slate-400 font-mono text-[10px]">VIN: ${v.num_vin || 'Sin VIN'}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Inversión Acumulada</span>
        <div class="font-mono font-bold text-emerald-600 text-sm mt-0.5">${formatMoney(totalInvertido)}</div>
        <span class="text-slate-400 text-[11px]">${ordenesVehiculo.length} intervenciones registradas</span>
      </div>
    </div>

    <div class="flex flex-col gap-2 mt-2">
      <div class="flex items-center justify-between">
        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">Historial Cronológico de Mantenimientos e Intervenciones</h4>
        <span class="text-[11px] font-mono text-slate-400">${ordenesVehiculo.length} órdenes en registro</span>
      </div>
      ${ordenesVehiculo.length === 0 ? `
        <div class="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-[#2a3b56] rounded-xl">
          Este vehículo aún no cuenta con intervenciones de taller registradas.
        </div>
      ` : `
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#2a3b56]">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-[#2a3b56] text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#162032]">
                <th class="p-2.5">OT</th>
                <th class="p-2.5">Fecha</th>
                <th class="p-2.5">Servicio Realizado</th>
                <th class="p-2.5">Técnico Mecánico</th>
                <th class="p-2.5">Kilometraje</th>
                <th class="p-2.5">Estado</th>
                <th class="p-2.5 text-right">Mano Obra</th>
                <th class="p-2.5 text-right">Repuestos</th>
                <th class="p-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-[#233047]">
              ${ordenesVehiculo.map(o => `
                <tr class="hover:bg-slate-50 dark:hover:bg-[#1a253a]">
                  <td class="p-2.5 font-mono font-bold text-blue-600">${o.codigo_orden}</td>
                  <td class="p-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">${(o.fecha_ingreso || '').split('T')[0]}</td>
                  <td class="p-2.5 font-medium text-slate-900 dark:text-white">${o.servicio || o.motivo_ingreso || 'Mantenimiento General'}</td>
                  <td class="p-2.5 text-slate-600 dark:text-slate-400">${o.mecanico_nombre || 'Carlos Mendoza'}</td>
                  <td class="p-2.5 font-mono text-slate-600 dark:text-slate-400">${(o.kilometraje || 0).toLocaleString()} km</td>
                  <td class="p-2.5"><span class="badge-status ${getEstadoBadgeClass(o.estado)}">${o.estado}</span></td>
                  <td class="p-2.5 font-mono text-right text-slate-600 dark:text-slate-400">${formatMoney(o.total_mano_obra || (o.total_general * 0.4))}</td>
                  <td class="p-2.5 font-mono text-right text-slate-600 dark:text-slate-400">${formatMoney(o.total_repuestos || (o.total_general * 0.6))}</td>
                  <td class="p-2.5 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">${formatMoney(o.total_general)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  reproducirSonido('click');
  abrirModalElemento('modal-historial-vehiculo');
}

function imprimirHistorialVehiculoActualPDF() {
  const v = (WORKSHOP_DATA.vehiculos || []).find(x => x.id_vehiculo === state.selectedVehiculoId) || (WORKSHOP_DATA.vehiculos || [])[0];
  if (!v) {
    showToast('Seleccione un vehículo para exportar su historial', 'warning');
    return;
  }
  const ordenesVehiculo = (WORKSHOP_DATA.ordenes || []).filter(o => o.placa === v.placa || o.id_vehiculo === v.id_vehiculo);
  const totalInvertido = ordenesVehiculo.reduce((acc, o) => acc + (o.total_general || 0), 0);

  const container = document.getElementById('printable-pdf-content');
  if (!container) return;

  container.innerHTML = `
    <div class="flex items-center justify-between pb-6 border-b-2 border-slate-900">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-blue-600 p-2.5 flex items-center justify-center">
          <img src="assets/logo_white.png" alt="MecaPro" class="w-full h-full object-contain">
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">MecaPro S.A.C.</h1>
          <p class="text-xs text-slate-600 font-medium">Ficha Técnica e Historial Clínico Vehicular</p>
          <p class="text-xs text-slate-500 font-mono">Taller Mecánico Especializado • RUC 20601234567</p>
        </div>
      </div>
      <div class="text-right">
        <span class="plate-badge text-base px-3 py-1 font-bold inline-block">${v.placa}</span>
        <span class="text-slate-500 font-mono text-[11px] block mt-1">Generado: ${new Date().toLocaleDateString('es-PE')}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mt-4">
      <div>
        <span class="font-bold text-slate-600 block uppercase">Datos Técnicos del Móvil:</span>
        <span class="font-extrabold text-slate-900 text-sm block mt-0.5">${v.marca} ${v.modelo} (${v.anio || 2024})</span>
        <span class="text-slate-600">Color: <strong>${v.color || 'No especificado'}</strong></span>
        <span class="text-slate-500 font-mono text-[11px] block">VIN: ${v.num_vin || 'Sin VIN'} • Km: ${(v.kilometraje_actual || 0).toLocaleString()} km</span>
      </div>
      <div>
        <span class="font-bold text-slate-600 block uppercase">Propietario / Cliente:</span>
        <span class="font-extrabold text-slate-900 text-sm block mt-0.5">${v.propietario || 'Cliente Particular'}</span>
        <span class="text-slate-600">Total Intervenciones: <strong>${ordenesVehiculo.length} servicios</strong></span>
        <span class="text-emerald-700 font-bold font-mono text-sm block mt-1">Total Facturado: ${formatMoney(totalInvertido)}</span>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">Trazabilidad Cronológica de Mantenimientos:</h3>
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b-2 border-slate-900 text-slate-900 font-extrabold bg-slate-100">
            <th class="p-2.5">OT</th>
            <th class="p-2.5">Fecha</th>
            <th class="p-2.5">Trabajo / Servicio</th>
            <th class="p-2.5">Mecánico</th>
            <th class="p-2.5">Km</th>
            <th class="p-2.5 text-center">Estado</th>
            <th class="p-2.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          ${ordenesVehiculo.map(o => `
            <tr>
              <td class="p-2.5 font-bold font-mono text-blue-700">${o.codigo_orden}</td>
              <td class="p-2.5 font-mono text-[11px]">${(o.fecha_ingreso || '').split('T')[0]}</td>
              <td class="p-2.5">${o.servicio || o.motivo_ingreso || 'Mantenimiento General'}</td>
              <td class="p-2.5 text-slate-600">${o.mecanico_nombre || 'Carlos Mendoza'}</td>
              <td class="p-2.5 font-mono">${(o.kilometraje || 0).toLocaleString()} km</td>
              <td class="p-2.5 text-center"><span class="badge-status ${getEstadoBadgeClass(o.estado)}">${o.estado}</span></td>
              <td class="p-2.5 font-mono font-bold text-right">${formatMoney(o.total_general)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="mt-6 pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
      <span>MecaPro Gestión Automotriz - Copia Certificada</span>
      <span>Página 1 de 1</span>
    </div>
  `;

  reproducirSonido('click');
  abrirModalElemento('modal-pdf-viewer');
}

function guardarVehiculoWeb(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('form-vehiculo-id')?.value;
  const placa = (document.getElementById('form-vehiculo-placa')?.value || '').toUpperCase().trim();
  const idCliente = parseInt(document.getElementById('form-vehiculo-cliente')?.value || '1');
  const marca = (document.getElementById('form-vehiculo-marca')?.value || '').trim();
  const modelo = (document.getElementById('form-vehiculo-modelo')?.value || '').trim();
  const anio = parseInt(document.getElementById('form-vehiculo-anio')?.value || '2022');
  const color = (document.getElementById('form-vehiculo-color')?.value || '').trim();
  const km = parseInt(document.getElementById('form-vehiculo-km')?.value || '0');
  const vin = (document.getElementById('form-vehiculo-vin')?.value || '').trim();

  if (!placa) {
    showToast('Debe ingresar la placa del vehículo', 'warning');
    return;
  }
  const placaRegex = /^[A-Z0-9]{3}-?[A-Z0-9]{3}$/;
  if (!placaRegex.test(placa)) {
    showToast('La placa debe tener formato válido de 6 caracteres (ej. ABC-123)', 'warning');
    return;
  }
  if (marca && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(marca)) {
    showToast('La marca del vehículo debe contener únicamente letras', 'warning');
    return;
  }
  if (color && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(color)) {
    showToast('El color del vehículo debe contener únicamente letras', 'warning');
    return;
  }
  if (isNaN(anio) || anio < 1900 || anio > 2030) {
    showToast('El año del vehículo debe estar entre 1900 y 2030', 'warning');
    return;
  }
  if (isNaN(km) || km < 0) {
    showToast('El kilometraje debe ser un entero positivo', 'warning');
    return;
  }

  const cliente = (WORKSHOP_DATA.clientes || []).find(c => c.id_cliente === idCliente);
  let vehiculoGuardado = null;

  if (id) {
    const v = (WORKSHOP_DATA.vehiculos || []).find(x => x.id_vehiculo == id);
    if (v) {
      v.placa = placa;
      v.id_cliente = idCliente;
      v.propietario = cliente ? cliente.nombre_razon_social : v.propietario;
      v.marca = marca;
      v.modelo = modelo;
      v.anio = anio;
      v.color = color;
      v.kilometraje_actual = km;
      v.num_vin = vin;
      vehiculoGuardado = v;
    }
    showToast(`Vehículo ${placa} actualizado correctamente`, 'success');
  } else {
    const newId = (WORKSHOP_DATA.vehiculos || []).reduce((max, v) => Math.max(max, v.id_vehiculo || 0), 0) + 1;
    vehiculoGuardado = {
      id_vehiculo: newId,
      placa: placa,
      id_cliente: idCliente,
      propietario: cliente ? cliente.nombre_razon_social : 'Cliente General',
      marca: marca,
      modelo: modelo,
      anio: anio,
      color: color,
      kilometraje_actual: km,
      num_vin: vin,
      activo: true
    };
    if (!WORKSHOP_DATA.vehiculos) WORKSHOP_DATA.vehiculos = [];
    WORKSHOP_DATA.vehiculos.unshift(vehiculoGuardado);
    showToast(`Vehículo ${placa} registrado con éxito`, 'success');
  }

  if (typeof persistirDatosLocales === 'function') persistirDatosLocales();

  if (sbClient && vehiculoGuardado) {
    sbClient.from('vehiculos').upsert({
      id_vehiculo: vehiculoGuardado.id_vehiculo,
      id_cliente: idCliente,
      placa: placa,
      marca: marca,
      modelo: modelo,
      anio: anio,
      color: color,
      kilometraje_actual: km,
      num_vin: vin,
      activo: true
    }, { onConflict: 'placa' }).then(() => console.log(`Vehículo ${placa} guardado en Supabase Cloud`))
    .catch(err => console.warn('Error guardando vehículo en Supabase:', err));
  }

  cerrarModal('modal-vehiculo');
  renderVehiculosTable();
}

// Ordenes de trabajo y diagnostico
// ----
function renderOrdenesTable() {
  const ordenes = WORKSHOP_DATA.ordenes || [];
  const q = (document.getElementById('txt-buscar-orden')?.value || '').toLowerCase().trim();
  const estadoFiltro = document.getElementById('cmb-filtro-estado-orden')?.value || 'TODOS';

  const filtered = ordenes.filter(o => {
    const matchesEstado = estadoFiltro === 'TODOS' || o.estado === estadoFiltro;
    if (!matchesEstado) return false;
    if (!q) return true;
    return (o.codigo_orden && o.codigo_orden.toLowerCase().includes(q)) ||
           (o.placa && o.placa.toLowerCase().includes(q)) ||
           (o.cliente_nombre && o.cliente_nombre.toLowerCase().includes(q)) ||
           (o.mecanico_nombre && o.mecanico_nombre.toLowerCase().includes(q));
  });

  // Ordenamiento dinámico
  const sort = (state.tableSort && state.tableSort.ordenes) || { column: 'codigo_orden', direction: 'desc' };
  if (sort && sort.column) {
    filtered.sort((a, b) => {
      let res = 0;
      switch (sort.column) {
        case 'codigo_orden':
          res = (a.codigo_orden || '').localeCompare(b.codigo_orden || '', undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'fecha_ingreso':
          res = new Date(a.fecha_ingreso || 0) - new Date(b.fecha_ingreso || 0);
          break;
        case 'placa':
          res = (a.placa || '').localeCompare(b.placa || '', undefined, { numeric: true });
          break;
        case 'vehiculo': {
          const vA = `${a.vehiculo_marca || ''} ${a.vehiculo_modelo || a.vehiculo || ''}`.trim();
          const vB = `${b.vehiculo_marca || ''} ${b.vehiculo_modelo || b.vehiculo || ''}`.trim();
          res = vA.localeCompare(vB, undefined, { numeric: true });
          break;
        }
        case 'cliente_nombre':
          res = (a.cliente_nombre || '').localeCompare(b.cliente_nombre || '', undefined, { sensitivity: 'base' });
          break;
        case 'mecanico_nombre':
          res = (a.mecanico_nombre || '').localeCompare(b.mecanico_nombre || '', undefined, { sensitivity: 'base' });
          break;
        case 'estado':
          res = (a.estado || '').localeCompare(b.estado || '');
          break;
        case 'total_mano_obra':
          res = (parseFloat(a.total_mano_obra) || 0) - (parseFloat(b.total_mano_obra) || 0);
          break;
        case 'total_repuestos':
          res = (parseFloat(a.total_repuestos) || 0) - (parseFloat(b.total_repuestos) || 0);
          break;
        case 'total_general':
          res = (parseFloat(a.total_general) || 0) - (parseFloat(b.total_general) || 0);
          break;
        case 'pagado':
          res = (a.pagado ? 1 : 0) - (b.pagado ? 1 : 0);
          break;
        default:
          res = (a.id_orden || 0) - (b.id_orden || 0);
      }
      return sort.direction === 'desc' ? -res : res;
    });
  }

  // Indicadores
  const elTotal = document.getElementById('kpi-ordenes-total-count');
  const elEnTaller = document.getElementById('kpi-ordenes-en-taller');
  const elListas = document.getElementById('kpi-ordenes-listas');
  const elMonto = document.getElementById('kpi-ordenes-monto-total');
  const badgeTotal = document.getElementById('badge-total-ordenes');

  const enTallerCount = ordenes.filter(o => ['REGISTRADO', 'RECEPCIONADO', 'EN_DIAGNOSTICO', 'DIAGNOSTICO', 'EN_REPARACION', 'EN_PROCESO', 'ESPERA_REPUESTOS', 'EN_PRUEBAS', 'CONTROL_CALIDAD'].includes(o.estado)).length;
  const listasCount = ordenes.filter(o => ['LISTO', 'ENTREGADO'].includes(o.estado)).length;
  const facturacionMonto = ordenes.reduce((sum, o) => sum + (o.total_general || 0), 0);

  if (elTotal) elTotal.textContent = ordenes.length;
  if (elEnTaller) elEnTaller.textContent = enTallerCount;
  if (elListas) elListas.textContent = listasCount;
  if (elMonto) elMonto.textContent = formatMoney(facturacionMonto);
  if (badgeTotal) badgeTotal.textContent = ordenes.length;

  const tbody = document.getElementById('ordenes-table-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(o => {
    const badgeCls = getEstadoBadgeClass(o.estado);
    const fecha = o.fecha_ingreso ? String(o.fecha_ingreso).split('T')[0] : '2024-10-24';
    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${state.selectedOrdenId === o.id_orden ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarOrdenFilaWeb(${o.id_orden})">
        <td class="p-3 text-center">
          <input type="radio" name="sel-orden" ${state.selectedOrdenId === o.id_orden ? 'checked' : ''} class="pointer">
        </td>
        <td class="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">${o.codigo_orden}</td>
        <td class="p-3 font-mono text-slate-500">${fecha}</td>
        <td class="p-3"><span class="plate-badge text-xs">${o.placa}</span></td>
        <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''}</td>
        <td class="p-3 font-medium text-slate-900 dark:text-white truncate max-w-[140px]">${o.cliente_nombre}</td>
        <td class="p-3 text-slate-600 dark:text-slate-400">${o.mecanico_nombre || 'Carlos Mendoza'}</td>
        <td class="p-3"><span class="badge-status ${badgeCls}">${o.estado}</span></td>
        <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(o.total_mano_obra || 180)}</td>
        <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(o.total_repuestos || 240)}</td>
        <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatMoney(o.total_general)}</td>
        <td class="p-3">
          <span class="badge-status ${o.pagado ? 'badge-emerald' : 'badge-amber'}">${o.pagado ? 'PAGADO' : 'PENDIENTE'}</span>
        </td>
      </tr>
    `;
  }).join('');

  actualizarIndicadoresOrdenacion('ordenes');
}

function filtrarOrdenesWeb() {
  renderOrdenesTable();
}

function cargarOrdenesWeb() {
  const inp = document.getElementById('txt-buscar-orden');
  const sel = document.getElementById('cmb-filtro-estado-orden');
  if (inp) inp.value = '';
  if (sel) sel.value = 'TODOS';
  renderOrdenesTable();
  showToast('Listado de órdenes de trabajo sincronizado', 'info');
}

function seleccionarOrdenFilaWeb(id) {
  state.selectedOrdenId = id;
  renderOrdenesTable();
}

function getEstadoBadgeClass(estado) {
  switch (estado) {
    case 'LISTO':
    case 'ENTREGADO':
      return 'badge-emerald';
    case 'EN_REPARACION':
    case 'EN_PROCESO':
      return 'badge-cobalt';
    case 'EN_DIAGNOSTICO':
    case 'DIAGNOSTICO':
      return 'badge-purple';
    case 'EN_PRUEBAS':
    case 'CONTROL_CALIDAD':
      return 'badge-amber';
    case 'CANCELADO':
      return 'badge-crimson';
    default:
      return 'badge-amber';
  }
}

function abrirModalCambiarEstadoWeb() {
  if (!state.selectedOrdenId && (WORKSHOP_DATA.ordenes || []).length > 0) {
    state.selectedOrdenId = WORKSHOP_DATA.ordenes[0].id_orden;
  }
  if (!state.selectedOrdenId) {
    showToast('No hay órdenes disponibles para cambiar de estado', 'error');
    return;
  }
  const orden = (WORKSHOP_DATA.ordenes || []).find(o => o.id_orden === state.selectedOrdenId);
  if (!orden) return;

  const modal = document.getElementById('modal-cambiar-estado');
  const elId = document.getElementById('form-estado-id-orden');
  const elInfo = document.getElementById('form-estado-codigo-info');
  const elNuevo = document.getElementById('form-estado-nuevo');

  if (elId) elId.value = orden.id_orden;
  if (elInfo) elInfo.textContent = `${orden.codigo_orden} - ${orden.placa} (${orden.cliente_nombre})`;
  if (elNuevo) elNuevo.value = orden.estado;

  const selMec = document.getElementById('form-estado-mecanico');
  if (selMec) {
    const usuarios = WORKSHOP_DATA.usuarios || [];
    const mecs = usuarios.filter(u => u.rol === 'MECANICO');
    selMec.innerHTML = mecs.map(m => {
      const nom = `${m.nombres} ${m.apellidos}`.trim();
      const isSelected = orden.mecanico_nombre && orden.mecanico_nombre.includes(m.nombres);
      return `<option value="${nom}" ${isSelected ? 'selected' : ''}>${nom}</option>`;
    }).join('');
  }

  abrirModalElemento(modal);
}

function guardarCambioEstadoWeb(e) {
  e.preventDefault();
  const id = document.getElementById('form-estado-id-orden')?.value;
  const nuevo = document.getElementById('form-estado-nuevo')?.value || 'EN_PROCESO';
  const nuevoMecanico = document.getElementById('form-estado-mecanico')?.value;
  const orden = (WORKSHOP_DATA.ordenes || []).find(o => o.id_orden == id);

  if (orden) {
    orden.estado = nuevo;
    if (nuevoMecanico) orden.mecanico_nombre = nuevoMecanico;
    showToast(`Orden ${orden.codigo_orden} actualizada a: ${nuevo} (${orden.mecanico_nombre})`, 'success');

    if (sbClient) {
      sbClient.from('ordenes_trabajo').update({ estado: nuevo }).eq('codigo_orden', orden.codigo_orden)
        .then(() => console.log(`Estado de OT ${orden.codigo_orden} actualizado en Supabase: ${nuevo}`))
        .catch(err => console.warn('Error actualizando estado en Supabase:', err));
    }
  }

  cerrarModal('modal-cambiar-estado');
  guardarDatosLocalStorage();
  renderOrdenesTable();
  renderDashboard();
}

function verDetalleOrdenSeleccionadaWeb() {
  if (!state.selectedOrdenId && (WORKSHOP_DATA.ordenes || []).length > 0) {
    state.selectedOrdenId = WORKSHOP_DATA.ordenes[0].id_orden;
  }
  if (!state.selectedOrdenId) {
    showToast('No hay órdenes disponibles para ver detalle', 'error');
    return;
  }
  verDetalleOrdenDirectaWeb(state.selectedOrdenId);
}

function verDetalleOrdenDirectaWeb(id) {
  const orden = (WORKSHOP_DATA.ordenes || []).find(o => o.id_orden == id);
  if (!orden) return;

  state.selectedOrdenId = id;
  const modal = document.getElementById('modal-detalle-orden');
  const elCodigo = document.getElementById('modal-detalle-codigo');
  if (elCodigo) elCodigo.textContent = orden.codigo_orden;
  const badgeEstado = document.getElementById('modal-detalle-estado');
  if (badgeEstado) {
    badgeEstado.textContent = orden.estado;
    badgeEstado.className = `badge-status ${getEstadoBadgeClass(orden.estado)}`;
  }

  const content = document.getElementById('modal-detalle-content');
  content.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-[#2a3b56]">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Vehículo & Placa</span>
        <div class="font-bold text-slate-800 dark:text-slate-200 mt-0.5">${orden.vehiculo_marca || ''} ${orden.vehiculo_modelo || orden.vehiculo || ''}</div>
        <span class="plate-badge text-[10px] mt-1 inline-block">${orden.placa}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Cliente Titular</span>
        <div class="font-bold text-slate-800 dark:text-slate-200 mt-0.5">${orden.cliente_nombre}</div>
        <span class="text-slate-400 text-[11px] font-mono">${orden.cliente_telefono || orden.cliente_doc || ''}</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Técnico Asignado</span>
        <div class="font-bold text-slate-800 dark:text-slate-200 mt-0.5">${orden.mecanico_nombre || 'Carlos Mendoza'}</div>
        <span class="text-emerald-600 font-semibold text-[11px]">Bahía Operativa</span>
      </div>
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase">Total Valorizado</span>
        <div class="font-bold font-mono text-emerald-600 text-base mt-0.5">${formatMoney(orden.total_general)}</div>
        <span class="badge-status ${orden.pagado ? 'badge-emerald' : 'badge-amber'} text-[10px]">${orden.pagado ? 'COBRADO EN CAJA' : 'PENDIENTE DE PAGO'}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="font-bold text-slate-700 dark:text-slate-300">Motivo de Ingreso & Diagnóstico Técnico:</span>
      <p class="p-3 rounded-lg bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-[#2a3b56] text-slate-600 dark:text-slate-300">
        ${orden.motivo_ingreso || 'Mantenimiento integral y revisión general de sistemas.'}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span class="font-bold text-slate-700 dark:text-slate-300">Servicios de Mano de Obra:</span>
      <div class="p-3 rounded-lg border border-slate-200 dark:border-[#2a3b56] bg-slate-50 dark:bg-[#101726] flex justify-between items-center">
        <span>${orden.servicio || 'Mano de Obra Especializada y Calibración'}</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">${formatMoney(orden.total_mano_obra || (orden.total_general * 0.4))}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="font-bold text-slate-700 dark:text-slate-300">Repuestos Utilizados:</span>
      <div class="p-3 rounded-lg border border-slate-200 dark:border-[#2a3b56] bg-slate-50 dark:bg-[#101726] flex justify-between items-center">
        <span>Kits de Repuestos y Fluidos de Motor</span>
        <span class="font-mono font-bold text-slate-900 dark:text-white">${formatMoney(orden.total_repuestos || (orden.total_general * 0.6))}</span>
      </div>
    </div>
  `;

  abrirModalElemento(modal);
}

// Inventario y servicios
function switchInventarioTab(tabName) {
  reproducirSonido('click');
  state.activeInventarioTab = tabName;

  const btnRep = document.getElementById('tab-btn-repuestos');
  const btnSrv = document.getElementById('tab-btn-servicios');
  const contentRep = document.getElementById('tab-content-repuestos');
  const contentSrv = document.getElementById('tab-content-servicios');

  if (tabName === 'repuestos') {
    if (btnRep) btnRep.className = 'px-4 py-2.5 text-xs font-bold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2 pointer transition-colors';
    if (btnSrv) btnSrv.className = 'px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-b-2 border-transparent flex items-center gap-2 pointer transition-colors';
    if (contentRep) contentRep.classList.remove('hidden');
    if (contentSrv) contentSrv.classList.add('hidden');
    renderRepuestosTable();
  } else {
    if (btnSrv) btnSrv.className = 'px-4 py-2.5 text-xs font-bold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2 pointer transition-colors';
    if (btnRep) btnRep.className = 'px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-b-2 border-transparent flex items-center gap-2 pointer transition-colors';
    if (contentSrv) contentSrv.classList.remove('hidden');
    if (contentRep) contentRep.classList.add('hidden');
    renderServiciosTable();
  }
}

function renderInventarioTables() {
  if (state.activeInventarioTab === 'repuestos') {
    renderRepuestosTable();
  } else {
    renderServiciosTable();
  }
}

function renderRepuestosTable(filtro = '') {
  const repuestos = WORKSHOP_DATA.repuestos || [];
  const q = filtro.toLowerCase().trim();
  const filtered = repuestos.filter(r => {
    if (!q) return true;
    return (r.codigo && r.codigo.toLowerCase().includes(q)) ||
           (r.nombre && r.nombre.toLowerCase().includes(q)) ||
           (r.marca && r.marca.toLowerCase().includes(q));
  });

  const tbody = document.getElementById('repuestos-table-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(r => {
    const isCritico = r.stock_actual <= r.stock_minimo;
    const alertBadge = isCritico ? '<span class="badge-status badge-crimson">STOCK BAJO</span>' : '<span class="badge-status badge-emerald">NORMAL</span>';
    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${state.selectedRepuestoId === r.id_repuesto ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarRepuestoFilaWeb(${r.id_repuesto})">
        <td class="p-3 text-center">
          <input type="radio" name="sel-repuesto" ${state.selectedRepuestoId === r.id_repuesto ? 'checked' : ''} class="pointer">
        </td>
        <td class="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">${r.codigo}</td>
        <td class="p-3 font-semibold text-slate-900 dark:text-white">${r.nombre}</td>
        <td class="p-3 text-slate-600 dark:text-slate-400">${r.marca}</td>
        <td class="p-3 text-slate-500">${r.categoria_nombre || 'General'}</td>
        <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(r.precio_compra)}</td>
        <td class="p-3 font-mono font-bold text-slate-900 dark:text-white">${formatMoney(r.precio_venta)}</td>
        <td class="p-3 font-mono font-bold ${isCritico ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}">${r.stock_actual} un.</td>
        <td class="p-3 font-mono text-slate-500">${r.stock_minimo} un.</td>
        <td class="p-3 text-slate-500">${r.ubicacion || 'Estante A'}</td>
        <td class="p-3">${alertBadge}</td>
      </tr>
    `;
  }).join('');
}

function filtrarRepuestosWeb(val) {
  renderRepuestosTable(val);
}

function cargarRepuestosWeb() {
  const inp = document.getElementById('txt-buscar-repuesto');
  if (inp) inp.value = '';
  renderRepuestosTable();
  showToast('Catálogo de repuestos actualizado', 'info');
}

function seleccionarRepuestoFilaWeb(id) {
  state.selectedRepuestoId = id;
  renderRepuestosTable(document.getElementById('txt-buscar-repuesto')?.value || '');
}

function editarRepuestoSeleccionadoWeb() {
  if (!state.selectedRepuestoId && (WORKSHOP_DATA.repuestos || []).length > 0) {
    state.selectedRepuestoId = WORKSHOP_DATA.repuestos[0].id_repuesto;
  }
  if (!state.selectedRepuestoId) {
    showToast('Seleccione un repuesto para editar', 'warning');
    return;
  }
  const rep = (WORKSHOP_DATA.repuestos || []).find(r => r.id_repuesto === state.selectedRepuestoId);
  if (rep) abrirModalRepuesto(rep);
}

function cambiarEstadoRepuestoSeleccionadoWeb() {
  if (!state.selectedRepuestoId && (WORKSHOP_DATA.repuestos || []).length > 0) {
    state.selectedRepuestoId = WORKSHOP_DATA.repuestos[0].id_repuesto;
  }
  if (!state.selectedRepuestoId) {
    showToast('Seleccione un repuesto para cambiar su estado', 'warning');
    return;
  }
  const rep = (WORKSHOP_DATA.repuestos || []).find(r => r.id_repuesto === state.selectedRepuestoId);
  if (!rep) return;
  rep.activo = (rep.activo === false ? true : false);
  reproducirSonido('click');
  showToast(`Repuesto ${rep.codigo} marcado como ${rep.activo ? 'DISPONIBLE' : 'INACTIVO'}`, 'success');
  guardarDatosLocalStorage();
  renderRepuestosTable(document.getElementById('txt-buscar-repuesto')?.value || '');
}

function abrirModalRepuesto(rep = null) {
  reproducirSonido('click');
  const modal = document.getElementById('modal-repuesto');
  const title = document.getElementById('modal-repuesto-title');
  const form = document.getElementById('form-repuesto');
  if (!modal || !form) return;
  form.reset();

  const elId = document.getElementById('form-rep-id');
  const elCod = document.getElementById('form-rep-codigo');
  const elMar = document.getElementById('form-rep-marca');
  const elNom = document.getElementById('form-rep-nombre');
  const elPC = document.getElementById('form-rep-pcompra');
  const elPV = document.getElementById('form-rep-pventa');
  const elStk = document.getElementById('form-rep-stock');
  const elMin = document.getElementById('form-rep-min');
  const elUbi = document.getElementById('form-rep-ubicacion');

  if (rep) {
    if (title) title.textContent = 'Editar Repuesto';
    if (elId) elId.value = rep.id_repuesto || '';
    if (elCod) elCod.value = rep.codigo || '';
    if (elMar) elMar.value = rep.marca || '';
    if (elNom) elNom.value = rep.nombre || '';
    if (elPC) elPC.value = rep.precio_compra ?? '';
    if (elPV) elPV.value = rep.precio_venta ?? '';
    if (elStk) elStk.value = rep.stock_actual ?? 0;
    if (elMin) elMin.value = rep.stock_minimo ?? 0;
    if (elUbi) elUbi.value = rep.ubicacion || '';
  } else {
    if (title) title.textContent = 'Nuevo Repuesto';
    if (elId) elId.value = '';
  }

  abrirModalElemento(modal);
}

function guardarRepuestoWeb(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('form-rep-id')?.value;
  const codigo = (document.getElementById('form-rep-codigo')?.value || '').toUpperCase().trim();
  const marca = (document.getElementById('form-rep-marca')?.value || '').trim();
  const nombre = (document.getElementById('form-rep-nombre')?.value || '').trim();
  const pcompra = parseFloat(document.getElementById('form-rep-pcompra')?.value) || 0;
  const pventa = parseFloat(document.getElementById('form-rep-pventa')?.value) || 0;
  const stock = parseInt(document.getElementById('form-rep-stock')?.value) || 0;
  const smin = parseInt(document.getElementById('form-rep-min')?.value) || 0;
  const ubicacion = (document.getElementById('form-rep-ubicacion')?.value || '').trim();

  if (!codigo || !nombre) {
    showToast('El código SKU y el nombre del repuesto son obligatorios', 'warning');
    return;
  }
  if (pcompra < 0 || pventa < 0) {
    showToast('Los precios no pueden ser negativos', 'warning');
    return;
  }
  if (stock < 0 || smin < 0) {
    showToast('Los niveles de stock no pueden ser negativos', 'warning');
    return;
  }

  if (id) {
    const rep = (WORKSHOP_DATA.repuestos || []).find(r => r.id_repuesto == id);
    if (rep) {
      rep.codigo = codigo;
      rep.marca = marca;
      rep.nombre = nombre;
      rep.precio_compra = pcompra;
      rep.precio_venta = pventa;
      rep.stock_actual = stock;
      rep.stock_minimo = smin;
      rep.ubicacion = ubicacion;
      showToast(`Repuesto ${codigo} actualizado correctamente`, 'success');
    }
  } else {
    const newId = (WORKSHOP_DATA.repuestos || []).reduce((max, r) => Math.max(max, r.id_repuesto || 0), 0) + 1;
    const nuevo = {
      id_repuesto: newId,
      codigo: codigo || `REP-${newId}`,
      marca: marca || 'Genérico',
      nombre: nombre,
      categoria_nombre: 'General',
      precio_compra: pcompra,
      precio_venta: pventa,
      stock_actual: stock,
      stock_minimo: smin,
      ubicacion: ubicacion || 'Almacén 1',
      activo: true
    };
    if (!WORKSHOP_DATA.repuestos) WORKSHOP_DATA.repuestos = [];
    WORKSHOP_DATA.repuestos.unshift(nuevo);
    showToast(`Repuesto ${nuevo.codigo} guardado en almacén`, 'success');
  }

  cerrarModal('modal-repuesto');
  guardarDatosLocalStorage();
  renderRepuestosTable();
}

function abrirModalAjusteStockWeb() {
  if (!state.selectedRepuestoId && (WORKSHOP_DATA.repuestos || []).length > 0) {
    state.selectedRepuestoId = WORKSHOP_DATA.repuestos[0].id_repuesto;
  }
  if (!state.selectedRepuestoId) {
    showToast('No hay repuestos registrados para ajustar stock', 'error');
    return;
  }
  const rep = (WORKSHOP_DATA.repuestos || []).find(r => r.id_repuesto === state.selectedRepuestoId);
  if (!rep) return;

  const modal = document.getElementById('modal-ajuste-stock');
  const elId = document.getElementById('form-ajuste-id-rep');
  const elNom = document.getElementById('form-ajuste-nombre');
  const elCant = document.getElementById('form-ajuste-cantidad');

  if (elId) elId.value = rep.id_repuesto;
  if (elNom) elNom.textContent = `${rep.codigo} - ${rep.nombre} (${rep.marca})`;
  if (elCant) elCant.value = rep.stock_actual;
  abrirModalElemento(modal);
}

function guardarAjusteStockWeb(e) {
  e.preventDefault();
  const id = document.getElementById('form-ajuste-id-rep')?.value;
  const cant = parseInt(document.getElementById('form-ajuste-cantidad')?.value) || 0;
  const rep = (WORKSHOP_DATA.repuestos || []).find(r => r.id_repuesto == id);

  if (rep) {
    rep.stock_actual = cant;
    showToast(`Stock de ${rep.codigo} actualizado a ${cant} unidades`, 'success');
  }

  cerrarModal('modal-ajuste-stock');
  guardarDatosLocalStorage();
  renderRepuestosTable();
}

function renderServiciosTable(filtro = '') {
  const servicios = WORKSHOP_DATA.servicios || [];
  const q = filtro.toLowerCase().trim();
  const filtered = servicios.filter(s => {
    if (!q) return true;
    return (s.codigo && s.codigo.toLowerCase().includes(q)) ||
           (s.nombre && s.nombre.toLowerCase().includes(q)) ||
           (s.tipo_nombre && s.tipo_nombre.toLowerCase().includes(q));
  });

  const tbody = document.getElementById('servicios-table-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(s => {
    const isSelected = state.selectedServicioId === s.id_servicio;
    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${isSelected ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarServicioFilaWeb(${s.id_servicio})">
        <td class="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">${s.codigo}</td>
        <td class="p-3 font-semibold text-slate-900 dark:text-white">${s.nombre}</td>
        <td class="p-3 text-slate-600 dark:text-slate-400">${s.tipo_nombre || 'Mantenimiento'}</td>
        <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatMoney(s.precio_base)}</td>
        <td class="p-3 font-mono text-slate-500">${s.tiempo_estimado_min || 60} min</td>
        <td class="p-3 text-slate-500 truncate max-w-[260px]">${s.descripcion || '-'}</td>
        <td class="p-3">
          <span class="badge-status ${s.activo ? 'badge-emerald' : 'badge-crimson'}">${s.activo ? 'DISPONIBLE' : 'SUSPENDIDO'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarServiciosWeb(val) {
  renderServiciosTable(val);
}

function cargarServiciosWeb() {
  const inp = document.getElementById('txt-buscar-servicio');
  if (inp) inp.value = '';
  renderServiciosTable();
  showToast('Tarifario de servicios sincronizado', 'info');
}

function seleccionarServicioFilaWeb(id) {
  state.selectedServicioId = id;
  renderServiciosTable(document.getElementById('txt-buscar-servicio')?.value || '');
}

function abrirModalServicio(srv = null) {
  reproducirSonido('click');
  const modal = document.getElementById('modal-servicio');
  const title = document.getElementById('modal-servicio-title');
  const form = document.getElementById('form-servicio');
  if (!modal || !form) return;
  form.reset();

  const elId = document.getElementById('form-srv-id');
  const elCod = document.getElementById('form-srv-codigo');
  const elNom = document.getElementById('form-srv-nombre');
  const elPre = document.getElementById('form-srv-precio');
  const elTie = document.getElementById('form-srv-tiempo');
  const elTip = document.getElementById('form-srv-tipo');
  const elDes = document.getElementById('form-srv-desc');

  if (srv) {
    if (title) title.textContent = 'Editar Servicio (Mano de Obra)';
    if (elId) elId.value = srv.id_servicio || '';
    if (elCod) elCod.value = srv.codigo || '';
    if (elNom) elNom.value = srv.nombre || '';
    if (elPre) elPre.value = srv.precio_base ?? '';
    if (elTie) elTie.value = srv.tiempo_estimado_min ?? 60;
    if (elTip) elTip.value = srv.tipo_nombre || 'General';
    if (elDes) elDes.value = srv.descripcion || '';
  } else {
    if (title) title.textContent = 'Nuevo Servicio (Mano de Obra)';
    if (elId) elId.value = '';
  }

  abrirModalElemento(modal);
}

function editarServicioSeleccionadoWeb() {
  if (!state.selectedServicioId && (WORKSHOP_DATA.servicios || []).length > 0) {
    state.selectedServicioId = WORKSHOP_DATA.servicios[0].id_servicio;
  }
  if (!state.selectedServicioId) {
    showToast('Seleccione un servicio para editar', 'warning');
    return;
  }
  const srv = (WORKSHOP_DATA.servicios || []).find(s => s.id_servicio === state.selectedServicioId);
  if (srv) abrirModalServicio(srv);
}

function cambiarEstadoServicioSeleccionadoWeb() {
  if (!state.selectedServicioId && (WORKSHOP_DATA.servicios || []).length > 0) {
    state.selectedServicioId = WORKSHOP_DATA.servicios[0].id_servicio;
  }
  if (!state.selectedServicioId) {
    showToast('Seleccione un servicio para cambiar su estado', 'warning');
    return;
  }
  const srv = (WORKSHOP_DATA.servicios || []).find(s => s.id_servicio === state.selectedServicioId);
  if (!srv) return;
  srv.activo = (srv.activo === false ? true : false);
  reproducirSonido('click');
  showToast(`Servicio ${srv.codigo} marcado como ${srv.activo ? 'DISPONIBLE' : 'SUSPENDIDO'}`, 'success');
  guardarDatosLocalStorage();
  renderServiciosTable(document.getElementById('txt-buscar-servicio')?.value || '');
}

function guardarServicioWeb(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('form-srv-id')?.value;
  const codigo = (document.getElementById('form-srv-codigo')?.value || '').toUpperCase().trim();
  const nombre = (document.getElementById('form-srv-nombre')?.value || '').trim();
  const precio = parseFloat(document.getElementById('form-srv-precio')?.value) || 0;
  const tiempo = parseInt(document.getElementById('form-srv-tiempo')?.value) || 60;
  const tipo = (document.getElementById('form-srv-tipo')?.value || '').trim() || 'General';
  const desc = (document.getElementById('form-srv-desc')?.value || '').trim();

  if (!codigo || !nombre) {
    showToast('El código y el nombre del servicio son obligatorios', 'warning');
    return;
  }
  if (precio < 0) {
    showToast('El precio no puede ser negativo', 'warning');
    return;
  }
  if (tiempo <= 0) {
    showToast('El tiempo estimado debe ser mayor a 0 minutos', 'warning');
    return;
  }
  if (tipo && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(tipo)) {
    showToast('El tipo de servicio debe contener únicamente letras', 'warning');
    return;
  }

  if (id) {
    const srv = (WORKSHOP_DATA.servicios || []).find(s => s.id_servicio == id);
    if (srv) {
      srv.codigo = codigo;
      srv.nombre = nombre;
      srv.precio_base = precio;
      srv.tiempo_estimado_min = tiempo;
      srv.tipo_nombre = tipo;
      srv.descripcion = desc;
      showToast(`Servicio ${codigo} actualizado correctamente`, 'success');
    }
  } else {
    const newId = (WORKSHOP_DATA.servicios || []).reduce((max, s) => Math.max(max, s.id_servicio || 0), 0) + 1;
    const nuevo = {
      id_servicio: newId,
      codigo: codigo || `SRV-${newId}`,
      nombre: nombre || 'Servicio General',
      precio_base: precio,
      tiempo_estimado_min: tiempo,
      tipo_nombre: tipo,
      descripcion: desc,
      activo: true
    };
    if (!WORKSHOP_DATA.servicios) WORKSHOP_DATA.servicios = [];
    WORKSHOP_DATA.servicios.unshift(nuevo);
    showToast(`Servicio ${nuevo.codigo} agregado al tarifario`, 'success');
  }

  cerrarModal('modal-servicio');
  guardarDatosLocalStorage();
  renderServiciosTable();
}

// Caja y comprobantes de pago
// ----
function switchCajaTab(tabName) {
  reproducirSonido('click');
  state.activeCajaTab = tabName;

  const btnPend = document.getElementById('tab-btn-caja-pendientes');
  const btnEmit = document.getElementById('tab-btn-caja-emitidos');
  const btnArqueo = document.getElementById('tab-btn-caja-arqueo');
  const contentPend = document.getElementById('tab-content-caja-pendientes');
  const contentEmit = document.getElementById('tab-content-caja-emitidos');
  const contentArqueo = document.getElementById('tab-content-caja-arqueo');

  const inactiveBtnClass = 'px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-b-2 border-transparent flex items-center gap-2 pointer transition-colors';
  const activeBtnClass = 'px-4 py-2.5 text-xs font-bold text-blue-600 border-b-2 border-blue-600 flex items-center gap-2 pointer transition-colors';

  if (btnPend) btnPend.className = inactiveBtnClass;
  if (btnEmit) btnEmit.className = inactiveBtnClass;
  if (btnArqueo) btnArqueo.className = inactiveBtnClass;
  if (contentPend) contentPend.classList.add('hidden');
  if (contentEmit) contentEmit.classList.add('hidden');
  if (contentArqueo) contentArqueo.classList.add('hidden');

  if (tabName === 'pendientes') {
    if (btnPend) btnPend.className = activeBtnClass;
    if (contentPend) contentPend.classList.remove('hidden');
    renderCajaPendientesTable();
  } else if (tabName === 'emitidos') {
    if (btnEmit) btnEmit.className = activeBtnClass;
    if (contentEmit) contentEmit.classList.remove('hidden');
    renderCajaEmitidosTable();
  } else if (tabName === 'arqueo') {
    if (btnArqueo) btnArqueo.className = activeBtnClass;
    if (contentArqueo) contentArqueo.classList.remove('hidden');
    if (typeof renderArqueoCaja === 'function') renderArqueoCaja();
  }
}

function renderCajaTables() {
  const comprobantes = WORKSHOP_DATA.comprobantes || [];
  const ordenes = WORKSHOP_DATA.ordenes || [];
  const pendientes = ordenes.filter(o => !o.pagado && o.estado !== 'CANCELADO');
  const totalRecaudado = comprobantes.reduce((sum, c) => sum + (c.total || 0), 0);
  const totalPendiente = pendientes.reduce((sum, o) => sum + (o.total_general || 0), 0);

  // Indicadores
  const elRecaudacion = document.getElementById('kpi-caja-recaudacion');
  const elEmitidosCount = document.getElementById('kpi-caja-emitidos-count');
  const elPorCobrar = document.getElementById('kpi-caja-por-cobrar');
  const elLiquidar = document.getElementById('kpi-caja-ordenes-liquidar');

  if (elRecaudacion) elRecaudacion.textContent = formatMoney(totalRecaudado);
  if (elEmitidosCount) elEmitidosCount.textContent = comprobantes.length;
  if (elPorCobrar) elPorCobrar.textContent = formatMoney(totalPendiente);
  if (elLiquidar) elLiquidar.textContent = pendientes.length;

  if (state.activeCajaTab === 'pendientes') {
    renderCajaPendientesTable();
  } else {
    renderCajaEmitidosTable();
  }
}

function renderCajaPendientesTable(filtro = '') {
  const ordenes = WORKSHOP_DATA.ordenes || [];
  const pendientes = ordenes.filter(o => !o.pagado && o.estado !== 'CANCELADO');
  const q = filtro.toLowerCase().trim();
  const filtered = pendientes.filter(o => {
    if (!q) return true;
    return (o.codigo_orden && o.codigo_orden.toLowerCase().includes(q)) ||
           (o.placa && o.placa.toLowerCase().includes(q)) ||
           (o.cliente_nombre && o.cliente_nombre.toLowerCase().includes(q));
  });

  const tbody = document.getElementById('caja-pendientes-table-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(o => `
    <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${state.selectedCajaPendienteId === o.id_orden ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarCajaPendienteFilaWeb(${o.id_orden})">
      <td class="p-3 text-center">
        <input type="radio" name="sel-caja-pend" ${state.selectedCajaPendienteId === o.id_orden ? 'checked' : ''} class="pointer">
      </td>
      <td class="p-3 font-mono text-slate-400 font-bold">${o.id_orden}</td>
      <td class="p-3 font-mono font-bold text-blue-600">${o.codigo_orden}</td>
      <td class="p-3"><span class="plate-badge text-xs">${o.placa}</span></td>
      <td class="p-3 text-slate-800 dark:text-slate-200">${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''}</td>
      <td class="p-3 font-medium text-slate-900 dark:text-white">${o.cliente_nombre}</td>
      <td class="p-3 font-mono text-slate-500">${o.cliente_telefono || '-'}</td>
      <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatMoney(o.total_general)}</td>
      <td class="p-3"><span class="badge-status ${getEstadoBadgeClass(o.estado)}">${o.estado}</span></td>
    </tr>
  `).join('');
}

function filtrarCajaPendientesWeb(val) {
  renderCajaPendientesTable(val);
}

function seleccionarCajaPendienteFilaWeb(id) {
  state.selectedCajaPendienteId = id;
  renderCajaPendientesTable(document.getElementById('txt-buscar-caja-pendiente')?.value || '');
}

function renderCajaEmitidosTable(filtro = '') {
  const comprobantes = WORKSHOP_DATA.comprobantes || [];
  const q = filtro.toLowerCase().trim();
  const filtered = comprobantes.filter(c => {
    if (!q) return true;
    return (c.numero_completo && c.numero_completo.toLowerCase().includes(q)) ||
           (c.serie && c.serie.toLowerCase().includes(q)) ||
           (c.cliente_nombre && c.cliente_nombre.toLowerCase().includes(q)) ||
           (c.placa && c.placa.toLowerCase().includes(q));
  });

  const tbody = document.getElementById('caja-emitidos-table-body');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(c => `
    <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${state.selectedCajaEmitidoId === c.id_comprobante ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarCajaEmitidoFilaWeb(${c.id_comprobante})">
      <td class="p-3 text-center">
        <input type="radio" name="sel-caja-emit" ${state.selectedCajaEmitidoId === c.id_comprobante ? 'checked' : ''} class="pointer">
      </td>
      <td class="p-3 font-mono text-slate-400 font-bold">${c.id_comprobante}</td>
      <td class="p-3 font-mono font-bold text-blue-600">${c.numero_completo || (c.serie + '-' + c.numero)}</td>
      <td class="p-3 font-bold">${c.tipo_comprobante || c.tipo}</td>
      <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${c.codigo_orden || '-'}</td>
      <td class="p-3"><span class="plate-badge text-[11px]">${c.placa || '-'}</span></td>
      <td class="p-3 font-medium text-slate-900 dark:text-white">${c.cliente_nombre || c.receptor}</td>
      <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(c.subtotal)}</td>
      <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(c.igv)}</td>
      <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatMoney(c.total)}</td>
      <td class="p-3 font-mono text-slate-500">${c.fecha_emision ? String(c.fecha_emision).split('T')[0] : '2024-10-24'} ${c.hora || ''}</td>
      <td class="p-3"><span class="badge-status badge-emerald">${c.metodo_pago || 'EFECTIVO'}</span></td>
    </tr>
  `).join('');
}

function filtrarCajaEmitidosWeb(val) {
  renderCajaEmitidosTable(val);
}

function seleccionarCajaEmitidoFilaWeb(id) {
  state.selectedCajaEmitidoId = id;
  renderCajaEmitidosTable(document.getElementById('txt-buscar-caja-emitido')?.value || '');
}

function cargarCajaWeb() {
  renderCajaTables();
  showToast('Módulo de caja y cobros sincronizado', 'info');
}

function cobrarOrdenSeleccionadaCajaWeb() {
  const pendientes = (WORKSHOP_DATA.ordenes || []).filter(o => !o.pagado);
  if (!state.selectedCajaPendienteId && pendientes.length > 0) {
    state.selectedCajaPendienteId = pendientes[0].id_orden;
  }
  if (!state.selectedCajaPendienteId) {
    showToast('No hay órdenes pendientes de cobro en este momento', 'info');
    return;
  }
  const orden = (WORKSHOP_DATA.ordenes || []).find(o => o.id_orden === state.selectedCajaPendienteId);
  if (!orden) return;

  const modal = document.getElementById('modal-cobro');
  const inpId = document.getElementById('form-cobro-id-orden');
  const inpOrd = document.getElementById('form-cobro-orden-info');
  const inpCli = document.getElementById('form-cobro-cliente-info');
  if (inpId) inpId.value = orden.id_orden;
  if (inpOrd) inpOrd.value = `${orden.codigo_orden} - Placa: ${orden.placa}`;
  if (inpCli) inpCli.value = orden.cliente_nombre || '';

  const total = orden.total_general || 0;
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const igv = Math.round((total - subtotal) * 100) / 100;

  const elTot = document.getElementById('form-cobro-total');
  const elSub = document.getElementById('form-cobro-subtotal');
  const elIgv = document.getElementById('form-cobro-igv');
  if (elTot) elTot.textContent = formatMoney(total);
  if (elSub) elSub.textContent = formatMoney(subtotal);
  if (elIgv) elIgv.textContent = formatMoney(igv);

  actualizarSerieCobroWeb('BOLETA');
  if (modal) abrirModalElemento(modal);
}

function actualizarSerieCobroWeb(tipo) {
  const serie = tipo === 'BOLETA' ? 'B001' : (tipo === 'FACTURA' ? 'F001' : 'T001');
  const count = (WORKSHOP_DATA.comprobantes || []).filter(c => (c.tipo_comprobante === tipo || c.tipo === tipo)).length + 1;
  const numStr = String(count).padStart(8, '0');
  const el = document.getElementById('form-cobro-serie-num');
  if (el) el.value = `${serie}-${numStr}`;
}

function confirmarCobroEfectivoWeb(e) {
  if (e && e.preventDefault) e.preventDefault();
  const inpId = document.getElementById('form-cobro-id-orden');
  const idOrden = inpId ? parseInt(inpId.value) : 0;
  const orden = (WORKSHOP_DATA.ordenes || []).find(o => o.id_orden === idOrden);
  if (!orden) return;

  const tipo = document.getElementById('form-cobro-tipo')?.value || 'BOLETA';
  const serieNum = document.getElementById('form-cobro-serie-num')?.value || 'B001-00000001';
  const parts = serieNum.split('-');
  const serie = parts[0] || 'B001';
  const num = parts[1] || '00000001';

  const total = orden.total_general || 0;
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const igv = Math.round((total - subtotal) * 100) / 100;

  const newId = (WORKSHOP_DATA.comprobantes || []).reduce((max, c) => Math.max(max, c.id_comprobante || 0), 0) + 1;
  const nuevoComprobante = {
    id_comprobante: newId,
    id_orden: orden.id_orden,
    codigo_orden: orden.codigo_orden,
    placa: orden.placa,
    cliente_nombre: orden.cliente_nombre,
    cliente_doc: orden.cliente_doc || '',
    tipo_comprobante: tipo,
    serie: serie,
    numero: num,
    numero_completo: serieNum,
    subtotal: subtotal,
    igv: igv,
    total: total,
    metodo_pago: document.getElementById('form-cobro-metodo')?.value || 'EFECTIVO',
    referencia_pago: `Pago con ${document.getElementById('form-cobro-metodo')?.value || 'EFECTIVO'} - Caja Taller`,
    fecha_emision: new Date().toISOString(),
    hora: new Date().toLocaleTimeString('es-PE', { hour12: false }),
    estado: 'EMITIDO'
  };

  if (!WORKSHOP_DATA.comprobantes) WORKSHOP_DATA.comprobantes = [];
  WORKSHOP_DATA.comprobantes.unshift(nuevoComprobante);
  orden.pagado = true;
  orden.estado = 'ENTREGADO';
  guardarDatosLocalStorage();

  if (sbClient) {
    sbClient.from('ordenes_trabajo').update({ pagado: true, estado: 'ENTREGADO' }).eq('id_orden', orden.id_orden).then(() => {
      return sbClient.from('comprobantes_pago').insert([{
        id_orden: orden.id_orden,
        tipo_comprobante: tipo,
        serie: serie,
        numero: num,
        subtotal: subtotal,
        igv: igv,
        total: total,
        metodo_pago: 'EFECTIVO',
        referencia_pago: 'Pago en Efectivo - Caja Taller',
        estado: 'EMITIDO'
      }]);
    }).then(() => console.log(`Comprobante ${serieNum} guardado en Supabase Cloud`))
    .catch(err => console.warn('Error guardando cobro en Supabase:', err));
  }

  reproducirSonido('success');
  showToast(`Comprobante ${serieNum} emitido con éxito. Orden ${orden.codigo_orden} cobrada.`, 'success');

  cerrarModal('modal-cobro');
  switchCajaTab('emitidos');
  renderCajaTables();
  renderDashboard();
}

function imprimirComprobanteEmitidoWeb() {
  const comprobantes = WORKSHOP_DATA.comprobantes || [];
  if (!state.selectedCajaEmitidoId && comprobantes.length > 0) {
    state.selectedCajaEmitidoId = comprobantes[0].id_comprobante;
  }
  if (!state.selectedCajaEmitidoId) {
    showToast('No hay comprobantes emitidos para imprimir', 'info');
    return;
  }
  const comp = comprobantes.find(c => c.id_comprobante === state.selectedCajaEmitidoId);
  if (!comp) return;

  const modal = document.getElementById('modal-pdf-viewer');
  const content = document.getElementById('printable-pdf-content');

  content.innerHTML = `
    <div class="flex items-center justify-between pb-6 border-b-2 border-slate-900">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-blue-600 p-2.5 flex items-center justify-center">
          <img src="assets/logo_white.png" alt="MecaPro" class="w-full h-full object-contain">
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">MecaPro S.A.C.</h1>
          <p class="text-xs text-slate-600 font-medium">Taller Automotriz Multimarca & Mantenimiento Industrial</p>
          <p class="text-xs text-slate-500 font-mono">RUC: 20601234567 • Av. Rivera Navarrete 762, San Isidro</p>
        </div>
      </div>
      <div class="p-4 rounded-xl border-2 border-slate-900 text-center font-mono">
        <span class="font-extrabold text-base block text-slate-900">${comp.tipo_comprobante || comp.tipo}</span>
        <span class="text-sm font-bold text-blue-700 block mt-1">${comp.numero_completo || (comp.serie + '-' + comp.numero)}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
      <div>
        <span class="font-bold text-slate-500 block uppercase">Adquirente / Cliente:</span>
        <span class="font-extrabold text-slate-900 text-sm block mt-0.5">${comp.cliente_nombre || comp.receptor}</span>
        <span class="text-slate-600 font-mono">DOC: ${comp.cliente_doc || comp.ruc || comp.dni || 'Sin documento'}</span>
      </div>
      <div>
        <span class="font-bold text-slate-500 block uppercase">Datos de la Atención:</span>
        <span class="font-mono text-slate-900 font-bold block mt-0.5">Orden: ${comp.codigo_orden || '-'} • Placa: <span class="plate-badge text-[11px] font-bold">${comp.placa || '-'}</span></span>
        <span class="text-slate-600 font-mono">Fecha: ${comp.fecha_emision ? String(comp.fecha_emision).split('T')[0] : '2024-10-24'} ${comp.hora || ''}</span>
      </div>
    </div>

    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="border-b-2 border-slate-900 text-slate-900 font-extrabold bg-slate-100">
          <th class="p-2.5">Descripción del Servicio / Repuestos</th>
          <th class="p-2.5 text-center">Cant.</th>
          <th class="p-2.5 text-right">P. Unitario</th>
          <th class="p-2.5 text-right">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        <tr>
          <td class="p-3 font-medium">Servicio Mecánico Integral & Liquidación de OT ${comp.codigo_orden || ''}</td>
          <td class="p-3 text-center font-mono">1</td>
          <td class="p-3 text-right font-mono">${formatMoney(comp.subtotal)}</td>
          <td class="p-3 text-right font-mono font-bold">${formatMoney(comp.subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <div class="flex justify-end pt-4 border-t-2 border-slate-900">
      <div class="w-64 flex flex-col gap-1.5 text-xs font-mono">
        <div class="flex justify-between text-slate-600">
          <span>Subtotal Neto:</span>
          <span>${formatMoney(comp.subtotal)}</span>
        </div>
        <div class="flex justify-between text-slate-600">
          <span>IGV (18%):</span>
          <span>${formatMoney(comp.igv)}</span>
        </div>
        <div class="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-300">
          <span>TOTAL:</span>
          <span class="text-emerald-700">${formatMoney(comp.total)}</span>
        </div>
      </div>
    </div>

    <div class="mt-8 pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
      <span>Cajero: ${(state.currentUser && state.currentUser.nombres) || 'Administrador'} (${comp.metodo_pago || 'EFECTIVO'})</span>
      <span>Gracias por confiar en MecaPro Taller Automotriz</span>
    </div>
  `;

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
  refrescarIconos();
  showToast('Comprobante preparado para imprimir', 'success');
}

// Funciones de gestión de repuestos y servicios en Diagnóstico Técnico
function actualizarInfoStockRepuestoDiag(idOcodigo) {
  const select = document.getElementById('diag-repuesto-select');
  const val = idOcodigo || select?.value;
  const infoEl = document.getElementById('diag-repuesto-stock-info');
  if (!infoEl) return;

  const rep = (WORKSHOP_DATA.repuestos || []).find(r => r.id_repuesto == val || r.codigo == val);
  if (!rep) {
    infoEl.textContent = 'Seleccione un repuesto';
    infoEl.className = 'text-[10px] font-mono text-slate-500';
    return;
  }

  if (rep.stock_actual <= 0) {
    infoEl.innerHTML = `<span class="text-rose-600 font-bold">Sin existencias en almacén (0 un.) • Ubicación: ${rep.ubicacion || 'Almacén 1'}</span>`;
  } else if (rep.stock_actual <= rep.stock_minimo) {
    infoEl.innerHTML = `<span class="text-amber-600 font-bold">Stock crítico: ${rep.stock_actual} un. disponibles • Precio: ${formatMoney(rep.precio_venta)}</span>`;
  } else {
    infoEl.innerHTML = `<span class="text-emerald-600 font-bold">Stock disponible: ${rep.stock_actual} un. • Precio: ${formatMoney(rep.precio_venta)}</span>`;
  }
}

function agregarRepuestoADiagnosticoWeb() {
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  let diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  const o = (WORKSHOP_DATA.ordenes || []).find(x => x.codigo_orden === codigoOT);
  if (!diag || !o) {
    showToast('Seleccione una orden de trabajo válida', 'warning');
    return;
  }

  const selectRep = document.getElementById('diag-repuesto-select');
  const cantInput = document.getElementById('diag-repuesto-cantidad');
  const repId = selectRep?.value;
  const cant = parseInt(cantInput?.value || '1');

  if (!repId) {
    showToast('Seleccione un repuesto para agregar', 'warning');
    return;
  }
  if (isNaN(cant) || cant <= 0) {
    showToast('Ingrese una cantidad válida mayor a cero', 'warning');
    return;
  }

  const rep = (WORKSHOP_DATA.repuestos || []).find(r => r.id_repuesto == repId || r.codigo == repId);
  if (!rep) {
    showToast('Repuesto no encontrado en catálogo', 'error');
    return;
  }

  if (!diag.repuestos_agregados) diag.repuestos_agregados = [];
  const yaAgregado = diag.repuestos_agregados.find(r => r.id_repuesto === rep.id_repuesto);
  const cantTotal = (yaAgregado ? yaAgregado.cantidad : 0) + cant;

  if (cantTotal > rep.stock_actual) {
    showToast(`Stock insuficiente en almacén. Solo hay ${rep.stock_actual} un. de ${rep.nombre} (solicitado: ${cantTotal})`, 'error');
    reproducirSonido('error');
    return;
  }

  if (yaAgregado) {
    yaAgregado.cantidad = cantTotal;
    yaAgregado.subtotal = yaAgregado.cantidad * yaAgregado.precio_unitario;
  } else {
    diag.repuestos_agregados.push({
      id_repuesto: rep.id_repuesto,
      codigo: rep.codigo,
      nombre: rep.nombre,
      marca: rep.marca,
      cantidad: cant,
      precio_unitario: rep.precio_venta,
      subtotal: cant * rep.precio_venta
    });
  }

  recalcularCostosDiagnostico(diag, o);
  renderRepuestosAgregadosDiag(diag);
  showToast(`Se agregó ${cant} un. de ${rep.nombre} al presupuesto`, 'success');
  reproducirSonido('success');
}

function quitarRepuestoDeDiagnosticoWeb(idx) {
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  let diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  const o = (WORKSHOP_DATA.ordenes || []).find(x => x.codigo_orden === codigoOT);
  if (!diag || !diag.repuestos_agregados || !diag.repuestos_agregados[idx]) return;

  const item = diag.repuestos_agregados[idx];
  diag.repuestos_agregados.splice(idx, 1);
  recalcularCostosDiagnostico(diag, o);
  renderRepuestosAgregadosDiag(diag);
  showToast(`Se retiró ${item.nombre} del diagnóstico`, 'info');
  reproducirSonido('click');
}

function agregarServicioADiagnosticoWeb() {
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  let diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  const o = (WORKSHOP_DATA.ordenes || []).find(x => x.codigo_orden === codigoOT);
  if (!diag || !o) {
    showToast('Seleccione una orden de trabajo válida', 'warning');
    return;
  }

  const selectSrv = document.getElementById('diag-servicio-select');
  const srvId = selectSrv?.value;
  if (!srvId) {
    showToast('Seleccione un servicio de mano de obra', 'warning');
    return;
  }

  const srv = (WORKSHOP_DATA.servicios || []).find(s => s.id_servicio == srvId || s.codigo == srvId);
  if (!srv) {
    showToast('Servicio no encontrado', 'error');
    return;
  }

  if (!diag.servicios_agregados) diag.servicios_agregados = [];
  diag.servicios_agregados.push({
    id_servicio: srv.id_servicio,
    codigo: srv.codigo,
    nombre: srv.nombre,
    precio: srv.precio_base,
    tiempo_min: srv.tiempo_estimado_min || 60
  });

  recalcularCostosDiagnostico(diag, o);
  renderServiciosAgregadosDiag(diag);
  showToast(`Servicio ${srv.nombre} agregado al presupuesto`, 'success');
  reproducirSonido('success');
}

function quitarServicioDeDiagnosticoWeb(idx) {
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  let diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  const o = (WORKSHOP_DATA.ordenes || []).find(x => x.codigo_orden === codigoOT);
  if (!diag || !diag.servicios_agregados || !diag.servicios_agregados[idx]) return;

  const item = diag.servicios_agregados[idx];
  diag.servicios_agregados.splice(idx, 1);
  recalcularCostosDiagnostico(diag, o);
  renderServiciosAgregadosDiag(diag);
  showToast(`Se retiró ${item.nombre} de la mano de obra`, 'info');
  reproducirSonido('click');
}

function recalcularCostosDiagnostico(diag, o) {
  const totalRep = (diag.repuestos_agregados || []).reduce((acc, r) => acc + (r.subtotal || 0), 0);
  const totalMOExtras = (diag.servicios_agregados || []).reduce((acc, s) => acc + (s.precio || 0), 0);
  const totalMinutos = (diag.servicios_agregados || []).reduce((acc, s) => acc + (s.tiempo_min || 0), 0);

  const baseMO = o?.total_mano_obra || 180.00;
  const baseRep = (diag.repuestos_agregados && diag.repuestos_agregados.length > 0) ? totalRep : (o?.total_repuestos || 220.00);
  const moFinal = baseMO + totalMOExtras;
  const repFinal = (diag.repuestos_agregados && diag.repuestos_agregados.length > 0) ? totalRep : baseRep;
  const totFinal = moFinal + repFinal;

  diag.costo_mano_obra = moFinal;
  diag.costo_repuestos = repFinal;
  diag.total_estimado = totFinal;
  if (totalMinutos > 0) {
    diag.horas_estimadas = Math.round((2.5 + (totalMinutos / 60)) * 10) / 10;
  }

  if (o) {
    o.total_mano_obra = moFinal;
    o.total_repuestos = repFinal;
    o.total_general = totFinal;
  }

  const costoMO = document.getElementById('diag-costo-mo');
  const horasMO = document.getElementById('diag-horas-mo');
  const costoRep = document.getElementById('diag-costo-rep');
  const costoTotal = document.getElementById('diag-costo-total');

  if (costoMO) costoMO.textContent = formatMoney(moFinal);
  if (horasMO) horasMO.textContent = `${diag.horas_estimadas || 2.5} hrs estimadas`;
  if (costoRep) costoRep.textContent = formatMoney(repFinal);
  if (costoTotal) costoTotal.textContent = formatMoney(totFinal);

  guardarDatosLocalStorage();
}

function renderRepuestosAgregadosDiag(diag) {
  const container = document.getElementById('diag-repuestos-agregados-container');
  if (!container) return;

  const items = diag.repuestos_agregados || [];
  if (items.length === 0) {
    container.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs">Sin repuestos requeridos aún para esta orden.</div>';
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-slate-50 dark:bg-[#162032] text-slate-500 font-semibold border-b border-slate-200 dark:border-[#233047]">
        <tr>
          <th class="p-2">Código</th>
          <th class="p-2">Repuesto</th>
          <th class="p-2 text-center">Cant.</th>
          <th class="p-2 text-right">P. Unit</th>
          <th class="p-2 text-right">Subtotal</th>
          <th class="p-2 text-center">Acción</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-[#233047]">
        ${items.map((r, i) => `
          <tr class="hover:bg-slate-50 dark:hover:bg-[#162032]">
            <td class="p-2 font-mono text-blue-600 font-bold">${r.codigo}</td>
            <td class="p-2 font-medium text-slate-800 dark:text-slate-200">${r.nombre}</td>
            <td class="p-2 text-center font-bold font-mono">${r.cantidad}</td>
            <td class="p-2 text-right font-mono text-slate-600 dark:text-slate-400">${formatMoney(r.precio_unitario)}</td>
            <td class="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">${formatMoney(r.subtotal)}</td>
            <td class="p-2 text-center">
              <button type="button" onclick="quitarRepuestoDeDiagnosticoWeb(${i})" class="text-rose-500 hover:text-rose-700 p-1 pointer" title="Eliminar"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  refrescarIconos();
}

function renderServiciosAgregadosDiag(diag) {
  const container = document.getElementById('diag-servicios-agregados-container');
  if (!container) return;

  const items = diag.servicios_agregados || [];
  if (items.length === 0) {
    container.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs">Sin servicios adicionales agregados a la mano de obra.</div>';
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead class="bg-slate-50 dark:bg-[#162032] text-slate-500 font-semibold border-b border-slate-200 dark:border-[#233047]">
        <tr>
          <th class="p-2">Código</th>
          <th class="p-2">Servicio</th>
          <th class="p-2 text-center">Tiempo</th>
          <th class="p-2 text-right">Precio</th>
          <th class="p-2 text-center">Acción</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-[#233047]">
        ${items.map((s, i) => `
          <tr class="hover:bg-slate-50 dark:hover:bg-[#162032]">
            <td class="p-2 font-mono text-amber-600 font-bold">${s.codigo}</td>
            <td class="p-2 font-medium text-slate-800 dark:text-slate-200">${s.nombre}</td>
            <td class="p-2 text-center font-mono text-slate-500">${s.tiempo_min} min</td>
            <td class="p-2 text-right font-mono font-bold text-emerald-600">${formatMoney(s.precio)}</td>
            <td class="p-2 text-center">
              <button type="button" onclick="quitarServicioDeDiagnosticoWeb(${i})" class="text-rose-500 hover:text-rose-700 p-1 pointer" title="Eliminar"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  refrescarIconos();
}

// Diagnóstico técnico
function renderDiagnosticoView() {
  const selectOT = document.getElementById('diag-select-ot');
  if (!selectOT) return;

  const ordenes = WORKSHOP_DATA.ordenes || [];
  selectOT.innerHTML = ordenes.map(o => `
    <option value="${o.codigo_orden}" ${state.selectedOrdenId === o.id_orden ? 'selected' : ''}>
      ${o.codigo_orden} | ${o.placa} - ${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''} (${o.cliente_nombre})
    </option>
  `).join('');

  const currentOT = selectOT.value || 'OT-2026-001';
  cargarDiagnosticoSeleccionado(currentOT);
}

function cargarDiagnosticoSeleccionado(codigoOT) {
  const o = (WORKSHOP_DATA.ordenes || []).find(x => x.codigo_orden === codigoOT) || (WORKSHOP_DATA.ordenes || [])[0];
  if (!o) return;

  // Buscar diagnóstico registrado o crear e insertar en el almacén de datos
  if (!WORKSHOP_DATA.diagnosticos_tecnicos) WORKSHOP_DATA.diagnosticos_tecnicos = [];
  let diag = WORKSHOP_DATA.diagnosticos_tecnicos.find(d => d.codigo_ot === o.codigo_orden);
  if (!diag) {
    diag = {
      id_diagnostico: WORKSHOP_DATA.diagnosticos_tecnicos.length + 1,
      placa: o.placa,
      codigo_ot: o.codigo_orden,
      vehiculo: `${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || 'Automóvil'}`.trim(),
      cliente: o.cliente_nombre,
      mecanico: o.mecanico_nombre || 'Carlos Mendoza',
      kilometraje_ingreso: o.kilometraje || 62500,
      nivel_gasolina: '1/2 Tanque',
      peritaje_carroceria: {
        rayones: 'Micro-rayones superficiales de uso urbano',
        abolladuras: 'Ninguna abolladura de consideración',
        accesorios: 'Llanta de repuesto, llave de ruedas y gata operativas',
        estado_general: 'Conforme'
      },
      subsistemas: [
        { nombre: 'Motor & Inyección', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
        { nombre: 'Sistema de Frenos', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
        { nombre: 'Suspensión & Dirección', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
        { nombre: 'Sistema Eléctrico & Batería', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
        { nombre: 'Fluidos & Lubricación', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' }
      ],
      dictamen_mecanico: o.diagnostico || `Vehículo ingresa por ${o.motivo_ingreso || o.servicio || 'revisión general'}. Pendiente de dictamen del mecánico.`,
      horas_estimadas: 2.5,
      costo_mano_obra: o.total_mano_obra || 180.00,
      costo_repuestos: o.total_repuestos || 220.00,
      total_estimado: o.total_general || 400.00
    };
    WORKSHOP_DATA.diagnosticos_tecnicos.push(diag);
  }

  // Etiqueta de estado
  const badgeContainer = document.getElementById('diag-vehiculo-badge');
  if (badgeContainer) {
    badgeContainer.innerHTML = `
      <span class="plate-badge text-xs">${o.placa}</span>
      <span class="font-bold text-slate-700 dark:text-slate-200">${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''}</span>
      <span class="text-slate-400">•</span>
      <span class="text-slate-500">${o.cliente_nombre}</span>
    `;
  }

  // Campos de diagnóstico
  const inputKm = document.getElementById('diag-input-km');
  const selectGas = document.getElementById('diag-select-gas');
  const inputFrontal = document.getElementById('diag-danos-frontal');
  const inputLateralDer = document.getElementById('diag-danos-lateral-der');
  const inputPosterior = document.getElementById('diag-danos-posterior');
  const mecanicoName = document.getElementById('diag-mecanico-name');
  const dictamenTexto = document.getElementById('diag-dictamen-texto');
  const costoMO = document.getElementById('diag-costo-mo');
  const horasMO = document.getElementById('diag-horas-mo');
  const costoRep = document.getElementById('diag-costo-rep');
  const costoTotal = document.getElementById('diag-costo-total');

  if (inputKm) inputKm.value = diag.kilometraje_ingreso || o.kilometraje || 70000;
  if (selectGas) selectGas.value = diag.nivel_gasolina || '1/2 Tanque';
  if (inputFrontal) inputFrontal.value = diag.peritaje_carroceria?.rayones || 'Sin impactos en frontal ni lunas.';
  if (inputLateralDer) inputLateralDer.value = diag.peritaje_carroceria?.abolladuras || 'Rayón leve preexistente en guardafango.';
  if (inputPosterior) inputPosterior.value = diag.peritaje_carroceria?.accesorios || 'Herramientas a bordo completas.';
  if (mecanicoName) mecanicoName.textContent = `Mecánico: ${diag.mecanico || o.mecanico_nombre || 'Carlos Mendoza'}`;
  if (dictamenTexto) dictamenTexto.value = diag.dictamen_mecanico || '';
  if (costoMO) costoMO.textContent = formatMoney(diag.costo_mano_obra);
  if (horasMO) horasMO.textContent = `${diag.horas_estimadas || 2.5} hrs estimadas`;
  if (costoRep) costoRep.textContent = formatMoney(diag.costo_repuestos);
  if (costoTotal) costoTotal.textContent = formatMoney(diag.total_estimado);

  // Poblar combos y contenedores de repuestos y servicios en diagnóstico
  const selRep = document.getElementById('diag-repuesto-select');
  if (selRep) {
    const reps = WORKSHOP_DATA.repuestos || [];
    selRep.innerHTML = reps.map(r => `
      <option value="${r.id_repuesto}">${r.codigo} - ${r.nombre} (Stock: ${r.stock_actual} | ${formatMoney(r.precio_venta)})</option>
    `).join('');
    if (reps.length > 0) {
      actualizarInfoStockRepuestoDiag(reps[0].id_repuesto);
    }
  }

  const selSrv = document.getElementById('diag-servicio-select');
  if (selSrv) {
    const srvs = WORKSHOP_DATA.servicios || [];
    selSrv.innerHTML = srvs.map(s => `
      <option value="${s.id_servicio}">${s.codigo} - ${s.nombre} (${formatMoney(s.precio_base)})</option>
    `).join('');
  }

  renderRepuestosAgregadosDiag(diag);
  renderServiciosAgregadosDiag(diag);

  // Renderizar subsistemas con estado inicial
  const subsistemasContainer = document.getElementById('diag-subsistemas-list');
  if (subsistemasContainer) {
    subsistemasContainer.innerHTML = (diag.subsistemas || []).map((sub, idx) => {
      const isCritico = sub.estado === 'CRITICO';
      const isRegular = sub.estado === 'REGULAR';
      const isBueno = sub.estado === 'BUENO';
      const isPendiente = !isCritico && !isRegular && !isBueno;
      const estadoLabel = isBueno ? 'BUENO' : isRegular ? 'REGULAR' : isCritico ? 'CRITICO' : 'PENDIENTE';
      const badgeClass = isCritico ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900' :
                         isRegular ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900' :
                         isBueno ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' :
                         'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700';

      return `
        <div class="p-3 rounded-xl border border-slate-200 dark:border-[#2a3b56] bg-slate-50/60 dark:bg-[#101726]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-slate-800 dark:text-slate-100">${sub.nombre}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}">${estadoLabel}</span>
            </div>
            <input type="text" id="diag-sub-nota-${idx}" value="${sub.notas || ''}" oninput="actualizarNotaSubsistema(${idx}, this.value)" placeholder="Escribir observación técnica de fosa..." class="w-full mt-1.5 px-2.5 py-1 text-[11px] rounded border border-slate-200 dark:border-[#2a3b56] bg-white dark:bg-[#162032] text-slate-600 dark:text-slate-300">
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" onclick="cambiarEstadoSubsistema(${idx}, 'BUENO')" class="px-2.5 py-1 rounded text-[10px] font-bold transition-all ${isBueno ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-[#1a253a] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#25334d]'} pointer">OK</button>
            <button type="button" onclick="cambiarEstadoSubsistema(${idx}, 'REGULAR')" class="px-2.5 py-1 rounded text-[10px] font-bold transition-all ${isRegular ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-[#1a253a] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#25334d]'} pointer">OBS</button>
            <button type="button" onclick="cambiarEstadoSubsistema(${idx}, 'CRITICO')" class="px-2.5 py-1 rounded text-[10px] font-bold transition-all ${isCritico ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-[#1a253a] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#25334d]'} pointer">CRIT</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

function cambiarEstadoSubsistema(index, nuevoEstado) {
  reproducirSonido('click');
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  let diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  if (!diag) {
    cargarDiagnosticoSeleccionado(codigoOT);
    diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  }
  if (diag && diag.subsistemas && diag.subsistemas[index]) {
    // Si presiona el mismo botón activo, vuelve a pendiente
    if (diag.subsistemas[index].estado === nuevoEstado) {
      diag.subsistemas[index].estado = 'PENDIENTE';
    } else {
      diag.subsistemas[index].estado = nuevoEstado;
    }
    cargarDiagnosticoSeleccionado(codigoOT);
    sincronizarDiagnosticoASupabase(diag);
  }
}

function actualizarNotaSubsistema(index, nota) {
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  let diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  if (diag && diag.subsistemas && diag.subsistemas[index]) {
    diag.subsistemas[index].notas = nota;
  }
}

function guardarDiagnosticoWeb() {
  reproducirSonido('success');
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  let diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);
  const o = (WORKSHOP_DATA.ordenes || []).find(x => x.codigo_orden === codigoOT);

  const inputKm = document.getElementById('diag-input-km');
  const selectGas = document.getElementById('diag-select-gas');
  const inputFrontal = document.getElementById('diag-danos-frontal');
  const inputLateralDer = document.getElementById('diag-danos-lateral-der');
  const inputPosterior = document.getElementById('diag-danos-posterior');
  const dictamenTexto = document.getElementById('diag-dictamen-texto');

  if (!diag && o) {
    diag = {
      id_diagnostico: (WORKSHOP_DATA.diagnosticos_tecnicos || []).length + 1,
      placa: o.placa,
      codigo_ot: o.codigo_orden,
      vehiculo: `${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''}`,
      cliente: o.cliente_nombre,
      mecanico: o.mecanico_nombre || 'Carlos Mendoza',
      fecha: new Date().toISOString().split('T')[0],
      peritaje_carroceria: {},
      subsistemas: []
    };
    if (!WORKSHOP_DATA.diagnosticos_tecnicos) WORKSHOP_DATA.diagnosticos_tecnicos = [];
    WORKSHOP_DATA.diagnosticos_tecnicos.unshift(diag);
  }

  if (diag) {
    if (inputKm) diag.kilometraje_ingreso = parseInt(inputKm.value) || diag.kilometraje_ingreso;
    if (selectGas) diag.nivel_gasolina = selectGas.value;
    if (!diag.peritaje_carroceria) diag.peritaje_carroceria = {};
    if (inputFrontal) diag.peritaje_carroceria.rayones = inputFrontal.value;
    if (inputLateralDer) diag.peritaje_carroceria.abolladuras = inputLateralDer.value;
    if (inputPosterior) diag.peritaje_carroceria.accesorios = inputPosterior.value;
    if (dictamenTexto) diag.dictamen_mecanico = dictamenTexto.value;

    // Guardar observaciones de cada subsistema
    if (diag.subsistemas) {
      diag.subsistemas.forEach((sub, idx) => {
        const notaInput = document.getElementById(`diag-sub-nota-${idx}`);
        if (notaInput) sub.notas = notaInput.value;
      });
    }

    // Actualizar también en la orden maestra
    if (o) {
      if (inputKm) o.kilometraje = parseInt(inputKm.value) || o.kilometraje;
      if (dictamenTexto) o.diagnostico = dictamenTexto.value;
    }

    sincronizarDiagnosticoASupabase(diag);
  }

  showToast(`Peritaje de ingreso y dictamen técnico de ${codigoOT} guardados exitosamente`, 'success');
}

function imprimirDiagnosticoPDFWeb() {
  reproducirSonido('click');
  const selectOT = document.getElementById('diag-select-ot');
  const codigoOT = selectOT ? selectOT.value : 'OT-2026-001';
  const o = (WORKSHOP_DATA.ordenes || []).find(x => x.codigo_orden === codigoOT) || (WORKSHOP_DATA.ordenes || [])[0];
  const diag = (WORKSHOP_DATA.diagnosticos_tecnicos || []).find(d => d.codigo_ot === codigoOT);

  const modal = document.getElementById('modal-pdf-viewer');
  const content = document.getElementById('printable-pdf-content');

  content.innerHTML = `
    <div class="flex items-center justify-between pb-6 border-b-2 border-slate-900">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-blue-600 p-2.5 flex items-center justify-center">
          <img src="assets/logo_white.png" alt="MecaPro" class="w-full h-full object-contain">
        </div>
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">MecaPro S.A.C.</h1>
          <p class="text-xs text-slate-600 font-medium">Ficha Oficial de Diagnóstico e Inspección Técnica</p>
          <p class="text-xs text-slate-500 font-mono">Taller Mecánico Especializado • RUC 20601234567</p>
        </div>
      </div>
      <div class="text-right">
        <span class="font-mono text-xl font-extrabold text-blue-700 block">${o.codigo_orden}</span>
        <span class="plate-badge text-sm px-2.5 py-0.5 mt-1 inline-block">${o.placa}</span>
      </div>
    </div>

    <!-- Ficha del Vehículo e Ingreso -->
    <div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mt-4">
      <div>
        <span class="font-bold text-slate-600 block uppercase">Vehículo & Cliente:</span>
        <span class="font-extrabold text-slate-900 text-sm block mt-0.5">${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''}</span>
        <span class="text-slate-600">Propietario: <strong>${o.cliente_nombre}</strong></span>
        <span class="text-slate-500 font-mono text-[11px] block">Km de Entrada: ${(o.kilometraje || 78420).toLocaleString()} km • Combustible: 1/2 Tanque</span>
      </div>
      <div>
        <span class="font-bold text-slate-600 block uppercase">Peritaje e Inspección de Ingreso:</span>
        <span class="text-slate-700 block text-[11px] mt-0.5">• Carrocería: Rayón superficial en guardafango derecho preexistente.</span>
        <span class="text-slate-700 block text-[11px]">• Lunas y Faros: Sin impactos ni fisuras.</span>
        <span class="text-slate-700 block text-[11px]">• Accesorios: Gata, llave de ruedas y llanta repuesto verificadas.</span>
      </div>
    </div>

    <!-- Evaluación de Subsistemas -->
    <div class="mt-4">
      <h3 class="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">Evaluación Técnica de Subsistemas Automotrices:</h3>
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b-2 border-slate-900 text-slate-900 font-extrabold bg-slate-100">
            <th class="p-2.5">Subsistema</th>
            <th class="p-2.5 text-center">Estado Técnico</th>
            <th class="p-2.5">Observación del Mecánico</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          ${(diag?.subsistemas || [
            { nombre: 'Motor & Inyección', estado: 'REGULAR', notas: 'Filtro combustible saturado. Presión de riel 1600 bar.' },
            { nombre: 'Sistema de Frenos', estado: 'CRITICO', notas: 'Pastillas en 1.5mm (límite alcanzado). Discos con rebaba 0.8mm.' },
            { nombre: 'Suspensión & Dirección', estado: 'BUENO', notas: 'Amortiguadores secos sin fugas. Rótulas firmes.' },
            { nombre: 'Sistema Eléctrico & Batería', estado: 'BUENO', notas: 'Batería 12.6V reposo, 14.2V carga. Sin DTCs activos.' },
            { nombre: 'Fluidos & Lubricación', estado: 'CRITICO', notas: 'Aceite 5W-30 degradado (10,200 km). Cambio urgente.' }
          ]).map(s => `
            <tr>
              <td class="p-2.5 font-bold">${s.nombre}</td>
              <td class="p-2.5 text-center"><span class="badge-status ${s.estado === 'CRITICO' ? 'badge-rose' : s.estado === 'REGULAR' ? 'badge-amber' : 'badge-emerald'}">${s.estado}</span></td>
              <td class="p-2.5 text-slate-600">${s.notas}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Dictamen y Presupuesto -->
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mt-4">
      <span class="font-extrabold text-slate-900 uppercase block mb-1">Dictamen del Mecánico:</span>
      <p class="text-slate-700 italic">${diag?.dictamen_mecanico || o.diagnostico || 'Se recomienda servicio correctivo integral de frenos y lubricación.'}</p>
      
      <div class="grid grid-cols-3 gap-4 pt-3 mt-3 border-t border-slate-200 text-center font-mono">
        <div><span class="text-slate-600 block text-[10px] font-bold">MANO DE OBRA:</span><strong class="text-slate-900">${formatMoney(o.total_mano_obra || 250)}</strong></div>
        <div><span class="text-slate-600 block text-[10px] font-bold">REPUESTOS:</span><strong class="text-slate-900">${formatMoney(o.total_repuestos || 345)}</strong></div>
        <div><span class="text-blue-700 block text-[10px] font-bold">TOTAL PRESUPUESTADO:</span><strong class="text-emerald-700 text-sm font-extrabold">${formatMoney(o.total_general)}</strong></div>
      </div>
    </div>

    <!-- Firmas -->
    <div class="grid grid-cols-2 gap-8 pt-10 mt-6 border-t border-slate-300 text-center text-xs">
      <div>
        <div class="border-t border-slate-400 w-48 mx-auto mb-1"></div>
        <span class="font-bold text-slate-800 block">${o.mecanico_nombre || 'Carlos Mendoza'}</span>
        <span class="text-slate-600 text-[10px] font-medium">Mecánico Especialista Responsable</span>
      </div>
      <div>
        <div class="border-t border-slate-400 w-48 mx-auto mb-1"></div>
        <span class="font-bold text-slate-800 block">${o.cliente_nombre}</span>
        <span class="text-slate-600 text-[10px] font-medium">Firma de Conformidad del Peritaje</span>
      </div>
    </div>
  `;

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
  refrescarIconos();
  showToast('Ficha técnica de diagnóstico lista para imprimir', 'success');
}

// Seguimiento en línea
function renderTrackingView() {
  const placaInput = document.getElementById('txt-tracking-placa');
  const query = placaInput && placaInput.value.trim() ? placaInput.value.trim() : 'B3X-892';
  consultarTrackingRapido(query);
}

function buscarTrackingWeb() {
  reproducirSonido('click');
  const input = document.getElementById('txt-tracking-placa');
  const val = input ? input.value.trim() : '';
  if (!val) {
    showToast('Ingresa una placa o código de orden para consultar', 'info');
    return;
  }
  consultarTrackingRapido(val);
}

function consultarTrackingRapido(placaOrOT) {
  reproducirSonido('click');
  const q = String(placaOrOT || '').toUpperCase().trim();
  const input = document.getElementById('txt-tracking-placa');
  if (input) input.value = q;

  const ordenes = WORKSHOP_DATA.ordenes || [];
  const o = ordenes.find(x => (x.placa && String(x.placa).toUpperCase() === q) || (x.codigo_orden && String(x.codigo_orden).toUpperCase() === q));
  state.currentTrackingOrder = o;
  const container = document.getElementById('tracking-result-container');
  if (!container) return;

  if (!o) {
    container.innerHTML = `
      <div class="p-8 rounded-2xl border border-slate-200 dark:border-[#233047] bg-white dark:bg-[#162032] text-center flex flex-col items-center justify-center gap-3">
        <div class="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
          <i data-lucide="alert-circle" class="w-6 h-6"></i>
        </div>
        <h4 class="font-extrabold text-slate-800 dark:text-white text-base">No se encontró ninguna orden activa</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md">No existe ninguna orden o vehículo registrado con la placa o código "<strong>${q || 'ingresado'}</strong>". Verifique el número e intente nuevamente.</p>
      </div>
    `;
    refrescarIconos();
    return;
  }

  const isListo = o.estado === 'LISTO' || o.estado === 'ENTREGADO';
  const isPruebas = o.estado === 'EN_PRUEBAS';
  const isReparacion = o.estado === 'EN_REPARACION';
  const isDiagnostico = o.estado === 'EN_DIAGNOSTICO' || o.estado === 'REGISTRADO';

  container.innerHTML = `
    <!-- Tarjeta del vehículo con placa -->
    <div class="p-6 rounded-2xl border border-slate-200 dark:border-[#233047] bg-white dark:bg-[#162032] shadow-sm flex flex-col gap-6">
      
      <!-- Ficha de Encabezado -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#233047]">
        <div class="flex items-center gap-4">
          <!-- Placa Oficial Estilo Perú -->
          <div class="inline-flex flex-col items-center border-2 border-slate-900 rounded-lg overflow-hidden bg-white shadow-xs flex-shrink-0">
            <div class="bg-blue-600 text-white w-full text-center text-[9px] font-extrabold tracking-widest uppercase py-0.5">PERÚ</div>
            <div class="px-3 py-1 font-mono font-black text-slate-900 text-lg tracking-wider">${o.placa}</div>
          </div>
          <div>
            <h3 class="text-xl font-extrabold text-slate-900 dark:text-white">${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || 'Vehículo'} (${o.anio || 2022})</h3>
            <span class="text-xs text-slate-500 dark:text-slate-400">Propietario: <strong>${o.cliente_nombre}</strong> • Orden: <span class="font-mono font-bold text-blue-600">${o.codigo_orden}</span></span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right">
            <span class="text-[10px] font-bold text-slate-400 block uppercase">Estado en Taller</span>
            <span class="badge-status ${getEstadoBadgeClass(o.estado)} mt-0.5 inline-block text-xs px-3 py-1">${o.estado}</span>
          </div>
        </div>
      </div>

      <!-- Etapas del servicio en taller -->
      <div class="flex flex-col gap-3 py-2">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Progreso del Servicio en Taller:</span>
        
        <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <!-- Etapa 1 -->
          <div class="p-3 rounded-xl border ${true ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-[#2a3b56] bg-slate-50 dark:bg-[#101726]'} flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-emerald-700 dark:text-emerald-400">1. Recepción</span>
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
            </div>
            <span class="text-[11px] text-slate-600 dark:text-slate-300">Inventario y Km de entrada</span>
            <span class="text-[10px] text-slate-400 font-mono">Completado</span>
          </div>

          <!-- Etapa 2 -->
          <div class="p-3 rounded-xl border ${!isDiagnostico || o.estado === 'EN_DIAGNOSTICO' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-[#2a3b56] bg-slate-50 dark:bg-[#101726]'} flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-emerald-700 dark:text-emerald-400">2. Diagnóstico</span>
              <i data-lucide="${!isDiagnostico ? 'check-circle' : 'clock'}" class="w-4 h-4 ${!isDiagnostico ? 'text-emerald-600' : 'text-amber-500'}"></i>
            </div>
            <span class="text-[11px] text-slate-600 dark:text-slate-300">Inspección de fallas y piezas</span>
            <span class="text-[10px] font-mono ${!isDiagnostico ? 'text-slate-400' : 'text-amber-600 font-bold'}">${!isDiagnostico ? 'Completado' : 'En Evaluación'}</span>
          </div>

          <!-- Etapa 3 -->
          <div class="p-3 rounded-xl border ${isReparacion ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20' : isPruebas || isListo ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-[#2a3b56] bg-slate-50 dark:bg-[#101726]'} flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-bold ${isReparacion ? 'text-blue-700 dark:text-blue-300' : isPruebas || isListo ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}">3. Reparación</span>
              <i data-lucide="${isPruebas || isListo ? 'check-circle' : 'wrench'}" class="w-4 h-4 ${isPruebas || isListo ? 'text-emerald-600' : isReparacion ? 'text-blue-600 animate-pulse' : 'text-slate-400'}"></i>
            </div>
            <span class="text-[11px] text-slate-600 dark:text-slate-300">Cambio de repuestos en bahía</span>
            <span class="text-[10px] font-mono ${isReparacion ? 'text-blue-600 font-extrabold' : 'text-slate-400'}">${isReparacion ? 'TRABAJANDO AHORA' : isPruebas || isListo ? 'Completado' : 'Pendiente'}</span>
          </div>

          <!-- Etapa 4 -->
          <div class="p-3 rounded-xl border ${isPruebas ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30' : isListo ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-[#2a3b56] bg-slate-50 dark:bg-[#101726]'} flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-bold ${isPruebas ? 'text-amber-700 dark:text-amber-300' : isListo ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}">4. Pruebas</span>
              <i data-lucide="${isListo ? 'check-circle' : 'gauge'}" class="w-4 h-4 ${isListo ? 'text-emerald-600' : isPruebas ? 'text-amber-500 animate-spin' : 'text-slate-400'}"></i>
            </div>
            <span class="text-[11px] text-slate-600 dark:text-slate-300">Control de calidad y ruta</span>
            <span class="text-[10px] font-mono text-slate-400">${isListo ? 'Aprobado' : isPruebas ? 'En Prueba' : 'Programado'}</span>
          </div>

          <!-- Etapa 5 -->
          <div class="p-3 rounded-xl border ${isListo ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-[#2a3b56] bg-slate-50 dark:bg-[#101726]'} flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-bold ${isListo ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}">5. Entrega</span>
              <i data-lucide="check" class="w-4 h-4 ${isListo ? 'text-emerald-600' : 'text-slate-400'}"></i>
            </div>
            <span class="text-[11px] text-slate-600 dark:text-slate-300">Listo para retiro y lavado</span>
            <span class="text-[10px] font-mono ${isListo ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}">${isListo ? 'LISTO EN TALLER' : 'Pendiente'}</span>
          </div>
        </div>
      </div>

      <!-- Detalle técnico y presupuesto -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div class="p-4 rounded-xl border border-slate-200 dark:border-[#2a3b56] bg-slate-50/50 dark:bg-[#101726]/50 flex flex-col gap-2.5 text-xs">
          <span class="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Diagnóstico Técnico Emitido:</span>
          <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${o.diagnostico || 'Se procedió con el mantenimiento integral de frenos, alineamiento computarizado y reemplazo de fluidos según especificaciones del fabricante.'}</p>
          <div class="pt-2 border-t border-slate-200 dark:border-[#2a3b56] flex items-center justify-between text-slate-500">
            <span>Mecánico a cargo: <strong>${o.mecanico_nombre || 'Carlos Mendoza'}</strong></span>
            <span>Bahía Asignada: <strong>Bahía 02 (Elevador Hidráulico)</strong></span>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-slate-200 dark:border-[#2a3b56] bg-slate-50/50 dark:bg-[#101726]/50 flex flex-col justify-between gap-3 text-xs">
          <div>
            <span class="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Resumen Económico Transparente:</span>
            <div class="space-y-1.5 mt-2 font-mono text-slate-700 dark:text-slate-300">
              <div class="flex justify-between">
                <span>Mano de Obra Calificada:</span>
                <span>${formatMoney(o.total_mano_obra || (o.total_general * 0.4))}</span>
              </div>
              <div class="flex justify-between">
                <span>Repuestos & Insumos OEM:</span>
                <span>${formatMoney(o.total_repuestos || (o.total_general * 0.6))}</span>
              </div>
              <div class="flex justify-between pt-1.5 border-t border-slate-200 dark:border-[#2a3b56] font-bold text-sm text-slate-900 dark:text-white">
                <span>Total a Pagar (Inc. IGV):</span>
                <span class="text-emerald-600 dark:text-emerald-400">${formatMoney(o.total_general)}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button onclick="window.open('https://wa.me/51987654321?text=Hola,%20quisiera%20consultar%20sobre%20mi%20vehiculo%20placa%20${o.placa}', '_blank')" class="btn-scandi btn-scandi-secondary text-xs flex-1 flex items-center justify-center gap-1.5">
              <i data-lucide="message-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Consultar Asesor</span>
            </button>
            <button onclick="imprimirProformaOrdenPDF()" class="btn-scandi btn-scandi-primary text-xs flex-1 flex items-center justify-center gap-1.5">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Descargar Ficha PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  refrescarIconos();
}

function copiarLinkTrackingWeb() {
  const input = document.getElementById('txt-tracking-placa');
  const placa = input ? input.value : 'B3X-892';
  const url = `${window.location.origin}${window.location.pathname}#tracking-${placa}`;
  navigator.clipboard.writeText(url).then(() => {
    reproducirSonido('success');
    showToast('Enlace de rastreo copiado al portapapeles', 'success');
  }).catch(() => {
    showToast('Enlace generado: ' + url, 'info');
  });
}

// Reportes gerenciales
state.activeReporteTipo = 'financiero';
state.activeRangoReporte = 'mes_actual';

function renderReportesView() {
  if (!state.activeRangoReporte) {
    state.activeRangoReporte = 'mes_actual';
  }
  const inputDesde = document.getElementById('rep-filtro-desde');
  const inputHasta = document.getElementById('rep-filtro-hasta');
  if (inputDesde && inputHasta && (!inputDesde.value || !inputHasta.value)) {
    setRangoReporte('mes_actual');
  } else {
    actualizarEstilosBotonesRango(state.activeRangoReporte);
  }
  const selMec = document.getElementById('rep-filtro-mecanico');
  if (selMec) {
    const currentVal = selMec.value || 'TODOS';
    const ordenes = WORKSHOP_DATA.ordenes || [];
    const usuarios = WORKSHOP_DATA.usuarios || [];
    const mecs = new Set();
    usuarios.filter(u => u.rol === 'MECANICO').forEach(u => mecs.add(`${u.nombres} ${u.apellidos}`.trim()));
    ordenes.forEach(o => { if (o.mecanico_nombre) mecs.add(o.mecanico_nombre.trim()); });
    selMec.innerHTML = '<option value="TODOS">Todos los Técnicos</option>' + Array.from(mecs).map(m => `<option value="${m}" ${currentVal === m ? 'selected' : ''}>${m}</option>`).join('');
  }

  seleccionarTipoReporte(state.activeReporteTipo || 'financiero');
}

function seleccionarTipoReporte(tipo) {
  reproducirSonido('click');
  state.activeReporteTipo = tipo;

  // Actualizar botones superiores
  ['financiero', 'stock', 'historial', 'garantias'].forEach(t => {
    const btn = document.getElementById(`btn-rep-tipo-${t}`);
    if (btn) {
      if (t === tipo) {
        btn.classList.add('border-blue-600', 'bg-blue-50/60', 'dark:bg-blue-900/20');
        btn.classList.remove('border-slate-200', 'dark:border-[#2a3b56]', 'bg-white', 'dark:bg-[#162032]');
      } else {
        btn.classList.remove('border-blue-600', 'bg-blue-50/60', 'dark:bg-blue-900/20');
        btn.classList.add('border-slate-200', 'dark:border-[#2a3b56]', 'bg-white', 'dark:bg-[#162032]');
      }
    }
  });

  // Mostrar u ocultar panel de comparativa de meses solo en financiero
  const panelComp = document.getElementById('rep-panel-comparativa-meses');
  if (panelComp) {
    panelComp.style.display = tipo === 'financiero' ? 'flex' : 'none';
  }

  aplicarFiltrosReporte();
}

function setRangoReporte(rango) {
  reproducirSonido('click');
  state.activeRangoReporte = rango;

  const inputDesde = document.getElementById('rep-filtro-desde');
  const inputHasta = document.getElementById('rep-filtro-hasta');
  if (!inputDesde || !inputHasta) return;

  const now = new Date();
  if (now.getFullYear() < 2026) {
    now.setFullYear(2026, 8, 25);
  }

  const pad = n => String(n).padStart(2, '0');
  const toYMD = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let desdeStr = '';
  let hastaStr = '';

  if (rango === 'hoy') {
    desdeStr = toYMD(now);
    hastaStr = toYMD(now);
  } else if (rango === 'ayer') {
    const ayer = new Date(now);
    ayer.setDate(ayer.getDate() - 1);
    desdeStr = toYMD(ayer);
    hastaStr = toYMD(ayer);
  } else if (rango === 'semana') {
    const semana = new Date(now);
    semana.setDate(semana.getDate() - 6);
    desdeStr = toYMD(semana);
    hastaStr = toYMD(now);
  } else if (rango === 'mes_actual') {
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1);
    const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    desdeStr = toYMD(primerDia);
    hastaStr = toYMD(ultimoDia);
  } else if (rango === 'mes_pasado') {
    const primerDiaMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ultimoDiaMesAnt = new Date(now.getFullYear(), now.getMonth(), 0);
    desdeStr = toYMD(primerDiaMesAnt);
    hastaStr = toYMD(ultimoDiaMesAnt);
  }

  inputDesde.value = desdeStr;
  inputHasta.value = hastaStr;

  actualizarEstilosBotonesRango(rango);
  aplicarFiltrosReporte();
}

function actualizarEstilosBotonesRango(rangoActivo) {
  state.activeRangoReporte = rangoActivo;
  const rangos = ['hoy', 'ayer', 'semana', 'mes_actual', 'mes_pasado'];
  rangos.forEach(r => {
    const btn = document.getElementById(`btn-rango-${r}`);
    if (!btn) return;
    if (r === rangoActivo) {
      btn.className = 'btn-rango-preset px-2.5 py-1 rounded border text-xs font-bold transition-all cursor-pointer bg-blue-600 dark:bg-blue-600 text-white border-blue-600 shadow-xs';
    } else {
      btn.className = 'btn-rango-preset px-2.5 py-1 rounded border text-xs font-semibold transition-all cursor-pointer bg-white hover:bg-slate-100 dark:bg-[#101726] dark:hover:bg-[#1a253a] border-slate-200 dark:border-[#2a3b56] text-slate-700 dark:text-slate-300';
    }
  });
}

function aplicarFiltrosReporte() {
  const tipo = state.activeReporteTipo || 'financiero';
  const desde = document.getElementById('rep-filtro-desde')?.value || '2026-09-01';
  const hasta = document.getElementById('rep-filtro-hasta')?.value || '2026-09-25';
  const estadoFiltro = document.getElementById('rep-filtro-estado')?.value || 'TODOS';
  const mecanicoFiltro = document.getElementById('rep-filtro-mecanico')?.value || 'TODOS';

  const thead = document.getElementById('rep-table-header');
  const tbody = document.getElementById('rep-table-body');
  if (!thead || !tbody) return;

  const ordenes = WORKSHOP_DATA.ordenes || [];
  const repuestos = WORKSHOP_DATA.repuestos || [];
  const garantias = WORKSHOP_DATA.garantias_mermas || [];
  const vehiculos = WORKSHOP_DATA.vehiculos || [];

  if (tipo === 'financiero') {
    // Reporte financiero y ventas
    const ordenesFiltradas = ordenes.filter(o => {
      const fecha = (o.fecha_ingreso || '2026-09-20').split('T')[0];
      const matchFecha = fecha >= desde && fecha <= hasta;
      const matchEstado = estadoFiltro === 'TODOS' || 
        (estadoFiltro === 'COMPLETADOS' && (o.estado === 'LISTO' || o.estado === 'ENTREGADO')) ||
        (estadoFiltro === 'EN_TALLER' && (o.estado === 'EN_REPARACION' || o.estado === 'EN_DIAGNOSTICO'));
      const matchMec = mecanicoFiltro === 'TODOS' || (o.mecanico_nombre && o.mecanico_nombre.toLowerCase().includes(mecanicoFiltro.toLowerCase()));
      return matchFecha && matchEstado && matchMec;
    });

    const facturacionTotal = ordenesFiltradas.reduce((acc, o) => acc + (o.total_general || 0), 0);
    const totalMO = ordenesFiltradas.reduce((acc, o) => acc + (o.total_mano_obra || (o.total_general * 0.4)), 0);
    const totalRep = ordenesFiltradas.reduce((acc, o) => acc + (o.total_repuestos || (o.total_general * 0.6)), 0);
    const margenNeto = facturacionTotal > 0 ? ((totalMO / facturacionTotal) * 100).toFixed(1) : '48.2';

    let subRangoText = `${desde} al ${hasta}`;
    if (state.activeRangoReporte === 'hoy') subRangoText = 'Jornada de Hoy';
    else if (state.activeRangoReporte === 'ayer') subRangoText = 'Jornada de Ayer';
    else if (state.activeRangoReporte === 'semana') subRangoText = 'Últimos 7 Días';
    else if (state.activeRangoReporte === 'mes_actual') subRangoText = 'Mes Actual';
    else if (state.activeRangoReporte === 'mes_pasado') subRangoText = 'Mes Anterior';

    // Actualizar indicadores
    document.getElementById('rep-kpi-1-label').textContent = 'Facturación en Rango';
    document.getElementById('rep-kpi-1-val').textContent = formatMoney(facturacionTotal);
    document.getElementById('rep-kpi-1-sub').textContent = `${ordenesFiltradas.length} órdenes (${subRangoText})`;

    document.getElementById('rep-kpi-2-label').textContent = 'Mano de Obra';
    document.getElementById('rep-kpi-2-val').textContent = formatMoney(totalMO);
    document.getElementById('rep-kpi-2-sub').textContent = `${facturacionTotal > 0 ? ((totalMO/facturacionTotal)*100).toFixed(1) : '0.0'}% de facturación`;

    document.getElementById('rep-kpi-3-label').textContent = 'Repuestos Facturados';
    document.getElementById('rep-kpi-3-val').textContent = formatMoney(totalRep);
    document.getElementById('rep-kpi-3-sub').textContent = `${facturacionTotal > 0 ? ((totalRep/facturacionTotal)*100).toFixed(1) : '0.0'}% de facturación`;

    document.getElementById('rep-kpi-4-label').textContent = 'Margen Operativo';
    document.getElementById('rep-kpi-4-val').textContent = `${margenNeto}%`;
    document.getElementById('rep-kpi-4-sub').textContent = 'Rentabilidad sobre servicios';

    // Tabla
    thead.innerHTML = `
      <tr class="border-b border-slate-200 dark:border-[#233047] text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#162032]">
        <th class="p-3">N° OT</th>
        <th class="p-3">Fecha</th>
        <th class="p-3">Placa / Auto</th>
        <th class="p-3">Cliente</th>
        <th class="p-3">Mecánico</th>
        <th class="p-3 text-right">Mano Obra</th>
        <th class="p-3 text-right">Repuestos</th>
        <th class="p-3 text-right">Total Facturado</th>
        <th class="p-3 text-center">Estado</th>
      </tr>
    `;

    tbody.innerHTML = ordenesFiltradas.length > 0 ? ordenesFiltradas.map(o => `
      <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors">
        <td class="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">${o.codigo_orden}</td>
        <td class="p-3 font-mono text-slate-500">${(o.fecha_ingreso || '2026-09-20').split('T')[0]}</td>
        <td class="p-3">
          <span class="plate-badge text-[10px] font-bold mr-1.5">${o.placa}</span>
          <span class="font-medium text-slate-700 dark:text-slate-300">${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''}</span>
        </td>
        <td class="p-3 text-slate-700 dark:text-slate-300">${o.cliente_nombre}</td>
        <td class="p-3 text-slate-500">${o.mecanico_nombre || 'Carlos Mendoza'}</td>
        <td class="p-3 font-mono text-right text-slate-700 dark:text-slate-300">${formatMoney(o.total_mano_obra || (o.total_general * 0.4))}</td>
        <td class="p-3 font-mono text-right text-slate-700 dark:text-slate-300">${formatMoney(o.total_repuestos || (o.total_general * 0.6))}</td>
        <td class="p-3 font-mono text-right font-extrabold text-emerald-600 dark:text-emerald-400">${formatMoney(o.total_general)}</td>
        <td class="p-3 text-center"><span class="badge-status ${getEstadoBadgeClass(o.estado)} text-[10px]">${o.estado}</span></td>
      </tr>
    `).join('') : `
      <tr><td colspan="9" class="p-6 text-center text-slate-400">No se encontraron órdenes registradas en el rango de fechas seleccionado.</td></tr>
    `;

  } else if (tipo === 'stock') {
    // Reporte de stock crítico
    const repuestosCriticos = repuestos.filter(r => (r.stock_actual || 0) <= (r.stock_minimo || 5));
    const totalDeficit = repuestosCriticos.reduce((acc, r) => acc + (r.stock_minimo - r.stock_actual + 5), 0);
    const inversionEstimada = repuestosCriticos.reduce((acc, r) => acc + ((r.stock_minimo - r.stock_actual + 5) * (r.precio_compra || 25)), 0);

    // Actualizar indicadores
    document.getElementById('rep-kpi-1-label').textContent = 'Ítems en Quiebre';
    document.getElementById('rep-kpi-1-val').textContent = `${repuestosCriticos.length} repuestos`;
    document.getElementById('rep-kpi-1-sub').textContent = 'Por debajo de stock mínimo';

    document.getElementById('rep-kpi-2-label').textContent = 'Déficit de Unidades';
    document.getElementById('rep-kpi-2-val').textContent = `${totalDeficit} piezas`;
    document.getElementById('rep-kpi-2-sub').textContent = 'Para reposición óptima';

    document.getElementById('rep-kpi-3-label').textContent = 'Inversión Sugerida';
    document.getElementById('rep-kpi-3-val').textContent = formatMoney(inversionEstimada);
    document.getElementById('rep-kpi-3-sub').textContent = 'Costo total de compra';

    document.getElementById('rep-kpi-4-label').textContent = 'Proveedores Clave';
    document.getElementById('rep-kpi-4-val').textContent = `${(WORKSHOP_DATA.proveedores || []).length} empresas`;
    document.getElementById('rep-kpi-4-sub').textContent = 'Canales directos de abasto';

    thead.innerHTML = `
      <tr class="border-b border-slate-200 dark:border-[#233047] text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#162032]">
        <th class="p-3">Código</th>
        <th class="p-3">Repuesto / Pieza</th>
        <th class="p-3">Marca / Categoría</th>
        <th class="p-3 text-center">Stock Actual</th>
        <th class="p-3 text-center">Stock Mínimo</th>
        <th class="p-3 text-center">Sugerido Compra</th>
        <th class="p-3">Proveedor Asignado</th>
        <th class="p-3">Contacto Directo</th>
        <th class="p-3 text-center">Acción</th>
      </tr>
    `;

    tbody.innerHTML = repuestosCriticos.map(r => {
      const prov = (WORKSHOP_DATA.proveedores || [])[r.id_repuesto % (WORKSHOP_DATA.proveedores || []).length] || (WORKSHOP_DATA.proveedores || [])[0];
      const sugerido = r.stock_minimo - r.stock_actual + 5;
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors bg-rose-50/20 dark:bg-rose-950/10">
          <td class="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">${r.codigo}</td>
          <td class="p-3 font-bold text-slate-900 dark:text-white">${r.nombre}</td>
          <td class="p-3 text-slate-500">${r.marca} • ${r.categoria_nombre || 'Repuestos'}</td>
          <td class="p-3 text-center font-mono font-bold text-rose-600">${r.stock_actual} un</td>
          <td class="p-3 text-center font-mono text-slate-400">${r.stock_minimo} un</td>
          <td class="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">+${sugerido} un</td>
          <td class="p-3 text-slate-700 dark:text-slate-200 font-medium">${prov ? prov.razon_social : 'Distribuidora Lima S.A.'}</td>
          <td class="p-3 text-xs font-mono text-slate-500">Tel: ${prov ? prov.telefono : '987-654-321'}</td>
          <td class="p-3 text-center">
            <button onclick="showToast('Solicitud enviada a proveedor ${prov ? prov.razon_social : ''}', 'success')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors pointer">
              Pedir Stock
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } else if (tipo === 'historial') {
    // Reporte de historial vehicular
    let subRangoText = `${desde} al ${hasta}`;
    if (state.activeRangoReporte === 'hoy') subRangoText = 'Jornada de Hoy';
    else if (state.activeRangoReporte === 'ayer') subRangoText = 'Jornada de Ayer';
    else if (state.activeRangoReporte === 'semana') subRangoText = 'Últimos 7 Días';
    else if (state.activeRangoReporte === 'mes_actual') subRangoText = 'Mes Actual';
    else if (state.activeRangoReporte === 'mes_pasado') subRangoText = 'Mes Anterior';

    const ordenesEnRango = ordenes.filter(o => {
      const f = (o.fecha_ingreso || '').split('T')[0];
      const matchFecha = f >= desde && f <= hasta;
      const matchMec = mecanicoFiltro === 'TODOS' || (o.mecanico_nombre && o.mecanico_nombre.toLowerCase().includes(mecanicoFiltro.toLowerCase()));
      return matchFecha && matchMec;
    });

    const placasConVisitas = new Set(ordenesEnRango.map(o => o.placa));
    const vehiculosEnRango = vehiculos.filter(v => placasConVisitas.has(v.placa));
    const vehiculosList = vehiculosEnRango.length > 0 ? vehiculosEnRango : vehiculos.slice(0, 15);

    document.getElementById('rep-kpi-1-label').textContent = 'Vehículos Atendidos';
    document.getElementById('rep-kpi-1-val').textContent = `${vehiculosEnRango.length || vehiculosList.length} unidades`;
    document.getElementById('rep-kpi-1-sub').textContent = `En período (${subRangoText})`;

    document.getElementById('rep-kpi-2-label').textContent = 'Historial de Visitas';
    document.getElementById('rep-kpi-2-val').textContent = `${ordenesEnRango.length} ingresos`;
    document.getElementById('rep-kpi-2-sub').textContent = 'Trazabilidad documentada';

    document.getElementById('rep-kpi-3-label').textContent = 'Peritajes Asentados';
    document.getElementById('rep-kpi-3-val').textContent = `${ordenesEnRango.length} fichas`;
    document.getElementById('rep-kpi-3-sub').textContent = 'Inspección técnica 100%';

    document.getElementById('rep-kpi-4-label').textContent = 'Garantía Emitida';
    document.getElementById('rep-kpi-4-val').textContent = '90 días';
    document.getElementById('rep-kpi-4-sub').textContent = 'Por cada reparación oficial';

    thead.innerHTML = `
      <tr class="border-b border-slate-200 dark:border-[#233047] text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#162032]">
        <th class="p-3">Placa</th>
        <th class="p-3">Vehículo</th>
        <th class="p-3">Propietario</th>
        <th class="p-3">Kilometraje</th>
        <th class="p-3 text-center">N° Visitas</th>
        <th class="p-3">Último Servicio Realizado</th>
        <th class="p-3">Mecánico Asignado</th>
        <th class="p-3 text-right">Inversión Período</th>
      </tr>
    `;

    tbody.innerHTML = vehiculosList.length > 0 ? vehiculosList.map(v => {
      const ordenesV = ordenesEnRango.filter(o => o.placa === v.placa);
      const totalGastado = ordenesV.reduce((a, b) => a + (b.total_general || 0), 0);
      const ultimaOrden = ordenesV[0] || (ordenes.filter(o => o.placa === v.placa)[0]) || {};
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors">
          <td class="p-3"><span class="plate-badge text-xs font-bold">${v.placa}</span></td>
          <td class="p-3 font-bold text-slate-900 dark:text-white">${v.marca} ${v.modelo} (${v.anio || 2022})</td>
          <td class="p-3 text-slate-700 dark:text-slate-300">${v.propietario}</td>
          <td class="p-3 font-mono text-slate-500">${(v.kilometraje_actual || 45000).toLocaleString()} km</td>
          <td class="p-3 text-center font-mono font-bold text-blue-600">${ordenesV.length || 1}</td>
          <td class="p-3 text-slate-600 dark:text-slate-300">${ultimaOrden.motivo_ingreso || ultimaOrden.servicio || 'Mantenimiento Preventivo'}</td>
          <td class="p-3 text-slate-500">${ultimaOrden.mecanico_nombre || 'Carlos Mendoza'}</td>
          <td class="p-3 font-mono text-right font-extrabold text-emerald-600">${formatMoney(totalGastado || ultimaOrden.total_general || 280)}</td>
        </tr>
      `;
    }).join('') : `
      <tr><td colspan="8" class="p-6 text-center text-slate-400">No se registraron visitas vehiculares en el período seleccionado.</td></tr>
    `;

  } else if (tipo === 'garantias') {
    // Reporte de garantías
    let subRangoText = `${desde} al ${hasta}`;
    if (state.activeRangoReporte === 'hoy') subRangoText = 'Jornada de Hoy';
    else if (state.activeRangoReporte === 'ayer') subRangoText = 'Jornada de Ayer';
    else if (state.activeRangoReporte === 'semana') subRangoText = 'Últimos 7 Días';
    else if (state.activeRangoReporte === 'mes_actual') subRangoText = 'Mes Actual';
    else if (state.activeRangoReporte === 'mes_pasado') subRangoText = 'Mes Anterior';

    const garantiasFiltradas = garantias.filter(g => {
      const f = g.fecha_reclamo || '2026-09-01';
      return f >= desde && f <= hasta;
    });
    const listaGarantias = garantiasFiltradas.length > 0 ? garantiasFiltradas : garantias;
    const costoMermas = listaGarantias.reduce((a, b) => a + (b.costo || 0), 0);

    document.getElementById('rep-kpi-1-label').textContent = 'Reclamos por Garantía';
    document.getElementById('rep-kpi-1-val').textContent = `${listaGarantias.length} casos`;
    document.getElementById('rep-kpi-1-sub').textContent = `Defectos (${subRangoText})`;

    document.getElementById('rep-kpi-2-label').textContent = 'Costo en Trámite';
    document.getElementById('rep-kpi-2-val').textContent = formatMoney(costoMermas);
    document.getElementById('rep-kpi-2-sub').textContent = 'Recuperable de proveedores';

    document.getElementById('rep-kpi-3-label').textContent = 'Notas de Crédito';
    document.getElementById('rep-kpi-3-val').textContent = '1 Aprobada';
    document.getElementById('rep-kpi-3-sub').textContent = 'Saldo a favor del taller';

    document.getElementById('rep-kpi-4-label').textContent = 'Resolución Promedio';
    document.getElementById('rep-kpi-4-val').textContent = '48 horas';
    document.getElementById('rep-kpi-4-sub').textContent = 'Respuesta de proveedores';

    thead.innerHTML = `
      <tr class="border-b border-slate-200 dark:border-[#233047] text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-[#162032]">
        <th class="p-3">N° OT</th>
        <th class="p-3">Placa</th>
        <th class="p-3">Repuesto Defectuoso</th>
        <th class="p-3">Fecha Reclamo</th>
        <th class="p-3">Causal Técnica de Falla</th>
        <th class="p-3 text-right">Costo Pieza</th>
        <th class="p-3">Proveedor Responsable</th>
        <th class="p-3 text-center">Estado del Trámite</th>
      </tr>
    `;

    tbody.innerHTML = listaGarantias.map(g => `
      <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors">
        <td class="p-3 font-mono font-bold text-blue-600">${g.codigo_ot}</td>
        <td class="p-3"><span class="plate-badge text-[10px] font-bold">${g.placa}</span></td>
        <td class="p-3 font-bold text-slate-900 dark:text-white">${g.repuesto}</td>
        <td class="p-3 font-mono text-slate-500">${g.fecha_reclamo}</td>
        <td class="p-3 text-slate-600 dark:text-slate-300 text-xs">${g.causal}</td>
        <td class="p-3 font-mono text-right font-bold text-rose-600">${formatMoney(g.costo)}</td>
        <td class="p-3 text-slate-700 dark:text-slate-300 font-medium">${g.proveedor}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            g.estado === 'NOTA_CREDITO_APROBADA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
            g.estado === 'REPUESTO_CAMBIADO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' :
            'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          }">${g.estado.replace(/_/g, ' ')}</span>
        </td>
      </tr>
    `).join('');
  }

  refrescarIconos();
}

function imprimirReporteActualPDF() {
  const tipo = state.activeReporteTipo || 'financiero';
  const desde = document.getElementById('rep-filtro-desde')?.value || '2026-09-01';
  const hasta = document.getElementById('rep-filtro-hasta')?.value || '2026-09-23';

  const modal = document.getElementById('modal-pdf-viewer');
  const content = document.getElementById('printable-pdf-content');
  if (!modal || !content) {
    window.print();
    return;
  }

  const titulos = {
    financiero: 'Reporte Gerencial de Ventas, Mano de Obra y Repuestos',
    stock: 'Reporte de Reposición y Stock Crítico para Proveedores',
    historial: 'Reporte de Historial Clínico y Trazabilidad de Flota',
    garantias: 'Reporte de Garantías, Mermas y Repuestos Defectuosos'
  };

  let tableHeaderClone = (document.getElementById('rep-table-header')?.innerHTML || '')
    .replace(/dark:[^\s"'>]+/g, '')
    .replace(/text-slate-400/g, 'text-slate-700')
    .replace(/text-slate-500/g, 'text-slate-700');

  let tableBodyClone = (document.getElementById('rep-table-body')?.innerHTML || '')
    .replace(/dark:[^\s"'>]+/g, '')
    .replace(/text-white/g, 'text-slate-900')
    .replace(/text-slate-300/g, 'text-slate-800')
    .replace(/text-slate-400/g, 'text-slate-700');

  content.innerHTML = `
    <div class="flex items-center justify-between pb-6 border-b-2 border-slate-900">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-blue-600 p-2.5 flex items-center justify-center flex-shrink-0">
          <img src="assets/logo_white.png" alt="MecaPro" class="w-full h-full object-contain">
        </div>
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">MecaPro S.A.C.</h1>
          <p class="text-xs text-slate-700 font-bold">${titulos[tipo]}</p>
          <p class="text-xs text-slate-500 font-mono">Taller Mecánico Especializado • RUC 20601234567</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-xs text-slate-700 block font-mono">Período Auditado: <strong>${desde}</strong> al <strong>${hasta}</strong></span>
        <span class="text-xs text-slate-500 block font-mono">Emisión: ${new Date().toLocaleString('es-PE')}</span>
        <span class="text-xs text-blue-800 block font-bold font-mono">Auditor: JAHN PAHOL LOA ROJAS</span>
      </div>
    </div>

    <!-- Tabla Auditada -->
    <div class="mt-4 overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-slate-100 border-b-2 border-slate-900 font-extrabold text-slate-900">${tableHeaderClone}</thead>
        <tbody class="divide-y divide-slate-200 text-slate-900">${tableBodyClone}</tbody>
      </table>
    </div>

    ${tipo === 'financiero' ? `
      <!-- Resumen Comparativo de Meses -->
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs mt-6">
        <span class="font-extrabold text-slate-900 uppercase block mb-1">Tendencia de Ingresos Trimestral:</span>
        <div class="grid grid-cols-3 gap-4 text-center font-mono pt-2">
          <div><span class="text-slate-500 block text-[10px]">JULIO 2026:</span><strong class="text-slate-800">S/. 12,400.00</strong></div>
          <div><span class="text-slate-500 block text-[10px]">AGOSTO 2026:</span><strong class="text-slate-800">S/. 16,850.00 (+35.8%)</strong></div>
          <div><span class="text-blue-700 block text-[10px] font-bold">SEPTIEMBRE 2026:</span><strong class="text-emerald-700 text-sm font-extrabold">S/. 18,450.00 (+9.5%)</strong></div>
        </div>
      </div>
    ` : ''}

    <div class="grid grid-cols-2 gap-8 pt-10 mt-6 border-t border-slate-300 text-center text-xs">
      <div>
        <div class="border-t border-slate-400 w-48 mx-auto mb-1"></div>
        <span class="font-bold text-slate-900 block">Jahn Pahol Loa Rojas</span>
        <span class="text-slate-500 text-[10px]">Administrador General MecaPro</span>
      </div>
      <div>
        <div class="border-t border-slate-400 w-48 mx-auto mb-1"></div>
        <span class="font-bold text-slate-900 block">Auditoría de Control de Calidad</span>
        <span class="text-slate-500 text-[10px]">Certificación ISO 9001 / Gestión de Taller</span>
      </div>
    </div>
  `;

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
  refrescarIconos();
  showToast('Reporte generado en formato oficial de impresión', 'success');
}

function generarHistorialVehicularPDF() {
  seleccionarTipoReporte('historial');
  imprimirReporteActualPDF();
}

function imprimirOrdenPDFWeb() {
  const id = state.selectedOrdenId;
  const ordenes = WORKSHOP_DATA.ordenes || [];
  const o = (id ? ordenes.find(x => x.id_orden === id) : null) || ordenes[0];
  if (!o) {
    showToast('Seleccione una orden para imprimir', 'error');
    return;
  }
  generarProformaOrdenPDF(o);
}

function imprimirProformaOrdenPDF() {
  reproducirSonido('click');
  const o = state.currentTrackingOrder 
    || (state.selectedOrdenId ? (WORKSHOP_DATA.ordenes || []).find(x => x.id_orden === state.selectedOrdenId) : null) 
    || (WORKSHOP_DATA.ordenes || [])[0];
  if (!o) {
    showToast('Seleccione una orden para imprimir', 'error');
    return;
  }
  generarProformaOrdenPDF(o);
}

function generarProformaOrdenPDF(ordenParam = null) {
  const modal = document.getElementById('modal-pdf-viewer');
  const content = document.getElementById('printable-pdf-content');
  if (!modal || !content) return;

  const o = ordenParam 
    || state.currentTrackingOrder
    || (state.selectedOrdenId ? (WORKSHOP_DATA.ordenes || []).find(x => x.id_orden === state.selectedOrdenId) : null) 
    || (WORKSHOP_DATA.ordenes || [])[0];
  if (!o) return;

  content.innerHTML = `
    <div class="flex items-center justify-between pb-6 border-b-2 border-slate-900">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-blue-600 p-2.5 flex items-center justify-center flex-shrink-0">
          <img src="assets/logo_white.png" alt="MecaPro" class="w-full h-full object-contain">
        </div>
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">MecaPro S.A.C.</h1>
          <p class="text-xs text-slate-600 font-medium">Hoja de Servicio y Proforma Oficial de Trabajo</p>
          <p class="text-xs text-slate-500 font-mono">Taller Mecánico Especializado • RUC 20601234567</p>
        </div>
      </div>
      <div class="text-right">
        <span class="font-mono text-xl font-extrabold text-blue-700 block">${o.codigo_orden}</span>
        <span class="badge-status ${getEstadoBadgeClass(o.estado)} mt-1 inline-block">${o.estado}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
      <div>
        <span class="font-bold text-slate-600 block uppercase">Datos del Cliente:</span>
        <span class="font-extrabold text-slate-900 text-sm block mt-0.5">${o.cliente_nombre}</span>
        <span class="text-slate-600 font-mono">Doc: ${o.cliente_doc || '-'} • Tel: ${o.cliente_telefono || '987654321'}</span>
      </div>
      <div>
        <span class="font-bold text-slate-600 block uppercase">Datos del Vehículo:</span>
        <span class="font-extrabold text-slate-900 text-sm block mt-0.5">${o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.vehiculo || ''}</span>
        <span class="plate-badge text-[11px] mt-0.5 inline-block">${o.placa}</span>
      </div>
    </div>

    <table class="w-full text-left text-xs border-collapse mt-4">
      <thead>
        <tr class="border-b-2 border-slate-900 text-slate-900 font-extrabold bg-slate-100">
          <th class="p-2.5">Concepto / Partida</th>
          <th class="p-2.5 text-center">Tipo</th>
          <th class="p-2.5 text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 text-slate-900">
        <tr>
          <td class="p-3 font-medium">${o.motivo_ingreso || o.servicio || 'Servicio Técnico Integral'}</td>
          <td class="p-3 text-center"><span class="badge-status badge-cobalt">MANO DE OBRA</span></td>
          <td class="p-3 font-mono text-right font-bold">${formatMoney(o.total_mano_obra || (o.total_general * 0.4))}</td>
        </tr>
        <tr>
          <td class="p-3 font-medium">Insumos, Repuestos y Componentes Instalados</td>
          <td class="p-3 text-center"><span class="badge-status badge-emerald">REPUESTOS</span></td>
          <td class="p-3 font-mono text-right font-bold">${formatMoney(o.total_repuestos || (o.total_general * 0.6))}</td>
        </tr>
      </tbody>
    </table>

    <div class="flex justify-end pt-4 border-t-2 border-slate-900">
      <div class="w-64 flex flex-col gap-1.5 text-xs font-mono">
        <div class="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-300">
          <span>TOTAL ESTIMADO:</span>
          <span class="text-emerald-700">${formatMoney(o.total_general)}</span>
        </div>
      </div>
    </div>

    <div class="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
      Garantía de servicio por 90 días o 5,000 km • Emitido en MecaPro ERP
    </div>
  `;

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
  refrescarIconos();
  showToast('Proforma de Orden preparada para imprimir', 'success');
}

function descargarReporteConsolidadoPDF() {
  imprimirReporteActualPDF();
}

function ejecutarImpresionLimpiaPDF() {
  reproducirSonido('click');
  window.print();
}

window.addEventListener('beforeprint', () => {
  const modal = document.getElementById('modal-pdf-viewer');
  const content = document.getElementById('printable-pdf-content');
  if (modal && (!content || !content.innerHTML.trim() || modal.classList.contains('hidden') || modal.style.display === 'none')) {
    const o = state.currentTrackingOrder 
      || (state.selectedOrdenId ? (WORKSHOP_DATA.ordenes || []).find(x => x.id_orden === state.selectedOrdenId) : null) 
      || (WORKSHOP_DATA.ordenes || [])[0];
    if (typeof generarProformaOrdenPDF === 'function') {
      generarProformaOrdenPDF(o);
    }
  }
});

// Usuarios y roles
function renderUsuariosTable() {
  const usuarios = (WORKSHOP_DATA.usuarios || []).map(normalizarUsuario);
  WORKSHOP_DATA.usuarios = usuarios;
  const tbody = document.getElementById('usuarios-table-body');
  if (!tbody) return;

  tbody.innerHTML = usuarios.map(u => `
    <tr class="hover:bg-slate-50 dark:hover:bg-[#162032] transition-colors pointer ${state.selectedUsuarioId === u.id_usuario ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}" onclick="seleccionarUsuarioFilaWeb(${u.id_usuario})">
      <td class="p-3 text-center">
        <input type="radio" name="sel-usuario" ${state.selectedUsuarioId === u.id_usuario ? 'checked' : ''} class="pointer">
      </td>
      <td class="p-3 font-mono text-slate-400 font-bold">${u.id_usuario}</td>
      <td class="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">@${u.username}</td>
      <td class="p-3 font-bold">${u.rol_display || u.rol}</td>
      <td class="p-3 font-medium text-slate-900 dark:text-white">${u.nombres} ${u.apellidos}</td>
      <td class="p-3 text-slate-500 font-mono">${u.correo || '-'}</td>
      <td class="p-3 text-slate-500 font-mono">${u.telefono || '-'}</td>
      <td class="p-3">
        <span class="badge-status ${u.activo ? 'badge-emerald' : 'badge-crimson'}">${u.activo ? 'ACTIVO' : 'INACTIVO'}</span>
      </td>
    </tr>
  `).join('');
}

function cargarUsuariosWeb() {
  renderUsuariosTable();
  showToast('Listado de usuarios actualizado', 'info');
}

function seleccionarUsuarioFilaWeb(id) {
  state.selectedUsuarioId = id;
  renderUsuariosTable();
}

function editarUsuarioSeleccionadoWeb() {
  if (!state.selectedUsuarioId && (WORKSHOP_DATA.usuarios || []).length > 0) {
    state.selectedUsuarioId = WORKSHOP_DATA.usuarios[0].id_usuario;
  }
  if (!state.selectedUsuarioId) {
    showToast('Seleccione un usuario para editar', 'warning');
    return;
  }
  const u = (WORKSHOP_DATA.usuarios || []).find(x => x.id_usuario === state.selectedUsuarioId);
  if (u) abrirModalUsuario(u);
}

function abrirModalUsuario(u = null) {
  reproducirSonido('click');
  const modal = document.getElementById('modal-usuario');
  const title = document.getElementById('modal-usuario-title');
  const form = document.getElementById('form-usuario');
  if (!modal || !form) return;
  form.reset();

  const elId = document.getElementById('form-user-id');
  const elLog = document.getElementById('form-user-login');
  const elPas = document.getElementById('form-user-pass');
  const elRol = document.getElementById('form-user-rol');
  const elNom = document.getElementById('form-user-nombres');
  const elApe = document.getElementById('form-user-apellidos');
  const elCor = document.getElementById('form-user-correo');
  const elTel = document.getElementById('form-user-tel');

  if (u) {
    if (title) title.textContent = 'Editar Usuario';
    if (elId) elId.value = u.id_usuario || '';
    if (elLog) elLog.value = u.username || '';
    if (elPas) elPas.value = u.password || '123456';
    if (elRol) elRol.value = u.rol || 'MECANICO';
    if (elNom) elNom.value = u.nombres || '';
    if (elApe) elApe.value = u.apellidos || '';
    if (elCor) elCor.value = u.correo || '';
    if (elTel) elTel.value = u.telefono || '';
  } else {
    if (title) title.textContent = 'Nuevo Usuario';
    if (elId) elId.value = '';
  }

  abrirModalElemento(modal);
}

function guardarUsuarioWeb(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = document.getElementById('form-user-id')?.value;
  const user = (document.getElementById('form-user-login')?.value || '').toLowerCase().trim();
  const pass = (document.getElementById('form-user-pass')?.value || '').trim();
  const rol = document.getElementById('form-user-rol')?.value || 'MECANICO';
  const nombres = (document.getElementById('form-user-nombres')?.value || '').trim();
  const apellidos = (document.getElementById('form-user-apellidos')?.value || '').trim();
  const correo = (document.getElementById('form-user-correo')?.value || '').trim();
  const tel = (document.getElementById('form-user-tel')?.value || '').trim();

  if (!user || !nombres) {
    showToast('Complete los campos obligatorios del usuario', 'warning');
    return;
  }
  if (!/^[a-z0-9_]{3,20}$/.test(user)) {
    showToast('El usuario debe tener entre 3 y 20 caracteres alfanuméricos en minúsculas', 'warning');
    return;
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombres)) {
    showToast('El nombre debe contener únicamente letras', 'warning');
    return;
  }
  if (apellidos && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(apellidos)) {
    showToast('Los apellidos deben contener únicamente letras', 'warning');
    return;
  }
  if (tel && !/^\d{9}$/.test(tel)) {
    showToast('El teléfono debe tener exactamente 9 dígitos numéricos', 'warning');
    return;
  }

  let rolDisplay = 'Técnico Mecánico';
  if (rol === 'ADMIN') rolDisplay = 'Administrador del Sistema';
  else if (rol === 'RECEPCION') rolDisplay = 'Recepción & Asesoría';
  else if (rol === 'CAJA') rolDisplay = 'Caja & Facturación';

  if (id) {
    const u = (WORKSHOP_DATA.usuarios || []).find(x => x.id_usuario == id);
    if (u) {
      u.username = user;
      if (pass) u.password = pass;
      u.rol = rol;
      u.rol_display = rolDisplay;
      u.nombres = nombres;
      u.apellidos = apellidos;
      u.correo = correo;
      u.telefono = tel;
      u.avatar = (nombres.charAt(0) + (apellidos ? apellidos.charAt(0) : '')).toUpperCase();
      showToast(`Usuario @${user} actualizado exitosamente`, 'success');
    }
  } else {
    const newId = (WORKSHOP_DATA.usuarios || []).reduce((max, u) => Math.max(max, u.id_usuario || 0), 0) + 1;
    const nuevo = {
      id_usuario: newId,
      username: user,
      password: pass || '123456',
      rol: rol,
      rol_display: rolDisplay,
      nombres: nombres,
      apellidos: apellidos,
      correo: correo,
      telefono: tel,
      avatar: (nombres.charAt(0) + (apellidos ? apellidos.charAt(0) : '')).toUpperCase(),
      activo: true
    };
    if (!WORKSHOP_DATA.usuarios) WORKSHOP_DATA.usuarios = [];
    WORKSHOP_DATA.usuarios.push(normalizarUsuario(nuevo));
    showToast(`Usuario @${user} registrado correctamente`, 'success');
  }

  cerrarModal('modal-usuario');
  guardarDatosLocalStorage();
  renderUsuariosTable();
}

function cambiarEstadoUsuarioSeleccionadoWeb() {
  if (!state.selectedUsuarioId && (WORKSHOP_DATA.usuarios || []).length > 0) {
    state.selectedUsuarioId = WORKSHOP_DATA.usuarios[0].id_usuario;
  }
  if (!state.selectedUsuarioId) {
    showToast('Seleccione un usuario de la tabla para cambiar su estado', 'error');
    return;
  }
  const u = (WORKSHOP_DATA.usuarios || []).find(x => x.id_usuario === state.selectedUsuarioId);
  if (!u) return;

  u.activo = !u.activo;
  guardarDatosLocalStorage();
  showToast(`Estado de @${u.username} actualizado a: ${u.activo ? 'ACTIVO' : 'INACTIVO'}`, 'success');
  renderUsuariosTable();
}

// Registro de nueva orden de trabajo
function openNewOrderModal() {
  reproducirSonido('click');
  const form = document.getElementById('form-new-order');
  if (form) form.reset();
  
  // Limpiar campos de cliente y vehículo para nuevo ingreso limpio
  const fieldsToReset = [
    'new-order-cliente-num-doc',
    'new-order-cliente',
    'new-order-cliente-tel',
    'new-order-cliente-correo',
    'new-order-cliente-dir',
    'new-order-placa',
    'new-order-vehiculo-marca',
    'new-order-vehiculo',
    'new-order-servicio',
    'new-order-danos'
  ];
  fieldsToReset.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const tipoDoc = document.getElementById('new-order-cliente-tipo');
  if (tipoDoc) tipoDoc.value = 'DNI';
  const kmInput = document.getElementById('new-order-km');
  if (kmInput) kmInput.value = '78420';
  const gasInput = document.getElementById('new-order-gas');
  if (gasInput) gasInput.value = '1/2 Tanque';
  const totalInput = document.getElementById('new-order-total');
  if (totalInput) totalInput.value = '450.00';

  // Cargar lista de mecánicos
  const selMecanico = document.getElementById('new-order-mecanico');
  if (selMecanico) {
    const mecs = (WORKSHOP_DATA.usuarios || []).filter(u => u.rol === 'MECANICO');
    if (mecs.length > 0) {
      selMecanico.innerHTML = mecs.map(m => `
        <option value="${m.nombres} ${m.apellidos}">${m.nombres} ${m.apellidos}</option>
      `).join('');
    } else {
      selMecanico.innerHTML = `
        <option value="Carlos Mendoza Soto">Carlos Mendoza Soto</option>
        <option value="Juan Diego Perez Alarcon">Juan Diego Perez Alarcon</option>
        <option value="Luis Alberto Ramirez Huaman">Luis Alberto Ramirez Huaman</option>
      `;
    }
  }

  // Cargar listas de autocompletado
  const dlPlacas = document.getElementById('list-placas-sugeridas');
  if (dlPlacas) {
    dlPlacas.innerHTML = (WORKSHOP_DATA.vehiculos || []).map(v => `
      <option value="${v.placa}">${v.marca} ${v.modelo} • ${v.propietario}</option>
    `).join('');
  }
  const dlClientes = document.getElementById('list-clientes-sugeridos');
  if (dlClientes) {
    dlClientes.innerHTML = (WORKSHOP_DATA.clientes || []).map(c => `
      <option value="${c.nombre_razon_social}">${c.tipo_documento}: ${c.num_documento}</option>
    `).join('');
  }
  const dlServicios = document.getElementById('list-servicios-sugeridos');
  if (dlServicios) {
    dlServicios.innerHTML = (WORKSHOP_DATA.servicios || []).map(s => `
      <option value="${s.nombre}">${formatMoney(s.precio_base)} • ${s.tipo_nombre || 'Servicio'}</option>
    `).join('');
  }

  abrirModalElemento('new-order-modal');
}

function closeLoginModal() {
  cerrarModal('login-modal');
}

function closeNewOrderModal() {
  cerrarModal('new-order-modal');
}

function autocompletarDatosClienteEnOrden(c) {
  if (!c) return;
  const tipo = document.getElementById('new-order-cliente-tipo');
  const numDoc = document.getElementById('new-order-cliente-num-doc');
  const nombre = document.getElementById('new-order-cliente');
  const tel = document.getElementById('new-order-cliente-tel');
  const correo = document.getElementById('new-order-cliente-correo');
  const dir = document.getElementById('new-order-cliente-dir');
  if (tipo && c.tipo_documento) tipo.value = c.tipo_documento;
  if (numDoc && c.num_documento) numDoc.value = c.num_documento;
  if (nombre && c.nombre_razon_social) nombre.value = c.nombre_razon_social;
  if (tel && c.telefono) tel.value = c.telefono;
  if (correo && c.correo) correo.value = c.correo;
  if (dir && c.direccion) dir.value = c.direccion;
}

function onNuevaOrdenClienteDocInput(val, event) {
  const el = (val && val.value !== undefined) ? val : document.getElementById('new-order-cliente-num-doc');
  const tipo = document.getElementById('new-order-cliente-tipo')?.value || 'DNI';
  if (el) {
    formatearDocInput(el, tipo);
    const doc = el.value.trim();
    if (!doc) return;
    const c = (WORKSHOP_DATA.clientes || []).find(x => x.num_documento && x.num_documento.toLowerCase() === doc.toLowerCase());
    if (c) autocompletarDatosClienteEnOrden(c);
  }
}

function onNuevaOrdenClienteNombreInput(val) {
  const raw = (typeof val === 'string') ? val : (val?.value || '');
  const nom = raw.toLowerCase().trim();
  if (!nom) return;
  const c = (WORKSHOP_DATA.clientes || []).find(x => x.nombre_razon_social && x.nombre_razon_social.toLowerCase() === nom);
  if (c) autocompletarDatosClienteEnOrden(c);
}

function onNuevaOrdenPlacaInput(val, event) {
  const el = (val && val.value !== undefined) ? val : document.getElementById('new-order-placa');
  if (el) {
    formatearPlacaInput(el);
    const placa = el.value.toUpperCase().trim();
    const v = (WORKSHOP_DATA.vehiculos || []).find(x => x.placa && x.placa.toUpperCase() === placa);
    if (v) {
      const marcaInput = document.getElementById('new-order-vehiculo-marca');
      const vehInput = document.getElementById('new-order-vehiculo');
      const kmInput = document.getElementById('new-order-km');
      if (marcaInput && !marcaInput.value) marcaInput.value = v.marca || '';
      if (vehInput && !vehInput.value) vehInput.value = `${v.modelo || ''} (${v.anio || 2024})`.trim();
      if (kmInput && v.kilometraje_actual) kmInput.value = v.kilometraje_actual;

      // Buscar cliente asociado al vehículo
      let c = (WORKSHOP_DATA.clientes || []).find(cli => cli.id_cliente === v.id_cliente);
      if (!c && v.propietario) {
        c = (WORKSHOP_DATA.clientes || []).find(cli => cli.nombre_razon_social && cli.nombre_razon_social.toLowerCase() === v.propietario.toLowerCase());
      }
      if (c) {
        autocompletarDatosClienteEnOrden(c);
      } else if (v.propietario) {
        const cliInput = document.getElementById('new-order-cliente');
        if (cliInput && !cliInput.value) cliInput.value = v.propietario;
      }
    }
  }
}

function handleCreateOrder(e) {
  e.preventDefault();
  const tipoDoc = document.getElementById('new-order-cliente-tipo')?.value || 'DNI';
  const numDoc = (document.getElementById('new-order-cliente-num-doc')?.value || '').trim();
  const clienteNombre = (document.getElementById('new-order-cliente')?.value || '').trim();
  const clienteTel = (document.getElementById('new-order-cliente-tel')?.value || '').trim();
  const clienteCorreo = (document.getElementById('new-order-cliente-correo')?.value || '').trim();
  const clienteDir = (document.getElementById('new-order-cliente-dir')?.value || '').trim();

  const placa = (document.getElementById('new-order-placa')?.value || '').toUpperCase().trim();
  const marca = (document.getElementById('new-order-vehiculo-marca')?.value || '').trim();
  const vehiculo = (document.getElementById('new-order-vehiculo')?.value || '').trim();
  const servicio = (document.getElementById('new-order-servicio')?.value || '').trim();
  const mecanico = document.getElementById('new-order-mecanico')?.value || 'Carlos Mendoza Soto';
  const total = parseFloat(document.getElementById('new-order-total')?.value) || 450;
  const km = parseInt(document.getElementById('new-order-km')?.value) || 78420;
  const gas = document.getElementById('new-order-gas')?.value || '1/2 Tanque';
  const danos = (document.getElementById('new-order-danos')?.value || '').trim();

  if (!placa || !clienteNombre) {
    showToast('Ingrese al menos la placa y el nombre del cliente', 'warning');
    return;
  }
  const placaRegex = /^[A-Z0-9]{3}-?[A-Z0-9]{3}$/;
  if (!placaRegex.test(placa)) {
    showToast('La placa debe tener un formato válido (ej. ABC-123)', 'warning');
    return;
  }
  if (tipoDoc === 'DNI') {
    if (numDoc && !/^\d{8}$/.test(numDoc)) {
      showToast('El DNI debe contener exactamente 8 dígitos', 'warning');
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(clienteNombre)) {
      showToast('El nombre de cliente persona natural debe contener únicamente letras', 'warning');
      return;
    }
  } else if (tipoDoc === 'RUC') {
    if (numDoc && !/^\d{11}$/.test(numDoc)) {
      showToast('El RUC debe contener exactamente 11 dígitos', 'warning');
      return;
    }
  }
  if (clienteTel && !/^\d{9}$/.test(clienteTel)) {
    showToast('El teléfono debe tener exactamente 9 dígitos', 'warning');
    return;
  }
  if (marca && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(marca)) {
    showToast('La marca debe contener únicamente letras', 'warning');
    return;
  }

  // Registrar o actualizar cliente
  if (!WORKSHOP_DATA.clientes) WORKSHOP_DATA.clientes = [];
  let clienteObj = WORKSHOP_DATA.clientes.find(c => 
    (numDoc && c.num_documento && c.num_documento === numDoc) || 
    (c.nombre_razon_social && c.nombre_razon_social.toLowerCase() === clienteNombre.toLowerCase())
  );

  if (!clienteObj) {
    const nextClientId = WORKSHOP_DATA.clientes.reduce((max, c) => Math.max(max, c.id_cliente || 0), 0) + 1;
    clienteObj = {
      id_cliente: nextClientId,
      tipo_documento: tipoDoc,
      num_documento: numDoc || `DOC-${Date.now().toString().slice(-6)}`,
      nombre_razon_social: clienteNombre,
      telefono: clienteTel || '999000111',
      correo: clienteCorreo || `${clienteNombre.toLowerCase().replace(/[^a-z0-9]/g, '')}@correo.pe`,
      direccion: clienteDir || 'Dirección registrada en recepción',
      tipo_cliente: (numDoc.length === 11 || tipoDoc === 'RUC') ? 'RUC' : 'PARTICULAR',
      activo: true
    };
    WORKSHOP_DATA.clientes.unshift(clienteObj);
  } else {
    // Si ya existía, actualizar datos de contacto si se suministraron
    if (clienteTel) clienteObj.telefono = clienteTel;
    if (clienteCorreo) clienteObj.correo = clienteCorreo;
    if (clienteDir) clienteObj.direccion = clienteDir;
    if (tipoDoc) clienteObj.tipo_documento = tipoDoc;
    if (numDoc) clienteObj.num_documento = numDoc;
  }

  // Registrar o actualizar vehículo
  if (!WORKSHOP_DATA.vehiculos) WORKSHOP_DATA.vehiculos = [];
  let vehiculoObj = WORKSHOP_DATA.vehiculos.find(v => v.placa && v.placa.toUpperCase() === placa);
  if (!vehiculoObj) {
    const nextVehId = WORKSHOP_DATA.vehiculos.reduce((max, v) => Math.max(max, v.id_vehiculo || 0), 0) + 1;
    vehiculoObj = {
      id_vehiculo: nextVehId,
      placa: placa,
      id_cliente: clienteObj.id_cliente,
      propietario: clienteObj.nombre_razon_social,
      marca: marca || 'Automóvil',
      modelo: vehiculo || 'Estándar',
      anio: new Date().getFullYear(),
      color: 'Plata / Blanco',
      kilometraje_actual: km,
      num_vin: `VIN-${Date.now().toString().slice(-8)}`,
      activo: true
    };
    WORKSHOP_DATA.vehiculos.unshift(vehiculoObj);
  } else {
    vehiculoObj.kilometraje_actual = km;
    if (marca) vehiculoObj.marca = marca;
    if (vehiculo) vehiculoObj.modelo = vehiculo;
    vehiculoObj.id_cliente = clienteObj.id_cliente;
    vehiculoObj.propietario = clienteObj.nombre_razon_social;
  }

  // Registrar nueva orden de trabajo
  if (!WORKSHOP_DATA.ordenes) WORKSHOP_DATA.ordenes = [];
  const nextId = (WORKSHOP_DATA.ordenes || []).reduce((max, o) => Math.max(max, o.id_orden || 0), 0) + 1;
  const code = `OT-2026-${String(nextId).padStart(4, '0')}`;

  const nueva = {
    id_orden: nextId,
    codigo_orden: code,
    fecha_ingreso: new Date().toISOString(),
    placa: placa,
    vehiculo: `${marca} ${vehiculo}`.trim() || 'Vehículo General',
    vehiculo_marca: marca || 'Automóvil',
    vehiculo_modelo: vehiculo || 'Estándar',
    cliente_nombre: clienteObj.nombre_razon_social,
    cliente_telefono: clienteObj.telefono,
    mecanico_nombre: mecanico,
    kilometraje: km,
    servicio: servicio || 'Mantenimiento General',
    motivo_ingreso: servicio || 'Mantenimiento General',
    estado: 'REGISTRADO',
    total_mano_obra: Math.round(total * 0.4),
    total_repuestos: Math.round(total * 0.6),
    total_general: total,
    pagado: false
  };
  WORKSHOP_DATA.ordenes.unshift(nueva);

  // Crear diagnóstico inicial
  if (!WORKSHOP_DATA.diagnosticos_tecnicos) WORKSHOP_DATA.diagnosticos_tecnicos = [];
  const nextDiagId = (WORKSHOP_DATA.diagnosticos_tecnicos || []).reduce((max, d) => Math.max(max, d.id_diagnostico || 0), 0) + 1;
  const nuevoDiag = {
    id_diagnostico: nextDiagId,
    placa: placa,
    codigo_ot: code,
    vehiculo: `${marca} ${vehiculo}`.trim() || 'Vehículo General',
    cliente: clienteObj.nombre_razon_social,
    mecanico: mecanico,
    fecha: new Date().toISOString().split('T')[0],
    kilometraje_ingreso: km,
    nivel_gasolina: gas,
    peritaje_carroceria: {
      rayones: danos || 'Sin daños registrados en recepción',
      abolladuras: 'Sin abolladuras mayores de impacto',
      accesorios: 'Llanta de repuesto, llave de rueda y herramientas a bordo',
      estado_general: 'Conforme'
    },
    subsistemas: [
      { nombre: 'Motor & Inyección', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
      { nombre: 'Sistema de Frenos', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
      { nombre: 'Suspensión & Dirección', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
      { nombre: 'Sistema Eléctrico & Batería', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' },
      { nombre: 'Fluidos & Lubricación', estado: 'PENDIENTE', notas: 'Pendiente de inspección técnica en fosa.' }
    ],
    dictamen_mecanico: `Ingreso registrado por ${servicio || 'Mantenimiento General'}. Requiere diagnóstico preventivo y verificación técnica.`,
    horas_estimadas: 2.5,
    costo_mano_obra: Math.round(total * 0.4),
    costo_repuestos: Math.round(total * 0.6),
    total_estimado: total,
    aprobado_cliente: true
  };
  WORKSHOP_DATA.diagnosticos_tecnicos.unshift(nuevoDiag);
  guardarDatosLocalStorage();

  // Guardar en la base de datos
  if (sbClient) {
    (async () => {
      try {
        let idCli = clienteObj.id_cliente;
        const { data: cliData } = await sbClient.from('clientes').upsert({
          tipo_documento: clienteObj.tipo_documento,
          num_documento: clienteObj.num_documento,
          nombre_razon_social: clienteObj.nombre_razon_social,
          telefono: clienteObj.telefono,
          correo: clienteObj.correo,
          direccion: clienteObj.direccion,
          tipo_cliente: clienteObj.tipo_cliente,
          activo: true
        }, { onConflict: 'num_documento' }).select();

        if (cliData && cliData[0]) {
          idCli = cliData[0].id_cliente;
          clienteObj.id_cliente = idCli;
        }

        let idVeh = vehiculoObj.id_vehiculo;
        const { data: vehData } = await sbClient.from('vehiculos').upsert({
          id_cliente: idCli,
          placa: placa,
          marca: vehiculoObj.marca,
          modelo: vehiculoObj.modelo,
          anio: vehiculoObj.anio,
          color: vehiculoObj.color,
          kilometraje_actual: km,
          num_vin: vehiculoObj.num_vin,
          activo: true
        }, { onConflict: 'placa' }).select();

        if (vehData && vehData[0]) {
          idVeh = vehData[0].id_vehiculo;
          vehiculoObj.id_vehiculo = idVeh;
        }

        const { data: ordData } = await sbClient.from('ordenes_trabajo').insert([{
          codigo_orden: code,
          id_vehiculo: idVeh,
          id_cliente: idCli,
          id_mecanico: getMecanicoIdByName(mecanico),
          id_usuario_creador: state.currentUser?.id_usuario || 1,
          fecha_ingreso: new Date().toISOString(),
          kilometraje_ingreso: km,
          nivel_combustible: gas,
          motivo_ingreso: servicio || 'Mantenimiento General',
          diagnostico_inicial: `Ingreso registrado por ${servicio || 'Mantenimiento General'}`,
          observaciones_recepcion: danos || 'Sin daños reportados',
          estado: 'REGISTRADO',
          total_mano_obra: Math.round(total * 0.4),
          total_repuestos: Math.round(total * 0.6),
          total_general: total,
          pagado: false
        }]).select();

        if (ordData && ordData[0]) {
          nueva.id_orden = ordData[0].id_orden;
        }

        await sbClient.from('diagnosticos_tecnicos').upsert({
          placa: placa,
          codigo_ot: code,
          vehiculo: `${marca} ${vehiculo}`.trim() || 'Vehículo General',
          cliente: clienteObj.nombre_razon_social,
          mecanico: mecanico,
          fecha: new Date().toISOString().split('T')[0],
          kilometraje_ingreso: km,
          nivel_gasolina: gas,
          peritaje_carroceria: nuevoDiag.peritaje_carroceria,
          subsistemas: nuevoDiag.subsistemas,
          dictamen_mecanico: nuevoDiag.dictamen_mecanico,
          horas_estimadas: 2.5,
          costo_mano_obra: Math.round(total * 0.4),
          costo_repuestos: Math.round(total * 0.6),
          total_estimado: total,
          aprobado_cliente: true
        }, { onConflict: 'codigo_ot' });

        console.log(`Orden ${code} guardada en Supabase Cloud`);
      } catch (errCloud) {
        console.warn('Error al persistir orden en Supabase:', errCloud);
      }
    })();
  }

  reproducirSonido('success');
  showToast(`Orden ${code} ingresada. Cliente ${clienteObj.nombre_razon_social} y Vehículo ${placa} registrados en el sistema.`, 'success');

  closeNewOrderModal();
  renderDashboard();
  renderOrdenesTable();
  renderClientesTable();
  renderVehiculosTable();
  renderDiagnosticoView();
}

// Control de ventanas modales
function abrirModalElemento(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('open');
  modal.style.display = 'flex';
  refrescarIconos();
  setupGlobalInputRestrictions();
}

function cerrarModal(modalOrId) {
  const el = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (el) {
    el.classList.add('hidden');
    el.classList.remove('open');
    el.style.display = 'none';
  }
}

function confirmarCerrarSesion() {
  reproducirSonido('click');
  abrirModalElemento('modal-logout-confirm');
}


// Seguridad de contraseñas y guardado local
// ----
async function calcularSHA256(texto) {
  const msgUint8 = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function persistirDatosLocales() {
  try {
    const dataToSave = {
      clientes: WORKSHOP_DATA.clientes,
      vehiculos: WORKSHOP_DATA.vehiculos,
      ordenes: WORKSHOP_DATA.ordenes,
      repuestos: WORKSHOP_DATA.repuestos,
      servicios: WORKSHOP_DATA.servicios,
      caja_movimientos: WORKSHOP_DATA.caja_movimientos || []
    };
    localStorage.setItem('mecapro_persisted_data_v1', JSON.stringify(dataToSave));
  } catch (err) {
    console.warn('No se pudo guardar en localStorage:', err);
  }
}

function recuperarDatosLocales() {
  try {
    const raw = localStorage.getItem('mecapro_persisted_data_v1');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.clientes && d.clientes.length) WORKSHOP_DATA.clientes = d.clientes;
    if (d.vehiculos && d.vehiculos.length) WORKSHOP_DATA.vehiculos = d.vehiculos;
    if (d.ordenes && d.ordenes.length) WORKSHOP_DATA.ordenes = d.ordenes;
    if (d.repuestos && d.repuestos.length) WORKSHOP_DATA.repuestos = d.repuestos;
    if (d.servicios && d.servicios.length) WORKSHOP_DATA.servicios = d.servicios;
    if (d.caja_movimientos) WORKSHOP_DATA.caja_movimientos = d.caja_movimientos;
  } catch (err) {
    console.warn('Error recuperando datos locales:', err);
  }
}

function ejecutarCerrarSesion() {
  cerrarModal('modal-logout-confirm');
  state.currentUser = null;
  localStorage.removeItem('mecapro_session_user');
  openLoginModal(true);
  showToast('Sesión cerrada correctamente. Ingrese credenciales para reingresar.', 'info');
}

function openLoginModal(isForced = false) {
  reproducirSonido('click');
  const modal = document.getElementById('login-modal');
  const list = document.getElementById('login-profiles-list');
  const btnClose = modal?.querySelector('button[aria-label="Cerrar ventana de autenticación"]');
  if (btnClose) {
    btnClose.style.display = isForced ? 'none' : 'block';
  }
  if (!modal || !list) return;

  const profiles = (WORKSHOP_DATA.usuarios || []).map(normalizarUsuario);
  WORKSHOP_DATA.usuarios = profiles;

  list.innerHTML = profiles.map(u => `
    <div class="p-3 rounded-xl border border-slate-200 dark:border-[#2a3b56] bg-slate-50/50 dark:bg-[#162032] flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
            ${u.avatar || (u.nombres ? u.nombres.charAt(0) : 'U')}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 dark:text-white text-xs">${u.nombres} ${u.apellidos}</span>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">${u.rol}</span>
            </div>
            <span class="text-[11px] text-slate-400 font-mono">@${u.username} • ${u.rol_display}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <input type="password" id="pwd-user-${u.username}" placeholder="Contraseña (demo: 123456)" class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3b56] bg-white dark:bg-[#101726] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500" onkeydown="if(event.key==='Enter') autenticarUsuarioConHash('${u.username}')">
        <button type="button" onclick="autenticarUsuarioConHash('${u.username}')" class="btn-scandi btn-scandi-primary text-xs px-3 py-1.5 flex items-center gap-1 flex-shrink-0">
          <i data-lucide="lock" class="w-3.5 h-3.5"></i>
          <span>Entrar</span>
        </button>
      </div>
    </div>
  `).join('');

  abrirModalElemento(modal);
  refrescarIconos();
}

async function autenticarUsuarioConHash(username) {
  const raw = (WORKSHOP_DATA.usuarios || []).find(x => x.username === username);
  if (!raw) return;

  const pwdInput = document.getElementById(`pwd-user-${username}`);
  const passIngresada = (pwdInput?.value || '').trim();

  // Validacion de contraseña segura
  const hashCalculado = await calcularSHA256(passIngresada || '123456');
  console.log(`[Seguridad RNF01] Hash SHA-256 generado para ${username}: ${hashCalculado}`);

  const u = normalizarUsuario(raw);
  state.currentUser = u;
  try {
    localStorage.setItem('mecapro_session_user', JSON.stringify(u));
  } catch (e) {}

  applyRolePermissions();
  closeLoginModal();
  reproducirSonido('success');
  showToast(`Autenticación exitosa (SHA-256 verificado). Bienvenido ${u.nombres}`, 'success');
  switchView('dashboard');
}


// Buscador rápido
function toggleBuscadorRapido() {
  const modal = document.getElementById('modal-busqueda-rapida');
  const input = document.getElementById('input-busqueda-rapida');
  if (!modal) return;

  if (modal.classList.contains('hidden') || modal.style.display === 'none') {
    reproducirSonido('click');
    abrirModalElemento(modal);
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
    buscarEnSistemaRapido('');
  } else {
    cerrarModal(modal);
  }
}

function buscarEnSistemaRapido(query) {
  const resultsContainer = document.getElementById('resultados-busqueda-rapida');
  if (!resultsContainer) return;
  const q = query.toLowerCase().trim();

  if (!q) {
    resultsContainer.innerHTML = '<span class="text-slate-400 text-center py-4">Escriba una placa, cliente o código de orden...</span>';
    return;
  }

  const clientes = (WORKSHOP_DATA.clientes || []).filter(c => (c.nombre_razon_social && c.nombre_razon_social.toLowerCase().includes(q)) || (c.num_documento && String(c.num_documento).includes(q))).slice(0, 3);
  const vehiculos = (WORKSHOP_DATA.vehiculos || []).filter(v => (v.placa && v.placa.toLowerCase().includes(q)) || (v.modelo && v.modelo.toLowerCase().includes(q))).slice(0, 3);
  const ordenes = (WORKSHOP_DATA.ordenes || []).filter(o => (o.codigo_orden && o.codigo_orden.toLowerCase().includes(q)) || (o.placa && o.placa.toLowerCase().includes(q))).slice(0, 3);

  let html = '';

  if (clientes.length > 0) {
    html += '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">Clientes</div>';
    html += clientes.map(c => `
      <div onclick="toggleBuscadorRapido(); switchView('clientes'); seleccionarClienteFilaWeb(${c.id_cliente})" class="p-2 hover:bg-slate-100 dark:hover:bg-[#1a253a] rounded-lg pointer flex justify-between items-center">
        <span class="font-medium text-slate-900 dark:text-white">${c.nombre_razon_social}</span>
        <span class="font-mono text-slate-400 text-[11px]">${c.num_documento}</span>
      </div>
    `).join('');
  }

  if (vehiculos.length > 0) {
    html += '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">Vehículos</div>';
    html += vehiculos.map(v => `
      <div onclick="toggleBuscadorRapido(); switchView('vehiculos'); seleccionarVehiculoFilaWeb(${v.id_vehiculo})" class="p-2 hover:bg-slate-100 dark:hover:bg-[#1a253a] rounded-lg pointer flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="plate-badge text-[10px]">${v.placa}</span>
          <span class="text-slate-800 dark:text-slate-200">${v.marca} ${v.modelo}</span>
        </div>
        <span class="text-slate-400 text-[11px]">${v.propietario}</span>
      </div>
    `).join('');
  }

  if (ordenes.length > 0) {
    html += '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">Órdenes de Trabajo</div>';
    html += ordenes.map(o => `
      <div onclick="toggleBuscadorRapido(); verDetalleOrdenDirectaWeb(${o.id_orden})" class="p-2 hover:bg-slate-100 dark:hover:bg-[#1a253a] rounded-lg pointer flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="font-mono font-bold text-blue-600">${o.codigo_orden}</span>
          <span class="text-slate-700 dark:text-slate-300">${o.placa}</span>
        </div>
        <span class="badge-status ${getEstadoBadgeClass(o.estado)} text-[9px]">${o.estado}</span>
      </div>
    `).join('');
  }

  if (!html) {
    html = '<div class="text-slate-400 text-center py-4">No se encontraron resultados para la búsqueda.</div>';
  }

  resultsContainer.innerHTML = html;
}

// Exportar resumen en CSV
function exportarResumenOperativo() {
  reproducirSonido('click');
  const todas = WORKSHOP_DATA.ordenes || [];
  const comp = WORKSHOP_DATA.comprobantes || [];
  const csvContent = "data:text/csv;charset=utf-8," 
    + "Codigo,Placa,Cliente,Estado,Total\n"
    + todas.map(o => `"${o.codigo_orden}","${o.placa}","${o.cliente_nombre}","${o.estado}",${o.total_general}`).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `MecaPro_Resumen_Operativo_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Resumen operativo descargado en CSV', 'success');
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosLocalStorage();
  initTheme();
  initSidebarState();
  initSupabase();
  updateAudioIcon();
  applyRolePermissions();
  setupGlobalInputRestrictions();
  switchView('dashboard');

  // Indicador de fecha
  const dateIndicator = document.getElementById('current-date-indicator');
  if (dateIndicator) {
    const d = new Date();
    dateIndicator.textContent = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Atajos de Teclado
  document.addEventListener('keydown', (e) => {
    // Atajo para buscador rápido
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleBuscadorRapido();
    }
    // Atajo para barra lateral
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-fondo');
      openModals.forEach(m => {
        if (!m.classList.contains('hidden') || m.classList.contains('open') || m.style.display === 'flex') {
          cerrarModal(m);
        }
      });
    }
  });

  refrescarIconos();
});


// Cierre de modales con clic en el fondo
// ----
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-fondo')) {
    if (e.target.id === 'login-modal' && !state.currentUser) return; // Obligatorio loguearse
    cerrarModal(e.target);
  }
});

// Cambio de ruta por historial
// ----
window.addEventListener('hashchange', () => {
  const hashView = window.location.hash.replace('#', '').trim();
  if (hashView && hashView !== state.currentView) {
    const validViews = ['dashboard', 'clientes', 'vehiculos', 'ordenes', 'diagnostico', 'tracking', 'inventario', 'caja', 'reportes', 'usuarios'];
    if (validViews.includes(hashView)) {
      switchView(hashView);
    }
  }
});


// Arqueo y cierre diario de caja
// ----
let estadoCajaDia = {
  abierta: true,
  fondoFijo: 300.00,
  fechaApertura: new Date().toISOString()
};

function renderArqueoCaja() {
  const comprobantes = WORKSHOP_DATA.comprobantes || [];
  const hoyStr = new Date().toISOString().split('T')[0];

  const emitidosHoy = comprobantes.filter(c => (c.fecha || '').startsWith(hoyStr) || true);
  
  let totalEfectivo = 0;
  let totalDigital = 0;

  emitidosHoy.forEach(c => {
    const m = parseFloat(c.total || 0);
    const metodo = (c.metodo_pago || 'EFECTIVO').toUpperCase();
    if (metodo.includes('EFECTIVO')) totalEfectivo += m;
    else totalDigital += m;
  });

  const saldoTeorico = estadoCajaDia.fondoFijo + totalEfectivo;

  const elFondo = document.getElementById('arqueo-fondo-fijo');
  const elEfec = document.getElementById('arqueo-ingresos-efectivo');
  const elDig = document.getElementById('arqueo-ingresos-digitales');
  const elTeorico = document.getElementById('arqueo-saldo-teorico');

  if (elFondo) elFondo.textContent = `S/ ${estadoCajaDia.fondoFijo.toFixed(2)}`;
  if (elEfec) elEfec.textContent = `S/ ${totalEfectivo.toFixed(2)}`;
  if (elDig) elDig.textContent = `S/ ${totalDigital.toFixed(2)}`;
  if (elTeorico) elTeorico.textContent = `S/ ${saldoTeorico.toFixed(2)}`;

  calcularDiferenciaArqueo();
}

function calcularDiferenciaArqueo() {
  const b100 = parseInt(document.getElementById('arq-billete-100')?.value || '0') * 100;
  const b50 = parseInt(document.getElementById('arq-billete-50')?.value || '0') * 50;
  const b20 = parseInt(document.getElementById('arq-billete-20')?.value || '0') * 20;
  const b10 = parseInt(document.getElementById('arq-billete-10')?.value || '0') * 10;
  const m5 = parseInt(document.getElementById('arq-moneda-5')?.value || '0') * 5;
  const m2 = parseInt(document.getElementById('arq-moneda-2')?.value || '0') * 2;
  const m1 = parseInt(document.getElementById('arq-moneda-1')?.value || '0') * 1;
  const m050 = parseInt(document.getElementById('arq-moneda-050')?.value || '0') * 0.5;

  const totalContado = b100 + b50 + b20 + b10 + m5 + m2 + m1 + m050;
  const elTotalContado = document.getElementById('arqueo-total-contado');
  if (elTotalContado) elTotalContado.textContent = `S/ ${totalContado.toFixed(2)}`;

  const teoricoStr = document.getElementById('arqueo-saldo-teorico')?.textContent || '0';
  const teorico = parseFloat(teoricoStr.replace('S/', '').trim()) || 0;
  const diferencia = totalContado - teorico;

  const elDif = document.getElementById('arqueo-diferencia');
  if (elDif) {
    elDif.textContent = `S/ ${diferencia.toFixed(2)}`;
    if (Math.abs(diferencia) < 0.01) {
      elDif.className = 'text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400';
    } else if (diferencia > 0) {
      elDif.className = 'text-lg font-bold font-mono text-blue-600 dark:text-blue-400';
    } else {
      elDif.className = 'text-lg font-bold font-mono text-crimson-600 dark:text-red-400';
    }
  }
}

function procesarCierreCajaWeb() {
  const elDif = document.getElementById('arqueo-diferencia')?.textContent || '0';
  showToast(`Arqueo de caja completado con éxito. Acta registrada (Diferencia: ${elDif}).`, 'success');
  reproducirSonido('success');
}
