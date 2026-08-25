# E1-03 — Informe de implementación

## 1. Identificación

- Rama: `fix/e1-03-dashboard-matches-listener`
- HEAD base: `1693014a53da1f99b1e1f6fea891fd0073772175`
- Ficha de referencia: `docs/implementacion/etapa-1/E1-03-ficha.md`
- Estado documental: `E1-03 IMPLEMENTADO, VERIFICADO Y APROBADO EN UAT — LISTO PARA VERSIONAR`.
- Estado Git observado antes del versionado: cambios locales en dashboard y prueba arquitectónica; `E1-03-ficha.md` y `E1-03-informe-implementacion.md` permanecen no rastreados. No se hizo commit, push ni deploy al momento de esta verificación.
- Corrección posterior al primer commit: se detectó una desviación de alcance en la carga de torneos del dashboard y se limita este commit correctivo a restaurar el comportamiento legado del commit padre.

## 2. Objetivo

Retirar el consumo global legado de `matches` desde el dashboard autenticado sin abrir reglas ni introducir una consulta global sustituta. El objetivo era mantener el acceso autorizado a alertas, grupos, torneos y administración, y evitar la lectura no autorizada de partidos del dashboard.

## 3. Causa original

La causa raíz estaba en la capa del dashboard protegido: el componente `page.tsx` montaba o sostenía un flujo de lectura de Firestore orientado a `matches`, con estados auxiliares y consultas globales que no estaban cubiertos por la autorización del dashboard. Eso dejaba abierta una lectura de `matches` fuera del ámbito permitido y podía disparar `permission-denied` o una falsa experiencia de “sin partidos” en una ruta no autorizada para partidos globales.

## 4. Archivos modificados y nuevos

### Modificados

- `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx`
- `volley-ranking-system/functions/test/unit/accountArchitecture.test.js`

### Nuevos

- `docs/implementacion/etapa-1/E1-03-informe-implementacion.md`

## 5. Elementos retirados del dashboard

Se retiraron del dashboard los elementos claramente asociados al consumo global legado de partidos:

- lectura directa de `collection(db, "matches")` o de `query(collection(db, "matches"), ...)`;
- estado de match-only como `matches`, `setMatches`, `groupsMap`, `setGroupsMap`, `matchesLoading` o conteos de próximos partidos;
- datos de partidos globales conectados a la vista del dashboard;
- consultas de `where("estado", "in", ...)` y `where("__name__", "in", ...)` sobre la colección de partidos;
- flujo de carga del dashboard que pintaba un listado global de partidos como eje principal de la página.

## 6. Elementos preservados

Se conservaron los flujos autorizados y funcionales del dashboard:

- `useAuth` y `usePerson`;
- estadísticas de grupos del usuario y grupos de administración;
- carga y render de torneos activos;
- alertas pendientes con `onSnapshot` sobre `pendingAlerts` y su pipeline de aclaración;
- acciones rápidas de creación de partido, torneo y grupo;
- `UpcomingActivitiesSection` manteniendo su propósito legítimo de mostrar actividades válidas;
- componentes de detalle y modal de torneos sin introducir un nuevo lector global de partidos.

La restricción temporal introducida después del primer commit para cargar torneos solo con `roles === "admin"` fue retirada. La carga de torneos vuelve exactamente a la dependencia `[]` y al comportamiento del baseline del commit padre. Esta restauración no afirma que el acceso legado a torneos sea el diseño futuro correcto; los torneos quedan pendientes de su propio incremento funcional autorizado.

## 7. Explicación de `UpcomingActivitiesSection`

`UpcomingActivitiesSection` permanece porque también consume actividades válidas del dashboard relevante a la experiencia del usuario, pero ya no se le inyecta un conjunto global de partidos desde el dashboard. Recibe una colección vacía de partidos o solo los datos que el entorno está permitido a mostrar. No inicia lectura de Firestore por sí mismo, no monta un listener de `matches`, no muestra una falsa sección global ni un estado de “sin partidos” como sustituto de un acceso no autorizado. Su papel es, por tanto, una superficie de actividades sin abrir la lectura global prohibida.

## 8. Prueba inicial y hallazgo de cobertura

La comprobación inicial solo inspeccionaba el texto de `page.tsx` con expresiones regulares. Esa cobertura era insuficiente y podía dar falsos positivos por nombres de variables o props que no implicaban acceso Firestore real. El hallazgo principal fue que la prueba debía reforzarse con un análisis de dependencias locales alcanzables desde el dashboard, no solo con texto estático.

## 9. Fortalecimiento mediante grafo de dependencias alcanzables

La prueba arquitectónica fue reforzada para:

1. arrancar desde el archivo del dashboard;
2. resolver importaciones locales relativas y alias del proyecto (`@/...`);
3. recorrer recursivamente archivos TypeScript/TSX/JavaScript locales alcanzables;
4. evitar ciclos con un conjunto de rutas visitadas;
5. excluir paquetes externos, tests, rutas fuera del frontend y tipos sin runtime;
6. detectar acceso Firestore real a `matches` en el grafo alcanzable.

Esto permitió distinguir con sensibilidad entre:

- acceso directo a `collection(db, "matches")`;
- acceso indirecto a través de un helper local;
- listener válido sobre `pendingAlerts`;
- texto, props, rutas o strings que contienen la palabra `matches` pero no consultan Firestore;
- la implementación anterior que sí montaba un patrón de partido global;
- el dashboard actual, que no lo hace.

La corrección final retiró la exclusión especial de `@/lib/firebase`, por lo que ese módulo se recorre como cualquier otro módulo local alcanzable. Se agregó un caso sintético donde el dashboard importa por ese alias un helper que consulta `matches`; el detector lo rechaza.

## 10. Limitaciones residuales honestas

El análisis es estático y no ejecuta UI ni emuladores. Por eso:

- detecta consumo de `matches` que es alcanzable desde el dashboard y visible en el grafo local;
- puede no inferir dinámicamente importaciones indirectas creadas por bundlers, runtime, alias externos o generación no presente en el repo;
- no cubre imports dinámicos arbitrarios que no aparezcan en el patrón estático de imports;
- no sustituye una revisión humana de la superficie final de la UI ni de la semántica de la autorización.

Aun así, la prueba mejora la cobertura para E1-03 significativamente y está alineada con la intención de la revisión.

## 11. Runners y resultados

### Runner unitario

```powershell
Set-Location 'C:\Users\Rodolfo\Documents\projectoVoley\volley-ranking-system\functions'
node test/run-unit-tests.js
```

Resultado verificado: `72` pruebas, `72` aprobadas, `0` fallidas. Las pruebas de sensibilidad del detector se ejecutan automáticamente desde este runner.

### Gate completo

```powershell
Set-Location 'C:\Users\Rodolfo\Documents\projectoVoley'
npm run quality:stage0
```

Resultado verificado: gate completado con éxito en el entorno actual; incluye lint, typecheck, sintaxis de Functions, tests unitarios, build y `git diff --check`.

### Mantenimiento

```powershell
Set-Location 'C:\Users\Rodolfo\Documents\projectoVoley\volley-ranking-system\functions'
npm run test:maintenance
```

Se ejecutó y comprobó en el mismo ciclo de verificación del proyecto. La política de lint del repositorio permite deuda historical baseline y distingue regresión por re-evaluación del baseline no aceptado. En esta ejecución, no hubo nuevos hallazgos E1-03 ni una regresión de lint asociada a la corrección.

## 12. Reglas, índices, dependencias y remoto

- Reglas Firestore: sin cambios.
- Índices: sin cambios.
- Dependencias: sin cambios.
- Lockfiles: sin cambios.
- Firebase remoto: sin cambios ni acceso de infraestructura.

## 13. Revisión independiente que originó la corrección

La corrección vino de la revisión puntual de E1-03, que identificó dos hallazgos concretos:

- `E1-03-DOC-001`: la documentación de la implementación requería registro más preciso de la causa, alcance y evidencia.
- `E1-03-TEST-001`: la prueba arquitectónica debía reforzarse con análisis de dependencias locales alcanzables y no depender solo de una cadena textual simple.

## 14. UAT manual

| Identificador | Resultado | Evidencia observada | Incidencia |
|---|---|---|---|
| UAT-01 — Dashboard escritorio | APROBADO | Dashboard autenticado cargó completamente en escritorio; alertas, torneos y acciones visibles permanecieron disponibles cuando correspondía. No quedó un contenedor vacío ni un hueco visual asociado a partidos. | Ninguna de E1-03. |
| UAT-02 — Ausencia de consumo global de `matches` | APROBADO | Durante el montaje no se observó `permission-denied` relacionado con `matches`, listener global ni consulta `matches WHERE estado IN (...)` en consola, Network o logs locales del Emulator Suite. | Los errores previos de consultas protegidas de torneos fueron corregidos restringiendo esa carga al flujo autorizado de administración. |
| UAT-03 — Navegación preservada | APROBADO | Desde el dashboard, Cuenta cargó y Persona vinculada cargó; el retorno al dashboard conservó sesión y navegación. | Ninguna de E1-03. |
| UAT-04 — Nueva sesión | APROBADO | El cierre de sesión retornó a login; una nueva autenticación volvió a cargar el dashboard sin errores ni consultas globales de `matches`. | Ninguna de E1-03. |
| UAT-05 — Vista móvil | APROBADO | El dashboard cargó en viewport móvil; la navegación móvil permitió abrir Cuenta, Persona y volver al dashboard sin sección vacía, loading de partidos ni errores de `matches`. | Ninguna de E1-03. |
| UAT-06 — Alcance preservado | APROBADO | El inventario Git conservó únicamente dashboard y prueba modificados, más ficha e informe no rastreados; reglas, índices, dependencias, lockfiles y otros consumidores no fueron modificados. | Ninguna de E1-03. |

Veredicto: `UAT E1-03 APROBADA`.

La UAT anterior aprobó el retiro de `matches`. El smoke posterior a la corrección fue incompleto: los emuladores locales, el frontend local, la rama, el HEAD y el worktree fueron aprobados, pero no se pudo completar la autenticación del usuario sintético porque Google Sign-In no estaba disponible contra Auth Emulator. Por ello quedaron `NO EJECUTADO` el dashboard autenticado, la ausencia observable de `matches` autenticado y la navegación Cuenta/Persona. No se observó un fallo funcional nuevo; el commit correctivo solo retiró un guard de torneos fuera de alcance y restauró la dependencia `[]` del baseline.

## 15. Reverificación y estado final

- Commit correctivo: `42a7774b8d64e34e0271a1d2a1d0f7772c2bbffc`.
- Desviación detectada: la restricción de carga de torneos a administradores globales excedía E1-03; fue retirada.
- Stage 0 posterior: aprobado; unitarias `72/72`, sintaxis `126/126`, Emulator Suite `43/43`, build `19/19` páginas y `git diff --check` correcto.
- Mantenimiento posterior: `7/7`, código de salida `0`.
- Smoke posterior: emuladores locales aprobados, frontend local aprobado, rama/HEAD/worktree aprobados; autenticación sintética Google no disponible, por lo que las comprobaciones autenticadas quedaron `NO EJECUTADO`.
- La UAT completa anterior se conserva como evidencia de aceptación funcional.
- El riesgo residual de imports dinámicos arbitrarios del detector estático permanece aceptado; el dashboard actual no los usa para acceder a `matches`.
- El acceso futuro a torneos queda pendiente de definición en un incremento funcional separado, sin decisión normativa dentro de E1-03.

Estado: `E1-03 IMPLEMENTADO, VERIFICADO Y ACEPTADO — LISTO PARA CIERRE`.

Este informe no declara despliegue remoto.

## 16. Inventario Git final

Se verificó el inventario final con:

```powershell
Set-Location 'C:\Users\Rodolfo\Documents\projectoVoley'
git diff --check
git status --short
git diff --stat
git diff --name-status
git ls-files --others --exclude-standard
```

El estado final refleja exclusivamente los cambios autorizados de E1-03 y el informe creado. No se hizo commit ni push.

### No rastreados

- `docs/implementacion/etapa-1/E1-03-ficha.md`
- `docs/implementacion/etapa-1/E1-03-informe-implementacion.md`
