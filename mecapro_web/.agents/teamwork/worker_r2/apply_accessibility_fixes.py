import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update buttons: ensure type="button" where type is missing
def update_button(m):
    tag_content = m.group(1)
    if 'type=' in tag_content:
        return m.group(0)
    
    # Add type="button"
    return f'<button type="button"{tag_content}>'

content = re.sub(r'<button\b([^>]*)>', update_button, content)

# 2. Add aria-label to icon-only buttons
# Modal close buttons with lucide x
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-cliente["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-cobro["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-cambiar-estado["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-detalle-orden["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-repuesto["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-ajuste-stock["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-servicio["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-usuario["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-pdf-viewer["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar visor PDF"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']cerrarModal\(["\']modal-logout-confirm["\']\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar confirmación"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']closeLoginModal\(\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar ventana de autenticación"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']closeNewOrderModal\(\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Cerrar modal nueva orden"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)

# Header & sidebar buttons
content = re.sub(
    r'(<button\b[^>]*id=["\']btn-toggle-sidebar["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Ocultar o mostrar barra lateral"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']toggleOmnibox\(\)["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Buscar en el sistema"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)
content = re.sub(
    r'(<button\b[^>]*onclick=["\']toggleSidebar\(\)["\'][^>]*title=["\']Ocultar barra lateral["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Ocultar barra lateral"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)

# Refresh buttons
content = re.sub(
    r'(<button\b[^>]*title=["\']Refrescar["\'][^>]*)(>)',
    lambda m: m.group(1) + (' aria-label="Refrescar lista"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
    content
)

# 3. Fix input at line 1658 (Método de Pago)
old_metodo = '<label class="font-bold text-slate-500">Método de Pago</label>\n          <input type="text" value="EFECTIVO (Pago físico en caja)" readonly class="p-2 rounded-lg border border-slate-200 dark:border-[#2a3b56] bg-slate-100 dark:bg-[#101726] font-medium text-slate-600 dark:text-slate-400">'
new_metodo = '<label for="form-cobro-metodo" class="font-bold text-slate-500">Método de Pago</label>\n          <input type="text" id="form-cobro-metodo" value="EFECTIVO (Pago físico en caja)" readonly class="p-2 rounded-lg border border-slate-200 dark:border-[#2a3b56] bg-slate-100 dark:bg-[#101726] font-medium text-slate-600 dark:text-slate-400">'
content = content.replace(old_metodo, new_metodo)

# 4. Associate labels with inputs in forms
# Match: <label class="...">Some Text</label> followed within a few lines by <input/select/textarea id="...">
# Let's do a regex replacement for <label class="([^"]*)">([^<]+)</label>\s*(\n\s*<(?:input|select|textarea)\b[^>]*id="([^"]+)")
def label_replacer(m):
    label_classes = m.group(1)
    label_text = m.group(2)
    between = m.group(3)
    target_id = m.group(4)
    return f'<label for="{target_id}" class="{label_classes}">{label_text}</label>{between}'

content = re.sub(
    r'<label class="([^"]*)">([^<]+)</label>(\s*\n\s*<(?:input|select|textarea)\b[^>]*id="([^"]+)")',
    label_replacer,
    content
)

# 5. Add aria-labels to filters and search inputs without label
filter_arias = {
    'txt-buscar-cliente': 'Buscar cliente',
    'txt-buscar-vehiculo': 'Buscar vehículo',
    'txt-buscar-orden': 'Buscar orden de trabajo',
    'cmb-filtro-estado-orden': 'Filtrar por estado de orden',
    'txt-tracking-placa': 'Consultar placa para seguimiento',
    'txt-buscar-repuesto': 'Buscar repuesto en inventario',
    'txt-buscar-servicio': 'Buscar servicio',
    'txt-buscar-caja-pendiente': 'Buscar orden pendiente en caja',
    'txt-buscar-caja-emitido': 'Buscar comprobante emitido',
    'rep-filtro-desde': 'Fecha inicial de reporte',
    'rep-filtro-hasta': 'Fecha final de reporte',
    'rep-filtro-estado': 'Filtrar reporte por estado',
    'omnibox-input': 'Búsqueda rápida en el sistema'
}

for elem_id, aria_val in filter_arias.items():
    content = re.sub(
        r'(<(?:input|select)\b[^>]*id=["\']' + elem_id + r'["\'][^>]*)(>)',
        lambda m, av=aria_val: m.group(1) + (f' aria-label="{av}"' if 'aria-label=' not in m.group(1) else '') + m.group(2),
        content
    )

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Accessibility fixes applied successfully to public/index.html!")
