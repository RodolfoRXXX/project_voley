# E3-05 — Cierre de anulación de obligación sin ingresos

Fecha de cierre documental: 2026-10-19

Etapa: 3 — Economía

Incremento: E3-05

Estado: **CERRADO**

## Fuentes y trazabilidad

Este cierre aplica la estructura de cierre vigente de Documento 5 y se sustenta en:

- [Documento 5 — Plan de Implementación y Transición Técnica](<../../transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md>), en particular la ficha de continuidad de E3-05 y D5-050.
- [Ficha E3-05](./E3-05-ficha-anulacion-obligacion-sin-ingresos.md).
- [Addendum E3-05](../../arquitectura/Documento-2-3-4-addendum-E3-05-anulacion-obligacion-sin-ingresos.md).
- [DEC-E3-05 / D5-050](./DEC-E3-05-anulacion-obligacion-sin-ingresos.md).
- [Informe único de implementación E3-05](./E3-05-informe-implementacion.md), que conserva comandos, resultados, incidencias y evidencia UAT detallada.
- [Cierre E3-04](./E3-04-cierre.md), como antecedente de historia y paginación de Recepciones.

Trazabilidad Git verificada:

| Hito | Commit | Relación |
| --- | --- | --- |
| Implementación funcional y documentación E3-05 | `9d7728ea683e211dc40ed2a9bf144d03c7bf4baf` | hijo de la base `c4e630d006b02b33ee767ee34af70e4aef4328da` |
| Mantenimiento focal de pruebas heredadas | `f4b3bf70cdb8438065685dbb6e135955082a172c` | hijo del commit de implementación |
| Integración aprobada en `dev` | `9996a29130dbc6c305b231407fe3610b7f55753f` | merge `--no-ff` de la serie anterior sobre la base |

## Alcance efectivamente implementado

E3-05 incorpora la anulación terminal de una obligación individual indebida. Sólo el Owner vigente puede ordenarla y únicamente sobre Pagos `ACTIVE/PENDING` sin Ingresos ni Aplicaciones históricas, incluidas las revertidas. La presencia de un aviso relacionado en estado `REPORTED` bloquea la operación sin resolver el aviso.

La transición conserva la identidad económica del Pago, el principal, los snapshots, las referencias, la clave de generación y los outcomes históricos. El Pago pasa a v3 `VOIDED`; el saldo cero queda explicado por un componente no monetario de anulación y no por un Ingreso, una Recepción, una devolución o una condonación. La clave económica continúa ocupada: la generación posterior no recrea la obligación y la recuperación de la generación original mantiene sus outcomes.

La evolución es compatible con lecturas v1/v2/v3. La escritura valida y normaliza formas compatibles, y rechaza combinaciones incoherentes. No hay migración masiva: una obligación elegible v1/v2 evoluciona a v3 sólo al anularse.

La operación coordina en una misma unidad transaccional el Pago, el guard y el receipt. La revisión es monotónica; la idempotencia distingue repetición equivalente, intención distinta, estado stale y pérdida de respuesta. El recovery reutiliza la intención estable y el receipt sin duplicar efectos.

En un Grupo archivado sólo se admite la anulación íntegra por el Owner prearchivo que conserva ese alcance. La raíz del Grupo, la Temporada cerrada y la Membresía del exintegrante no se modifican. Las lecturas aplican autorización por audiencia: el detalle propio autorizado conserva categoría y omite explicación y actor; Tesorería recibe una proyección mínima sin categoría, explicación, actor ni acción de anulación.

La historia de anuladas es descubrible sin mezclarse con Historial de pagos. Economía Owner, Tesorería y Mis obligaciones muestran pendientes por defecto y ofrecen al pie el acceso secundario **Ver obligaciones anuladas**; la vista resultante tiene título explícito y **Volver a pendientes**. El cambio de contexto reinicia resultados y cursor, conserva paginación, carga, errores y vacíos, y no precarga ambas listas ni deriva contadores desde páginas incompletas.

## Criterios de aceptación y evidencia

| Criterio | Evidencia identificable | Resultado |
| --- | --- | --- |
| Owner-only, elegibilidad `ACTIVE/PENDING` y terminalidad | Pruebas unitarias y Emulator focales consignadas en el informe; revisión de autorización y transición v1/v2 a v3 | Satisfecho |
| Ausencia total de Ingresos y Aplicaciones históricas, incluidas revertidas | Casos focales de aplicaciones aplicadas/revertidas y carreras con ingreso | Satisfecho |
| Aviso `REPORTED` relacionado bloqueante y consulta completa | Gate ejecutable con 0 y 25 avisos; el relacionado en posición 25 fue encontrado y bloqueó | Satisfecho dentro de los volúmenes medidos |
| Conservación de principal, snapshots, referencias, identidad y clave económica | Contratos v3, pruebas de generación, unicidad y outcomes originales | Satisfecho |
| Saldo cero no monetario, sin ingreso ni condonación | Persistencia y DTOs v3; exclusión de anuladas de deuda/resumen; ausencia de nuevas Recepciones | Satisfecho |
| Atomicidad, guard, revisión, idempotencia, stale y recovery | Pruebas focales de repetición, intención distinta, pérdida de respuesta, recuperación y abortos | Satisfecho con los límites de concurrencia declarados |
| Privacidad, autorización y prearchivo | Pruebas focales de audiencias, Tesorería mínima, exintegrante y Grupo archivado | Satisfecho |
| Historia paginada y acceso visual discreto | Pruebas de anuladas y E3-04 focal corregida; typecheck, lint focal y confirmación humana del acceso | Satisfecho |
| Compatibilidad con E3-01/E3-03/E3-04 y Rules deny-all | Evidencia focal registrada en el informe, incluida E3-03 dentro del archivo E3-04 | Satisfecho; no equivale a verde global |

## Evidencia automatizada y límites

El gate de avisos usó Emulator local, proyecto demo y datos sintéticos dentro de la coordinación transaccional con el guard:

| Volumen explícito | Resultado | Lecturas observadas | Documentos | Bytes serializados | Duración local |
| ---: | --- | ---: | ---: | ---: | ---: |
| 0 avisos `REPORTED` | ausencia demostrada sólo tras completar la consulta | 1 guard | 0 | 0 | 348,940 ms |
| 25 avisos `REPORTED` | encontró el relacionado situado después de los primeros 20 y bloqueó | 26: guard + query | 25 | 14.535 | 62,881 ms |

La consulta exhaustiva tiene costo lineal respecto de los avisos `REPORTED` de la Membresía. Sólo se midieron `N=0` y `N=25`; los bytes corresponden a serialización de documentos sintéticos y las duraciones incluyen variabilidad del Emulator local. No se extrapolan capacidad, latencia, costo ni rendimiento productivos. Una lectura fallida o incompleta nunca demuestra ausencia.

La evidencia distingue:

- operaciones realmente solapadas: aviso–anulación y dos anulaciones coordinadas por guard;
- órdenes secuenciales: generación, archivo, ingreso y repetición después de un estado ya observado;
- abortos técnicos inyectados: prueban el outcome de recovery y la ausencia de efectos, no detección automática de conflictos.

Los checks originales incluyeron Functions syntax `428/428`, typecheck, build, JSON de índices, `git diff --check`, Rules deny-all y selecciones focales de E3-01/E3-03/E3-04/E3-05. El lint conservó su baseline conocido de 36 errores y 9 warnings, con 9 hallazgos menos respecto del baseline y sin deuda nueva atribuida a E3-05.

No se declara verde global. El último resultado de la suite unitaria completa permanece `384/390`; no fue repetida después del mantenimiento focal autorizado.

## Pruebas heredadas: resultado original y mantenimiento focal

El mantenimiento de pruebas heredadas se mantuvo separado de la implementación funcional y no modificó código productivo.

- Resultado unitario original: `384/390`. Seis fallos correspondían a aserciones estructurales históricas de páginas de Grupo que seguían exigiendo responsabilidades internas ya trasladadas a `GroupFrame` y componentes actuales.
- Correctivo: se actualizaron exclusivamente esas aserciones para preservar autorización, limpieza de acceso, archivo, acciones y navegación sin fijar textos o ubicación interna fuera del contrato. La primera repetición focal obtuvo 25/26 por una expresión nueva demasiado literal; corregida esa aserción, `groupArchiveE2.test.js` obtuvo 6/6. Todos los casos de los cinco archivos afectados cuentan con evidencia focal posterior aprobada, sin nueva ejecución integral.
- Resultado E3-04 original: `17/19` por un único subtest causal de historia v1/v2 que esperaba `nextCursor`; el otro fallo era la agregación de la suite padre, no una segunda causa.
- Correctivo E3-04: el fixture creó suficientes Recepciones elegibles `INFORMED/ADMINISTRATIVE`, incluido el empate temporal prometido, y comprobó `nextCursor`, continuación, orden y ausencia de omisiones o duplicados. El archivo Emulator focal posterior obtuvo 6/6. No apareció un defecto productivo.

Estos resultados posteriores acreditan únicamente las selecciones focales ejecutadas y no reemplazan los resultados fallidos originales ni autorizan afirmar que las suites completas están verdes.

## Evidencia humana y alcance real

El usuario confirmó `UAT-01` a `UAT-06` sobre los recorridos previamente comunicados:

1. acción Owner en el detalle de una obligación individual elegible;
2. modal, teclado y foco, advertencias, categoría, explicación obligatoria y cancelación;
3. anulación sin movimiento de dinero y exclusión de deuda/resumen;
4. audiencia propia o exintegrante con categoría y detalle mínimo, sin explicación ni actor;
5. Tesorería en lectura mínima, sin categoría, actor, explicación ni acción;
6. bloqueos por aviso o ingreso/aplicación y alcance prearchivo del Grupo archivado.

El usuario confirmó posteriormente el nuevo acceso visual discreto a obligaciones anuladas. No se atribuyen a esta confirmación recorridos específicos adicionales. La evidencia humana no se extiende a carreras, pérdida de respuesta, recovery técnico ni otros escenarios no comunicados.

## Riesgos, gates y exclusiones preservados

- D5-045 permanece como riesgo residual no resuelto; E3-05 no amplía la autoridad ni la adjudicación sobre el historial económico previo.
- D5-044 permanece preservada y no se anticipa su gate.
- Auth/UAT continúa aislada y no se integra como dato, configuración o credencial productiva.
- El gate económico legacy permanece vigente; este cierre no autoriza su retiro.
- Continúan fuera del alcance aprobado: corrección del exigible, condonación, restablecimiento o reemplazo de obligaciones anuladas, anulación de obligaciones con cualquier Aplicación histórica y devolución real de dinero.
- No se incorporan nuevas secciones, permisos, Recepciones, Ingresos, devoluciones ni condonaciones.

La continuidad vigente no asigna por anticipado un alcance funcional a E3-06. Los pendientes residuales anteriores tampoco determinan automáticamente que E3-06 corresponda a Caja. Cualquier definición siguiente deberá evaluar dependencias, riesgos y prioridades bajo autorización específica, sin reabrir D5-044, D5-045, Auth/UAT aislada ni el gate económico legacy por rutina.

## Rollback compatible

El rollback compatible puede retirar la exposición UI y los callables nuevos, manteniendo lectores v3 e índices mientras existan Pagos anulados. Los documentos v3 ya emitidos son terminales: no deben degradarse, reabrirse ni convertirse a v1/v2. Receipts, guards, principal, snapshots, referencias, clave económica y outcomes se conservan para idempotencia, recuperación y trazabilidad. No se requiere migración masiva ni se habilita regenerar la obligación anulada.

## Evaluación de cierre

Los criterios obligatorios de E3-05 cuentan con evidencia funcional, focal y humana identificable dentro de los límites declarados. No queda una regresión relacionada conocida sin resolver. Persisten riesgos y deudas explícitos —en particular D5-045, el baseline de lint y la ausencia de una nueva ejecución integral—, pero ninguno constituye un criterio de aceptación descubierto ni se acepta como riesgo nuevo mediante este cierre.

Este documento cierra únicamente E3-05. No cierra la Etapa 3, no define el contenido de E3-06 y no autoriza Firebase remoto, deploy ni cambios productivos adicionales.

## Veredicto

**E3-05 CERRADO — E3-06 HABILITADO ÚNICAMENTE PARA DEFINICIÓN**
