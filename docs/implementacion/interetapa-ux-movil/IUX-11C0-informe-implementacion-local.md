# IUX-11C0 — Informe de cierre técnico local

**Fecha:** 27 de noviembre de 2026
**Estado:** cerrado técnicamente en local; implementación y pruebas versionadas
**Naturaleza:** preparación técnica interna, sin funcionalidad de fusión entregada

## 1. Base y trazabilidad Git

- Repositorio: `C:\Users\Rodolfo\Documents\projectoVoley`.
- Base verificada después de `fetch origin dev`: `dev` y `origin/dev` en
  `acc7b263195ba7c05ce1362e76da306602a0b2c7`.
- Rama de trabajo: `feat/iux-11c0-identidad-compatible`.
- Los cuatro documentos aprobados se versionaron primero en el commit exclusivamente documental
  `fa79e6a6c7f060323bfdadac5d63f99abd6fb89c` (`docs(iux-11): definir C0 identidad compatible`).
- Implementación y pruebas: `75f1219b30f95a5500e944c8141a4f090bbe3fde`
  (`feat(iux-11): preparar identidad compatible C0`).
- No se modificaron `visuals/`, datos UAT, configuración remota, índices ni datos Firebase remotos.

## 2. Alcance implementado

Se incorporaron las raíces internas `accountIdentities/{accountId}` y
`personIdentityAssignments/{personId}` con shape cerrado de C0. `MIRRORED_SINGLE` refleja exactamente
`users/{accountId}.personaId`, revisión inicial 1 y assignment `ACTIVE` directo.

El puerto interno ofrece:

- resolución por Cuenta: `MISSING | LEGACY_SINGLE | MIRRORED_SINGLE | INCOMPATIBLE`;
- resolución inversa por Persona, primero por assignment y después por fallback legacy;
- `ensureMirroredSingleIdentity` transaccional e idempotente: `CREATED | EXISTING`;
- inspección de sólo lectura, página máxima 100, `limit(pageSize + 1)`, orden por `__name__` y cursor
  opaco;
- materialización local `inspect/apply` reanudable mediante manifest, restringida a Emulator y
  proyectos `demo-*`;
- rechazo cerrado de shapes parciales, cruces Cuenta–Persona o estados divergentes, sin elección de
  ganador ni reparación automática.

`ensureMyPerson` crea Persona, `users.personaId`, identidad y assignment en una sola transacción. La
adopción `ADOPTED` de IUX-11B incorpora las dos raíces C0 en su transacción vigente. Reintentos exactos
y respuestas perdidas recuperan las mismas raíces; las colisiones no dejan efectos parciales. Durante
la revisión se detectó además que una pareja identidad/assignment exacta pero huérfana podía ser
aceptada por un writer nuevo: ambos flujos ahora exigen creación conjunta cuando completan un vínculo
y rechazan esa divergencia sin usarla como reparación implícita.

Las Cuentas legacy siguen operando mediante fallback exclusivamente de lectura. Ningún reader
materializa documentos al consultar. Se adaptaron los puntos vigentes que construyen el reader de
Persona propia: callables de ficha propia, contexto de Membresías y capability de Solicitudes.

`RECOGNIZED_PENDING_MERGE` sólo valida la coherencia de la identidad singular vigente: no adquiere
assignment, no cambia custodia y no consume la intención. Los DTO y errores públicos existentes se
mantienen.

Las dos colecciones nuevas tienen `deny-all` para acceso Firestore del cliente. No se agregaron
callables, rutas, botones, UI, índices ni configuración de fusión.

## 3. Archivos de implementación y prueba

Nuevos:

- `volley-ranking-system/functions/src/accountIdentities/domain/accountIdentity.js`;
- `volley-ranking-system/functions/src/accountIdentities/infrastructure/firestoreAccountIdentityStore.js`;
- `volley-ranking-system/functions/src/scripts/inspectAccountIdentityMaterialization.js`;
- `volley-ranking-system/functions/test/unit/accountIdentityC0.test.js`;
- `volley-ranking-system/functions/test/emulator/accountIdentityIux11c0.test.js`;
- este informe.

Modificados:

- `volley-ranking-system/firestore.rules`;
- `volley-ranking-system/functions/package.json`;
- `volley-ranking-system/functions/callables/ensureMyPerson.js`;
- `volley-ranking-system/functions/callables/getMyPerson.js`;
- `volley-ranking-system/functions/src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork.js`;
- `volley-ranking-system/functions/src/infrastructure/firestoreSelfPersonReader.js`;
- `volley-ranking-system/functions/src/administrativePersonLinks/infrastructure/administrativePersonLinkModule.js`;
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`;
- `volley-ranking-system/functions/src/persons/public/groupJoinRequestPersonCapability.js`;
- pruebas Emulator de IUX-11B y Persona E1, runner Emulator y unitarias del UoW.

## 4. Criterios de aceptación C0

| # | Resultado | Evidencia local |
| --- | --- | --- |
| 1 | Cumplido | Alta propia y adopción B crean espejo y assignment dentro del commit vigente; DTO público caracterizado sin cambios. |
| 2 | Cumplido | Retry, receipt B y simulación de respuesta perdida conservan documentos y revisión; el puerto devuelve `EXISTING`. |
| 3 | Cumplido | Dos Cuentas/una Persona, dos Personas/una Cuenta, raíz parcial, pareja huérfana y cruces divergentes fallan sin efectos parciales. |
| 4 | Cumplido | Legacy e inspect son read-only y fueron probados en 0/1/100/101. Apply se validó sólo en Emulator sintético: inspección previa; interrupción tras una página y reanudación por manifest; repetición idempotente; divergencia rechazada sin reparación; registros ajenos invariantes. |
| 5 | Cumplido | `RECOGNIZED_PENDING_MERGE` no crea identidad candidata, assignment ni custodia nueva. |
| 6 | Cumplido | Regresiones A/A.1/B y consumidores propios/economía/Membresías de la suite Emulator conservan resultados. |
| 7 | Cumplido | No existen UI, callable de merge, cambio de principal ni pluralidad efectiva. |
| 8 | Cumplido | Rules niegan lectura/escritura del cliente; reporte sin PII; presupuesto máximo medido dentro de los techos. |
| 9 | Cumplido con baseline declarado | Focales, Emulator, TypeScript, build, lint baseline, sintaxis y diff check conformes; persiste un único fallo unitario histórico IUX-06A. |
| 10 | Cumplido | Este informe separa evidencia local de toda operación productiva no ejecutada. |

El apply pertenece a C0 únicamente como reconciliación local verificable: la ficha §8.1 permite probar
`inspect` y `apply` en Emulator y su criterio 4 lo exige. Materialización UAT/remota, backfill y
operación productiva permanecen en C4 y requieren autorización específica.

### 4.1 Evidencia de materialización local

- inspección inicial: tres Cuentas legacy compatibles y una Cuenta sin Persona, sin escrituras;
- ejecución interrumpida de forma controlada tras la primera página: dos raíces creadas y cursor
  persistido;
- recuperación desde manifest: tres legacy materializadas en total y la Cuenta sin Persona conservada;
- repetición completa: `created=0`, `existing=3`, `missing=1`, sin cambio de `updateTime`;
- raíz divergente parcial: `INCOMPATIBLE`, sin crear el assignment faltante ni reparar datos;
- Usuario ajeno y documento de colección ajena: contenido y timestamps invariantes.

El manifest conserva cursor, conteos y error técnico sanitizado; una página fallida no adelanta el
cursor ni duplica sus conteos al reintentar. La herramienta falla cerrada fuera de Emulator, fuera de
un proyecto `demo-*` o si `apply` no recibe manifest.

## 5. Validaciones ejecutadas

- Focal IUX-11C0 final: **2/2**, incluido shape exacto, `CREATED/EXISTING`, legacy read-only,
  inspect/apply, recuperación, divergencias, exclusividad, atomicidad, Rules y paginación 100 + 1.
- Focal IUX-11B final: **1/1**, incluida adopción, respuesta perdida, carrera con
  `ensureMyPerson`, exclusividad y `RECOGNIZED_PENDING_MERGE`.
- Focal IUX-11A/A.1: **1/1**.
- Suite Emulator aislada completa: **8/8 lotes, 341/341 pruebas**, en proyecto sintético
  `demo-sportexa-e0-02`.
- Unitarias: **506/507**. La única falla es el baseline histórico
  `iux06aPresentation.test.js`, que espera `/gridTemplateColumns/`; no pertenece a C0 y no se corrigió.
- Sintaxis Functions final: **577/577**.
- TypeScript: aprobado.
- Lint baseline: aprobado, **30 errores conocidos y 8 warnings**, 12 errores menos que el techo
  histórico; sin deuda nueva C0.
- Build Next.js: aprobado, **24 páginas**.
- `git diff --check`: aprobado.

Las pruebas usaron fixtures sintéticos y copias efímeras del Emulator. No se arrancó el frontend, no
se usó la sesión UAT existente y no se accedió a datos remotos.

## 6. Contratos preservados y límites

Se preservan `users.personaId` como autoridad efectiva singular, los DTO/callables públicos, la
exclusividad B, las custodias, Personas, Membresías, economía, Solicitudes, Invitaciones y capabilities
vigentes. C0 sólo agrega una representación compatible y cerrada para nuevas escrituras autorizadas.

Quedan fuera y no se declaran entregados:

- C1–C4, identidad 1..N efectiva, fusión y cambio de ficha principal;
- elección o finalización de Membresías, consecuencias económicas y adaptación multi-Persona;
- consumo de `RECOGNIZED_PENDING_MERGE`;
- preview de fusión, UI, notificación Owner o callables nuevos;
- backfill UAT/remoto, reparación, índices, flags/configuración remota, deploy, canary y rollout;
- cualquier operación productiva C4, que conserva su autorización específica.

## 7. Estado real

C0 queda **cerrado técnicamente en local** dentro del alcance autorizado y versionado en
`75f1219b30f95a5500e944c8141a4f090bbe3fde`. No está integrado a `dev`, desplegado ni habilitado y no
acredita funcionalidad de fusión para usuarios. No quedan bloqueos técnicos ni criterios C0 pendientes.
Los pendientes reales son los cortes C1–C4 y toda operación UAT/remota/productiva, cada uno sujeto a
su autorización y dependencias documentadas.
