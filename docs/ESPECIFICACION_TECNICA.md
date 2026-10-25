# Documento de Arquitectura y Especificación Técnica de Software (ETS)
## Sistema Integral de Gestión de Taller Automotriz — MecaPro S.A.C.

---

### 📋 Control de Versiones y Metadatos del Documento
* **Código de Documento:** DOC-MECA-ET-003
* **Versión del Documento:** v3.0.0 (Entregable Avance 3 — Integración, Pruebas y Despliegue)
* **Fecha de Emisión:** 26 de Octubre de 2026
* **Estado:** Aprobado para Revisión y Sustentación de Jurado
* **Institución:** Universidad Tecnológica del Perú (UTP) — Facultad de Ingeniería
* **Asignatura:** Curso Integrador I: Sistemas y Software (Sección 49617)
* **Docente Asesora:** Mg. Danila Raquel Neira Sacaski
* **Equipo de Desarrollo (Grupo 3):**
  * Loa Rojas, Jahn Pahol (Tech Lead / Arquitecto de Software)
  * Apolinarez Salvatierra, Alex Estefano (Frontend & Maquetación UI)
  * Mina Huaman, Jose Carlos (Lógica Core & Flujos)
  * Noa Quiroz, Victor Manuel (Datos, Catálogos, Caja & SQL)
  * Condor Tomas, Miguel Eduardo (Estilos CSS, UX & Responsive)

---

## 1. Introducción y Alcance del Producto Software

### 1.1. Propósito
El presente documento establece formalmente las especificaciones técnicas, la arquitectura de software, el diseño de la base de datos relacional, el catálogo de servicios API RESTful, las reglas de negocio y los lineamientos de despliegue para el sistema **MecaPro ERP Cloud**. Este documento sirve como guía oficial de referencia técnica para el equipo de desarrollo, auditores de código y el jurado evaluador.

### 1.2. Alcance del Sistema
MecaPro es una solución de software empresarial híbrida orientada a la administración operativa, financiera y logística de centros automotrices multi-sede. Comprende los siguientes módulos funcionales:
1. **Módulo de Seguridad y Control de Acceso (RBAC):** Autenticación de usuarios con cifrado SHA-256 y autorización por roles.
2. **Módulo de Gestión de Clientes y Parque Automotor:** Administración de expedientes de clientes y trazabilidad histórica de vehículos por número de placa y VIN.
3. **Módulo de Órdenes de Trabajo (OT) y Peritaje Técnico:** Flujo de trabajo desde la recepción y diagnóstico pericial hasta el control de calidad y entrega final.
4. **Módulo de Logística e Inventario:** Control de existencias físicas de repuestos, alertas de stock de seguridad y catálogo de mano de obra/servicios.
5. **Módulo de Facturación y Finanzas:** Emisión de comprobantes tributarios (Boleta / Factura) conforme a la legislación peruana con desglose del 18% de IGV y control de arqueo diario de caja.
6. **Módulo de Reportes e Inteligencia Operativa:** Generación de documentos PDF oficiales y reportes de rentabilidad.

---

## 2. Requerimientos del Sistema (IEEE 830)

### 2.1. Requerimientos Funcionales (RF)

| ID | Nombre | Descripción Técnica | Criterios de Aceptación |
|---|---|---|---|
| **RF01** | Autenticación Segura | El sistema debe validar credenciales de acceso comparando el hash SHA-256 de la contraseña ingresada contra el registro en la base de datos. | Bloqueo tras 3 intentos fallidos y rechazo absoluto de contraseñas en texto claro. |
| **RF02** | Gestión de Clientes | Permite el registro, consulta, actualización y desactivación lógica de clientes (Personas Naturales con DNI y Empresas con RUC). | Validación de 8 dígitos para DNI y 11 dígitos para RUC con dígito verificador. |
| **RF03** | Registro Vehicular | Registro de unidades asociadas a clientes, capturando placa, marca, modelo, año, kilometraje actual y código VIN. | Formato de placa peruana estándar (ej. `ABC-123` o `A1B-234`) único en la base de datos. |
| **RF04** | Soporte Multi-Sede | El sistema debe asociar cada usuario, orden de trabajo y movimiento de caja a una sede operativa específica. | Integración con tabla `sedes` (GAP-R4-004) y aislamiento de arqueos por sede. |
| **RF05** | Catálogo de Servicios | Catálogo de operaciones mecánicas con código identificador único, tarifa estándar y tiempo estimado en minutos. | Código único correlativo y precio unitario estrictamente mayor a 0. |
| **RF06** | Apertura de Órdenes | Creación de orden de trabajo con generación automática de código identificador (ej. `OT-2026-0001`) y estado inicial `REGISTRADO`. | Código irrepetible, fecha/hora de ingreso capturada del servidor y motivo de falla obligatorio. |
| **RF07** | Diagnóstico y Peritaje | Registro de diagnóstico técnico elaborado por el especialista asignado, modificando el estado de la OT a `EN_DIAGNOSTICO` o `EN_PROCESO`. | Asignación obligatoria de un usuario con rol `MECANICO`. |
| **RF08** | Asignación de Ítems | Incorporación dinámica de repuestos y servicios a la orden de trabajo con cálculo en tiempo real de subtotales. | Total estimado recalculado automáticamente mediante triggers o consultas agregadas. |
| **RF09** | Transición de Estados | Máquina de estados con transiciones estrictas: `REGISTRADO` ➔ `EN_DIAGNOSTICO` ➔ `EN_PROCESO` ➔ `FINALIZADO` ➔ `ENTREGADO`. | Ninguna orden puede finalizarse sin diagnóstico técnico registrado. |
| **RF10** | Inventario y Kardex | Registro de repuestos categorizados con precio de compra, precio de venta, stock actual y stock mínimo. | Alerta visual en dashboard cuando `stock_actual <= stock_minimo`. |
| **RF11** | Reserva de Stock | Verificación de inventario en tiempo real al agregar repuestos a una OT, bloqueando transacciones si no hay stock suficiente. | Devolución de excepción HTTP 400 / SQLException si la cantidad solicitada excede el stock. |
| **RF12** | Facturación y Liquidación | Emisión de comprobantes de pago (Boleta/Factura) calculando: Subtotal = Total / 1.18, IGV = Total - Subtotal. | Serie y correlativo únicos (ej. `B001-000001`, `F001-000001`). |
| **RF13** | Arqueo Diario de Caja | Apertura de caja con fondo inicial fijo (S/ 300.00), conciliación de ingresos en efectivo/digitales y cálculo de diferencias en cierre. | Estado de caja `ABIERTA` único por sede y fecha. |
| **RF14** | Reportes PDF | Emisión e impresión de documentos vectoriales PDF para comprobantes de pago y fichas técnicas de OT. | Renderizado conforme al estándar PDF/A mediante Apache PDFBox. |

### 2.2. Requerimientos No Funcionales (RNF)

| ID | Categoría | Especificación de Rendimiento / Calidad | Métrica de Cumplimiento |
|---|---|---|---|
| **RNF01** | Seguridad Criptográfica | Algoritmo de dispersión criptográfica unidireccional SHA-256 para contraseñas de usuarios. | Cero contraseñas almacenadas en texto plano en logs o base de datos. |
| **RNF02** | Rendimiento y Latencia | Tiempo de respuesta en transacciones locales menor a 500 ms y en API REST menor a 1.2 segundos con 50 peticiones concurrentes. | Evaluado con herramientas de carga bajo perfil 95th percentile. |
| **RNF03** | Integridad ACID | Motor de base de datos relacional con nivel de aislamiento `READ COMMITTED` y soporte total para rollback en fallos. | Verificación en auditoría transaccional de caja y descargo de stock. |
| **RNF04** | Portabilidad y Entornos | Ejecución garantizada en plataformas Windows 10/11 x64, macOS (Apple Silicon e Intel) y distribuciones Linux LTS. | Probado bajo OpenJDK 17 LTS y Python 3.12. |
| **RNF05** | Usabilidad y Diseño | Interfaz gráfica adaptativa con compatibilidad para modos Claro/Oscuro y soporte mínimo para resolución 1280x720 píxeles. | Cumplimiento de estándares de contraste WCAG 2.1 nivel AA. |
| **RNF06** | Mantenibilidad | Arquitectura desacoplada en capas (MVC + DAO + Services) con cobertura de pruebas unitarias sobre la lógica de negocio. | Cobertura de pruebas unitarias con JUnit 5 superior al 75%. |

---

## 3. Arquitectura del Sistema de Software

### 3.1. Diagrama de Arquitectura de la Solución (C4 - Nivel 2)

```mermaid
graph TD
    subgraph Capa_Cliente ["Capa de Presentación y Clientes"]
        DesktopApp["Desktop App (Java Swing 17 + FlatLaf)"]
        WebApp["Web SPA (HTML5 + Tailwind CSS + Vanilla JS)"]
    end

    subgraph Capa_Logica ["Capa de Lógica de Negocio y Microservicios"]
        JavaServices["Servicios Java (ServicioOrdenTrabajo, ServicioAutenticacion)"]
        FastAPI["API REST Python (FastAPI + Uvicorn)"]
    end

    subgraph Capa_Datos ["Capa de Persistencia y Nube"]
        HikariCP["Pool de Conexiones HikariCP"]
        PostgreSQL[("Base de Datos PostgreSQL 17 (3FN)")]
        Supabase[("Supabase Cloud DB (PostgreSQL)")]
        FirebaseHosting["Google Firebase Hosting (CDN)"]
    end

    DesktopApp -->|Llamadas Locales| JavaServices
    JavaServices -->|JDBC| HikariCP
    HikariCP -->|TCP 5432| PostgreSQL

    WebApp -->|HTTPS REST| FastAPI
    FastAPI -->|psycopg2| PostgreSQL
    WebApp -->|Hosting Estático| FirebaseHosting
    WebApp -.->|Sincronización Cloud| Supabase
```

### 3.2. Patrones de Diseño Implementados
1. **Data Access Object (DAO):** Desacopla la lógica de negocio de la lógica de persistencia SQL. Cada tabla cuenta con una clase DAO (`ClienteDAO`, `VehiculoDAO`, `OrdenTrabajoDAO`, `RepuestoDAO`, etc.).
2. **Model - View - Controller (MVC):** Vistas Swing puras desacopladas de los modelos de dominio mediante controladores y servicios de aplicación.
3. **Singleton / Factory:** Implementado en `ConexionBD.java` para garantizar una única instancia del Pool de Conexiones HikariCP y evitar agotamiento de descriptores de sockets.
4. **Data Transfer Object (DTO):** Utilizado en la capa web mediante modelos Pydantic en FastAPI para serialización y validación estricta de esquemas JSON.

---

## 4. Diseño y Diccionario de Base de Datos Relacional (3FN)

El esquema relacional `mecapro_db` está normalizado en Tercera Forma Normal (3FN), eliminando redundancias y anomalías de inserción, actualización y borrado.

### 4.1. Diccionario de Tablas Principales

#### Tabla: `sedes`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_sede` | SERIAL | NO | PK | Identificador único de la sede operativa |
| `nombre` | VARCHAR(100) | NO | UNIQUE | Nombre comercial de la sede (ej. Sede Ate) |
| `direccion` | TEXT | NO | - | Dirección física completa |
| `telefono` | VARCHAR(20) | SÍ | - | Teléfono de contacto |
| `activo` | BOOLEAN | NO | - | Estado lógico de la sede (Default: TRUE) |
| `fecha_creacion` | TIMESTAMP | NO | - | Fecha y hora de alta en el sistema |

#### Tabla: `roles`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_rol` | SERIAL | NO | PK | Identificador único del rol |
| `nombre` | VARCHAR(50) | NO | UNIQUE | Nombre del rol (`ADMIN`, `MECANICO`, `CAJA`, `RECEPCION`) |
| `descripcion` | TEXT | SÍ | - | Descripción funcional de responsabilidades |
| `activo` | BOOLEAN | NO | - | Estado de activación del rol |

#### Tabla: `usuarios`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_usuario` | SERIAL | NO | PK | Identificador único del colaborador |
| `id_rol` | INTEGER | NO | FK | Referencia a `roles.id_rol` |
| `id_sede` | INTEGER | SÍ | FK | Referencia a `sedes.id_sede` |
| `dni` | VARCHAR(8) | NO | UNIQUE | Documento Nacional de Identidad |
| `nombres` | VARCHAR(100) | NO | - | Nombres del colaborador |
| `apellidos` | VARCHAR(100) | NO | - | Apellidos del colaborador |
| `username` | VARCHAR(50) | NO | UNIQUE | Nombre de usuario para inicio de sesión |
| `password_hash` | VARCHAR(255) | NO | - | Hash de la contraseña en SHA-256 (64 caracteres hex) |
| `correo` | VARCHAR(100) | SÍ | - | Correo electrónico corporativo |
| `telefono` | VARCHAR(20) | SÍ | - | Teléfono de contacto directo |
| `activo` | BOOLEAN | NO | - | Indicador de cuenta activa |

#### Tabla: `clientes`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_cliente` | SERIAL | NO | PK | Identificador único del cliente |
| `tipo_documento`| VARCHAR(10) | NO | - | Tipo de documento (`DNI`, `RUC`, `CE`, `PASAPORTE`) |
| `num_documento` | VARCHAR(15) | NO | UNIQUE | Número de identificación oficial |
| `nombre_razon_social` | VARCHAR(150) | NO | - | Nombre completo o Razón Social |
| `telefono` | VARCHAR(20) | SÍ | - | Número celular o de contacto |
| `correo` | VARCHAR(100) | SÍ | - | Correo para envío de comprobantes |
| `direccion` | TEXT | SÍ | - | Dirección fiscal o domiciliaria |
| `tipo_cliente` | VARCHAR(20) | NO | - | Clasificación (`PARTICULAR`, `CORPORATIVO`) |
| `activo` | BOOLEAN | NO | - | Borrado lógico del cliente |

#### Tabla: `vehiculos`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_vehiculo` | SERIAL | NO | PK | Identificador interno de la unidad |
| `id_cliente` | INTEGER | NO | FK | Referencia a `clientes.id_cliente` (`ON DELETE RESTRICT`) |
| `placa` | VARCHAR(10) | NO | UNIQUE | Placa única nacional del vehículo |
| `marca` | VARCHAR(50) | NO | - | Fabricante del vehículo (Toyota, Hyundai, etc.) |
| `modelo` | VARCHAR(50) | NO | - | Modelo del fabricante |
| `anio` | INTEGER | SÍ | - | Año de fabricación del vehículo |
| `color` | VARCHAR(30) | SÍ | - | Color predominante |
| `kilometraje_actual` | INTEGER | NO | - | Kilometraje registrado en la última visita |
| `num_vin` | VARCHAR(50) | SÍ | - | Número de chasis / VIN |

#### Tabla: `repuestos`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_repuesto` | SERIAL | NO | PK | Identificador del repuesto |
| `id_categoria` | INTEGER | NO | FK | Referencia a `categorias_repuesto.id_categoria` |
| `codigo_sku` | VARCHAR(30) | NO | UNIQUE | Código de parte o SKU comercial |
| `nombre` | VARCHAR(150) | NO | - | Denominación del repuesto |
| `marca` | VARCHAR(50) | SÍ | - | Marca del fabricante de autopartes |
| `precio_compra` | NUMERIC(10,2)| NO | - | Costo de adquisición unitario |
| `precio_venta` | NUMERIC(10,2)| NO | - | Precio de venta al público |
| `stock_actual` | INTEGER | NO | - | Cantidad física disponible en almacén |
| `stock_minimo` | INTEGER | NO | - | Umbral de reorden de seguridad |
| `ubicacion_taller`| VARCHAR(50)| SÍ | - | Posición en estantería (ej. Pasillo A-02) |

#### Tabla: `ordenes_trabajo`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_orden` | SERIAL | NO | PK | Identificador único de la orden |
| `codigo_orden` | VARCHAR(20) | NO | UNIQUE | Código de seguimiento (ej. `OT-2026-0001`) |
| `id_vehiculo` | INTEGER | NO | FK | Referencia a `vehiculos.id_vehiculo` |
| `id_cliente` | INTEGER | NO | FK | Referencia a `clientes.id_cliente` |
| `id_mecanico` | INTEGER | SÍ | FK | Referencia a `usuarios.id_usuario` |
| `id_usuario_creador` | INTEGER | NO | FK | Asesor de servicio que abrió la OT |
| `id_sede` | INTEGER | NO | FK | Sede donde se atiende el vehículo |
| `estado` | VARCHAR(25) | NO | - | Estado actual (`REGISTRADO`, `EN_PROCESO`, etc.) |
| `motivo_ingreso` | TEXT | NO | - | Declaración de falla inicial del cliente |
| `diagnostico_tecnico` | TEXT | SÍ | - | Informe pericial del mecánico |
| `total_estimado`| NUMERIC(10,2)| NO | - | Monto acumulado de servicios y repuestos |
| `fecha_ingreso` | TIMESTAMP | NO | - | Fecha de registro de ingreso |
| `fecha_salida` | TIMESTAMP | SÍ | - | Fecha de entrega al cliente |

#### Tabla: `comprobantes_pago`
| Columna | Tipo | Nulo | Clave | Descripción |
|---|---|---|---|---|
| `id_comprobante`| SERIAL | NO | PK | Identificador del comprobante |
| `id_orden` | INTEGER | NO | FK | Referencia a `ordenes_trabajo.id_orden` |
| `tipo_comprobante` | VARCHAR(20) | NO | - | `BOLETA` o `FACTURA` |
| `serie_correlativo` | VARCHAR(20) | NO | UNIQUE | Numeración oficial (ej. `B001-000105`) |
| `subtotal` | NUMERIC(10,2)| NO | - | Base imponible (Total / 1.18) |
| `igv` | NUMERIC(10,2)| NO | - | Impuesto General a las Ventas (18%) |
| `total` | NUMERIC(10,2)| NO | - | Monto total liquidado |
| `metodo_pago` | VARCHAR(30) | NO | - | `EFECTIVO`, `YAPE`, `PLIN`, `TARJETA` |
| `fecha_emision` | TIMESTAMP | NO | - | Marca temporal de facturación |

---

## 5. Especificación de la API RESTful (Microservicio FastAPI)

El microservicio en Python expone una API REST bajo arquitectura OpenAPI 3.0:

### 5.1. Resumen de Endpoints Principales

| Método | Endpoint | Descripción | Roles Autorizados |
|---|---|---|---|
| `GET` | `/api/health` | Verificación de estado del servidor y PostgreSQL | Público |
| `POST` | `/api/auth/login` | Autenticación con verificación de hash SHA-256 | Todos |
| `GET` | `/api/dashboard/stats` | Métricas de KPIs, conteo de OTs y dinero en caja | `ADMIN`, `CAJA` |
| `GET` | `/api/ordenes` | Listado paginado de órdenes de trabajo con filtros | Todos |
| `GET` | `/api/ordenes/{id_orden}`| Obtiene detalle completo de una OT (servicios y repuestos)| Todos |
| `POST` | `/api/ordenes` | Crea una nueva orden de trabajo | `ADMIN`, `RECEPCION` |
| `POST` | `/api/ordenes/cambiar-estado`| Realiza la transición de estado de una OT | `ADMIN`, `MECANICO` |
| `GET` | `/api/repuestos` | Consulta del catálogo de repuestos | Todos |
| `GET` | `/api/repuestos/alertas` | Filtra repuestos con stock bajo el umbral mínimo | `ADMIN`, `MECANICO` |
| `POST` | `/api/repuestos/{id}/stock` | Ajuste de stock de inventario | `ADMIN` |
| `GET` | `/api/clientes` | Consulta de clientes por documento o nombre | Todos |
| `POST` | `/api/clientes` | Registro de nuevo cliente | `ADMIN`, `RECEPCION` |
| `GET` | `/api/vehiculos` | Consulta de vehículos por placa | Todos |
| `POST` | `/api/vehiculos` | Registro de nueva unidad vehicular | `ADMIN`, `RECEPCION` |
| `POST` | `/api/caja/emitir` | Emite boleta o factura y cierra la liquidación de la OT | `ADMIN`, `CAJA` |

### 5.2. Especificación de Payloads

#### Autenticación: `POST /api/auth/login`
* **Request Payload (JSON):**
  ```json
  {
    "username": "jloa-dev",
    "password_hash": "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
  }
  ```
* **Response Payload (200 OK):**
  ```json
  {
    "status": "success",
    "usuario": {
      "id_usuario": 1,
      "username": "jloa-dev",
      "nombres": "Jean Franck",
      "apellidos": "Loa Rojas",
      "rol": "ADMIN",
      "id_sede": 1,
      "sede_nombre": "Sede Ate (Principal)"
    }
  }
  ```

#### Emisión de Comprobante: `POST /api/caja/emitir`
* **Request Payload (JSON):**
  ```json
  {
    "id_orden": 12,
    "tipo_comprobante": "FACTURA",
    "metodo_pago": "TARJETA",
    "id_usuario": 3
  }
  ```
* **Response Payload (201 Created):**
  ```json
  {
    "status": "success",
    "comprobante": {
      "id_comprobante": 45,
      "serie_correlativo": "F001-000045",
      "subtotal": 450.00,
      "igv": 81.00,
      "total": 531.00,
      "metodo_pago": "TARJETA",
      "fecha_emision": "2026-10-26T14:00:00"
    }
  }
  ```

---

## 6. Variables de Entorno y Configuración (.env)

```bash
# =========================================================================
# CONFIGURACIÓN DE ACCESO A POSTGRESQL LOCAL / RED LOCAL
# =========================================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mecapro_db
DB_USER=postgres
DB_PASSWORD=Loa

# =========================================================================
# MICROSERVICIO WEB Y PUERTO ASGI
# =========================================================================
APP_PORT=8080
APP_HOST=0.0.0.0
DEBUG_MODE=False

# =========================================================================
# CONECTIVIDAD CLOUD FIREBASE & SUPABASE
# =========================================================================
FIREBASE_PROJECT=cuentas-951a9
FIREBASE_API_KEY=AIzaSyAS6PUqQRVvwryaaVvz0GBgxgUlyFLIbCI
SUPABASE_URL=https://mecapro.supabase.co
```

---

## 7. Plan de Contingencia y Recuperación ante Desastres (DRP)

1. **Respaldos Automatizados (pg_dump):** Se programa un volcado lógico diario mediante tarea programada de cron/Task Scheduler:
   ```bash
   pg_dump -U postgres -h localhost -F c -b -v -f "backup_mecapro_$(date +%Y%m%d).backup" mecapro_db
   ```
2. **Procedimiento de Restauración:**
   ```bash
   pg_restore -U postgres -d mecapro_db -v -c "backup_mecapro_20261026.backup"
   ```
3. **Modo Resiliente Offline (Web):** Si el servidor API local o la base de datos caen temporalmente, la plataforma web conmuta a modo local utilizando `localStorage` para garantizar la continuidad del registro de peritajes y aperturas de OT.
