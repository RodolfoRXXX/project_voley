# E3 — Evaluación documental consolidada de salida

Fecha de evaluación: 2026-10-22
Etapa: 3 — Pago deportivo independiente
Naturaleza: evaluación documental; no constituye cierre de Etapa 3 ni habilitación de Etapa 4 o de producción.

## 1. Alcance y checkpoint de entrada

La evaluación se realizó exclusivamente sobre la base solicitada:

- rama: `dev`;
- `HEAD`: `27a0ed14b3fc13fa0874e5661e3c333cd5ffc504`;
- relación remota informada por Git: `dev...origin/dev`, sin divergencia indicada;
- árbol e índice: limpios antes de crear este documento;
- stashes: ninguno;
- fecha de comprobación: 2026-10-22.

Se contrastaron el [Documento 5 vigente](<../../transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md>), las decisiones y addenda E3 aplicables, y los cierres E3-01–E3-10 con sus informes cuando el cierre remitía a evidencia detallada. No se ejecutaron pruebas ni se realizó una auditoría general del repositorio.

Existe una diferencia temporal que no constituye contradicción normativa: Documento 5 §§7.5 y 12 todavía describe E3-10 como listo para implementar, mientras el [cierre E3-10](./E3-10-cierre.md) posterior acredita su cierre técnico local. D5-057 ya había adoptado la separación propia entre cierre local y habilitación productiva; el cierre posterior aporta la evidencia de ejecución local sin modificar esa regla ni acreditar producción.

## 2. Conclusión ejecutiva

La clasificación documental resultante es:

**ALCANCE FUNCIONAL Y TÉCNICO LOCAL DE E3 COMPLETO — SÓLO RESTA HABILITACIÓN PRODUCTIVA — ETAPA 3 NO CERRABLE TODAVÍA**

Pago está implementado como autoridad económica canónica en el alcance aprobado de E3-01–E3-08. La autoridad económica legacy fue retirada del repositorio para partidos sociales mediante E3-09 y para Torneos, inscripciones y equipos mediante E3-10. Los cierres e informes no identifican un criterio técnico local obligatorio pendiente ni un bloqueo funcional/técnico adicional del repositorio.

Lo pendiente es productivo: UAT humana, retiro remoto verificado de `onMatchClose` para E3-09 y rollout de E3-10 con despliegue coordinado, reconciliación real, resolución operativa de compatibilidad, smoke/UAT y rollback operativo. Aunque D5-056 y D5-057 permiten cerrar separadamente los alcances técnicos locales, no autorizan trasladar esa separación al cierre global de Etapa 3. La ficha E3-10 §14 exige contrastar esos pendientes en la salida consolidada, y D5-057 declara que el cierre local no cierra el gate económico completo ni la etapa.

Por ello:

- no corresponde emitir el cierre de Etapa 3 con la evidencia actual;
- esta evaluación no autoriza comenzar E4 y el usuario decidió no iniciarla todavía; D5 §5.13,
  D5 §7.5, D5 §7.14 y D5-027 permiten coordinación delimitada con E4 bajo dependencias y
  autorización propias, por lo que la decisión actual no se presenta como una prohibición normativa;
- no se observan bloqueos funcionales o técnicos locales adicionales a los gates productivos enumerados;
- Caja/balance completo, delegación de condonación, roles configurables y demás solicitudes futuras no son requisitos de cierre de E3 bajo la normativa vigente.

## 3. Matriz consolidada de salida

En la columna “Bloquea” se distingue entre cierre global de etapa, habilitación productiva y ausencia de bloqueo. Cuando un mismo pendiente impide ambos hitos, se indica expresamente.

| Requisito de salida | Fuente normativa exacta | Evidencia existente | Estado | Bloquea | Acción mínima necesaria |
| --- | --- | --- | --- | --- | --- |
| Pago como única fuente económica deportiva dentro del alcance aprobado | D5 §7.5, “Objetivo” y “Fuente de verdad”; D5-046–D5-054 | [Cierres E3-01](./E3-01-cierre.md), [E3-02](./E3-02-cierre.md), [E3-03](./E3-03-cierre.md), [E3-04](./E3-04-cierre.md), [E3-05](./E3-05-cierre.md), [E3-06](./E3-06-cierre.md), [E3-07](./E3-07-cierre.md) y [E3-08](./E3-08-cierre.md): conceptos, ocurrencias, obligaciones, consulta delegada, entregas, recepciones, anulación, corrección, condonación/reversión y consulta de movimientos, todos cerrados con trazabilidad a sus informes | cumplido | ninguno | Ninguna para salida E3; conservar los límites de cada capacidad. |
| Una sola autoridad económica, sin doble escritura o reinterpretación entre Pago y las superficies legacy | D5-003, D5-010 y D5 §5.8; D5 §7.5 “Salida”; D5-055 y D5-057 | Los cierres E3-09 y E3-10 acreditan localmente cero efectos sobre raíces E3, ausencia de asociaciones retroactivas y preservación inerte de historia | cumplido en repositorio | ninguno en el alcance local | Ninguna acción local; verificar la misma condición en el ambiente objetivo durante rollout. |
| Retiro de autoridad económica legacy de Participación/partidos sociales en el repositorio | D5 §7.5, D5-055 y D5-056; [DEC-E3-09](./DEC-E3-09-retiro-economia-legacy-partidos-sociales.md) §6; [addendum E3-09](../../arquitectura/Documento-2-3-4-addendum-E3-09-retiro-economia-legacy-partidos-sociales.md) §§4.1–4.4 | [Cierre E3-09](./E3-09-cierre.md): implementación `b3a2341…`, merge `e2a6fc2…`, focales `4/4`, Emulator `7/7`, suite `404/404`, sintaxis `448/448`, typecheck/build/baseline y búsqueda estructural aprobados | cumplido | ninguno | Ninguna acción en repositorio. |
| Retiro de autoridad económica legacy de Torneo, inscripciones y equipos en el repositorio | D5 §7.5 y D5-057; [DEC-E3-10](./DEC-E3-10-retiro-economia-legacy-torneos.md) §§2, 3.1–3.4 y 6; [ficha E3-10](./E3-10-ficha-retiro-economia-legacy-torneos.md) §13.1; [addendum E3-10](../../arquitectura/Documento-2-3-4-addendum-E3-10-retiro-economia-legacy-torneos.md) §4.1 | [Cierre E3-10](./E3-10-cierre.md): implementación `ec790e6…`, merge `8b38c5f…`; trece criterios locales satisfechos, unitarias `409/409`, focal `5/5`, Emulator `19/19`, sintaxis `453/453`, typecheck/build/Rules/baseline y regresión focal aprobados | cumplido | ninguno | Ninguna acción en repositorio. |
| Retiro efectivo de `onMatchClose` en el entorno desplegado | D5-055 y D5-056; ficha E3-09 §13.15; addendum E3-09 §§4.2.7 y 6 | Código/export retirados localmente; no hubo acceso Firebase, deploy ni verificación remota. El estado remoto es desconocido | pendiente | cierre de etapa y habilitación productiva | Solicitar autorización productiva separada para identificar el ambiente, eliminar o deshabilitar la función y verificar luego su ausencia operativa. |
| UAT humana de partidos sociales sin economía y con acciones deportivas preservadas | D5-056; DEC-E3-09 §6.10; addendum E3-09 §4.4.4 | Cierre E3-09: `NO EJECUTADA / NO APROBADA`; el recorrido no estaba disponible en el frontend. D5-056 permite diferirla sólo respecto del cierre técnico local | diferido expresamente | cierre de etapa y habilitación productiva | Habilitar un recorrido UAT accesible y ejecutar/aprobar los escenarios normativos antes de exponer o rehabilitarlo a usuarios. |
| Rollout E3-10 y retiro efectivo desplegado de economía de Torneos | D5-057; DEC-E3-10 §§3.3–3.5 y 7; ficha E3-10 §13.3; addendum E3-10 §§4.3 y 5 | Código, Rules y reconciliador existen y fueron probados localmente; no hubo inspección remota, deploy, reconciliación real, smoke ni validación de rollback operativo | pendiente | cierre de etapa y habilitación productiva | Solicitar autorización productiva separada y ejecutar el rollout acotado de ficha §13.3, registrando sus resultados. |
| Resolución operativa de compatibilidad externa E3-10 | DEC-E3-10 §3.5; ficha E3-10 §§10 y 13.3.7 | Inventario interno y tombstone documentados; no se presume ausencia de clientes externos y no existe decisión operativa para el ambiente | pendiente | cierre de etapa y habilitación productiva | Con evidencia disponible del ambiente, presentar para decisión una de las alternativas normativas: aviso, compatibilidad adicional acotada sin restaurar economía o aceptación de riesgo. |
| Reconciliación real de alertas económicas de Torneos sin afectar alertas deportivas | DEC-E3-10 §3.3; ficha E3-10 §§8 y 13.3.4–6; addendum E3-10 §4.3 | Reconciliador local idempotente, por lotes y reanudable probado; ejecución real e inspección posterior no realizadas | pendiente | cierre de etapa y habilitación productiva | Durante el rollout autorizado, inspeccionar, ejecutar por lotes y verificar ausencia posterior de alertas económicas activas y preservación de las deportivas. |
| UAT humana E3-10 y continuidad deportiva | D5-057; DEC-E3-10 §§3.4 y 7; ficha E3-10 §13.2 y §13.3.8; addendum E3-10 §4.2 | [Cierre E3-10](./E3-10-cierre.md): `NO EJECUTADA — NO APROBADA — DIFERIDA HASTA HABILITAR EL RECORRIDO`; automatización no la sustituye | diferido expresamente | cierre de etapa y habilitación productiva | Habilitar un recorrido accesible y ejecutar/aprobar UAT y smoke sobre ausencia económica y continuidad de las acciones deportivas focales. |
| Compatibilidad frontend/Functions/Rules, pruebas exigidas, evidencia, trazabilidad y checkpoint recuperable por incremento | D5 §5.8 y D5-007; D5 §7.13 | Cierres E3-01–E3-10 remiten a contratos, pruebas, Rules, commits/merges, checkpoints y rollback. E3-09/E3-10 declaran satisfechos sus criterios técnicos locales | cumplido en alcance local | ninguno | Para producción, completar el checkpoint y rollback operativos dentro del rollout; no repetir pruebas por esta evaluación. |
| Línea transversal aplicada sólo en los flujos afectados: contratos, Servicios de Aplicación, Repositorios/adaptadores, retiro de acceso UI, pruebas, autorización/Rules, observabilidad, checkpoints, retiro y trazabilidad | D5 §7.13; D5-004 y D5-030 | Fichas, informes y cierres de cada incremento registran la aplicación focal; E3-10 §14 ordena su contraste consolidado. No existe mandato de refactorización horizontal | cumplido en alcance local | ninguno | Mantener la aplicación focal durante rollout y documentar observabilidad/rollback del ambiente; no ampliar el alcance al resto del repositorio. |
| Baseline de calidad sin regresión atribuible a E3 | D5-005 y D5-006; D5 §7.13 | Cierres E3-06–E3-10 preservan explícitamente el baseline conocido y registran lint contra baseline, typecheck/build y pruebas aplicables aprobados | cumplido | ninguno | Ninguna para cierre local; no se exige lint global en cero. |
| Preservar Auth/UAT real aislada de datos, configuración y credenciales productivas | D5-049–D5-057 y addenda E3-09/E3-10; en particular addendum E3-09 §4.4 y cierres E3-09/E3-10 | Evidencia automatizada con Emulator/Auth sintética; ningún acceso remoto ni credencial productiva incorporada. Las UAT pendientes se mantienen separadas y explícitas | cumplido | ninguno por aislamiento; las UAT pendientes bloquean según sus filas | Mantener el aislamiento y usar autorización específica para la futura UAT/operación productiva. |
| Preservar la asignación de compatibilidad residual D5-044 | D5-044: seis callables y ocho rutas HTTP tombstone a Etapa 9; dos GET legacy a Etapa 4 con su proyección sustituta | Todos los cierres E3 la preservan y no infieren ausencia de consumidores externos | diferido expresamente | ninguno para cierre E3 | No retirarlos en E3; reevaluar cada superficie en la etapa y decisión asignadas. |
| Preservar D5-045 como riesgo residual aceptado y no solucionado | D5-045; cierres E3-02–E3-10 | Los cierres mantienen causa histórica desconocida, no infieren resolución por falta de reproducción y no reabren E2-14 por rutina | cumplido | ninguno para cierre E3 | Mantener su declaración en cualquier decisión productiva; no presentarlo como resuelto ni como autorización de deploy. |

## 4. Funcionalidades diferidas, fuera de alcance o solicitudes futuras

Estas capacidades no forman parte del criterio de salida “participaciones, equipos e inscripciones dejan de ser fuentes económicas” de D5 §7.5. Su ausencia no es un bloqueo de E3.

| Capacidad o solicitud | Fuente vigente | Clasificación documental | Estado | Bloquea | Acción mínima necesaria |
| --- | --- | --- | --- | --- | --- |
| Caja o balance completo | D5-053/D5-054; D5 §7.5 indica que E3-08 no crea Caja ni cubre balance completo; cierre E3-08, “Riesgos, pendientes y exclusiones preservados” | Fuera del alcance aprobado. No hay decisión vigente que la convierta en requisito de cierre ni que adopte una implementación futura concreta | pendiente, sin decisión de diferimiento | ninguno | Si se desea, formular necesidad, alcance y decisión propios antes de incorporarla a una etapa. |
| Delegación de condonación | Cierres E3-07 y E3-08; D5 §7.5/D5-053 | Solicitud pendiente de definición separada; E3-07 aprobó condonación Owner-only y no aprobó un cuarto permiso | pendiente, sin decisión de diferimiento | ninguno | Presentar una decisión funcional separada sobre actores, capability, alcance, revocación y autorización backend. |
| Roles configurables, perfiles o RBAC general | D5-043, D5-047–D5-049 y D5 §9 | Las capacidades fijas `GROUP_TREASURY`, `GROUP_PAYMENT_NOTICE_REVIEW` y `GROUP_DIRECT_PAYMENT_RECORD` fueron decididas e implementadas. Un sistema configurable o capacidades adicionales requieren necesidad y decisión propias | pendiente, sin decisión de diferimiento general | ninguno | No inferir nuevos permisos; abrir decisión sólo ante una necesidad concreta. |
| Devolución real, crédito, saldo a favor, intereses, recargos, pasarela, contabilidad, exportación y conciliación general | D5 §7.5, D5-050–D5-054; cierres E3-05–E3-08 | Exclusiones o capacidades futuras no adoptadas por E3. La reconciliación específica de alertas E3-10 no equivale a conciliación económica general | pendiente, sin decisión de diferimiento | ninguno | Definir y adoptar por separado sólo si una necesidad futura lo exige. |
| Retiro de las superficies asignadas por D5-044 | D5-044 | Diferimiento normativo expreso a Etapas 4 y 9, con condiciones verificables y decisión posterior | diferido expresamente | ninguno para cierre E3 | Conservar hasta la etapa asignada; no anticipar el retiro. |

No se usa “diferido expresamente” para Caja/balance, delegación de condonación, roles configurables ni las demás solicitudes futuras porque no existe una decisión vigente que adopte ese diferimiento como tratamiento de salida de E3. Se registran únicamente como pendientes no exigibles y sin efecto sobre el cierre.

## 5. Bloqueos vigentes y siguiente paso mínimo propuesto

No se identifican bloqueos funcionales o técnicos locales adicionales. Los bloqueos vigentes pertenecen a habilitación productiva y, por ficha E3-10 §14 y D5-057, también impiden emitir el cierre global de la etapa:

1. **E3-09 — UAT humana pendiente.** Cláusulas: D5-056; DEC-E3-09 §6.10; addendum E3-09 §4.4.4. Siguiente paso mínimo propuesto, no adoptado: obtener autorización para disponer un recorrido accesible y ejecutar la UAT normativa.
2. **E3-09 — retiro remoto de `onMatchClose`.** Cláusulas: D5-055/D5-056; ficha E3-09 §13.15; addendum E3-09 §4.2.7. Siguiente paso mínimo propuesto, no adoptado: autorizar un rollout focal que identifique el ambiente, elimine o deshabilite la función y verifique su ausencia.
3. **E3-10 — decisión operativa de compatibilidad.** Cláusulas: DEC-E3-10 §3.5; ficha E3-10 §§10 y 13.3.7. Siguiente paso mínimo propuesto, no adoptado: inspeccionar sólo la evidencia disponible del ambiente y presentar las tres alternativas normativas para decisión.
4. **E3-10 — rollout, reconciliación y verificación remota.** Cláusulas: DEC-E3-10 §§3.3–3.4 y 7; ficha E3-10 §13.3; addendum E3-10 §§4.3 y 5. Siguiente paso mínimo propuesto, no adoptado: autorizar el rollout coordinado y registrar despliegue, tombstone, reconciliación, preservación histórica, smoke y rollback operativo.
5. **E3-10 — UAT humana pendiente.** Cláusulas: ficha E3-10 §13.2; addendum E3-10 §4.2; D5-057. Siguiente paso mínimo propuesto, no adoptado: una vez disponible el recorrido en el ambiente autorizado, ejecutar y aprobar los seis grupos de comprobaciones de §13.2 antes de habilitar usuarios.

Estas acciones pueden coordinarse dentro de una habilitación productiva autorizada, pero esta evaluación no adopta esa coordinación, no selecciona ambiente, no autoriza acceso remoto y no ejecuta ninguna de ellas.

## 6. Veredicto y checkpoint de salida

**Veredicto documental:** no corresponde cerrar Etapa 3 todavía. Sólo resta habilitación productiva; sus gates pendientes impiden a la vez afirmar retiro efectivo desplegado y emitir el cierre global bajo la normativa vigente. No se detectan otros bloqueos funcionales o técnicos locales.

**Checkpoint de esta evaluación:** base examinada `dev@27a0ed14b3fc13fa0874e5661e3c333cd5ffc504`; único artefacto autorizado generado: `docs/implementacion/etapa-3/E3-evaluacion-salida-consolidada.md`. No se ejecutaron pruebas, cambios normativos, Firebase remoto, deploy, stage, commit, push, merge ni creación de rama. Etapa 3 continúa abierta y E4 no queda habilitada por este documento.
