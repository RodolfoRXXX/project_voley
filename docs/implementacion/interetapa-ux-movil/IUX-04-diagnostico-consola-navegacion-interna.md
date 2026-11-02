# IUX-04 — Diagnóstico separado de consola en navegación interna

## Estado

**DIAGNÓSTICO PRELIMINAR — SIN CAUSA ATRIBUIDA A LA APLICACIÓN**

Este documento no forma parte del alcance visual implementable de IUX-04. No autoriza ocultar
excepciones, agregar `try/catch` global, modificar formularios ni incorporar instrumentación.

## 1. Síntoma informado

Al navegar internamente hacia “Crear ficha personal” y “Crear temporada” aparece en consola:

```text
Cannot read properties of undefined (reading 'startTime')
```

El stack visible contiene `<anonymous>` y `reportAllChanges`. Los formularios siguen funcionando y
el mensaje deja de aparecer al recargar la misma URL.

## 2. Evidencia del repositorio

- No existe referencia de aplicación a `reportAllChanges`, `useReportWebVitals`,
  `reportWebVitals`, `getPerformance`, `firebase/performance` ni `@firebase/performance`.
- `src/lib/firebase.ts` inicializa App, Auth, Firestore y Functions; no inicializa Firebase
  Performance.
- El layout raíz no monta scripts de Analytics, Speed Insights o Web Vitals.
- `web-vitals@4.2.4` está instalado sólo de forma transitiva por
  `firebase -> @firebase/performance`; que exista en `node_modules` no demuestra que el bundle de la
  aplicación lo ejecute.
- Las dos rutas afectadas no comparten un lector de performance: Ficha personal usa
  `usePerson`/`PersonBootstrapForm`; Crear temporada usa `GroupFrame`/`OpenSeasonForm`.
- La búsqueda de `startTime` en código propio sólo encuentra fixtures/gates de medición E3-08, no
  las rutas productivas afectadas.
- El texto `reportAllChanges` sí pertenece a la API/opción de bibliotecas Web Vitals presentes en
  dependencias, pero no hay import ni inicialización desde el código de SPORTEXA.

Esta evidencia hace **más probable** un script inyectado por extensión, DevTools o tooling de
medición que una excepción emitida por los formularios. No es una conclusión definitiva: el origen
debe confirmarse con la URL del frame/script en el stack y una reproducción sin extensiones.

## 3. Diferencia navegación interna / recarga

La reproducción informada es compatible con un observador de métricas que intenta tratar una
transición SPA como si tuviera una nueva `PerformanceNavigationTiming`. En navegación interna de
Next.js no ocurre una navegación completa del documento; al recargar sí existe una entrada de
navegación nueva. Esta es una hipótesis de diagnóstico, no una causa demostrada.

Los formularios renderizan y operan, y la recarga elimina el mensaje. No se observó evidencia de
datos perdidos, request fallido, boundary de React ni stack con archivo fuente de SPORTEXA.

## 4. Verificación pendiente en navegador

No fue posible ejecutar una comparación confiable con extensiones deshabilitadas desde esta
intervención documental: no se dispone de una sesión de navegador autenticada controlable ni debe
reutilizarse el perfil personal en ejecución. La verificación futura debe hacerse así:

1. abrir DevTools con “Preserve log” y sourcemaps activos;
2. registrar URL completa, esquema y origen de cada frame del stack (`chrome-extension://`,
   `devtools://`, bundle `/_next/` u otro);
3. navegar internamente por separado a `/profile/person` y
   `/dashboard/groups/{groupId}/seasons/new`;
4. repetir por recarga directa;
5. repetir en Guest/incógnito con extensiones deshabilitadas;
6. si desaparece, habilitar extensiones de medición una por una hasta identificar el productor;
7. si persiste sin extensiones, capturar el chunk y sourcemap exactos antes de revisar
   instrumentación de la aplicación;
8. comparar modo desarrollo y build local compilado, sin cambiar formularios.

Matriz mínima de evidencia:

| Caso | Navegación interna | Recarga directa | Extensiones | Resultado / origen |
| --- | --- | --- | --- | --- |
| Ficha personal | pendiente | pendiente | habituales | pendiente |
| Ficha personal | pendiente | pendiente | deshabilitadas | pendiente |
| Crear temporada | pendiente | pendiente | habituales | pendiente |
| Crear temporada | pendiente | pendiente | deshabilitadas | pendiente |

## 5. Criterio para atribuir y actuar

- Sólo atribuir a una extensión si el stack/origen o la prueba de habilitación incremental la
  identifica.
- Sólo atribuir a SPORTEXA si el stack mapea a un archivo propio o una instrumentación inicializada
  por la aplicación y el caso reproduce sin extensiones.
- Si el origen es externo, documentar versión y deshabilitar/actualizar esa herramienta durante UAT;
  no alterar el producto.
- Si el origen es propio, crear un defecto separado con reproducción mínima y causa demostrada.
- No capturar globalmente `window.onerror`, no filtrar mensajes de consola y no envolver los
  formularios para silenciar la excepción.

## 6. Conclusión actual

Con la evidencia disponible, el mensaje queda clasificado como **probable instrumentación externa
o inyectada, pendiente de confirmación en navegador sin extensiones**. No bloquea la definición
visual de IUX-04, pero la matriz debe completarse antes de usar una consola limpia como criterio de
UAT o de modificar código de aplicación.
