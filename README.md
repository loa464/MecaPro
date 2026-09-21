# MecaPro — Centro Automotriz y Servicios Mecánicos S.A.C.

Sistema integral de gestión de taller automotriz, control de órdenes de trabajo (OT), peritaje vehicular, inventario de repuestos, arqueo diario de caja y sincronización en tiempo real.

Desarrollado para el **Curso Integrador I — Sistemas y Software (UTP)**.

---

## 👥 Equipo de Desarrollo y Colaboradores

| Integrante | Rol en el Proyecto | Usuario GitHub | Correo Electrónico |
|---|---|---|---|
| **Jean Franck Loa Rojas** | **Tech Lead / Arquitecto de Software** | `loa464` | `loarojas3@gmail.com` |
| **Alex Apolinario** | Frontend & Maquetación UI | `alexsalvatierraA` | `jloa.dev2@gmail.com` |
| **Miguel Cóndor** | Estilos CSS, UX & Responsive | `migCondor` | `jloa.dev3@gmail.com` |
| **José Carlos Mina** | Lógica Core, Cálculos & Flujos | `Xjosecarlmina` | `jloa.dev4@gmail.com` |
| **Víctor Quiroz** | Datos, Catálogos, Caja & SQL | `victorquirozzz` | `jloa.dev5@gmail.com` |

---

## 🛠️ Stack Tecnológico

* **Frontend:** HTML5, Tailwind CSS, CSS3 Moderno, JavaScript ES6+ (SPA).
* **Criptografía:** Web Crypto API (SHA-256 para autenticación segura según RNF01).
* **Persistencia:** LocalStorage ACID + Supabase Client (PostgreSQL en tiempo real con WebSockets).
* **Backend:** Python 3.12 + FastAPI + Uvicorn + Psycopg2.
* **Base de Datos:** PostgreSQL 17 relacional en 3FN (`mecapro_db_completo.sql`).
* **Despliegue en Producción:** Firebase Hosting ([https://mecapro.web.app](https://mecapro.web.app)).

---

## 🚀 Despliegue y Ejecución Local

1. **Abrir la versión web en producción:**
   Acceder directamente a [https://mecapro.web.app](https://mecapro.web.app)

2. **Ejecutar servidor local:**
   ```bash
   cd mecapro_web
   python server.py
   # Disponible en http://localhost:8080
   ```
