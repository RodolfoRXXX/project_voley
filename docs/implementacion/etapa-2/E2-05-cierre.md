# E2-05 — Cierre formal

## 1. Identificación

- Incremento: `E2-05 — Finalización explícita de la Membresía propia del Owner`.
- Ficha normativa: `docs/implementacion/etapa-2/E2-05-ficha-finalizacion-membership-owner-self.md`.
- Informe: `docs/implementacion/etapa-2/E2-05-informe-implementacion.md`.
- Rama de implementación: `feat/e2-05-finalize-owner-membership`.
- Rama de cierre: `docs/e2-05-cierre`.
- Base autorizada: `da5db2ecd49bd59f56fbb52ef735f2bfe3b4d824`.
- Commit de implementación: `d8cfd4ed5eb7d65102051cfa59202c05b42714be`.
- Merge de implementación en `dev`: `0f57426234013aab91f6e6c3f911a257f3edbb3e`.
- Padres del merge: `da5db2ecd49bd59f56fbb52ef735f2bfe3b4d824` y `d8cfd4ed5eb7d65102051cfa59202c05b42714be`.

## 2. Objetivo y estado final

E2-05 habilita al Owner vigente de un Grupo v1 activo a finalizar explícitamente la Membresía de su propia Persona para la Temporada exacta abierta. La implementación, las pruebas automatizadas, la UAT y la integración en `dev` quedaron aprobadas. El corte está publicado en `origin/dev` mediante el merge de implementación indicado arriba.

## 3. Alcance implementado

- Callable público `finalizeMyMembershipForOwnedGroup({ groupId })`.
- Outcomes `FINALIZED` y `ALREADY_FINALIZED`.
- Membresía activa v1 y finalizada v2 como unión estricta.
- Transición atómica de la misma Membresía.
- Eliminación del active guard y creación del lifecycle guard correlacionado.
- Evolución acotada de CU-025 para impedir recreación después de finalizar.
- Consulta owner-scoped compatible con activa, finalizada o ausencia.
- Frontend canónico de finalización en `OwnMembershipSection`.
- Reglas deny-all para `membershipLifecycleGuards`.
- Observabilidad sanitizada, pruebas unitarias, Emulator y UAT.

## 4. Exclusiones preservadas

No se implementaron salida general, terceros, roster, roles, motivos, reactivación, renovación, cierre de Temporada ni CU-028/CU-029. Tampoco se migraron activas existentes, se escribieron arrays legacy o se cambió el contrato de `listMyCurrentGroupMemberships`.

## 5. Transición de Membresía

La activa v1 conserva exactamente Persona, Grupo, Temporada, `estado: "activa"`, `fechaIngreso`, `createdAt` y `schemaVersion: 1`, sin `fechaEgreso`. La finalizada v2 conserva identidad y referencias, cambia a `estado: "finalizada"`, agrega `fechaEgreso` y usa `schemaVersion: 2`.

El dominio rechaza campos extra, versiones cruzadas, timestamps inválidos y una segunda mutación. `fechaEgreso` no puede anteceder a `fechaIngreso`. La transición no crea otra Membresía ni altera Persona, Grupo o Temporada.

## 6. Ownership preservado y autorización

Finalizar la Membresía no transfiere ni elimina ownership. El actor se deriva sólo del UID del token y de `users/{uid}.personaId`. La operación exige cuenta, Persona compatible, Grupo v1 activo y ownership vigente antes de acceder a la Membresía.

Grupo y ownership se releen dentro de la transacción y durante recuperaciones autoritativas. Si el actor deja de ser Owner no se expone información, aun cuando exista una finalización confirmada.

## 7. Contratos y DTO

El cliente aporta únicamente `{ groupId }`. No se aceptan UID, Persona, Membresía, Temporada, estado, fechas, motivo, roles, permisos, clave idempotente ni propiedades adicionales.

El DTO finalizado contiene exactamente:

```text
id
groupId
seasonId
estado: "finalizada"
fechaIngreso
fechaEgreso
```

El DTO activo owner-scoped permanece compatible con E2-03. Los nuevos reasons públicos son `MEMBERSHIP_NOT_FOUND` y `MEMBERSHIP_REACTIVATION_REQUIRED`; todos los errores mantienen mensaje sanitizado y `details.reason`.

## 8. Persistencia, active guard y lifecycle guard

La primera transición, en un único commit atómico:

1. actualiza la misma Membresía a finalizada v2;
2. elimina el documento de `activeMembershipGuards`;
3. crea un documento único en `membershipLifecycleGuards`.

El lifecycle guarda `membershipId`, `personId`, `groupId`, `seasonId`, hashes históricos de creación, `finalizedAt` y `lifecycleGuardVersion: 1`. Es coordinación técnica vigente y tombstone posterior a E2-05; no es Aggregate Root, historial ni autoridad funcional.

Dentro de cada intento transaccional se genera una sola vez `Timestamp.now()`. Ese mismo valor se usa en el dominio, `fechaEgreso` y `lifecycle.finalizedAt`.

## 9. Idempotencia y concurrencia

La máquina distingue `active-only`, `lifecycle-only`, `none` y `both`, valida correlación y ejecuta todas las lecturas antes de escribir.

- Primera transición íntegra: `FINALIZED`.
- Lifecycle íntegro ya persistido: `ALREADY_FINALIZED`, sin escrituras y sin exigir que la Temporada siga abierta.
- CU-025 posterior a finalización, con cualquier clave: `MEMBERSHIP_REACTIVATION_REQUIRED`.
- Active y lifecycle simultáneos, huérfanas, duplicados o corrupción: fallo cerrado sin reparación.

La relectura autoritativa sólo devuelve un resultado funcional cuando Grupo, ownership, guards, Membresía, referencias y hashes lo confirman. Sin estado confirmatorio conserva el error original sanitizado.

## 10. Frontend

`OwnMembershipSection` presenta la activa, confirmación explícita, explicación de ownership preservado, cancelación sin callable, single-flight y estado de progreso. No realiza actualización optimista.

Tras finalizar muestra el estado persistido, no vuelve a ofrecer CU-025 e informa que la reactivación no está disponible. Incluye foco posterior, anuncios accesibles, navegación por teclado, cierre por Escape y comportamiento responsive. No agrega controles para terceros.

## 11. Reglas, índices y legado

`membershipLifecycleGuards` tiene deny-all explícito para lectura y escritura cliente. Membresías y active guards conservan su aislamiento backend-only.

`firestore.indexes.json` permaneció intacto: 10 índices y 0 overrides. No se agregaron dependencias ni se modificaron lockfiles. E2-02 quedó intacto; E2-03 sólo recibió la compatibilidad lifecycle aprobada; E2-04 conserva contrato, DTO, cursor e índice y continúa devolviendo activas operativas.

No se escribieron arrays legacy, requests, payments, activity ni otros Agregados como efecto de la finalización.

## 12. Diagnóstico de la regresión concurrente

Una primera anomalía CU-025 fue observada sin conservar su excepción interna y no se reprodujo en dos corridas ni cuarenta carreras; no se aplicó una corrección especulativa. Una Emulator Suite posterior reprodujo luego un contendiente con HTTP 500/`INTERNAL_ERROR`, operación `create`, etapa `transaction`, causa `Error` y `code: 3` numérico.

La corrida diagnóstica focalizada localizó el origen exacto en `finalized-membership-query`. E2-05 había incorporado consultas de integridad activa y finalizada en paralelo dentro de la transacción; bajo contención, el intento podía quedar cerrado mientras la consulta finalizada pendiente aún usaba esa transacción.

La causa se clasificó como regresión E2-05 en coordinación lifecycle. No provenía del callable, DTO, mapper general ni hidratación funcional del lifecycle.

## 13. Corrección aplicada y evidencia posterior

Las consultas activa y finalizada se secuenciaron. Una etiqueta privada en `WeakMap` identifica exclusivamente errores procedentes de `finalized-membership-query`. `code: 3` sólo habilita relectura confirmatoria cuando está unido a esa etiqueta; no se clasifica por texto, no se agregó al clasificador genérico de dependencia o contención y no se ampliaron indiscriminadamente los mappers.

La relectura distingue misma intención activa, intención distinta, lifecycle finalizado, corrupción y ausencia no confirmatoria. Las pruebas deterministas verifican cada rama, cardinalidad exacta y ausencia de DTO activo falso.

Después de la corrección aprobaron las unitarias focalizadas, unitarias completas, Emulator focalizada y Emulator canónica. Un reordenamiento posterior de dos aserciones hizo que la cardinalidad/correlación se presentara antes que los outcomes; fue una corrección mecánica de evidencia, no una corrección productiva, y la focalizada volvió a aprobar.

## 14. Pruebas y gates

| Evidencia | Resultado |
| --- | --- |
| Unitarias focalizadas | `34/34` |
| Unitarias completas | `199/199` |
| Emulator focalizada final | `18/18` |
| Emulator canónica | `94/94` |
| Mantenimiento/reglas | `7/7` |
| Sintaxis Functions | `210/210` |
| Typecheck | Aprobado |
| Build | Aprobado, 21 páginas |
| Lint baseline | Aprobado |
| Índices | Intactos y válidos |
| `quality:diff` / `git diff --check` | Aprobado |

El gate final se considera satisfecho mediante componentes canónicos e independientes equivalentes. La ejecución agregada fue interrumpida por el wrapper local después de aprobar la Emulator Suite; el build y quality:diff aprobaron independientemente.

`quality:stage0` no terminó como ejecución agregada monolítica. La interrupción fue causada exclusivamente por el wrapper PowerShell, que promovió un warning no bloqueante de Browserslist mientras iniciaba el build. No fue un fallo del producto ni del build y no se ocultó ni se presentó como una corrida completa.

## 15. UAT-01 a UAT-06

La UAT se ejecutó localmente con proyecto `demo-e205-uat`, sin Firebase remoto:

| Caso | Resultado |
| --- | --- |
| UAT-01 — Presentación inicial | Aprobado |
| UAT-02 — Cancelación sin efecto | Aprobado |
| UAT-03 — Confirmación y single-flight | Aprobado |
| UAT-04 — Persistencia tras recarga y navegación | Aprobado |
| UAT-05 — Reintento sin duplicación | Aprobado |
| UAT-06 — Teclado, foco, anuncios y responsive | Aprobado |

Antes de confirmar existían una única Membresía activa, un active guard y cero lifecycle guards. Después existían la misma única Membresía finalizada v2, cero active guards y un único lifecycle guard correlacionado con Persona, Grupo y Temporada. Grupo, ownership, Persona y Temporada permanecieron intactos y no aparecieron efectos laterales.

La única limitación manual registrada es que UAT-06 no utilizó un lector de pantalla real, aunque se verificaron roles, anuncios, foco y teclado.

## 16. Trazabilidad Git y publicación

- Commit probado y publicado en la feature: `d8cfd4ed5eb7d65102051cfa59202c05b42714be`.
- Feature local y `origin/feat/e2-05-finalize-owner-membership`: igualdad exacta, divergencia 0/0.
- `dev` previo: `da5db2ecd49bd59f56fbb52ef735f2bfe3b4d824`.
- Merge no fast-forward de implementación: `0f57426234013aab91f6e6c3f911a257f3edbb3e`.
- Árbol del merge: idéntico al commit probado; 36 rutas, sin resolución manual ni contenido adicional.
- `dev` y `origin/dev` tras publicar implementación: igualdad exacta, divergencia 0/0.

## 17. Efectos colaterales y seguridad operacional

- Sin deploy.
- Sin acceso ni escritura en Firebase remoto.
- Sin credenciales reales.
- Sin logs, temporales o datos Emulator versionados.
- Sin modificación de ficha, Documento 5, documentos anteriores, índices, dependencias o lockfiles.
- Sin rebase, squash, amend o force push.
- Sin eliminación de ramas.

## 18. Deuda y capacidades postergadas

Reactivación y renovación quedan postergadas. El lifecycle sólo podrá ser consumido o reemplazado por un caso futuro aprobado. También permanecen las deudas ya documentadas de E2-04 sobre N+1 acotado, páginas físicas filtradas y ausencia de snapshot multipágina.

La ficha identifica expresamente E2-06 como sucesor y exige una ficha propia antes de implementarlo. Este cierre habilita únicamente su definición; no define ni implementa su alcance.

## 19. Estado de transición

E2-05 queda funcionalmente implementado, automatizadamente verificado, aprobado por UAT, versionado, integrado y publicado en `dev`. Este cierre documental registra la trazabilidad final sin ejecutar nuevamente suites funcionales, dado que ambos merges son sin conflictos y preservan exactamente los árboles previamente validados.

## 20. Veredicto formal

**E2-05 CERRADO — E2-06 HABILITADO PARA DEFINICIÓN**
