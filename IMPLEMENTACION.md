> Actualización: Google Sheets ya está conectado en modo de solo lectura. Ver [CONEXION_SHEETS.md](CONEXION_SHEETS.md). El contenido siguiente documenta la fase original del prototipo.

# DELACASA · frontend de producción

Se conserva React 19 + TypeScript, Vite, React Router, Tailwind, Radix/shadcn,
Recharts y Framer Motion. Se revisó el inventario completo de archivos fuente,
configuración, componentes, estilos y recursos; no se eliminaron archivos.

## Navegación

- `/`: dashboard ejecutivo, contenedores, proyección, avance anual, maduración y tabla.
- `/produccion`: registro existente, búsqueda, filtros, ordenación, paginación, CSV y empaque.
- `/maduracion`: resumen y lista de todos los IDs no empacados.
- `/contenedores`: asignación mensual y modal de composición.
- `/proyeccion`: vista existente de proyección con gráficas, tarjetas y detalle mensual.
- `/historico` y `/analisis`: análisis existente.
- `/configuracion`: parámetros de referencia de solo lectura.
- `/operacion`: dashboard operativo anterior, conservado y accesible desde el pie.

## Datos y reglas

`src/services/dataService.ts` mantiene el contrato asíncrono de lectura y escritura
local. La futura integración puede sustituir estas funciones sin llevar los datos
a los componentes. No existen conexiones, credenciales ni claves de Google Sheets.
Los cambios se mantienen en memoria y se restablecen al recargar. La fecha demo
es el 10 de septiembre de 2026. Las salidas demo abarcan agosto–diciembre de 2026.

- Peso final = peso inicial menos merma estimada del 10%, redondeado a centésimas.
- Capacidad: 48,400 lb. Meta mensual: 4 contenedores / 193,600 lb. Anual: 48.
- Fecha de salida determina el mes. Dentro del mes: fecha ascendente y No. como desempate.
- Reparto en centésimas enteras: un ID puede participar en varios contenedores.
- Cada mes es independiente: no hay traslado automático de excedentes entre meses.
- Los bultos equivalentes del contenedor se prorratean por peso; no implican división física.
- Maduración incluye todo `empacado=false` y ya forma parte del peso proyectado.
- El cumplimiento puede superar 100%; únicamente las barras se limitan visualmente a 100%.
- Peso inicial adicional = faltante proyectado / 0.90, redondeado hacia arriba a centésimas.
- Completos anuales = suma de completos mensuales; equivalentes anuales incluyen parciales.

## Ejecución y validación

`npm run dev -- --host 127.0.0.1` abre el servidor en http://127.0.0.1:3000/.
`npm run build` valida TypeScript y genera la aplicación.
`npm run lint` revisa los componentes y reglas de React.
`node --test tests/production.test.mjs` verifica merma, límites, reparto, conservación
por ID, escenarios mensuales, avance anual y altas/empaque.
`node tests/browser-check.mjs` usa Chrome de prueba con CDP en el puerto 9223
para verificar rutas, interacciones y consola; guarda capturas en `/private/tmp`.

## Archivos principales

- `src/pages/ExecutiveDashboard.tsx`: composición del dashboard y vistas nuevas.
- `src/components/ExecutivePanels.tsx`: KPI, modal, gráficas y paneles ejecutivos.
- `src/services/dataService.ts`: semilla, contrato y cálculos reutilizables.
- `src/pages/Produccion.tsx`: tabla preservada, filtro de empaque y asignación.
- `src/App.tsx`, `src/components/Layout.tsx`, `Navbar.tsx`, `Footer.tsx`: rutas y marca.
- `src/index.css`, `tailwind.config.js`: diseño claro y responsive.

## Resultado de la revisión

- Compilación TypeScript/Vite correcta.
- Seis pruebas de cálculo correctas, incluida conservación de peso de 200 lotes.
- Chrome: apertura de composición, cambio de mes, filtros de empaque, alta y marcado de empaque correctos.
- Rutas nuevas y vistas anteriores comprobadas; consola sin errores ni advertencias.
- Capturas revisadas en 1440 px y 820 px; también se comprobó ancho móvil de 390 px.
- Avisos no bloqueantes de build: paquete JavaScript mayor de 500 kB y base de Browserslist antigua.
