# E2-09 — Cierre de reactivación de Membresía por Solicitud

## 1. Estado del incremento

- Incremento: `E2-09 — Reactivación de Membresía por aprobación de Solicitud de ingreso`.
- Fecha de cierre: 2026-09-11.
- Estado: implementado, verificado y aprobado en UAT; implementación integrada en `dev`.
- Ficha normativa: `docs/implementacion/etapa-2/E2-09-ficha-reactivacion-membership-por-solicitud.md`.
- Informe: `docs/implementacion/etapa-2/E2-09-informe-implementacion.md`.
- Autoridad normativa complementaria: revisiones AUD-C05 aprobadas de Documentos 3 y 4.

Este documento cierra exclusivamente E2-09. No cierra la Etapa 2, no autoriza despliegues ni acceso a Firebase remoto y no incorpora la rama preservada de Auth/UAT.

## 2. Objetivo y alcance entregado

E2-09 permite que el Owner vigente apruebe una Solicitud de reingreso cuando la Persona posee una Membresía finalizada de la misma Temporada todavía abierta. La aprobación reactiva esa misma Membresía, conserva su historia y confirma después la Solicitud en una unidad de consistencia independiente.

El incremento entregó:

- reactivación `finalizada → activa` de la misma raíz Membresía;
- aprobación de Solicitud con `approvalEffect: REACTIVATE_MEMBERSHIP`;
- raíz Membresía v3 y Períodos de Vigencia subordinados;
- evolución por escritura autorizada de raíces legacy v1/v2;
- creación nueva directamente en v3;
- guards v2, decision intents v2 y coordinación recuperable;
- historia durable en Solicitud aprobada;
- errores estables de Temporada no reactivable y reactivación superada;
- UX Owner para distinguir primera incorporación y reactivación;
- compatibilidad de readers y DTO existentes;
- reglas deny-all para acceso cliente directo a períodos;
- pruebas de dominio, aplicación, contrato, arquitectura, frontend y Emulator.

No se agregó un callable autónomo de reactivación, salida general, roster, administración de terceros, renovación ni cierre de Temporada.

## 3. Decisiones arquitectónicas

Solicitud y Membresía permanecen como Aggregate Roots y unidades de consistencia independientes. La aprobación se coordina en tres fronteras: claim de Solicitud, creación/reactivación de Membresía y confirmación terminal de Solicitud. No existe una transacción global ni una fuente de verdad compartida.

La Membresía conserva el estado vigente y sus Períodos de Vigencia. La Solicitud aprobada conserva el resultado histórico. Los decision intents identifican decisiones humanas y sus outcomes; guards y coordinación sólo mantienen unicidad y progreso técnico vigente.

Grupo, Persona y Temporada son contextos externos consultados mediante capacidades públicas. No ingresan al Agregado Membresía y no se modifican durante la reactivación.

## 4. Períodos de Vigencia y compatibilidad

Los Períodos de Vigencia son entidades internas subordinadas a Membresía conforme AUD-C05. Cada alta o reactivación abre un período; cada finalización cierra el único período abierto. Los períodos anteriores permanecen inmutables, ordenados y sin superposición.

La raíz v3 mantiene `fechaIngreso` como primer ingreso inmutable, `periodCount` y `latestPeriodId`. `fechaEgreso` sólo existe cuando la raíz está finalizada y coincide con el final del último período; está físicamente ausente mientras la raíz está activa.

Las activas v1 y finalizadas v2 siguen siendo legibles. Evolucionan a v3 únicamente al ejecutar una escritura autorizada del ciclo de vida. No existe migración global, backfill ni síntesis desde metadatos técnicos. CU-027 finaliza v1/v3 y CU-028 reactiva v2/v3 preservando fechas autoritativas.

## 5. Aprobaciones históricas, concurrencia e idempotencia

Cada Solicitud aprobada v3 conserva `decisionIntentId`, `membershipId`, `seasonId`, `approvalEffect` y `membershipActivationOrdinal`. Una aprobación previa sigue consultable aunque la Membresía sea finalizada o reactivada posteriormente; no depende del guard vigente.

Los retries recuperan la misma activación y no crean períodos adicionales. La coordinación transitoria fija Membresía, Temporada, efecto y ordinal esperado, y se elimina en terminales.

La carrera reactivación–finalización produce `MEMBERSHIP_REACTIVATION_SUPERSEDED`: no aprueba la Solicitud, consume el decision intent, libera coordinación y no reactiva nuevamente con la misma identidad. La carrera con cierre de Temporada converge a reactivación confirmada antes del cierre o `MEMBERSHIP_SEASON_NOT_REACTIVATABLE` sin nueva activación.

## 6. Cambios sobre incrementos existentes

- CU-027: acepta activas v1/v3, cierra el período vigente y escribe lifecycle guard v2.
- E2-03: las nuevas Membresías se crean como raíz v3, período 1 y active guard v2 en una sola transacción.
- E2-07: la decisión agrega Solicitud v3, `approvalEffect`, intent v2 consumible, coordinación v2 y consulta histórica estable.
- E2-04: el listado conserva orden, cursor, forma pública y compatibilidad v1/v2/v3; “Primera incorporación” usa `fechaIngreso`.

## 7. Gates finales

La evidencia técnica aprobada quedó consolidada así:

| Gate | Resultado |
| --- | --- |
| Unitarias completas | 255/255 |
| Contractuales/focalizadas | 67/67 |
| Emulator E2-07 | 11/11 |
| Emulator gaps E2-07 | 6/6 |
| Emulator E2-09 | 7/7 |
| Emulator E2-03/E2-05 | 18/18 |
| Emulator Suite completa | 137/137 |
| Sintaxis Functions | 251/251 archivos |
| Mantenimiento/reglas | 7/7 |
| Lint baseline | aprobado |
| Typecheck | aprobado |
| Build | aprobado, 21/21 páginas |
| `git diff --check` | aprobado |

No se repitieron suites durante el versionado: desde estos gates no hubo cambios de código y el árbol integrado fue idéntico al commit validado.

## 8. UAT y limitaciones manuales

| UAT | Resultado |
| --- | --- |
| UAT-01 | `APROBADA MANUALMENTE` |
| UAT-02 | `NO RECORRIBLE MANUALMENTE — ACEPTADA POR EVIDENCIA AUTOMATIZADA` |
| UAT-03 | `APROBADA MANUALMENTE` |
| UAT-04 | `APROBADA MANUALMENTE` |
| UAT-05 | `APROBADA POR INSPECCIÓN PERSISTENTE` |
| UAT-06 | `NO RECORRIBLE MANUALMENTE — ACEPTADA POR EVIDENCIA AUTOMATIZADA` |
| UAT-07 | `APROBADA MANUALMENTE Y POR COBERTURA AUTOMATIZADA` |
| UAT-08 | `APROBADA MANUALMENTE Y POR INSPECCIÓN PERSISTENTE` |

UAT-02 y UAT-06 no son fallas. CU-027 continúa limitado al Owner actual sobre la Membresía de su propia Persona, mediante `OwnMembershipSection` y “Finalizar mi Membresía”. No existen todavía salida voluntaria general de una integrante no Owner, finalización de Membresías de terceros ni roster.

La finalización que preparó UAT-03 fue una fixture local controlada, no una ejecución manual de CU-027. Una única transacción Firestore Emulator con Admin SDK local reutilizó `finalizeMembership` y `firestoreMembershipRepository.persistTransition`, usando `2026-09-11T14:27:18.030Z` como marca única correlacionada. No se simuló autorización.

Los ciclos múltiples, retries, carreras y cardinalidades adicionales están cubiertos por las pruebas aprobadas y no exigieron un tercer ciclo manual.

## 9. Evidencia persistente

La UAT utilizó `demo-sportexa-e2-04`, exclusivamente sobre loopback:

- Owner A: `4A0WpbCGWctmvgLe1bhzXHW3Thdd`;
- Usuario B: `lNTFIxvK85CUizt68SHqmfJ8CqTN`;
- Persona B: `oU5Un45ukpIdjzWmpFdH`;
- Grupo: `5wFTdyffFBgihOp9iOJ4`;
- Temporada: `Mpmare4BsQkAmWKprv0k`;
- Membresía estable: `tFkWeNVsa2mGp03VJKnL`.

La Solicitud inicial `KTA9XFHGgzctcU6Plz86` quedó aprobada v3 con `CREATE_MEMBERSHIP`, ordinal 1 e intent `a4659a4b348db32d547546450144845efc0c8c00ca748c2deccdd3de66339840`. La Solicitud `RtYVZcjixsEpIj3d3hD5` quedó aprobada v3 con `REACTIVATE_MEMBERSHIP`, ordinal 2 e intent propio `31a340992133fe86eff387ecfca57131679fcd3c209058fc580b319d32c6ea1b`.

El estado final contiene una sola raíz activa v3, sin `fechaEgreso`, con ingreso original `2026-09-11T13:43:29.416Z` y dos períodos:

- período 1 `92f3a1503f9b3ed6deb2f5cb58691ff15fb2c0ab0cd0e5fa396de32bf4ca3570`, cerrado hasta `2026-09-11T14:27:18.030Z`;
- período 2 `463e3c54cf5db5d47f13c7245901dc50921b204635425572900f081000778f5e`, abierto desde `2026-09-11T14:36:44.037Z`.

Existe un active guard v2 correlacionado con ordinal 2; no existen lifecycle guards, pending request guards ni coordinaciones. Hay dos request intents y dos decision intents v2 consumidos con outcome `APPROVED`. Grupo y Temporada permanecieron sin cambios; arrays legacy, Actividad y notificaciones permanecieron ausentes; no hubo duplicados ni referencias huérfanas.

## 10. Versionado e integración

- Base original: `31805fa9a7bf99c0b77cf0695e5a89d248b971ab`.
- Commit de implementación: `0634d6bac08c4120679bdb3ab907104c58d2bc80` — `feat(e2-09): implementar reactivación de membresía por solicitud`.
- Merge no fast-forward de implementación: `0f771a809be6ab87c73156192280e64638e03ee6` — `merge: integrar implementación E2-09`.
- Rama documental: `docs/e2-09-close`.
- Commit documental: `docs(e2-09): registrar UAT y cierre del incremento`.
- Merge documental previsto: `merge: integrar cierre documental E2-09`.

La feature y el merge de implementación fueron publicados sin rebase, squash, amend ni force push. El árbol del merge de implementación coincide exactamente con el árbol del commit probado.

## 11. Riesgos residuales y exclusiones

Permanecen como riesgos o trabajo futuro:

- coordinación incierta recuperable sólo mediante consulta o retry, sin worker automático;
- decision intents durables sin TTL;
- necesidad de compatibilidad coordinada entre Functions y reglas en un despliegue futuro;
- cierre real de Temporada y renovación mediante incrementos propios.

Permanecen excluidos roster, salida general, administración de terceros, renovación, cierre/reapertura de Temporada, migraciones, backfills, Actividad, notificaciones, cambios de Auth/UAT y cualquier reparación automática.

No hubo deploy ni acceso a Firebase remoto. La rama `chore/preserve-auth-emulator-uat-changes` permaneció intacta en `fc7135e358902a17372d44f20df50883603520ce` y no fue integrada.

## 12. Siguiente incremento

Conforme al gobierno incremental, queda habilitado el siguiente incremento únicamente para definición mediante una Ficha de Incremento Implementable propia, revisión y decisión de entrada. Este cierre no fija anticipadamente su alcance ni autoriza implementación o despliegue.

## Veredicto

**E2-09 CERRADO E INTEGRADO**
