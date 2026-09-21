import os
import re

BASE_DIR = r"c:\Users\Loa\Documents\Integrador\mecapro_web"

def update_index_html():
    path = os.path.join(BASE_DIR, "public", "index.html")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Renombrar llamadas a toggleOmnibox
    content = content.replace("toggleOmnibox()", "toggleBuscadorRapido()")

    # 2. Renombrar IDs del modal de busqueda rapida
    content = content.replace('id="omnibox-backdrop"', 'id="modal-busqueda-rapida"')
    content = content.replace('id="omnibox-input"', 'id="input-busqueda-rapida"')
    content = content.replace('handleOmniboxSearch(this.value)', 'buscarEnSistemaRapido(this.value)')
    content = content.replace('id="omnibox-results"', 'id="resultados-busqueda-rapida"')

    # 3. Renombrar clase omnibox-backdrop a modal-fondo
    content = content.replace('class="omnibox-backdrop hidden"', 'class="modal-fondo hidden"')
    content = content.replace('omnibox-backdrop', 'modal-fondo')

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("public/index.html updated successfully.")

def update_css():
    path = os.path.join(BASE_DIR, "public", "css", "styles.css")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Reemplazar todas las clases omnibox-backdrop por modal-fondo
    content = content.replace(".omnibox-backdrop", ".modal-fondo")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("public/css/styles.css updated successfully.")

def update_app_js():
    path = os.path.join(BASE_DIR, "public", "js", "app.js")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Reemplazar haptic feedback por reproducirSonido
    content = content.replace("playHapticFeedback", "reproducirSonido")

    # 2. Reemplazar omnibox funciones e IDs
    content = content.replace("toggleOmnibox()", "toggleBuscadorRapido()")
    content = content.replace("function toggleOmnibox()", "function toggleBuscadorRapido()")
    content = content.replace("handleOmniboxSearch(", "buscarEnSistemaRapido(")
    content = content.replace("function handleOmniboxSearch(", "function buscarEnSistemaRapido(")
    content = content.replace("'omnibox-backdrop'", "'modal-busqueda-rapida'")
    content = content.replace("'omnibox-input'", "'input-busqueda-rapida'")
    content = content.replace("'omnibox-results'", "'resultados-busqueda-rapida'")
    content = content.replace("'.omnibox-backdrop'", "'.modal-fondo'")

    # 3. Eliminar caracteres emojis restantes (✓)
    content = content.replace("✓ ", "")
    content = content.replace("✓", "")

    # 4. Ajustar comentarios a tono estudiantil natural
    content = content.replace("<!-- Tarjeta Principal del Vehículo con Placa Peruana -->", "<!-- Tarjeta del vehículo con placa -->")
    content = content.replace("<!-- Semáforo Interactivo de 5 Etapas en Tiempo Real -->", "<!-- Etapas del servicio en taller -->")
    content = content.replace("<!-- Detalle Técnico y Presupuesto Transparente -->", "<!-- Detalle técnico y presupuesto -->")
    content = content.replace("// Renderizar 5 subsistemas con estado neutro inicial", "// Renderizar subsistemas con estado inicial")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("public/js/app.js updated successfully.")

if __name__ == "__main__":
    update_index_html()
    update_css()
    update_app_js()
