# IUX-05 — Cierre técnico local

## Estado

**CERRADO TÉCNICAMENTE EN LOCAL — UAT HUMANA DE RECORRIDOS PROBADOS APROBADA — GATES PRODUCTIVOS PENDIENTES**

Fecha de consolidación: 6 de noviembre de 2026.

Commit de implementación: `0fb23ef28f8a11d9d958ff43b69d473a8ea4d666`.

## 1. Alcance cerrado

IUX-05 entrega Economía personal para la `membershipId` acreditada en el Grupo y Temporada
vigentes. Incluye Pagos de Períodos anteriores de la misma raíz y excluye otras raíces de
renovación. Los readers SUBJECT son estrictamente read-only y mantienen separadas autorización
propia, ownership y capabilities delegadas.

La superficie `/dashboard/groups/{groupId}/personal-economy` reúne Obligaciones, Avisos y Pagos
registrados mediante pestañas integradas, URL explícita, deep-links, recarga y Atrás/Adelante. Cada
bloque conserva carga, error, reintento y paginación propios. `Mis obligaciones` sigue siendo el
acceso histórico global y `/economy` continúa como Economía del Grupo sólo bajo autorización.

El detalle propio expone Pagos aplicados y Ajustes de la obligación sin identidades administrativas.
Conceptos y vencimientos usan snapshots históricos; estados y efectos se presentan en español. La
acción **Informar un pago** reutiliza el flujo global existente, con obligación y retorno
contextuales, sin crear comandos ni reglas financieras.

El encabezado común usa el nombre del Grupo y un selector accesible cuando la cobertura no acredita
un único Grupo. La navegación contextual preserva Owner, integrante y capabilities delegadas sin
inferir permisos. `GroupFrame` reutiliza el contexto ya resuelto entre Mi participación y Economía
personal; los destinos y comandos continúan revalidando autorización en backend.

## 2. Evidencia de avisos pendientes

Obligaciones incorpora una consulta SUBJECT agrupada de 20 avisos `REPORTED` más un lookahead. La
cobertura explícita es `COMPLETE | PARTIAL | FAILED`; cada obligación recibe `FOUND | NONE |
UNKNOWN`. Sólo `COMPLETE` permite acreditar ausencia. Un fallo complementario conserva las
obligaciones y saldos y ofrece reintento.

`FOUND` muestra **Pago informado · En revisión** sin modificar saldo, estado o posibilidad de
informar otro pago. Los presupuestos lógicos aprobados son 46 lecturas por intento de primera página
y 47 en continuación; cada retry es otro intento y esas cifras no representan facturación ni
latencia productiva.

**Ver aviso** usa `getMyPaymentDelivery`, valida identidad y contexto y compone una única fila por
`deliveryId`. Si el aviso ya está paginado reutiliza esa fila; si está fuera de página lo identifica
como resultado localizado sin alterar cursores. Al alcanzarlo con **Cargar más**, se deduplica sin
presentarlo dos veces.

## 3. Evidencia técnica

- Unitarias completas: 451/451.
- Unitarias focales IUX-05: 13/13.
- Emulator focal IUX-05: 1/1 con datos sintéticos y cero escrituras desde readers.
- Gate completo de emuladores: 7/7 lotes, 42 archivos canónicos.
- Sintaxis Functions: 494/494 archivos.
- TypeScript, ESLint focal, lint baseline y `git diff --check`: aprobados.
- Build Next de producción: aprobado; build servido `oAvg-ZeXxyNNEy_zWBqCm`, HTTP 200.
- Medición Emulator del fixture: Obligaciones 26 lecturas en primera página y 11 en continuación,
  por debajo de los máximos 46/47; no caracteriza facturación o latencia productiva.

Las regresiones preservan `Mis obligaciones`, detalle existente, navegación Owner, integrante sin
capabilities, capabilities delegadas, aislamiento entre Cuenta/Grupo/Membresía, raíces de renovación,
paginación, reversión, rechazo, confirmación, aplicaciones y cero writes.

## 4. UAT humana acreditada

El usuario confirmó conformidad con IUX-05 después de recorrer y corregir en UAT:

- lectores de Obligaciones, Avisos y Pagos registrados;
- separación entre Mi participación y Economía personal;
- encabezado, selector y navegación contextual de Grupo;
- aspecto integrado de Economía personal;
- lenguaje, acceso **Informar un pago** y control **Actualizar**;
- indicador **Pago informado · En revisión**;
- acceso **Ver aviso** y eliminación de la duplicación visual por `deliveryId`.

Esta aprobación corresponde únicamente a los recorridos informados. No acredita matriz completa de
cuentas y datos, Android real, todos los viewports, zoom 200 %, lector de pantalla, rendimiento
productivo, facturación, suficiencia del índice remoto ni comportamiento desplegado.

## 5. Pendientes reales

- Validar y construir remotamente, durante un rollout autorizado, el índice compuesto documentado;
  Emulator no certifica índices productivos.
- Medir lecturas facturadas, latencia y comportamiento operativo en el ambiente objetivo.
- Ejecutar despliegue coordinado de Functions, configuración y frontend sólo con autorización
  separada, observabilidad, smoke y rollback.
- Conservar la UAT complementaria pendiente de IUX-04 y los gates productivos de IUX-02/E3.
- Mantener fuera de alcance resumen/saldo total de Membresía, navegación histórica contextual,
  timeline unificado, permisos nuevos, writers, proyecciones y persistencia adicional.

## 6. Límites del cierre

Este cierre no despliega, no modifica datos productivos, no cierra globalmente IUX/E3 y no habilita
E4. La aprobación humana acotada y la evidencia local no sustituyen gates productivos ni validación
remota.

## 7. Fuentes

- [Ficha IUX-05](./IUX-05-ficha-economia-personal-membresia.md)
- [Relevamiento IUX-05](./IUX-05-relevamiento-economia-personal-membresia.md)
- [Informe de implementación](./IUX-05-informe-implementacion-economia-personal-membresia.md)
- [Addendum](../../arquitectura/Documento-2-3-4-addendum-IUX-05-economia-personal-membresia.md)
