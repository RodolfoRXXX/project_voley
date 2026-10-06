# E2-14 — Decisión aprobada de roadmap para compatibilidad residual

## 1. Estado y alcance

- **Estado:** `APROBADA POR EL USUARIO`.
- **Fecha de preparación:** 2026-10-06.
- **Fecha de aprobación:** 2026-10-06.
- **Base inspeccionada:** `dev` en `e3105f227cdd2d4e0dd34b3ea3ce40e69f93c012`.
- **Hallazgo tratado:** E2-COMP-01.
- **Decisión de Documento 5:** D5-044.

Este documento conserva su nombre histórico de propuesta para mantener trazabilidad, pero registra
la asignación y las condiciones de retiro aprobadas. La aprobación resuelve la asignación documental
pendiente de E2-COMP-01; no demuestra retiro ejecutado, no autoriza una ventana ni permite borrar
exports, rutas, BFF, páginas o persistencia. La ejecución corresponde a una intervención posterior.

Quedan expresamente fuera de esta propuesta E2-E4-01 y E2-E4-02: los cuatro consumidores frontend
directos allowlisted y los readers, Rules y writers deportivos de Partido/Torneo ya poseen asignación
aprobada a Etapa 4. Aquí sólo se trata la superficie residual callable/HTTP y el catálogo público
legacy conservados después de E2-13.

## 2. Criterio de evidencia

La búsqueda completa en el repositorio permite probar consumidores internos o su ausencia en el
código versionado. No permite demostrar que no existan clientes desplegados, integraciones externas,
marcadores, scripts u otras versiones fuera del repositorio. No existe telemetría aportada que mida
invocaciones ni una ventana de observación ya cumplida.

Cuando no haya evidencia suficiente de consumidores externos, deberá adoptarse una decisión
explícita sobre aviso, compatibilidad versionada o aceptación del riesgo. No se exige un inventario
externo exhaustivo imposible de demostrar y no se presume telemetría ni una ventana de observación
ya cumplida. La ausencia de referencias internas no habilita por sí sola el retiro.

## 3. Inventario exacto y decisión por superficie

| Superficie | Identificación y comportamiento actual | Consumidores comprobados / desconocidos | Dependencia para conservar | Etapa responsable aprobada y fundamento | Hito de revisión aprobado | Condición verificable de retiro | Pruebas necesarias | Si falta evidencia externa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tombstones callable | Exports `addGroupAdmin`, `removeGroupAdmin`, `reorderGroupAdmins`, `transferGroupOwnership`, `editGroup` y `toggleGroupActivo` en `functions/index.js`. Rechazan siempre con `failed-precondition`, mensaje neutro y `details.reason = LEGACY_GROUP_CAPABILITY_RETIRED`; no leen ni escriben datos | No hay consumidor de aplicación en el repositorio; sólo pruebas de arquitectura/Emulator. Consumidores externos: desconocidos | Evitar que clientes antiguos reciban `not-found` mientras todavía pudiera existir una invocación externa no inventariada | **Etapa 9**, porque ya no sostienen E4 ni un flujo funcional y su eventual retiro pertenece al cierre de transición | Revisar cada callable, individualmente o por familia justificada, antes del cierre de transición | Inventario interno; evidencia externa disponible; rechazo sin efectos comprobado; decisión posterior documentada que autorice desexportar en un corte versionado y recuperable | Arquitectura de exports; contrato de rechazo; ausencia de imports/invocaciones internas; verificación de exports canónicos y rutas no afectadas; regresiones aplicables | Conservar. Exigir decisión explícita sobre aviso, compatibilidad versionada o aceptación del riesgo; no exigir prueba exhaustiva imposible |
| Tombstones HTTP | Ocho pares método/ruta exactos en `functions/src/httpApi.js`: `POST /groups/{groupId}/members/{userId}/add`, `POST .../remove`, `GET /groups/{groupId}/members/search`, `POST /groups/{groupId}/admin-request`, `POST .../admin-requests/{userId}/approve`, `POST .../reject`, `POST .../admins/{userId}/add`, `POST .../remove`. Responden `410` JSON `LEGACY_GROUP_CAPABILITY_RETIRED` antes de Auth o datos; métodos/rutas no exactos siguen `404` | Las BFF y UI equivalentes fueron retiradas; sólo quedan pruebas internas. Consumidores externos: desconocidos | Mantener una señal estable para clientes antiguos y evitar ambigüedad con rutas desconocidas mientras no se descarte consumo externo | **Etapa 9**, por ser compatibilidad de protocolo sin dependencia deportiva vigente | Revisar cada ruta, individualmente o por familia justificada, antes del cierre de transición | Inventario interno; evidencia externa disponible; `410` sin efectos comprobado; decisión posterior documentada que autorice retirar matchers sin interceptar catálogo, push ni rutas deportivas | Matriz método/path; CORS/OPTIONS; rutas parecidas; ausencia de Auth/lecturas/escrituras; regresiones de GET públicos, push y API deportiva | Conservar `410`. Exigir decisión explícita sobre aviso, compatibilidad versionada o aceptación del riesgo; no inferir ausencia externa desde las BFF retiradas |
| Catálogo público residual | `GET /groups/public` lista sólo documentos legacy, públicos y activos con DTO sanitizado y conteo de Partidos públicos. `GET /groups/{groupId}/public` devuelve Grupo legacy público/activo y sus Partidos públicos; v1/v2 canónicos, privado, inactivo o inexistente convergen según contrato en exclusión/`404`. BFF: `/api/groups/public` y `/api/groups/[groupId]/public`; páginas: `/groups` y `/groups/[groupId]` | Consumidores internos comprobados: dos BFF y dos páginas públicas. Consumidores externos del endpoint HTTP: desconocidos | Sostiene el descubrimiento y detalle read-only de Partidos públicos históricos E4; no es autoridad de Organización ni descubrimiento canónico E2 | **Etapa 4**, junto con la sustitución por una proyección pública deportiva aprobada; no altera la asignación E4 ya vigente para readers/Rules/writers deportivos | Revisar cuando E4 apruebe la proyección y su política de privacidad y migre las páginas/BFF | Proyección y privacidad aprobadas; páginas/BFF migradas; ausencia de dependencia interna verificada; privacidad y regresiones comprobadas; tratamiento externo resuelto expresamente; decisión posterior que autorice retirar | Contrato y DTO de sustitución; páginas lista/detalle; privacidad/no enumeración; separación Grupo/Partido; `404` genérico; ausencia de arrays/roles; dispatch y rutas restantes | Conservar los GET sanitizados. Resolver mediante aviso, compatibilidad versionada o aceptación del riesgo; no inventar telemetría o ventanas cumplidas |

## 4. Consumidores comprobados

### 4.1 Tombstones callable y HTTP

No se encontraron invocaciones de aplicación, BFF ni UI para los seis callables o las ocho rutas. Las
referencias vigentes pertenecen a `functions/index.js`, al dispatcher/tombstones y a pruebas que
verifican su rechazo. Esta conclusión se limita al repositorio.

### 4.2 Catálogo público

Se comprobaron estos consumidores internos:

1. `volley-ranking-frontend/src/app/api/groups/public/route.ts`;
2. `volley-ranking-frontend/src/app/api/groups/[groupId]/public/route.ts`;
3. `volley-ranking-frontend/src/app/(public)/groups/page.tsx`;
4. `volley-ranking-frontend/src/app/(public)/groups/[groupId]/page.tsx`.

Las páginas consumen las BFF y éstas llaman a los endpoints HTTP. La existencia de estos consumidores
impide retirar el catálogo antes de contar con una sustitución y migración E4 verificadas.

## 5. Decisiones aprobadas y decisiones futuras

Queda aprobado:

1. asignar los seis callables y las ocho rutas HTTP administrativas a Etapa 9;
2. asignar los dos GET del catálogo a Etapa 4 junto con su proyección pública deportiva sustituta;
3. conservar todas las superficies hasta cumplir sus condiciones de retiro;
4. resolver con esta asignación el pendiente documental E2-COMP-01;
5. comprobar el roadmap en la repetición final de E2-14.

La futura decisión de ejecución deberá autorizar expresamente cada retiro después de evaluar la
evidencia aplicable. Si la evidencia externa es insuficiente, deberá decidir aviso, compatibilidad
versionada o aceptación del riesgo. Esta aprobación no autoriza el retiro efectivo.

## 6. Resultado

`ROADMAP DE COMPATIBILIDAD APROBADO — SUPERFICIES CONSERVADAS — RETIRO PENDIENTE DE EJECUCIÓN POSTERIOR`
