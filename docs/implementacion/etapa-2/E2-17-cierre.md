# E2-17 — Cierre formal de edición canónica de Temporada (CU-017)

## Estado

`CERRADA E INTEGRADA — ETAPA 2 CONTINÚA ABIERTA`

E2-17 queda cerrada funcional y técnicamente. Este cierre no modifica la ficha aprobada, no cierra E2-14 ni Etapa 2, no habilita E3 y no inicia E2-18.

## 1. Alcance entregado

- Operación pública `updateSeason` para editar exclusivamente `nombre` en la Temporada abierta.
- Owner vigente como única autoridad, independiente de Persona, Membresía o rol global.
- Token opaco de concurrencia emitido por `getOwnSeason` y validado dentro de la transacción.
- Idempotencia contextual con receipt durable sólo para `UPDATED`.
- `NO_CHANGES`, stale, conflictos y recovery con cero escrituras.
- Recovery posterior a otra edición o al cierre sin reejecutar ni revertir efectos.
- Preservación exacta de abierta v1, cerrada v2, guard y receipts E2-02/E2-15.
- Acción frontend accesible únicamente sobre la Temporada actual Owner-scoped.
- Rules deny-all para `seasonUpdateReceipts`.
- Pruebas unitarias, contractuales, arquitectónicas, de frontend y Emulator, incluidas regresiones E2-02/E2-15/E2-16.

Quedaron fuera de alcance, entre otros, `fechaInicio`, cerradas, identidad, estado, `revision`, `updatedAt`, `updatedBy`, schemas v3/v4, reapertura, renovación, migración, reparación, Partido/Torneo y E2-18.

## 2. Trazabilidad ficha → implementación → pruebas → UAT

| Contrato normativo | Implementación | Evidencia automatizada | UAT |
|---|---|---|---|
| Payload cerrado y normalización de `nombre` | contrato/servicio `updateSeason` | unitarias y arquitectura E2-17 | UAT-03, UAT-08, UAT-12, UAT-13 |
| Auth, Cuenta y Owner vigente | callable + store confirmatorio | unitarias y Emulator de autorización/transferencia | UAT-01, UAT-02, UAT-10, UAT-11, UAT-18 |
| Token opaco y stale | hashing canónico + `getOwnSeason` + transacción | token determinista, dos ediciones y stale | UAT-16 |
| Receipt sólo para `UPDATED` | `seasonUpdateReceipts` v1 + Rules deny-all | recovery, conflicto, no-op y Rules | UAT-04, UAT-05, UAT-14, UAT-15 |
| Serialización con cierre | store transaccional compatible con E2-15 | carrera simultánea edición/cierre y recovery poscierre | UAT-09, UAT-17 |
| Integración E2-16 | refresh autoritativo y cursor estable | regresiones E2-16 y consulta paginada | UAT-06, UAT-07 |
| Agregados ajenos intactos | writer exclusivo de `nombre` | comparación persistente antes/después | UAT-19 |
| Accesibilidad y responsive | modal con foco, teclado, ARIA y single-flight | pruebas/inspección frontend, typecheck y build | UAT-20 |

## 3. Clasificación exacta de UAT

| UAT | Resultado | Fuente de evidencia |
|---|---|---|
| UAT-01 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-02 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-03 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-04 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-05 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-06 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-07 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-08 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-09 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-10 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-11 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-12 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-13 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-14 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-15 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-16 | APROBADA MANUALMENTE | ejecución informada por la persona usuaria |
| UAT-17 | APROBADA POR EMULATOR | carrera simultánea edición/cierre |
| UAT-18 | APROBADA POR EMULATOR | transferencia y reautorización de recovery |
| UAT-19 | APROBADA POR EMULATOR E INSPECCIÓN PERSISTENTE | invariancia de Grupo, guard, Membresía, Solicitud, Partido y Torneo |
| UAT-20 | APROBADA POR PRUEBAS E INSPECCIÓN | frontend, arquitectura, typecheck y build |

UAT-17 a UAT-20 no se declaran manuales.

## 4. Gates finales

| Gate | Resultado final |
|---|---|
| Unitarias focales E2-17 | 8/8 |
| Emulator focal E2-17 | 11/11 |
| Regresión Emulator E2-02 | 11/11 |
| Regresión Emulator E2-15 | 5/5 |
| Regresión Emulator E2-16 | 7/7 |
| Unitarias/contratos/arquitectura completas | 309/309 |
| Emulator Suite completa fresca | 191/191 |
| Mantenimiento/Rules | 7/7 |
| Sintaxis Functions | 287/287 archivos |
| Lint baseline | aprobado; cero regresiones |
| Typecheck | aprobado |
| Build Next.js | aprobado; 21 páginas estáticas |
| Diff e higiene | aprobados |
| Puertos Emulator | sin listeners propios al finalizar |

La Suite Emulator completa se repitió después de ampliar la evidencia de UAT-17/UAT-19. No se repitieron suites no afectadas.

## 5. Incidencias y riesgos residuales aceptados

- La protección Git `dubious ownership` requirió `safe.directory` por invocación, sin alterar configuración.
- El sandbox produjo `EPERM` para Node; los gates se ejecutaron con autorización sobre el mismo workspace.
- El teardown Windows del test de runners se corrigió usando el helper existente con retry; 309/309 quedó aprobado.
- Firebase CLI no obtuvo MOTD/config remota; el aviso fue no fatal y los emuladores usaron sólo `demo-*` y loopback.
- Eventarc/Tasks eligieron puertos auxiliares alternativos durante la repetición final; el runner apagó sus procesos.
- `caniuse-lite` desactualizado permanece como mantenimiento general fuera de E2-17.
- Los receipts tienen retención indefinida por contrato; no constituyen historial funcional de nombres.
- E2-16 no promete snapshot multipágina; corrupción histórica continúa fallando cerrada sin migración ni reparación.

Ningún riesgo residual aceptado bloquea el cierre ni amplía el alcance de E2-17.

## 6. Veredicto formal

La implementación satisface la ficha normativa E2-17, preserva las invariantes de E2-02/E2-15/E2-16, supera los gates finales y cuenta con UAT-01 a UAT-16 aprobadas manualmente más evidencia automatizada/inspectiva explícita para UAT-17 a UAT-20.

**E2-17 CERRADO E INTEGRADO — ETAPA 2 CONTINÚA ABIERTA**
