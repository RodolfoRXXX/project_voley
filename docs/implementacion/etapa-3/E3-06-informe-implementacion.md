# E3-06 — Informe de implementación local

Fecha: 2026-10-19. Alcance: implementación y verificación local de E3-06 conforme a su ficha, addendum y DEC-E3-06 / D5-051 vigentes. Registra las confirmaciones humanas recibidas con alcance explícito y no declara cierre de E3-06 ni de la Etapa 3.

## Checkpoint de partida

- Rama: `feat/e3-06-payment-principal-corrections`.
- HEAD: `24a67a35c9afad155fe6dfdae02d1b4dcab006dc`.
- Árbol e índice inicialmente limpios; sin upstream y sin stashes.
- Se verificó el estado sin `fetch`. No se realizó cambio de rama, stage, commit, push, merge, acceso a Firebase remoto ni deploy.
- Se preservaron D5-044, D5-045, Auth/UAT aislada y el gate económico legacy. No se modificó normativa ni se reabrió E2-14.

## Contratos y persistencia

- Se agregaron los callables autenticados `correctPaymentPrincipal` y `listPaymentPrincipalCorrections`.
- El comando es Owner-only y acepta un payload cerrado con Grupo, Pago, principal nuevo positivo, revisión económica esperada, motivo D11, explicación normalizada obligatoria e idempotency key estable. Los motivos son exactamente `AMOUNT_ENTRY_ERROR`, `WRONG_APPROVED_BASE_AMOUNT`, `MEMBERSHIP_EXCEPTION_AMOUNT_ERROR` y `ARITHMETIC_ERROR`.
- Sólo admite Pagos no anulados en `PENDING`, `PARTIAL` o `SETTLED`; rechaza cero, mismo principal, principal menor al ingreso neto confirmado, revisión stale y `VOIDED`.
- `amountMinor` permanece como principal original. Pago v4 agrega `currentPrincipalMinor`, `principalCorrectionCount`, `lastPrincipalCorrectionId` y `lastCorrectedAt`, sin reescribir snapshot, identidad, referencias, aplicaciones ni outcomes de generación.
- Cada corrección crea un documento exacto, append-only, en `payments/{paymentId}/principalCorrections/{correctionId}` con importes anterior/nuevo, delta, motivo, explicación, actor, revisiones y timestamp autoritativo.
- Pago, historia, guard coordinador y receipt se confirman en una sola transacción. No se crea Recepción, ingreso, condonación, crédito ni devolución.
- La consulta completa de avisos `REPORTED` reutiliza la coordinación aprobada con `paymentReceiptCandidateGuards`, ordena por ID y no usa `limit`. Un aviso relacionado bloquea sin decidirlo; una lectura o forma incompleta falla cerrada.
- Autorización Owner, condición prearchivo, revisión esperada, economía y avisos se revalidan dentro de la transacción.
- Recovery coteja actor, Grupo, Pago, hash de solicitud, revisiones y contenido de la corrección. Reconoce el outcome original aunque la raíz tenga una revisión posterior por otra corrección, ingreso, reversión o anulación; no exige que conserve la revisión original.
- La historia usa primera página 20, `pageSize` 1–50, orden revisión/ID descendente y cursor ligado a usuario, audiencia, Pago, orden, tamaño y versión de la historia (`principalCorrectionCount` y `lastPrincipalCorrectionId`). Cada página reautoriza, relee el ancla y la última página reconcilia el conteo exacto de la raíz. Si aparece una corrección nueva delante del ancla, la continuación devuelve `CONCURRENT_MODIFICATION` y exige recargar; no omite la nueva cabeza ni la clasifica como corrupción.
- Owner recibe historia completa con explicación y actor presentado. El sujeto recibe su proyección minimizada sin actor ni explicación. Tesorería recibe economía vigente y última fecha, sin historia, categoría, actor, explicación, principal original ni acción.
- Confirmación y registro administrativo derivan saldo y estado desde el principal vigente. Reversión conserva las correcciones y rederiva el saldo. La anulación v4 conserva ambas historias, extingue el principal vigente mediante `voidedAmountMinor`, deja saldo cero y mantiene `VOIDED` terminal sin liberar la clave económica.
- Los lectores estrictos aceptan v1–v4 y rechazan combinaciones económicas incoherentes. La generación compara la forma económica original sin incorporar campos v4, por lo que preserva outcome e identidad.
- `firestore.rules` mantiene deny-all también para la nueva subcolección. `firestore.indexes.json` no requirió cambios: la consulta se ejecutó en Emulator y el JSON vigente se validó.

## Frontend

- Economía Owner reutiliza el detalle existente y muestra `Corregir importe exigible`; no se agregó ruta, sección permanente ni preview paralelo.
- El modal accesible presenta principal original/vigente, ingreso neto, nuevo importe, saldo proyectado, motivo y explicación. Informa que la proyección es orientativa y que el comando revalida todo.
- Si una obligación saldada aumenta, muestra una advertencia explícita con los cuatro importes y que reaparecerá deuda visible.
- El envío es single-flight. Durante incertidumbre conserva payload e idempotency key; stale cierra la edición y obliga a recargar la revisión autoritativa.
- El detalle Owner y Mis obligaciones incluyen la historia de correcciones separada del historial de pagos, con primera página 20 y continuación. Mis obligaciones omite actor y explicación.
- Los listados muestran principal vigente e indicador discreto cuando difiere del original. Tesorería usa sólo el principal vigente y su detalle minimizado, sin acción ni historia.
- En `Historia de pagos`, cada línea de una recepción permite al Owner abrir el detalle canónico de la obligación referenciada, incluso cuando ya está saldada. La recepción conserva su detalle y su acción de reversión separados; `Deudas` continúa limitada a obligaciones abiertas.
- Los errores de corrección se presentan dentro del modal activo con anuncio accesible y foco. Un aviso pendiente conserva los valores, deshabilita el reenvío del contexto conocido como bloqueado y exige `Recargar y revalidar contexto`; los fallos técnicos reintentables y la incertidumbre de recovery conservan su tratamiento separado.
- Se preservaron navegación, devolución de foco, descarte y recovery existentes.

## Archivos afectados

Backend y seguridad:

- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/callables/correctPaymentPrincipal.js`
- `volley-ranking-system/functions/callables/listPaymentPrincipalCorrections.js`
- `volley-ranking-system/functions/src/payments/application/paymentContract.js`
- `volley-ranking-system/functions/src/payments/application/paymentErrors.js`
- `volley-ranking-system/functions/src/payments/domain/payment.js`
- `volley-ranking-system/functions/src/payments/infrastructure/firestorePaymentStore.js`
- `volley-ranking-system/functions/src/payments/infrastructure/paymentCallable.js`
- `volley-ranking-system/functions/src/paymentDeliveries/domain/paymentDelivery.js`
- `volley-ranking-system/functions/src/paymentDeliveries/infrastructure/firestorePaymentDeliveryStore.js`
- `volley-ranking-system/firestore.rules`

Frontend:

- `volley-ranking-frontend/src/components/payments/PaymentObligationDetailDialog.tsx`
- `volley-ranking-frontend/src/components/administrativeReceipts/OwnerPaymentReceiptHistorySection.tsx`
- `volley-ranking-frontend/src/components/payments/OwnerEconomySection.tsx`
- `volley-ranking-frontend/src/components/payments/MyObligationsView.tsx`
- `volley-ranking-frontend/src/components/treasury/TreasuryEconomyView.tsx`
- `volley-ranking-frontend/src/services/paymentsService.ts`
- `volley-ranking-frontend/src/types/Payment.ts`
- `volley-ranking-frontend/src/types/PaymentDelivery.ts`

Pruebas y runner:

- `volley-ranking-system/functions/test/unit/paymentPrincipalCorrectionE3.test.js`
- `volley-ranking-system/functions/test/emulator/paymentPrincipalCorrectionE3.test.js`
- `volley-ranking-system/functions/test/emulator/paymentE3.test.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`

No se modificó `firestore.indexes.json`.

## Evidencia ejecutada

- Unitarias completas Functions: 393/393 aprobadas. Incluyen contrato cerrado, D11, paginación 1–50, compatibilidad v1–v4, rechazo de formas inconsistentes, ecuación de writers, wiring atómico, recovery y Rules.
- Emulator focal final E3-01–E3-06: 51/51 entradas TAP aprobadas sobre `demo-sportexa-e0-02`, Auth/Functions/Firestore aislados y datos sintéticos. El runner usa workspace temporal y puertos aislados; no tocó datos UAT.
- Writer E3-06 aislado: 6/6 entradas TAP aprobadas —suite padre y cinco subtests—.
- Los escenarios E3-06 cubren aumento/disminución; parcial→saldada; saldada→parcial; rechazo por debajo del neto y sin cambio; principal original; 21 correcciones paginadas 20+1; autorización y privacidad; 25 avisos con el relacionado en posición 25; stale; dos correcciones realmente solapadas; aborto inyectado separado; recovery después de otra corrección; prearchivo/postarchivo; anulación v4; historia preservada y saldo cero.
- La regresión focal E3-01–E3-05 cubre generación/unicidad, confirmación, registro, reversión, avisos, archivo, anulación, recovery y superficies modificadas. La prueba de Rules hizo `GET` y `PATCH` y obtuvo 403 también para `payments/x/principalCorrections/x`.
- No se atribuye detección automática de conflicto al aborto inyectado: ese caso sólo demuestra `PENDING_RECOVERY` sin efectos. La serialización de correcciones se comprobó aparte con operaciones solapadas.
- Frontend `npm run typecheck`: código 0.
- Frontend `npm run lint:baseline`: código 0; 36 errores y 9 warnings conocidos, 9 hallazgos resueltos respecto del baseline y ninguna deuda nueva.
- Frontend `npm run build`: código 0; compilación y 22/22 páginas estáticas generadas. Única advertencia: base local `caniuse-lite` con 9 meses; no se actualizaron dependencias.
- Correctivos focales posteriores a UAT: `npx tsc --noEmit --incremental false`, ESLint limitado a `OwnerPaymentReceiptHistorySection.tsx` y `PaymentObligationDetailDialog.tsx`, y `npm run build`, todos con código 0. La regresión unitaria focal `node --test test/unit/paymentPrincipalCorrectionE3.test.js` quedó 3/3 y verifica el enlace al detalle canónico y el wiring accesible/bloqueante del error. No se repitieron Emulator, paginación ni suites integrales.
- Functions: sintaxis aplicable verificada por las unitarias, carga completa de exports en Emulator y checks `node --check` focales.
- `firestore.indexes.json`: JSON válido. La historia funcionó sin índice compuesto nuevo en Emulator.
- `git diff --check`: resultado final registrado en el checkpoint.

## Fallos observados y correctivos

1. La primera ejecución unitaria obtuvo 392/393: la prueba E3-06 resolvía un archivo frontend desde una base incorrecta. Se corrigió únicamente la ruta de la prueba; el rerun completo quedó 393/393.
2. La primera ejecución Emulator del writer expuso un defecto productivo real al promover Pago v1 a v4: no materializaba los tres acumuladores económicos. Se corrigió el update para persistir `confirmedIncomeMinor`, `reversedIncomeMinor` y `netConfirmedIncomeMinor`; el writer quedó verde.
3. Tras agregar la cobertura de archivo, el primer focal integrado obtuvo 48/51 entradas TAP. Dos subtests E3-06 fallaron y la suite padre agregó la tercera entrada: el fixture cambió un Grupo ownership-aware a `archivado` sin evolucionar schema v3→v4; el primer fallo dejó el Grupo archivado y contaminó el caso siguiente. Se corrigió la transición del fixture y su restauración v4→v3. El writer aislado quedó 6/6 y el focal integrado final 51/51.
4. Algunos intentos dentro del sandbox fallaron antes de ejecutar Node por `EPERM: lstat C:\Users\Rodolfo`. Se repitieron con permiso local; se separa este fallo de entorno de los resultados funcionales.
5. Firebase CLI no pudo consultar MOTD/config remota por el bloqueo de red; informó que no era fatal. También advirtió que el SDK 4.9.0 no soporta las extensiones más nuevas. Ninguna advertencia afectó las pruebas focales y no se cambiaron dependencias.
6. Comprobación focal posterior de paginación: con 21 correcciones, primera página de 20, nueva corrección válida y continuación con el cursor anterior, el contrato devolvía indebidamente `INCOMPATIBLE_STATE`. La causa era que el cursor sólo conservaba ancla y cantidad recorrida; la última página comparaba 21 elementos del snapshot anterior contra el conteo actual 22 y trataba la inserción concurrente como corrupción. El intento reproductor obtuvo 4/6 entradas TAP: falló el subtest focal y la suite padre agregó la segunda entrada fallida. El correctivo mínimo agregó al cursor opaco el conteo total y la cabeza de la historia observados. Un aumento de conteo con nueva cabeza se clasifica `CONCURRENT_MODIFICATION` antes de continuar; regresiones o combinaciones incoherentes de conteo/cabeza permanecen `INCOMPATIBLE_STATE`. No se ligó el cursor a `economicRevision`, porque un ingreso o una reversión legítimos no alteran la secuencia de correcciones. La primera página independiente y la embebida en el detalle generan cursores idénticos. El rerun exclusivo `E3_06_WRITER_FOCAL` quedó 6/6; luego de recargar, las 22 correcciones se recorrieron 20+2 sin omisiones.
7. UAT mostró que una obligación saldada desaparecía correctamente de `Deudas`, pero el detalle de la recepción sólo enumeraba sus líneas y no ofrecía acceso descubrible a la obligación. Eso impedía realizar desde la UI el aumento posterior previsto. El correctivo agrega en cada línea `Ver obligación`, que abre el mismo `PaymentObligationDetailDialog` con el `paymentId` canónico y devuelve el foco al cerrar. No agrega rutas, duplica detalles ni amplía permisos.
8. El bloqueo por aviso pendiente era funcional, pero el estado de error compartido se renderizaba en el detalle base (`z-50`) detrás del modal de corrección (`z-60`). El correctivo separa el error de corrección, lo anuncia con `role="alert"`, lleva allí el foco y conserva los campos. Para `PAYMENT_PENDING_NOTICE` bloquea nuevos envíos hasta recargar y revalidar el detalle; una revalidación aún bloqueada lo explica en el mismo modal. Los fallos técnicos siguen siendo reintentables y una respuesta incierta mantiene intención y clave estables para recovery; `Escape` tampoco propaga el cierre al detalle base ni descarta esa intención incierta.

## Mediciones y límites

- Se probaron 25 avisos `REPORTED` y se detectó el relacionado en la posición 25. Esto demuestra ausencia de truncamiento implícito a 20 en ese volumen sintético, no capacidad ilimitada.
- Se probaron 21 correcciones y continuación 20+1, además de tamaños contractuales 1–50. La consulta tiene costo lineal por página y la comprobación de avisos tiene costo lineal respecto de los avisos pendientes de la Membresía.
- La comprobación posterior cubrió específicamente una inserción append-only delante del ancla y ambos orígenes de cursor Owner. No simula manipulación directa de documentos ya entregados; las inconsistencias reales siguen cubiertas por forma exacta, ancla revalidada, cabeza/conteo de raíz y reconciliación de la última página.
- Los 51 casos focales demoraron aproximadamente 58,1 s de pared en Emulator local; el writer aislado, aproximadamente 8,5 s. Son medidas de esta máquina, con calentamiento y emulación, y no deben extrapolarse a latencia, costo o capacidad de producción.
- No se ejecutó una matriz global redundante. La evidencia se limitó a unitarias obligatorias, regresión E3-01–E3-06 de superficies afectadas, frontend y checks de archivos.

## Rollback compatible

- Puede retirarse la acción UI y dejar de exportarse los dos callables nuevos, pero deben conservarse lectores v4, la ecuación basada en `currentPrincipalMinor`, el soporte de anulación v4 y la regla deny-all mientras exista cualquier Pago corregido.
- Los Pagos v4 no deben degradarse a v1–v3 ni perder `currentPrincipalMinor`; las historias, receipts y guards se conservan para trazabilidad, idempotencia y recovery.
- No hace falta migración masiva: v1–v3 siguen legibles y sólo evolucionan a v4 al aplicar una corrección válida.
- Si se reactiva el writer después del rollback de exposición, debe mantenerse el mismo namespace de receipts y claves para recuperar intenciones anteriores.

## Evidencia UAT humana

Usar exclusivamente la sesión UAT aislada existente, sin reiniciarla, importar datos ni ejecutar los runners de Emulator sobre sus puertos.

Confirmaciones humanas recibidas antes de los dos correctivos focales finales:

- UAT 1 y 2 confirmadas.
- UAT 3 confirmada sólo para reducir el principal hasta el ingreso neto y obtener estado saldado. El aumento posterior no pudo ejecutarse por falta de acceso UI a la obligación saldada; no se lo considera confirmado.
- UAT 4 confirmada: los importes inválidos no modifican la obligación.
- UAT 5 confirmó el bloqueo económico por aviso pendiente y detectó que el error quedaba detrás del modal de corrección; la presentación corregida aún requiere re-UAT.
- UAT 6 y 7 confirmadas.

Re-UAT final confirmada humanamente para estos correctivos:

1. Confirmado: desde `Historia de pagos` se accedió a una obligación saldada, se aumentó su principal, apareció la advertencia y reapareció la deuda con saldo correcto.
2. Confirmado: con un aviso informado pendiente, el error apareció dentro del modal de corrección, conservó los datos ingresados y bloqueó el reenvío hasta recargar/revalidar.

Estas confirmaciones se limitan a los recorridos descriptos. No se extienden a carreras, abortos, recovery ni otros escenarios no ejecutados humanamente; esas propiedades conservan únicamente la evidencia automatizada registrada.

## Checkpoint final

La implementación, la evidencia automatizada y las confirmaciones humanas con alcance acotado quedaron preparadas para versionado desde `feat/e3-06-payment-principal-corrections`, partiendo de `24a67a35c9afad155fe6dfdae02d1b4dcab006dc`. No hubo cambios normativos, Firebase remoto ni deploy. Este informe no declara cerrado E3-06 ni Etapa 3.
