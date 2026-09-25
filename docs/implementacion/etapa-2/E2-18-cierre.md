# E2-18 — Cierre formal

## Alcance entregado

E2-18 entrega CU-029, renovación intertemporada de Membresía exclusivamente al aprobar una Solicitud pendiente. Cuando la última raíz autoritativa está finalizada en una Temporada cerrada y existe una Temporada abierta actual, backend crea una nueva raíz de Membresía v4, abre su Período ordinal 1, enlaza la predecesora mediante `previousMembershipId` y actualiza los guards. Alta inicial y reactivación dentro de la misma Temporada conservan sus efectos anteriores.

La UI Owner presenta la clasificación autoritativa como revalidable, exige confirmación y no permite elegir Temporada, predecesora, efecto, Período ni lineage. Tras confirmar refresca Solicitud, roster y contexto; conserva single-flight, idempotency key estable, accesibilidad y responsive.

## Exclusiones

- No se incorporan historial completo de Membresías, DTO histórico ni pantalla CU-010: quedan asignados a E2-19 y su ausencia visual es esperada.
- No hay callable independiente, renovación masiva, selector de Temporada o raíz, backfill, reparación global, migración de datos, correos ni notificaciones.
- No se modifican E2-14, Documento 5, arquitectura, Partido/Torneo ni deuda E4.
- No se cierra la Etapa 2, no se habilita E3 y no se inicia E2-19.
- Auth/UAT permanece aislada y no integrada. No se realizó deploy ni acceso a Firebase remoto.

## Trazabilidad ficha → implementación → pruebas → UAT

La ficha aprobada, blob `6c4ab8415d7cefa036a11ebb033745121d2fefd6`, define CU-029, schemas cerrados, invariantes, concurrencia, recovery y límites físicos. La implementación adapta el agregado Solicitud, las capacidades públicas de Membresía/Temporada, repositorios, stores y readers; el frontend consume únicamente la clasificación segura de backend. Las pruebas unitarias y Emulator cubren contratos, persistencia, compatibilidad, carreras y fallos cerrados. La UAT valida el recorrido humano N→N+1 y la inspección persistente valida la nueva raíz, el Período y los guards.

## Schemas y compatibilidad

Membresías v1/v2/v3 y lifecycle v1/v2 válidos continúan legibles. La nueva Membresía v4 exige `previousMembershipId`, rechaza campos extra y referencias propias y preserva lineage al finalizar o reactivar. Lifecycle v3 representa la última raíz autoritativa en estado `active` o `finalized`, con `lastActivationOrdinal`; no almacena historia ni arrays. Solicitud aprobada, coordinación e intent incorporan las versiones/outcomes requeridos para renovación sin degradar contratos históricos. No se requiere índice compuesto nuevo ni cambio en Rules.

## Lineage y lifecycle guard

La predecesora se obtiene sólo del lifecycle guard y permanece inmutable. La sucesora nueva referencia directamente a esa raíz; la consulta defensiva por `previousMembershipId` usa `limit(2)` para detectar bifurcaciones sin recorrer el historial. Active guard, lifecycle, raíz y Período deben correlacionar; ausencias, cruces, cardinalidad inválida o coexistencia incompatible fallan cerrados. Los writers de finalización, salida, reactivación y cierre de Temporada reconocen v4 y preservan el lineage.

## Autorización

Cada entrada y unidad confirmatoria revalida al Owner vigente; roles globales, IDs opacos o autoridad histórica no conceden permiso. Un no-Owner recibe rechazo no enumerable. Una transferencia no revierte un efecto durable, pero el ex Owner pierde consulta y continuación; el Owner vigente sólo puede asistir la coordinación exacta preservando la autoría histórica. Las colecciones internas permanecen deny-all para cliente.

## Idempotencia, concurrencia y recovery

Claim, efecto y terminalización se serializan mediante lifecycle y guards compartidos en transacciones acotadas. La misma clave y payload recupera el resultado exacto; la misma clave con otro payload produce `IDEMPOTENCY_CONFLICT`. Aprobaciones concurrentes convergen en un único target. Respuesta perdida y errores ambiguos se resuelven por reread autoritativo. Dos sucesoras, estado corrupto o schema incompatible fallan cerrados. Si el target ya fue finalizado antes de terminalizar la Solicitud, `MEMBERSHIP_RENEWAL_SUPERSEDED` consume el intento sin crear otra raíz.

## Gates finales

- Sintaxis JavaScript: `289/289`.
- Unitarias, contratos y arquitectura: `314/314`.
- Rules/mantenimiento: `7/7`.
- Focal E2-18: `1/1`; regresiones focales relacionadas verdes.
- Emulator Suite inicial: `186/192`. Los seis conteos correspondieron a cuatro subtests fallidos y sus dos suites contenedoras: tres expectativas históricas de autorización y una omisión productiva de validación de alias sobre Solicitud terminal. Se corrigieron expectativas, validación y un fixture lifecycle v3 detectado en la focal posterior.
- Focales posteriores: E2-06 `13/13`, E2-07 gaps `6/6`, E2-18 `1/1`.
- Emulator Suite completa fresca final: `192/192`, exit code `0`, con teardown completo y sin listeners residuales.
- Lint baseline: conforme, con deuda histórica `36` errores/`9` warnings y `9` hallazgos resueltos respecto del baseline; typecheck y build verdes.
- `git diff --check`, UTF-8 sin BOM, whitespace, newline final e higiene del inventario: gates requeridos antes de versionar.

## Clasificación de UAT

- **Aprobada manualmente:** renovación N→N+1; cancelación sin escritura; rechazo terminal; aprobación y nueva Membresía; roster y consulta propia.
- **Inspección persistente:** persistencia; guards; lifecycle; nueva raíz y lineage; Período inicial; no duplicación ante repetición.
- **Pruebas/Emulator:** N→N+2 o varias Temporadas intermedias; concurrencia; transferencias; recovery; corrupción; bifurcaciones; superseded; schemas históricos; límites físicos.
- **Exclusión esperada:** historial visual completo, reservado para E2-19.

No se clasifica como manual ninguna evidencia que no haya sido recorrida manualmente.

## Incidencias, riesgos y deuda residual

Se corrigieron la persistencia accidental de Solicitud v4 como v3, la aceptación de lifecycle finalizado junto a active guard y la falta de conflicto para alias existente sobre Solicitud terminal. Persiste deuda histórica de lint y el warning de `caniuse-lite`; no se actualizaron dependencias. El Emulator acredita configuración y comportamiento local, no un despliegue remoto de índices. Estados manipulados fuera de contrato requieren reparación explícita futura. La consulta visual del historial continúa deliberadamente pendiente para E2-19.

## Rollback

El rollback es lógico y no destructivo: deshabilitar nuevas derivaciones `RENEW_MEMBERSHIP`, conservar readers de Membresía v4, Solicitud aprobada v4 y lifecycle v3, y mantener finalización/reactivación de raíces v4. No deben borrarse ni reescribirse raíces, Períodos, guards, intents o Solicitudes confirmadas, ni volver a una versión que trate `active guard + lifecycle v3 active` como corrupción.

## Veredicto formal

E2-18 satisface la ficha aprobada, los gates técnicos, la UAT manual y la inspección persistente con la clasificación indicada. Queda apta para commit técnico, integración no fast-forward en `dev`, commit documental separado y su integración no fast-forward. La Etapa 2 continúa abierta.

**E2-18 CERRADO E INTEGRADO — ETAPA 2 CONTINÚA ABIERTA**
