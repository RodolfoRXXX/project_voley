# E2-25 — Cierre consolidado de Etapa 2

## 1. Estado y alcance

- **Fecha:** 2026-10-06.
- **Base de cierre:** `dev` en `7565ad93674c2139655ca918c91317f6f09e8fda`, más la observabilidad y la documentación integradas por esta intervención.
- **Decisión habilitante:** DEC-E2-26/D5-045.
- **Clasificación:** `ETAPA 2 CERRADA CON RIESGO RESIDUAL ACEPTADO`.
- **Continuidad:** `ETAPA 3 HABILITADA ÚNICAMENTE PARA DEFINICIÓN`.

Este cierre es administrativo y local. Se apoya en la auditoría, las reevaluaciones y la evidencia ya
registradas; no repite suites ni reemplaza el dictamen fallido. No inicia E3, no habilita producción,
no autoriza deploy y no integra Auth/UAT.

## 2. Evidencia consolidada

La repetición final original de E2-14 obtuvo `230/232` y quedó bloqueada por un único escenario de
edición de cargo/finalización concurrentes. El informe histórico conserva ese resultado. La
investigación posterior no determinó la causa. La matriz de observabilidad documentó tres focales
E2-22A `7/7` y una integral `232/232`, sin reproducción, e incorporó logging técnico sanitizado y
correlacionado para conservar evidencia si el incidente reaparece.

DEC-E2-26/D5-045 acepta expresamente ese riesgo residual. Por ello este cierre no se clasifica como
«todos los gates de la auditoría original aprobados», sino como cierre con excepción y deuda
aceptadas. No existe evidencia de corrupción, pérdida de autorización o violación de invariantes en
las corridas registradas; si aparece, rige la detención del flujo afectado definida en DEC-E2-26.

## 3. Cobertura, diferimientos y roadmap preservados

| Decisión | Tratamiento conservado al cierre |
| --- | --- |
| D5-041 | CU-013 permanece diferido, visible y no implementado hasta su condición de reapertura. |
| D5-042 | Posición, dorsal y observaciones de CU-026 permanecen diferidos; cargo es cobertura parcial y descriptiva. |
| D5-043 | CU-034–CU-038 permanecen diferidos; no existen perfiles o permisos especulativos ni conversión automática desde cargos. |
| D5-044 | Catálogo público legacy queda asignado a E4 y tombstones administrativos a E9; las superficies no fueron retiradas. |
| D5-045 | El incidente intermitente se conserva como riesgo residual aceptado, con causa desconocida y reapertura condicionada. |

Los incrementos E2-01–E2-24, sus fichas, informes y cierres conservan su valor histórico. La
reevaluación post E2-24 y el roadmap de compatibilidad mantienen la trazabilidad de los asuntos
resueltos, diferidos o asignados. Ningún diferimiento se convierte en implementación completa por
efecto de este cierre.

## 4. Condiciones posteriores

- Una reaparición del fallo exige conservar logs permitidos y abrir un correctivo priorizado por
  impacto.
- Evidencia de corrupción, pérdida de autorización o violación de invariantes exige detener el flujo
  afectado.
- Antes de producción debe evaluarse expresamente D5-045 junto con los gates operativos aplicables.
- E3 puede elaborar su definición, dependencias, fuentes de verdad, ficha y criterios; su
  implementación requiere una autorización posterior.
- Los retiros E4/E9 requieren sus verificaciones y decisiones propias. Este cierre no borra exports,
  rutas, BFF, páginas ni persistencia.

## 5. Preservación y exclusiones

Permanecen sin reescritura retrospectiva la auditoría fallida, el diagnóstico de causa no
determinada, el informe de observabilidad, los cierres históricos y la evidencia Auth/UAT aislada en
`fc7135e358902a17372d44f20df50883603520ce`. No se modificaron Rules, índices, frontend, retries,
timeouts o contratos, y no hubo deploy ni acceso a datos Firebase remotos.

## 6. Handoff

El siguiente paso es preparar la definición de Etapa 3 —Pago deportivo independiente— mediante una
intervención separada. Debe identificar el primer corte, fuentes de verdad, dependencias,
autorización, persistencia, pruebas, retiro y evidencia, sin iniciar implementación por la sola
existencia de este cierre.

## 7. Veredicto

`ETAPA 2 CERRADA CON RIESGO RESIDUAL ACEPTADO — E3 HABILITADA PARA DEFINICIÓN — SIN DEPLOY`
