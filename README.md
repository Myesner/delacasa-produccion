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

## Publicación posterior

La publicación del sitio se configurará por separado. Si se utiliza GitHub Pages,
habrá que ajustar la ruta base, los recursos y el manejo de rutas de React Router
al nombre del repositorio antes de desplegar.
