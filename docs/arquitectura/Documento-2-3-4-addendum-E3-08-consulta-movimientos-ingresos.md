# Addendum a Documentos 2, 3 y 4 — E3-08 / consulta de movimientos de ingresos registrados

## Estado

- **Naturaleza:** fuente normativa complementaria adoptada con enmienda B integrada.
- **Decisiones funcionales incorporadas:** `E3-08-D01=A`, `D02=A`, `D03=A`, `D04=A`.
- **Decisión histórica asociada:** DEC-E3-08 / `D5-053` (mecanismo A).
- **Decisión complementaria:** `D5-054`.
- **Estado:** `ADOPTADO`.
- **Base:** `dev` en `39135a830a1e5bf17eca18cd46569715c04cce1a`.
- **Paquete:** [ficha E3-08](../implementacion/etapa-3/E3-08-ficha-consulta-movimientos-ingresos.md)
  y [DEC-E3-08](../implementacion/etapa-3/DEC-E3-08-consulta-movimientos-ingresos.md).

Este documento complementa prospectivamente los Documentos 2, 3 y 4 sólo dentro del alcance
E3-08. D01–D04=A y D5-053 permanecen. B sustituye prospectivamente a A sólo en entrega,
paginación y autorización de consulta. D5-054 adopta la enmienda sin reescribir D5-053. La
actualización no autoriza implementación.

## 1. Complemento funcional para Documento 2

### 1.1 Finalidad y pregunta operativa

E3-08 permite consultar:

> qué ingresos y reversiones de registros confirmó el sistema durante un período para un Grupo y
> cuál es el efecto monetario registral neto de esos hechos.

La respuesta es un extracto privado de actividad registral, no una cuenta financiera. No determina
efectivo físico, banco, patrimonio, deuda total, cobrabilidad o contabilidad.

### 1.2 Vocabulario obligatorio

- **Ingreso registrado:** efecto monetario de una Recepción `INFORMED` confirmada o
  `ADMINISTRATIVE` aplicada, contado una vez por su `totalMinor` raíz.
- **Reversión de registro:** neutralización completa de una Recepción y sus aplicaciones. Conserva
  historia y no acredita devolución ni egreso real.
- **Ingreso neto registrado del período:** ingresos registrados menos registros revertidos cuyos
  hechos registrales pertenecen al período. Puede ser negativo.
- **Fecha registral:** `confirmedAt | recordedAt | reversedAt`, timestamp autoritativo de servidor.
- **Fecha efectiva:** `declaredPaidOn | receivedOn`, fecha civil informativa.
- **Corte de lectura:** `readCutoffExclusive`, límite técnico de consistencia; no es una fecha
  funcional ni un snapshot histórico durable.

No debe usarse **saldo de caja** para ninguno de esos totales.

### 1.3 Alcance cerrado

Incluye:

1. consulta por Grupo y rango civil;
2. origen `INFORMED | ADMINISTRATIVE`;
3. ingresos y reversiones como hechos separados;
4. totales exactos del conjunto completo aceptado;
5. respuesta completa privada y paginación visual Owner/Tesorería;
6. compatibilidad v1/v2, concurrencia y lifecycle vigente;
7. frontend discreto, pruebas, mediciones futuras y UAT.

Excluye egresos, gastos, saldo inicial, cuentas bancarias, crédito, devolución real, saldo a favor,
pasarela, conciliación, exportación, contabilidad, balance general, deuda agregada y automatización.
No crea Caja, asiento, Movimiento persistido, Agregado, proyección o escritor.

### 1.4 Actores y autorización — D02=A

**Owner vigente:** consulta cualquier Recepción válida de su Grupo activo y conserva historia
read-only en Grupo archivado. Puede usar el `receiptId` para abrir el detalle Owner ya autorizado.
No necesita Persona propia.

**`GROUP_TREASURY` efectivo:** su capacidad se amplía explícitamente sólo con
`listGroupRegisteredIncomeMovements`, sobre el Grupo activo concedido. Cada apertura, refresh o
cambio de rango revalida Cuenta, Persona, grant, slot, Membresía, `validityAnchor`, Temporada, Owner
y `ownershipRevision`. Recibe hasta 1.000 DTO mínimos de §3.3 y ninguna acción.

No autorizan cargo, rol global, `GROUP_PAYMENT_NOTICE_REVIEW`, `GROUP_DIRECT_PAYMENT_RECORD`, otra
capability, Membresía aislada, Persona propia ni conocimiento de IDs. La ampliación no delega
condonación ni crea roles configurables.

### 1.5 Lifecycle y archivo

- revocación, finalización, reactivación, renovación, cierre de Temporada y cambio de Owner aplican
  las reglas E3-02 sin herencia ni revival;
- cada apertura, refresh y cambio de rango reautoriza; perder acceso detectado impide nuevas
  consultas y exige limpiar la vista;
- `GROUP_TREASURY` nunca opera ni consulta en Grupo archivado;
- Owner conserva consulta histórica del Grupo archivado;
- E3-08 no crea, modifica, revierte o liquida obligaciones/Recepciones y no revive actividad
  deportiva.

### 1.6 Eje temporal — D01=A

`from/to` son fechas `YYYY-MM-DD` inclusivas en `America/Argentina/Buenos_Aires`. Backend convierte
a `[periodStartInclusive, periodEndExclusive)`. Si ambas faltan deriva el mes civil actual; si falta
una, rechaza. El rango máximo es 92 días.

Cada stream usa su fecha registral. Fecha efectiva se muestra separada y nunca filtra. Una
reversión posterior sólo aparece en el período que contiene `reversedAt`; no reescribe el período
del ingreso original.

### 1.7 Flujo principal

1. Actor abre **Economía** o su superficie de Tesorería.
2. UI envía sólo Grupo y rango opcional.
3. Backend autentica y reautoriza la audiencia.
4. La transacción read-only fija corte técnico desde su `readTime` común.
5. Backend lee de forma acotada los streams, normaliza hechos y falla al detectar el 1.001.
6. Valida cada raíz, construye manifiesto, totales y digest completos.
7. Obtiene presentación autorizada y minimiza hasta 1.000 DTO por audiencia.
8. Devuelve conjunto completo, totales, digest y corte coherentes.
9. UI conserva la respuesta sólo en memoria, pagina visualmente 20/50 y renderiza sólo filas visibles.

### 1.8 Flujos alternativos

| Condición | Resultado |
|---|---|
| no autenticado/no autorizado | rechazo privado sin filtrar existencia |
| Grupo archivado + Tesorería | `GROUP_TREASURY_NOT_AUTHORIZED`; limpiar datos |
| sólo una fecha/formato/orden inválido | `INVALID_DATE_RANGE` |
| más de 92 días | `RANGE_TOO_WIDE` |
| hecho 1.001 | `MOVEMENT_LIMIT_EXCEEDED`, sin filas/totales |
| respuesta tardía de contexto/generación anterior | descartar sin repoblar la vista |
| raíz/schema/lifecycle incoherente | `DATA_INCOMPATIBLE`, fallo cerrado |
| dependencia temporal | `DEPENDENCY_UNAVAILABLE`, reintento seguro |

### 1.9 Frontend funcional

La sección **Movimientos de ingresos** se integra discretamente dentro de **Economía** y Tesorería.
Presenta:

- rango civil y mes actual por defecto;
- **Ingresos registrados**, **Registros revertidos**, **Ingreso neto registrado del período** y
  cantidad de hechos;
- fecha registral y fecha efectiva con etiquetas diferentes;
- origen y sujeto presentable;
- advertencia “Corrige el registro; no acredita una devolución de dinero” para reversión;
- loading, vacío, rango inválido/amplio, límite excedido, pérdida de acceso,
  incompatibilidad y error recuperable;
- foco, `aria-live`, teclado y responsive conforme a patrones existentes.

No agrega ruta global ni botones de registrar, revertir, condonar, corregir, anular, exportar o
conciliar. Tesorería no recibe enlaces a detalle Owner. La vista muestra el corte/fecha de
actualización; refresh sustituye conjuntamente filas y totales. Los datos no se escriben en
`localStorage`, `sessionStorage`, IndexedDB ni cache persistente.

## 2. Complemento de dominio para Documento 3

### 2.1 Autoridades separadas

**Recepción** conserva identidad, origen, contexto, líneas, total derivado, fecha efectiva,
timestamps registrales y lifecycle. **Pago** conserva aplicaciones, ingreso bruto/revertido/neto,
principal, deuda, condonación, saldo, estado y revisión.

E3-08 es un modelo de lectura derivado. No es Agregado, no posee Repositorio de escritura y no se
convierte en autoridad. No modifica Recepción, Pago, Grupo, grants o Membresía.

### 2.2 Hechos y movimientoId

Por cada raíz elegible:

```text
INCOME_RECORDED:
  eventAt = confirmedAt (INFORMED) | recordedAt (ADMINISTRATIVE)
  amountMinor = receipt.totalMinor

RECORD_REVERSAL:
  eventAt = reversedAt
  amountMinor = receipt.totalMinor
```

`movementId` deriva determinísticamente de `kind + receiptId`. Una raíz puede producir ambos hechos;
no puede producir dos ingresos ni dos reversiones. El merge total es
`eventAt DESC, movementId DESC`.

### 2.3 Totales e invariantes

```text
grossRecordedIncomeMinor = sum(amountMinor where kind == INCOME_RECORDED)
reversedRecordsMinor = sum(amountMinor where kind == RECORD_REVERSAL)
netRegisteredIncomeMinor = grossRecordedIncomeMinor - reversedRecordsMinor
movementCount = count(all accepted facts)
```

Invariantes:

1. `totalMinor` es entero positivo ARS y coincide con la suma de líneas.
2. La raíz se suma una vez por hecho; líneas/aplicaciones nunca se agregan aparte.
3. Un aviso resuelto administrativamente sin aplicación propia aporta cero.
4. Reversión conserva ingreso original y usa el mismo total completo.
5. `REPORTED`, `REJECTED` y resueltos sin efecto no originan ingreso.
6. Deuda, condonación/reversión, corrección y anulación aportan cero.
7. Neto puede ser negativo.
8. Cualquier incompatibilidad falla cerrada sin subtotal.
9. Moneda es ARS; no hay conversión ni redondeo.
10. Pago y Recepción permanecen autoridades únicas.

### 2.4 `receiptStateAtCutoff`

El estado presentable al corte no copia ciegamente `applicationState` actual:

```text
REVERSED si existe reversedAt válido y reversedAt < readCutoffExclusive
APPLIED  en otro caso
```

Así una reversión concurrente posterior no elimina ni cambia retrospectivamente el ingreso en la
vista. Una reversión exactamente igual al corte queda fuera por la comparación estricta.

### 2.5 Límites funcionales

- mes civil actual por defecto;
- 92 días máximo;
- 1.000 hechos máximo, no 1.000 raíces;
- ingreso y reversión cuentan por separado;
- página visual 20 o 50; no es parámetro backend.

Son reglas funcionales de rechazo, no garantías de rendimiento.

## 3. Complemento técnico para Documento 4

### 3.1 Servicio público

```text
listGroupRegisteredIncomeMovements({
  groupId,
  from?,
  to?
})
```

Input cerrado. Actor, audiencia, Persona, ownership, grant, fechas por defecto, zona, moneda,
timestamps, corte, totales y estado se derivan en backend.

### 3.2 DTO común

```text
{
  audience: "OWNER" | "TREASURY",
  scope: {
    groupId,
    from,
    to,
    timeZone: "America/Argentina/Buenos_Aires",
    currency: "ARS"
  },
  view: {
    readCutoffExclusive,
    manifestDigest
  },
  totals: {
    grossRecordedIncomeMinor,
    reversedRecordsMinor,
    netRegisteredIncomeMinor,
    movementCount
  },
  items: Movement[] // conjunto completo aceptado, 0..1000
}
```

Campos comunes de `Movement`:

```text
movementId
kind: "INCOME_RECORDED" | "RECORD_REVERSAL"
origin: "INFORMED" | "ADMINISTRATIVE"
amountMinor
eventAt
effectiveOn
receiptStateAtCutoff: "APPLIED" | "REVERSED"
subject
```

### 3.3 DTO por audiencia y privacidad

**OWNER:** agrega `receiptId` para navegar al detalle Owner existente. Puede ver sujeto presentable.
La fila no duplica explicación interna; el detalle conserva su política vigente.

**TREASURY:** recibe hasta 1.000 DTO mínimos, conserva campos comunes y sujeto presentable; omite `receiptId`, actor/UID/email,
motivo/nota, líneas, aplicaciones, avisos, hashes, paths, grants y receipts técnicos. No incluye
acciones o indicadores que simulen permiso de escritura.

Firestore cliente permanece deny-all. Toda lectura pasa por backend y minimización DTO.

### 3.4 Errores contractuales

- `UNAUTHENTICATED` / `ACCOUNT_REQUIRED`;
- `GROUP_NOT_ACCESSIBLE`;
- `GROUP_TREASURY_NOT_AUTHORIZED`;
- `INVALID_DATE_RANGE` / `RANGE_TOO_WIDE`;
- `MOVEMENT_LIMIT_EXCEEDED`;
- `DATA_INCOMPATIBLE`;
- `DEPENDENCY_UNAVAILABLE`.

Los errores de autorización no revelan Grupo, grant, Persona o economía. Límite/incompatibilidad no
devuelven filas ni totales parciales.

### 3.5 Persistencia y repositorios

No hay colección, documento, snapshot, cache o proyección nueva. Se reutilizan raíces
`paymentDeliveries` v1/v2 y capacidades públicas mínimas de autorización/presentación. Un adaptador
de consulta específico normaliza streams; no es Repositorio de Agregado ni puede escribir.

No se cambian writers. La viabilidad depende de invariantes ya vigentes: total/contexto/fechas
originales inmutables, reversión única que agrega `reversedAt`, conservación de raíz e ingreso.

### 3.6 Queries e índices previstos

| Consulta | Filtros y orden | Índice candidato |
|---|---|---|
| informado v1/v2 | `groupId ==`, `decisionState == CONFIRMED`, `confirmedAt >= start`, `< end`, `< cutoff`; `confirmedAt DESC, __name__ DESC` | `groupId, decisionState, confirmedAt DESC, __name__ DESC` |
| administrativo v2 | `groupId ==`, `origin == ADMINISTRATIVE`, `recordedAt >= start`, `< end`, `< cutoff`; `recordedAt DESC, __name__ DESC` | `groupId, origin, recordedAt DESC, __name__ DESC` |
| reversión v1/v2 | `groupId ==`, `reversedAt >= start`, `< end`, `< cutoff`; `reversedAt DESC, __name__ DESC` | `groupId, reversedAt DESC, __name__ DESC` |

No se consulta informado v1 por `origin`. Los índices son previstos, no ejecutables ni verificados.

### 3.7 Evidencia técnica conservada

Gate A ejercitó con las dependencias instaladas `runTransaction(..., { readOnly: true })`, obtuvo un
`readTime` común y comprobó frontera exclusiva. Gate B verificó reconstrucción A y sus recorridos;
A fue correcto y no se presenta como fallido. La comparación posterior de B reutilizó el manifiesto
y midió respuesta única sin cambiar dependencias.

### 3.8 Respuesta única consistente

Una única transacción read-only autoriza y ejecuta las tres queries. El `readTime` de Grupo fija
`readCutoffExclusive`; `eventAt == cutoff` queda fuera. Los streams usan presupuesto decreciente
acumulado máximo 1.001. El hecho 1.001 produce `MOVEMENT_LIMIT_EXCEEDED` antes de presentación o
serialización, sin items ni totales. Un conjunto aceptado contiene como máximo 1.000 hechos.

La misma transacción forma el manifiesto canónico, calcula digest y totales, y obtiene presentación
autorizada. Backend conserva autoridad sobre inclusión, importes, orden y totales. Presentaciones
pueden deduplicarse dentro del request, nunca mediante cache persistente.

### 3.9 Manifiesto, digest y minimización

Cada hecho interno normalizado incluye al menos `movementId`, `kind`, `receiptId`, `origin`,
`groupId`, `personId`, `amountMinor`, `eventAt`, `effectiveOn` y `receiptStateAtCutoff`. Digest
versionado cubre scope, corte y filas canónicas. Luego se minimiza: Owner conserva `receiptId`;
Tesorería no. La respuesta devuelve todos los DTO aceptados, no una página backend.

### 3.10 Estado frontend y paginación visual

Frontend mantiene filas, totales y corte sólo en memoria. Quedan excluidos `localStorage`,
`sessionStorage`, IndexedDB y cache persistente. Divide el array en páginas visuales de 20/50 y
renderiza únicamente las filas visibles; no reordena ni recalcula economía.

Cerrar sesión, cambiar Cuenta/Grupo o detectar pérdida de acceso limpia la vista. Cada request lleva
contexto y generación de UI; su respuesta se aplica sólo si ambos siguen activos. Una respuesta
tardía se descarta y no repuebla una vista limpiada.

### 3.11 Concurrencia, refresh y revocación

- cada apertura, refresh y cambio de rango autoriza de nuevo;
- refresh exitoso reemplaza conjuntamente filas, totales, digest y corte;
- confirmación/reversión posterior o igual al corte queda fuera y puede entrar en el refresh;
- reversión posterior no borra ingreso original de la vista previa;
- timestamps iguales se ordenan por `movementId`;
- pérdida de acceso se detecta mediante sesión/contexto existentes o rechazo de una nueva consulta;
  no se agregan listeners/sondeos ni se promete inmediatez;
- revocación impide nuevas consultas, pero no recupera datos ya entregados al navegador.

### 3.12 Costo observado y gates residuales

A observó 50.000/20.000 resultados de movimiento en recorridos completos de 1.000 filas para
página 20/50. B observó una única reconstrucción de 1.000 resultados, JSON sin compresión de
384.397 B Owner y 332.400 B Tesorería, transacción local 1.307,574 ms y loopback mediano
3,439/3,640 ms. No equivalen a facturación ni presupuesto aprobado; loopback y parseo Node no
acreditan callable productivo o navegador.

Cada apertura/refresh de B paga autorización/contexto, hasta 1.001 resultados de movimiento y todas
las presentaciones necesarias. El recorrido visual no hace requests. Persisten gates de transporte
callable real y heap/render/accesibilidad de navegador con 1.000 DTO y sólo 20/50 filas visibles.
Una inviabilidad detiene implementación y requiere decisión. No se autorizan snapshots persistidos,
proyección, cache, cambio de writers/dependencias, totales aproximados o exportación.

## 4. Pruebas focales futuras

No se ejecutan ni se consideran satisfechas por esta adopción documental.

### 4.1 Semántica y contratos

1. input cerrado, default de mes, ambas fechas o ninguna y máximo 92 días;
2. ARS/minor units, neto positivo/cero/negativo;
3. Recepción multilínea suma una vez;
4. ingreso y reversión suman dos hechos con igual total/opuesto efecto;
5. avisos resueltos, deuda, condonación, corrección y anulación aportan cero;
6. fecha efectiva distinta no cambia filtro;
7. reversión posterior aparece sólo en su período.

### 4.2 Consultas, compatibilidad y fronteras

8. informado v1/v2 y administrativo v2 sin exclusión por `origin` ausente;
9. tres streams disjuntos y merge determinista;
10. inicio inclusivo, fin exclusivo y cutoff exclusivo;
11. timestamps iguales resueltos por `movementId`;
12. 999/1.000 aceptados y 1.001 rechazado sin leer ilimitadamente;
13. schema/total/contexto incompatible falla completo.

### 4.3 Consistencia y entrega

14. readTime inicial proviene de una transacción read-only, no del cliente;
15. una transacción produce manifiesto, presentación, totales y DTO coherentes;
16. respuesta contiene todo el conjunto aceptado y no posee cursor/continuación;
17. frontend pagina 20/50 sin requests, reordenamiento ni recálculo;
18. confirmación/reversión antes, igual y después del corte;
19. reversión posterior conserva ingreso y `receiptStateAtCutoff` histórico;
20. array completo sin omisiones/duplicados en combinaciones v1/v2;
21. pérdida detectada bloquea nuevas consultas y limpia vista.

### 4.4 Privacidad, lifecycle y arquitectura

22. Owner activo/archivado y Owner sin Persona;
23. Tesorería efectiva sólo activa, revocada/finalizada/renovada/cambio de Owner/archivo;
24. DTO Owner versus Tesorería campo por campo;
25. capabilities/cargo/IDs ajenos denegados;
26. Rules deny-all y ausencia de acceso cliente;
27. cero writes, colección/proyección/Caja/Repositorio genérico;
28. regresión E3-01–E3-07 y baseline sin regresión atribuible.
29. memoria sólo volátil y limpieza por logout/cambio de Cuenta/Grupo;
30. respuesta tardía de otro contexto/generación descartada.

### 4.5 Medición

31. conservar evidencia A: read-only, `readTime`, frontera y recorridos 50.000/20.000;
32. callable real acredita aceptación y transferencia del payload máximo por audiencia;
33. navegador mide heap, paginación visual y render sólo de 20/50 filas con 1.000 DTO;
34. resultados/lecturas por categoría y facturación observable se distinguen;
35. fallo 1.001 conserva detección acotada y cero filas/totales;
36. resultados locales no se presentan como garantía productiva.

## 5. UAT futura

1. Owner abre mes actual y entiende los tres totales.
2. Una Recepción con varias líneas aparece una vez como ingreso.
3. Una revertida aparece como ingreso y reversión; la UI niega que sea devolución.
4. Neto negativo se presenta correctamente y no como saldo de caja.
5. Fecha registral y efectiva son comprensibles y distintas.
6. Reversión posterior no cambia el período del ingreso y aparece en el propio.
7. Tesorería efectiva ve DTO mínimo y ninguna acción/enlace Owner.
8. Revocación/finalización/archivo detectado bloquea nuevas consultas y limpia datos, sin prometer
   recuperar bytes ya entregados.
9. Rango amplio y hecho 1.001 fallan sin subtotal.
10. Paginación 20/50 es local, no consulta backend y renderiza sólo filas visibles.
11. Refresh incorpora hechos posteriores sustituyendo filas, totales y corte coherentemente.
12. Logout/cambio de Cuenta/Grupo limpia; respuesta tardía no repuebla.
13. Teclado, foco, `aria-live`, vacío/error y móvil son utilizables.

UAT humana no prueba Rules, privacidad negativa, costo, digest, carreras o ausencia de duplicados;
esas evidencias son automatizadas y separadas.

## 6. Criterios de aceptación futura

1. D01–D04=A están integradas normativamente antes de implementar.
2. Recepción/Pago conservan autoridad y no existe persistencia nueva.
3. Totales se calculan sobre el conjunto completo y exacto, nunca sobre una página.
4. Cada apertura/refresh/cambio de rango autoriza; frontend no calcula ni aporta totales.
5. Ingreso original sobrevive a reversión y `receiptStateAtCutoff` respeta el corte exclusivo.
6. Fronteras y timestamps iguales tienen resultado determinista.
7. Streams v1/v2 no omiten ni duplican hechos.
8. 1.001 falla explícitamente con detección acotada.
9. Owner/Tesorería cumplen DTO y lifecycle aprobados.
10. UI no usa “saldo de caja” ni ofrece escrituras/exportación.
11. La evidencia A se conserva y los gates residuales acreditan callable real y heap/render de
    navegador para B sin inventar presupuesto productivo.
12. Regresión y baseline preservan E3-01–E3-07.
13. D5-044, D5-045, Auth/UAT aislada y gate legacy permanecen sin cambios.

## 7. Sustitución normativa propuesta y riesgo residual

B está aprobada: una respuesta completa de hasta 1.000 DTO mínimos y totales exactos, paginación
visual 20/50 y autorización por apertura/refresh/cambio de rango. Sustituye prospectivamente A sólo
en contrato de entrega/paginación/autorización. D5-053 permanece histórico; la decisión
complementaria es D5-054 y queda adoptada sin modificar la historia de D5-053.

Persisten gates de callable real y navegador. Si fallan, la implementación se detiene y se presenta
otra decisión; no se introducen por anticipado persistencia, cache, proyección o cambio de writers.

Rollback documental de B revierte en conjunto D5-054 en Documento 5, ficha, DEC, addendum e informe
y deja D5-053/A intactos. No hay migración de datos. Un rollback técnico futuro debe retirar la consulta/UI B y
limpiar memoria activa; no puede revocar información ya entregada al navegador.

## 8. Preservaciones y no efectos

- D5-044 conserva superficies, destinos y condiciones.
- D5-045 permanece no solucionado.
- Auth/UAT real continúa aislada y baseline vigente.
- Gate económico legacy continúa pendiente.
- No se reabre E2-14 ni se adelanta E4.
- No se crea saldo de caja ni se cubren todos los casos futuros de Caja/balance.
- No se crean egresos, cuentas, crédito, devolución, conciliación, exportación o contabilidad.
- No se amplía `GROUP_TREASURY` fuera del reader enumerado.
- No se delega condonación ni se crean roles configurables.
- No se autoriza código, pruebas, suites, Emulator, configuración, Rules, índices ejecutables,
  dependencias, Firebase remoto, deploy o integración Git.

## Resultado

**ADDENDUM E3-08 ACTUALIZADO Y ADOPTADO — FUENTE NORMATIVA COMPLEMENTARIA DE DOCUMENTOS 2/3/4**

El addendum conserva D01–D04=A y documenta B como único contrato futuro, adoptado por D5-054.
La implementación completa requiere autorización separada.
No se declara implementado o cerrado E3-08 ni Etapa 3.
