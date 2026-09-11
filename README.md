# DELACASA · Control de producción

Dashboard de producción de queso y planificación de contenedores de exportación.
Adaptado sobre React, TypeScript, Vite, Tailwind CSS y React Router.

## Funcionalidades

- Indicadores de producción y cumplimiento mensual y anual.
- Contenedores con capacidad de 48,400 lb y detalle del peso asignado por ID.
- Proyección por fecha de salida y merma estimada del 10%.
- Registro con filtros, ordenamiento, paginación y exportación CSV.
- Seguimiento del producto no empacado.
- Lectura de Google Sheets; las modificaciones se realizan directamente en la hoja.

## Desarrollo local

Usa una versión de Node.js compatible con Vite 7 (por ejemplo, Node.js 24).

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

Abre http://127.0.0.1:3000/.

## Verificación

```bash
npm run build
npm run lint
node --test tests/production.test.mjs tests/sheets.test.mjs
```

`npm run build` genera la aplicación en `dist/`, que no se guarda en Git.
El archivo `package-lock.json` sí se versiona para reproducir las dependencias.

## Datos

La fuente y el intervalo de actualización están en `src/services/sheetsConfig.ts`.
La aplicación consulta la pestaña Produccion en modo de solo lectura y muestra
observaciones para registros incompletos. No incluye claves ni cuentas de servicio.

Consulta [CONEXION_SHEETS.md](CONEXION_SHEETS.md) para conocer la integración,
y [IMPLEMENTACION.md](IMPLEMENTACION.md) para la estructura y la fase inicial.

Para ejecutar el escenario de demostración, define `VITE_DATA_SOURCE=mock` al
iniciar Vite. La aplicación nunca cambia automáticamente a datos ficticios si
la lectura del Sheet falla.

## Publicación automática

GitHub Actions está configurado en `.github/workflows/pages.yml`.
Cada cambio subido a `main` ejecuta lint, pruebas y compilación antes de publicar.
También puede iniciarse desde Actions → Publicar DELACASA → Run workflow.
La primera publicación requiere activar Pages con fuente GitHub Actions en el repositorio.

```bash
npm run build:pages
npm run preview
```

En modo Pages, abre `/delacasa-produccion/` dentro del servidor de vista previa.
Las rutas utilizan `#/produccion`, `#/contenedores`, etc., para permitir recargas
y enlaces directos sin errores 404. El desarrollo local conserva sus rutas habituales.

URL prevista: https://myesner.github.io/delacasa-produccion/

La web de Pages será pública y mostrará los datos que lee del Sheet. La privacidad
del repositorio es independiente. GitHub Pages en repositorios privados requiere
un plan que lo admita; esta configuración no cambia la visibilidad del repositorio.
Los cambios hechos en Sheets se leen cada minuto, sin necesidad de recompilar la página.
