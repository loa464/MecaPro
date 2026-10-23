# MecaPro — Centro Automotriz y Servicios Mecánicos S.A.C.
> **Sistema Integral de Gestión de Taller Automotriz, Órdenes de Trabajo (OT), Kardex de Repuestos, Caja Diaria y Facturación Cloud**

---

### 🏛️ Información Institucional y Académica
* **Institución:** Universidad Tecnológica del Perú (UTP) — Facultad de Ingeniería.
* **Carrera:** Ingeniería de Sistemas e Informática / Ingeniería de Software.
* **Asignatura:** Curso Integrador I: Sistemas y Software (Sección 49617).
* **Entregable:** Avance de Proyecto Final 3 (Avance 3 — Fase de Integración, Pruebas y Despliegue).
* **Docente Asesora:** Mg. Danila Raquel Neira Sacaski.
* **Fecha de Emisión del Documento:** 26 de Octubre de 2026.
* **Versión del Sistema:** v0.3.0 (Edición Integrada Desktop & Cloud).

---

## 👥 Equipo de Desarrollo — Grupo 3

| Integrante | Rol Técnico | Responsabilidades Principales |
|---|---|---|
| **Loa Rojas, Jahn Pahol** | **Tech Lead & Arquitecto de Software** | Diseño de arquitectura MVC/DAO, API FastAPI, seguridad criptográfica SHA-256, integración continua y despliegue Cloud. |
| **Apolinarez Salvatierra, Alex Estefano** | **Ingeniero Frontend & Maquetación UI** | Construcción de interfaz SPA, componentes modulares HTML5/Tailwind, diseño responsivo y flujo de usuario. |
| **Mina Huaman, Jose Carlos** | **Ingeniero de Lógica Core & Flujos** | Reglas de negocio de Órdenes de Trabajo, máquina de estados de vehículos, cálculo de liquidaciones e impuestos (IGV). |
| **Noa Quiroz, Victor Manuel** | **Ingeniero de Datos, Caja & SQL** | Modelado DDL relacional 3FN, transacciones ACID, arqueo de caja, vistas analíticas y optimización de consultas. |
| **Condor Tomas, Miguel Eduardo** | **Ingeniero UX & Estilos Visuales** | Guías de estilos visuales, Look & Feel moderno (FlatLaf Desktop y Tailwind Web), diseño accesible y maquetación de reportes. |

---

## 📌 1. Visión General y Justificación del Proyecto

El sector de mantenimiento automotriz en el Perú opera predominantemente con procesos manuales basados en boletas físicas, pizarras acrílicas y registros en hojas de cálculo fragmentadas. Esta desarticulación operativa genera cuellos de botella críticos:

1. **Pérdida de trazabilidad:** Dificultad para auditar el estado real de un vehículo desde su ingreso hasta su entrega.
2. **Fugas de inventario:** Falta de correlación directa entre repuestos instalados en el vehículo y el stock descontado de almacén.
3. **Discrepancias en caja:** Arqueos descuadrados entre montos en efectivo, transferencias digitales (Yape/Plin) y órdenes liquidadas.
4. **Tiempos muertos de atención:** Demoras en la emisión de comprobantes de pago y entrega de diagnósticos al cliente.

**MecaPro SIGEMA** (Sistema Integrado de Gestión Mecánica y Automotriz) es una solución integral diseñada para digitalizar, optimizar y auditar de extremo a extremo el flujo operativo de talleres mecánicos con soporte multi-sede.

```
 [Recepción Vehicular] ➔ [Peritaje y Diagnóstico] ➔ [Apertura de OT]
          │                                              │
          ▼                                              ▼
 [Asignación de Mecánico] ◄────── [Asignación Repuestos / Servicios]
          │                                              │
          ▼                                              ▼
 [Ejecución Técnica] ➔ [Control de Calidad] ➔ [Facturación y Arqueo de Caja]
```

---

## 🛠️ 2. Stack Tecnológico y Arquitectura

MecaPro implementa una **arquitectura híbrida de alta disponibilidad**: una aplicación robusta de escritorio para operaciones pesadas de taller y un ecosistema web responsivo con sincronización en la nube.

### A. Capa de Escritorio (Desktop Application)
* **Lenguaje:** Java SE 17 LTS (OpenJDK / Amazon Corretto).
* **Patrón de Arquitectura:** Modelo - Vista - Controlador (MVC) acoplado a Data Access Object (DAO) y Services.
* **Interfaz Gráfica (GUI):** Java Swing moderno potenciado con **FlatLaf (Light/Dark Look & Feel)** y **MigLayout** para grids dinámicos.
* **Componentes Especializados:** **LGoodDatePicker** para control temporal y calendarios.
* **Reportes Oficiales:** **Apache PDFBox 3.0.1** para renderizado nativo de comprobantes y órdenes en formato vectorial PDF.
* **Exportación de Datos:** **Apache POI 5.2.5** para generación automatizada de inventarios y kardex en Excel (.xlsx).
* **Pool de Conexiones:** **HikariCP 5.1.0** para gestión de conexiones JDBC de alta velocidad y baja latencia.

### B. Capa Web & Microservicios Cloud (Web Platform)
* **Frontend:** Single Page Application (SPA) construida en JavaScript ES6+ Vanilla y **Tailwind CSS**.
* **Criptografía Cliente:** **Web Crypto API nativa** para cálculo de hash seguro SHA-256 (RNF01) previo a la transmisión.
* **Backend API REST:** **Python 3.12** utilizando **FastAPI**, **Uvicorn ASGI Server** y driver de bajo nivel **Psycopg2**.
* **Persistencia Híbrida Web:** LocalStorage para funcionamiento offline/resiliente y cliente PostgreSQL en tiempo real vía **Supabase**.
* **Despliegue de Producción:** **Google Firebase Hosting** (Disponible públicamente en [https://mecapro.web.app](https://mecapro.web.app)).

### C. Capa de Persistencia y Base de Datos Relacional
* **Motor:** **PostgreSQL 17** (compatible con PostgreSQL 15.x y 16.x).
* **Modelado:** Esquema relacional estructurado rigurosamente en **Tercera Forma Normal (3FN)**.
* **Seguridad Transaccional:** Nivel de aislamiento transaccional Read Committed con restricciones de integridad referencial `ON DELETE RESTRICT` y reglas en cascada para detalles operativos.

---

## 📂 3. Estructura del Repositorio de Código

```
MecaPro Avance 3/
├── 04_CODIGO_FUENTE_JAVA/
│   ├── 01_Sistema_Escritorio_Java/      # Proyecto Java 17 Swing (NetBeans / Maven)
│   │   ├── src/mecapro/
│   │   │   ├── configuracion/           # ConexionBD (JDBC + HikariCP), ConfiguracionApp
│   │   │   ├── dao/                     # ClienteDAO, VehiculoDAO, OrdenTrabajoDAO, RepuestoDAO, etc.
│   │   │   ├── modelo/                  # Entidades POJO de dominio (Cliente, Vehiculo, OT, etc.)
│   │   │   ├── servicio/                # ServicioAutenticacion, ServicioOrdenTrabajo
│   │   │   ├── util/                    # GeneradorReportesPDF, AyudanteUI, IconosApp
│   │   │   ├── vista/                   # FrmPrincipal, FrmIniciarSesion, Paneles Modulares
│   │   │   └── MecaPro.java             # Clase de arranque de la aplicación de escritorio
│   │   ├── lib/                         # Dependencias JAR empaquetadas (FlatLaf, PDFBox, JDBC)
│   │   ├── pom.xml                      # Descriptores de dependencias Apache Maven
│   │   └── build.xml                    # Script de compilación Apache Ant
│   ├── 02_Sistema_Web_Cloud/            # Réplica de plataforma web y API
│   ├── 03_Base_de_Datos_PostgreSQL/     # Scripts maestros DDL, DML y vistas
│   │   ├── mecapro_db_completo.sql      # Script DDL/DML integral de inicialización
│   │   └── mecapro_supabase.sql         # Script optimizado para la nube Supabase
│   └── 04_Diagramas_UML/                # Especificaciones de modelado formal en PlantUML
│       ├── diagrama_clases.puml         # Diagrama de Clases del Dominio
│       ├── diagrama_casos_uso.puml      # Diagrama de Casos de Uso del Sistema
│       └── diagrama_er_postgresql.puml  # Diagrama Entidad-Relación de BD
├── mecapro_web/                         # Plataforma Web y Servidor API FastAPI
│   ├── assets/                          # Logotipos y recursos gráficos vectoriales
│   ├── css/                             # Hojas de estilo y Tailwind compilado
│   ├── js/                              # Lógica cliente modular (app.js, data.js)
│   ├── index.html                       # SPA principal de gestión de taller
│   ├── server.py                        # Servidor RESTful API con FastAPI y endpoints DB
│   └── firebase.json                    # Manifiesto de despliegue en Google Cloud Firebase
├── mecapro_db_completo.sql              # Script maestro SQL raíz homologado
├── pom.xml                              # Archivo Maven raíz con suite de pruebas TDD y plugins
├── ESPECIFICACION_TECNICA.md            # Documento formal de arquitectura y especificación técnica
└── README.md                            # Documentación ejecutiva y operativa principal
```

---

## 🎯 4. Requerimientos del Sistema

### Requerimientos Funcionales (RF)
* **RF01 - Autenticación y Control de Accesos:** Inicio de sesión validado contra base de datos con verificación de hash SHA-256 y asignación dinámica de roles (RBAC).
* **RF02 - Gestión de Clientes:** Altas, bajas lógicas, modificaciones y búsquedas avanzadas por DNI, RUC o Nombres.
* **RF03 - Registro y Hoja de Vida de Vehículos:** Vinculación de vehículos a clientes, control de placa única nacional, número de chasis (VIN), kilometraje y marca/modelo.
* **RF04 - Gestión de Sedes Operativas:** Soporte multi-sede para empresas automotrices en expansión (Sede Ate, Sede San Isidro, Sede Callao).
* **RF05 - Catálogo de Servicios Técnicos:** Mantenimiento preventivo, correctivo, diagnóstico computarizado y alineación con tarifas estandarizadas.
* **RF06 - Apertura y Registro de Órdenes de Trabajo:** Generación de código correlativo único (ej. `OT-2026-0001`), motivo de falla y fecha/hora de ingreso.
* **RF07 - Peritaje y Diagnóstico Técnico:** Asignación de mecánico responsable y registro del informe pericial del estado mecánico/eléctrico.
* **RF08 - Liquidación de Materiales y Servicios:** Carga dinámica de ítems a la OT con cálculo automático de subtotales.
* **RF09 - Control de Estados de la OT:** Máquina de estados con transiciones auditadas (`REGISTRADO` ➔ `EN_DIAGNOSTICO` ➔ `EN_PROCESO` ➔ `FINALIZADO` ➔ `ENTREGADO`).
* **RF10 - Control de Inventario y Kardex de Repuestos:** Gestión de existencias con alerta visual automática cuando `stock_actual <= stock_minimo`.
* **RF11 - Validación de Stock Previa al Despacho:** Bloqueo transaccional que impide asignar repuestos que no cuenten con inventario físico disponible.
* **RF12 - Facturación Electrónica y Liquidación:** Emisión de Comprobantes de Pago (Boleta / Factura) desglosando Subtotal, IGV (18%) y Total.
* **RF13 - Arqueo Diario y Movimientos de Caja:** Apertura de caja con fondo fijo inicial (S/ 300.00), conciliación de pagos en efectivo/digitales (Yape/Plin/Tarjeta) y cálculo de diferencias en el cierre.
* **RF14 - Emisión de Reportes y Documentos PDF:** Renderizado e impresión de Órdenes de Trabajo y Comprobantes de Pago oficiales mediante Apache PDFBox.

### Requerimientos No Funcionales (RNF)
* **RNF01 - Seguridad Criptográfica:** Prohibición absoluta de almacenamiento de contraseñas en texto plano; uso mandatorio del algoritmo SHA-256.
* **RNF02 - Eficiencia y Tiempo de Respuesta:** Tiempos de respuesta menores a 500 ms en consultas locales y menores a 1.2 s en consultas remotas Cloud.
* **RNF03 - Integridad Transaccional (ACID):** Cumplimiento estricto de atomicidad, consistencia, aislamiento y durabilidad en operaciones críticas de facturación y descargo de inventario.
* **RNF04 - Usabilidad y Experiencia de Usuario:** Interfaz intuitiva y ergonómica adaptable a resoluciones HD/Full HD mediante FlatLaf y Tailwind CSS.
* **RNF05 - Portabilidad del Código:** Capacidad de ejecución multiplataforma en entornos Windows 10/11, Linux (Ubuntu/Debian) y macOS bajo JDK 17+.

---

## 📊 5. Modelo de Datos Relacional (3FN)

El sistema utiliza un esquema normalizado en PostgreSQL con 10 tablas principales y vistas optimizadas:

```
+---------------+       +------------------+       +-------------------+
|     SEDES     |       |      ROLES       |       |     CLIENTES      |
+---------------+       +------------------+       +-------------------+
| id_sede (PK)  |       | id_rol (PK)      |       | id_cliente (PK)   |
| nombre        |       | nombre           |       | num_documento (UQ)|
+-------+-------+       +--------+---------+       +---------+---------+
        |                        |                           |
        |       +----------------+                           |
        |       |                                            |
        v       v                                            v
+---------------+-------+                          +-------------------+
|       USUARIOS        |                          |     VEHICULOS     |
+-----------------------+                          +-------------------+
| id_usuario (PK)       |                          | id_vehiculo (PK)  |
| id_rol (FK)           |                          | id_cliente (FK)   |
| id_sede (FK)          |                          | placa (UQ)        |
| password_hash (SHA256)|                          +---------+---------+
+-----------+-----------+                                    |
            |                                                |
            +--------------------+    +----------------------+
                                 |    |
                                 v    v
                      +----------------------+
                      |   ORDENES_TRABAJO    |
                      +----------------------+
                      | id_orden (PK)        |
                      | codigo_orden (UQ)    |
                      | id_vehiculo (FK)     |
                      | id_cliente (FK)      |
                      | id_mecanico (FK)     |
                      | estado               |
                      +----------+-----------+
                                 |
        +------------------------+-------------------------+
        |                                                   |
        v                                                   v
+-----------------------+                         +-----------------------+
|    ORDEN_SERVICIOS    |                         |    ORDEN_REPUESTOS    |
+-----------------------+                         +-----------------------+
| id_orden_servicio (PK)|                         | id_orden_repuesto(PK) |
| id_orden (FK)         |                         | id_orden (FK)         |
| id_servicio (FK)      |                         | id_repuesto (FK)      |
| subtotal              |                         | subtotal              |
+-----------------------+                         +-----------------------+
        |                                                   |
        v                                                   v
+-----------------------+                         +-----------------------+
|   SERVICIOS_TALLER    |                         |       REPUESTOS       |
+-----------------------+                         +-----------------------+
| id_servicio (PK)      |                         | id_repuesto (PK)      |
| codigo_servicio (UQ)  |                         | id_categoria (FK)     |
| precio_estandar       |                         | codigo_sku (UQ)       |
+-----------------------+                         | stock_actual / minimo |
                                                  +-----------------------+
```

### Vistas Analíticas Integradas:
* `v_ordenes_resumen`: Provee una vista desnormalizada de órdenes con datos de clientes, vehículos, mecánicos y sedes para alimentar el Dashboard y la API.
* `v_alertas_inventario`: Filtra automáticamente los repuestos en condición crítica (`stock_actual <= stock_minimo`) para compras y reposición.

---

## 🔑 6. Credenciales de Acceso para Pruebas

Todas las cuentas se encuentran inicializadas en la base de datos con contraseña cifrada en SHA-256:

| Rol | Usuario | Contraseña | Permisos y Alcance Operativo |
|---|---|---|---|
| **Administrador** | `jloa-dev` | `123456` | Control total del sistema: Dashboard, usuarios, sedes, configuración, auditoría, anulación de comprobantes y reportes consolidados. |
| **Mecánico Especialista** | `cmendoza` | `123456` | Módulo técnico: Diagnóstico de fallas, asignación de repuestos y servicios, avance de estado de órdenes asignadas. |
| **Caja y Facturación** | `rflores` | `123456` | Módulo financiero: Liquidación de órdenes finalizadas, emisión de boletas/facturas, cobros multicanal y apertura/cierre de caja. |
| **Recepción y Atención** | `lgarcia` | `123456` | Módulo comercial: Registro de clientes nuevos, ingreso de vehículos a taller y apertura formal de nuevas órdenes de trabajo. |

---

## 🚀 7. Guía de Instalación y Puesta en Marcha

### Prerrequisitos del Sistema
* **Java:** JDK 17 LTS instalado y variable `JAVA_HOME` configurada.
* **Base de Datos:** PostgreSQL 15, 16 o 17 en ejecución en el puerto `5432`.
* **Python:** Python 3.10 o superior (con pip) para el microservicio web.
* **Herramienta de Construcción:** Apache Maven 3.9+ o NetBeans IDE 17+.

---

### Paso 1: Configurar la Base de Datos PostgreSQL
1. Abra su gestor preferido (**pgAdmin 4**, **DBeaver** o la terminal **psql**).
2. Ejecute el script maestro ubicado en la raíz del proyecto:
   ```bash
   psql -U postgres -d postgres -f mecapro_db_completo.sql
   ```
3. El script creará la estructura de base de datos, relaciones de llaves foráneas, índices, usuarios por defecto y datos iniciales de repuestos y servicios.

---

### Paso 2: Ejecutar la Aplicación de Escritorio (Java)

#### Opción A: Usando Apache Maven (Línea de Comandos)
```bash
# Compilar el proyecto completo
mvn clean compile

# Empaquetar el artefacto JAR
mvn package

# Ejecutar las pruebas unitarias y de integración
mvn test
```

#### Opción B: Usando Apache NetBeans IDE
1. Abra NetBeans IDE.
2. Seleccione **File -> Open Project...** y elija la carpeta:
   `04_CODIGO_FUENTE_JAVA/01_Sistema_Escritorio_Java`
3. Revise que las credenciales en `src/mecapro/configuracion/ConexionBD.java` coincidan con su servidor local de PostgreSQL.
4. Haga clic derecho sobre el proyecto y seleccione **Clean and Build**.
5. Presione **F6** (o el botón Run). La clase principal es `mecapro.MecaPro`.

---

### Paso 3: Ejecutar la Plataforma Web & Servidor API FastAPI
1. Abra una terminal en la carpeta `mecapro_web`:
   ```bash
   cd mecapro_web
   ```
2. Instale los paquetes requeridos:
   ```bash
   pip install fastapi uvicorn psycopg2-binary
   ```
3. Inicie el servidor API local:
   ```bash
   python server.py
   ```
4. Acceda desde su navegador web:
   * **Aplicación Web:** [http://localhost:8080](http://localhost:8080)
   * **Documentación Interactiva Swagger UI:** [http://localhost:8080/docs](http://localhost:8080/docs)
   * **Versión Cloud de Producción:** [https://mecapro.web.app](https://mecapro.web.app)

---

## 🧪 8. Auditoría y Pruebas del Sistema

El proyecto cuenta con una suite completa de pruebas automatizadas ubicadas en `src/mecapro/pruebas/`:

1. **`AuditoriaSistemaCompleto.java`:** Verifica de forma automatizada la consistencia referencial, la conectividad a PostgreSQL, la presencia de índices y la integridad de los datos maestros.
2. **`PruebaFlujoCompleto.java`:** Simula el ciclo de vida completo de una orden de trabajo:
   * Creación de cliente y registro de vehículo.
   * Apertura de orden de trabajo con código autogenerado.
   * Asignación de mecánico y repuestos con validación de stock.
   * Cambio de estado a `FINALIZADO`.
   * Emisión de boleta electrónica con desglose de IGV y actualización de caja.
3. **`PruebaInicializacionUI.java`:** Comprueba la carga correcta del tema FlatLaf y los componentes Swing en modo headless y gráfico.

---

## 📄 9. Licencia y Derechos de Uso
Este proyecto fue desarrollado con fines estrictamente académicos para el **Curso Integrador I: Sistemas y Software** de la **Universidad Tecnológica del Perú (UTP)**. Todos los derechos reservados © 2026 Grupo 3.
