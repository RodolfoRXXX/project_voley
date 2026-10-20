# E3-07 — Informe de implementación local

**Estado:** IMPLEMENTACIÓN LOCAL COMPLETA — UAT Y RE-UAT HUMANAS FOCALES CONFIRMADAS EN SU ALCANCE — SIN CIERRE DE E3-07 NI ETAPA 3

**Base normativa:** ficha E3-07, addendum E3-07 a Documentos 2/3/4, DEC-E3-07 y D5-052 vigentes

**Base Git:** `feat/e3-07-payment-debt-waivers` en `64270f1605b24f62c89b06926652953d34db756c`

## 1. Alcance realizado

Se implementó el corte vertical de condonación individual de deuda y reversión completa de una condonación concreta, sin crear otro Agregado ni otra fuente económica:

- condonación `PARTIAL` o `TOTAL`, sólo por el Owner vigente del Grupo, sobre saldo positivo;
- `TOTAL` registra el importe, saldo y revisión confirmados y no absorbe cambios posteriores;
- reversión completa, única, idempotente y trazable de un hecho individual de condonación;
- historia append-only `waiverEvents` subordinada a `Pago`, con el hecho original conservado y un hecho compensatorio;
- composición `principal vigente - ingreso neto - condonación vigente = saldo`, donde `condonación vigente = bruta - revertida`;
- lectura compatible de formas anteriores y promoción a forma v5 al registrar la primera condonación, sin backfill;
- evolución de ingresos, reversiones de ingreso, corrección de principal y anulación para respetar la composición nueva;
- consulta privada de historia por audiencia, paginada y con invalidación por cambio concurrente;
- UI sobre el detalle y los listados existentes, incluida la superficie `Saldadas` para descubrir obligaciones totalmente condonadas sin Recepción.

No se implementaron Caja, devolución de dinero, intereses, aprobación adicional, decisión automática de avisos ni capacidades fuera de E3-07.

### 1.1 Registro de UAT humana recibido

- `UAT-01` y `UAT-03`–`UAT-08`: confirmadas humanamente.
- `UAT-02`: confirma que el Owner condonó el saldo remanente mediante `TOTAL`. La interacción ajustada del modal descrita en §4.1 fue confirmada humanamente con posterioridad; esta confirmación no se extiende a stale, idempotencia, recovery ni otras variantes técnicas.
- La selección de un destinatario de `GROUP_DIRECT_PAYMENT_RECORD` sin obligación fue confirmada humanamente. No se infiere de ello la ejecución del grant ni del registro de una Recepción.
- La re-UAT focal de Tesorería confirmó que el Owner volvió a abrir **Acceso a Tesorería** en el Grupo existente y la historia cargó sin errores. No acredita nuevas concesiones, concurrencia ni recovery técnico.
- `UAT-09` y `UAT-10`: no constan como ejecutadas humanamente y permanecen sin confirmación.

Estas confirmaciones acreditan sólo los recorridos observados por la persona que ejecutó UAT. No se extienden a invariantes, concurrencia, Rules, stale, recovery, carreras, paginación técnica, privacidad negativa ni otros escenarios acreditados únicamente por pruebas automatizadas.

## 2. Contratos y comportamiento

### 2.1 Comandos y consulta

- `waivePaymentDebt`: recibe Grupo, Pago, modalidad, importe explícito, saldo y revisión económica esperados, categoría, explicación interna e idempotency key.
- `reversePaymentWaiver`: recibe Grupo, Pago, `waiverId`, revisión económica e historia esperadas, motivo de error, explicación interna e idempotency key.
- `listPaymentWaiverHistory`: recibe Pago, tamaño de página y cursor opcional; resuelve audiencia Owner o sujeto y no acepta una audiencia declarada por el cliente.

Los hashes de ambos comandos incluyen los identificadores, importes, modalidad y revisiones de la intención, `reasonCode` y `internalExplanation` normalizada NFC. Reusar una clave con explicación u otro contenido diferente produce conflicto. El recovery con la misma intención devuelve el recurso y outcome originalmente persistidos, además de la composición actual separada.

Las explicaciones se normalizan a NFC, colapsan espacios, deben contener de 1 a 240 code points y como máximo 480 bytes UTF-8, y rechazan controles C0/C1 y marcas bidi. Los catálogos cerrados son los aprobados; no existe `OTHER`.

### 2.2 Estados y compatibilidad económica

- Una condonación reduce el saldo exactamente por su importe. `TOTAL` exige que el importe coincida con el saldo confirmado.
- Una reversión reduce la condonación vigente y aumenta el saldo exactamente por todo el importe original. El resultado es `PENDING` si no queda ingreso neto ni otra condonación vigente, o `PARTIAL` si queda algún componente positivo; nunca `SETTLED`.
- Revertir un ingreso no altera la condonación y puede reabrir el saldo.
- Corregir el principal exige `principal nuevo >= ingreso neto + condonación vigente`.
- Toda historia de condonación bloquea la anulación, aunque todas las condonaciones hayan sido revertidas.
- Los writers de Recepciones informadas y administrativas preservan los componentes de condonación al recalcular una forma v5.

Las formas v1–v4 siguen siendo legibles sin escritura ni migración automática. La primera condonación materializa en la raíz del Pago los acumulados, revisión y cabeza de historia v5. No se agregó backfill.

### 2.3 Autorización, privacidad y lifecycle

Los dos comandos revalidan al Owner actual dentro de la transacción. Admiten obligaciones de exintegrantes y Temporadas cerradas. En Grupo archivado sólo admiten una raíz de Pago creada antes del archivo; una raíz posterior falla cerrada.

Owner ve categoría/motivo interno, explicación y actor presentado como rol, sin liberar identidad. El sujeto ve la categoría presentable de la condonación y una reversión genérica, sin nota, código interno ni actor. Tesorería recibe composición económica, no historia interna. Las Rules niegan toda lectura y escritura cliente directa de `payments/{paymentId}/waiverEvents/{eventId}`; el acceso pasa por callables.

Antes de ambos comandos se recorre completamente la consulta de entregas `REPORTED` de la Membresía y se comprueba si alguna línea refiere al Pago. Cualquier coincidencia bloquea; una lectura incompleta o error de dependencia falla cerrada. Ningún comando cambia el aviso.

## 3. Persistencia, concurrencia y cursores

- Raíz `payments/{paymentId}` v5: principal vigente, ingresos netos, condonación bruta/revertida/vigente, saldo, estado, revisión económica, cantidad/revisión/cabeza de historia.
- Historia: `payments/{paymentId}/waiverEvents/{eventId}`, documentos inmutables de creación o reversión.
- Receipts: reutilización de `paymentCommandReceipts`, con schemas de operación específicos y resultado original persistido.
- Identidad determinista del evento por intención; una condonación sólo admite una reversión.
- La raíz, el evento y el receipt se escriben en una única transacción.
- Stale de saldo, revisión económica, revisión de historia, Owner, lifecycle o aviso aborta antes de escribir.
- Operaciones realmente solapadas serializan por la raíz; una sola intención puede aplicar. Un aborto inyectado sólo prueba el camino incierto y no se atribuye a detección de concurrencia.
- El cursor liga Pago, audiencia, sujeto, orden, tamaño, total de eventos y cabeza de historia. Un evento nuevo entre páginas devuelve cambio concurrente; el cliente debe recargar desde la primera página.

La consulta nueva usa la subcolección de un único Pago, orden por `occurredAt` e identificador documental; no requirió agregar un índice compuesto. `firestore.indexes.json` permanece válido y los filtros `SETTLED` reutilizan los índices económicos existentes.

## 4. Frontend

El detalle económico existente incorpora composición, historia y acciones discretas de condonación/reversión. Los formularios conservan su clave y contenido durante recovery incierto, son single-flight y muestran errores dentro del modal activo con `role="alert"` y foco programático. Mientras el resultado es incierto no se puede cancelar, cerrar con Escape ni cerrar el detalle, y `beforeunload` protege la navegación que abandona el documento. Tras recuperar exitosamente se libera ese bloqueo.

Un bloqueo por aviso conserva los datos, impide reenviar y ofrece recarga/revalidación explícita. La historia se pagina en el mismo detalle. Los listados Owner y del sujeto incorporan `Saldadas`, de modo que una obligación totalmente condonada sigue siendo descubrible aunque no tenga Recepciones ni aparezca en `Deudas` abiertas.

### 4.1 Ajuste focal posterior a UAT-02

- En modalidad `TOTAL`, el importe visible es exactamente el saldo canónico observado y permanece no editable.
- En `PARTIAL`, el importe es editable. Si coincide exactamente con el saldo observado, el modal informa que se condonará toda la deuda y normaliza la intención a `TOTAL` antes de enviarla. Un importe menor conserva `PARTIAL`.
- Cero, exceso y formato inválido se muestran como inválidos y no pueden enviarse.
- En el primer envío se congela modalidad efectiva, importe, saldo observado, revisión económica, categoría, explicación e idempotency key. Retry y recovery reutilizan esa misma intención; una recarga posterior no recalcula su hash ni sustituye sus precondiciones stale.
- No cambió el contrato económico backend.

### 4.2 Tesorería: diagnóstico focal del mensaje incompatible

La evidencia humana posterior ubicó el fallo en `listGroupTreasuryGrantsForOwner`, no en el comando de concesión. La UI envía exactamente `{ groupId, pageSize: 20 }`, sin cursor en la primera página. El callable devolvió HTTP `400`, código Functions `failed-precondition` y razón estable `DATA_INCOMPATIBLE`; la etapa concreta era la hidratación de los resultados de historia, después de validar el payload y autorizar al Owner.

El diagnóstico de lectura sobre el Emulator UAT existente `demo-sportexa-e2-04` no reinició servicios ni escribió datos. Sólo obtuvo conteos y validaciones estructurales: la colección compartida contenía dos grants persistidos del mismo Grupo, uno `GROUP_TREASURY` y otro `GROUP_PAYMENT_NOTICE_REVIEW`, ambos schema v1 estructuralmente válidos. Esto confirma que había concesiones persistidas y que el fallo aparece al consultar la historia; no permite atribuir un outcome distinto a ningún comando humano no observado. No se registraron identificadores, contenido personal, documentos completos ni credenciales.

La causa demostrada era una compatibilidad omitida del reader: `listForOwner` filtraba `groupCapabilityGrants` sólo por `groupId`, aunque la colección y sus writers admiten varias capacidades. Luego `hydrateGrant` exigía correctamente `GROUP_TREASURY`; al recibir el grant válido de revisión lo rechazaba y el mapper convertía el error en `DATA_INCOMPATIBLE`. No hay evidencia de dato inválido ni defecto de los writers, y no corresponde migración o reparación de datos.

El correctivo mínimo añade `capabilityId == GROUP_TREASURY` a la query y exige la misma capacidad al revalidar el documento ancla de un cursor. Se reutiliza el índice compuesto ya previsto para `groupId + capabilityId + grantedAt`; no se cambian contratos, writers, autorización, privacidad, unicidad, lifecycle ni política de historia completa. Un grant de Tesorería incompatible dentro de ese subconjunto sigue fallando cerrado; no se omiten registros de Tesorería incompatibles ni se devuelve historia parcial.

La reproducción sintética previa con dos tesoreros distintos y Owner sin Persona continúa siendo evidencia válida de multiplicidad, pero no explica el incidente. La reproducción causal nueva creó dos grants de Tesorería y, mediante el writer real, un grant de revisión en el mismo Grupo: antes del correctivo falló con `TreasuryDataIncompatibleError`; después devolvió exclusivamente los dos grants de Tesorería.

### 4.3 Registro directo: destinatario del grant frente a deudor

- La selección para conceder `GROUP_DIRECT_PAYMENT_RECORD` ahora reutiliza `listActiveGroupMembersForOwnedGroup`, igual que Tesorería y revisión de avisos. Presenta integrantes elegibles de la Temporada abierta, excluye al Owner y no exige Pago, obligación ni saldo.
- La aparición de un integrante sin obligación en ese selector fue confirmada humanamente.
- La selección para registrar una recepción conserva `searchDirectPaymentSubjects`. Esa consulta recorre Membresías y sólo presenta sujetos con al menos una obligación de saldo positivo; después `listDirectPaymentObligations` entrega las obligaciones aplicables. Que el integrante observado apareciera recién después de generarle una obligación corresponde a este recorrido de registro, no al de concesión.
- Se añadieron vacíos explícitos para falta de Temporada abierta, ausencia de integrantes elegibles y filtro sin coincidencias. No faltaba una capacidad backend: el roster Owner vigente ya era el contrato autorizado necesario.
- La delegación de condonación permanece como solicitud pendiente de definición. No se creó un cuarto permiso ni se amplió ninguno de los tres existentes.

## 5. Archivos

### Backend y seguridad

- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/callables/waivePaymentDebt.js`
- `volley-ranking-system/functions/callables/reversePaymentWaiver.js`
- `volley-ranking-system/functions/callables/listPaymentWaiverHistory.js`
- `volley-ranking-system/functions/src/payments/application/paymentContract.js`
- `volley-ranking-system/functions/src/payments/application/paymentErrors.js`
- `volley-ranking-system/functions/src/payments/domain/payment.js`
- `volley-ranking-system/functions/src/payments/infrastructure/firestorePaymentStore.js`
- `volley-ranking-system/functions/src/payments/infrastructure/paymentCallable.js`
- `volley-ranking-system/functions/src/paymentDeliveries/domain/paymentDelivery.js`
- `volley-ranking-system/functions/src/paymentDeliveries/infrastructure/firestorePaymentDeliveryStore.js`
- `volley-ranking-system/functions/src/treasury/infrastructure/firestoreTreasuryStore.js`
- `volley-ranking-system/firestore.rules`

### Frontend

- `volley-ranking-frontend/src/types/Payment.ts`
- `volley-ranking-frontend/src/types/PaymentDelivery.ts`
- `volley-ranking-frontend/src/services/paymentsService.ts`
- `volley-ranking-frontend/src/components/payments/PaymentObligationDetailDialog.tsx`
- `volley-ranking-frontend/src/components/payments/OwnerEconomySection.tsx`
- `volley-ranking-frontend/src/components/payments/MyObligationsView.tsx`
- `volley-ranking-frontend/src/components/treasury/OwnerTreasuryAccessSection.tsx`
- `volley-ranking-frontend/src/components/administrativeReceipts/OwnerDirectPaymentAccessSection.tsx`

### Evidencia técnica

- `volley-ranking-system/functions/test/unit/paymentWaiverE3.test.js`
- `volley-ranking-system/functions/test/unit/treasuryE3.test.js`
- `volley-ranking-system/functions/test/unit/administrativeReceiptE3.test.js`
- `volley-ranking-system/functions/test/emulator/paymentWaiverE3.test.js`
- `volley-ranking-system/functions/test/emulator/treasuryE3.test.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`
- `docs/implementacion/etapa-3/E3-07-informe-implementacion.md`

## 6. Verificación ejecutada

Todas las ejecuciones usaron código local. El Emulator usó el proyecto demo `demo-sportexa-e0-02`, puertos y workspace temporales, Auth/Firestore/Functions aislados y datos sintéticos. No se accedió a Firebase remoto ni a la sesión UAT existente.

| Control | Resultado exacto |
|---|---|
| Unitarias de infraestructura completas | `396/396` pass, `0` fail, duración TAP `7332.7 ms` |
| Unitaria E3-07 tras el ajuste final del modal | `3/3` pass, `0` fail, duración TAP `92.3088 ms` |
| Regresión económica focal E3-01/E3-03–E3-07 | `59/59` pass, `0` fail, duración TAP `64999.04 ms` |
| E3-07 focal tras ampliar autorización/Rules | `8/8` pass, `0` fail, duración TAP `9234.4565 ms` |
| Sintaxis Functions | `437/437` archivos JavaScript, OK |
| TypeScript frontend final | exit `0` |
| Lint baseline final | OK; `36` errores y `9` warnings conocidos, `9` hallazgos resueltos respecto del baseline |
| Build frontend final | exit `0`; compilación `10.3 s`; `22/22` páginas estáticas generadas |
| Índices JSON | `firestore.indexes.json` parsea correctamente |
| Unitarias focales posteriores a UAT | `12/12` pass, `0` fail, duración TAP `304.4785 ms` |
| Emulator focal Tesorería posterior a UAT | `22/22` pass, `0` fail, duración TAP `40791.8356 ms` |
| TypeScript posterior a los ajustes UAT | exit `0` |
| Lint baseline posterior a los ajustes UAT | OK; conserva `36` errores y `9` warnings conocidos y `9` hallazgos resueltos |
| Build posterior a los ajustes UAT | exit `0`; compilación `17.6 s`; `22/22` páginas estáticas |
| Diagnóstico UAT local de sólo lectura | `2` grants en `1` Grupo: `1` Tesorería + `1` revisión; `0` formas estructuralmente inválidas |
| Reproducción causal Emulator antes del correctivo | `7/8` pass, `1` fail esperado; `TreasuryDataIncompatibleError`; duración TAP `6790.9122 ms` |
| Unitaria focal Tesorería posterior al correctivo | `5/5` pass, `0` fail, duración TAP `81.3444 ms` |
| Emulator focal Tesorería posterior al correctivo | `8/8` pass, `0` fail, duración TAP `6256.5961 ms` |
| Sintaxis del store de Tesorería afectado | exit `0` |

La regresión focal cubrió condonaciones parciales, totales y sucesivas; recovery luego de operaciones posteriores; reversiones hacia `PENDING` y `PARTIAL`; ingreso y reversión de ingreso; piso de corrección; bloqueo de anulación; historia/privacidad/paginación; Owner y actor ajeno; Rules de la subcolección; stale; solapamiento real; aborto inyectado; Temporada cerrada, exintegrante y prearchivo.

### Medición de la comprobación completa de avisos

El fixture creó **25** entregas `REPORTED` para la misma Membresía y ubicó la referencia al Pago en la número 25. Ambos comandos fueron bloqueados sin decidir el aviso. En la última ejecución focal, el subtest completo —preparación, dos bloqueos, comprobación de no mutación y limpieza incluidos— duró `541.0644 ms` en el Emulator local.

Es una medición de integración sintética, no un benchmark del query aislado ni una proyección de latencia/costo en producción. No se introdujo un límite funcional, truncamiento ni proyección; producción requerirá observabilidad y medición con distribución real antes de extraer conclusiones operativas.

## 7. Fallos encontrados y correctivos

1. La primera ejecución focal E3-07 terminó con `6` pass y `2` fail porque el fixture de paginación restaba acumulativamente el saldo esperado aun después de cada par condonación/reversión. El writer rechazó correctamente con `PAYMENT_ECONOMY_STALE`. Se corrigió sólo la expectativa del fixture; la repetición quedó `8/8`.
2. La revisión final del modal encontró que el recovery incierto bloqueaba Escape y cancelar, pero no protegía explícitamente el cierre contenedor ni liberaba el flag luego de una recuperación exitosa. Se añadió guard de cierre/navegación y limpieza del estado. Typecheck, lint baseline y build se repitieron después y quedaron verdes.
3. Node bajo el sandbox restringido produjo `EPERM` al inspeccionar el perfil de usuario. Los mismos comandos se ejecutaron localmente con permiso elevado, sin red de aplicación ni cambios externos, y finalizaron correctamente.
4. UAT-02 reveló una ambigüedad entre `PARTIAL` por el saldo completo y `TOTAL`. Se normalizó únicamente la interacción frontend y se congeló la intención después del primer envío; el backend y su hash canónico no cambiaron.
5. El error de Tesorería quedó ubicado en `listGroupTreasuryGrantsForOwner`. La query de historia omitía filtrar por capacidad en una colección compartida y trataba un grant válido de revisión como si fuera de Tesorería. La mezcla real se comprobó en UAT sólo por lectura agregada y se reprodujo con writers reales en Emulator aislado. Se corrigió únicamente el reader y la validación de su cursor; no se repararon datos ni se debilitaron guards.
6. La UI del grant de registro directo reutilizaba `searchDirectPaymentSubjects`, cuya finalidad contractual es encontrar deudores con saldo. Se reemplazó sólo en la superficie de concesión por el roster Owner autorizado; el flujo de registro conserva el requisito de obligaciones aplicables.

Firebase CLI no pudo consultar su MOTD/configuración remota y advirtió que el SDK 4.9.0 no soporta las últimas extensiones; ambos mensajes fueron no fatales y no afectaron los servicios emulados usados. El build advirtió que `caniuse-lite` tiene nueve meses; no se actualizaron dependencias por estar fuera de alcance.

## 8. Rollback compatible

Antes de existir datos v5, puede deshabilitarse la UI y retirar los tres callables nuevos junto con sus exports y Rules asociadas. Después de persistir la primera condonación, un rollback seguro debe conservar como mínimo la lectura y composición v5 en todos los readers/writers y la denegación cliente de `waiverEvents`; volver a binarios que desconozcan v5 podría rechazar Pagos o calcular saldos incorrectos. La historia y los receipts son evidencia append-only y no deben borrarse ni transformarse para retroceder.

No hay backfill que revertir. Un rollback operativo posterior a uso real consiste en apagar nuevas mutaciones manteniendo lectura, privacidad, historia, composición y compatibilidad v5.

## 9. Pendientes y límites

- La re-UAT mínima de historia Owner de Tesorería, el modal de condonación ajustado y el selector de destinatarios de registro directo sin obligación fueron confirmados; sus límites están en §1.1.
- Despliegue y cualquier operación contra Firebase remoto requieren autorización separada.
- La medición de avisos debe observarse en un entorno autorizado antes de fijar objetivos operativos; no hay límite funcional nuevo.
- D5-044 y D5-045 permanecen como riesgos residuales no resueltos.
- Auth/UAT aislada y el gate económico legacy permanecen preservados.
- No se reabrió E2-14 ni se declara cerrado E3-07 o Etapa 3.

## 10. Re-UAT humana focal recibida

El Owner volvió a abrir **Acceso a Tesorería** para el Grupo ya usado y **Historia de concesiones** cargó sin errores. No se repitió ni se infiere una concesión; esta evidencia humana no acredita concurrencia, carreras ni recovery técnico.

No se extiende la confirmación del modal de condonación, el selector de registro directo, `UAT-01`, `UAT-02` ni `UAT-03`–`UAT-08` más allá de los recorridos humanos registrados. Volumen, carreras, fallos de red y recovery técnico permanecen acreditados exclusivamente por runners aislados.
