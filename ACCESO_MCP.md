# Acceso MCP Configurado

## Servidores activos en `~/.config/opencode/opencode.jsonc`

### 1. Filesystem (`@modelcontextprotocol/server-filesystem`)
- **Ruta permitida**: `/home/trizzoth` (acceso completo al home)
- **Herramientas**: read_text_file, write_file, edit_file, list_directory, search_files, create_directory, move_file, get_file_info, list_allowed_directories, read_multiple_files, read_media_file

### 2. Playwright (`@playwright/mcp@latest`)
- **Navegador**: Chromium (motor de Brave) instalado en `~/.cache/ms-playwright`
- **Herramientas**: browser_navigate, browser_click, browser_type, browser_hover, browser_drag, browser_press_key, browser_select_option, browser_fill_form, browser_take_screenshot, browser_snapshot, browser_evaluate, browser_wait_for, browser_tabs, browser_network_requests, browser_console_messages, browser_handle_dialog, browser_file_upload, browser_drop, browser_find, browser_run_code_unsafe, browser_webmcp_list, browser_webmcp_call, browser_resize, browser_close, browser_navigate_back

## Capacidades totales
- ✅ Lectura/escritura completa del sistema de archivos en `/home/trizzoth`
- ✅ Automatización completa de navegador (Chromium/Brave)
- ✅ Testing E2E, screenshots, network inspection
- ✅ Ejecución de JavaScript arbitrario en páginas web
- ✅ Manejo de múltiples tabs, formularios, dialogs, uploads