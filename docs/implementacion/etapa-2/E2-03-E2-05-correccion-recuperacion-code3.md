# Corrección E2-03/E2-05 — recuperación concurrente ante `code: 3`

## 1. Defecto

La operación `createMyMembershipForOwnedGroup` podía confirmar correctamente la unicidad persistente durante dos altas concurrentes con claves diferentes para la misma Persona–Grupo y, aun así, responder HTTP 500 con `INTERNAL_ERROR` al contendiente perdedor. La firma observada fue un error Firestore `Error` con `code: 3` numérico, una Membresía activa, un `activeMembershipGuard` único y correlacionado, y cero `membershipLifecycleGuards`.

El defecto afectaba la recuperación de la respuesta, no la cardinalidad persistente.

## 2. Alcance

La corrección se limita al límite de la transacción de creación de Membresía en `firestoreActiveMembershipGuard`. No cambia callables, contratos, DTO, schemas, reglas, índices, dependencias, lockfiles ni otros Agregados. No amplía creación, consulta, listado o finalización de Membresías.

## 3. Atribución preexistente

El defecto fue atribuido a E2-03/E2-05 antes de esta intervención. La implementación local sin commit de E2-06 no participa en el camino ejecutable del callable, su servicio, guard, repositorio, transacción, mapper, recuperación ni composición. Esta rama correctiva nació desde `origin/dev` en `d9e84d782cfaf67194a8596d6d35519b4f62e0d2` y no contiene cambios E2-06.

## 4. Diagnóstico

La evidencia histórica preservada mostró:

- operación observable `create`;
- etapa observable `transaction`, al resolver `runTransaction`;
- error estructurado `code: 3` numérico, sin clasificación por mensaje;
- respuesta HTTP 500 `INTERNAL_ERROR` de un contendiente;
- estado posterior íntegro: una Membresía activa, un active guard correlacionado y cero lifecycle guards.

La única ejecución Emulator focal de esta corrección no reprodujo `code: 3`; el caso concurrente exacto aprobó y mantuvo cardinalidad y correlación. Por ello no se atribuye una operación interna más específica sin evidencia. La intervención usa el límite técnico comprobado de `runTransaction`, no texto libre ni una etiqueta especulativa.

Este incidente se distingue del incidente E2-05 ya documentado en `finalized-membership-query`: aquel error estaba etiquetado privadamente mediante `WeakMap` y provenía de una consulta pendiente sobre una transacción cerrada. La firma actual llegó sin esa etiqueta al límite transaccional, por lo que no se declara que ambos incidentes tengan la misma operación causal sólo por compartir `code: 3`.

## 5. Límite técnico exacto

El reconocimiento de `code: 3` existe como función privada y se invoca exclusivamente desde el `catch` de `confirmActiveMembership`, después de que `db.runTransaction` rechaza. No fue agregado a `isMembershipContention`, `isAmbiguousTransactionFailure`, `mapInfrastructureError`, clasificadores de disponibilidad, mappers públicos ni otros módulos.

Los errores `code: 3` producidos durante la relectura autoritativa no se absorben ni vuelven a clasificar como éxito.

## 6. Corrección

Ante `code: 3` en ese límite estrecho se ejecuta `resolveAfterContention` fuera de la transacción fallida, conservando el error original como `unconfirmedError`. La recuperación delega en `membershipLifecycleGuard.getForOwner`, que abre una transacción nueva y read-only; no reutiliza la transacción cerrada y no escribe ni repara estado.

## 7. Condiciones estrictas de recuperación

La relectura exige ownership vigente y valida autoritativamente:

- exclusión mutua entre active guard y lifecycle guard;
- schema y versión exactos del guard;
- una única Membresía activa para Persona–Grupo;
- correlación exacta de `membershipId`, `personId`, `groupId`, `seasonId` y estado;
- hashes de idempotencia y request compatibles;
- ausencia de lifecycle guard incompatible.

Sólo después de esas comprobaciones se permiten los outcomes ya existentes:

- misma intención y mismo request: `EXISTING_IDEMPOTENT`;
- otra intención con una activa íntegra: `MEMBERSHIP_ALREADY_EXISTS`;
- misma clave con request incompatible: `IDEMPOTENCY_CONFLICT`;
- lifecycle íntegro: `MEMBERSHIP_REACTIVATION_REQUIRED`.

## 8. Casos que conservan error

Ausencia de estado confirmatorio relanza exactamente el `code: 3` original, que continúa sanitizándose como `INTERNAL_ERROR`. Estado parcial, duplicados, guard huérfano o no correlacionado y schemas incompatibles fallan cerrados con el error estable de incompatibilidad. Una dependencia caída o un nuevo `code: 3` durante la relectura conserva el fallo de esa operación. Códigos diferentes no ingresan en esta recuperación.

No existe reparación, adopción, borrado o escritura compensatoria.

## 9. Pruebas

Se agregaron pruebas deterministas en `membershipGuard.test.js` para:

- `code: 3` en el límite transaccional con la misma intención confirmada;
- otra intención ganadora;
- ausencia de estado;
- estado parcial;
- guard no correlacionado;
- duplicados autoritativos;
- código distinto no reclasificado;
- `code: 3` de la relectura no absorbido;
- cardinalidad y correlación reales mediante el coordinador lifecycle productivo.

Las pruebas Emulator existentes comprobaron además respuesta perdida posterior al commit, concurrencia con claves iguales y diferentes, exactamente una Membresía activa, exactamente un active guard correlacionado y cero lifecycle guards. Se usan proyecto `demo-sportexa-e0-02`, loopback, datos sintéticos, IDs registrados y cleanup limitado.

## 10. Resultados de gates

- sintaxis focal: 2/2 archivos;
- unitarias focales de guard: 19/19;
- Emulator focal de Membresía: 18/18;
- caso concurrente exacto: aprobado dentro de la focal;
- unitarias completas: 205/205;
- Emulator Suite completa, una ejecución: 94/94;
- mantenimiento/reglas: 7/7;
- typecheck: aprobado;
- build: aprobado, 21/21 páginas estáticas;
- lint baseline: aprobado con 39 errores y 9 warnings históricos; 6 hallazgos resueltos respecto del baseline;
- `quality:diff` y `git diff --check`: aprobados.

Advertencias históricas no tratadas como fallos: perfil PowerShell sin `fnm`, imposibilidad de consultar MOTD/config remota del Firebase CLI por red bloqueada, SDK de Functions antiguo para Extensions, `Snapshot has no readTime`, datos Browserslist/caniuse-lite desactualizados y avisos LF/CRLF. Ninguna alteró el exit code de un gate aprobado.

El primer intento de build fue invalidado porque Turbopack no acepta un junction de `node_modules` fuera del root del worktree. Un segundo intento alcanzó prerender y evidenció que el worktree no hereda `.env` ignorado. El build válido se ejecutó con una copia local ignorada de dependencias existentes y configuración Firebase sintética `demo-*`, sin red ni cambios de dependencias.

## 11. Ausencia de cambios funcionales E2-06

El repositorio principal permaneció en `feat/e2-06-group-join-request`, HEAD `d9e84d782cfaf67194a8596d6d35519b4f62e0d2`, sin cambio de rama, stash, indexado o modificación intencional de sus archivos E2-06. La corrección se desarrolló íntegramente en el worktree hermano `projectoVoley-e2-03-code3-fix` sobre `fix/e2-03-membership-code3-recovery`.

## 12. Operaciones externas

No hubo deploy ni acceso a Firebase remoto. Los emuladores se ejecutaron exclusivamente sobre proyecto `demo-*` y loopback y fueron detenidos por sus runners. No se modificaron dependencias ni lockfiles.

## 13. Deuda residual

No se identificó la operación interna exacta que originó la nueva forma no etiquetada de `code: 3`, porque no reapareció en la única ejecución diagnóstica permitida. La recuperación queda deliberadamente condicionada a una relectura completa e íntegra; cualquier ausencia o corrupción conserva el fallo. Esta limitación es deuda diagnóstica, no una ampliación de outcomes ni una afirmación de éxito sin evidencia.
