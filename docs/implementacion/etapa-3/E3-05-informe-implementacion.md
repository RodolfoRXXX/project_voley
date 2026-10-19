# E3-05 — Informe de implementación local

Fecha de ejecución inicial: 2026-10-16. Alcance: implementación, verificación local y mantenimiento focal posterior conforme a la ficha E3-05, su addendum y DEC-E3-05 / D5-050 vigentes. El informe registra las confirmaciones humanas comunicadas en su alcance exacto, pero no constituye cierre de E3-05 ni cierre de la Etapa 3.

## Checkpoint de partida

- Rama: `feat/e3-05-void-payment-obligations`.
- HEAD: `c4e630d006b02b33ee767ee34af70e4aef4328da`.
- Árbol e índice inicialmente limpios; sin upstream y sin stashes.
- No se realizó `fetch`, cambio de rama, stage, commit, push, merge, acceso a Firebase remoto ni deploy.
- Se preservaron Auth/UAT aislada, D5-044, D5-045 y el gate económico legacy. No se modificó normativa.

## Gate inicial: consulta completa de avisos

Se preparó y ejecutó `paymentVoidNoticeGateE3.test.js` contra Firestore Emulator, proyecto demo `demo-sportexa-e0-02` y datos sintéticos. La comprobación usa, dentro de una transacción, el guard de candidato y la consulta aprobada completa:

`paymentDeliveries.where("membershipId", "==", membershipId).where("decisionState", "==", "REPORTED").orderBy("__name__", "asc")`

No usa `limit`, truncamiento, proyección invertida ni máximo funcional implícito. Una lectura fallida o una forma incompatible abortan y nunca se interpretan como ausencia.

Resultado final observado:

| Escenario sintético | Avisos REPORTED | Posición relacionada | Lecturas observadas | Documentos de query | Bytes serializados de documentos | Duración local |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Cero avisos | 0 | — | 1 (guard) | 0 | 0 | 348,940 ms |
| Más de 20 | 25 | 25 | 26 (guard + query) | 25 | 14.535 | 62,881 ms |

La segunda prueba encontró y bloqueó el aviso relacionado ubicado después de los primeros 20. La primera sólo demuestra ausencia porque la consulta completa terminó correctamente.

Conclusión del gate: viable para los dos volúmenes explícitamente medidos y, por ello, se continuó con la implementación. Los bytes son una medición de serialización de los documentos sintéticos en la prueba, no bytes de red ni facturación. Las duraciones son tiempo de pared en Emulator local, incluyen variabilidad de calentamiento y no representan rendimiento o capacidad productivos. No se afirma capacidad ilimitada.

## Contratos y persistencia implementados

- Nuevo comando callable `voidPaymentObligation`, autenticado y Owner-only, con payload cerrado, revisión esperada, motivo categorizado, explicación normalizada obligatoria e idempotency key estable.
- Nueva consulta callable `getMyPaymentObligationDetail`, autorizada por la Persona de la cuenta y la Membresía correlacionada, válida también para exintegrante, Temporada cerrada y Grupo archivado.
- Sólo se anulan Pagos `PENDING` íntegros: principal preservado, ingresos confirmados/revertidos/netos en cero, saldo previo igual al principal y ninguna aplicación histórica en la subcolección, incluso `REVERSED`.
- Un aviso `REPORTED` relacionado bloquea la anulación sin decidir ni modificar el aviso.
- Evolución estricta de Pago v1/v2 a v3 terminal `VOIDED`: conserva identidad económica, referencias, snapshot, principal, vencimiento, clave de generación y payload hash; saldo cero queda explicado por `voidedAmountMinor`, no por un movimiento monetario.
- Pago, guard e idempotency receipt v2 se escriben en una única transacción. La revisión económica aumenta exactamente una vez. Retry idéntico recupera `EXISTING`; payload distinto conflictúa; pérdida de respuesta y aborto transitorio devuelven recovery sin doble incremento.
- Un Grupo archivado sólo admite Pago íntegramente prearchivo. Membresía y Temporada no se escriben.
- La generación original conserva su outcome histórico y puede recuperar el Pago ahora anulado. La clave económica permanece ocupada: otra intención no recrea la misma obligación y devuelve `OBLIGATION_VOIDED`.
- No se crean Recepción, ingreso, devolución ni condonación.
- Lectores de E3-03/E3-04 aceptan v3 estricta. Owner ve categoría, actor presentado y explicación; la persona obligada ve categoría y datos mínimos; Tesorería recibe sólo estado/fecha/importe anulado, sin categoría, actor ni explicación.
- Listados soportan filtros excluyentes `OPEN | VOIDED`; abiertas siguen alimentando deuda/resumen y anuladas se ordenan/paginan por `voidedAt` e ID. Las anulaciones no se incorporan al historial de pagos.

Índices agregados:

- `payments`: `groupId + estado + voidedAt desc + __name__ desc`.
- `payments`: `personId + estado + voidedAt desc + __name__ desc`.
- `paymentDeliveries`: `membershipId + decisionState + __name__ asc`.

Las colecciones involucradas permanecen deny-all para cliente; el acceso es por callables backend.

## Frontend

- Economía reutiliza el detalle Owner y agrega la acción `Anular obligación` únicamente donde corresponde.
- El modal es accesible, exige categoría y explicación, y advierte irreversibilidad, imposibilidad de regenerar la clave y ausencia de movimiento de dinero.
- La intención conserva una idempotency key estable y bloquea envíos paralelos durante ejecución/recovery.
- Economía Owner, Tesorería y Mis obligaciones muestran pendientes por defecto y ofrecen al pie el acceso secundario `Ver obligaciones anuladas`; el listado alternativo tiene título propio y `Volver a pendientes`. El cambio reinicia resultados y cursor sin precargar ambos listados ni derivar contadores de una página incompleta.
- En Mis obligaciones, una selección, resumen o recovery pendiente impide cambiar de listado y produce un aviso enfocable, para no descartar silenciosamente la intención. Detalle, paginación, loading, errores y vacíos se conservan por audiencia.
- No se agregó una sección redundante ni se ampliaron permisos. Tesorería queda en lectura mínima.

Verificación proporcional del ajuste visual:

- `npm run typecheck`: OK. El primer intento dentro del sandbox falló antes de invocar TypeScript por `EPERM` al resolver `C:\Users\Rodolfo`; repetido con acceso local permitido, finalizó con código 0.
- `npx eslint src/components/payments/OwnerEconomySection.tsx src/components/payments/MyObligationsView.tsx src/components/treasury/TreasuryEconomyView.tsx`: OK, código 0 y sin hallazgos.
- `git diff --check`: OK; sólo informó la advertencia de conversión LF/CRLF ya presente sobre `PaymentObligationDetailDialog.tsx`, archivo no editado por este ajuste visual.
- No se repitieron build, suites backend ni Emulator: el cambio es exclusivamente de presentación y los checks focales no demostraron una necesidad adicional.

## Archivos afectados

Backend y configuración:

- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/callables/voidPaymentObligation.js`
- `volley-ranking-system/functions/callables/getMyPaymentObligationDetail.js`
- `volley-ranking-system/functions/src/payments/application/paymentContract.js`
- `volley-ranking-system/functions/src/payments/application/paymentErrors.js`
- `volley-ranking-system/functions/src/payments/domain/payment.js`
- `volley-ranking-system/functions/src/payments/infrastructure/firestorePaymentStore.js`
- `volley-ranking-system/functions/src/payments/infrastructure/paymentCallable.js`
- `volley-ranking-system/functions/src/paymentDeliveries/domain/paymentDelivery.js`
- `volley-ranking-system/functions/src/paymentDeliveries/infrastructure/firestorePaymentDeliveryStore.js`
- `volley-ranking-system/firestore.indexes.json`

Frontend:

- `volley-ranking-frontend/src/components/payments/PaymentObligationDetailDialog.tsx`
- `volley-ranking-frontend/src/components/payments/OwnerEconomySection.tsx`
- `volley-ranking-frontend/src/components/payments/MyObligationsView.tsx`
- `volley-ranking-frontend/src/components/treasury/TreasuryEconomyView.tsx`
- `volley-ranking-frontend/src/services/paymentsService.ts`
- `volley-ranking-frontend/src/types/Payment.ts`
- `volley-ranking-frontend/src/types/PaymentDelivery.ts`

Pruebas:

- `volley-ranking-system/functions/test/emulator/paymentVoidNoticeGateE3.test.js`
- `volley-ranking-system/functions/test/emulator/paymentVoidE3.test.js`
- `volley-ranking-system/functions/test/unit/paymentVoidE3.test.js`
- `volley-ranking-system/functions/test/unit/paymentArchitecture.test.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`

## Evidencia ejecutada

- E3-05 focal en Emulator: 9/9 pruebas; cubre gate, v1/v2→v3, rechazo de v3 incompatible, aplicaciones APPLIED/REVERSED, stale, aviso 25, privacidad, autorización, prearchivo, paginación, detalle propio, generación, idempotencia, pérdida de respuesta y recovery.
- Carrera aviso–anulación: operación realmente solapada mediante guard; sólo uno de los dos órdenes terminaliza y el otro revalida. Carrera de dos anulaciones: `VOIDED + EXISTING`, una sola revisión. Aborto técnico inyectado: validó exclusivamente `PENDING_RECOVERY` y ausencia de efectos; no se atribuye detección automática de conflicto.
- E3-01 focal en Emulator: 27/27.
- Resultado original E3-04 focal, que incorpora E3-03: E3-03 pasó íntegra; total del conjunto 17/19 por un único subtest histórico ajeno a E3-05 (`historia v1/v2...`, esperaba `nextCursor`). El segundo fallo reportado es el padre agregado del mismo subtest. Este resultado fallido se conserva como evidencia anterior al mantenimiento focal posterior.
- Unitarias focales E3-05/E3-01/E3-04: 8/8.
- Resultado original de unitarias completas: 384/390. Los seis fallos eran aserciones arquitectónicas históricas de páginas de Grupo fuera de los archivos E3-05; las pruebas E3-05 pasaron. La suite completa no se volvió a ejecutar después del mantenimiento focal, por lo que no se declara verde.
- Functions syntax: 428/428 archivos JavaScript.
- Frontend typecheck: OK.
- Frontend lint baseline: OK; 36 errores y 9 warnings conocidos, 9 hallazgos resueltos respecto del baseline, sin deuda nueva.
- Frontend build: OK, 22/22 páginas estáticas generadas; advertencia no bloqueante de `caniuse-lite` desactualizado.
- `firestore.indexes.json`: JSON válido.
- `git diff --check`: OK; sólo advertencia informativa de futura normalización LF→CRLF en un archivo TSX.
- Rules deny-all: verificada en regresión E3-01 y en pruebas arquitectónicas focales.

## Aclaración focal de los fallos observados

Esta clasificación se realizó sin repetir suites completas. Para los seis fallos unitarios se ejecutaron únicamente los siete archivos que contenían aserciones sobre la página de Grupo:

`node --test test/unit/groupArchitecture.test.js test/unit/groupArchiveE2.test.js test/unit/groupDeletionE2.test.js test/unit/membershipCargoE2.test.js test/unit/groupNameUpdateArchitecture.test.js test/unit/seasonArchitecture.test.js test/unit/membershipArchitecture.test.js`

Resultado focal: 45 pruebas, 39 aprobadas y exactamente las seis fallidas que ya había informado el runner unitario general.

### Seis fallos unitarios

| # | Prueba y archivo | Esperado | Obtenido y error | Clasificación demostrada |
| --- | --- | --- | --- | --- |
| 1 | `rutas owner-scoped usan contratos y no importan Firestore` — `functions/test/unit/groupArchitecture.test.js:31` | La antigua página `dashboard/groups/[groupId]/page.tsx` debía contener `groupsService` o `GroupPageShell`. | `AssertionError`: no coincidió `/groupsService\|GroupPageShell/`; la página consume `useGroupFrame`. | Expectativa estructural desactualizada. El shell y la carga fueron elevados a `components/groups/GroupFrame.tsx`. |
| 2 | `frontend cubre vacío, loading, doble submit, errores, Owner y estado deportivo vacío` — `functions/test/unit/groupArchitecture.test.js:52` | La página de detalle debía contener literalmente `Membresías`, `Temporada`, `Owner` y clases responsive. | `AssertionError` en la primera ausencia: no coincidió `/Membresías/`. | Expectativa estructural desactualizada. Navegación y textos de Temporadas/Membresías están distribuidos entre `GroupFrame`, `GroupContextNavigation` y los componentes de resumen/membresías. |
| 3 | `frontend exposes preparation, stable retry, focus and archived read-only state` — `functions/test/unit/groupArchiveE2.test.js:74` | La página debía contener `group.estado === "activo"`, el texto `Organización archivada`, `generation.current` y el `readOnly` archivado. | `AssertionError`: no coincidió `/Organización archivada/`; la página conserva el branch activo/read-only, pero el estado archivado y el foco están en `GroupFrame` y la generación en `ArchiveGroupDialog`. | Expectativa de ubicación y copy desactualizada; no evidencia pérdida de la conducta productiva. |
| 4 | `Owner menu replaces large triggers and implements keyboard, focus and destructive semantics` — `functions/test/unit/groupDeletionE2.test.js:84` | La página debía montar directamente `GroupActionsMenu`. | `AssertionError`: no coincidió `/GroupActionsMenu/`. | Expectativa estructural desactualizada. El menú existente se monta desde `GroupFrame`, que envuelve la página. |
| 5 | `E2-20 UI usa Functions, limita el formulario y cubre retry, stale, foco y pérdida de acceso` — `functions/test/unit/groupNameUpdateArchitecture.test.js:12` | La página debía contener `GroupActionsMenu` y el callback antiguo que hacía `setGroup(null)` antes del redirect. | `AssertionError` inicial: no coincidió `/GroupActionsMenu/`. | Expectativa estructural desactualizada. Menú y limpieza se centralizaron en `GroupFrame`; `loseAccess` deja `access: null` y la página redirige. |
| 6 | `E2-22A mantiene backend único, receipts deny-all y UI callable-only sin permisos derivados` — `functions/test/unit/membershipCargoE2.test.js:107` | El detalle debía contener el callback literal `handleAccessLost ... setGroup(null) ... router.replace(...)`. | `AssertionError`: no coincidió esa expresión; el detalle llama `loseAccess(message)` y redirige, mientras `GroupFrame` limpia el acceso. | Expectativa estructural desactualizada; la conducta fue encapsulada y no eliminada. |

Evidencia comparable de preexistencia respecto de E3-05:

- `git diff --quiet c4e630d...` confirmó que la página leída y los cinco archivos de prueba son idénticos al HEAD base (`SIX_FAILURE_INPUTS_IDENTICAL_TO_HEAD`). Ningún cambio E3-05 participa en esas aserciones, que sólo leen archivos como texto.
- `git log` muestra que la página fue reestructurada en `3801e26` (124 líneas reemplazadas por 21) y que las pruebas quedaron en commits anteriores E2-20/E2-22A/E2-23/E2-24. El informe E3-04 ya documenta que menú, estado y navegación se trasladaron al layout compartido `GroupFrame` y que para ese ajuste no se repitieron suites integrales.
- Por existir esa evidencia directa y comparable no fue necesario ejecutar estos seis casos en otro checkout. En esa clasificación inicial persistían como deuda de pruebas anterior a E3-05 y bloqueaban el verde de la suite unitaria completa, pero no eran regresiones productivas causadas por E3-05. Su mantenimiento focal posterior se documenta a continuación.

### Mantenimiento focal posterior de las seis aserciones

Con autorización posterior, se actualizaron exclusivamente los cinco archivos unitarios que contenían las seis aserciones fallidas. No se modificó código productivo ni se insertaron marcadores:

- `groupArchitecture.test.js` comprueba que las rutas no importan Firestore, que el detalle consume `useGroupFrame`, que mantiene el gate Owner y que `GroupFrame` concentra `getOwnGroup` y `GroupPageShell`. La cobertura de loading, error, acciones, resumen, integrantes y navegación se verifica en `GroupFrame`, `GroupContextNavigation` y los componentes actuales, sin exigir copy interno.
- `groupArchiveE2.test.js` conserva preparación, retry estable y contrato del diálogo; verifica en `GroupFrame` el gate de acciones para Grupo activo, el estado archivado y la devolución de foco, y en la página el `readOnly` archivado.
- `groupDeletionE2.test.js` verifica el montaje de `GroupActionsMenu` en `GroupFrame` y conserva las garantías de teclado, foco y semántica destructiva en los componentes responsables.
- `groupNameUpdateArchitecture.test.js` y `membershipCargoE2.test.js` comprueban que `loseAccess` limpia `access` y protecciones pendientes en `GroupFrame`, que el frame redirige ante pérdida de acceso y que la página propaga su callback a las acciones actuales.

Comando ejecutado:

`node --test test/unit/groupArchitecture.test.js test/unit/groupArchiveE2.test.js test/unit/groupDeletionE2.test.js test/unit/groupNameUpdateArchitecture.test.js test/unit/membershipCargoE2.test.js`

El intento dentro del sandbox no cargó pruebas por `EPERM` al resolver `C:\Users\Rodolfo`. Repetido fuera de esa restricción, ejecutó 26 pruebas: 25 aprobaron y una aserción nueva de `groupArchiveE2.test.js` resultó demasiado literal respecto de `currentAccess.group?.estado`. Se corrigió sólo esa expresión de prueba y se repitió únicamente `node --test test/unit/groupArchiveE2.test.js`: 6/6 aprobadas. En conjunto, todos los casos de los cinco archivos afectados cuentan con evidencia posterior aprobada; no se volvió a ejecutar la suite unitaria completa.

### Único fallo causal de paginación E3-04

- Prueba: `historia v1/v2 mezcla empates sin emitir prefetch ni perder cursor`, en `functions/test/emulator/administrativeReceiptE3.test.js:13`.
- Comando original: `$env:E3_04_FOCAL='1'` seguido de `node test/run-emulator-tests.js` desde `volley-ranking-system/functions`.
- Esperado: después de `listOwner(ownerId, { groupId, pageSize: 1 })`, un item y `nextCursor` truthy.
- Obtenido: un item y `nextCursor === undefined`; `assert.ok(adminHistory.nextCursor)` produjo `AssertionError`.
- El TAP también marcó como fallida la suite padre `E3-04 registro, avisos, guard, grants, recovery, historia y presupuesto` con `subtestsFailed`. Padre y subtest son dos entradas fallidas del reporte, pero representan **un solo fallo causal**.

Relación con E3-05 revisada:

- E3-05 no modifica `administrativeReceipts`, su contrato, su store, su cursor, sus DTO ni `administrativeReceiptE3.test.js`.
- Los cambios E3-05 en `paymentDeliveries` sólo agregan lectura estricta de Pago v3 anulado y campos de detalle por audiencia; no alteran `report`, `confirm`, los estados usados por el fixture ni la consulta de historia. El caso usa Pagos v1.
- Los índices E3-05 son aditivos y no cambian la semántica de las dos queries de historia.
- El fixture deja exactamente una raíz elegible: la Recepción administrativa creada al inicio. Los avisos restantes quedan `REPORTED`, `REJECTED` o `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`, pero ninguno queda como entrega informada `CONFIRMED`. Por tanto no existe lookahead con `pageSize: 1`; `more` es falso y omitir `nextCursor` es el resultado correcto del producto.

Para confirmar la preexistencia se creó un worktree temporal detached en `c4e630d006b02b33ee767ee34af70e4aef4328da` y se ejecutó sólo `administrativeReceiptE3.test.js` mediante una selección temporal del runner de puertos aislados:

`$env:E3_04_HISTORY_BASE_FOCAL='1'; node test/run-emulator-tests.js`

El HEAD base reprodujo exactamente: cuatro subtests aprobados, el mismo subtest fallido por `nextCursor` ausente y la suite padre marcada por agregación. El primer intento directo con puertos estándar no ejecutó pruebas porque pertenecían a una sesión local `demo-sportexa-e2-04`; esa sesión no se detuvo ni modificó. El runner dinámico permitió la reproducción. El worktree y su junction temporal fueron eliminados después; rama, HEAD y cambios locales permanecieron intactos.

Clasificación final original: **expectativa/fixture E3-04 desactualizado**, no defecto productivo, no fallo del entorno y no regresión E3-05.

### Mantenimiento focal posterior de historia E3-04

Con autorización posterior se reparó el fixture, no el producto. El subtest crea explícitamente una raíz informada legacy v1 elegible (`CONFIRMED`, proyectada como `INFORMED`) y una raíz administrativa v2 `ADMINISTRATIVE`, ambas con el mismo instante de evento. Primero obtiene la secuencia completa esperada y comprueba el desempate descendente por ID y la presencia de ambos orígenes; luego pagina de a un elemento, exige `nextCursor` mientras quedan resultados y compara la continuación completa para demostrar orden, ausencia de omisiones y ausencia de duplicados. No se retiró la aserción de cursor.

Se agregó al runner de pruebas el selector `E3_04_HISTORY_FOCAL` para ejecutar sólo `administrativeReceiptE3.test.js`. Comando:

`$env:E3_04_HISTORY_FOCAL='1'; node test/run-emulator-tests.js`

Resultado posterior: 6/6 entradas TAP aprobadas —suite padre y cinco subtests—; el subtest `historia v1/v2 mezcla empates sin emitir prefetch ni perder cursor` aprobó. El runner usó un workspace temporal y los puertos aislados Auth `19099`, Firestore `18080` y Functions `15001`, y lo eliminó al finalizar. No importó, borró ni alteró datos de la sesión UAT.

Este mantenimiento de pruebas heredadas queda separado de la implementación funcional E3-05. No apareció ningún defecto productivo ni se modificó código productivo. Las selecciones focales quedaron aprobadas, pero no se repitieron suites integrales y por ello no se declara verde global.

## Límites y rollback compatible

- La consulta exhaustiva tiene costo lineal respecto de los avisos `REPORTED` de la Membresía. Sólo se midieron N=0 y N=25; antes de producción corresponde observar cardinalidad, latencia y costo reales sin introducir truncamiento silencioso.
- El último resultado de suite general permanece 384/390 porque no se repitió. Las causas de esos seis fallos y el fixture E3-04 fueron corregidos y verificados sólo con selecciones focales; esto no equivale a un nuevo resultado integral.
- El rollback compatible consiste en retirar la exposición UI y los dos callables nuevos manteniendo lectores v3 e índices mientras existan Pagos anulados. Los documentos v3 son terminales y no deben degradarse, reabrirse ni convertirse a v1/v2; los receipts y guards se conservan para idempotencia y trazabilidad.
- No se requiere migración masiva: v1/v2 siguen siendo legibles y evolucionan sólo al ejecutar una anulación válida.

## Guía UAT humana breve

### Desbloqueo local previo a la re-UAT

El primer intento humano de UAT E3-05 no llegó a comenzar. El navegador mostró `net::ERR_FAILED` y una respuesta sin `Access-Control-Allow-Origin` al invocar `ensureMyAccount`, pero CORS no era la causa raíz.

Causa demostrada:

- Frontend y Emulator Suite estaban alineados con `demo-sportexa-e2-04`, Functions en `localhost:5001`, región `us-central1` y origen `http://localhost:3000`.
- El proceso de emuladores había arrancado Auth, Firestore y el proxy de Functions, pero `functions/node_modules` no estaba instalado. `firebase-debug.log` registró `Couldn't find firebase-functions package` y `Failed to load function definition from source: Error: Cannot find module 'firebase-functions'`.
- En consecuencia, Functions registró cero exports. Tanto `OPTIONS` como `POST` a `ensureMyAccount` devolvían `404 Function us-central1-ensureMyAccount does not exist` sin encabezados CORS. El mensaje del navegador era un efecto del export ausente, no una política CORS defectuosa ni un error del protocolo callable.

Correctivo mínimo:

- Se restauraron exclusivamente las dependencias locales de `volley-ranking-system/functions` con `npm ci --ignore-scripts`, usando el `package-lock.json` existente. No cambió ningún archivo versionado ni contrato.
- Antes de reiniciar la sesión viva se exportaron Auth y Firestore a `C:\Users\Rodolfo\AppData\Local\Temp\e3-05-uat-preserve-20261016-1530`. La suite se reinició con `--import` desde ese snapshot, preservando el estado UAT. No se ejecutó ningún runner que limpie datos.
- La carga posterior descubrió 136 exports y registró `ensureMyAccount`, `voidPaymentObligation` y `getMyPaymentObligationDetail`. No se agregó CORS permisivo, no se omitió el bootstrap de cuenta y no se modificó el flujo Auth.

Comprobaciones realizadas sobre la sesión restaurada:

- `OPTIONS http://localhost:5001/demo-sportexa-e2-04/us-central1/ensureMyAccount`, con origen `http://localhost:3000`: HTTP `204`, `Access-Control-Allow-Origin: http://localhost:3000` y método `POST` permitido.
- Recorrido callable con identidad Auth sintética creada sólo en Emulator, sin exponer token ni credenciales: HTTP `200`, DTO autenticado de cuenta esperado y `Access-Control-Allow-Origin: http://localhost:3000`.
- La sesión local quedó disponible en los puertos UAT habituales: frontend `3000`, Auth `9099`, Firestore `8080`, Functions `5001` y UI `4000`.

### Resultado humano comunicado

El usuario confirmó `UAT-01` a `UAT-06` sobre los recorridos previamente comunicados:

1. `UAT-01`: acción Owner disponible en el detalle de una obligación individual elegible.
2. `UAT-02`: modal, teclado/foco, advertencias, categoría, explicación obligatoria y cancelación.
3. `UAT-03`: anulación sin movimiento de dinero y exclusión de deuda/resumen.
4. `UAT-04`: audiencia propia o exintegrante con categoría y detalle mínimo, sin explicación ni actor.
5. `UAT-05`: Tesorería en lectura mínima, sin categoría, actor, explicación ni acción de anulación.
6. `UAT-06`: bloqueos por aviso o ingreso/aplicación y alcance prearchivo del Grupo archivado.

Esta confirmación no se extiende a carreras, pérdida de respuesta, recovery técnico ni escenarios adicionales. Los fallos históricos y su diagnóstico consignados en este informe se conservan; el ajuste visual no los corregía y el mantenimiento focal posterior permanece documentado por separado.

### Confirmación del acceso discreto

El usuario comunicó que probó y confirmó el nuevo acceso discreto a obligaciones anuladas. No se atribuyen a esa confirmación recorridos específicos adicionales, carreras, pérdida de respuesta ni recovery técnico.

## Checkpoint final

Implementación local y evidencia focal preparadas. Los cambios permanecen sin stage sobre el mismo HEAD y rama. El usuario confirmó `UAT-01` a `UAT-06` y, posteriormente, el nuevo acceso discreto; estas confirmaciones no constituyen cierre de E3-05 o de Etapa 3.
