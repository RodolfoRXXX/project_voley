# DEC-E2-26 — Aceptación acotada del riesgo residual de concurrencia

## Estado

- **Decisión:** `ADOPTADA POR EL USUARIO`.
- **Fecha de registro:** 2026-10-06.
- **Base técnica examinada:** `7565ad93674c2139655ca918c91317f6f09e8fda`.
- **Decisión de Documento 5:** D5-045.
- **Ámbito:** cierre administrativo de E2-14 y Etapa 2; continuidad de Etapa 3 sólo para definición.

## 1. Incidente alcanzado

La decisión alcanza exclusivamente el fallo intermitente observado al ejecutar en concurrencia la
edición del cargo descriptivo de una Membresía y su finalización administrativa. La auditoría final
original registró `230/232`: el escenario esperaba `MEMBERSHIP_FINALIZATION_CONFIRMED` y obtuvo
`DEPENDENCY_UNAVAILABLE` después de aproximadamente diez segundos. Ese dictamen permanece como
evidencia fallida y no se reescribe ni se convierte retroactivamente en aprobado.

## 2. Evidencia posterior y límite causal

El diagnóstico no determinó la causa histórica. Las reproducciones posteriores documentadas
aprobaron, incluidas tres ejecuciones focales E2-22A de `7/7` y una Emulator Suite integral de
`232/232`. Esos resultados demuestran únicamente sus corridas: no prueban estabilidad estadística,
ausencia definitiva del fallo ni una corrección de la semántica de concurrencia.

Se incorporó observabilidad técnica estructurada en los caminos de edición de cargo y finalización.
Ante un error técnico conserva operación, fase, código original cuando existe, tipo sanitizado,
duración e identificador opaco de correlación, sin payloads, identidades, IDs de dominio, rutas,
mensajes, stacks, tokens o claves. El logging no cambia contratos, persistencia, retries, deadlines,
autorización ni resultados públicos, y su propio fallo no interfiere con la operación.

## 3. Decisión y efecto

Se acepta el riesgo residual de forma expresa y acotada. Esta aceptación:

- permite cerrar administrativamente E2-14 y Etapa 2 como `CON RIESGO RESIDUAL ACEPTADO`;
- conserva D5-041–D5-044 y todos sus diferimientos, límites y condiciones de reapertura;
- habilita Etapa 3 únicamente para definición;
- no declara resuelto el incidente ni identificada su causa;
- no convierte la auditoría original `230/232` en aprobada;
- no autoriza implementación de E3, preparación productiva, deploy ni acceso Firebase remoto.

La decisión constituye la aceptación explícita de deuda restante prevista por el criterio de éxito
de Documento 5. Es una excepción documentada frente al gate rojo de la auditoría original, no una
afirmación de que todos sus gates aprobaron.

## 4. Condiciones de reapertura y operación

- Si el fallo reaparece, deben conservarse los eventos correlacionados y demás logs permitidos, y
  abrirse un correctivo con prioridad proporcional al impacto observado.
- Ante evidencia de corrupción, pérdida de autorización o violación de invariantes, debe detenerse
  el flujo afectado hasta determinar y tratar la causa.
- Antes de habilitar producción, este riesgo debe evaluarse expresamente junto con los gates
  operativos aplicables. La ausencia de una nueva reproducción no satisface por sí sola esa revisión.

## 5. Fuentes preservadas

- [auditoría final fallida](./E2-14-informe-auditoria-final-etapa-2.md);
- [diagnóstico de causa no determinada](./E2-14-diagnostico-concurrencia-cargo-finalizacion.md);
- [informe de observabilidad](./E2-14-informe-observabilidad-transaccional.md);
- [reevaluación post E2-24](./E2-14-reevaluacion-pendientes-post-E2-24.md);
- DEC-E2-21, DEC-E2-25 y D5-041–D5-044.

## 6. Resultado

`RIESGO RESIDUAL ACEPTADO — CIERRE ADMINISTRATIVO AUTORIZADO — SIN AUTORIZACIÓN PRODUCTIVA`
