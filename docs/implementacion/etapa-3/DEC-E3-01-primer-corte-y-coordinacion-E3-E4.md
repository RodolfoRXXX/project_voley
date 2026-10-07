# DEC-E3-01 — Primer corte de Pago y coordinación E3/E4

## Estado

- **Decisión:** `ADOPTADA POR EL USUARIO`.
- **Fecha de registro:** 2026-10-07.
- **Decisión de Documento 5:** D5-046.
- **Base:** `dev == origin/dev` local en `1ba808eb98bc696e8a2214e48b1a75879d250ce6`;
  no se realizó `fetch`.
- **Ficha asociada:**
  [E3-01](./E3-01-ficha-obligaciones-membership-grupo.md).
- **Normativa asociada:**
  [addendum E3-01](../../arquitectura/Documento-2-3-4-addendum-E3-01-pago-obligaciones.md).
- **Excepción de archivo asociada:**
  [addendum prospectivo a E2-23](../../arquitectura/Documento-2-addendum-E3-liquidacion-grupo-archivado.md).

Esta decisión queda registrada como D5-046. Adopta el orden y los límites documentales de E3-01,
pero no autoriza implementación ni incrementos posteriores.

## 1. Primer corte adoptado

E3-01 adopta como primer flujo:

`conceptos Owner -> generación explícita de obligaciones por Membresía -> consultas administrativas y propias`.

No inicia por Torneos o partidos sociales. Pago se modela como obligación independiente y no como
Suscripción ni como campo embebido de otro recurso.

E3-01 incluye:

- conceptos mensual/único y snapshots;
- ARS inicial;
- cuotas vigentes o pasadas con vigencia canónica y Temporada abierta;
- acreditación read-only de todas las formas canónicas v1–v6 e intervalos semiabiertos;
- ocurrencias explícitas listadas, estables y reutilizables;
- unicidad económica distinta de idempotencia;
- lotes con terminales inmutables y recovery de filas pendientes/inciertas;
- snapshot fijado por versión de concepto y conflicto ante obligación existente diferente;
- consulta Owner y propia de raíces activas/finalizadas.

No incluye Tesorería, avisos, ingresos, correcciones, condonación, reversión, Caja o retiro legacy.

La elegibilidad `ONE_TIME` queda incorporada: Grupo activo, Temporada exacta abierta y Membresía
activa, íntegra y correlacionada al confirmar. No usa `periodKey` ni admite cobros únicos
retroactivos sobre finalizadas.

El claim fija versión y snapshot. Renombre o cambio de importe posterior no lo altera, pero cada
fila pendiente exige que el concepto continúe activo. Desactivación y creación serializan por la
lectura común del concepto: si la desactivación confirma primero, la fila termina
`FAILED/CHARGE_CONCEPT_DEACTIVATED`; si la creación confirma primero, la obligación permanece.
Outcomes terminales se recuperan sin exigir concepto activo, tras reautorizar al actor, y `FAILED`
no se reejecuta con la misma intención.

## 2. Efecto sobre la salida de Etapa 3

E3-01 no satisface la salida de §7.5. Participaciones, equipos e inscripciones deben dejar de ser
fuentes económicas antes de cerrar E3. Crear obligaciones de Grupo no demuestra ese retiro.

La condición permanece dentro de E3. No se traslada a E4 y no se modifica D5-044.

## 3. Coordinación adoptada con E4

Documento 5 ya establece:

- E3 puede implementarse por flujo en partidos y torneos;
- E4 puede avanzar mientras continúan Pago u Organización si sus contratos son estables.

Por tanto, no existe hoy un bloqueo normativo circular necesario. Existe un riesgo de coordinación:
retirar campos económicos sin fijar primero la identidad deportiva de referencia podría consolidar
IDs o contratos legacy.

Orden adoptado:

1. **E3-01:** Pago independiente para obligaciones de Membresía.
2. **E3-02 a E3-06:** capacidades económicas de Grupo en cortes autorizados, sin depender de E4.
3. **E4 contractual delimitado:** estabilizar sólo identificadores y contratos de los recursos
   deportivos necesarios, sin administrar importe, estado o saldo.
4. **Incrementos E3 de sustitución:** enlazar Pago a esos contratos, migrar/convivir conforme a una
   decisión específica y retirar la autoridad económica de cada superficie.
5. **Gate E3:** demostrar que participaciones, equipos e inscripciones ya no deciden economía.
6. **Continuación E4:** E4 conserva sus propios resultados y gates deportivos.

La evidencia previa demuestra campos económicos embebidos, pero no que todos los retiros requieran
una implementación completa de E4. Esa dependencia sólo se confirmará al definir cada corte. No se
repite aquí el inventario ni se interviene en esas superficies.

## 4. Condición de coordinación posterior

Si la gobernanza operativa aplica las etapas de manera estrictamente serial pese a la
paralelización escrita en Documento 5, deberá aprobarse explícitamente una ventana delimitada para
el trabajo contractual E4 del punto 3 antes del cierre de E3.

Una eventual habilitación adicional deberá:

- enumerar contratos E4 concretos y su consumidor E3;
- prohibir que E4 asuma autoridad económica;
- mantener el retiro y su evidencia como responsabilidad/gate de E3;
- exigir autorización separada por incremento;
- no autorizar catálogos/tombstones D5-044 por analogía.

La ventana no es necesaria para implementar E3-01 y esta decisión no la concede.

## 5. Secuencia de capacidades posteriores

| Corte propuesto | Resultado | Condición previa principal |
| --- | --- | --- |
| E3-02 | delegación mínima y consulta Tesorería | reapertura/formalización D5-043 |
| E3-03 | aviso propio y validación/rechazo, incluso de obligación prearchivo | política de saldo/avisos y autorización propia; addendum E2-23 ya formalizado |
| E3-04 | registro directo sin duplicar una entrega avisada | resolución de duplicado de negocio |
| E3-05 | ajuste/corrección, condonación y reversión trazable | política económica completa antes del primer ingreso |
| E3-06 | Caja/balance derivados | necesidad concreta y movimientos estables |
| E3/E4 coordinados | sustitución de autoridades legacy | contrato deportivo estable y decisión por superficie |

D5-043 no se considera resuelta por esta secuencia. Cargo descriptivo no concede permisos.

## 6. Decisiones preservadas

- D5-041: CU-013 continúa diferido; no se agrega zona configurable a Grupo.
- D5-042: no cambia el alcance de atributos de Membresía.
- D5-043: se reabre antes de la primera delegación real.
- D5-044: catálogos/tombstones conservan sus destinos E4/E9.
- D5-045 y DEC-E2-26: riesgo residual aceptado para transición local; pendiente antes de producción.
- E2-23 y su addendum E3: no existe desarchivo; la excepción económica sólo permite liquidación
  futura de Pagos preexistentes, sin actividad deportiva y fuera de E3-01.

## 7. No efectos

Esta decisión no:

- cierra E3 ni declara E3-01 implementada;
- habilita implementación E3 o E4;
- habilita por sí sola la liquidación económica de Grupo archivado;
- retira campos o migra datos;
- autoriza incrementos E3/E4 posteriores;
- integra Auth/UAT;
- reabre E2-14.

## Resultado

`DECISIÓN ADOPTADA — D5-046 — PRIMER CORTE DEFINIDO — GATE ECONÓMICO CONSERVADO EN E3`
