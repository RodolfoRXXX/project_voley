# Addendum a Documento 2 — E3 / liquidación de obligaciones con Grupo archivado

## Estado

- **Contenido funcional:** `APROBADO POR EL USUARIO`.
- **Estado del artefacto:** `APROBADO PARA VERSIONAR`.
- **Fecha de formalización:** 2026-10-07.
- **Base documental:** `dev` en `1ba808eb98bc696e8a2214e48b1a75879d250ce6`.
- **Regla a complementar prospectivamente:** addendum E2-23, archivo read-only.
- **Paquete asociado:**
  [addendum E3-01 para Documentos 2/3/4](./Documento-2-3-4-addendum-E3-01-pago-obligaciones.md),
  [ficha E3-01](../implementacion/etapa-3/E3-01-ficha-obligaciones-membership-grupo.md) y
  [DEC-E3-01 / D5-046](../implementacion/etapa-3/DEC-E3-01-primer-corte-y-coordinacion-E3-E4.md).

Este addendum complementa prospectivamente E2-23 con una excepción económica cerrada. E2-23
conserva autoridad sobre archivo y actividad deportiva; este archivo prevalece sólo para liquidar
Pagos confirmados antes del archivo. E3-01 no implementa esas operaciones: la excepción se
habilitará junto con los cortes de avisos, ingresos, correcciones o condonaciones correspondientes.

## 1. Regla prospectiva

El archivo continúa terminando la actividad operativa y deportiva del Grupo. Como excepción
económica cerrada, pueden liquidarse obligaciones de Pago confirmadas antes del archivo.

Sobre Grupo archivado:

- no se crean conceptos, ocurrencias ni obligaciones;
- integrante o exintegrante consulta e informa pagos de obligaciones propias preexistentes;
- Owner vigente consulta el Grupo económico, registra ingresos y confirma/rechaza avisos;
- Owner realiza correcciones o condonaciones necesarias sólo conforme a sus políticas aprobadas;
- las mutaciones se ejecutan exclusivamente dentro del Agregado Pago;
- Grupo, Temporada, Membresía y Períodos no cambian;
- no existe desarchivo ni se recupera actividad deportiva;
- no se restauran, heredan o habilitan permisos de Tesorería;
- cargo descriptivo no autoriza.

## 2. Obligación anterior al archivo

Una obligación es prearchivo sólo si:

1. fue creada por el writer canónico de Pagos;
2. ese writer leyó y exigió el Grupo `activo` dentro de la unidad transaccional de creación;
3. referencia exactamente el `groupId` archivado y una Membresía del mismo Grupo;
4. conserva `createdAt` autoritativo de servidor;
5. el Grupo conserva `archivedAt` autoritativo y `createdAt <= archivedAt`;
6. raíz, referencias y timestamps son íntegros.

La comparación temporal es una comprobación defensiva, no la única autoridad: la anterioridad
lógica proviene del punto de serialización común sobre Grupo. Igualdad de timestamps no habilita una
creación posterior; sólo es admisible si el writer canónico confirmó mientras Grupo estaba activo.
Campos ausentes, cliente como fuente de tiempo, referencia cruzada o `createdAt > archivedAt`
producen rechazo cerrado sin reparación.

## 3. Concurrencia archivo–creación

Archivo y creación de obligación deben leer el mismo documento Grupo dentro de sus respectivas
transacciones:

- si la creación confirma primero, el Pago ya existe cuando archivo confirma y queda clasificado
  como prearchivo;
- si archivo confirma primero, Firestore reintenta o invalida la creación; al releer `archivado`,
  ésta falla sin crear Pago;
- no existe orden válido con Grupo archivado y una obligación nueva confirmada después;
- archivo no necesita escribir Pago y creación no necesita escribir Grupo;
- consultas vacías de Pagos no son guard de archivo y la existencia de deuda no bloquea archivar.

Toda implementación futura debe probar ambos órdenes y pérdida de respuesta. Un writer que no lea
Grupo en su transacción no satisface esta excepción y deberá corregirse antes de habilitarse.

## 4. Operaciones posteriores al archivo

Cada operación económica:

1. reautoriza Cuenta y relación propia u ownership vigente;
2. lee Grupo archivado y `archivedAt`;
3. carga un Pago preexistente y prueba §2;
4. aplica la política específica dentro de Pago;
5. conserva actor, timestamps y trazabilidad;
6. escribe cero campos de Grupo, Membresía, Temporada o Períodos.

La liquidación usa la `membershipId` ya fijada por Pago. Debe hidratar cualquiera de las formas
canónicas vigentes v1–v6 para correlación y privacidad, sin inferir semántica sólo por el número de
schema. v5 legacy/period-aware y v6 con lineage se admiten conforme al dominio vigente; `cargo` no
autoriza ni se expone. Liquidar no vuelve a ejecutar la elegibilidad original mensual/única.

La elegibilidad original `ONE_TIME` exige Grupo activo, Temporada exacta abierta y Membresía activa,
íntegra y correlacionada al crear la obligación. Su posterior liquidación prearchivo no reabre esa
evaluación ni requiere que el concepto continúe activo; sí exige autorización vigente y Pago
preexistente íntegro. Esto no permite crear otro efecto de una fila `FAILED` ni una obligación nueva
sobre Grupo archivado.

La consulta propia deriva Persona y Membresías en backend. Mostrar la obligación y permitir informar
su pago no concede navegación operativa, ingreso, reactivación, renovación, roster, configuración o
acción deportiva sobre el Grupo.

Owner actúa por ownership conservado. Un eventual tesorero sólo podría actuar si una decisión
posterior define expresamente permisos sobre archivados; este addendum no conserva ni revive grants.

## 5. Corrección y dinero

Antes del primer ingreso debe existir una política aprobada que distinga:

- corrección del importe exigible;
- reversión de un registro de ingreso erróneo;
- condonación;
- devolución real de dinero, fuera del alcance actual.

Corregir una obligación no revierte dinero realmente recibido. El archivo no altera esta regla ni
autoriza una operación económica todavía no definida.

## 6. Eliminación, historia y privacidad

- Todo Pago prearchivo continúa bloqueando CU-015; no hay cascada.
- Archivo conserva identidad e historia de Grupo.
- Liquidaciones posteriores conservan referencias originales y no copian deuda a otra Membresía.
- Reactivación de Membresía conserva raíz; renovación no mueve la obligación histórica.
- Integrante/exintegrante ve sólo economía propia.
- Owner ve economía del Grupo archivado según contratos administrativos minimizados.
- IDs conocidos, cargo, arrays legacy o un acceso histórico no conceden permisos adicionales.
- Pagos, avisos, movimientos, intents y receipts permanecen sin acceso directo de cliente.

## 7. Casos verificables futuros

1. creación gana carrera: archivo confirma después y Pago queda liquidable;
2. archivo gana carrera: creación reintenta, observa archivado y no escribe;
3. `createdAt > archivedAt`, timestamp ausente o referencia cruzada fallan cerrados;
4. integrante/exintegrante consulta e informa sólo sobre obligación propia;
5. Owner vigente opera sólo Pago preexistente;
6. tesorero previo no recupera capacidad;
7. operación económica no cambia Grupo ni lo muestra como activo;
8. Pago bloquea eliminación antes y después de liquidarse;
9. corrección no revierte ingreso real;
10. no aparecen conceptos, ocurrencias u obligaciones nuevas sobre archivado.
11. Pagos referidos a v5/v6 se liquidan sin modificar cargo, lineage, raíz o Períodos.

## 8. No efectos

Este addendum no:

- altera la transición de archivo ni habilita mutaciones fuera de la excepción económica cerrada;
- forma parte de la implementación E3-01;
- introduce desarchivo, transferencia o actividad deportiva;
- habilita Tesorería ni resuelve D5-043;
- define por sí sola avisos, ingresos, correcciones o condonaciones;
- permite devolver dinero;
- cambia la elegibilidad de archivo ni exige deuda cero para archivar;
- modifica CU-015, D5-041–046, catálogos/tombstones o Auth/UAT;
- autoriza código, Rules, índices, datos, pruebas o deploy.

## Resultado

`ADDENDUM APROBADO PARA VERSIONAR — EXCEPCIÓN ECONÓMICA PROSPECTIVA SIN CAPACIDAD E3-01`
