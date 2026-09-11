# Conexión de solo lectura a Google Sheets

La aplicación lee el documento configurado en `src/services/sheetsConfig.ts`,
pestaña **Produccion**, `gid=1004315769`. Se comprobó lectura sin autenticación
con los permisos que el documento ya tenía; no se modificaron sus permisos.
No se crearon credenciales, API keys, cuentas de servicio ni operaciones de escritura.

## Uso

1. Ingresa producciones y actualiza la casilla Empacado directamente en el Sheet.
2. La aplicación vuelve a consultar cada 60 segundos mientras la pestaña está visible,
   al volver a la ventana y al presionar **Actualizar**.
3. El bloque superior muestra la hora de la última lectura, el número de producciones
   válidas y las observaciones por fila. Las actualizaciones pueden depender también
   del tiempo que Google tarde en reflejar los cambios en su exportación.
4. **Abrir Sheet** abre el documento original. La aplicación no guarda cambios en él.

## Columnas y validaciones

Los encabezados están en la fila 6 y se consultan las columnas A:L, sin límite de
filas. Si se mueve esa fila, actualizar `headerRow` en `sheetsConfig.ts`.
Se identifica cada campo por su encabezado, incluyendo la columna inicial vacía.
Los valores se reciben como CSV y se validan antes de actualizar la caché compartida.
Fechas: `dd/mm/aaaa`. Números: `1,234.56`. Casillas: `TRUE/FALSE`.

Las filas incompletas o inválidas se excluyen del cálculo y se listan como
observaciones, sin asignarles peso ficticio. IDs/No. duplicados no duplican peso.
Se conserva el Estado del Sheet y se verifica su concordancia con Empacado.
La merma y peso final se calculan con la regla del 10%; diferencias con fórmulas
del Sheet se notifican. Se respeta la Fecha Salida del Sheet, sin sustituirla por
la duración estimada de maduración del prototipo.

En la revisión en navegador se encontraron 121 producciones válidas y filas pendientes (el número cambia conforme se edita la hoja):
- Fila 128, ID 2624409-1: sin bultos válidos.
- Fila 129, ID 2624509-1: sin bultos ni peso inicial.
- Fila 130: sin ID y con fórmulas/fechas prellenadas.

El título del Sheet menciona 48,600 lb. La aplicación conserva **48,400 lb** por
contenedor y **193,600 lb** mensuales según la especificación de Gerencia.

## Errores y alcance

Ante un fallo de red o acceso, la interfaz conserva la última lectura correcta
con aviso de datos desactualizados. Si nunca hubo una lectura válida, muestra
el error sin presentar el escenario ficticio como información real.
Un archivo vacío con encabezados válidos presenta cero producciones y permite
ver sus metas; HTML de autenticación y esquemas incorrectos se rechazan.

La conexión es frontend y de solo lectura, usando el endpoint CSV de Google
Visualization y los permisos de lectura actuales del documento. Si estos se
restringen, se necesitará un acceso autenticado. Esta conexión no otorga permisos
adicionales y no oculta el identificador del documento a quienes usen la aplicación.
Referencia: https://developers.google.com/chart/interactive/docs/spreadsheets

## Desarrollo

- `npm run dev -- --host 127.0.0.1`: http://127.0.0.1:3000/
- `npm run build` y `npm run lint`.
- `node --test tests/production.test.mjs tests/sheets.test.mjs`: pruebas sin red.
- `node tests/browser-check.mjs`: prueba en Chrome/CDP puerto 9223 con datos reales.

El modo anterior se conserva para pruebas mediante `VITE_DATA_SOURCE=mock` al
iniciar Vite. No hay cambio automático a ese modo cuando Google falla.
El script `tests/browser-mock-check.mjs` corresponde exclusivamente a ese modo.
Los registros reales no se guardan como archivos dentro del repositorio.

## Validación realizada

13 pruebas automatizadas de cálculo/CSV/solo lectura pasaron. Chrome verificó
la lectura del documento real, la actualización manual, el modal de contenedores,
las rutas existentes y la vista tablet sin errores ni advertencias de consola.
La exportación original se contrastó con la lectura del navegador para confirmar
las filas pendientes. Septiembre 2026: 208,269.18 lb proyectadas en esta lectura.
