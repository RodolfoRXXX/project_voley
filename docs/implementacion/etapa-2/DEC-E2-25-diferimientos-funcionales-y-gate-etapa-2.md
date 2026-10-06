# DEC-E2-25 — Diferimientos funcionales y efecto acotado sobre la salida de Etapa 2

## Estado

- **Decisión:** `ADOPTADA POR EL USUARIO`.
- **Fecha de registro:** 2026-10-06.
- **Base:** `dev == origin/dev` en `e3105f227cdd2d4e0dd34b3ea3ce40e69f93c012`.
- **Norma funcional asociada:**
  [addendum de Documento 2](../../arquitectura/Documento-2-addendum-DEC-E2-25-diferimientos-CU-026-CU-034-038.md).
- **Decisiones de Documento 5:** D5-042 y D5-043.
- **Roadmap posterior relacionado:** D5-044, registrado en
  [la decisión de compatibilidad residual](./E2-14-propuesta-retiro-compatibilidad-residual.md).

Esta decisión registra el efecto de los diferimientos expresamente aprobados. No es una extensión
por analogía de DEC-E2-21/D5-041: posee objetos, límites y condiciones de reapertura propios.

## 1. Decisión sobre CU-026

E2-22A mantiene la cobertura implementada del cargo descriptivo. `Posición`, `dorsal` y
`observaciones` quedan diferidos hasta que una utilidad concreta justifique y permita aprobar, por
atributo, su finalidad, ownership, actor, valores, validaciones, privacidad y lifecycle.

El diferimiento satisface exclusivamente el tratamiento de salida de esos atributos para Etapa 2:
no bloquean su futuro cierre si todos los demás gates se cumplen y E2-14 se repite. CU-026 conserva
cobertura parcial y no se considera completamente implementado. No queda aprobada una categoría
abierta de atributos adicionales.

## 2. Decisión sobre CU-034–CU-038

La implementación de roles y permisos se difiere hasta que exista el primer módulo con capacidades
reales que deban delegarse. El diferimiento satisface exclusivamente su tratamiento de salida para
Etapa 2: no bloquean su futuro cierre si todos los demás gates se cumplen y E2-14 se repite.

Mientras tanto se mantienen la autorización vigente de los flujos implementados, el cargo sin
efecto autorizante y la separación entre cargo, rol deportivo y perfil de permisos. No se crean
perfiles, IDs o asignaciones especulativas y no se promete conversión automática de cargos.

## 3. Condiciones de reapertura

- CU-026 se reabre por atributo antes de implementar una utilidad que necesite posición, dorsal u
  observaciones, con el corte funcional y técnico exigido por el addendum.
- CU-034–CU-038 se reabren antes de implementar la primera capacidad delegable, definiendo casos
  aplicables, perfiles, capacidades, asignación, revocación, alcance contextual y revalidación
  backend.

La mera existencia de nombres históricos, arrays, roles globales o cargos descriptivos no satisface
ninguna condición de reapertura ni constituye diseño aprobado.

## 4. Efecto sobre Documento 5 y E2-14

Documento 5 incorpora:

- **D5-042:** tratamiento de salida de los atributos diferidos de CU-026;
- **D5-043:** tratamiento de salida de CU-034–CU-038.

Ambas decisiones son excepciones acotadas. Permiten que esos faltantes no bloqueen por sí solos el
futuro cierre, pero:

- no cuentan como implementación;
- no convierten cobertura parcial en completa;
- no autorizan retiro de compatibilidad; D5-044 resuelve posteriormente sólo su asignación de
  roadmap;
- no sustituyen el gate consolidado ni la repetición final de E2-14;
- no cierran E2-14 o Etapa 2;
- no habilitan E3.

La reevaluación post E2-24 debe reclasificar ambos asuntos como `DIFERIDOS POR DECISIÓN APROBADA` y
mantener visibles sus límites. D5-044 aprobó posteriormente el roadmap de compatibilidad sin
autorizar el retiro, por lo que queda pendiente comprobar ese roadmap y los demás gates en la
repetición final de E2-14.

## 5. Relación con D5-041

D5-041 continúa limitado a CU-013. D5-042 y D5-043 son decisiones nuevas y autónomas; comparten el
principio de deuda visible y reapertura verificable, pero no derivan su autoridad de aquel caso ni
amplían su alcance.

## 6. Resultado

`D5-042 Y D5-043 APROBADAS — EFECTO ACOTADO SOBRE LA SALIDA — ETAPA 2 ABIERTA`
