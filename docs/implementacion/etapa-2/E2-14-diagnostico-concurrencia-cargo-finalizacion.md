# E2-14 — Diagnóstico de concurrencia entre cargo y finalización

## 1. Estado y conclusión

- **Fecha:** 2026-10-06.
- **Base investigada:** `dev` en `7565ad93674c2139655ca918c91317f6f09e8fda`.
- **Antecedente preservado:** `E2-14-informe-auditoria-final-etapa-2.md`, sin seguimiento y sin modificaciones.
- **Incidente recibido:** Emulator integral `230/232`, con un único escenario causal fallido y el fallo derivado de su suite padre.
- **Resultado del diagnóstico:** el incidente no se reprodujo en tres corridas focales ni en una corrida integral acotada. La evidencia disponible no conserva el error Firestore original de la corrida roja y no permite atribuir una causa raíz concreta.
- **Corrección:** no se preparó una corrección de producto, prueba ni runner. Hacerlo habría supuesto elegir una causa no demostrada o debilitar el escenario.
- **Estado:** E2-14 y Etapa 2 permanecen abiertas; E3 permanece deshabilitada.

`CAUSA NO DETERMINADA — BLOQUEO E2-14 CONSERVADO`

## 2. Preflight

| Control | Resultado |
| --- | --- |
| Repositorio | `C:/Users/Rodolfo/Documents/projectoVoley` |
| Rama | `dev` |
| HEAD | `7565ad93674c2139655ca918c91317f6f09e8fda` |
| Upstream | `origin/dev` |
| Divergencia inicial | `+0/-0` |
| Índice | limpio |
| Árbol tracked inicial | limpio |
| Único cambio inicial | informe final E2-14 sin seguimiento |
| Stashes | ninguno |
| Auth/UAT | referencia aislada `fc7135e358902a17372d44f20df50883603520ce`, no modificada ni usada como evidencia |

Los puertos declarados por el runner no tenían listeners al iniciar. La consulta adicional de líneas de
comando de procesos mediante CIM fue denegada por Windows y no se presenta como verificación exitosa.
Las ejecuciones Emulator fueron secuenciales; no se inició otra mientras existía una sesión activa.

## 3. Escenario y contratos esperados

El escenario afectado está en
`volley-ranking-system/functions/test/emulator/membershipCargoE2.test.js`, subtest
`edición y finalización concurrentes serializan y nunca pierden un cargo confirmado`.
Parte de una Membresía v1 activa y correlacionada, prepara ambas operaciones y lanza en paralelo:

1. `updateMembershipCargoForOwnedGroup`, con cargo `Delegado`, token de edición y clave propia;
2. `finalizeActiveGroupMemberForOwnedGroup`, con la referencia de activación preparada y clave propia.

Los órdenes serializables válidos son:

| Orden | Resultado de cargo | Resultado de finalización | Estado final |
| --- | --- | --- | --- |
| Cargo antes de finalización | `UPDATED` | `MEMBERSHIP_FINALIZATION_CONFIRMED` | raíz finalizada que conserva `cargo: "Delegado"` |
| Finalización antes de cargo | `TARGET_MEMBERSHIP_NOT_ACTIVE` | `MEMBERSHIP_FINALIZATION_CONFIRMED` | raíz finalizada sin campo `cargo` |

El test acepta ambos resultados contractuales para cargo y exige que la finalización confirme. No se
relajó esa exigencia ni se omitió el escenario.

## 4. Lecturas y escrituras transaccionales

### 4.1 Edición de cargo

`firestoreMembershipCargoStore.execute()` lee, en este orden lógico:

1. `users/{actorUserId}` para Cuenta;
2. `groups/{groupId}` para ownership, incluso en recovery histórico;
3. `memberships/{membershipId}`;
4. `membershipCargoUpdateReceipts/{receiptId}`;
5. `activeMembershipGuards/{groupId-personId}` y
   `membershipLifecycleGuards/{groupId-personId}`;
6. query de `memberships` activas por Persona–Grupo;
7. para una raíz legacy, período determinista 1 y query de períodos abiertos bajo la Membresía;
8. `openSeasonGuards/{groupId}`, `seasons/{seasonId}` y query de Temporadas abiertas del Grupo.

Si confirma una modificación, escribe en el mismo commit:

- `memberships/{membershipId}`, elevando la raíz v1 a v5 legacy y conservando invariantes;
- `membershipCargoUpdateReceipts/{receiptId}` mediante `create`.

Un no-op no escribe. Si la finalización ganó antes de la relectura válida, la operación falla con
`TARGET_MEMBERSHIP_NOT_ACTIVE` y no crea receipt.

### 4.2 Finalización administrativa

`firestoreMembershipAdministrativeFinalizationStore.execute()` lee:

1. `users/{actorUserId}`;
2. `groups/{groupId}`;
3. la Persona propia del actor, si la Cuenta la referencia;
4. `membershipAdministrativeFinalizationIntents/{intentId}`;
5. `memberships/{membershipId}`;
6. `personas/{targetPersonId}`;
7. `activeMembershipGuards/{groupId-personId}` y
   `membershipLifecycleGuards/{groupId-personId}`;
8. período determinista 1, query de períodos abiertos y query de Membresía activa Persona–Grupo;
9. `openSeasonGuards/{groupId}`, `seasons/{seasonId}` y query de Temporadas abiertas del Grupo.

Para la raíz v1 del escenario, el commit exitoso:

- finaliza `memberships/{membershipId}` y la eleva a v5 legacy adaptada;
- crea y cierra `memberships/{membershipId}/validityPeriods/{periodId-1}`;
- elimina el active guard;
- crea el lifecycle guard finalizado v3;
- crea el intent terminal con outcome `MEMBERSHIP_FINALIZATION_CONFIRMED`.

Ambas transacciones comparten Cuenta, Grupo, raíz, active guard, lifecycle guard, query de activas y
contexto de Temporada. La raíz es un punto de escritura común. Firestore debe abortar/reintentar una
instantánea que haya quedado obsoleta; no existe un orden válido en el que ambas confirmen sobre la
misma versión y se pierda el cargo.

## 5. Retries, deadlines y mapeo observado

- El SDK instalado es `@google-cloud/firestore 6.8.0` mediante `firebase-admin 11.11.1`.
- `runTransaction` usa por defecto `DEFAULT_MAX_TRANSACTION_ATTEMPTS = 5`; ambos stores lo invocan sin sobrescribir `maxAttempts`.
- Tanto cargo como finalización ejecutan una segunda llamada completa a `execute()` si el primer límite transaccional termina en contención estructurada (`10`/`ABORTED`, también `6`/`ALREADY_EXISTS`) o fallo ambiguo (`2`/`UNKNOWN`, `13`/`INTERNAL`). Por ello puede haber hasta dos bloques de cinco intentos del SDK, aunque la corrida roja no registró cuántos ocurrieron realmente.
- No hay timeout propio en el `fetch` del fixture ni deadline configurado por estas callables o por el comando Node del runner. En el incidente recibido la callable respondió con un `HttpsError` propio después de aproximadamente 10 segundos; no fue un timeout del cliente o del proceso de pruebas.
- `mapError()` de finalización conserva los `MembershipError` y convierte errores de dominio incompatibles a `INCOMPATIBLE_STATE`, pero convierte cualquier otro error técnico a `MembershipDependencyUnavailableError`. El callable lo expone como HTTP `unavailable` con reason `DEPENDENCY_UNAVAILABLE`.

Por ese mapeo amplio, `DEPENDENCY_UNAVAILABLE` prueba que un error técnico salió de la segunda
ejecución, pero no identifica su código. La corrida roja anterior no emitió la causa estructurada y
el workspace temporal del runner fue eliminado al finalizar. El error original exacto es, por tanto,
**no recuperable con la evidencia conservada**.

Existe evidencia histórica en E2-03 de que el mismo Emulator puede producir un `Error` numérico
`code: 10` con mensaje local `Transaction lock timeout` ante lecturas/escrituras concurrentes. Esa
evidencia demuestra que la forma técnica es posible y que el clasificador actual la reconoce; no
demuestra que ése haya sido el error original de esta corrida E2-14.

## 6. Fixtures, teardown y diferencias focal/integral

- El runner crea un workspace y configuración temporales, obliga el proyecto
  `demo-sportexa-e0-02`, usa loopback, secretos sintéticos y proxies externos bloqueados.
- El comando Node usa `--test-concurrency=1`; las suites no se ejecutan en paralelo. La concurrencia
  entre cargo y finalización existe únicamente dentro del subtest mediante `Promise.all`.
- Los IDs `e2-22a-*` no aparecen en otras suites. Las queries compartidas del escenario están
  restringidas al par Persona–Grupo y a su Grupo/Temporada, por lo que no se comprobó una colisión
  nominal con fixtures ajenos.
- `createFirestoreFixtureRegistry` elimina sólo referencias registradas. El fixture E2-22A registra
  las semillas, pero no registra al final todos los receipts, intents y subdocumentos creados por las
  callables. Esos documentos pueden permanecer hasta que se apaga el Emulator de esa corrida. En el
  escenario fallido sus IDs son propios y no se encontró una consulta que los confunda con la carrera;
  se registra como diferencia de higiene/carga, no como causa demostrada.
- Una corrida focal inicia emuladores nuevos y ejecuta sólo E2-22A. La integral mantiene el mismo
  proceso Emulator para 27 archivos secuenciales, por lo que llega a E2-22A con más actividad previa,
  workers calientes, documentos que cada teardown haya conservado y posibles triggers ya disparados.
  No hay telemetría de CPU/memoria ni logs causales de la corrida roja para atribuir saturación.

## 7. Hipótesis y evidencia

| Hipótesis | Evidencia a favor | Evidencia en contra o límite | Estado |
| --- | --- | --- | --- |
| Contención legítima entre ambas operaciones | Comparten varias lecturas y escriben la misma raíz; el SDK reconoce `ABORTED`; las corridas verdes muestran demoras de 2–3,5 s propias de serialización/retry | No se capturó el código de la corrida roja | Plausible, no demostrada como causa |
| Conflicto adicional de fixtures/suites | La integral acumula actividad y algunos outputs E2-22A no se registran para cleanup | IDs E2-22A exclusivos, queries acotadas, suites secuenciales y nueva integral verde | No demostrado |
| Timeout de callable o runner | Duración aproximada de 10 s del incidente | Hubo respuesta callable contractual; fixture y runner no fijan ese timeout | Refutada para timeout de cliente/runner; deadline interno no identificado |
| Saturación de recursos | Sólo falló la integral recibida | Sin métricas; una integral posterior de 343 s aprobó completa | Posible, sin evidencia causal |
| Defecto de producto | El mapeo amplio oculta la causa técnica y la finalización no confirmó en una corrida | Cuatro reproducciones limpias aprobaron; no hubo corrupción ni fallo determinista | No demostrado |
| Defecto de prueba | El caso depende de una carrera real no sincronizada y el cleanup no registra todos los outputs | La assertion representa los dos órdenes funcionales válidos y no debe debilitarse | Riesgo de estabilidad, no causa demostrada |

## 8. Reproducciones y evidencia de ejecución

Antes de ejecutar se fijó un máximo de tres focales y una integral. No se repitió hasta obtener verde.
Un primer lanzamiento dentro del sandbox falló antes de iniciar Node con `EPERM` al hacer `lstat` de
`C:/Users/Rodolfo`; no inició emuladores y no cuenta como reproducción del producto.

| Ejecución válida | Alcance | Resultado | Carrera cargo/finalización |
| ---: | --- | --- | --- |
| 1 | focal E2-22A | `7/7`, exit 0 | finalización 2151 ms; cargo 2855 ms; subtest 3214 ms |
| 2 | focal E2-22A | `7/7`, exit 0 | finalización 2158 ms; cargo 3530 ms; subtest 3918 ms |
| 3 | focal E2-22A | `7/7`, exit 0 | finalización 2179 ms; cargo 2803 ms; subtest 3212 ms |
| 4 | Emulator integral secuencial | `232/232`, exit 0; 343285 ms | escenario aprobado; no apareció bloque de error instrumentado |

La instrumentación temporal agregada al límite de la transacción registraba exclusivamente operación,
intento, código, tipo, clase, nombre y mensaje técnico. No registraba tokens, payloads, claves, hashes,
UIDs, PII ni snapshots. No se activó ningún bloque de error en las cuatro ejecuciones válidas y fue
retirada por completo. El runner diagnóstico filtró y conservó duraciones/TAP, pero no timestamps de
pared por evento; no se inventan timestamps ausentes.

La integral verde demuestra únicamente el resultado de esa corrida. No convierte la ausencia de
reproducción en una explicación causal de la integral roja recibida.

## 9. Cambios y gates

### Cambios permanentes

- Este documento de diagnóstico.
- Ningún cambio de producto, prueba, runner, Rules, índices, contratos, normativa o cierre histórico.

No se creó rama de corrección porque no se identificó un defecto causal comprobable. No se agregó una
regresión artificial: sin una causa, sólo habría codificado la conducta ya cubierta o una simulación no
atribuible al incidente.

### Gates ejecutados en esta intervención

| Gate | Resultado |
| --- | --- |
| Emulator focal E2-22A, corrida 1 | `7/7`, exit 0 |
| Emulator focal E2-22A, corrida 2 | `7/7`, exit 0 |
| Emulator focal E2-22A, corrida 3 | `7/7`, exit 0 |
| Emulator integral, secuencial y aislado | `232/232`, exit 0 |

No se ejecutaron unitarias, mantenimiento, sintaxis, lint, typecheck, build, UAT, deploy ni Firebase
remoto en esta intervención. Sus resultados del informe de auditoría son antecedentes y no se
reatribuyen como ejecuciones nuevas.

## 10. UAT, servicios y estado Git

- Auth/UAT permaneció aislada e intacta; no se repitió UAT ni se usó su rama como evidencia.
- Todas las ejecuciones usaron datos sintéticos y proyecto `demo-*`.
- Los runners detuvieron Functions, Firestore, Auth, Eventarc, Tasks, hub y logging al finalizar.
- La instrumentación temporal fue retirada y sus dos archivos recuperaron exactamente los blobs de
  `HEAD`.
- No se hizo stage, commit, push, merge, stash, reset, clean ni deploy.

Estado Git después de la validación:

- rama `dev`, HEAD `7565ad93674c2139655ca918c91317f6f09e8fda`;
- upstream local `origin/dev`, divergencia `+0/-0`;
- índice vacío y árbol tracked limpio;
- sin stashes;
- exactamente dos archivos sin seguimiento: el informe fallido recibido y este diagnóstico;
- ningún listener en los puertos Emulator verificados después de las ejecuciones.

## 11. Siguiente paso

El bloqueo no debe levantarse a partir de una sola integral verde posterior. Para una nueva repetición
final de E2-14 se necesita primero una decisión técnica sobre cómo conservar observabilidad causal en
el límite de transacción durante el gate —sin exponer datos sensibles ni cambiar el contrato— y ejecutar
una corrida final que archive el error estructurado si reaparece. Si se obtiene un código y estado
post-fallo reproducibles, corresponde corregir producto, prueba o runner según esa evidencia y agregar
la regresión específica. Si se acepta cerrar la incertidumbre sólo mediante una matriz de estabilidad,
la cantidad de corridas y su criterio deben aprobarse expresamente; no se infieren de estas cuatro.

Hasta entonces:

`CAUSA NO DETERMINADA — BLOQUEO E2-14 CONSERVADO`
