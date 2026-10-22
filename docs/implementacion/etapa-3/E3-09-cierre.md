# E3-09 — Evaluación de cierre documental

## Evaluación original preservada

**CIERRE NO EMITIDO — E3-10 NO HABILITADO**

La implementación local está integrada y posee evidencia técnica suficiente, pero dos criterios de
aceptación normativos continúan sin cumplirse: la UAT exigida permanece no ejecutada y no aprobada, y
la eliminación o deshabilitación remota de `onMatchClose` no se ejecutó ni verificó. La aceptación
expresa de documentar estas limitaciones no modifica ficha, DEC, addendum ni D5-055, y por tanto no
autoriza una excepción implícita.

Este resultado no niega la preparación técnica local. Impide únicamente declarar cerrado E3-09 o
habilitar E3-10 mientras las exigencias vigentes sigan abiertas.

## Reconsideración bajo D5-056

La enmienda aprobada por `D5-056` separa exclusivamente para E3-09 el cierre del alcance técnico
local integrado de la habilitación productiva. No reduce las verificaciones técnicas, no aprueba la
UAT, no acredita retiro remoto y no modifica las reglas generales de otros incrementos.

Con esa base, el veredicto vigente pasa a ser:

**E3-09 CERRADO EN SU ALCANCE TÉCNICO LOCAL — HABILITACIÓN PRODUCTIVA PENDIENTE — E3-10 HABILITADO ÚNICAMENTE PARA DEFINICIÓN**

La reconsideración no borra ni reinterpreta la evaluación desfavorable original: sus dos fundamentos
continúan como requisitos pendientes de habilitación productiva, no como criterios satisfechos.

## Fuentes contrastadas

- [Ficha E3-09](./E3-09-ficha-retiro-autoridad-economica-participaciones-partidos-sociales.md),
  especialmente §13.
- [DEC-E3-09](./DEC-E3-09-retiro-economia-legacy-partidos-sociales.md), especialmente §6.
- [Addendum E3-09 a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-09-retiro-economia-legacy-partidos-sociales.md),
  especialmente §4.2 y §4.4.
- [Informe de implementación](./E3-09-informe-implementacion.md).
- [Documento 5 vigente](<../../transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md>),
  decisión D5-055 y continuidad de Etapa 3.

## Alcance local integrado

La implementación `b3a234124322d27e883569a343fb5076fe55f7f6`, integrada en `dev` mediante el
merge `e2a6fc26e6ebcbdb29c48d7331ba2ca2ec8b3ade`, realiza el corte aprobado D01=A, D02=A y
D03=A:

- retira UI, mensajes, props e invocaciones económicas de partidos sociales;
- deja de escribir y consumir productivamente `participations.pagoEstado`;
- conserva los datos históricos intactos e inertes y omite el campo en nuevas Participaciones;
- preserva reemplazo, reincorporación, ranking, equipos y comportamiento deportivo ajeno a economía;
- mantiene cierre explícito con existencia, autenticación, autorización, estados, `lock` y mínimo de
  titulares, sin gate económico ni cierre automático por Participación;
- conserva `updatePagoEstado` como tombstone autenticado/autorizado, con
  `failed-precondition`, `SOCIAL_MATCH_PAYMENT_RETIRED` y cero efectos;
- retira el código y export versionados de `onMatchClose`;
- no crea Pago, Recepción, obligación, ingreso, Movimiento, asociación retroactiva ni referencia
  deportiva canónica nueva.

Este alcance está integrado local y remotamente en Git. No acredita retiro efectivo en producción,
Firebase remoto ni deploy.

## Evidencia y criterios técnicos

El informe registra:

- prueba unitaria focal `4/4`;
- Emulator focal final `7/7` con proyecto demo y datos sintéticos;
- suite unitaria completa `404/404`;
- sintaxis Functions `448/448`;
- lint baseline, typecheck y build aprobados;
- búsqueda estructural sin readers/writers productivos de `pagoEstado` y sin export local de
  `onMatchClose`;
- `git diff --check` aprobado.

Los criterios técnicos 2 a 14 y la parte local del criterio 15 poseen evidencia. Se probaron altas
deterministas, duplicadas y concurrentes; ranking; reemplazo; reincorporación; cierre explícito;
historia con los tres valores legacy y sin campo; tombstone, autorización y cero efectos; ausencia de
cierre automático; y concurrencia focal entre roster y cierre.

### Evidencia final del criterio 12

La regresión compara snapshots canónicos antes y después de altas/ranking, alta concurrente,
reemplazo/ranking, reincorporación, ambos pasos del cierre y tombstone. Cada raíz económica contiene
datos sintéticos preexistentes no vacíos, de modo que la igualdad detecta creación, modificación o
eliminación.

Se cubren `groupChargeConcepts`, `groupChargeOccurrences`, `payments`,
`paymentGenerationIntents`, `paymentCommandReceipts`, `paymentDeliveries`,
`paymentDeliveryReversals`, `paymentDeliveryCommandReceipts`,
`paymentReceiptCandidateGuards`, `administrativeReceiptCommandReceipts`,
`groupCapabilityGrants`, `groupCapabilityGrantSlots` y `groupCapabilityCommandReceipts`, además de
`payments/{paymentId}/deliveryApplications`, `principalCorrections`, `waiverEvents` y
`paymentGenerationIntents/{intentId}/rows`. Los movimientos E3-08 son una proyección consultiva de
Recepciones, reversals y aplicaciones, cuyas fuentes quedaron incluidas.

No se observaron creaciones, modificaciones ni eliminaciones económicas.

### Fallos encontrados y correctivos

- La ejecución inicial dentro del sandbox falló por `EPERM` al resolver la ruta del workspace. La
  misma verificación se ejecutó sobre el workspace autorizado y aprobó; no fue un defecto del
  producto.
- La primera ampliación del criterio 12 esperaba incorrectamente que una reincorporación en un
  Partido `verificando` terminara como suplente. El comportamiento vigente omite ranking en Partidos
  no abiertos y conserva la Participación `pendiente`. Se corrigieron únicamente la expectativa y la
  espera del test; la corrida focal final aprobó `7/7`. No hubo correctivo productivo.
- Firebase CLI no pudo consultar MOTD/config remota y emitió advertencias no bloqueantes sobre SDK de
  Extensions; el proyecto demo y los emuladores locales completaron la ejecución.
- El build advirtió `caniuse-lite` desactualizado, sin fallo de compilación ni cambio de dependencias.

## UAT humana pendiente

La UAT humana no pudo ejecutarse porque el frontend actual no ofrece el recorrido de creación y
gestión de partidos sociales necesario. Permanece expresamente **no ejecutada y no aprobada**. La
ausencia de navegación no se usa como evidencia de retiro backend.

La UAT queda diferida hasta una futura habilitación o revisión del módulo de partidos sociales, sin
condicionarla a implementar cobros y sin reservar un incremento.

Esta limitación bloquea el cierre bajo la normativa vigente:

- DEC-E3-09 §6.10 exige que la UAT compruebe que el Partido conserva sus acciones deportivas y no
  presenta economía.
- El addendum §4.4.4 exige que la UAT confirme las acciones deportivas conservadas y que la ausencia
  de estado no se presente como “gratis” o “pagado”.
- La ficha §13 incluye UAT visual dentro de las pruebas mínimas futuras.

## Rollout remoto pendiente

No hubo Firebase remoto ni deploy. Retirar el archivo y export local de `onMatchClose` no elimina una
Cloud Function ya desplegada. Un rollout futuro autorizado debe comprobar el ambiente objetivo,
eliminar o deshabilitar explícitamente la función remota y verificar su ausencia, preservando
`updatePagoEstado` como tombstone.

Esta condición también bloquea el cierre bajo la normativa vigente:

- ficha §13.15 exige eliminación o deshabilitación remota y verificación posterior;
- addendum §4.2.7 impone el mismo resultado;
- D5-055 conserva expresamente este requisito y prohíbe inferirlo de la omisión del export.

Por ello, el retiro está demostrado para el alcance local integrado, pero no se afirma retiro
operativo efectivo en producción.

## Riesgos, rollback y gates preservados

- UAT visual/deportiva pendiente y no aprobada.
- Estado remoto de `onMatchClose` desconocido hasta rollout autorizado.
- Retiro económico residual de inscripciones/equipos de Torneo pendiente como gate obligatorio
  separado; E3-09 no lo cierra y Etapa 3 permanece abierta.
- D5-044 y D5-045 permanecen preservados; E2-14 no se reabre.
- Auth/UAT real permanece aislada y no fue alterada por la evidencia automatizada.
- Datos históricos `pagoEstado` permanecen intactos, inertes y sin significado económico canónico.

Antes de rollout, el rollback es revertir de forma controlada los commits de implementación e
integración. Después de rollout no es seguro restaurar ciegamente writers, consumidores o
`onMatchClose`: cualquier corrección debe avanzar preservando historia y sin crear Pagos
retroactivos. Rehabilitar autoridad legacy requiere una decisión funcional nueva.

## Condición para revaluar el cierre

Una nueva evaluación podrá emitir el veredicto solicitado sólo con evidencia de:

1. UAT humana ejecutada y aprobada conforme a DEC §6.10 y addendum §4.4.4; y
2. rollout autorizado que elimine o deshabilite `onMatchClose` remoto y verifique su ausencia.

Hasta entonces no corresponde emitir
`E3-09 CERRADO — E3-10 HABILITADO ÚNICAMENTE PARA DEFINICIÓN`.

## Enmienda focal adoptada por D5-056

La enmienda separa dos hitos antes tratados conjuntamente:

1. **aceptación y cierre del alcance local integrado**, acreditados por código versionado, pruebas,
   Emulator y evidencia de repositorio; y
2. **habilitación productiva del recorrido de partidos sociales**, condicionada a UAT humana y al
   retiro remoto verificado de `onMatchClose`.

La adopción no declara cumplidas la UAT ni la operación remota. Ficha, DEC, addendum y Documento 5
quedan armonizados por `D5-056`; la regla es exclusiva de E3-09.

### Diff normativo adoptado

#### Ficha E3-09, §13

```diff
- Una implementación futura deberá demostrar, sin considerar esta lista como ejecución actual:
+ La aceptación se divide en dos gates independientes. El cierre del alcance local integrado exige
+ evidencia técnica de los criterios 1 a 14 y de la parte de repositorio del criterio 15. La
+ habilitación productiva del recorrido de partidos sociales exige además UAT humana aprobada y la
+ parte remota del criterio 15. Cerrar el alcance local no acredita ni autoriza producción.
@@
- 15. el código/export versionado de `onMatchClose` está retirado y el rollout autorizado elimina o
-     deshabilita explícitamente la función remota ya desplegada, verificando luego su ausencia; no se
-     considera suficiente omitir el export.
+ 15. para aceptación local, el código/export versionado de `onMatchClose` está retirado; para
+     habilitación productiva, el rollout autorizado elimina o deshabilita explícitamente la función
+     remota y verifica su ausencia. Omitir el export nunca acredita el retiro desplegado.
@@
- Pruebas futuras mínimas: unitarias de dominio/servicio, arquitectura por búsqueda/imports, Emulator
- para altas/reemplazos/ranking/cierre/tombstone y UAT visual de Partido sin economía.
+ Las pruebas técnicas locales mínimas permanecen sin reducción. La UAT visual de Partido sin
+ economía permanece no aprobada y es obligatoria antes de exponer o rehabilitar el recorrido para
+ usuarios, aunque no bloquee por sí sola el cierre documental del alcance local integrado.
```

#### DEC-E3-09, §6

```diff
- 10. UAT comprueba que el Partido conserva sus acciones deportivas y no presenta economía.
+ 10. UAT comprueba que el Partido conserva sus acciones deportivas y no presenta economía. Puede
+     diferirse, con estado explícito `NO EJECUTADA / NO APROBADA`, al cerrar exclusivamente el
+     alcance local integrado, pero continúa como gate obligatorio antes de habilitar el recorrido a
+     usuarios. La ausencia de navegación no constituye evidencia técnica ni aprobación visual.
@@
- 11. el código/export de `onMatchClose` queda ausente y el procedimiento de rollout exige eliminar o
-     deshabilitar y verificar la función remota, sin asumir que la omisión del export la elimina.
+ 11. la ausencia de código/export satisface únicamente el retiro en repositorio. El rollout exige
+     eliminar o deshabilitar y verificar la función remota antes de afirmar retiro efectivo en el
+     entorno desplegado o habilitación productiva.
```

#### Addendum E3-09, §4.2.7 y §4.4.4

```diff
- 7. el código/export de `onMatchClose` queda ausente y el rollout autorizado demuestra eliminación o
-    deshabilitación de la función remota, sin inferirla de la omisión del export.
+ 7. el código/export ausente acredita retiro en repositorio. La eliminación o deshabilitación remota
+    y su verificación constituyen un gate separado y obligatorio del rollout; hasta cumplirlo no se
+    afirma retiro efectivo en el entorno desplegado.
@@
- 4. UAT confirma que las acciones deportivas conservadas siguen disponibles y que no se presenta una
-    equivalencia “sin estado = gratis/pagado”.
+ 4. UAT confirma que las acciones deportivas conservadas siguen disponibles y que no se presenta una
+    equivalencia “sin estado = gratis/pagado”. Puede permanecer diferida y no aprobada al cerrar el
+    alcance local, pero debe aprobar antes de habilitar el recorrido de partidos sociales a usuarios.
```

#### D5-055, enmienda adoptada como D5-056

```diff
- La ficha queda `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`; el rollout futuro debe
- retirar código/export y eliminar o deshabilitar explícitamente la función remota `onMatchClose`,
- sin inferirlo de la omisión del export;
+ La aceptación puede cerrar el alcance local integrado cuando la evidencia técnica aprobada
+ demuestre el retiro en repositorio, sin afirmar producción. La UAT humana puede permanecer diferida,
+ no ejecutada y no aprobada, pero debe aprobar antes de habilitar el recorrido de partidos sociales a
+ usuarios. El rollout debe eliminar o deshabilitar explícitamente `onMatchClose` remoto y verificar
+ su ausencia antes de afirmar retiro efectivo en el entorno desplegado; omitir el export no basta.
```

### Consecuencias de la enmienda adoptada

- La evidencia ya integrada permite cerrar el **alcance técnico local** de E3-09 sin repetir suites ni
  presentar UAT como aprobada.
- E3-10 queda habilitado únicamente para definición; este cierre no anticipa ni define su alcance.
- El recorrido de partidos sociales no podría habilitarse o rehabilitarse para usuarios hasta aprobar
  UAT humana sobre presentación y acciones deportivas.
- Ningún ambiente desplegado podría declararse libre de la autoridad legacy hasta eliminar o
  deshabilitar `onMatchClose` remoto y verificar su ausencia durante un rollout autorizado.
- La evidencia técnica existente, incluido el criterio 12, conserva íntegramente su fuerza y no se
  sustituye por ausencia de navegación, revisión estática o una declaración administrativa.
- El retiro económico de inscripciones/equipos de Torneo continúa como gate obligatorio separado. La
  eventual clausura local de E3-09 no cierra Etapa 3.

## Pendientes de habilitación productiva

| Pendiente | Evidencia requerida | Momento obligatorio |
|---|---|---|
| UAT humana | ejecución y aprobación registradas sobre presentación sin economía y acciones deportivas conservadas; la ausencia de navegación no basta | antes de habilitar o rehabilitar el recorrido de partidos sociales a usuarios |
| retiro remoto de `onMatchClose` | evidencia del rollout autorizado que elimina o deshabilita la función y comprobación posterior de su ausencia operativa | durante el rollout y antes de afirmar retiro efectivo en el entorno desplegado |

Hasta satisfacer ambos pendientes no existe habilitación productiva. El gate económico residual de
inscripciones/equipos de Torneo y Etapa 3 permanecen abiertos.
