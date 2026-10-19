# Addendum a Documentos 2, 3 y 4 — E3-06 / corrección del principal exigible

## Estado

- **Naturaleza:** fuente normativa complementaria adoptada para E3-06.
- **Decisiones incorporadas:** `E3-06-D01–D11`, con `D01–D10=A` y catálogo/límites D11
  aprobados.
- **Adopción:** DEC-E3-06 / D5-051.
- **Estado:** `APROBADO`.
- **Implementación:** no ejecutada ni autorizada; requiere autorización separada.

Este addendum complementa los Documentos 2, 3 y 4 sólo para el corte indicado. Los documentos y
addenda previos conservan autoridad fuera de estas precisiones. Documentos 1 y 1.5 no requieren
complemento: Pago sigue siendo el único Agregado y no aparece otra fuente económica. La adopción
documental no autoriza implementación, pruebas, configuración, datos, Firebase remoto o deploy.

## 1. Complemento funcional para Documento 2

### 1.1 Finalidad

La corrección de principal repara el importe de una obligación que debía existir, pero fue creada
con un valor material incorrecto. No niega la obligación, no registra dinero y no perdona deuda.

Se distingue de:

- anulación: la obligación no debía existir;
- condonación: deuda válida que se extingue por decisión posterior del acreedor;
- reversión: corrección de un registro de ingreso erróneo;
- devolución/crédito: tratamiento de dinero recibido en exceso;
- interés/recargo/descuento: decisión económica posterior, no error material original.

### 1.2 Alcance cerrado

El comando corrige una obligación individual `ACTIVE` en estado
`PENDING | PARTIAL | SETTLED`. Se admite historia de aplicaciones `APPLIED` o `REVERSED`, que no se
modifica.

El nuevo principal:

1. es positivo;
2. usa ARS minor units enteras y límites monetarios vigentes;
3. no es inferior al ingreso neto confirmado;
4. es distinto del principal base vigente.

Mismo importe falla sin efecto y no crea historia/receipt terminal de éxito. Importe cero o inferior
al neto no se transforma en condonación, crédito o devolución.

### 1.3 Exclusiones

- `VOIDED`, restablecimiento, reemplazo o liberación de clave;
- concepto, versión/snapshot, período, ocurrencia, vencimiento o referencias;
- Membresía, Persona, Temporada o Grupo;
- edición, borrado o redistribución de aplicaciones/Recepciones;
- corrección multiobligación o por lote;
- condonación, descuentos discrecionales, intereses, recargos, crédito o devolución;
- Caja, balance contable, conciliación, exportación o pasarela;
- permisos nuevos, migración masiva o reparación en lectura.

### 1.4 Actor y autorización

Sólo el Owner vigente puede corregir. El backend revalida Cuenta, ownership, Grupo y Pago en el
punto transaccional y en recovery.

No autorizan por analogía:

- `GROUP_TREASURY`;
- `GROUP_PAYMENT_NOTICE_REVIEW`;
- `GROUP_DIRECT_PAYMENT_RECORD`;
- cargo, rol global, Membresía o conocimiento de IDs.

Membresía finalizada, exintegrante y Temporada cerrada no bloquean una corrección sobre obligación
existente. No se reejecuta elegibilidad de generación ni se muta el contexto.

En Grupo archivado sólo opera el Owner y sólo sobre Pago prearchivo íntegro. El Grupo no se
reactiva y ningún grant se conserva o revive.

### 1.5 Flujo principal

1. Owner abre el detalle de Pago dentro de Economía.
2. Backend devuelve contexto, principal original, principal base vigente, ingreso neto, saldo,
   estado y `economicRevision`.
3. Owner ingresa nuevo principal, categoría y explicación.
4. La UI proyecta estado/saldo sin tratarlos como autoridad.
5. Si una obligación saldada reaparecerá como parcial, la UI muestra advertencia explícita y los
   cuatro importes: vigente, nuevo, ingreso neto y saldo resultante.
6. Backend reautoriza y relee todas las fuentes.
7. Si existe aviso `REPORTED` relacionado, bloquea sin decidirlo.
8. Si principal, neto, revisión, lifecycle, autorización, prearchivo o guard cambiaron, responde
   stale/error sin sustituir datos.
9. En una unidad transaccional agrega historia, actualiza Pago/guard y crea receipt.
10. Las vistas se refrescan desde backend.

### 1.6 Casos económicos

| Caso inicial | Corrección permitida | Resultado |
| --- | --- | --- |
| `PENDING`, neto cero | Aumento o disminución positiva | Continúa `PENDING`; saldo = nuevo principal. |
| `PARTIAL` | Nuevo principal mayor que neto | Continúa `PARTIAL`; saldo rederivado. |
| `PARTIAL` | Nuevo principal igual al neto | Pasa a `SETTLED`; cero explicado por ingresos. |
| `SETTLED` | Aumento por encima del neto | Pasa a `PARTIAL`; reaparece deuda visible. |
| `SETTLED` | Mismo importe | No-op inválido, sin corrección. |
| Cualquier estado | Nuevo principal menor que neto | Bloqueado; no crea excedente. |
| Neto cero tras reversión | Nuevo principal positivo | `PENDING`; conserva aplicaciones/reversión. |
| `VOIDED` | Cualquier importe | Bloqueado; lifecycle terminal. |

### 1.7 Avisos pendientes y borradores stale

Todo aviso `REPORTED` cuya línea referencia el `paymentId` bloquea. La comprobación consume el
resultado completo autorizado y no usa el límite funcional de candidatos E3-04 para afirmar
ausencia. Falla, timeout, truncamiento o presupuesto insuficiente fallan cerrados.

La implementación deberá verificar esta comprobación para el nuevo writer. Las mediciones E3-05 de
0/25 avisos son evidencia focal histórica dentro de esos volúmenes y no se convierten en evidencia
de rendimiento, capacidad, latencia o costo productivos.

El comando no confirma, rechaza o resuelve avisos. Borradores de Entrega o registro administrativo
con `expectedEconomicRevision`/saldo anteriores quedan stale y deben revisarse. No existe recorte o
redistribución automática.

### 1.8 Reversión posterior

Una reversión confirmada después de una corrección:

- conserva principal original, principal base e historia;
- conserva Recepción, aplicaciones y reversión existentes;
- reduce el ingreso neto por el flujo aprobado;
- rederiva saldo/estado contra el principal base vigente;
- no agrega, borra o revierte una corrección;
- no devuelve dinero.

### 1.9 Anulación posterior — D10=A

Una obligación corregida puede anularse sólo si cumple íntegramente E3-05:

- lifecycle `ACTIVE` y estado `PENDING`;
- ninguna aplicación histórica, incluida `REVERSED`;
- ingresos bruto, revertido y neto iguales a cero;
- saldo igual al principal base vigente;
- ningún aviso `REPORTED` relacionado;
- Owner, revisión, prearchivo e integridad válidos.

La anulación preserva principal original, principal corregido, todas las correcciones, snapshot,
identidad, generación y
outcomes. `voidedAmountMinor` es igual al principal base vigente al momento de anular; el principal
exigible y saldo pasan a cero. No libera la clave y `VOIDED` continúa terminal.

El recovery reconcilia receipt, principal base, revisión e historia; no degrada schema, no atribuye
efectos sin evidencia y no exige que la corrección desaparezca. Este complemento es prospectivo:
no reescribe la decisión, implementación, evidencia o cierre históricos de E3-05.

### 1.10 Motivo — D11 aprobada

D11 fija categoría cerrada más explicación obligatoria:

- `AMOUNT_ENTRY_ERROR`;
- `WRONG_APPROVED_BASE_AMOUNT`;
- `MEMBERSHIP_EXCEPTION_AMOUNT_ERROR`;
- `ARITHMETIC_ERROR`.

No existe `OTHER`. Cada categoría describe un error material respecto de un importe que ya
correspondía aplicar; no crea aprobación de tarifas/excepciones ni autoriza descuento discrecional,
condonación, tarifa posterior, interés o recargo.

La explicación es obligatoria, normalizada NFC, de 1–240 code points y máximo 480 bytes UTF-8, sin
controles C0/C1 ni marcas bidi.

### 1.11 Historia y privacidad

- Owner: principal original/vigente, antes/después, delta, categoría, explicación, actor, fecha y
  revisiones.
- Sujeto, incluido exintegrante: sólo obligación propia; antes/después, categoría y fecha, sin actor
  ni explicación interna.
- Tesorería: principal vigente, saldo, estado y última fecha de corrección; sin historial completo,
  categoría, actor, explicación o acción.
- Revisor/registrante: sólo datos que ya necesitan sus contratos; no adquieren historia general.

La historia vive en el detalle de obligación existente y se pagina allí. Historial de pagos sigue
representando Recepciones; no se fabrica una Recepción o ingreso para explicar una corrección.

## 2. Complemento de dominio para Documento 3

### 2.1 Frontera y autoridad

Pago continúa como único Aggregate Root de su obligación. Es dueño de:

- principal original y principal base vigente;
- historia subordinada de correcciones;
- aplicaciones, ingresos bruto/revertido/neto;
- principal exigible, saldo, estado y `economicRevision`;
- lifecycle `ACTIVE | VOIDED` y, cuando corresponda, efecto de anulación.

Una corrección no es Agregado, Recepción, Movimiento monetario ni fuente paralela. El hecho
append-only pertenece a Pago. Receipt, guard, índices y cursores son mecanismos técnicos.

### 2.2 Vocabulario y composición común

```text
principalOriginalMinor = importe de generación, inmutable
principalBaseMinor = última corrección o principalOriginalMinor
voidedAmountMinor = 0 si ACTIVE; principalBaseMinor si VOIDED
principalExigibleMinor = principalBaseMinor - voidedAmountMinor
netConfirmedIncomeMinor = confirmedIncomeMinor - reversedIncomeMinor
balanceMinor = principalExigibleMinor - netConfirmedIncomeMinor
```

Para `ACTIVE`, `voidedAmountMinor` conceptual es cero aunque no deba persistirse físicamente. Para
`VOIDED`, la elegibilidad E3-05 exige cero aplicaciones históricas, ingresos cero y ausencia de
aviso `REPORTED`; por ello saldo cero queda explicado sólo por la anulación del principal base.

### 2.3 Invariantes

1. `amountMinor` conserva principal original y nunca cambia.
2. Principal base vigente es positivo y deriva del último hecho de corrección o del original.
3. Cada corrección tiene delta no nulo y revisiones consecutivas.
4. Una corrección efectiva incrementa `economicRevision` una vez.
5. Ingreso neto está entre cero y principal exigible.
6. Saldo nunca es negativo.
7. Estado activo deriva exclusivamente de principal exigible e ingreso neto.
8. Aplicaciones y Recepciones no se editan por corregir.
9. Correcciones son append-only; una posterior no reescribe anteriores.
10. Aviso `REPORTED` relacionado bloquea.
11. Snapshot, identidad, referencias y generación son inmutables.
12. `VOIDED` nunca se corrige, restablece o reemplaza.
13. Anular una corregida conserva historia y extingue exactamente el principal base vigente.
14. Grupo, Temporada, Membresía y Persona no cambian.

### 2.4 Estado y transiciones

```text
ACTIVE/PENDING  --corregir--> ACTIVE/PENDING
ACTIVE/PARTIAL  --corregir--> ACTIVE/PARTIAL | ACTIVE/SETTLED
ACTIVE/SETTLED  --aumentar--> ACTIVE/PARTIAL
ACTIVE/*        --mismo importe o debajo del neto--> sin transición
VOIDED          --corregir--> prohibido
```

```text
ACTIVE/PENDING corregido + sin aplicaciones/ingresos/aviso --anular--> VOIDED
VOIDED --cualquier transición económica posterior--> prohibido
```

No se crea estado `CORRECTED`: la corrección es composición/historia; el estado expresa saldo.

### 2.5 Identidad de corrección

Cada hecho tiene identidad determinista o aleatoria opaca única dentro de Pago y correlación con:

- `paymentId` y `groupId`;
- revisión económica anterior y posterior;
- importe anterior/nuevo y delta;
- motivo/explicación aprobados;
- actor y timestamp autoritativos;
- comando/receipt sin exponer su key cruda.

La historia no se usa como event sourcing en cada lectura: el root mantiene la proyección vigente y
la historia acredita sus cambios. Root e historia incoherentes fallan cerrados.

### 2.6 Generación y outcomes históricos

- `paymentId`, clave mensual/única, payload y `generationIntentId` no cambian.
- Una corrección no hace que una nueva intención con otro importe sea `CREATED`.
- Recovery del intent original compara la forma original inmutable, no el principal corregido.
- Outcomes terminales históricos no se reescriben.
- La presentación recuperada puede mostrar lifecycle/principal vigente actuales sin cambiar el
  outcome original.
- `VOIDED` sigue ocupando la clave y produce `FAILED/OBLIGATION_VOIDED` para una intención nueva.

## 3. Complemento técnico para Documento 4

### 3.1 Servicios públicos

Se proponen dentro del módulo Pago:

- `getOwnerPaymentObligationDetail` evolucionado con principal/composición e historia inicial;
- `getMyPaymentObligationDetail` evolucionado con proyección propia minimizada;
- `getTreasuryPaymentObligationDetail` evolucionado con proyección mínima;
- `correctPaymentPrincipal`, Owner-only;
- `listPaymentPrincipalCorrections`, siempre acotado a un `paymentId` y audiencia autorizada.

No se crea módulo, Repositorio económico o endpoint de Caja independiente.

### 3.2 Input del comando

Objeto cerrado:

```text
{
  groupId,
  paymentId,
  newPrincipalMinor,
  expectedEconomicRevision,
  reasonCode,
  explanation,
  idempotencyKey
}
```

El backend deriva actor, ownership, Persona, Membresía, Temporada, contexto, lifecycle, principal
original/base, ingresos, saldo, estado, prearchivo, guard y timestamps.

### 3.3 Resultado y DTOs

Resultado del comando:

```text
{
  outcome: "CORRECTED" | "EXISTING" | "PENDING_RECOVERY",
  recovered,
  resource?: {
    paymentId,
    groupId,
    originalPrincipalMinor,
    currentPrincipalMinor,
    netConfirmedIncomeMinor,
    balanceMinor,
    estado,
    economicRevision,
    correction: {
      correctionId,
      fromPrincipalMinor,
      toPrincipalMinor,
      reasonCode,
      correctedAt
    }
  }
}
```

La respuesta Owner puede incluir explicación y actor presentable mediante capacidad pública de
Persona; nunca UID/email crudos. DTO propio omite explicación/actor. DTO Tesorería omite el objeto
de corrección salvo `lastCorrectedAt` y conserva sólo economía mínima.

El detalle canónico Owner incluye:

```text
{
  originalPrincipalMinor,
  currentPrincipalMinor,
  netConfirmedIncomeMinor,
  balanceMinor,
  estado,
  economicRevision
}
```

No existe `settledIncreaseWarningRequired`: el detalle aún desconoce el nuevo importe. La UI deriva
la advertencia al comparar un nuevo importe local válido con `estado`, principal e ingreso neto del
detalle. Esa proyección es informativa; el comando revalida autorización, revisión e importes. Si el
detalle queda stale, la UI exige recarga y revisión. No se agrega endpoint de preview sin una
necesidad concreta.

### 3.4 Errores contractuales mínimos

- `UNAUTHENTICATED` / `ACCOUNT_REQUIRED`;
- `GROUP_NOT_ACCESSIBLE` / `PAYMENT_NOT_ACCESSIBLE` con privacidad negativa;
- `PAYMENT_VOIDED`;
- `PRINCIPAL_AMOUNT_INVALID`;
- `PRINCIPAL_UNCHANGED`;
- `PRINCIPAL_BELOW_NET_INCOME`;
- `PAYMENT_PENDING_NOTICE`;
- `PAYMENT_PRINCIPAL_STALE`;
- `PAYMENT_NOT_PREARCHIVE`;
- `IDEMPOTENCY_CONFLICT`;
- `INCOMPATIBLE_STATE`;
- `DEPENDENCY_UNAVAILABLE` / outcome `PENDING_RECOVERY` según evidencia.

Un actor no autorizado no distingue existencia, estado, importes, correcciones o archivo.

### 3.5 Schemas de Pago y compatibilidad

Lectura compatible:

- **v1:** obligación original `PENDING`; se normaliza con principal base igual a `amountMinor`,
  ingresos cero, saldo igual al original y revisión 1.
- **v2:** economía E3-03/E3-04; principal base igual a `amountMinor`.
- **v3:** forma E3-05; activa compatible o `VOIDED` con principal original extinguido.
- **v4 `ACTIVE` corregida:** conserva todos los campos originales y agrega como mínimo
  `currentPrincipalMinor`, contador/resumen de correcciones y última fecha; balance/estado/revisión
  siguen la ecuación común.
- **v4 `VOIDED` corregida:** conserva `currentPrincipalMinor` como principal base
  histórico, exige `voidedAmountMinor == currentPrincipalMinor`, ingresos cero, saldo cero e historia
  completa.

No hay backfill. Una raíz se promueve al corregir o al anular una corregida.
Lectores nunca completan campos persistidos ni corrigen historia.

`amountMinor` continúa siendo principal original. El nombre físico `currentPrincipalMinor` puede
validarse durante implementación, pero su semántica no cambia.

### 3.6 Schema de historia subordinada

Ubicación física propuesta:
`payments/{paymentId}/principalCorrections/{correctionId}`.

Forma v1 mínima:

```text
{
  correctionId,
  paymentId,
  groupId,
  fromPrincipalMinor,
  toPrincipalMinor,
  deltaMinor,
  reasonCode,
  explanation,
  correctedByAccountId,
  fromEconomicRevision,
  toEconomicRevision,
  correctedAt,
  schemaVersion: 1
}
```

`deltaMinor` es entero seguro con signo y distinto de cero. Importes son positivos; revisiones son
enteros positivos consecutivos. El documento es inmutable. `reasonCode` pertenece exactamente al
enum D11 y `explanation` cumple sus límites.

### 3.7 Receipt idempotente

Colección privada/deny-all con:

- actor, Grupo, operación y hash de key;
- request hash canónico de Pago, nuevo principal, revisión esperada, categoría y explicación;
- outcome, `paymentId`, `correctionId`, revisiones antes/después y timestamp;
- evidencia mínima para reconciliar root e historia;
- sin key cruda, email, nombre de Persona o copia de contexto.

Retención sin TTL hasta una política que preserve idempotencia y recovery.

### 3.8 Persistencia y repositorios

- Repositorio Pago hidrata v1–v4, valida ecuaciones y persiste proyección vigente.
- Repositorio de historia pertenece al módulo Pago y sólo accede a la subcolección subordinada.
- Repositorio de Recepciones/aplicaciones conserva ownership actual y no se modifica para crear una
  segunda autoridad.
- Repositorio de guard coordina cambios de candidatos/avisos.
- Repositorio de receipts reconcilia intentos sin exponer evidencia técnica.

No existe repositorio de Caja, Corrección como Agregado o saldo paralelo.

### 3.9 Unidad de consistencia

Una transacción de corrección:

1. lee receipt y Pago;
2. reautoriza Cuenta/Owner y Grupo;
3. acredita Pago prearchivo si el Grupo está archivado;
4. valida schema, lifecycle, estado, revisión, principal y economía;
5. valida nuevo principal y límite frente al neto;
6. lee guard y consulta completa de avisos `REPORTED` relacionados;
7. crea historia, actualiza Pago y guard y crea receipt en un commit.

No modifica Grupo, Temporada, Membresía, Persona, Recepción o aplicación. Pago compartido serializa
contra ingreso/reversión; guard compartido serializa contra avisos/registro administrativo.

La futura evolución de la transacción E3-05 de anulación debe aceptar v4 coherente, mantener
historia, fijar
`voidedAmountMinor` al principal base e incrementar revisión una vez. Conserva sus comprobaciones de
ausencia total de aplicaciones, ingresos cero y avisos.

Todos los writers económicos comparten la misma proyección:

- confirmación E3-03 y registro E3-04 validan/aplican contra `currentPrincipalMinor` cuando existe,
  o `amountMinor` en formas anteriores;
- reversión E3-03/E3-04 conserva el principal base y rederiva saldo/estado contra él;
- corrección cambia únicamente principal base, saldo, estado, revisión e historia;
- anulación usa el principal base vigente como importe extinguido y exige la elegibilidad estricta;
- ningún writer recalcula o sobrescribe principal original, snapshot o aplicaciones históricas.

### 3.10 Concurrencia y stale

- ingreso primero: corrección reintenta y valida nuevo neto/revisión;
- corrección primero: confirmación/registro relee principal y saldo nuevos;
- reversión primero: corrección relee neto menor;
- corrección primero: reversión conserva corrección y rederiva;
- aviso primero: guard cambia y corrección bloquea;
- corrección primero: borrador anterior queda stale;
- dos correcciones: sólo una confirma; la otra falla stale;
- archivo primero: tras retry sólo Owner/Pago prearchivo puede continuar;
- anulación primero: corrección encuentra `VOIDED` y falla;
- corrección primero + anulación: anulación relee v4 y aplica elegibilidad estricta E3-05.

No se promete éxito por orden de llegada cliente. Firestore decide serialización y cada retry relee
autoridad y economía.

### 3.11 Idempotencia y recovery

Scope: actor + Grupo + operación + idempotency key. El hash incluye toda la intención normalizada.

- igual key/payload: reautoriza y reconcilia receipt, root e historia; devuelve `EXISTING`;
- igual key/payload distinto: conflicto;
- receipt ausente y sin efecto: reintenta tras revalidar;
- receipt ausente con historia parecida: no atribuye el efecto por inferencia;
- root/history/receipt parcial o incompatible: falla cerrado;
- timeout sin evidencia concluyente: `PENDING_RECOVERY`;
- operación posterior legítima: recovery acredita su corrección por revisiones e identidad propias,
  sin exigir que root siga en la revisión terminal original;
- otra corrección posterior no reescribe el outcome anterior;
- ingreso/reversión posterior no altera importes before/after del hecho;
- anulación posterior no impide recuperar la corrección y recovery de anulación exige
  root `VOIDED`, importe extinguido y evidencia correlacionada.

### 3.12 Generación compatible

La comparación de generación separa payload original de lifecycle/composición posterior:

- excluye de igualdad sólo campos posteriores aprobados;
- jamás compara un nuevo importe de generación con `currentPrincipalMinor` para recrear;
- intent original conserva outcome y puede presentar estado actual;
- intent nuevo para la misma clave encuentra la raíz existente o `VOIDED`, nunca crea otra;
- identidad, snapshot y claves permanecen ocupados.

### 3.13 Consultas, paginación e índices

Historia sólo dentro de un Pago:

```text
paymentId == scope
order by toEconomicRevision DESC, correctionId DESC
```

El detalle devuelve siempre la primera página con default 20, el mismo DTO de item y eventual
`nextCursor`. La continuación usa `listPaymentPrincipalCorrections({ paymentId, pageSize?, cursor? })`.
`pageSize` debe ser entero entre 1 y 50; omitido vale 20. El cursor opaco liga contrato, actor,
audiencia, Pago, orden `toEconomicRevision DESC, correctionId DESC` y tamaño. Cada página reautoriza
y relee root/ancla. Pérdida de acceso, cambio incompatible o ancla inválida falla cerrado.

Owner recibe historia completa. Sujeto recibe proyección minimizada propia mediante el mismo
contrato/orden. Tesorería no recibe ni pagina historia completa: sólo última fecha y economía actual.
No existe listado transversal de correcciones.

Índices exactos se validan durante implementación autorizada. La forma subordinada y orden por
revisión pueden no requerir índice compuesto, pero este addendum no lo afirma como hecho ejecutado.

### 3.14 Privacidad y Rules

- Firestore niega acceso directo cliente a Pagos, correcciones, receipts y guards.
- Cada callable deriva audiencia y minimiza DTO.
- UID, email, hashes, keys, paths y evidencia técnica no salen.
- Explicación y actor son privados del Owner.
- Categoría propia no habilita explicación.
- IDs conocidos, cursores o receipts anteriores no autorizan.
- En archivo no revive Tesorería ni otros grants.

### 3.15 Frontend

- reutiliza Economía, Deudas, Mis obligaciones, Tesorería y detalle de Pago;
- acción **Corregir importe exigible** sólo para Owner;
- modal con principal original/vigente, ingreso neto, saldo, nuevo importe, saldo/estado proyectados,
  categoría, explicación y advertencias;
- para `SETTLED` que pasa a `PARTIAL`, aviso explícito de nueva deuda visible antes de confirmar;
- single-flight y key estable durante incertidumbre;
- stale obliga a recargar/revisar y no cambia payload bajo la misma key;
- aviso pendiente enlaza a revisión sin decidirlo;
- éxito refresca fuentes backend;
- historia paginada dentro del detalle e indicador discreto en listados;
- no crea sección general, ruta paralela o Caja;
- Historial de pagos continúa mostrando sólo Recepciones.

## 4. Pruebas focales futuras

No se ejecutan ni autorizan por este addendum.

### 4.1 Dominio y schemas

1. v1/v2/v3 se hidratan con principal base original sin backfill;
2. primera corrección promueve a v4 conservando forma original;
3. aumento/disminución y estados derivados;
4. cero, mismo importe y debajo del neto bloquean;
5. historia append-only/revisiones consecutivas;
6. root/history incompatibles fallan cerrados;
7. enum exacto D11 sin `OTHER` y explicación NFC dentro de límites;
8. `VOIDED` nunca se corrige.

### 4.2 Ingresos, reversión, avisos y anulación

9. parcial/saldada conservan aplicaciones y Recepciones;
10. saldada aumentada pasa a parcial sin movimiento monetario;
11. reversión posterior rederiva contra principal base;
12. aviso relacionado al inicio/medio/final del conjunto completo bloquea;
13. consulta fallida/truncada nunca acredita ausencia;
14. borradores anteriores quedan stale;
15. carreras reales con ingreso, reversión, aviso, otra corrección y archivo;
16. v4 corregida sin aplicaciones/ingresos/aviso se anula preservando historia y extinguiendo
    principal base;
17. cualquier aplicación, incluso revertida, ingreso o aviso bloquea la anulación;
18. `VOIDED` conserva terminalidad, clave y recovery correlacionado.

### 4.3 Idempotencia, recovery y generación

19. retry igual, key/payload conflictivo y dos correcciones concurrentes;
20. abortos antes/después de cada write y pérdida de respuesta;
21. operación posterior no impide recovery del outcome original;
22. evidencia parcial nunca éxito;
23. intent de generación original conserva outcome;
24. intento nuevo no recrea ni usa principal corregido como payload original.

### 4.4 Consultas, privacidad y UI

25. detalle y continuación comparten DTO; default 20 y límites 1/50;
26. cursor liga actor/audiencia/Pago/orden/tamaño y cada página reautoriza;
27. historia Owner paginada sin omisiones/duplicados y desempate estable;
28. sujeto/exintegrante sólo propia, sin actor/explicación;
29. Tesorería mínima y sin acción/historia general;
30. otros grants/cargo/roles/IDs no autorizan;
31. Grupo archivado sólo Owner/Pago prearchivo;
32. advertencia saldada se deriva en UI, muestra cuatro importes y no usa preview adicional;
33. stale del detalle exige recarga; el comando revalida todo;
34. Historial de pagos no contiene correcciones;
35. Rules deny-all y DTOs sin evidencia técnica.

### 4.5 Regresión focal

36. E3-01 snapshots, unicidad, generación y recovery;
37. E3-02 consulta Tesorería read-only;
38. E3-03 informar/confirmar/rechazar/revertir usa principal vigente;
39. E3-04 preview/registro/coordinación/reversión usa principal vigente;
40. E3-05 anulación prospectivamente compatible con v4 y `VOIDED` terminal;
41. D5-044, D5-045, Auth/UAT aislada y gate legacy sin cambios.

No se reabre E2-14 ni se repiten suites completas para obtener verde global.

## 5. UAT futura

1. Corregir hacia arriba/abajo una pendiente y comprobar saldo.
2. Corregir parcial sin cambiar Recepciones.
3. Aumentar saldada viendo advertencia, importes y deuda reaparecida.
4. Reducir hasta neto y bloquear debajo del neto.
5. Bloquear por aviso y navegar a revisión.
6. Stale obliga a recargar sin efectos parciales.
7. Revertir luego una Recepción y comprobar saldo contra principal corregido.
8. Consultar historia Owner, propia/exintegrante y Tesorería mínima.
9. Operar en Temporada cerrada y Grupo archivado sólo dentro de prearchivo aprobado.
10. Verificar `VOIDED` sin acción ni regeneración.
11. Anular una corregida elegible, conservar ambas historias y comprobar que no se regenera.
12. Recorrer historia Owner/propia con primera página default 20 y continuación; verificar límites
    1/50, reautorización y ausencia de historia completa en Tesorería.

UAT no fabrica carreras/recovery técnico ni integra Auth real. Firebase remoto necesita autorización
separada.

## 6. Criterios de aceptación normativa y técnica

1. D01–D11 cuentan con decisión expresa y representación coherente.
2. Principal original/base/exigible y ecuación común no son ambiguos.
3. Pago conserva autoridad única; no hay Agregado o saldo paralelo.
4. Schemas v1–v4 son cerrados, compatibles y sin backfill.
5. Contratos/DTOs/errores respetan audiencia y privacidad.
6. Avisos, ingreso, reversión y anulación poseen órdenes definidos.
7. Recovery sobrevive operaciones posteriores sin fabricar outcomes.
8. Generación conserva payload, identidad y outcomes originales.
9. Historia es append-only, paginada y consultable sólo dentro del detalle.
10. Frontend advierte explícitamente el aumento de una saldada.
11. Pruebas focales y UAT tienen evidencia identificable bajo autorización futura.
12. Exclusiones y preservaciones permanecen verificables.

## 7. Preservaciones y no efectos

- Complementa normativamente sólo Documentos 2/3/4 para E3-06 y adopta D5-051 mediante DEC-E3-06.
- No crea código, Rules, índices, datos, pruebas, Emulator o deploy.
- D5-044 y D5-045 se preservan.
- Auth/UAT real sigue aislada.
- Gate de retiro económico legacy sigue pendiente.
- Condonación, Caja, restablecimiento/reemplazo, devolución, interés, crédito y pasarela siguen fuera.
- `VOIDED` continúa terminal y la clave económica no se libera.
- No se cierra Etapa 3 ni se autoriza E3-06 o incrementos posteriores.

## Resultado

**ADDENDUM E3-06 ADOPTADO — IMPLEMENTACIÓN REQUIERE AUTORIZACIÓN SEPARADA**

No se identificó un bloqueo funcional nuevo. La adopción no implementa E3-06, no reescribe cierres
históricos y no cierra Etapa 3.
