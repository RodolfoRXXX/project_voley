# IUX-04 — Cierre técnico local

## Estado

**CERRADO TÉCNICAMENTE EN LOCAL — UAT HUMANA COMPLEMENTARIA Y GATES PRODUCTIVOS PENDIENTES**

Fecha de consolidación: 4 de noviembre de 2026.

## 1. Alcance cerrado

IUX-04 entrega el detalle de Grupo mobile-first con rutas propias para Resumen, Economía, Temporada
e Integrantes; selector móvil, tabs de escritorio, deep-links y navegación del navegador. Resumen
ordena Novedades, Economía, Temporada e Integrantes. N20/N31 reutilizan la proyección existente con
`groupId` opcional, autorización contextual y cursor ligado, preservando el consumidor global y los
badges IUX-03.

`/dashboard/groups/{groupId}/members` concentra Mi membresía, roster y solicitudes sin perder
acciones ni guards. El control de copia conserva enlace canónico, foco, área táctil, check de dos
segundos, anuncio accesible y error reintentable. La corrección local del containing block de la
región `aria-live` eliminó el doble scroll y espacio inferior en el recorrido confirmado.

## 2. Decisiones finales

- D07 difiere el conteo exacto de integrantes. No se incorporan `totalItems`, aggregate count,
  barrido exhaustivo, límite artificial ni contador/proyección persistida; Resumen no muestra cifra.
- D08-A crea nuevos Grupos directamente en schema v3 con `ownershipRevision=1` y todas las
  invariantes canónicas. Grupo, guard, scope y señal determinista de inicialización se confirman en
  una sola transacción.
- La inicialización reutiliza outbox, trigger, worker, recuperación y reconciliación. `READY/0` sólo
  aparece tras acreditar cobertura; los readers no escriben.
- `ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED` es la denegación autoritativa esperada para un integrante
  sin capability. Se maneja sin error general, sin duplicar autoridad ni ampliar permisos.

## 3. Evidencia

- Unitarias completas: 437/437.
- Alta, idempotencia y recuperación E2: 23/23.
- Cobertura focal IUX-04: 4/4.
- Regresiones focales IUX-02A/IUX-02B y E3-04, arquitectura, TypeScript, build y lint baseline:
  aprobadas según el informe de implementación.
- Confirmación humana: N20 visible en Inicio y Novedades del Grupo sin error en ese recorrido.
- Confirmación humana: desaparecieron doble scroll y espacio inferior en la prueba visual actual.

## 4. Pendientes reales

No existe evidencia humana suficiente para declarar aprobados N31, concurrencia, matriz completa de
viewports, zoom real 200 %, Android real ni lector de pantalla. Permanecen como UAT complementaria y
gates de habilitación, sin bloquear el versionado del cierre técnico local. Los gates productivos de
IUX-02 —incluidos habilitación, observabilidad, backfill/reconciliación y rollout autorizados— siguen
pendientes.

El conteo exacto de integrantes queda diferido conforme a D07. Economía personal por Membresía está
fuera de IUX-04. El diagnóstico de consola `startTime/reportAllChanges` permanece separado y sin
atribución causal no demostrada.

## 5. Límites del cierre

Este cierre no despliega, no modifica datos productivos, no cierra globalmente IUX/E3 y no habilita
E4. La evidencia de emuladores y navegador local no sustituye gates productivos ni UAT humana no
ejecutada.

## 6. Fuentes

- [Ficha IUX-04](./IUX-04-ficha-detalle-grupo-mobile-first.md)
- [Relevamiento](./IUX-04-relevamiento-detalle-grupo-mobile-first.md)
- [Informe de implementación](./IUX-04-informe-implementacion-detalle-grupo-mobile-first.md)
- [Diagnóstico de consola](./IUX-04-diagnostico-consola-navegacion-interna.md)
- [Addendum](../../arquitectura/Documento-2-3-4-addendum-IUX-04-detalle-grupo-mobile-first.md)
