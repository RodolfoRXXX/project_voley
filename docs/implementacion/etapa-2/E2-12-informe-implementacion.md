# E2-12 — Informe de implementación

## Resultado

Se implementó la finalización administrativa de la Membresía activa de un tercero por el Owner conforme a la ficha aprobada. El incremento agrega las dos callables cerradas, una referencia opaca ligada a la activación exacta, un intent durable, la transición atómica de raíz/período/guards, reglas deny-all, la acción accesible en el roster E2-11 y pruebas unitarias/Emulator.

La UAT manual aprobó UAT-01 a UAT-12. UAT-03 reveló primero un mensaje fuera de contexto y, en la revisión funcional posterior, una precondición indebida de Persona propia. La ficha y la implementación quedaron ajustadas para que Cuenta y ownership autoricen, con Persona opcional sólo para `TARGET_IS_SELF`; el retest manual confirmó el flujo completo de un Owner sin Persona sobre la Membresía activa de un tercero. No se realizó deploy ni acceso a Firebase remoto.

## Preflight

- Rama: `feat/e2-12-administrative-membership-finalization`.
- Upstream: `origin/feat/e2-12-administrative-membership-finalization`.
- HEAD y upstream: `4c0f16c73ab5e93e5422e6be064c12377a8ad7d5`.
- Divergencia: `0/0`.
- Merge-base: `4c0f16c73ab5e93e5422e6be064c12377a8ad7d5`.
- No existían commits posteriores en ninguno de los dos lados.
- Árbol e índice iniciales: limpios.
- Stashes: cero.
- `dev == origin/dev == 4c0f16c73ab5e93e5422e6be064c12377a8ad7d5`.
- Auth/UAT siguió aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`.
- Git se ejecutó con `git -c safe.directory=C:/Users/Rodolfo/Documents/projectoVoley` por comando; no se cambió configuración global.
- Se leyó completa la ficha E2-12 y se revisaron las implementaciones vigentes E2-05, E2-09, E2-10 y E2-11 antes de editar.

### Revisión normativa posterior a UAT-03

E2-02 establece expresamente que el Owner sin Persona administra por ownership, que la ausencia de Persona/Membresía no bloquea ni crea altas colaterales y que autorización funcional no equivale a pertenencia deportiva. Documento 5 separa Usuario, Persona y Membresía, define al Owner como Usuario propietario del Grupo y dispone que ownership no crea Membresía. Ninguna fuente superior exige Persona para una operación administrativa de Grupo.

La exigencia original de Persona propia en E2-12 fue, por tanto, una contradicción local introducida únicamente para evaluar autoobjetivo. Se corrigió la ficha E2-12 de forma controlada; no se modificaron Documento 5, AUD-C05 ni documentos arquitectónicos.

## Inventario reutilizado

- Dominio: `membership.js` (`hydrateMembership`, `finalizeMembership`, schemas v1/v2/v3, preservación de `fechaIngreso`) y `membershipValidityPeriod.js`.
- Repositorio: `firestoreMembershipRepository.js`, queries de pareja `limit(2)`, integridad de primer/último período, exactamente un período abierto e IDs deterministas.
- Guards: `firestoreActiveMembershipGuard.js` v1/v2 y `firestoreMembershipLifecycleGuard.js` v1/v2.
- Hashing: `sha256LengthPrefixed`, IDs de active/lifecycle guards y `membershipValidityPeriodId`.
- Intent/recovery: patrón de E2-10 en `firestoreMembershipSelfExitStore.js`, sin estado pending fuera de transacción.
- Contexto: repositorios canónicos internos de Cuenta, Persona, Grupo y Temporada; se encapsularon para E2-12 mediante capacidades públicas nuevas de Grupo/Temporada y Persona.
- Contratos/errores/callables: `membershipContract.js`, `membershipErrors.js`, `membershipCallable.js`, `membershipService.js` y `membershipModule.js`.
- Roster E2-11: `firestoreActiveGroupMembersForOwnerReader.js`, DTO cerrado, paginación y `ActiveGroupMembersSection.tsx`.
- Rules: deny-all existente para Membresías, períodos y guards; se añadió deny-all explícito para el intent E2-12.
- Pruebas: runners unitarios, Emulator aislado `demo-*`, reglas y controles de red loopback existentes.
- Legado inventariado y aislado: `/admin/groups`, detalles por UID, BFF/HTTP de remoción, `memberIds`, `adminIds`, `admins`, Torneos, Partidos, roles globales y páginas públicas/profile.

## Implementación realizada

### Contratos públicos

Se exportaron exactamente:

```text
prepareActiveGroupMemberFinalizationForOwnedGroup({ groupId, membershipId })
→ { person: { firstName, lastName }, activationRef }

finalizeActiveGroupMemberForOwnedGroup({ groupId, membershipId, activationRef, idempotencyKey })
→ { outcome: "MEMBERSHIP_FINALIZATION_CONFIRMED", effect: { membershipId, finalizedAt } }
```

Los payloads exigen objetos planos y propiedades exactas. IDs de documento no admiten `/`, espacios extremos, vacío ni más de 1500 bytes UTF-8. `activationRef` exige 64 caracteres hexadecimales minúsculos y la clave cumple `^[A-Za-z0-9._:-]{16,128}$`. Cualquier campo extra —incluidos UID, `personId`, `seasonId`, ordinal, estado, timestamps, guards, roles, `decidedBy`, `fechaEgreso` o `reason`— produce `VALIDATION_FAILED`.

### Autorización

Ambas operaciones derivan UID desde Auth y revalidan Cuenta, Grupo activo y `ownerId` vigente. Dentro de la transacción se leen primero Cuenta y ownership y después la Persona propia opcional. Ni roles, claims, arrays legacy, roster, Persona, `membershipId` ni `activationRef` autorizan.

La Persona propia, si existe, se usa exclusivamente para rechazar autoobjetivo con `TARGET_IS_SELF`; su ausencia es válida. Un vínculo declarado pero incompatible falla cerrado. No se exige Membresía propia. Grupo inexistente/ajeno se presenta como `GROUP_NOT_ACCESSIBLE`; Membresía inexistente o externa como `TARGET_MEMBERSHIP_NOT_ACCESSIBLE`.

Antes de recuperar un intent histórico se revalidan Cuenta, ownership y Persona propia opcional para `TARGET_IS_SELF`. Un ex Owner no recibe el efecto persistido.

### Capacidades públicas y decisiones físicas

- `administrativeMembershipFinalizationContextCapability.js` encapsula lectura transaccional de ownership y de la Temporada exacta abierta/guard.
- `administrativeMembershipFinalizationPersonCapability.js` separa Cuenta obligatoria, Persona propia opcional y presentación canónica obligatoria del objetivo.
- `firestoreMembershipAdministrativeFinalizationStore.js` es el único coordinador físico E2-12 y el único escritor nuevo.
- No se agregó índice: el flujo usa referencias deterministas y queries de integridad ya aprobadas.
- No se agregó repositorio público de períodos; continúan subordinados a Membresía.

### `activationRef`

Se calcula con SHA-256 hexadecimal minúsculo sobre encoding length-prefixed y dominio `sportexa:E2-12:administrative-finalization-activation-ref:v1`, incluyendo actor UID, Grupo, Membresía, Persona objetivo, Temporada, ordinal, período vigente determinista y versión del active guard. La Persona propia no integra el digest porque es contexto mutable para `TARGET_IS_SELF`, no autoridad ni identidad de la activación.

Para activa v1 se usa ordinal 1 y el ID determinista del período que se materializaría. En `finalize` se recomputa desde raíz/guard/período autoritativos. Una referencia vieja consume `MEMBERSHIP_ACTIVATION_CHANGED`, no cierra N+1 y omite `activationOrdinal` del intent para no atribuir el ordinal nuevo al rechazo.

La referencia cruda no se persiste ni se trata como firma o permiso.

### Intent e idempotencia

Colección: `membershipAdministrativeFinalizationIntents/{intentId}`.

El schema cerrado v1 contiene `action`, actor derivado, `actorPersonId` derivado y nullable, Grupo, Membresía, objetivo, Temporada, hashes separados, estado `consumed`, outcome y timestamps. `actorPersonId` es `null` cuando el Owner no posee Persona. `activationOrdinal` sólo está presente cuando la activación confirmada/rechazada puede correlacionarse; `finalizedAt` sólo en éxito. No hay TTL ni pending externo.

- ID: dominio E2-12 + actor UID + clave cruda, con clave cruda descartada.
- Key hash, request hash y activation-ref hash usan dominios distintos.
- Request hash cubre contrato, actor UID, Grupo, Membresía y referencia; no incorpora Persona propia mutable.
- Misma clave/payload recupera outcome y timestamp.
- Misma clave con otro request autorizado devuelve `IDEMPOTENCY_CONFLICT`.
- Retry de N después de N+1 devuelve el cierre histórico N y no lee/muta la activación nueva.
- Dos claves sobre el mismo ordinal producen un ganador y un rechazo durable; el perdedor nunca reclama éxito.
- Un cierre E2-10/E2-05 no se adopta como éxito E2-12.

### Persistencia y atomicidad

Una única transacción lee todo el contexto antes de escribir. En éxito confirma con un mismo `Timestamp`:

- raíz v3 finalizada y `fechaEgreso`;
- período vigente cerrado, o materialización/cierre del período 1 para v1;
- resumen `latestPeriodId`/`periodCount`;
- eliminación del active guard;
- lifecycle guard v2;
- intent consumido.

Cuenta, Personas, Grupo, Temporada y open season guard quedan read-only. No se escriben Solicitudes, pending guards, Activity, notificaciones ni arrays legacy.

### Compatibilidad y concurrencia

- Activa v1 + guard v1: valida ausencia de períodos, conserva `fechaIngreso`, eleva a v3 y materializa/cierra ordinal 1.
- Activa v3 + guard v2: exige primer/último período, resumen y exactamente uno abierto; cierra sólo el vigente.
- Finalizadas v2/v3: no se sobrescriben; sin intent exacto producen rechazo administrativo.
- Schemas desconocidos, duplicados, guards cruzados/coexistentes, cardinalidad o períodos incompatibles fallan cerrados.
- Temporada cerrada antes del commit consume rechazo sin transición; un retry ya confirmado no exige Temporada abierta.
- Transferencia previa al commit/retry invalida al ex Owner.
- E2-10/E2-12 serializan sobre raíz/guards/período y dejan un único cierre.
- E2-09 conserva su coordinación y `MEMBERSHIP_REACTIVATION_SUPERSEDED`; no se creó transacción global Solicitud–Membresía.
- Solicitudes aprobadas, pendientes y guards se conservan sin cambios.

### Seguridad y observabilidad

- Frontend callable-only; Admin SDK es el único escritor.
- Rules niegan lectura y escritura directa de intents, Membresías, períodos y guards para visitante, integrante, Owner y admin global.
- No se habilitó Owner-write directo, BFF o HTTP legacy.
- Observabilidad allowlisted: operación, outcome/reason y duración; el diagnóstico transaccional conserva etapa/intento. No registra nombres, emails, UID, Persona, claves, referencias crudas, hashes, payloads, snapshots o paths.

### Frontend

La sección canónica `Integrantes` conserva reader, DTO y paginación E2-11. Sólo terceros `AVAILABLE` muestran `Finalizar Membresía`, con nombre accesible completo. La fila propia y `UNAVAILABLE` no muestran acción.

La UI llama primero a `prepare`, muestra el nombre canónico devuelto, conserva `activationRef` e `idempotencyKey` en retry, bloquea doble envío, anuncia loading/error/éxito y reconsulta la primera página tras éxito o intención invalidada. No elimina filas de forma optimista.

El diálogo explica el efecto no disciplinario, preservación de Persona/historia y ausencia de bloqueo automático de nuevas Solicitudes. Cancelar/Escape nunca llama a `finalize`. Incluye foco inicial, trampa de foco, retorno de foco, `alertdialog`, `aria-live`, `role=alert`, controles mínimos de 44 px y layout sin ancho fijo para 360/768/escritorio.

### Legado

No se retiraron ni modificaron los writers/páginas legacy por UID, rutas `/admin/groups`, BFF/HTTP, arrays, Torneos, Partidos o administración global por roles. E2-12 no afirma sustituirlos.

## Inventario final versionado

- Frontend: `ActiveGroupMembersSection.tsx`, `membershipsService.ts` y `OwnMembership.ts`.
- Functions y contratos: dos callables nuevas, exports, contrato, DTO, errores, hashing, servicio, handler y composición del módulo.
- Capacidades públicas: contexto administrativo de Grupo/Temporada y resolución opcional de Persona propia.
- Persistencia: `firestoreMembershipAdministrativeFinalizationStore.js`.
- Seguridad: deny-all del intent en `firestore.rules`; no fue necesario agregar índices.
- Pruebas/configuración: runner Emulator y suites unitarias/Emulator E2-12, más expectativas E2-11/servicio afectadas.
- Documentación de cierre: ficha E2-12 corregida, este informe y `E2-12-cierre.md`.

## Pruebas y gates de cierre

Todos los runners Emulator usaron `demo-sportexa-e0-02`, hosts loopback, secretos sintéticos y proxies externos bloqueados.

- Focal unitario E2-12: `6/6`, 0 fallos.
- Focal integrada E2-11/E2-12 tras adaptar expectativa: `13/13`, 0 fallos.
- Unitarias canónicas finales, incluidos contratos y arquitectura: `279/279`, 0 fallos, `2878.9826 ms`.
- Emulator E2-12: 7 escenarios anidados más suite contenedora; incluido y aprobado en la suite completa.
- Emulator Suite completa, incluidas regresiones E2-05/E2-09/E2-10/E2-11 y E2-12: `167/167`, 0 fallos, `239874.0989 ms`.
- Sintaxis Functions: `270/270` archivos JavaScript, OK.
- Mantenimiento y reglas: `7/7`, 0 fallos, `2256.4531 ms`.
- Lint baseline: OK; `39` errores y `9` warnings conocidos, `6` hallazgos resueltos respecto del baseline.
- Typecheck: exit code 0.
- Build: exit code 0; compilación/TypeScript OK y `21/21` páginas estáticas.
- `git diff --check`: exit code 0; sólo avisos informativos LF→CRLF de Git, sin errores de whitespace.
- Higiene textual sobre las 24 entradas iniciales: UTF-8 válido sin BOM, sin whitespace final y con newline al EOF.
- El primer intento del gate unitario no inició tests por `EPERM` del sandbox al resolver `C:\Users\Rodolfo`; se repitió una vez fuera de esa restricción y aprobó `279/279`. No se actualizó ninguna expectativa automáticamente.

Validación focal posterior a la corrección UAT-03, sin repetir la suite Emulator completa ni el build:

- Unitarias E2-11/E2-12 afectadas: `14/14`, 0 fallos, `378.3639 ms`.
- Repetición final de la unitaria E2-12 tras reforzar la aserción de diálogo cerrado: `7/7`, 0 fallos, `229.4448 ms`.
- Emulator E2-12: `9/9`, 0 fallos, `12695.001 ms`; incluye Owner sin Persona con `PERSON_REQUIRED`, ausencia de escrituras y preparación exitosa después de vincular Persona.
- Lint baseline frontend: OK; `39` errores y `9` warnings conocidos, `6` hallazgos resueltos respecto del baseline.
- Typecheck frontend: exit code 0.
- `git diff --check`: exit code 0; sólo avisos informativos LF→CRLF, sin errores de whitespace.

Validación focal de la revisión funcional UAT-03:

- Unitarias E2-11/E2-12, servicio, contratos y arquitectura afectados: `34/34`, 0 fallos, `487.1461 ms`.
- Emulator E2-12: `10/10`, 0 fallos, `13269.7614 ms`; incluye Owner sin Persona que prepara/finaliza a B, cero altas colaterales, Grupo ajeno rechazado y Persona coincidente creada entre `prepare`/`finalize` rechazada con `TARGET_IS_SELF`.
- Sintaxis de seis archivos JavaScript afectados: exit code 0.
- Lint baseline frontend: OK; `39` errores y `9` warnings conocidos, `6` hallazgos resueltos respecto del baseline.
- Typecheck frontend: exit code 0.
- `git diff --check`: exit code 0; sólo avisos informativos LF→CRLF, sin errores de whitespace.
- No se repitieron Emulator Suite completa ni build: el cambio backend quedó contenido en E2-12 y su focal ejercita las regresiones de atomicidad/idempotencia/concurrencia; el cambio frontend sólo retiró un helper/import muerto y aprobó lint+typecheck.

## Incidencias y correcciones

1. El primer gate unitario completo encontró una expectativa E2-11 que prohibía cualquier acción administrativa en el roster. Se actualizó exclusivamente esa expectativa obsoleta para exigir acción E2-12 sólo en terceros `AVAILABLE`; la focal E2-11/E2-12 quedó `13/13`.
2. Un typecheck exploratorio ejecutado desde `functions` hizo que `npx` resolviera el paquete homónimo incorrecto `tsc` y falló antes de compilar. No modificó manifests/lockfiles. Se corrigió usando `npm run quality:typecheck` desde la raíz; aprobó.
3. El canal desacopló la salida extensa de Emulator. Una repetición inmediata no ejecutó tests porque el primer proceso aún ocupaba los puertos. Se esperó sin matar procesos; para evidencia exacta se repitió con salida sólo en `%TEMP%`, se obtuvo código 0 y `165/165`, y se eliminaron los temporales.
4. Firebase CLI intentó consultar MOTD/config remotos, pero el proxy bloqueado lo impidió con warning no fatal. Los servicios y datos utilizados fueron exclusivamente Emulator/loopback.
5. UAT-03 confirmó que la precondición de Persona propia funcionaba, pero `ActiveGroupMembersSection` traducía el `PERSON_REQUIRED` de E2-12 mediante el catálogo genérico de Membresías: “Necesitás crear tu Persona antes de incorporarte.” Ese texto pertenece legítimamente a los flujos de incorporación. Se agregó una traducción contextual exclusiva de finalización administrativa: “Necesitás crear tu Persona antes de administrar integrantes del grupo.” El reason backend, la autorización, el cierre del diálogo y todos los contratos/persistencia permanecieron sin cambios.
6. Una revisión funcional posterior determinó que la primera corrección sólo mejoraba el texto y conservaba una precondición contraria a E2-02 y Documento 5. Se retiró `PERSON_REQUIRED` exclusivamente de E2-12, se eliminó el traductor contextual que quedó sin consumidor y se preservó el mensaje genérico de incorporación para los demás flujos. Cuenta y ownership continúan obligatorios; Persona propia es opcional y se relee transaccionalmente sólo para `TARGET_IS_SELF`.

## Riesgos residuales

- Los writers legacy por UID/arrays siguen existiendo por decisión explícita y no están sincronizados por E2-12.
- La política futura de archivo/tombstone de intents, CU-029, disciplina y cierre real de Temporada siguen fuera de alcance.
- El baseline de lint conserva deuda conocida ajena a E2-12.

## Resultado UAT manual y guía de retest

| Caso | Estado | Evidencia |
| --- | --- | --- |
| UAT-01 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-02 | APROBADA MANUALMENTE | El Owner sin Membresía activa no aparece: el roster representa integrantes activos, no ownership. |
| UAT-03 | APROBADA MANUALMENTE DESPUÉS DE CORRECCIÓN | A, Owner vigente sin Persona ni Membresía, abrió/canceló sin escrituras y luego confirmó sobre B; sólo se finalizó B, el roster se actualizó y A siguió como Owner sin Persona y fuera del roster. |
| UAT-04 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-05 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-06 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-07 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-08 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-09 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-10 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-11 | APROBADA MANUALMENTE | Confirmada sin observaciones. |
| UAT-12 | APROBADA MANUALMENTE | Confirmada sin observaciones. |

### Retest UAT-03 ejecutado

1. Usar A como Owner vigente del Grupo, sin Persona propia, y B como integrante activo presentable.
2. Como A, abrir `Integrantes`, comprobar que A no aparece por ownership y accionar `Finalizar Membresía` sobre B.
3. Verificar que `prepare` tenga éxito y el diálogo se abra con el nombre canónico de B.
4. Cancelar y verificar que no haya cambios en Membresía, período, guards ni intents.
5. Repetir y confirmar; verificar que sólo la Membresía de B se finalice y el roster se reconsulte.
6. Verificar que A continúe como Owner, sin Persona, sin Membresía creada y fuera del roster.

## Guía UAT de referencia

Usar exclusivamente Auth/Functions/Firestore Emulator, proyecto `demo-*`, loopback y las cuentas Google existentes:

- A: Owner vigente con Persona.
- B: integrante activo no Owner con Persona presentable.
- C: autenticado no Owner.

### Recorrido manual

1. Preparar un Grupo canónico activo con A como Owner, Temporada abierta exacta y B con Membresía activa v3 íntegra.
2. Iniciar sesión como A y abrir `/dashboard/groups/{groupId}` → `Integrantes`.
3. Confirmar que la fila propia de A no muestra acción, que B sí muestra `Finalizar Membresía de {nombre} {apellido}` y que una fila `UNAVAILABLE` no la muestra.
4. Abrir la acción de B; comprobar loading de preparación, nombre canónico y texto del diálogo.
5. Cancelar con botón y luego con Escape en una segunda apertura. Inspeccionar que no exista intent ni cambio de raíz/período/guards.
6. Abrir nuevamente y confirmar. Verificar bloqueo de doble click, anuncio de progreso, éxito y reconsulta desde la primera página; B debe desaparecer sólo tras la reconsulta.
7. Repetir la misma llamada con la misma clave en evidencia local protegida; debe devolver exactamente el mismo `finalizedAt`, sin escrituras adicionales.
8. Iniciar sesión como B y reconsultar `Grupos que integrás`; el Grupo no debe aparecer como pertenencia activa.
9. Iniciar sesión como C; la UI no debe ofrecer el control y una invocación técnica debe responder `GROUP_NOT_ACCESSIBLE`.
10. Probar teclado, trampa/retorno de foco, anuncios y layout en 360 px, 768 px y escritorio.
11. Si el flujo vigente de Solicitudes lo permite, comprobar que B puede iniciar una nueva Solicitud; no equivale a readmisión automática.

### Inspección persistente

Registrar localmente para la sesión UAT, sin publicar en UI/logs:

- `groupId`, `seasonId`, `membershipId` y el ID determinista de la pareja Persona–Grupo.
- `memberships/{membershipId}`: `estado=finalizada`, `fechaIngreso` intacta, `fechaEgreso`, resumen v3.
- `memberships/{membershipId}/validityPeriods/{periodId}`: sólo el período vigente cerrado y `endedAt` igual al timestamp raíz.
- `activeMembershipGuards/{guardId}`: ausente.
- `membershipLifecycleGuards/{guardId}`: v2, ordinal y `finalizedAt` correlacionados.
- `membershipAdministrativeFinalizationIntents/{intentId}`: schema cerrado, `consumed`, hashes y timestamps; sin clave/ref crudas ni TTL.
- Grupo, owner, Temporada, Personas, Cuenta, Solicitudes, pending guards, arrays legacy, Activity y notificaciones: sin cambios.

### Escenarios exclusivamente Emulator

1. Activa v1 → v3 y materialización/cierre del período 1.
2. Dos claves concurrentes sobre el mismo ordinal.
3. E2-10 contra E2-12.
4. E2-09 contra E2-12 y `MEMBERSHIP_REACTIVATION_SUPERSEDED`.
5. Respuesta perdida y replay histórico N después de reactivación N+1.
6. `activationRef` N con clave nueva frente a N+1, sin atribuir ordinal N+1.
7. Transferencia de ownership antes del commit y antes de retry histórico.
8. Cierre de Temporada antes/contra commit.
9. Corrupción de schemas, duplicados, cero/dos períodos abiertos, guards ausentes/cruzados/coexistentes.
10. Deny-all directo para visitante, integrante, Owner y admin global.

Estos casos no deben declararse UAT manual: se acreditan con fixtures y transacciones deterministas del Emulator.

## Versionado e integración

- Commit de implementación: `9624e1b` (`feat(e2-12): finalizar membresías administrativamente`).
- Merge no fast-forward de implementación en `dev`: `75f33cc` (`merge: integrar E2-12`).
- La rama documental contiene exclusivamente la ficha corregida, este informe y el cierre.
- Auth/UAT permanece aislada en `chore/preserve-auth-emulator-uat-changes` / `fc7135e358902a17372d44f20df50883603520ce`.
- Sin archivos eliminados, stash, deploy ni acceso a datos o servicios Firebase remotos.
- Documento 5, AUD-C05, documentos arquitectónicos y cierres anteriores permanecen sin cambios.
- E2-13 no fue iniciado, habilitado ni definido por este cierre.
