# E3-08 — Cierre de consulta de movimientos de ingresos registrados

Fecha de cierre documental: 2026-10-21

Etapa: 3 — Economía

Incremento: E3-08

Estado: **CERRADO**

## Fuentes y trazabilidad

Este cierre aplica la estructura vigente de Documento 5 y se contrastó focalmente con:

- [Documento 5 — Plan de Implementación y Transición Técnica](<../../transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md>), en particular D5-044, D5-045, D5-053 y D5-054;
- [Ficha E3-08](./E3-08-ficha-consulta-movimientos-ingresos.md), incluidas D01–D04=A, UAT y criterios de aceptación;
- [Addendum E3-08 a Documentos 2, 3 y 4](../../arquitectura/Documento-2-3-4-addendum-E3-08-consulta-movimientos-ingresos.md);
- [DEC-E3-08 / D5-053 y D5-054](./DEC-E3-08-consulta-movimientos-ingresos.md);
- [Informe único de implementación E3-08](./E3-08-informe-implementacion.md), que conserva gates A/B, comparación, adopción de B, mediciones, fallos, correctivos y alcance exacto de la evidencia humana;
- [Cierre E3-07](./E3-07-cierre.md), como antecedente de composición económica, condonación no monetaria y solicitud de delegación pendiente.

Trazabilidad Git verificada:

| Hito | Commit | Relación |
| --- | --- | --- |
| Base de implementación | `ed28dd164b156e0ec6374dcc94eecb117dbe44a4` | `dev` antes de E3-08 |
| Implementación, pruebas e informe E3-08 | `c681fb262b3ba02b1e019f0bba02bebd736fea40` | feature publicada |
| Integración en `dev` | `16a4a8e3517258a88887569d9f63c719b3083242` | merge `--no-ff`, con árbol idéntico a la feature |

El commit funcional contiene 24 archivos, 2.500 inserciones y 2 eliminaciones. Antes de crear este
cierre se comprobó que `dev` coincidía con `origin/dev` `0/0`, que el árbol del merge era idéntico al
de la feature y que árbol, índice y stashes estaban limpios.

## Alcance efectivamente implementado

E3-08 incorpora una consulta derivada, read-only y acotada de movimientos de ingresos registrados
por Grupo y rango civil. Recepción y Pago conservan autoridad; la consulta no escribe, no proyecta,
no persiste snapshots y no introduce cache. El eje es la fecha registral. La fecha efectiva se
presenta sólo como información.

El mecanismo vigente es la alternativa B adoptada por D5-054: cada apertura, refresh o cambio de
rango reautoriza y ejecuta una transacción read-only que produce un conjunto completo y coherente de
hasta 1.000 movimientos mínimos, sus totales exactos, digest y corte exclusivo. Frontend conserva el
conjunto sólo en memoria, pagina visualmente 20/50 y renderiza únicamente las filas visibles. Cambiar
de página no consulta backend ni recalcula economía.

El contrato público es `{ groupId, from?, to? }`. Sin fechas usa el mes civil actual de
`America/Argentina/Buenos_Aires`; informadas, deben venir juntas y abarcar como máximo 92 días
inclusivos. El hecho 1.001 se detecta con lectura acotada y falla sin filas ni totales parciales. No
existen `pageSize`, cursor o continuación backend.

Cada Recepción aporta una vez su total raíz por hecho. Líneas, aplicaciones y avisos resueltos no se
suman otra vez. Un ingreso y su reversión son hechos separados; la reversión registral no es una
devolución ni egreso real. Una reversión posterior aparece en su propio período y no reescribe el
anterior. El neto puede ser negativo y nunca se denomina saldo de caja. Deuda, condonación,
corrección y anulación no integran estos totales.

La transacción fija `readCutoffExclusive` desde el `readTime` del servidor y aplica frontera estricta
a streams informed v1/v2, administrativos v2 y reversiones. Manifiesto, orden, totales, digest,
presentación y DTO pertenecen a la misma lectura coherente. Un timestamp igual al corte queda fuera.
La raíz original permite reconstruir `receiptStateAtCutoff` sin perder el ingreso ante una reversión
posterior.

Owner consulta Grupo activo o archivado y recibe `receiptId` opaco para el detalle autorizado.
`GROUP_TREASURY` efectivo consulta sólo Grupo activo, recibe DTO mínimo sin `receiptId`, actor, notas,
líneas o aplicaciones y no adquiere acciones económicas. Revocación o pérdida de vigencia impide
nuevas consultas; no recupera datos ya entregados al navegador. No se promete detección instantánea:
la vista se limpia cuando el contexto existente lo detecta, al cerrar sesión o al cambiar
Cuenta/Grupo. El gate generacional impide que una respuesta tardía repueble un contexto descartado.

## D5-053, D5-054 y antecedente A

D5-053 permanece como decisión histórica válida del mecanismo A: reconstrucción completa por página
con ancla, digest, conteo y reautorización. Sus gates demostraron técnicamente consistencia, frontera,
reconstrucción y continuación; no se reclasifican como fallidos.

D5-054 sustituyó A únicamente en entrega, paginación y frecuencia de autorización. B evita reconstruir
el mismo manifiesto en cada página backend: una consulta entrega el conjunto completo aceptado y la
paginación posterior es sólo visual. D01–D04=A, semántica económica, privacidad, exactitud, lifecycle,
límites y exclusiones de D5-053 permanecen vigentes.

## Correspondencia entre criterios y evidencia

| Criterio de aceptación | Evidencia identificable | Evaluación |
| --- | --- | --- |
| Cada Recepción aporta una vez y líneas/aplicaciones no duplican | Matriz sintética con raíces de 1, 3 y 20 líneas, totales del manifiesto y recorrido humano 2 de `E3-08-UAT-FINAL-6R` | Satisfecho |
| Ingreso y reversión son hechos distintos; reversión no es devolución | Dominio, DTO/UI, pruebas de ingreso original y reversión, recorrido humano 3 | Satisfecho |
| Reversión posterior no reescribe el período anterior | Gate A con reversión posterior al corte y `receiptStateAtCutoff`; consulta por fecha registral | Satisfecho |
| Deuda, condonación, corrección y anulación no son movimientos monetarios | Consultas limitadas a raíces de Recepción y campos registrales; regresión E3-01–E3-07 | Satisfecho |
| Una transacción entrega autorización, manifiesto, presentación, filas y totales coherentes | Gate A con `readTime` común, escrituras solapadas y cero retries observados | Satisfecho dentro de límites declarados |
| Corte exclusivo y timestamps iguales deterministas | Fixtures iguales al corte excluidos y orden `eventAt DESC, movementId DESC` | Satisfecho |
| Streams v1/v2 no omiten ni duplican | Matrices 0/20/50/999/1.000/1.001 con mezcla y distribución sesgada | Satisfecho |
| Máximo 92 días y hecho 1.001 sin resultados parciales | Contrato focal, Emulator y callable real; recorrido humano 4 para rango | Satisfecho |
| Owner/Tesorería y lifecycle aprobados | Callable con Auth sintética, revocación, Owner archivado y DTO por audiencia; recorrido humano 5 | Satisfecho |
| Neto no se presenta como saldo de caja | Microcopy y totales backend; UI no recalcula | Satisfecho |
| Pago/Recepción conservan autoridad y no hay persistencia nueva | Diff integrado, ausencia de writers/proyecciones/cache y Firestore cliente deny-all | Satisfecho |
| Respuesta completa y paginación visual 20/50 | Gate callable, helper visual y navegador real con 1.000 DTO y sólo 20/50 filas DOM | Satisfecho técnicamente |
| Memoria volátil, limpieza y descarte tardío | Harness de navegador, gate generacional y recorrido humano 6 para limpieza | Satisfecho; descarte tardío sólo técnico |
| Transporte callable y navegador poseen evidencia | Functions/Auth Emulator y Chrome Headless 152, diferenciados en el informe | Satisfecho localmente |
| Preservaciones y exclusiones continúan intactas | Inventario, diff, informe y normativa vigente | Satisfecho |

No se identificó un criterio obligatorio sin evidencia suficiente para el cierre. La evidencia humana
no sustituye autorización negativa, concurrencia, volumen, memoria, fronteras o respuestas tardías.

## Evidencia automatizada y límites

El informe único conserva resultados exactos y contexto. La evidencia vigente incluye:

- contrato E3-08 `2/2` y helper visual/generacional `2/2`;
- unitarias Functions `400/400`;
- matriz Firestore 0/20/50/999/1.000/1.001, mezcla v1/v2, reversión, distribución sesgada y raíces
  representativas con líneas;
- callable real local con tokens de Auth Emulator para Owner y Tesorería, transporte de 1.000 hechos,
  rechazo completo de 1.001, revocación, archivo y rechazo del input legacy;
- Gate A posterior al correctivo UAT: regresión de Grupo v1, consistencia/corte y callable aprobados;
- Chrome Headless 152 con parseo de 1.000 DTO, 20/50 filas renderizadas, cero requests al cambiar
  página, refresh coherente, limpieza, teclado, foco y `aria-live`;
- typecheck, lint contra baseline, build, sintaxis focal, JSON de índices y `git diff --check`.

Las fuentes de medición no se mezclan:

- **Firestore Emulator:** informa resultados documentales retornados, intentos observados, duración y
  memoria de proceso para datos sintéticos. No expone lecturas facturadas verificadas.
- **Transporte callable local:** incluye serialización y Functions/Auth Emulator en loopback. Owner y
  Tesorería produjeron tamaños distintos por minimización; arranque y calentamiento fueron desiguales.
  No acredita red, latencia o SLO productivo.
- **Navegador real local:** midió recepción/parseo, heap observado, DOM visible, navegación y
  accesibilidad dentro de Next en desarrollo y un harness HTTP sintético. No es perfil de memoria
  incremental aislado ni presupuesto productivo.

Los límites de 92 días y 1.000 hechos son funcionales, no promesas de rendimiento. Resultados
retornados no equivalen a facturación. La evaluación operativa productiva y un presupuesto aprobado
permanecen pendientes; esa reserva no invalida la corrección ni la aceptación de transición local.

No se repitieron suites ni Emulator para este cierre documental. Desde el merge funcional no hubo
cambios de código, Rules, índices, configuración o dependencias.

## Fallos observados y correctivos

El informe conserva íntegramente los fallos y la evidencia posterior:

1. Los primeros harness de navegador encontraron una colisión temporal, un `--dump-dom` no confiable
   y un callback inestable del fixture. Se corrigieron runner/fixture sin cambiar el contrato; Chrome
   real aprobó el recorrido posterior.
2. La revisión final detectó `VALIDATION_FAILED` donde ficha, DEC y addendum exigían
   `INVALID_DATE_RANGE`. Contrato, mapper, UI y pruebas se alinearon y se repitieron sólo los checks
   afectados.
3. La UAT inicial recibió HTTP 400 con `DATA_INCOMPATIBLE`. La inspección read-only determinó que el
   Grupo era una forma histórica válida activa v1 sin `ownershipRevision`; el reader admitía v1 pero
   exigía contradictoriamente el campo de v3.
4. El correctivo interpreta exclusivamente v1 activo y v2 archivado sin el campo como revisión
   efectiva 1, consistente con readers económicos vigentes. Mantiene fallo cerrado para híbridos y
   v3/v4 inválidos. La regresión sintética aprobó y la relectura UAT devolvió conjunto vacío coherente.

No hubo reparación, migración o backfill del Grupo UAT. La raíz permaneció v1 sin
`ownershipRevision`. El defecto era del reader E3-08 ante una forma histórica válida, no de los datos
ni de un writer. `reportAllChanges`/`startTime` no aparece en el repositorio y el fallo backend se
reprodujo sin ese script; no se le atribuye relación causal.

## Evidencia humana — `E3-08-UAT-FINAL-6R`

`E3-08-UAT-FINAL-6R` identifica exclusivamente la guía final de seis recorridos, posterior al
correctivo del Grupo histórico. No renumera ni sustituye las guías anteriores conservadas en el
informe.

La confirmación humana recibida cubre únicamente:

1. vista vacía, tres totales en cero y corte visible;
2. ingreso contabilizado una vez por Recepción, sin duplicación por líneas;
3. ingreso y reversión visibles, con compensación correcta dentro del rango;
4. fechas registral/efectiva diferenciadas y rechazo de rango superior a 92 días;
5. consulta Tesorería sin acciones económicas ni información privada;
6. limpieza al cambiar de Grupo o cerrar sesión.

No se atribuye confirmación humana a 1.000/1.001 hechos, paginación con muchos registros, carreras,
memoria, respuestas tardías, frontera exacta, privacidad negativa, revocación concurrente, costo o
facturación. Esos puntos conservan exclusivamente su evidencia técnica identificada.

## Privacidad, lifecycle y rollback

Owner y Tesorería reciben sólo presentación mínima. Tesorería omite `receiptId`, actores, UID/email,
motivos/notas, líneas, aplicaciones, avisos y enlaces Owner. La consulta no concede escritura ni
amplía `GROUP_TREASURY` fuera de este reader. Otros grants no adquieren capacidad por analogía.

Owner conserva lectura histórica de Grupo archivado; Tesorería sólo consulta Grupo activo con grant,
slot, vínculo Cuenta–Persona, Membresía, Temporada, Owner y revisión vigentes. Cada nueva consulta
revalida. Logout, cambio de Cuenta/Grupo y pérdida detectada limpian memoria. Revocar no puede retirar
bytes ya entregados.

El rollback compatible consiste en revertir explícitamente el merge funcional
`16a4a8e3517258a88887569d9f63c719b3083242`, sin reescribir historia Git. Puede retirar callable,
wiring, índices declarativos y superficie UI porque E3-08 no creó persistencia ni writers. Debe
limpiar el estado volátil activo, pero no puede recuperar información previamente entregada. No hubo
deploy ni datos remotos que revertir.

## Riesgos, pendientes y exclusiones preservados

- D5-044 conserva sus superficies, destinos y condiciones de retiro; no se adelanta.
- D5-045 permanece como riesgo residual aceptado y **no solucionado**.
- Auth/UAT continúa aislada y no se integra como configuración o credencial.
- El baseline de lint conserva 36 errores y 9 warnings conocidos, con 9 hallazgos resueltos respecto
  del baseline y sin declaración de lint global limpio.
- El gate de retiro económico legacy continúa pendiente.
- La evaluación operativa productiva y el presupuesto continúan pendientes; las mediciones locales
  no los aprueban.
- No se declara cobertura completa de Caja o balance. Permanecen fuera saldo inicial, egresos,
  cuentas bancarias, crédito, devolución real, conciliación, exportación, contabilidad y pasarelas.
- La delegación de condonación permanece como solicitud pendiente de definición separada. No se
  amplía una capability existente ni se crean roles configurables.
- No se reabre E2-14 ni se adelanta rediseño de partidos/torneos.
- No hubo Firebase remoto, deploy, integración Auth/UAT, migración masiva ni backfill.

## Evaluación de cierre

La implementación coincide con la ficha, addendum, DEC-E3-08, D5-053 y D5-054. B es el mecanismo
vigente; A y sus gates permanecen como antecedentes técnicamente correctos. Exactitud, consistencia,
frontera, streams, límites, autorización, privacidad, lifecycle, frontend, transporte, navegador,
compatibilidad histórica y rollback poseen evidencia identificable. Los fallos y correctivos se
preservan sin reparar datos, y la UAT final se delimita sin extrapolaciones.

No queda un criterio de aceptación conocido sin satisfacer para la transición local. Los pendientes
operativos y riesgos preservados no se reinterpretan como resueltos ni autorizan producción. Este
documento cierra únicamente E3-08: no cierra Etapa 3, no crea una rama siguiente, no define E3-09 y
no autoriza su implementación.

## Veredicto

**E3-08 CERRADO — E3-09 HABILITADO ÚNICAMENTE PARA DEFINICIÓN**

La habilitación permite solamente preparar una definición futura bajo decisión y autorización
propias. No adopta anticipadamente alcance funcional, permisos o normativa para E3-09 y no autoriza
código, pruebas, Firebase remoto ni deploy.
