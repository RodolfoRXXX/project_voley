# Addendum a Documentos 2, 3 y 4 — IUX-05 / Economía personal por Membresía

## Estado

- **Naturaleza:** complemento normativo focal adoptado.
- **Estado:** `ADOPTADO POR D5-067; CIERRE LOCAL REGISTRADO POR D5-068 — GATES PRODUCTIVOS PENDIENTES`.
- **Fecha:** 6 de noviembre de 2026.
- **Base:** `dev@88dae54`.
- **Ficha:** [IUX-05](../implementacion/interetapa-ux-movil/IUX-05-ficha-economia-personal-membresia.md).

## 1. Complemento funcional propuesto para Documento 2

La Economía personal contextual comprende todos los Pagos propios de la `membershipId` activa que
`/dashboard/groups/{groupId}/membership` acredita, incluidos los ligados a Períodos de Vigencia
anteriores de esa misma raíz. No incluye raíces creadas por renovación intertemporada.

La ruta conserva sus requisitos actuales: Grupo activo, Temporada abierta y Membresía activa. Grupo
y Temporada se identifican visiblemente. El acceso a raíces finalizadas, Temporadas cerradas o
Grupos archivados continúa en `Mis obligaciones`; IUX-05 no agrega ruta ni selector histórico.
El callable vigente `getMyCurrentGroupMembershipContext` se reutiliza sin ampliarlo ni crear otro:
acredita sólo este acceso contextual actual y no sustituye el acceso histórico global.

El primer corte presenta:

1. obligaciones con saldo de la raíz;
2. Avisos informados y Pagos registrados como listas separadas;
3. aplicaciones y ajustes dentro del detalle de obligación;
4. acceso global a `Mis obligaciones`.

No presenta saldo ni cantidad agregados hasta contar con un contrato exacto y costeado. No muestra
subtotales de página, aproximaciones, techos ni cero no acreditado.

Un aviso en revisión no reduce deuda. Confirmación informada, recepción administrativa, rechazo,
resolución, reversión, corrección, anulación y condonación conservan los significados aprobados en
E3. La declaración y el ingreso pueden aparecer en listas diferentes porque representan hechos
distintos y deben quedar correlacionados, no sumados.

## 2. Complemento técnico propuesto para Documento 3

Cada reader deriva Cuenta/Persona y revalida `{groupId, seasonId, membershipId, personId}`. Conocer
IDs o cursors no concede autoridad. Cada página valida raíz, ancla y recursos; una incompatibilidad
falla sin resultados parciales.

No hay callable único ni snapshot global obligatorio. Obligaciones y las sublistas de Actividad
tienen cargas, errores, reintentos y cursores independientes:

```text
Obligaciones: dueDate DESC, paymentId DESC
Avisos:       reportedAt DESC, deliveryId DESC
Pagos:        registeredAt DESC, origin ASC, receiptId DESC
```

“Pagos registrados” es la etiqueta visible. `registeredAt` es `confirmedAt` para un informado
confirmado y `recordedAt` para una recepción administrativa. `reversedAt` se muestra sin reordenar
el registro original. Ajustes se consultan por obligación con sus revisiones/fechas canónicas; no se
crea timeline unificado.

El merge conserva anclas independientes por origen, usa el comparador total
`registeredAt DESC, origin ASC, receiptId DESC` y avanza cada ancla sólo por filas emitidas. Deduplica
por `{origin, receiptId}`. Un aviso resuelto enlaza la recepción administrativa sin producir otra
fila; un pago revertido conserva la fila y fecha de registro originales y muestra
`REVERSED`/`reversedAt`.

El detalle propio puede exponer aplicaciones minimizadas: ID, origen, importe, moneda, fecha
efectiva, fecha de aplicación, estado y eventual `reversedAt`. Omite actores y datos internos. Cada
aplicación se correlaciona con la línea exacta de su Entrega/Recepción y con el Pago propio.

La consulta ocurre al montar y por refresco manual. No hay polling, listeners, escrituras de lectura
ni refresh por foco.

## 3. Complemento de arquitectura propuesto para Documento 4

Pagos, aplicaciones, Entregas/Avisos, Recepciones y eventos de ajuste continúan como fuentes
canónicas. IUX-05 no crea Aggregate Root, ledger, estado de cuenta persistido, contador, saldo
materializado ni proyección visual.

Un resumen exacto requeriría enumerar e hidratar todos los Pagos abiertos de la raíz, validar
correlaciones, schemas, moneda y ecuación económica, y recién entonces sumar por moneda. La
cardinalidad no tiene cota normativa. Un aggregate `count/sum` no reemplaza esas validaciones. Por
ello el primer corte difiere el resumen y no adopta barrido ilimitado, límite artificial ni nueva
persistencia.

La composición entre módulos usa capacidades públicas internas minimizadas, nunca repositorios
internos ajenos. Son contratos separados para obligaciones, avisos, Pagos registrados y
aplicaciones. Los cursors se ligan a actor, Persona, Grupo, Temporada, Membresía, orden, versión y
tamaño.

La configuración versionada contiene índices por Membresía/estado/vencimiento,
Persona/Membresía/reporte y Persona/origen/Membresía/registro. La lista de informados confirmados
requiere un índice mínimo nuevo por Membresía, estado de decisión, `confirmedAt` y `__name__`.
Query, dirección efectiva, lecturas y merge cursors deben probarse durante implementación.

Rules continúan deny-all para acceso cliente directo. No cambian writers, transacciones, guards,
receipts, idempotencia, Períodos ni cálculos financieros.

## 4. Compatibilidad y no efectos

- `Mis obligaciones` conserva acceso histórico, acciones y destinos.
- Economía Owner, Tesorería, revisión y registro administrativo no cambian.
- Reactivación no divide la raíz; renovación no copia ni combina deuda.
- Grupo archivado no se desarchiva ni recupera navegación operativa.
- Membresía y Períodos no almacenan historia económica.
- IUX-04/IUX-02 y sus gates no se cierran.
- No se habilita código, índice, migración, backfill, despliegue ni E4.

## 5. Decisiones adoptadas

- D01: raíz completa, incluidos Períodos anteriores, sin raíces de renovación.
- D02: guard actual de `/membership`, historia global en `Mis obligaciones` y navegación histórica
  contextual diferida.
- D03: bloques independientes sin callable o snapshot común.
- D04: Avisos y Pagos registrados separados; ajustes en detalle, sin timeline unificado.
- D05: aplicaciones propias minimizadas sin identidades administrativas.
- D06: primer corte sin resumen, saldo total ni cantidad agregada.
- D07: páginas de 20, cursores ligados, presupuesto por consulta e índice mínimo identificado.

## 6. Contratos físicos mínimos adoptados

Se adoptan contratos separados para Obligaciones, Avisos, Pagos registrados y Aplicaciones. Cada
cursor incluye identidad, Grupo, Temporada, Membresía, filtros, orden, tamaño y versión. Los filtros
iniciales son: obligaciones abiertas; todos los estados de Avisos; informados confirmados más
administrativos para Pagos registrados; aplicaciones aplicadas o revertidas.

Presupuestos máximos previstos por página y por intento: 46 lecturas para la primera página de
Obligaciones y 47 para su continuación, 30 para
Avisos, 51 para Pagos registrados y 72 para Aplicaciones. Incluyen `limit + 1`, autorización,
validaciones, contexto e hidratación/raíces correlacionadas. Los reintentos son intentos separados;
facturación y latencia permanecen pendientes de medición. No hay barrido adicional para totales.

Obligaciones incorpora una capacidad pública SUBJECT read-only que ejecuta una sola consulta
agrupada `membershipId == M AND decisionState == REPORTED ORDER BY __name__ ASC LIMIT 21`. Los
primeros 20 documentos forman la ventana de evidencia y el documento 21 es lookahead validado. La
cobertura es `COMPLETE`, `PARTIAL` o `FAILED`; cada obligación recibe `FOUND`, `NONE` sólo bajo
`COMPLETE`, o `UNKNOWN`. No hay consultas por fila, writer, proyección ni límite de negocio.

Se reutilizan los índices versionados por Membresía/estado/vencimiento,
Persona/Membresía/reporte y Persona/origen/Membresía/registro. Se requiere un índice nuevo:

```text
paymentDeliveries (COLLECTION):
membershipId ASC, decisionState ASC, confirmedAt DESC, __name__ DESC
```

Las queries directas de aplicaciones no prevén índice compuesto nuevo. Emulator sólo comprueba
comportamiento local; no certifica índices compuestos de producción. La query/configuración y la
aceptación/estado remoto del índice documentado deben validarse como gates de implementación antes
de modificar o desplegar configuración.

## 7. Gates de cierre y habilitación

1. contratos cerrados, autorización propia, descartes de sesión, paginación y presupuestos quedaron
   verificados localmente;
2. pago parcial, varios pagos, aviso, rechazo, resolución, reversión, ajustes, raíces y acceso ajeno
   tienen cobertura automática y recorridos humanos acotados;
3. cero escrituras y preservación de permisos/destinos quedaron acreditados localmente;
4. configuración e índice deben validarse y construirse en el entorno remoto sólo durante un
   rollout autorizado;
5. rendimiento/facturación productivos, smoke desplegado y matriz complementaria de dispositivos y
   accesibilidad continúan pendientes;
6. se conservan los gates productivos IUX-02/IUX-04/E3.

La implementación queda cerrada técnicamente en local con conformidad humana acotada para los
recorridos informados. Los pendientes anteriores no autorizan deploy. IUX-04 conserva UAT
complementaria; IUX-02 y E3 conservan sus gates productivos. No se cierra IUX/E3 ni se habilita E4.
