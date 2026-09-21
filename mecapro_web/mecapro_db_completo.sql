-- =========================================================================
-- MECAPRO - CENTRO AUTOMOTRIZ Y SERVICIOS MECÁNICOS S.A.C.
-- ESQUEMA DDL POSTGRESQL HOMOLOGADO (CURSO INTEGRADOR I)
-- Incluye tablas core, sedes (GAP-R4-004), vistas analíticas y seguridad SHA-256
-- =========================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 1. SEDES DE LA EMPRESA (GAP-R4-004 / Avance 2 Tabla 7)
CREATE TABLE sedes (
    id_sede SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    direccion TEXT NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sedes (nombre, direccion, telefono, activo) VALUES
('Sede Ate (Principal)', 'Av. Separadora Industrial 1420, Ate, Lima', '01-512-4000', TRUE),
('Sede San Isidro', 'Av. República de Panamá 3505, San Isidro, Lima', '01-512-4001', TRUE),
('Sede Callao', 'Av. Elmer Faucett 2100, Callao', '01-512-4002', TRUE);

-- 2. ROLES Y USUARIOS CON SHA-256 (RF01 / RNF01)
CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

INSERT INTO roles (nombre, descripcion) VALUES
('ADMIN', 'Administrador General del Sistema MecaPro'),
('MECANICO', 'Técnico Especialista en Reparación y Diagnóstico'),
('CAJA', 'Responsable de Cobros, Facturación y Arqueo Diario'),
('RECEPCION', 'Asesor de Servicio y Recepción Vehicular');

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INTEGER NOT NULL REFERENCES roles(id_rol),
    id_sede INTEGER REFERENCES sedes(id_sede),
    dni VARCHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    correo VARCHAR(100),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Passwords hasheadas con SHA-256 de '123456': 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
INSERT INTO usuarios (id_rol, id_sede, dni, nombres, apellidos, username, password_hash, correo, telefono) VALUES
(1, 1, '72819201', 'Jean Franck', 'Loa Rojas', 'jloa-dev', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'jloa.dev@gmail.com', '987654321'),
(2, 1, '71928374', 'Carlos', 'Mendoza Quispe', 'cmendoza', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'cmendoza@mecapro.pe', '912345678'),
(3, 1, '74839201', 'Rosa', 'Flores Salazar', 'rflores', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'rflores@mecapro.pe', '955443322'),
(4, 1, '70918234', 'Luis', 'García Vega', 'lgarcia', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'lgarcia@mecapro.pe', '944332211');

-- 3. CLIENTES Y VEHÍCULOS (RF02 / RF03)
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL DEFAULT 'DNI',
    num_documento VARCHAR(15) NOT NULL UNIQUE,
    nombre_razon_social VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    direccion TEXT,
    tipo_cliente VARCHAR(20) DEFAULT 'PARTICULAR',
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehiculos (
    id_vehiculo SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INTEGER DEFAULT 2022,
    color VARCHAR(30),
    kilometraje_actual INTEGER DEFAULT 0,
    num_vin VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CATÁLOGOS DE SERVICIOS E INVENTARIO DE REPUESTOS (RF05 / RF10)
CREATE TABLE categorias_repuesto (
    id_categoria SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

INSERT INTO categorias_repuesto (nombre_categoria, descripcion) VALUES
('Mantenimiento y Filtros', 'Filtros de aceite, aire, combustible y cabina'),
('Frenos y Suspensión', 'Pastillas, discos, amortiguadores y terminales'),
('Lubricantes y Fluidos', 'Aceites sintéticos, líquido de frenos y refrigerantes'),
('Sistema Eléctrico', 'Baterías, bujías, alternadores y fusibles');

CREATE TABLE repuestos (
    id_repuesto SERIAL PRIMARY KEY,
    id_categoria INTEGER NOT NULL REFERENCES categorias_repuesto(id_categoria),
    codigo_sku VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    marca VARCHAR(50),
    precio_compra NUMERIC(10,2) NOT NULL,
    precio_venta NUMERIC(10,2) NOT NULL,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    ubicacion_taller VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE servicios_taller (
    id_servicio SERIAL PRIMARY KEY,
    codigo_servicio VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    precio_estandar NUMERIC(10,2) NOT NULL,
    tiempo_estimado_min INTEGER DEFAULT 60,
    activo BOOLEAN DEFAULT TRUE
);

-- 5. ÓRDENES DE TRABAJO Y DETALLES (RF06, RF07, RF08, RF11 / CU06)
CREATE TABLE ordenes_trabajo (
    id_orden SERIAL PRIMARY KEY,
    codigo_orden VARCHAR(20) NOT NULL UNIQUE,
    id_vehiculo INTEGER NOT NULL REFERENCES vehiculos(id_vehiculo),
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente),
    id_mecanico INTEGER REFERENCES usuarios(id_usuario),
    id_usuario_creador INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_sede INTEGER NOT NULL REFERENCES sedes(id_sede) DEFAULT 1,
    estado VARCHAR(25) NOT NULL DEFAULT 'REGISTRADO',
    motivo_ingreso TEXT NOT NULL,
    diagnostico_tecnico TEXT,
    total_estimado NUMERIC(10,2) DEFAULT 0.00,
    fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_salida TIMESTAMP
);

CREATE TABLE orden_servicios (
    id_orden_servicio SERIAL PRIMARY KEY,
    id_orden INTEGER NOT NULL REFERENCES ordenes_trabajo(id_orden) ON DELETE CASCADE,
    id_servicio INTEGER NOT NULL REFERENCES servicios_taller(id_servicio),
    cantidad NUMERIC(8,2) DEFAULT 1.00,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

CREATE TABLE orden_repuestos (
    id_orden_repuesto SERIAL PRIMARY KEY,
    id_orden INTEGER NOT NULL REFERENCES ordenes_trabajo(id_orden) ON DELETE CASCADE,
    id_repuesto INTEGER NOT NULL REFERENCES repuestos(id_repuesto),
    cantidad NUMERIC(8,2) DEFAULT 1.00,
    precio_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);

-- 6. FACTURACIÓN Y COMPROBANTES DE PAGO (RF12 / RF13)
CREATE TABLE comprobantes_pago (
    id_comprobante SERIAL PRIMARY KEY,
    id_orden INTEGER NOT NULL REFERENCES ordenes_trabajo(id_orden),
    tipo_comprobante VARCHAR(20) NOT NULL, -- 'FACTURA', 'BOLETA'
    serie_correlativo VARCHAR(20) NOT NULL UNIQUE,
    subtotal NUMERIC(10,2) NOT NULL,
    igv NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'EFECTIVO', -- 'EFECTIVO', 'YAPE', 'PLIN', 'TARJETA'
    estado VARCHAR(20) NOT NULL DEFAULT 'EMITIDO',
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. MOVIMIENTOS Y ARQUEO DIARIO DE CAJA (RF13 / CU09)
CREATE TABLE movimientos_caja (
    id_caja SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_sede INTEGER NOT NULL REFERENCES sedes(id_sede) DEFAULT 1,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monto_inicial NUMERIC(10,2) NOT NULL DEFAULT 300.00,
    ingresos_efectivo NUMERIC(10,2) DEFAULT 0.00,
    ingresos_digitales NUMERIC(10,2) DEFAULT 0.00,
    monto_cierre NUMERIC(10,2),
    diferencia NUMERIC(10,2),
    estado_caja VARCHAR(20) DEFAULT 'ABIERTA', -- 'ABIERTA', 'CERRADA'
    observaciones TEXT
);

-- 8. VISTAS ANALÍTICAS (Optimizadas para server.py y Dashboard)
CREATE OR REPLACE VIEW v_ordenes_resumen AS
SELECT 
    o.id_orden,
    o.codigo_orden,
    o.estado,
    o.motivo_ingreso,
    o.diagnostico_tecnico,
    o.total_estimado,
    o.fecha_ingreso,
    v.placa,
    v.marca AS vehiculo_marca,
    v.modelo AS vehiculo_modelo,
    c.id_cliente,
    c.nombre_razon_social AS cliente_nombre,
    c.num_documento AS cliente_documento,
    c.telefono AS cliente_telefono,
    u.nombres || ' ' || u.apellidos AS mecanico_asignado,
    s.nombre AS sede_nombre
FROM ordenes_trabajo o
JOIN vehiculos v ON o.id_vehiculo = v.id_vehiculo
JOIN clientes c ON o.id_cliente = c.id_cliente
LEFT JOIN usuarios u ON o.id_mecanico = u.id_usuario
JOIN sedes s ON o.id_sede = s.id_sede;

CREATE OR REPLACE VIEW v_alertas_inventario AS
SELECT 
    r.id_repuesto,
    r.codigo_sku,
    r.nombre,
    r.marca,
    r.stock_actual,
    r.stock_minimo,
    r.ubicacion_taller,
    c.nombre_categoria
FROM repuestos r
JOIN categorias_repuesto c ON r.id_categoria = c.id_categoria
WHERE r.stock_actual <= r.stock_minimo AND r.activo = TRUE;
