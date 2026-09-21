import os
import json
import urllib.request
from decimal import Decimal
from datetime import datetime, date
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="MecaPro S.A.C. Web API", version="1.0.0")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ID = os.environ.get("FIREBASE_PROJECT", "cuentas-951a9")
API_KEY = os.environ.get("FIREBASE_API_KEY", "AIzaSyAS6PUqQRVvwrYaaVvzOGBgxgUlyFLIbCI")

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", 5432)),
    "dbname": os.environ.get("DB_NAME", "mecapro_db"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", "postgres")
}

def get_db_connection():
    passwords_to_try = [DB_CONFIG["password"], "postgres", "admin", "root", "123456", "1234"]
    for pwd in passwords_to_try:
        try:
            conn = psycopg2.connect(
                host=DB_CONFIG["host"],
                port=DB_CONFIG["port"],
                dbname=DB_CONFIG["dbname"],
                user=DB_CONFIG["user"],
                password=pwd,
                connect_timeout=2
            )
            return conn
        except Exception:
            continue
    raise HTTPException(status_code=503, detail="Servicio PostgreSQL no disponible o fuera de línea.")

def serialize_row(row):
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, Decimal):
            d[k] = float(v)
        elif isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
    return d

def to_firestore_val(v):
    if isinstance(v, bool):
        return {"booleanValue": v}
    elif isinstance(v, (int, float)):
        return {"doubleValue": float(v)}
    elif isinstance(v, str):
        return {"stringValue": v}
    elif isinstance(v, list):
        return {"arrayValue": {"values": [to_firestore_val(x) for x in v]}}
    elif isinstance(v, dict):
        return {"mapValue": {"fields": {k: to_firestore_val(val) for k, val in v.items()}}}
    return {"nullValue": None}

def sync_firestore_doc(collection_name: str, doc_id: str, data_dict: dict):
    try:
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/{collection_name}/{doc_id}?key={API_KEY}"
        fields = {k: to_firestore_val(v) for k, v in data_dict.items() if v is not None}
        body = json.dumps({"fields": fields}).encode("utf-8")
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="PATCH")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"[WARN] Error sincronizando {collection_name}/{doc_id} a Firestore: {e}")
        return False

@app.get("/api/health")
def health():
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "ONLINE", "database": "mecapro_db", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return {"status": "DEGRADED", "error": str(e), "timestamp": datetime.now().isoformat()}

@app.get("/api/auth/users")
def get_auth_users():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT u.id_usuario, u.username, u.nombres, u.apellidos, u.correo, u.telefono, u.activo, r.id_rol, r.nombre as rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.activo = TRUE
            ORDER BY u.id_usuario
        """)
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.post("/api/auth/login")
def auth_login(payload: dict):
    username = payload.get("username", "").strip()
    password = payload.get("password", "").strip()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT u.id_usuario, u.username, u.password, u.nombres, u.apellidos, u.correo, u.telefono, u.activo, r.id_rol, r.nombre as rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.username = %s AND u.activo = TRUE
        """, (username,))
        user = cur.fetchone()
        if not user or user["password"] != password:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
        
        user_data = serialize_row(user)
        del user_data["password"]
        return {"success": True, "user": user_data}
    finally:
        cur.close()
        conn.close()

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT COUNT(*) as total FROM ordenes_trabajo WHERE estado NOT IN ('ENTREGADO', 'CANCELADO')")
        activas = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) as total FROM ordenes_trabajo WHERE estado = 'LISTO'")
        listas = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) as total FROM repuestos WHERE stock_actual <= stock_minimo AND activo = TRUE")
        alertas_stock = cur.fetchone()["total"]

        cur.execute("SELECT COALESCE(SUM(total), 0) as total FROM comprobantes_pago WHERE estado = 'EMITIDO'")
        facturacion = float(cur.fetchone()["total"])

        return {
            "ordenes_activas": activas,
            "listas_entrega": listas,
            "alertas_stock": alertas_stock,
            "facturacion_total": facturacion
        }
    finally:
        cur.close()
        conn.close()

@app.get("/api/ordenes")
def get_ordenes(estado: str = None, buscar: str = None):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = "SELECT * FROM v_ordenes_resumen WHERE 1=1"
        params = []
        if estado and estado != "TODAS":
            query += " AND estado = %s"
            params.append(estado)
        if buscar:
            query += " AND (codigo_orden ILIKE %s OR placa ILIKE %s OR cliente_nombre ILIKE %s OR mecanico_nombre ILIKE %s)"
            pattern = f"%{buscar}%"
            params.extend([pattern, pattern, pattern, pattern])
        query += " ORDER BY fecha_ingreso DESC"
        cur.execute(query, params)
        rows = [serialize_row(r) for r in cur.fetchall()]
        return rows
    finally:
        cur.close()
        conn.close()

@app.get("/api/ordenes/{id_orden}")
def get_orden_detalle(id_orden: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM v_ordenes_resumen WHERE id_orden = %s", (id_orden,))
        orden = cur.fetchone()
        if not orden:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        cur.execute("""
            SELECT os.*, s.nombre AS servicio_nombre, s.codigo AS servicio_codigo
            FROM orden_servicios os
            JOIN servicios s ON os.id_servicio = s.id_servicio
            WHERE os.id_orden = %s
        """, (id_orden,))
        servicios = [serialize_row(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT o_r.*, r.nombre AS repuesto_nombre, r.codigo AS repuesto_codigo, r.marca AS repuesto_marca
            FROM orden_repuestos o_r
            JOIN repuestos r ON o_r.id_repuesto = r.id_repuesto
            WHERE o_r.id_orden = %s
        """, (id_orden,))
        repuestos = [serialize_row(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT h.*, u.username
            FROM historial_estados h
            LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
            WHERE h.id_orden = %s ORDER BY h.fecha_cambio ASC
        """, (id_orden,))
        historial = [serialize_row(r) for r in cur.fetchall()]

        data = serialize_row(orden)
        data["servicios"] = servicios
        data["repuestos"] = repuestos
        data["historial"] = historial
        return data
    finally:
        cur.close()
        conn.close()

@app.post("/api/ordenes/cambiar-estado")
def cambiar_estado_orden(data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        id_orden = data.get("id_orden")
        nuevo_estado = data.get("nuevo_estado")
        id_usuario = data.get("id_usuario", 1)
        comentario = data.get("comentario", f"Cambio de estado a {nuevo_estado}")

        cur.execute("SELECT estado, codigo_orden FROM ordenes_trabajo WHERE id_orden = %s", (id_orden,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        estado_ant = row["estado"]
        codigo = row["codigo_orden"]

        cur.execute("""
            UPDATE ordenes_trabajo 
            SET estado = %s, fecha_actualizacion = CURRENT_TIMESTAMP 
            WHERE id_orden = %s
        """, (nuevo_estado, id_orden))

        cur.execute("""
            INSERT INTO historial_estados (id_orden, estado_anterior, estado_nuevo, id_usuario, comentario)
            VALUES (%s, %s, %s, %s, %s)
        """, (id_orden, estado_ant, nuevo_estado, id_usuario, comentario))

        conn.commit()
        sync_firestore_doc("mecapro_ordenes", codigo, {"estado": nuevo_estado})
        return {"success": True, "estado": nuevo_estado}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/ordenes")
def create_orden(data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT COUNT(*) as cnt FROM ordenes_trabajo")
        cnt = cur.fetchone()["cnt"] + 1
        code = data.get("codigo_orden") or f"OT-2024-{cnt:04d}"

        placa = (data.get("placa") or "ABC-123").upper().strip()
        cur.execute("SELECT id_vehiculo, id_cliente FROM vehiculos WHERE placa = %s", (placa,))
        v_row = cur.fetchone()
        if v_row:
            id_vehiculo = v_row["id_vehiculo"]
            id_cliente = v_row["id_cliente"]
        else:
            num_doc = data.get("num_documento", "00000000")
            tipo_doc = "RUC" if len(num_doc) == 11 else "DNI"
            cur.execute("""
                INSERT INTO clientes (tipo_documento, tipo_cliente, num_documento, nombre_razon_social, telefono) 
                VALUES (%s, 'PERSONA', %s, %s, %s) RETURNING id_cliente
            """, (tipo_doc, num_doc, data.get("cliente_nombre", "Cliente General"), data.get("cliente_telefono", "987654321")))
            id_cliente = cur.fetchone()["id_cliente"]

            cur.execute("""
                INSERT INTO vehiculos (id_cliente, placa, marca, modelo, anio) 
                VALUES (%s, %s, %s, %s, %s) RETURNING id_vehiculo
            """, (id_cliente, placa, data.get("marca", "Toyota"), data.get("modelo", data.get("vehiculo", "Hilux")), 2022))
            id_vehiculo = cur.fetchone()["id_vehiculo"]

        total_gen = float(data.get("total_general", 850.0))
        cur.execute("""
            INSERT INTO ordenes_trabajo (codigo_orden, id_vehiculo, id_cliente, id_mecanico, id_usuario_creador, motivo_ingreso, kilometraje_ingreso, estado, total_general)
            VALUES (%s, %s, %s, 3, 1, %s, %s, 'EN_PROCESO', %s) RETURNING id_orden
        """, (code, id_vehiculo, id_cliente, data.get("motivo_ingreso", "Servicio preventivo"), data.get("kilometraje_ingreso", 45000), total_gen))
        new_id = cur.fetchone()["id_orden"]

        conn.commit()

        order_res = {
            "id_orden": new_id,
            "codigo_orden": code,
            "placa": placa,
            "cliente_nombre": data.get("cliente_nombre", "Cliente General"),
            "vehiculo": data.get("vehiculo", "Toyota Hilux"),
            "estado": "EN_PROCESO",
            "total_general": total_gen
        }
        sync_firestore_doc("mecapro_ordenes", code, order_res)
        return {"success": True, "orden": order_res}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/repuestos/alertas")
def get_alertas_inventario():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM v_alertas_inventario")
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.get("/api/repuestos")
def get_repuestos(id_categoria: int = None, buscar: str = None):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = """
            SELECT r.*, c.nombre AS categoria_nombre 
            FROM repuestos r
            LEFT JOIN categorias_repuesto c ON r.id_categoria = c.id_categoria
            WHERE r.activo = TRUE
        """
        params = []
        if id_categoria:
            query += " AND r.id_categoria = %s"
            params.append(id_categoria)
        if buscar:
            query += " AND (r.codigo ILIKE %s OR r.nombre ILIKE %s OR r.marca ILIKE %s)"
            p = f"%{buscar}%"
            params.extend([p, p, p])
        query += " ORDER BY r.id_repuesto ASC"
        cur.execute(query, params)
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.post("/api/repuestos")
def create_repuesto(r: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            INSERT INTO repuestos (id_categoria, codigo, nombre, marca, precio_compra, precio_venta, stock_actual, stock_minimo, ubicacion, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id_repuesto
        """, (
            r.get("id_categoria"), r.get("codigo"), r.get("nombre"), r.get("marca"),
            r.get("precio_compra"), r.get("precio_venta"), r.get("stock_actual"),
            r.get("stock_minimo"), r.get("ubicacion")
        ))
        new_id = cur.fetchone()["id_repuesto"]
        conn.commit()
        return {"success": True, "id_repuesto": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/sedes")
def get_sedes():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        try:
            cur.execute("SELECT * FROM sedes WHERE activo = TRUE ORDER BY id_sede ASC")
            return [serialize_row(r) for r in cur.fetchall()]
        except Exception:
            # Fallback en memoria si la tabla no existe en la BD
            return [
                {"id_sede": 1, "nombre": "Sede Ate (Principal)", "direccion": "Av. Separadora Industrial 1420", "telefono": "01-512-4000", "activo": True},
                {"id_sede": 2, "nombre": "Sede San Isidro", "direccion": "Av. República de Panamá 3505", "telefono": "01-512-4001", "activo": True},
                {"id_sede": 3, "nombre": "Sede Callao", "direccion": "Av. Faucett 2100", "telefono": "01-512-4002", "activo": True}
            ]
        finally:
            cur.close()
            conn.close()
    except HTTPException:
        return [
            {"id_sede": 1, "nombre": "Sede Ate (Principal)", "direccion": "Av. Separadora Industrial 1420", "telefono": "01-512-4000", "activo": True},
            {"id_sede": 2, "nombre": "Sede San Isidro", "direccion": "Av. República de Panamá 3505", "telefono": "01-512-4001", "activo": True},
            {"id_sede": 3, "nombre": "Sede Callao", "direccion": "Av. Faucett 2100", "telefono": "01-512-4002", "activo": True}
        ]
    except HTTPException:
        return [
            {"id_sede": 1, "nombre": "Sede Ate (Principal)", "direccion": "Av. Separadora Industrial 1420", "telefono": "01-512-4000", "activo": True},
            {"id_sede": 2, "nombre": "Sede San Isidro", "direccion": "Av. República de Panamá 3505", "telefono": "01-512-4001", "activo": True},
            {"id_sede": 3, "nombre": "Sede Callao", "direccion": "Av. Faucett 2100", "telefono": "01-512-4002", "activo": True}
        ]

@app.get("/api/categorias")
def get_categorias():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM categorias_repuesto ORDER BY id_categoria ASC")
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.get("/api/mecanicos")
def get_mecanicos():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM mecanicos WHERE activo = TRUE ORDER BY id_mecanico ASC")
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.get("/api/clientes")
def get_clientes(buscar: str = None):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = "SELECT * FROM clientes WHERE activo = TRUE"
        params = []
        if buscar:
            query += " AND (num_documento ILIKE %s OR nombre_razon_social ILIKE %s OR telefono ILIKE %s)"
            p = f"%{buscar}%"
            params.extend([p, p, p])
        query += " ORDER BY id_cliente ASC"
        cur.execute(query, params)
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.post("/api/clientes")
def create_cliente(data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            INSERT INTO clientes (tipo_documento, num_documento, nombre_razon_social, telefono, correo, direccion, tipo_cliente, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id_cliente
        """, (
            data.get("tipo_documento", "DNI"),
            data.get("num_documento", ""),
            data.get("nombre_razon_social", ""),
            data.get("telefono", ""),
            data.get("correo", ""),
            data.get("direccion", ""),
            "RUC" if len(str(data.get("num_documento", ""))) == 11 else "PARTICULAR"
        ))
        new_id = cur.fetchone()["id_cliente"]
        conn.commit()
        return {"success": True, "id_cliente": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.put("/api/clientes/{id_cliente}")
def update_cliente(id_cliente: int, data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            UPDATE clientes
            SET tipo_documento = %s, num_documento = %s, nombre_razon_social = %s, telefono = %s, correo = %s, direccion = %s
            WHERE id_cliente = %s
        """, (
            data.get("tipo_documento", "DNI"),
            data.get("num_documento", ""),
            data.get("nombre_razon_social", ""),
            data.get("telefono", ""),
            data.get("correo", ""),
            data.get("direccion", ""),
            id_cliente
        ))
        conn.commit()
        return {"success": True, "id_cliente": id_cliente}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/vehiculos")
def get_vehiculos(buscar: str = None):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = """
            SELECT v.*, c.nombre_razon_social AS propietario, c.num_documento AS propietario_doc
            FROM vehiculos v
            JOIN clientes c ON v.id_cliente = c.id_cliente
            WHERE v.activo = TRUE
        """
        params = []
        if buscar:
            query += " AND (v.placa ILIKE %s OR v.marca ILIKE %s OR v.modelo ILIKE %s OR c.nombre_razon_social ILIKE %s)"
            p = f"%{buscar}%"
            params.extend([p, p, p, p])
        query += " ORDER BY v.id_vehiculo ASC"
        cur.execute(query, params)
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.post("/api/vehiculos")
def create_vehiculo(data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            INSERT INTO vehiculos (id_cliente, placa, marca, modelo, anio, color, num_vin, num_motor, kilometraje_actual, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id_vehiculo
        """, (
            data.get("id_cliente"),
            data.get("placa", "").upper().strip(),
            data.get("marca", ""),
            data.get("modelo", ""),
            int(data.get("anio", 2022)),
            data.get("color", ""),
            data.get("num_vin", ""),
            data.get("num_motor", ""),
            int(data.get("kilometraje_actual", 0))
        ))
        new_id = cur.fetchone()["id_vehiculo"]
        conn.commit()
        return {"success": True, "id_vehiculo": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.put("/api/vehiculos/{id_vehiculo}")
def update_vehiculo(id_vehiculo: int, data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            UPDATE vehiculos
            SET id_cliente = %s, placa = %s, marca = %s, modelo = %s, anio = %s, color = %s, num_vin = %s, num_motor = %s, kilometraje_actual = %s
            WHERE id_vehiculo = %s
        """, (
            data.get("id_cliente"),
            data.get("placa", "").upper().strip(),
            data.get("marca", ""),
            data.get("modelo", ""),
            int(data.get("anio", 2022)),
            data.get("color", ""),
            data.get("num_vin", ""),
            data.get("num_motor", ""),
            int(data.get("kilometraje_actual", 0)),
            id_vehiculo
        ))
        conn.commit()
        return {"success": True, "id_vehiculo": id_vehiculo}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/servicios")
def get_servicios():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT s.*, t.nombre AS tipo_nombre
            FROM servicios s
            LEFT JOIN tipos_servicio t ON s.id_tipo_servicio = t.id_tipo_servicio
            WHERE s.activo = TRUE ORDER BY s.id_servicio ASC
        """)
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.post("/api/servicios")
def create_servicio(data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            INSERT INTO servicios (id_tipo_servicio, codigo, nombre, descripcion, precio_base, tiempo_estimado_min, activo)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE) RETURNING id_servicio
        """, (
            int(data.get("id_tipo_servicio", 1)),
            data.get("codigo", ""),
            data.get("nombre", ""),
            data.get("descripcion", ""),
            float(data.get("precio_base", 50.0)),
            int(data.get("tiempo_estimado_min", 45))
        ))
        new_id = cur.fetchone()["id_servicio"]
        conn.commit()
        return {"success": True, "id_servicio": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/repuestos/{id_repuesto}/stock")
def update_repuesto_stock(id_repuesto: int, data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            UPDATE repuestos
            SET stock_actual = %s
            WHERE id_repuesto = %s
        """, (int(data.get("stock_actual", 0)), id_repuesto))
        conn.commit()
        return {"success": True, "id_repuesto": id_repuesto}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/usuarios")
def get_usuarios():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT u.id_usuario, u.username, u.nombres, u.apellidos, u.correo, u.telefono, u.activo, r.id_rol, r.nombre as rol
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            ORDER BY u.id_usuario ASC
        """)
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.post("/api/usuarios")
def create_usuario(data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        rol_nombre = data.get("rol", "MECANICO").upper()
        cur.execute("SELECT id_rol FROM roles WHERE nombre = %s", (rol_nombre,))
        r_row = cur.fetchone()
        id_rol = r_row["id_rol"] if r_row else 3

        cur.execute("""
            INSERT INTO usuarios (id_rol, username, password, nombres, apellidos, correo, telefono, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE) RETURNING id_usuario
        """, (
            id_rol,
            data.get("username", "").strip(),
            data.get("password", "123456").strip(),
            data.get("nombres", "").strip(),
            data.get("apellidos", "").strip(),
            data.get("correo", "").strip(),
            data.get("telefono", "").strip()
        ))
        new_id = cur.fetchone()["id_usuario"]
        conn.commit()
        return {"success": True, "id_usuario": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.put("/api/usuarios/{id_usuario}/estado")
def toggle_usuario_estado(id_usuario: int, data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        activo = bool(data.get("activo", True))
        cur.execute("UPDATE usuarios SET activo = %s WHERE id_usuario = %s", (activo, id_usuario))
        conn.commit()
        return {"success": True, "id_usuario": id_usuario, "activo": activo}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/caja/comprobantes")
def get_comprobantes():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT cp.*, ot.codigo_orden, c.nombre_razon_social AS cliente_nombre, c.num_documento AS cliente_doc, v.placa
            FROM comprobantes_pago cp
            JOIN ordenes_trabajo ot ON cp.id_orden = ot.id_orden
            JOIN clientes c ON ot.id_cliente = c.id_cliente
            JOIN vehiculos v ON ot.id_vehiculo = v.id_vehiculo
            ORDER BY cp.fecha_emision DESC
        """)
        return [serialize_row(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@app.post("/api/caja/emitir")
def emitir_comprobante(data: dict):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        id_orden = data.get("id_orden")
        tipo = data.get("tipo_comprobante", "BOLETA")
        metodo = data.get("metodo_pago", "EFECTIVO")
        ref = data.get("referencia_pago", "Pago en mostrador")

        cur.execute("SELECT total_general FROM ordenes_trabajo WHERE id_orden = %s", (id_orden,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        total = float(row["total_general"])
        subtotal = round(total / 1.18, 2)
        igv = round(total - subtotal, 2)

        cur.execute("SELECT COUNT(*) as count FROM comprobantes_pago WHERE tipo_comprobante = %s", (tipo,))
        num_count = cur.fetchone()["count"] + 1
        serie = "B001" if tipo == "BOLETA" else ("F001" if tipo == "FACTURA" else "T001")
        numero = f"{num_count:08d}"

        cur.execute("""
            INSERT INTO comprobantes_pago (id_orden, tipo_comprobante, serie, numero, subtotal, igv, total, metodo_pago, referencia_pago, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'EMITIDO') RETURNING id_comprobante
        """, (id_orden, tipo, serie, numero, subtotal, igv, total, metodo, ref))
        new_id = cur.fetchone()["id_comprobante"]

        cur.execute("UPDATE ordenes_trabajo SET pagado = TRUE WHERE id_orden = %s", (id_orden,))
        conn.commit()

        serie_num = f"{serie}-{numero}"
        sync_firestore_doc("mecapro_comprobantes", serie_num, {
            "id_comprobante": new_id,
            "serie_numero": serie_num,
            "tipo_comprobante": tipo,
            "total": total,
            "subtotal": subtotal,
            "igv": igv,
            "metodo_pago": metodo,
            "estado": "EMITIDO"
        })

        return {
            "success": True,
            "id_comprobante": new_id,
            "serie_numero": serie_num,
            "total": total,
            "subtotal": subtotal,
            "igv": igv
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/api/reportes/costeo")
def get_costeo_taller():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT 
                COUNT(*) as total_comprobantes,
                COALESCE(SUM(subtotal), 0) as subtotal_facturado,
                COALESCE(SUM(igv), 0) as igv_recaudado,
                COALESCE(SUM(total), 0) as total_facturado
            FROM comprobantes_pago WHERE estado = 'EMITIDO'
        """)
        caja_tot = cur.fetchone()

        cur.execute("""
            SELECT 
                COUNT(*) as total_ordenes,
                COALESCE(SUM(total_mano_obra), 0) as total_mano_obra,
                COALESCE(SUM(total_repuestos), 0) as total_repuestos,
                COALESCE(SUM(total_general), 0) as total_valorizado
            FROM ordenes_trabajo
            WHERE estado NOT IN ('CANCELADO')
        """)
        ot_tot = cur.fetchone()

        cur.execute("""
            SELECT 
                COUNT(*) as total_skus,
                COALESCE(SUM(stock_actual * precio_compra), 0) as valor_costo_inventario,
                COALESCE(SUM(stock_actual * precio_venta), 0) as valor_venta_inventario
            FROM repuestos WHERE activo = TRUE
        """)
        inv_tot = cur.fetchone()

        costo_inv = float(inv_tot["valor_costo_inventario"])
        venta_inv = float(inv_tot["valor_venta_inventario"])
        margen_bruto_pct = round(((venta_inv - costo_inv) / venta_inv * 100), 2) if venta_inv > 0 else 0.0

        return {
            "moneda": "PEN",
            "simbolo": "S/.",
            "facturacion": {
                "comprobantes_emitidos": caja_tot["total_comprobantes"],
                "subtotal_neto": float(caja_tot["subtotal_facturado"]),
                "igv_18_pct": float(caja_tot["igv_recaudado"]),
                "total_facturado": float(caja_tot["total_facturado"])
            },
            "costeo_operativo_ordenes": {
                "total_ordenes_procesadas": ot_tot["total_ordenes"],
                "costo_mano_obra_facturado": float(ot_tot["total_mano_obra"]),
                "costo_repuestos_facturado": float(ot_tot["total_repuestos"]),
                "total_valorizado": float(ot_tot["total_valorizado"]),
                "ticket_promedio_orden": round(float(ot_tot["total_valorizado"]) / max(1, ot_tot["total_ordenes"]), 2)
            },
            "inventario_y_margenes": {
                "skus_activos": inv_tot["total_skus"],
                "valor_costo_inventario": costo_inv,
                "valor_venta_inventario": venta_inv,
                "margen_bruto_repuestos_pct": margen_bruto_pct,
                "ganancia_potencial_inventario": round(venta_inv - costo_inv, 2)
            },
            "parametros_taller": {
                "tarifa_hora_hombre": 65.00,
                "tasa_igv": 0.18,
                "bahias_operativas": 10
            },
            "costo_infraestructura": {
                "hosting": "Firebase Hosting (Spark Tier - S/. 0.00 / mes)",
                "database_cloud": "Firebase Cloud Firestore (S/. 0.00)",
                "database_local": "PostgreSQL 16 Local (S/. 0.00)"
            }
        }
    finally:
        cur.close()
        conn.close()

# Configuración de rutas estáticas y enrutamiento web
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
WEB_DIR = PUBLIC_DIR if os.path.exists(PUBLIC_DIR) else BASE_DIR

ASSETS_DIR = os.path.join(WEB_DIR, "assets") if os.path.exists(os.path.join(WEB_DIR, "assets")) else os.path.join(BASE_DIR, "assets")
CSS_DIR = os.path.join(WEB_DIR, "css") if os.path.exists(os.path.join(WEB_DIR, "css")) else os.path.join(BASE_DIR, "css")
JS_DIR = os.path.join(WEB_DIR, "js") if os.path.exists(os.path.join(WEB_DIR, "js")) else os.path.join(BASE_DIR, "js")

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
if os.path.exists(CSS_DIR):
    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
if os.path.exists(JS_DIR):
    app.mount("/js", StaticFiles(directory=JS_DIR), name="js")

@app.get("/")
@app.get("/index.html")
def serve_index():
    for candidate in [os.path.join(WEB_DIR, "index.html"), os.path.join(BASE_DIR, "index.html")]:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="text/html")
    raise HTTPException(status_code=404, detail="index.html no encontrado")

@app.get("/styles.css")
def serve_styles():
    for candidate in [
        os.path.join(WEB_DIR, "css", "styles.css"),
        os.path.join(BASE_DIR, "css", "styles.css"),
        os.path.join(BASE_DIR, "styles.css")
    ]:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="text/css")
    raise HTTPException(status_code=404, detail="styles.css no encontrado")

@app.get("/LOGO.jpg")
@app.get("/logo.jpg")
def serve_logo():
    for candidate in [
        os.path.join(WEB_DIR, "LOGO.jpg"),
        os.path.join(BASE_DIR, "LOGO.jpg"),
        os.path.join(ASSETS_DIR, "logo.jpg")
    ]:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Logo no encontrado")

@app.get("/favicon.ico")
def serve_favicon():
    for candidate in [
        os.path.join(WEB_DIR, "favicon.ico"),
        os.path.join(BASE_DIR, "favicon.ico"),
        os.path.join(ASSETS_DIR, "logo_badge.png")
    ]:
        if os.path.exists(candidate):
            media_type = "image/x-icon" if candidate.endswith(".ico") else "image/png"
            return FileResponse(candidate, media_type=media_type)
    raise HTTPException(status_code=404, detail="Favicon no encontrado")

@app.get("/preview_comparativa.html")
def serve_preview():
    for candidate in [
        os.path.join(WEB_DIR, "preview_comparativa.html"),
        os.path.join(BASE_DIR, "preview_comparativa.html"),
        os.path.join(WEB_DIR, "index.html"),
        os.path.join(BASE_DIR, "index.html")
    ]:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")


if __name__ == "__main__":
    import uvicorn
    print("Iniciando MecaPro Web Server en http://localhost:8080 ...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
