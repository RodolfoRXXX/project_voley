# E3-01 — Cierre formal de obligaciones por Membresía de Grupo

## Estado

- Incremento: `E3-01`.
- Estado documental: `CERRADO`.
- Alcance cerrado: conceptos económicos Owner, ocurrencias explícitas, generación de obligaciones
  por Membresía y consultas administrativas/propias, sin ingresos ni liquidación.
- Commit de implementación: `6d3be88419c95f287a1195c9c5864cc9d763b7f7`.
- Merge no fast-forward de implementación en `dev`:
  `301e553d4ba6020b11b4218a7011c61b5b02b562`.
- Fecha de cierre documental: 2026-10-08.
- Deploy: no realizado ni autorizado.
- Firebase remoto y datos productivos: no accedidos ni modificados.

Este cierre aplica exclusivamente a E3-01. No cierra Etapa 3, no autoriza producción y sólo
habilita E3-02 para definición; su implementación requiere autorización separada.

## Fuentes y trazabilidad

Este cierre se contrastó con:

- la [ficha E3-01](./E3-01-ficha-obligaciones-membership-grupo.md), incluidos sus veinte criterios
  de aceptación;
- el [informe final de implementación y UAT](./E3-01-informe-implementacion.md), fuente del detalle
  de código, resultados, concurrencia, correctivos y límites;
- el [addendum E3-01 a Documentos 2, 3 y 4](../../arquitectura/Documento-2-3-4-addendum-E3-01-pago-obligaciones.md);
- el [addendum prospectivo de liquidación prearchivo](../../arquitectura/Documento-2-addendum-E3-liquidacion-grupo-archivado.md);
- [DEC-E3-01 / D5-046](./DEC-E3-01-primer-corte-y-coordinacion-E3-E4.md);
- Documento 5, §§5.5, 5.8, 5.10–5.12, 7.5 y D5-043–046;
- el patrón documental vigente de cierres, en particular `E2-24-cierre.md`.

La definición y sus addenda preceden al código. El commit de implementación contiene 38 archivos
E3-01 y el merge lo incorpora como segundo padre sobre el checkpoint aprobado. El árbol integrado
fue comprobado como idéntico al de la feature verificada.

## Alcance efectivamente implementado

E3-01 establece a Pago como raíz independiente para este primer flujo económico:

- conceptos `MONTHLY` y `ONE_TIME`, administrados únicamente por el Owner vigente;
- snapshot económico, versión de concepto, ARS en centavos enteros y vencimiento civil en
  `America/Argentina/Buenos_Aires`;
- ocurrencias estables para cobros específicos y generación explícita por Membresía;
- unicidad económica separada de idempotencia, outcomes por fila y recovery de estados inciertos;
- elegibilidad mensual sobre vigencia canónica v1–v6 y elegibilidad diferenciada para cobro único;
- consultas Owner y propias, con privacidad derivada en backend;
- consulta histórica sobre Grupo archivado y bloqueo de toda mutación E3-01;
- Rules deny-all para acceso directo, cuatro índices declarados y Pago como blocker de CU-015 sin
  cascada.

El frontend entrega Economía dentro del Grupo y Mis obligaciones, con estados accesibles,
presentación administrativa mínima de Persona, modales propios, controles single-flight y
tratamiento explícito de resultados y recuperación. El inventario físico y contractual completo se
mantiene en el informe y no se duplica aquí.

## Correspondencia entre criterios y evidencia

| Criterio de la ficha | Evidencia registrada | Evaluación |
| --- | --- | --- |
| 1. Owner administra y genera | Callables revalidan ownership; recorrido callable prueba Owner, actor ajeno y anónimo sin efectos. | Satisfecho. |
| 2. Versión y snapshot | Pruebas de cambio antes/después del claim y UAT de snapshots; cambios posteriores no reescriben. | Satisfecho. |
| 3. ARS entero | Contratos cerrados y pruebas de límites usan centavos enteros sin punto flotante. | Satisfecho. |
| 4. Tiempo BA | Contrato y generación mensual usan fecha civil BA, independiente del dispositivo. | Satisfecho. |
| 5. Mes elegible | Focal cubre vigente/pasado, solapamiento, futuro/gap y Temporada abierta. UAT-04 rechazó correctamente septiembre porque las Membresías comenzaron en octubre de 2026. | Satisfecho. |
| 6. Períodos read-only | Capacidad de Membresías sólo acredita; no crea, extiende ni corrige Períodos. | Satisfecho. |
| 7. Formas v1–v6 | Pruebas estructurales cubren legacy y period-aware; cargo y lineage no autorizan. | Satisfecho. |
| 8. Unicidad sobre idempotencia | Dos intents concurrentes producen una obligación; key incompatible conflictúa. | Satisfecho. |
| 9. Outcomes y recovery | Terminales permanecen; `PENDING/UNCERTAIN` se reanudan sin falso `FAILED`. | Satisfecho. |
| 10. Concurrencia | Evidencia focal serializa concepto, desactivación, archivo, Temporada, Membresía y ownership. | Satisfecho. |
| 11. Consulta propia | Persona se deriva de Cuenta; integrante/exintegrante sólo ve lo propio y el DTO minimiza datos. | Satisfecho. |
| 12. CU-028/CU-029 | Reactivación conserva raíz y renovación mantiene referencias históricas separadas. | Satisfecho. |
| 13. Grupo archivado | Consultas Owner/propias y restricciones de mutación fueron confirmadas; no existe desarchivo. | Satisfecho. |
| 14. Pago bloquea CU-015 | Emulator prueba blocker funcional separado, ausencia de cascada y conservación del Pago. | Satisfecho. |
| 15. Sin ingresos ni falso pago íntegro | Persistencia y UI sólo crean obligación `PENDING`; no existe movimiento económico. | Satisfecho. |
| 16. `EXISTING` exacto | Retry idéntico no duplica ni modifica; payload distinto produce conflicto y conserva lo persistido. | Satisfecho. |
| 17. Concepto activo y recovery | Desactivación antes/después de fila está serializada; terminales se recuperan sólo tras reautorizar. | Satisfecho. |
| 18. Valores mínimos de recovery | Intent/fila conservan snapshot e importes; hashes prueban identidad sin reconstruir economía. | Satisfecho. |
| 19. Exploración period-aware | Emulator recorre paginación con Períodos vacíos posteriores y encuentra el solapamiento real. | Satisfecho. |
| 20. Finalizadas MONTHLY | Contrato paginado permite finalizadas elegibles; ONE_TIME continúa limitado a activas. | Satisfecho. |

La generación para otro mes elegible sin obligación previa tiene evidencia automatizada. No se
atribuye una nueva ejecución humana de ese escenario.

## Pruebas y gates aprobados

### Ejecuciones anteriores conservadas

- suite unitaria completa incorporando E3-01: `367/367`;
- cobertura inicial de store transaccional, Rules, snapshots, unicidad y lifecycle;
- pruebas de compatibilidad estructural de Membresía y consultas privadas.

### Verificación focal final previa al versionado

- unitarias focales E3-01: `7/7`;
- sintaxis Functions: `346/346` archivos JavaScript;
- Emulator focal Auth + Firestore + Functions: `26/26`, proyecto demo y datos sintéticos;
- recorrido callable HTTP real con clientes sintéticos autenticados y anónimo;
- serialización determinista antes/después de claim y commit, diferenciando `UNCERTAIN` preparado,
  fallo técnico antes de confirmar y pérdida de respuesta posterior al commit;
- frontend typecheck: aprobado;
- lint baseline: aprobado, sin deuda nueva;
- build Next.js: aprobado, incluida `/dashboard/obligations`;
- `git diff --check`: aprobado.

Después de los correctivos exclusivamente frontend se repitieron sólo typecheck, lint baseline y
build. Para el registro final de UAT y este cierre documental no se repitieron suites, Emulator ni
E2-14, porque no hubo cambios funcionales posteriores.

Todos los recorridos Firebase fueron locales, sobre proyectos `demo-*` y datos sintéticos. No hubo
deploy, acceso a Firebase remoto, migración, backfill o borrado.

## Aceptación humana y correctivos de UAT

La UAT confirmó modales del sitio, snapshots, limpieza al cambiar contexto, **Usar otro importe**,
estados en español, toggles, consultas y restricciones tras archivo, y reutilización de obligación
sin duplicación ni modificación. Los hallazgos dieron lugar a correctivos focales de interacción,
presentación, excepciones y modo histórico de Grupo archivado, todos descritos en el informe.

UAT-04 queda aclarada sin ampliar la evidencia: las Membresías probadas comenzaron en octubre de
2026, por lo que rechazar septiembre fue correcto por ausencia de vigencia. Esto no prohíbe meses
pasados con vigencia demostrable. Otro mes elegible fue probado automáticamente, no mediante una
nueva ejecución humana.

La aceptación no equivale a autorización productiva ni demuestra capacidades fuera de E3-01.

## Límites, exclusiones y riesgos preservados

Este cierre no:

- cierra Etapa 3 ni demuestra el retiro de autoridad económica legacy en participaciones, equipos
  o inscripciones;
- resuelve D5-043 ni concede Tesorería, perfiles, permisos delegados o capacidades por cargo;
- retira catálogos o tombstones D5-044;
- habilita avisos, ingresos, validación de pagos, correcciones, condonaciones, reversiones, Caja,
  devolución, pasarelas o liquidación de obligaciones prearchivo;
- autoriza implementar E3-02, migrar datos, desplegar índices/Rules o acceder a Firebase remoto.

D5-045 se conserva como riesgo residual aceptado, con causa histórica no determinada y
reevaluación pendiente antes de producción. Su no reproducción en los recorridos E3-01 no lo
declara resuelto.

La advertencia local de antigüedad de `caniuse-lite` no afectó el build y no motivó actualización de
dependencias. Los índices están declarados en código, pero no desplegados.

## Checkpoint y rollback

El checkpoint anterior a E3-01 es `fd0070868a99e5eb4c4206b1765500cf322c6cad`; la implementación y
su integración están identificadas por los commits consignados en Estado. Al no existir deploy ni
cambios de datos, el rollback disponible es de código y documentación mediante commits de reversión
explícitos sobre los commits integrados, nunca mediante reescritura de historia. Los datos de prueba
son sintéticos y pertenecen a Emulator; pueden descartarse reiniciando el entorno local conforme a
los mecanismos ya documentados.

No existe rollback productivo que ejecutar ni convivencia de dos modelos productivos. Intents,
receipts y obligaciones creados por una futura operación real no deben borrarse o reconstruirse como
forma de rollback: requerirían las políticas económicas y operativas de incrementos posteriores.

## Evaluación de cierre

El comportamiento funcional, frontend, Functions, Rules, persistencia y privacidad son compatibles;
las pruebas exigidas aprueban; Pago es la única fuente original del flujo incorporado; no existe un
writer o reader E3-01 anterior que retirar; la autoridad legacy ajena al corte queda justificada y
conservada como gate de Etapa 3; el checkpoint, rollback y evidencia están registrados; y la
trazabilidad enlaza definición, decisiones, implementación, integración y UAT.

No se detectó un criterio de aceptación E3-01 carente de evidencia. Los límites de técnica o alcance
se mantienen clasificados como tales y no se convierten en aprobaciones inexistentes.

## Veredicto

`E3-01 CERRADO — E3-02 HABILITADO ÚNICAMENTE PARA DEFINICIÓN`

Etapa 3 permanece abierta y cualquier implementación de E3-02 requiere definición completa y
autorización separada.
