# E2-20 — Informe de implementación

## Estado y alcance

- Rama: `feat/e2-20-group-name-edit`.
- Base y HEAD de la sesión: `74695773f4f179573cea413446cf372b7fbf2945`.
- Caso: CU-012, reemplazo mínimo y exclusivo de `groups/{groupId}.nombre`.
- No se implementaron configuración, archivo, eliminación, transferencia de ownership, cambios de deporte, Membresías ni capacidades E2-21–E2-24.
- Durante implementación y UAT no hubo Firebase remoto, deploy, commit, push ni merge. El versionado e integración se realizan en una intervención posterior autorizada y no constituyen cierre formal.
- La ficha `E2-20-ficha-edicion-minima-grupo.md` y los Documentos 1–5 permanecieron intactos.

## Implementación

`getOwnGroup({ groupId })` entrega el Grupo Owner-scoped y un token opaco SHA-256 que liga, con encoding length-prefixed y namespace E2-20, `contract-v1`, `groupId`, `ownerId` y el nombre canónico vigente. El token no se persiste ni se expone en listados.

`updateOwnGroupName` recibe exclusivamente `groupId`, `nombre`, `expectedEditToken` e `idempotencyKey`. El backend normaliza NFC, recorta extremos, colapsa whitespace, rechaza controles y valida entre 1 y 80 puntos de código. La transacción lee Cuenta, Grupo y ownership vigente antes del receipt. Sólo después autoriza recovery o compara el token.

Un `UPDATED` nuevo ejecuta exactamente un update por field path de `nombre` y crea el receipt determinista en la misma transacción. `NO_CHANGES`, stale, recovery y errores escriben cero documentos. El receipt cerrado conserva actor, Grupo, hash del request normalizado, nombre aplicado, outcome y timestamp autoritativo; no persiste claves crudas, tokens, snapshots ni nombre anterior.

La UI de detalle Owner-scoped recarga `getOwnGroup` al abrir, precarga nombre/token, aplica dirty state normalizado, intención estable para retry, single-flight, stale con refresh explícito, foco, Escape, trap de teclado y navegación segura al perder ownership. No depende de Persona o Membresía y no importa Firestore para editar.

El trigger legacy `onGroupPendingAlertsSync` se invoca técnicamente ante el update de Grupo, pero retorna sin efectos para schema v1; no produce escrituras indirectas E2-20.

## Auditoría adversarial y correcciones

La revisión independiente detectó y corrigió dos defectos dentro del alcance:

1. `getOwnGroup` distinguía Grupo inexistente (`NOT_FOUND`) de Grupo ajeno (`NOT_AUTHORIZED`). Al ser la lectura que entrega el token de edición, permitía enumeración. Ambos casos ahora convergen en `GROUP_NOT_ACCESSIBLE`, con cobertura unitaria y Emulator.
2. Ante pérdida de ownership, el diálogo cerraba y navegaba pero el detalle podía conservar contenido Owner-scoped durante la transición. El callback ahora limpia inmediatamente el Grupo, retira controles y secciones, conserva el anuncio y navega a la lista.

El gate integral previo al versionado detectó además que la corrección de no enumeración había dejado una expectativa Emulator E2-01 antigua y que el adaptador consumido por Membresía todavía traducía sólo `NOT_AUTHORIZED`. Se actualizó la regresión para esperar `GROUP_NOT_ACCESSIBLE` tanto ante Grupo ajeno como inexistente y se adaptó ese borde para conservar el contrato público `NOT_AUTHORIZED` de Membresía. La primera corrida integral quedó en `203/210`; después de la corrección, la repetición integral aprobó `210/210`. Este ajuste no cambió la UI ni el comportamiento UAT de E2-20, por lo que no exigió repetir la UAT manual.

No se comprobaron otros defectos funcionales durante la UAT.

## Evidencia automatizada

Gates completos recibidos antes de la auditoría, no repetidos íntegramente después de las correcciones focales:

- unitarias completas: `337/337`;
- Emulator completo: `210/210`;
- sintaxis completa: `303/303`;
- TypeScript, build, lint baseline y `quality:stage0`: aprobados.

Gates ejecutados durante la auditoría y correcciones:

- unitarias focales finales: `24/24`;
- Emulator focal E2-20 final: `11/11`;
- TypeScript: aprobado;
- lint baseline: aprobado, sin deuda nueva;
- sintaxis focal: aprobada;
- `git diff --check`: aprobado.

El Emulator focal cubre contrato cerrado, no enumeración en lectura y comando, Cuenta obligatoria, Owner sin Persona/Membresía, field path exclusivo, receipt cerrado, `NO_CHANGES`, clave reutilizable, stale antes de no-op, carreras con claves iguales/distintas, recovery histórico, conflicto de idempotencia, transferencia y revocación de recovery, retry de creación E2-01, Grupo/receipt incompatibles y Rules deny-all.

Gate integral final sobre el diff a versionar, ejecutado después de todas las correcciones:

- lint baseline: aprobado; `36` errores y `9` warnings conocidos, sin deuda nueva, y `9` hallazgos resueltos respecto del baseline;
- TypeScript: aprobado;
- sintaxis completa: `303/303`;
- unitarias completas: `337/337`;
- Emulator Suite completa y aislada: `210/210`;
- build de producción: aprobado;
- `git diff --check`: aprobado.

La Emulator Suite usó proyecto `demo-*`, workspace/configuración temporales, hosts loopback, secretos sintéticos y proxies bloqueados. No accedió a Firebase remoto.

## Inventario versionado

- Informe: `docs/implementacion/etapa-2/E2-20-informe-implementacion.md`.
- Frontend: detalle Owner-scoped, servicio/tipos de Grupo y `EditGroupNameDialog.tsx`.
- Backend Grupo: export callable, contrato, errores, hashing, servicio, dominio, repositorio, composición, callable, store transaccional y receipts E2-20.
- Compatibilidad interna: `membershipExternalContexts.js`, para conservar el reason público de Membresía ante el nuevo error no enumerable de Grupo.
- Seguridad: `firestore.rules`, con receipts deny-all.
- Pruebas y runner: unitarias de contrato/dominio/servicio/E2-20/arquitectura; Emulator E2-01 y E2-20; runner Emulator.

No se versionan datos persistidos de UAT, secretos, credenciales, logs, builds ni artefactos generados. Los identificadores sintéticos consignados abajo pertenecen únicamente a la evidencia documental de la UAT local.

## UAT manual local

### Entorno

- Proyecto sintético: `demo-sportexa-e2-20-uat`.
- Frontend: `http://127.0.0.1:3000`.
- Emulator UI: `http://127.0.0.1:4000`.
- Auth: `127.0.0.1:9099`.
- Firestore: `127.0.0.1:8080`.
- Functions: `127.0.0.1:5001`.
- Grupo: `e2-20-uat-group`.
- Owner sintético sin Persona ni Membresía: `owner.e220.uat@example.test`.
- Usuario no Owner sintético: `outsider.e220.uat@example.test`.

La preparación se realizó con Auth Emulator y un helper temporal de Admin SDK obligado a hosts loopback y al project ID `demo-*`. No se relajaron Rules ni se usó Emulator UI para fabricar estados. La transferencia usada para UAT fue una mutación controlada del fixture y se restauró al Owner original al terminar el escenario.

### Matriz observada

| Escenario | Resultado | Evidencia manual y persistente |
| --- | --- | --- |
| 1. Owner sin Persona/Membresía abre detalle | `OK` | Vio nombre vigente, `Editar nombre`, único campo precargado y secciones compatibles. |
| 2. No Owner y Grupo inexistente | `OK` | Ambas URLs mostraron el mismo mensaje `Ya no tenés acceso a este Grupo.` y ningún dato Owner-scoped. |
| 3. No-op normalizado | `OK` | `Guardar` permaneció deshabilitado; inspección posterior: cero receipt nuevo y raíz intacta. |
| 4. Cancelar y Escape | `OK` | Cerraron sin escritura y el foco volvió a `Editar nombre`; cero receipt nuevo. |
| 5. Teclado y foco | `OK` | Foco inicial en Nombre; Tab/Shift+Tab permanecieron dentro del diálogo con Guardar habilitado y deshabilitado. |
| 6. Doble activación | `OK` | El primer envío bloqueó inmediatamente el botón. Las tres ediciones posteriores observadas fueron decisiones humanas distintas, no duplicados. |
| 7. Rename y relecturas | `OK` | Detalle, F5 y lista mostraron el nombre vigente; membresías e historial cargaron normalmente. |
| 8. Dos sesiones y stale | `OK` | Sesión A confirmó; sesión B permaneció abierta, recargó el nombre autoritativo y no sobrescribió. Stale creó cero receipts. Una decisión nueva posterior confirmó normalmente. |
| 9. Pérdida de ownership | `OK` | El envío preparado fue rechazado, navegó a `/dashboard/groups`, retiró datos/controles y la lista quedó sin Grupos para el ex Owner. Nombre y receipts permanecieron intactos. |
| 10. Compatibilidad visible | `OK` | Temporadas, Membresía propia, roster, Solicitudes, tarjeta, membresías actuales e historial cargaron sin error. |
| Anuncio con lector de pantalla | `NO EJECUTADO` | La confirmación vive en una región `sr-only aria-live`; no se usó tecnología asistiva y no se atribuye observación visual inexistente. |

### Inspección persistente

La raíz final conservó `deporte: voleibol`, `estado: activo`, `schemaVersion: 1`, `createdAt` y el Owner restaurado. Sólo varió `nombre`, finalmente `Grupo UAT Sesión B Confirmado`. No aparecieron `updatedAt`, tokens ni metadata adicional.

Se observaron cinco receipts cerrados, uno por cada edición humana confirmada durante la sesión. Cancelar, no-op, stale y pérdida de ownership no agregaron receipts. El intento `No debe confirmarse` nunca se aplicó.

## Clasificación de evidencia

- **UAT manual:** presentación, navegación, precarga, dirty state, bloqueo visible, recarga, no enumeración visible, stale, pérdida de ownership, foco y teclado.
- **Inspección persistente local:** raíz, campos preservados, cantidad y schema de receipts, cero receipts para caminos sin efecto.
- **Pruebas/Emulator:** pérdida de respuesta y recovery, corrupción, fallos de dependencias, carreras deterministas, ambos órdenes serializables, cardinalidad técnica, Rules y regresiones profundas.
- **No ejecutado manualmente:** lector de pantalla real, corrupción, pérdida artificial de respuesta y Firebase remoto.

No se atribuyen a la UAT manual garantías observadas únicamente mediante código, tests, Emulator o inspección persistente.

## Estado documental

Este archivo documenta implementación, revisión y UAT; no constituye cierre formal de E2-20, no crea `E2-20-cierre.md`, no cierra E2-14 ni la Etapa 2, y no habilita E3 ni inicia E2-21.
