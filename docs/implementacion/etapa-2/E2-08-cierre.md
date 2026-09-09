# E2-08 — Cierre del retiro de solicitudes de ingreso legacy

## 1. Estado del incremento

- Incremento: `E2-08 — Retiro del flujo legacy de ingreso por arrays`.
- Fecha de cierre: 2026-09-09.
- Estado: implementado, verificado, aprobado en UAT e integrado en `dev`.
- Ficha normativa: `docs/implementacion/etapa-2/E2-08-ficha-retiro-solicitudes-ingreso-legacy.md`.
- Informe: `docs/implementacion/etapa-2/E2-08-informe-implementacion.md`.

Este documento cierra exclusivamente E2-08. No cierra la Etapa 2, no habilita despliegues ni autoriza operaciones sobre Firebase remoto.

## 2. Alcance entregado

E2-08 retiró las ramas legacy para solicitar y cancelar ingreso mediante `groups.pendingRequestIds`, la decisión por UID que incorporaba identidades a `groups.memberIds`, sus dos BFF exclusivos, los controles y listeners frontend correspondientes y la derivación de alertas desde esos arrays.

El endpoint y BFF `/join` se preservaron exclusivamente para la salida de una integrante legacy ya presente en `memberIds`. Una visitante, no integrante o identidad pendiente legacy recibe no encontrado genérico sin escritura ni traducción al flujo canónico.

También se preservaron sin reinterpretación:

- `handleGroupMemberAdd` y su limpieza colateral histórica de `pendingRequestIds`;
- solicitudes administrativas y `pendingAdminRequestIds`;
- alta, baja y búsqueda separadas de integrantes;
- alertas de remoción, responsabilidades administrativas y de Torneos;
- CORS, exports compartidos y comandos de mantenimiento existentes.

## 3. Conservación de datos y camino canónico

No se ejecutaron migraciones, backfills de escritura, adopciones, conversiones ni eliminaciones de datos históricos. Los arrays y alertas históricas dejaron de actuar como solicitudes vigentes, pero su almacenamiento no fue limpiado por E2-08.

El camino E2-06/E2-07 permanece como única autoridad de ingreso:

```text
Solicitud canónica → decisión Owner → Membresía confirmada → Solicitud aprobada
```

Solicitud y Membresía continúan como Aggregate Roots independientes. La aprobación conserva idempotencia, cardinalidad, guards, intents y coordinación recuperable; rechazo y cancelación no crean Membresía.

## 4. Evidencia automatizada heredada

El gate final ya ejecutado y aceptado quedó consolidado así:

- `quality:stage0`: aprobado;
- sintaxis Functions: `248/248`;
- unitarias: `244/244`;
- Emulator Suite local: `130/130`;
- build: `21/21`;
- lint baseline, typecheck y `git diff --check`: aprobados;
- unitarias/arquitectura focales E2-08: `4/4`;
- Emulator focal E2-08: `6/6`.

Estos gates no se repitieron durante el cierre; se heredó la evidencia final ya obtenida.

## 5. UAT e inspección persistente

La UAT manual E2-08 fue aprobada en toda su extensión sobre Emulator Suite local. La inspección posterior, realizada mediante Admin SDK de sólo lectura sobre `demo-sportexa-e2-04`, concluyó `INSPECCIÓN FINAL E2-08 CONSISTENTE`.

La inspección confirmó el camino Solicitud → decisión → Membresía, cardinalidad única, correlación de IDs y hashes, y ausencia de duplicados, referencias huérfanas, estados parciales, pending guards, coordinaciones residuales y claims incompatibles. Actividad, notificaciones y alertas relacionadas tuvieron cardinalidad cero.

La advertencia `Existe una Membresía activa ajena a esta aprobación.` para B quedó clasificada como observación contextual no bloqueante: B posee una Membresía canónica y no representa por sí misma una fixture legacy basada en `memberIds`.

El snapshot final demuestra estado, existencia y correlación actuales. Los hechos históricos que requieren comparación con un estado anterior quedan respaldados por la UAT aprobada, las pruebas automatizadas y el análisis estático, sin atribuir al snapshot una capacidad probatoria temporal que no posee.

## 6. Versionado e integración

- Base original: `63e791472d3363c38abbee446ec58edd9cca70b3`.
- Commit de implementación: `674e5cb3fbad8edf571d94ca3bf625fb61b7feff` — `feat(e2-08): retirar solicitudes de ingreso legacy`.
- Merge no fast-forward de implementación en `dev`: `d24dbf4e12a87e128b7b3ca17acd88f2e7e05577` — `merge: integrar E2-08`.

El árbol integrado fue verificado contra el commit de implementación. No se utilizó amend, rebase, squash ni force push.

## 7. Ausencia de operaciones remotas de producto

No hubo deploy, acceso a Firebase remoto, modificación de fixtures ni escritura sobre datos durante el cierre. El frontend y los emuladores locales fueron detenidos sin limpiar ni exportar su estado.

## 8. Deudas diferidas y observaciones fuera de alcance

Permanecen diferidos para incrementos propios:

- reactivación y renovación de Membresías;
- roster y pertenencia canónica completa;
- retiro de `memberIds`, `adminIds`, `admins` y arrays legacy restantes;
- evolución de solicitudes administrativas;
- notificaciones canónicas y Actividad;
- mantenimiento o TTL de intents;
- reparación de corrupción y cierre consolidado de Etapa 2.

La continuidad temporal de otros consumidores y writers legacy expresamente excluidos no amplía la autoridad retirada ni bloquea este cierre.

## 9. Siguiente incremento

Conforme al gobierno incremental, queda habilitado el siguiente incremento **únicamente para definición mediante una Ficha de Incremento Implementable propia**, revisión y decisión de entrada. Este cierre no fija anticipadamente su alcance, no autoriza su implementación y no crea su rama de producto.

## Veredicto

**E2-08 CERRADO E INTEGRADO**
