# DEC-E3-04 — Registro administrativo directo de una recepción

## Estado

`ADOPTADA — D5-049 — IMPLEMENTACIÓN NO AUTORIZADA`

- **Fecha de preparación:** 2026-10-14.
- **Base:** `dev` en `27ea7b044e8e0d4e524b41d7dcc15a2125b7b1e4`.
- **Carácter:** decisión normativa adoptada y registrada en Documento 5.
- **Identificador D5:** `D5-049`.
- **Decisiones funcionales aprobadas:** E3-04-D01–D06 y E3-04-R01–R04.
- **Ficha:** [E3-04](./E3-04-ficha-registro-administrativo-pago.md).
- **Addendum adoptado:**
  [addendum E3-04](../../arquitectura/Documento-1-1.5-2-3-4-addendum-E3-04-registro-administrativo-pago.md).

Este documento adopta las decisiones E3-04 y su addendum conjunto mediante D5-049. La formalización
no autoriza implementación ni declara E3-04 implementado o cerrado.

## 1. Contexto

E3-03 implementó Entrega informada: el sujeto declara una recepción y Owner o revisor explícito la
confirma/rechaza; Pago conserva aplicaciones, saldo y estado. E3-04 atiende otro hecho: la
administración ya constató una recepción y necesita registrarla directamente contra obligaciones
existentes, sin fabricar una declaración del sujeto y sin duplicar economía.

La incorporación de E3-03 vuelve innecesario rediseñar aplicaciones, saldo, historia o reversión,
pero exige una evolución explícita de identidad, autoría, avisos relacionados y concurrencia.

## 2. Decisiones aprobadas

### E3-04-D01 — Raíz generalizada

Se adopta la generalización compatible de Entrega informada a la raíz **Recepción**, con unión
cerrada `INFORMED | ADMINISTRATIVE`.

- `INFORMED` preserva declaración, autor, decisión, contratos y evidencia E3-03.
- `ADMINISTRATIVE` conserva registrante, fecha constatada y aplicaciones inmediatas; no contiene
  declaración o confirmación atribuida al sujeto.
- Documentos/aplicaciones/reversiones E3-03 v1 siguen legibles como `INFORMED` sin backfill general.
- Pago continúa como única autoridad económica.

### E3-04-D02 — Scope y atomicidad

Una recepción administrativa distribuye importe exacto entre 1..20 obligaciones únicas del mismo
Grupo, Temporada, Membresía y Persona. Registro y reversión afectan todas las líneas o ninguna. La
excepción es propia de E3-04 y no generaliza transacciones multi-Agregado.

`FULL` exige `amountMinor == expectedBalanceMinor`; `PARTIAL` exige importe positivo no superior al
saldo esperado. Preview y commit conservan ese importe exacto. Si saldo o `economicRevision`
cambian, el comando falla stale y no sustituye silenciosamente el importe por el saldo actual.

### E3-04-D03 — Aviso resuelto administrativamente

Un aviso reconocido como la misma entrega real que requiere corrección pasa a
`RESOLVED_BY_ADMINISTRATIVE_RECEIPT` en la misma transacción del registro. Conserva declaración,
resolución y vínculo; no crea aplicación ni ingreso propios. Presenta el estado aplicado/revertido
de la recepción asociada sin sumar dinero dos veces. Revertir el registro no reabre el aviso.

### E3-04-D04 — Identificación humana completa

Todos los avisos `REPORTED` de la misma Membresía son candidatos. Esta regla sustituye el filtro
preliminar por intersección de Pagos porque un desglose equivocado puede corresponder a la misma
entrega sin compartir el mapa correcto. Cada aviso requiere clasificación explícita: distinto,
correcto/confirmable, misma entrega con corrección, o indeterminado. No hay heurística automática.
Indeterminado, omisión, extra o revisión stale bloquean el registro.

### E3-04-D05 — Owner y delegación explícita

El primer corte incluye Owner y capacidad fija `GROUP_DIRECT_PAYMENT_RECORD`. Sólo Owner
concede/revoca. Grants, slots, ancla, `ownershipRevision`, revocación y reautorización transaccional
siguen el patrón E3-02/E3-03. No se amplían o convierten `GROUP_TREASURY`,
`GROUP_PAYMENT_NOTICE_REVIEW`, cargo o grants existentes.

### E3-04-D06 — Consulta propia

El sujeto ve evento administrativo propio con origen, fecha, total, líneas y estado
aplicado/revertido. No ve Cuenta del registrante, notas, grants, receipts ni decisiones ajenas.

### E3-04-R01 — Correcciones que habilitan resolución

`SAME_REQUIRES_ADMINISTRATIVE_RECORD` exige `correctedFields`, conjunto no vacío compuesto por
`AMOUNT_OR_ALLOCATION` y/o `RECEIVED_DATE`. Backend deriva diferencias comparando fecha y mapa
canónico `paymentId -> importe`, y exige igualdad exacta con `correctedFields`; una etiqueta sin
diferencia o una diferencia omitida falla. No existe un motivo genérico.

Un aviso correcto y aplicable se confirma mediante E3-03. Falta de permiso de revisión, preferencia
de UI y stale transitorio no habilitan resolución administrativa. Un delegado sin revisión recibe
`NOTICE_CONFIRMATION_REQUIRED` y deriva a Owner/revisor; no obtiene autoridad implícita.

### E3-04-R02 — Límites del delegado

- no registra contra ninguna Membresía de su Persona;
- reversión es Owner-only;
- Grupo archivado admite sólo Owner y Pagos prearchivo.

### E3-04-R03 — Máximo de avisos

Máximo 20 avisos relacionados, independiente de las obligaciones. La consulta pide 21 para detectar
exceso y bloquea sin omitir/truncar. Deben resolverse avisos por E3-03 antes de un nuevo preview. La
medición ejecutable del presupuesto queda para implementación.

### E3-04-R04 — Historia delegada

El delegado no posee listado histórico general. Recupera por referencia conocida sólo comandos
propios, con autorización vigente y DTO mínimo. Owner conserva historia general; sujeto, propia.

## 3. Recorrido aprobado

```text
Owner/delegado autorizado busca una Membresía
-> selecciona 1..20 obligaciones y fecha/importes
-> preview transaccional de Pagos + todos los REPORTED de la Membresía
-> clasifica 0..20 candidatos
-> aviso correcto: salir y confirmar por E3-03
-> indeterminado/exceso/stale: bloquear
-> aplicar recepción ADMINISTRATIVE + resolver avisos corregidos + guard, todo o nada
-> Pago devuelve saldos/estados canónicos
-> Owner puede revertir sin reabrir avisos
```

## 4. Guard y concurrencia

Un guard técnico por Grupo/Membresía serializa cambios del conjunto candidato. Se inicializa de
forma lazy; no hay backfill ni reparación silenciosa. Contiene sólo revisión monótona,
timestamps/contexto/schema, no snapshot, IDs o conteo, y no reserva saldo ni guarda
autorización/economía.

Writers coordinados:

- `reportOwnPaymentDelivery`;
- `confirmPaymentDelivery`;
- `rejectPaymentDelivery`;
- `recordAdministrativeReceipt` al resolver avisos;
- cualquier writer futuro que cambie el conjunto, previa decisión propia.

Preview lee guard, candidatos y Pagos en una transacción. Commit repite y compara revisión, digest,
IDs/revisiones/líneas, saldos y revisiones económicas. Alta, decisión/resolución de aviso, cambio de
Pago, autorización, ownership, lifecycle o integridad invalidan y exigen nueva revisión humana.

Cuando falta guard, preview E3-04 consulta con límite 21 y lo crea en su transacción. Con 0..20,
ausencia del elemento 21 acredita conjunto completo; con 21 sólo acredita exceso y no devuelve una
muestra/digest utilizable. Dos inicializadores compiten y el perdedor reintenta.

Reportar, confirmar y rechazar E3-03 crean/actualizan el guard junto con su cambio puntual sin
enumerar pendientes. Siguen funcionando por `deliveryId` con más de 20 avisos y permiten reducir el
conjunto antes de otro preview. Sólo una transición efectiva incrementa revisión; recovery terminal
no lo hace nuevamente. El máximo 20 limita sólo revisión/registro E3-04, no comandos E3-03.

## 5. Idempotencia y recovery

El hash incluye actor, scope, fecha, líneas/snapshots, revisión/digest y todas las clasificaciones.
Misma key/intención recupera; distinta intención conflictúa.

Recovery reautoriza y valida evidencia original: receipt, request hash, raíz, líneas/importes,
aplicaciones, fuentes y vínculos. Conserva outcome/importes originales. No exige que guard, saldo o
`economicRevision` actuales igualen snapshots históricos después de operaciones legítimas. Si se
incluye estado actual, se presenta separado. Persistencia parcial es `INCOMPATIBLE_STATE`.

## 6. Seguridad, privacidad e historia

- Owner opera por Cuenta/ownership y administra grants E3-04.
- Delegado revalida Cuenta–Persona, ancla, slot, grant, Grupo activo y ownership revision.
- Revocación, cambio de Owner y archivo no reviven autoridad.
- Lectura delegada se limita a sujetos presentables, obligaciones de una Membresía, candidatos y
  outcome propio conocido.
- Owner ve historia general y revierte; delegado no lista historia; sujeto ve historia propia.
- Firestore cliente permanece deny-all.

### 6.1 Historia compatible sin backfill

La historia unificada no filtra/ordena v1 por campos ausentes. Compone dos streams físicos:

- Owner informado v1/v2: `groupId + decisionState=CONFIRMED`, orden
  `confirmedAt DESC + __name__ DESC`; Owner administrativo v2:
  `groupId + origin=ADMINISTRATIVE`, orden `recordedAt DESC + __name__ DESC`;
- propio informado v1/v2: `personId`, orden `reportedAt DESC + __name__ DESC` —el orden exige ese
  campo y excluye ADMINISTRATIVE—; propio
  administrativo v2: `personId + origin=ADMINISTRATIVE`, orden
  `recordedAt DESC + __name__ DESC`.

Backend normaliza resultados ya incluidos y los mezcla por `eventAt DESC, receiptId DESC`. Cursor
opaco compuesto conserva un ancla física por stream y sólo la avanza por elementos emitidos; lo
prefetched no emitido se relee. Esto evita omisiones/duplicados. Cada página reautoriza y liga cursor
a actor/scope/filtros/tamaño. Contratos E3-03 conservan queries, cursores, `deliveryId`, campos y
semántica existente; nuevos readers de Recepción realizan la composición. La evolución del DTO
significa conservar campos y
semántica de estados existentes; para nuevas resoluciones se amplía de forma aditiva/versionada con
`RESOLVED_BY_ADMINISTRATIVE_RECEIPT` y bloque opcional mínimo. La evidencia histórica no se
reclasifica. Para un conjunto estable no hay omisiones/duplicados; altas posteriores se ven al
refrescar desde el inicio, no se inyectan a mitad del recorrido.

## 7. Presupuesto y validación futura

Con `N<=20` obligaciones y `M<=20` avisos:

- registrar: `2N + M + 3`, máximo 63 escrituras;
- preview: hasta 20 Pagos y consulta de 21 avisos para detectar exceso;
- reportar E3-03: 3 escrituras con guard;
- confirmar E3-03: `2N + 3`, máximo 43;
- rechazar E3-03: 3;
- reversión E3-03 no cambia candidatos.

Son presupuestos de diseño. Medición ejecutable, tamaño, retries, latencia y contención pertenecen a
implementación futura. Las carreras se prueban automáticamente, no mediante UAT manual.

## 8. Registro mínimo en Documento 5

D5-049:

1. agrega a §7.5 la continuidad E3-04;
2. registra esta decisión después de D5-048;
3. reconoce `GROUP_DIRECT_PAYMENT_RECORD` como capacidad fija independiente y resuelve D5-043 sólo
   para ella;
4. preserva D5-044, D5-045 y el gate de retiro económico legacy.

### 8.1 Texto incorporado en §7.5

> E3-04 incorpora registro administrativo directo mediante la raíz Recepción generalizada con
> orígenes `INFORMED | ADMINISTRATIVE`. Owner o un registrante con capacidad independiente aplica
> una recepción a 1–20 Pagos del mismo contexto, todo-o-nada. Todos los avisos pendientes de la
> Membresía se revisan explícitamente, máximo 20; un aviso correcto se confirma por E3-03 y uno que
> requiere corregir importe/desglose o fecha puede resolverse mediante el registro administrativo,
> conservando declaración y vínculo sin ingreso propio. Pago conserva toda autoridad económica.
> Reversión y archivo permanecen Owner-only; delegado carece de historia general y auto-registro.

### 8.2 Decisión registrada

| ID | Decisión | Estado | Alcance | Consecuencia |
| --- | --- | --- | --- | --- |
| `D5-049` | E3-04 adopta Recepción `INFORMED | ADMINISTRATIVE`, registro multiobligación, coordinación con avisos y `GROUP_DIRECT_PAYMENT_RECORD` | `APROBADA` | Etapa 3 / E3-04 | Ficha lista para implementar con autorización separada; D5-043 queda resuelta sólo para esta capacidad; D5-044, D5-045 y gate económico no cambian |

## 9. Evidencia futura

La ficha y el addendum adoptado detallan contratos, schemas, repositorios, queries, índices,
cursores, errores, frontend, pruebas automatizadas y UAT. Una revisión normativa debe comprobar su
consistencia antes de cualquier autorización de código.

## 10. Preservaciones y no efectos

- Pago mantiene toda autoridad económica por obligación.
- Declaraciones, contratos y evidencia E3-03 se conservan.
- D5-043 no habilita perfiles o capacidades por analogía.
- D5-044/D5-045 y el gate económico legacy no cambian.
- Cargo sigue descriptivo.
- Auth/UAT permanece aislada.
- No se autoriza código, pruebas, suites, Emulator, Firebase remoto, deploy o Git de integración.
- No se declara E3-04 implementado/cerrado ni Etapa 3 cerrada.

## Resultado

`DEC-E3-04 ADOPTADA — D5-049 — LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA`
