# Addendum a Documentos 2, 3 y 4 — E3-05 / anulación de obligación sin ingresos

## Estado

- **Contenido funcional:** `E3-05-D01–D08=A APROBADAS POR EL USUARIO`.
- **Estado del artefacto:** `APROBADO COMO FUENTE NORMATIVA COMPLEMENTARIA — NO VERSIONADO`.
- **Fecha de preparación:** 2026-10-16.
- **Base:** `dev` en `782e7019d84b1bcf8b2b77b7145976774d15ce84`.
- **Ficha asociada:**
  [E3-05](../implementacion/etapa-3/E3-05-ficha-anulacion-obligacion-sin-ingresos.md).
- **Decisión asociada:**
  [DEC-E3-05](../implementacion/etapa-3/DEC-E3-05-anulacion-obligacion-sin-ingresos.md).
- **Continuidad asociada:** `D5-050`.
- **Normativa preservada:** Documentos 1–5, addenda E3-01/E3-03/E3-04, addendum de liquidación
  prearchivo, D5-044, D5-045 y decisiones D5 vigentes.

Este addendum complementa normativamente Documentos 2, 3 y 4 dentro del alcance E3-05. Los
Documentos 1/1.5 conservan autoridad sin complemento y los Documentos base prevalecen fuera de estas
precisiones. La formalización no autoriza implementación, configuración, pruebas, datos, versionado
o deploy.

## 1. Documentos aplicables y complemento mínimo

### 1.1 Documento 2

Requiere complemento porque CU-081 reconoce “Anular pago” sin distinguir una obligación indebida de
corregir el importe, condonar deuda o revertir una Recepción. Este addendum delimita un caso concreto,
sus actores, precondiciones, resultados, consultas y exclusiones.

### 1.2 Documento 3

Requiere complemento porque Pago protege las transiciones para registrar, editar o anular, pero no
define todavía la transición `VOIDED`, su composición económica, irreversibilidad ni relación con
Recepciones/aplicaciones. El complemento permanece dentro del Agregado Pago.

### 1.3 Documento 4

Requiere complemento para fijar contrato, compatibilidad de schemas, Unidad de Trabajo,
idempotencia, recovery, comprobación completa de avisos, queries, cursores, índices y privacidad.

### 1.4 Documentos 1 y 1.5

No requieren complemento. E3-05:

- no cambia la ubicación del Módulo Pagos en el Dominio Deportivo;
- no crea concepto conceptual independiente, Entidad o Aggregate Root;
- no cambia relaciones entre Pago, Grupo, Membresía, Persona o Temporada;
- no convierte Anulación, Movimiento, Caja, receipt o guard en fuente económica.

Documento 5 registra mediante D5-050 la continuidad, referencia a este addendum y alcance residual.

## 2. Complemento funcional para Documento 2

### 2.1 Finalidad y significado

Anular una obligación significa declarar, mediante una transición trazable, que esa obligación fue
creada indebidamente y no debía ser exigible. La raíz permanece para conservar historia e identidad.

Anular no significa:

- corregir el importe exigible de una obligación válida;
- condonar total o parcialmente deuda válida;
- revertir una Recepción informada o administrativa;
- devolver dinero;
- eliminar la obligación o liberar su clave económica.

La operación no registra ingreso monetario.

### 2.2 Actor y autorización

Sólo el Owner vigente del Grupo puede ejecutar la anulación. Ownership se revalida en backend para
cada comando y recovery.

No autorizan `GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW`,
`GROUP_DIRECT_PAYMENT_RECORD`, cargo descriptivo, rol global, pertenencia, historial previo ni IDs
conocidos. E3-05 no crea una capacidad delegada.

### 2.3 Precondiciones

La obligación debe:

1. existir e integrar el mismo Grupo solicitado;
2. conservar referencias, snapshot, principal, discriminador y generación íntegros;
3. estar `ACTIVE + PENDING`;
4. tener ingreso bruto, revertido y neto iguales a cero;
5. conservar saldo exigible igual al principal antes de anular;
6. no poseer documento de aplicación `APPLIED` ni `REVERSED`;
7. no aparecer en ninguna Entrega `REPORTED`;
8. coincidir con `expectedEconomicRevision`;
9. si el Grupo está archivado, acreditar Pago prearchivo conforme a la norma vigente.

No basta con neto cero: una aplicación revertida prueba historia económica y bloquea.

### 2.4 Motivo

El Owner elige una categoría cerrada:

- `DUPLICATE`;
- `WRONG_MEMBERSHIP`;
- `WRONG_CONCEPT_OR_PERIOD`;
- `NOT_OWED`;
- `OTHER`.

Registra además explicación obligatoria, normalizada NFC, de 1–240 code points y hasta 480 bytes,
sin caracteres de control ni marcas bidi. La explicación es información económica privada; no debe
incluir datos personales innecesarios.

### 2.5 Resultado

La transición única es:

`ACTIVE + PENDING + sin aplicaciones + sin aviso REPORTED relacionado -> VOIDED`

Al confirmar:

- principal, concepto snapshot, período/ocurrencia, vencimiento, referencias y creación no cambian;
- el lifecycle y estado visible pasan a `VOIDED`;
- un componente de anulación no monetario equivale al principal;
- saldo exigible pasa a cero;
- revisión económica incrementa una vez;
- se registran actor, fecha, categoría y explicación;
- no se crea Recepción, aplicación, ingreso, condonación, crédito o devolución.

`VOIDED` es terminal en E3-05. No existe desanulación ni edición posterior.

### 2.6 Obligaciones excluidas

No se anulan en este corte:

- `PARTIAL`;
- `SETTLED`;
- cualquier obligación con aplicación, incluso revertida;
- saldo íntegro restaurado por reversión;
- obligación con aviso `REPORTED` relacionado;
- obligación incompatible, no prearchivo o de otro Grupo.

La corrección del exigible, condonación y el tratamiento de obligaciones con aplicaciones requieren
incrementos posteriores explícitos. Devolución real continúa fuera del alcance aprobado.

### 2.7 Exintegrante, Temporada cerrada y archivo

Membresía finalizada, condición de exintegrante y Temporada cerrada no vuelven válida una deuda
indebida ni impiden que el Owner la anule. La operación no cambia esas raíces.

En Grupo archivado:

- sólo Owner vigente opera;
- Pago debe ser prearchivo íntegro;
- no reviven grants;
- no se crea concepto, ocurrencia u obligación;
- no se reabre Grupo, Temporada o Membresía;
- timestamps ausentes, cliente como fuente de tiempo, referencias cruzadas o creación posterior al
  archivo fallan cerrados.

### 2.8 Historia y presentación

- Owner lista anuladas del Grupo y abre detalle con Persona presentable, contexto, principal,
  categoría, explicación, actor presentable y fecha.
- Sujeto integrante/exintegrante lista sólo anuladas propias y abre detalle sin actor ni explicación
  interna.
- Tesorería conserva lectura económica mínima del Grupo: principal, concepto/contexto presentable,
  saldo cero, estado y fecha, sin categoría, actor, explicación o acción.
- Revisor E3-03 y registrante E3-04 no adquieren historia general.

La historia se integra mediante filtro `Abiertas | Anuladas` en Deudas y Mis obligaciones. No se crea
una sección permanente redundante. Historial de pagos continúa representando Recepciones; una
anulación no aparece allí ni se suma como ingreso.

## 3. Complemento de dominio para Documento 3

### 3.1 Frontera del Agregado

Pago continúa como único Aggregate Root económico. La anulación es una transición de Pago y no un
Agregado, Entidad o Movimiento independiente. Receipt, guard e índices son mecanismos técnicos sin
autoridad económica.

La operación referencia Grupo/Membresía/Temporada para contexto, autorización y prearchivo, pero
modifica únicamente Pago y evidencia técnica correlacionada.

### 3.2 Composición económica

Se definen:

- `amountMinor`: principal original e inmutable;
- `confirmedIncomeMinor`: ingreso bruto confirmado;
- `reversedIncomeMinor`: ingreso revertido;
- `netConfirmedIncomeMinor = confirmedIncomeMinor - reversedIncomeMinor`;
- `voidedAmountMinor`: efecto no monetario de anulación;
- `balanceMinor`: saldo exigible.

Ecuación:

`balanceMinor = amountMinor - netConfirmedIncomeMinor - voidedAmountMinor`

Para lifecycle `ACTIVE`, `voidedAmountMinor = 0` y se conserva la ecuación E3-03/E3-04. Para
`VOIDED`, la elegibilidad exige ingresos cero, `voidedAmountMinor = amountMinor` y saldo cero.

`voidedAmountMinor` no es condonación. La obligación no era válida; no existe acreencia válida
perdonada. Tampoco es ingreso, crédito, saldo a favor o devolución.

### 3.3 Lifecycle y estado económico

- `obligationLifecycle: ACTIVE | VOIDED`.
- Activa admite estado económico `PENDING | PARTIAL | SETTLED` conforme a reglas vigentes.
- Anulada exige `economicState/estado = VOIDED`.
- Un Pago no puede ser simultáneamente `VOIDED` y parcial/saldado.
- Estado de obligación permanece separado de `decisionState/applicationState` de Recepción.

### 3.4 Identidad e irreversibilidad

La raíz anulada conserva:

- `paymentId` determinista;
- clave `membershipId + conceptId + periodKey|occurrenceKey`;
- referencias históricas y `createdAt`;
- snapshot del concepto y principal;
- `generationIntentId`, payload hash e identidad de fila;
- outcomes terminales de generación.

No se borra, reutiliza ni libera. Otra idempotency key, otro importe/vencimiento, cambio de concepto,
reactivación o renovación no permiten recrear la misma clave. Anulación no es un mecanismo para
corregir un importe: si la obligación era válida y el importe incorrecto, corresponde el incremento
posterior de corrección.

### 3.5 Invariantes

1. Una transición efectiva por Pago.
2. Cero aplicaciones históricas, no sólo cero neto.
3. Cero aviso pendiente relacionado al confirmar.
4. Saldo nunca negativo y cero explicado por componente de anulación.
5. Principal y snapshots inmutables.
6. Revisión económica monotónica.
7. Pago anulada bloquea CU-015 igual que cualquier Pago; no hay cascada.
8. Grupo, Membresía, Temporada, Persona y Períodos no cambian.
9. Historia visible según audiencia y privada por defecto.
10. Ningún reader trata anulación como ingreso o Recepción.

## 4. Complemento técnico para Documento 4

### 4.1 Contrato público

Comando lógico:

```text
voidPaymentObligation({
  groupId,
  paymentId,
  expectedEconomicRevision,
  reasonCode,
  explanation,
  idempotencyKey
})
```

Input cerrado. `groupId/paymentId` son IDs opacos válidos; revisión es entero positivo; key cumple el
contrato E3; categoría pertenece al enum; explicación cumple §2.4.

El backend deriva actor, ownership, Persona, Membresía, Temporada, principal, saldos, estado,
prearchivo y timestamps.

Resultados:

- `VOIDED`: efecto confirmado por esta intención;
- `EXISTING`: mismo scope/key/payload recupera el efecto previo;
- `PENDING_RECOVERY`: outcome todavía incierto.

Errores estables mínimos:

- no autenticado/no accesible, con privacidad negativa;
- `PAYMENT_NOT_VOIDABLE`;
- `PAYMENT_PENDING_NOTICE`;
- `PAYMENT_VOID_STALE`;
- `PAYMENT_NOT_PREARCHIVE`;
- `IDEMPOTENCY_CONFLICT`;
- `INCOMPATIBLE_STATE`;
- dependencia no disponible.

Un actor no autorizado no distingue inexistencia, lifecycle, aplicaciones o archivo.

### 4.2 Persistencia y schemas

`payments/{paymentId}`:

- v1: se normaliza como `ACTIVE`, ingresos cero, `voidedAmountMinor=0`, saldo=principal, revisión 1;
- v2: se normaliza como `ACTIVE`, `voidedAmountMinor=0`, conserva economía existente;
- v3 activa: conserva invariantes v2 y explicita lifecycle/componente cero si la forma final lo
  requiere;
- v3 anulada: lifecycle/estado `VOIDED`, componente igual al principal, saldo cero, ingresos cero,
  revisión incrementada, motivo/actor/timestamp completos.

No hay backfill general. La transición evoluciona sólo la raíz alcanzada. Readers aceptan v1/v2/v3
y fallan ante formas parciales; no reparan al leer.

Receipt técnico deny-all, colección/nombre físico a validar, conserva:

- actor, Grupo, operación e idempotency key hasheada;
- request hash canónico;
- `paymentId`, outcome y timestamp;
- evidencia mínima para reconciliar revisión y transición.

No conserva key cruda, email, nombre de Persona o copia de Membresía. Se retiene sin TTL hasta una
política que preserve tombstone/recovery.

No se crea colección `voids` como fuente funcional ni Agregado Anulación.

### 4.3 Idempotencia y recovery

Scope: actor + Grupo + operación + key. Hash incluye `paymentId`, revisión esperada, categoría y
explicación normalizada.

- misma key/payload: reautoriza, reconcilia receipt/raíz y devuelve `EXISTING`;
- misma key/payload distinto: conflicto;
- key distinta: no permite segunda transición;
- receipt ausente + raíz activa íntegra: reintenta sólo tras todas las validaciones;
- receipt ausente + raíz `VOIDED`: no atribuye el efecto al actor; falla incompatible;
- receipt presente + raíz no anulada/evidencia parcial: nunca éxito;
- pérdida de respuesta sin conclusión: `PENDING_RECOVERY`.

Recovery no recalcula motivo, no cambia revisión y no exige que consultas posteriores conserven el
mismo cursor.

### 4.4 Unidad de Trabajo y concurrencia

La transacción:

1. lee receipt y Pago;
2. reautoriza Cuenta/Owner;
3. lee Grupo y acredita prearchivo si está archivado;
4. valida revisión/lifecycle/estado/economía;
5. consulta ausencia total de aplicaciones subordinadas;
6. lee guard de candidatos;
7. ejecuta la comprobación completa de avisos §4.5;
8. actualiza Pago y guard y crea receipt.

Órdenes:

- anulación antes de informe/registro: writer posterior ve `VOIDED` y no crea efecto;
- informe antes de anulación: guard cambia y el retry detecta aviso;
- ingreso antes de anulación: Pago/aplicación cambian y bloquean;
- reversión antes de anulación: la aplicación `REVERSED` sigue bloqueando;
- archivo antes de anulación: sólo Owner y Pago prearchivo;
- dos anulaciones: una transición; retry idéntico recupera;
- generación concurrente: una raíz determinista; nunca recreación.

### 4.5 Comprobación completa de avisos

No se reutiliza el máximo de 20 de E3-04. La query dentro de la operación es:

```text
paymentDeliveries
  .where("membershipId", "==", payment.membershipId)
  .where("decisionState", "==", "REPORTED")
  .orderBy("__name__", "asc")
```

No usa `limit`. Debe consumir todos los resultados y buscar `paymentId` en todas las líneas. Una
consulta fallida, truncada o fuera de presupuesto produce fallo cerrado/dependencia no disponible;
nunca “sin avisos”.

La transacción lee y escribe el guard por Grupo+Membresía. Todos los writers de alta/decisión de
avisos y registro administrativo deben continuar mutándolo, de modo que un cambio concurrente
cause retry/conflicto antes del commit.

Índice previsto: `membershipId ASC + decisionState ASC + __name__ ASC`. No se escribe configuración
ejecutable en este borrador.

No se define máximo funcional ni se afirma un peor caso finito demostrado. Bajo una futura
autorización de implementación, la comprobación ejecutable inicial debe usar Emulator local, datos
sintéticos y volúmenes explícitos crecientes. Debe medir documentos/lecturas, bytes de datos y
respuesta y tamaño del write set cuando sean observables, además de duración de query/transacción.

Completitud/corrección se evalúa separadamente del rendimiento: la evidencia debe encontrar un
`paymentId` relacionado al inicio, medio y final del conjunto, y sólo afirmar ausencia después de
consumirlo completo. Una lectura truncada, timeout o agotamiento de presupuesto bloquean cerrado; un
tiempo aceptable para cierto volumen no prueba un máximo global.

Si la comprobación resulta inviable, se detiene esta parte y se presenta la decisión arquitectónica
necesaria. Una proyección invertida por `paymentId` tendría que resolver compatibilidad v1/v2,
inicialización completa, reparación, todos los writers E3-03/E3-04 y autoridad del guard. No se
adopta ahora ni se permite degradar a 20 o introducir otro límite funcional implícito. Este trabajo
documental no autoriza ejecutar la comprobación.

### 4.6 Generación e identidad económica

La comparación de generación distingue forma original inmutable de lifecycle posterior:

- un outcome terminal histórico permanece terminal;
- recovery del intent creador reconoce raíz/hash/generationIntent original y presenta lifecycle
  actual, sin reejecutar;
- una intención nueva para la misma clave encuentra el tombstone `VOIDED` y termina
  `FAILED/OBLIGATION_VOIDED`;
- un payload diferente no sobrescribe ni adopta la raíz;
- no existe operación que libere el ID determinista.

### 4.7 Consultas, cursores e índices

Deuda abierta:

- filtros físicos `estado in [PENDING, PARTIAL]`;
- `VOIDED` no se suma al saldo ni cuenta como abierta;
- frontend no filtra después del límite.

Historia anulada:

- Owner/Tesorería: `groupId == scope`, `estado == VOIDED`, orden
  `voidedAt DESC, __name__ DESC`;
- propia: `personId == actor.personId`, `estado == VOIDED`, mismo orden;
- páginas `1..50`, default 20, sin offsets;
- cursor opaco ligado a contrato, actor, audiencia, scope, filtro, orden y page size;
- ancla revalidada y autorización repetida en cada página.

Índices previstos:

- `payments(groupId ASC, estado ASC, voidedAt DESC, __name__ DESC)`;
- `payments(personId ASC, estado ASC, voidedAt DESC, __name__ DESC)`;
- aviso completo de §4.5.

Ningún índice se crea mediante este borrador.

### 4.8 DTOs y privacidad

DTO Owner anulada:

- identidad opaca, contexto y Persona presentable;
- concepto/snapshot, principal, saldo cero, estado/revisión;
- categoría, explicación, fecha y actor presentable.

DTO propio:

- no existe hoy un contrato público de detalle propio de obligación; `getMyPaymentDelivery` y
  `getMyPaymentReceipt` son detalles de Recepción y no se reutilizan;
- contrato mínimo nuevo `getMyPaymentObligationDetail({ paymentId })`;
- autorización derivada de Cuenta→Persona, igualdad con `payment.personId` y correlación íntegra de
  la Membresía histórica, sin exigir Membresía activa; admite exintegrante y Grupo archivado;
- obligación propia con principal, concepto snapshot, período/ocurrencia, vencimiento, contexto
  presentable de Grupo/Temporada, saldo cero, estado `VOIDED`, categoría y fecha;
- sin UID, actor, email, explicación interna, hashes, grants o paths.
- lectores v1/v2/v3 compatibles; el filtro `Anuladas` sólo enlaza v3 `VOIDED`;
- errores privados `PERSON_REQUIRED`, `PAYMENT_NOT_ACCESSIBLE`, `INCOMPATIBLE_STATE` y
  `VALIDATION_FAILED`, sin confirmar existencia ajena.

DTO Tesorería:

- presentación mínima de Persona, contexto, principal, saldo cero, estado/fecha;
- sin acción, categoría, explicación, actor, avisos o IDs técnicos.

Explicación, categoría y actor nunca salen hacia Tesorería.

### 4.9 Frontend

- acción **Anular obligación** sólo en detalle Owner dentro de Economía;
- modal con principal/contexto, advertencia de irreversibilidad y de que no registra/devuelve dinero,
  categoría, explicación y confirmación;
- advertencia expresa: la misma cuota/ocurrencia no podrá regenerarse; si el importe era incorrecto,
  debe cancelarse el flujo y esperar/utilizar la futura corrección, no anular;
- single-flight, key estable durante incertidumbre, stale revisable y recovery visible;
- bloqueo por aviso enlaza a Pagos informados sin decidirlo;
- filtro `Abiertas | Anuladas` dentro de Deudas/Mis obligaciones para descubrimiento;
- en **Mis obligaciones**, `Anuladas` abre
  `getMyPaymentObligationDetail({ paymentId })`; se reutiliza el contenedor visual del detalle
  existente, no el contrato ni el detalle de Recepción;
- detalles Owner/Tesorería evolucionan según audiencia, sin nuevas rutas o secciones permanentes;
- Historial de pagos no mezcla anulaciones con Recepciones;
- saldo, elegibilidad y privacidad provienen del backend.

## 5. Pruebas focales mínimas futuras

1. v1/v2 elegibles evolucionan a v3 anulada con ecuación exacta;
2. principal/snapshots/generación no cambian;
3. parcial, saldada, aplicada y revertida bloquean;
4. aviso relacionado bloquea; rechazado terminal no bloquea;
5. comprobación ejecutable inicial autorizada en Emulator local con datos sintéticos y volúmenes
   explícitos: más de 20 avisos, posición inicial/media/final, ausencia completa y medición separada
   de lecturas, bytes y duración; fallo no equivale a ausencia;
6. carreras con reportar, confirmar, registrar, revertir, generar y archivar;
7. dos anulaciones/retries producen un efecto;
8. aborto antes/después de commit y evidencia parcial;
9. Grupo archivado sólo Owner/Pago prearchivo;
10. Temporada cerrada y exintegrante sin mutación contextual;
11. raíz anulada impide recreación con misma/diferente key o payload;
12. outcomes históricos y recovery original permanecen;
13. resumen y deudas excluyen anulada; historia la pagina sin duplicación;
14. privacidad Owner/propia/Tesorería, detalle propio para exintegrante y rechazo de otros actores;
15. Rules deny-all para Pago, receipt y guard;
16. regresión E3-01/E3-03/E3-04 y preservación de D5-044/D5-045/gates.

## 6. UAT futura mínima

1. Owner anula pendiente sin aplicaciones y verifica saldo/resumen/historia.
2. La advertencia confirma que la clave no puede regenerarse y que anulación no corrige importe.
3. Sujeto, incluido exintegrante, encuentra la anulada propia y abre detalle de obligación sin
   actor/explicación ni una Recepción fabricada.
4. Tesorería la consulta con DTO mínimo y sin categoría, actor, explicación o acción.
5. Aviso pendiente bloquea y dirige a revisión sin resolverlo.
6. Parcial, saldada y revertida bloquean sin sugerir devolución/condonación.
7. Grupo archivado admite sólo Owner y Pago prearchivo.
8. Regeneración de la misma clave no crea deuda.
9. Retry después de respuesta perdida recupera una transición.

UAT no fabrica carreras o recovery técnico y no implica Firebase remoto o deploy.

## 7. Criterios de aceptación normativa

1. D01–D08=A se reflejan sin ampliar alcance.
2. Saldo cero distingue efecto no monetario de ingreso/condonación.
3. Aplicación revertida bloquea.
4. Avisos se comprueban completamente sin límite 20.
5. Identidad impide recreación accidental.
6. Pago es única autoridad y no existe Agregado Anulación.
7. Schemas/readers v1/v2/v3 fallan cerrados ante inconsistencia.
8. Autorización Owner-only y archivo/prearchivo están explícitos.
9. Historia es descubrible sin mezclar Historial de pagos.
10. Queries/cursores/índices y privacidad son verificables.
11. Corrección, condonación, aplicaciones y devolución conservan destino posterior.
12. Implementación requiere autorización separada.

## 8. Exclusiones y preservaciones

Este addendum no:

- modifica Documentos 1/1.5 ni contenido de Documento 5 fuera de la continuidad D5-050;
- crea Agregado/Entidad Anulación o fuente económica paralela;
- implementa corrección, condonación, devolución, Caja, interés, crédito, cobro automático o
  pasarela;
- amplía Tesorería, revisión, registro directo, cargo o roles;
- cambia Recepciones/reversión existentes;
- reabre E2-14 o adelanta D5-044;
- declara resuelto D5-045;
- mezcla Auth/UAT real con evidencia sintética;
- satisface el gate de retiro económico legacy;
- autoriza código, Rules, índices, pruebas, datos, Firebase remoto o deploy;
- declara E3-05 lista para implementar ni cierra Etapa 3.

## Resultado

`ADDENDUM E3-05 APROBADO — FUENTE NORMATIVA COMPLEMENTARIA DE DOCUMENTOS 2/3/4`
