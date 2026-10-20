# DEC-E3-07 — Condonación y reversión de condonación de deuda válida

## Estado

- **Tipo:** decisión normativa adoptada para E3-07.
- **Decisiones aprobadas por el responsable funcional:** `D01–D06=A`, `D07=B`, `D08–D11=A`.
- **Aprobaciones complementarias:** R01 y R02=A.
- **Decisión de Documento 5:** `D5-052`.
- **Estado:** `APROBADA`.
- **Estado del incremento:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Base:** `dev` en `ed51bbee7b69d4d8694fbd88a5b92c83fb9a4053`, verificada el 20 de octubre
  de 2026 sin `fetch` ni cambio de rama.

Esta decisión adopta el corte y el addendum E3-07 a Documentos 2/3/4. Documento 5 incorpora la
continuidad mínima y D5-052. La adopción documental no autoriza implementación, pruebas,
configuración, Rules, índices, Firebase remoto o deploy.

Paquete relacionado: [ficha E3-07](./E3-07-ficha-condonacion-deuda-valida.md) y
[addendum a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-07-condonacion-deuda-valida.md).

## 1. Contexto y corte

E3-01–E3-06 dejaron a Pago como autoridad de obligación, principal original/vigente, ingresos,
reversiones, anulación, saldo, estado y revisión. Permanecía pendiente distinguir la remisión de una
deuda válida de:

- corrección de un principal originalmente erróneo;
- anulación de una obligación que no debía existir;
- reversión de un ingreso mal registrado;
- devolución real de dinero.

E3-07 adopta un único corte vertical: condonación individual total/parcial Owner-only y reversión
completa de un hecho de condonación registrado por error. Ambos hechos pertenecen a Pago, son no
monetarios y append-only. No se crea Agregado, fuente económica o Caja.

## 2. Decisiones aprobadas

### E3-07-D01=A — Condonación total/parcial

Pago debe estar `ACTIVE`, con saldo positivo y estado `PENDING | PARTIAL`. Se permite `PARTIAL` por
menos del saldo o `TOTAL` por exactamente el saldo confirmado. `SETTLED` y `VOIDED` no son
elegibles.

### E3-07-D02=A — Owner-only

Sólo el Owner vigente condona y revierte condonación. Ninguna capability, cargo, rol, Membresía o
conocimiento de IDs autoriza por analogía. No se crea permiso nuevo.

### E3-07-D03=A — Importe fijo y sucesivas

El importe es explícito, positivo, fijo y no superior al saldo. `TOTAL` queda ligado al saldo y
`economicRevision` confirmados. Se admiten condonaciones sucesivas con nueva intención y revisión;
ninguna carrera amplía automáticamente el importe.

### E3-07-D04=A — Estado derivado

Estado deriva de principal vigente, ingreso neto, condonación vigente y saldo:

- `PENDING`: saldo positivo y extinción acumulada cero;
- `PARTIAL`: saldo positivo y extinción acumulada positiva;
- `SETTLED`: saldo cero.

No existe estado `WAIVED`; composición e historia explican el resultado.

### E3-07-D05=A — Reversión posterior de ingreso

Una reversión de Recepción conserva el importe condonado. Al reducir ingreso neto puede reaparecer
saldo exactamente por el ingreso revertido. No se expande, revierte o borra condonación de forma
implícita.

### E3-07-D06=A — Corrección posterior

Toda corrección posterior exige:

```text
newPrincipalMinor >= netConfirmedIncomeMinor + currentWaivedAmountMinor
```

Una corrección no modifica historia ni total condonado. Para bajar de ese piso deben revertirse
primero hechos completos mediante D07=B y emitirse una nueva intención E3-06.

### E3-07-D07=B — Reversión mínima incluida

E3-07 incluye una reversión Owner-only, completa por hecho individual, única, idempotente, trazable
y con motivo obligatorio. Conserva el hecho original, agrega evidencia compensatoria, reduce
condonación vigente y aumenta saldo por el mismo importe.

No modifica principal o ingresos, no devuelve dinero, no admite parcialidad, doble reversión,
edición o borrado. Revalida transaccionalmente y recupera el outcome original después de
operaciones económicas posteriores.

### E3-07-D08=A / R02=A — Avisos en ambos comandos

Todo aviso `REPORTED` relacionado bloquea tanto la condonación como su reversión mediante
comprobación completa. Una lectura incompleta, truncada o no disponible falla cerrada. Ningún
comando confirma, rechaza o resuelve el aviso.

### E3-07-D09=A — Privacidad estructural

Se aprueba catálogo cerrado, explicación interna obligatoria y privacidad por audiencia:

- Owner: actor, categoría, explicación, importes, fechas y revisiones;
- sujeto/exintegrante: categoría presentable, importe, fecha y efecto, sin actor/nota interna;
- Tesorería: composición mínima, sin historia completa ni acción;
- revisor/registrante: no reciben historia general.

D09=A y R01 aprueban los valores, etiquetas, privacidad y límites de §4.

### E3-07-D10=A — Lifecycle contextual

Exintegrante y Temporada cerrada no bloquean ninguna de las dos operaciones. En Grupo archivado
sólo Owner y Pago prearchivo íntegro. No reviven grants, contexto deportivo o elegibilidad de
generación.

### E3-07-D11=A — Historia incompatible con anulación

Cualquier historia de condonación impide anular la obligación, incluso si toda condonación fue
revertida y el vigente es cero. No se borra evidencia, no se libera identidad y `VOIDED` conserva
terminalidad.

## 3. Composición aprobada

Para `ACTIVE`:

```text
principalBaseMinor = última corrección o principalOriginalMinor
grossWaivedAmountMinor = suma de condonaciones creadas
reversedWaivedAmountMinor = suma de condonaciones revertidas íntegramente
currentWaivedAmountMinor = grossWaivedAmountMinor - reversedWaivedAmountMinor
netConfirmedIncomeMinor = confirmedIncomeMinor - reversedIncomeMinor
balanceMinor = principalBaseMinor
             - netConfirmedIncomeMinor
             - currentWaivedAmountMinor
```

Una reversión de condonación incrementa `reversedWaivedAmountMinor`; una reversión de ingreso
incrementa `reversedIncomeMinor`. Son hechos distintos. Para `VOIDED`, D11 exige ausencia total de
historia de condonación, por lo que bruto, revertido y vigente son cero.

Toda reversión efectiva cumple:

```text
balanceAfterMinor = balanceBeforeMinor + reversedWaiverAmountMinor
reversedWaiverAmountMinor > 0
```

Si antes estaba `SETTLED`, pasa a `PENDING` cuando ingreso neto más condonación vigente restantes
son cero, o a `PARTIAL` cuando conservan un componente positivo. Nunca permanece `SETTLED`.

## 4. Aprobaciones complementarias

### R01 — Valores, etiquetas, privacidad y límites aprobados

Se aprueban para condonación:

| Código | Etiqueta presentable al sujeto |
| --- | --- |
| `FINANCIAL_ASSISTANCE` | Apoyo económico |
| `ORGANIZATIONAL_WAIVER` | Decisión de la organización |
| `EXCEPTIONAL_WAIVER` | Situación excepcional |

Se aprueban para reversión interna:

- reversión interna: `WAIVER_DUPLICATE_ENTRY`, `WAIVER_WRONG_AMOUNT`,
  `WAIVER_WRONG_PAYMENT`, `WAIVER_NOT_AUTHORIZED_AS_RECORDED`;
- explicación interna obligatoria NFC de 1–240 code points y hasta 480 bytes, sin controles C0/C1
  ni marcas bidi.

No existe `OTHER`; ninguna categoría puede significar corrección del principal, anulación,
reversión de ingreso o devolución. El sujeto conserva las etiquetas presentables propuestas y no
ve motivos/notas internos de reversión. `WAIVER_NOT_AUTHORIZED_AS_RECORDED` documenta un error; no
introduce aprobadores, permisos, roles, grants ni un circuito organizativo nuevo.

### R02=A — Avisos durante la reversión

Cualquier aviso `REPORTED` relacionado bloquea la reversión mediante la misma comprobación completa
y fail-closed usada al condonar. No se decide el aviso automáticamente. Contrato, transacción,
guard, errores, frontend, concurrencia y UAT deben aplicar este resultado.

## 5. Consecuencias técnicas requeridas

El addendum adoptado detalla:

- evolución compatible de Pago sin backfill;
- hechos append-only y compensación correlacionada;
- cambios en writers E3-01–E3-06 y readers;
- dos comandos idempotentes, DTOs por audiencia, stale y recovery;
- transacción con raíz, historia, guard y receipt;
- paginación que invalida cursores ante nuevos eventos;
- queries e índices previstos, no ejecutables;
- UI discreta sobre Economía, Deudas, Mis obligaciones y detalle;
- evidencia técnica automatizada separada de UAT humana;
- rollback compatible que nunca borra hechos persistidos.

Para ambos comandos, el request hash incluye actor/scope, operación, campos económicos, revisiones,
`reasonCode` e `internalExplanation` normalizada. Misma key con explicación distinta conflictúa.
Recovery conserva contenido/outcome originales después de operaciones posteriores y no exige que
las revisiones históricas del comando sigan vigentes.

Pago sigue como único Agregado y fuente original. Condonación no integra flujos monetarios de Caja;
una futura Caja puramente monetaria no queda necesariamente bloqueada, mientras toda consulta de
deuda/composición debe incorporar estos componentes.

## 6. Integración mínima en Documento 5

### 6.1 Continuidad incorporada en §7.5

> E3-07 incorpora condonación individual `PARTIAL | TOTAL`, Owner-only, sobre saldo positivo de un
> Pago `ACTIVE`, y reversión completa por hecho individual de una condonación errónea. Pago conserva
> principal, ingresos, condonación bruta/revertida/vigente, saldo, estado e historia como autoridad
> única. `TOTAL` queda ligado al saldo/revisión confirmados; la reversión de ingreso conserva la
> condonación y puede reabrir deuda; una corrección posterior respeta el piso ingreso neto más
> condonación vigente. Todo aviso `REPORTED` relacionado bloquea condonar y revertir condonación
> mediante comprobación completa, sin decidir el aviso. Exintegrante, Temporada
> cerrada y Pago prearchivo conservan tratamiento histórico, con Grupo archivado Owner-only.
> Cualquier historia de condonación impide anulación aun después de revertirse. R01 fija catálogos,
> etiquetas, privacidad y límites; R02=A bloquea ambos comandos ante avisos relacionados. E3-07 no
> queda listo para implementar. No crea Caja, devolución, crédito, permisos ni fuente económica paralela y no
> satisface el gate de retiro legacy.

### 6.2 Decisión registrada

| Identificador | Decisión | Estado | Alcance | Consecuencia |
| --- | --- | --- | --- | --- |
| D5-052 | E3-07 adopta D01–D11, R01 y R02=A y el addendum conjunto para condonación individual y reversión completa de condonación errónea, manteniendo Pago como autoridad única. | APROBADA | Etapa 3 / E3-07 | La ficha queda `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`; no autoriza implementación ni cierre; preserva D5-044, D5-045, Auth/UAT y gate legacy. |

D5-052 fue verificado como siguiente identificador disponible después de D5-051 antes de su
integración. No se incorpora ninguna otra modificación a Documento 5.

## 7. Preservaciones y no efectos

- D5-044 no cambia ni se adelanta.
- D5-045 permanece aceptado y no resuelto.
- Auth/UAT real continúa aislada.
- Gate económico legacy permanece pendiente.
- No se reabre E2-14.
- No se crea Agregado, fuente económica, Caja o Movimiento monetario.
- Devolución, crédito, saldo a favor, intereses, recargos, pasarela, permisos nuevos y
  restablecimiento/reemplazo de `VOIDED` siguen fuera.
- Documento 5 sólo incorpora continuidad, referencias y D5-052.
- No se autoriza código, pruebas, suites, Emulator, configuración, Rules, índices, dependencias,
  Firebase remoto, deploy o Git de escritura.
- No se declara E3-07 listo, implementado, verificado o cerrado; tampoco Etapa 3.

## Resultado

**DEC-E3-07 ADOPTADA — E3-07 LISTO PARA IMPLEMENTAR CON AUTORIZACIÓN SEPARADA**

El corte, D01–D11, R01, R02=A y el addendum quedan adoptados, con D5-052 integrado. Schemas,
writers/readers, query completa de avisos, índices, concurrencia, stale, idempotencia, recovery,
mediciones, pruebas y UAT permanecen como gates ejecutables no comprobados. La decisión no autoriza
implementación ni declara implementado o cerrado E3-07 o Etapa 3.
