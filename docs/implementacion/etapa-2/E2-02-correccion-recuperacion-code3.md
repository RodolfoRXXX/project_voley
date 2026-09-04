# E2-02 — Corrección de recuperación concurrente `code: 3`

## Defecto y atribución

En `createAndOpenSeason`, dos intenciones concurrentes distintas para el mismo Grupo podían dejar correctamente una única Temporada abierta y su `openSeasonGuard`, pero el contendiente perdedor recibía `INTERNAL_ERROR`. Firestore entregaba `code: 3` al resolver el límite de `runTransaction`, después de que el estado ganador ya estuviera confirmado. El defecto era preexistente en E2-02 y no involucraba cambios de E2-06.

## Alcance y causa técnica

La corrección se limita a `firestoreOpenSeasonGuard.confirmOpenSeason`. `code: 3` no se agregó a clasificadores genéricos, mappers públicos ni otros módulos. El problema estaba en la ausencia de recuperación ante una respuesta transaccional ambigua: la persistencia podía haber convergido, pero el resultado no se reconstruía desde estado autoritativo.

## Recuperación estrecha

Sólo cuando un error numérico o textual `3`, incluso envuelto en `cause`, sale de la transacción de apertura se ejecuta una relectura fuera de esa transacción. La relectura exige:

- Grupo existente, coincidente y todavía owned por el actor;
- guard con esquema exacto, `guardVersion: 1`, hashes SHA-256 y timestamp válido;
- exactamente una Temporada con `groupId` coincidente y `estado == "abierta"`, consultada con límite 2;
- schema de Temporada válido y correlación exacta `Grupo–Temporada–guard`;
- comparación de `idempotencyKeyHash` y `requestHash` persistidos con la intención recibida.

Si la misma intención está confirmada devuelve `EXISTING_IDEMPOTENT`. Si otra intención íntegra ganó, devuelve el error contractual `OPEN_SEASON_ALREADY_EXISTS`. Una misma clave con otro request hash conserva `IDEMPOTENCY_CONFLICT`.

Ante ausencia, estado parcial, duplicados, guard huérfano o incorrecto, correlación inválida, Grupo incompatible o fallo de relectura, se conserva el error transaccional original; el servicio continúa sanitizándolo como `INTERNAL_ERROR`. No existe reparación automática ni afirmación de éxito sin evidencia completa.

## Pruebas

Se agregaron pruebas unitarias deterministas para misma intención confirmada, otra intención ganadora, respuesta perdida, ausencia, estado parcial, guard incorrecto, duplicados, conflicto de request hash, código distinto, error envuelto y fallo de relectura. El runner admite `E2_02_FOCAL=1` para ejecutar exclusivamente `seasonE2.test.js`.

Resultados:

- sintaxis Functions: `210/210`;
- unitarias focales de guard: `10/10`;
- Emulator focal Temporada: `11/11`;
- unitarias completas: `212/212`;
- Emulator Suite completa: `94/94`;
- `quality:diff`: aprobado;
- `git diff --check`: aprobado.

La primera invocación de unitarias completas se interrumpió porque el worktree no tenía el junction local a dependencias frontend. Tras preparar ese enlace mecánico, la ejecución canónica aprobó; no se modificaron dependencias ni lockfiles.

## Exclusiones

No se modificaron la ficha ni documentos históricos de E2-02, E2-03, E2-05 o E2-06. No se cambió código funcional de E2-06, no hubo deploy y todos los Emulator tests usaron proyecto `demo-*`, loopback y datos sintéticos. No se accedió a Firestore remoto.

## Deuda residual

La recuperación depende deliberadamente de una relectura adicional sólo ante `code: 3`. Cualquier estado que no demuestre cardinalidad y correlación completas continúa fallando cerrado y requiere diagnóstico separado; no se intenta sanear corrupción.
