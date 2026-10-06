# E2-14 — Reevaluación de pendientes y criterios de salida post E2-24

## 1. Estado y alcance

- **Fecha:** 2026-10-06.
- **Tipo:** balance documental y técnico preliminar posterior al cierre E2-24.
- **Rama y corte examinados:** `dev` en `e3105f227cdd2d4e0dd34b3ea3ce40e69f93c012`.
- **Resultado:** `LISTA PARA REPETICIÓN FINAL DE E2-14 — ETAPA 2 ABIERTA — E3 DESHABILITADA`.
- **Ejecución de suites, Emulator, UAT, Firebase remoto o deploy:** `NO EJECUTADO`.

Este documento reevalúa todos los hallazgos y gates de
[E2-14](./E2-14-informe-auditoria-consolidada-etapa-2.md) después de E2-24. Conserva el informe
original como antecedente del SHA que auditó: no lo corrige retroactivamente, no constituye la
repetición final de E2-14, no cierra E2-14 ni la Etapa 2, no habilita E3 y
no declara readiness productivo.

Un cierre de incremento acredita su corte aprobado, no la cobertura completa de un caso más amplio
ni el cumplimiento automático de todos los criterios de salida de la etapa. La clasificación de este
balance aplica esa distinción, especialmente a CU-026, CU-034–CU-038 y a la compatibilidad residual.

## 2. Preflight

Antes de crear este informe se verificó:

| Control | Resultado |
| --- | --- |
| Rama | `dev` |
| `HEAD` | `e3105f227cdd2d4e0dd34b3ea3ce40e69f93c012` |
| `origin/dev` local | `e3105f227cdd2d4e0dd34b3ea3ce40e69f93c012` |
| Divergencia `HEAD...origin/dev` | `0/0` |
| Árbol e índice al recibir la intervención | índice limpio; únicamente este informe sin seguimiento |
| Stashes | ninguno |
| Auth/UAT | rama `chore/preserve-auth-emulator-uat-changes` preservada en `fc7135e358902a17372d44f20df50883603520ce`, sin integración |

La protección de propiedad de Git del entorno se resolvió únicamente con
`-c safe.directory=C:/Users/Rodolfo/Documents/projectoVoley` por invocación. No se modificó la
configuración Git. No se ejecutó `fetch`: la igualdad informada corresponde a las referencias locales
exigidas por el preflight.

## 3. Fuentes y criterio de evaluación

Se leyeron completos y se contrastaron:

1. [Documento 5 vigente](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md), incluidos §§3–5, §7.4, §8/D5-041, §9 y sus criterios comunes de salida.
2. [E2-14 original](./E2-14-informe-auditoria-consolidada-etapa-2.md) y el
   [correctivo CU-030](./E2-14-correccion-resolucion-CU-030.md).
3. Fichas, informes y cierres E2-15 a E2-20, la ficha E2-21, la definición/cierre E2-22A y las
   fichas, informes y cierres E2-23 y E2-24.
4. [DEC-E2-21](./DEC-E2-21-propuesta-decision-funcional.md),
   [DEC-E2-21-PLAN](./DEC-E2-21-propuesta-ajuste-documento-5.md) y su
   [addendum](../../arquitectura/Documento-2-addendum-DEC-E2-21-diferimiento-CU-013.md).
5. Los addenda funcionales de
   [E2-22A](../../arquitectura/Documento-2-addendum-E2-22A-cargo-descriptivo-membresia.md),
   [E2-23](../../arquitectura/Documento-2-addendum-E2-23-archivo-grupo.md) y
   [E2-24](../../arquitectura/Documento-2-addendum-E2-24-eliminacion-grupo.md).
6. Documentos 1, 1.5 y 2; Documentos 3 y 4 AUD-C05 y sus aclaraciones de Períodos de Vigencia,
   en las secciones necesarias para Grupo, Temporada, Membresía, Solicitud, privacidad,
   autorización, referencias, historia y roles/permisos.
7. Código, Rules, índices, frontend, pruebas y grafo de exports integrados en el SHA examinado.
8. [DEC-E2-25](./DEC-E2-25-diferimientos-funcionales-y-gate-etapa-2.md), su
   [addendum de Documento 2](../../arquitectura/Documento-2-addendum-DEC-E2-25-diferimientos-CU-026-CU-034-038.md)
   y las decisiones D5-042/D5-043 incorporadas al Documento 5.
9. La [propuesta separada de retiro](./E2-14-propuesta-retiro-compatibilidad-residual.md), que
   conserva su nombre histórico pero fue aprobada como decisión de roadmap bajo D5-044.

Se mantuvo la jerarquía normativa de E2-14: los cierres y el código son evidencia; no cancelan una
capacidad normativa ni cambian un gate por sí solos. Una exclusión local tampoco constituye un
diferimiento aprobado.

## 4. Resumen ejecutivo de la cobertura posterior

Desde el SHA auditado por E2-14 se integraron:

- E2-15: CU-018, cierre terminal de Temporada;
- E2-16: CU-019, historial canónico de Temporadas;
- E2-17: CU-017, edición mínima de nombre de Temporada;
- E2-18: CU-029, renovación intertemporada;
- E2-19: CU-010, historia propia de Grupos basada en raíces de Membresía;
- E2-20: cobertura mínima de CU-012 limitada al nombre del Grupo;
- DEC-E2-21/D5-041: diferimiento explícito y acotado de CU-013;
- correctivo E2-14/CU-030: cobertura por composición de CU-027, CU-028 y CU-029;
- E2-22A: cargo descriptivo como cobertura parcial de CU-026;
- E2-23: CU-014, archivo de Grupo;
- E2-24: CU-015, eliminación física de Grupo activo sin referencias.
- DEC-E2-25/D5-042: diferimiento explícito de posición, dorsal y observaciones de CU-026, con
  condición de reapertura por atributo y sin declarar cobertura completa.
- DEC-E2-25/D5-043: diferimiento explícito de CU-034–CU-038 hasta la primera capacidad real
  delegable, sin perfiles o asignaciones especulativas.

Esto resuelve el tratamiento de salida pendiente de CU-026 y CU-034–CU-038, pero no los cuenta como
implementados ni amplía E2-22A. D5-044 resuelve la asignación formal de tombstones y superficie
pública residual sin declarar retiro ejecutado. No quedan otros bloqueos documentales identificados;
permanece obligatoria la repetición final y su gate técnico fresco.

## 5. Matriz funcional de reevaluación

| Requisito y fuente vigente | Estado original E2-14 | Evidencia posterior que lo aborda | Cobertura actual y límites | Clasificación | ¿Bloquea salida? | Acción concreta necesaria |
| --- | --- | --- | --- | --- | --- | --- |
| CU-017 — editar Temporada. Documento 2; D5 §7.4.2/D5-013 | Pendiente dentro de E2-F01 | E2-17 ficha, informe y cierre; `updateSeason`; UI, token, receipt y pruebas | Edición canónica de `nombre` sobre abierta v1. Fecha, objetivos y observaciones no se inventaron; la ficha fundamenta el mínimo implementable | **Resuelto para el alcance normativo concretado** | No | Conservar límites y verificar regresión en el gate final |
| CU-018 — cerrar Temporada. Documento 2 RF-17–20; D5 §7.4.2 | Pendiente dentro de E2-F01 | E2-15 ficha, informe y cierre; cierre v2, guard y receipts | Cierre terminal sin cascadas, con cero activas/coordinaciones y apertura N+1. No es reapertura ni saneamiento global | **Resuelto** | No | Verificar integrado en el gate final |
| CU-019 — consultar temporadas anteriores. Documento 2; D5 §7.4.2 | Pendiente dentro de E2-F01 | E2-16 ficha, informe y cierre; reader paginado | Historial Owner-scoped de cerradas y actual separada. Sin snapshot multipágina ni reparación | **Resuelto** | No | Conservar límites; índice remoto queda fuera del cierre local |
| CU-029 — renovar Membresía. Documento 2; D5 §7.4.2 | E2-F02, pendiente y bloqueante | E2-18 ficha, informe y cierre; raíz nueva v4/v6 con lineage | Renovación por aprobación de Solicitud; no se confunde con reactivación y no copia cargo | **Resuelto** | No | Verificar regresiones de lineage y lifecycle en el gate final |
| CU-010 — consultar historial de Grupos. Documento 2; consulta contextual D5 | E2-F05, pendiente y bloqueante | E2-19 ficha, informe y cierre; `listMyGroupMembershipHistory` | Una fila por raíz, Períodos dentro de la raíz, cero escrituras/lineage traversal. Sin snapshot multipágina | **Resuelto** | No | Verificar reader, cursor, privacidad y coste acotado en el gate final |
| CU-012 — editar Grupo. Documento 2; D5 administración de Grupo | E2-F03A: cobertura mínima parcial, no bloqueante por sí sola | E2-20 ficha, informe y cierre; `updateOwnGroupName` | Sólo `nombre`. No se presume edición de descripción, deporte, Owner, estado o campos inexistentes | **Parcialmente cubierto; mínimo aprobado suficiente** | No por sí solo | Mantener explícito el límite; toda ampliación requiere decisión propia |
| CU-013 — configurar Grupo. Documento 2 + addendum DEC-E2-21; D5-041 | Pendiente en el primer corte; luego diferido | DEC-E2-21, addendum, DEC-E2-21-PLAN y D5-041 integrados | Reconocido y sin implementación. La excepción sólo alcanza este caso y posee condición de reapertura | **Diferido por decisión aprobada** | No, si se satisfacen todos los demás gates | Mantener deuda visible y reabrir sólo con necesidad/ownership/actor/valores/privacidad/efecto aprobados |
| CU-014 — archivar Grupo. Documento 2 + addendum E2-23 | E2-F03C, pendiente y bloqueante | E2-23 ficha, informe y cierre; Grupo v2 archivado | `activo → archivado`, sin cascadas/desarchivo, historia preservada, read-only Owner | **Resuelto** | No | Verificar no mutación, privacidad y exclusión operativa en gate final |
| CU-015 — eliminar Grupo. Documento 2 + addendum E2-24 | E2-F03D, pendiente y bloqueante | E2-24 ficha, informe y cierre; delete v1 sin referencias | Borrado físico sólo sin referencias de ningún estado; v2 no eliminable; recovery técnico privado | **Resuelto** | No | Verificar referencias, no cascadas, recovery y cupo en gate final |
| CU-026 — editar Membresía: `cargo`. Documentos 1/1.5; Documento 2 RF-04/CU-026; addendum E2-22A | Parte de E2-F04, pendiente y bloqueante | E2-22A ficha, addendum, informe y cierre; schemas v5/v6 | Asignar/reemplazar/quitar cargo descriptivo privado; no autoriza y se conserva en la misma raíz | **Resuelto sólo para cargo** | No aisladamente | Conservar privacidad, separación de permisos y no herencia en renovación |
| CU-026 — `posición`, `dorsal` y `observaciones`. Documentos 1 §§Membresía; 1.5 §§2.9–2.10; Documento 2 RF-04/CU-026; addendum DEC-E2-25; D5-042 | CU-026 completo estaba pendiente en E2-F04 | DEC-E2-25, addendum y D5-042; E2-22A conserva cargo como única cobertura implementada | Los tres atributos permanecen reconocidos pero diferidos hasta una utilidad concreta. No hay contratos, valores, UI o persistencia aprobados y no existe una categoría abierta de «otros» | **Diferidos por decisión aprobada; CU-026 sigue parcial** | No, si se satisfacen todos los demás gates | Reabrir por atributo antes de implementar una utilidad que lo necesite y aprobar finalidad, ownership, actor, valores, validaciones, privacidad, lifecycle y corte técnico |
| CU-030 — cambiar estado de Membresía. Documento 2; correctivo E2-14/CU-030 | Pendiente junto con CU-026 en E2-F04 | Correctivo aprobado; E2-05/E2-09/E2-10/E2-12/E2-18 | Estados normativos `{activa, finalizada}` agotados por CU-027/CU-028; CU-029 crea otra raíz. Se prohíbe setter genérico | **Resuelto por decisión aprobada y composición** | No | Incorporar expresamente la reclasificación en la repetición final; reabrir sólo si aparece otro estado/actor/transición aprobados |
| CU-034–CU-038 — crear/editar/asignar/revocar rol y configurar permisos. Documento 2 PF-02; Documentos 1/1.5; addendum DEC-E2-25; D5-043 | No fueron desagregados en la deuda funcional de E2-14; quedaron implícitos en administración/autorización contextual | DEC-E2-25, addendum y D5-043; E2-22A confirma que cargo no los cubre. El código actual no contiene perfiles/asignaciones canónicas | Casos reconocidos y sin implementación, diferidos hasta el primer módulo con capacidades reales delegables. Se mantiene autorización vigente y separación cargo/rol/perfil | **Diferidos por decisión aprobada** | No, si se satisfacen todos los demás gates | Antes de la primera capacidad delegable, definir casos aplicables, perfiles, capacidades, asignación, revocación, alcance contextual y revalidación backend; no convertir cargos automáticamente |

## 6. Matriz completa de hallazgos originales E2-14

| ID original | Cobertura/evidencia vigente | Clasificación actual | ¿Bloquea? | Fundamento y acción |
| --- | --- | --- | --- | --- |
| E2-F01 — CU-017–019 | E2-15, E2-16 y E2-17 cerrados e integrados | **Resuelto** | No | El lifecycle completo de Temporada existe. Revalidar en gate consolidado |
| E2-F02 — CU-029 | E2-18 cerrado e integrado | **Resuelto** | No | Nueva raíz por Temporada con lineage; no reactivación |
| E2-F03A — CU-012 | E2-20 cerrado | **Parcialmente cubierto; mínimo suficiente** | No por sí solo | Sólo nombre; no ampliar por inferencia |
| E2-F03B — CU-013 | DEC-E2-21, addendum y D5-041 | **Diferido por decisión aprobada** | No bajo su excepción | Deuda visible; excepción no transferible |
| E2-F03C — CU-014 | E2-23 cerrado | **Resuelto** | No | Archivo terminal sin cascadas |
| E2-F03D — CU-015 | E2-24 cerrado | **Resuelto** | No | Delete sólo de v1 activo sin referencias |
| E2-F04 — CU-026/CU-030 | E2-22A cubre cargo; DEC-E2-25/D5-042 difiere posición, dorsal y observaciones; correctivo cubre CU-030 | **Parcialmente cubierto con diferimiento aprobado** | No bajo D5-042 | CU-026 no queda agotado; reabrir cada atributo antes de implementar su utilidad y mantener CU-030 sin setter genérico |
| E2-F05 — CU-010 | E2-19 cerrado | **Resuelto** | No | Historia canónica read-only basada en Membresías/Temporadas |
| E2-E4-01 — cuatro consumidores frontend legacy allowlisted | Los símbolos directos y Rules legacy continúan; no hay quinto consumidor observado. E2-23/E2-24 excluyen schemas canónicos v1/v2 de esas superficies | **Diferido por decisión aprobada a E4** | No para E2 | La exposición de documentos legacy completos sigue siendo deuda de privacidad. E4 debe sustituirla por contratos/proyecciones y cerrar Rules directas |
| E2-E4-02 — readers/Rules/writers deportivos Partido/Torneo | Continúan presentes y acotados a flujos E4; no son autoridad sobre Grupo canónico | **Diferido por decisión aprobada a E4** | No para E2 | Migrar autorización/elegibilidad y retirar arrays al intervenir Partido/Torneo |
| E2-COMP-01 — tombstones callable/HTTP y catálogo público residual | Seis exports callable y ocho rutas HTTP de rechazo se asignan a E9; dos GET de catálogo legacy se asignan a E4 con su proyección pública deportiva sustituta. Las superficies actuales se conservan | **Asignado por decisión aprobada D5-044; ejecución futura pendiente** | No por falta de roadmap | Comprobar la asignación y conservación en la repetición final; cada retiro requerirá condiciones satisfechas y otra decisión documentada |
| E2-AUTH-01 — rama Auth/UAT aislada | Rama preservada en `fc7135e...`, no integrada | **No verificado operativamente / preservado** | No mientras siga aislada | No usarla como evidencia ni integrarla en esta intervención. Decidir integración o descarte por trabajo separado |
| E2-LINT-01 — baseline | Cierres recientes registran `36` errores y `9` warnings históricos, sin regresión | **Pendiente aceptado** | No | Mantener no regresión; reducción controlada transversal/E9 |
| TECH-GAP-04 — arrays/autoridad y ciclos funcionales | Ciclos CU-010/017–019/029 y Grupo CU-012/014/015 cubiertos; CU-026 parcial con diferimiento aprobado; CU-034–CU-038 diferidos; arrays E4 continúan sin autoridad E2 | **Cubierto para evaluación de salida bajo D5-042/D5-043; deuda visible** | No por esos diferimientos | Mantener condiciones de reapertura y el retiro E4 separado |
| TECH-GAP-08/09 — encapsulación por flujo | Flujos E2 canónicos usan backend/callables; acceso directo persiste en flujos E4 | **Parcialmente cubierto, asignado por flujo** | No para E2 | Continuar en E3–E5; no abrir nuevos consumidores directos |
| TECH-GAP-13 — N+1 acotado | Readers E2-04/E2-19 conservan paginación/cotas documentadas | **Pendiente aceptado** | No | Optimizar sólo con medición, preservando integridad y contratos |
| E2-INTENT-01 — intents/receipts sin TTL | Retención durable continúa y se amplió de forma deliberada en incrementos posteriores | **Pendiente aceptado** | No | Política futura que preserve recovery e idempotencia; no borrar por conveniencia |
| E2-DEPLOY-01 — no desplegado | Todos los cierres post E2-14 mantienen no deploy/no remoto | **No verificado remotamente** | No para evidencia local; sí para producción | Gate remoto autorizado separado antes de habilitación productiva |

### 6.1 Compatibilidad legacy, privacidad y retiro por flujo

La evidencia actual mantiene la conclusión E2-14:

- Grupo v1/v2 canónico no contiene arrays de Membresía/Solicitud y sólo se escribe desde backend;
- las Rules niegan create/update/delete cliente sobre `groups`;
- la compatibilidad directa se limita a los consumidores deportivos E4 ya allowlisted y a documentos
  legacy sin schema canónico;
- dichos consumidores todavía pueden recibir documentos legacy completos, por lo que la deuda de
  privacidad y encapsulación es real aunque no sea autoridad E2;
- los writers organizativos anteriores no reaparecieron; los callables/HTTP remanentes son rechazo
  estable, no implementación;
- E2-23/E2-24 reforzaron que schemas canónicos presentes y futuros no pasen por Rules, HTTP o
  triggers como legacy;
- D5-044 asigna el catálogo residual a E4 y los tombstones callable/HTTP a E9; ninguna superficie se
  considera retirada ni autorizada para retiro desde esta decisión.

Por tanto, E4-01/E4-02 no bloquean la salida local de E2 por su asignación expresa a E4 y E2-COMP-01
deja de bloquear por falta de roadmap. Su cumplimiento futuro permanece verificable: E4 debe aprobar
la proyección y privacidad, migrar páginas/BFF, comprobar ausencia de dependencia interna y resolver
consumidores externos; E9 debe revisar cada tombstone o familia justificada y requerir una decisión
posterior de retiro. La ausencia de referencias internas no prueba ausencia de consumidores externos.

## 7. Criterios de salida de Documento 5

| Criterio | Evidencia vigente | Estado post E2-24 | Comprobación/acción restante |
| --- | --- | --- | --- |
| Comportamiento funcional implementado | Cierres E2-01–E2-24; DEC-E2-25/D5-042/D5-043 | **Satisfecho para evaluación de salida bajo excepciones aprobadas; no equivale a cobertura completa** | Verificar deuda visible y triggers en el gate final |
| Frontend, Functions y Rules compatibles | Evidencia incremental hasta E2-24 | **Vigente históricamente; no repetida aquí** | Gate consolidado fresco tras resolver bloqueos |
| Pruebas exigidas aprobadas | Último integral E2-24: unitarias `355/355`, Emulator `232/232`, sintaxis `320/320`, lint/typecheck/build verdes | **Histórica suficiente para E2-24; no sustituye gate final** | Repetir suite consolidada en la repetición final |
| Fuente de verdad única | Agregados separados; writers canónicos; legacy E4 sin autoridad organizativa | **Cumplido para lo implementado** | Verificar allowlist y ausencia de nuevos writers |
| Sin escritores anteriores necesarios | Writers organizativos retirados; tombstones sólo rechazan | **Cumplido** | Inspección/arquitectura final |
| Sin lectores anteriores necesarios | Organización canónica no depende de readers legacy; E4 conserva readers propios justificados | **Cumplido con excepción E4 documentada** | Verificar que siguen exactamente acotados |
| Estructura sustituida retirada o justificada | Arrays fuera de autoridad E2; E4 justificado; D5-044 asigna catálogo a E4 y tombstones a E9 | **Justificada y asignada; retiro futuro pendiente** | Comprobar conservación y condiciones del roadmap en el gate final; no exigir retiro actual |
| Rollback/checkpoint comprobado | Cada cierre conserva estrategia y commits | **Evidencia suficiente por incremento** | Revisar trazabilidad; no repetir rollback destructivo |
| Evidencia registrada | Fichas, informes, cierres, UAT e inspección | **Cumplido por incremento** | Consolidar sin elevar cierres a cobertura no demostrada |
| Matriz de trazabilidad actualizada | Esta reevaluación reconstruye pendientes; Documento 5 permanece abierto | **Parcial** | La repetición final debe emitir su matriz; Documento 5 sólo se actualiza al cierre autorizado |
| Salida específica E2: Grupo sin Membresías/Solicitudes y Temporada independiente | Código canónico y E2-13; E2-15–E2-19 completan lifecycle/consulta | **Cumplido con compatibilidad E4 acotada** | Gate arquitectónico final |
| Excepción CU-013 | DEC-E2-21/D5-041 y addendum | **Cumplida como diferimiento, no implementación** | Verificar trigger de reapertura y deuda visible |
| Excepción de atributos CU-026 | DEC-E2-25/D5-042 y addendum | **Cumplida como diferimiento; CU-026 conserva cobertura parcial** | Verificar reapertura por atributo y ausencia de categoría abierta |
| Excepción CU-034–CU-038 | DEC-E2-25/D5-043 y addendum | **Cumplida como diferimiento, no implementación** | Verificar que no existan perfiles/asignaciones especulativas y que cargo no autorice |
| Repetición de E2-14 | No ejecutada | **Pendiente** | Sólo después de resolver los bloqueos de §§5–6 |

## 8. Evidencia, resultados históricos y comprobaciones pendientes

### 8.1 Evidencia vigente

- Código integrado en `dev` para contratos, dominio, persistencia, Rules y frontend de E2-15–E2-24.
- Cierres y objetos/commits de integración trazados hasta el merge E2-24 en el HEAD examinado.
- Schemas canónicos separados para Grupo, Temporada, Membresía y Solicitud.
- Cargo descriptivo implementado sin autoridad y sin exposición fuera de superficies Owner-scoped.
- CU-030 reclasificado formalmente sin comando genérico.
- D5-041 integrado y estrictamente limitado a CU-013.
- D5-042 y D5-043 integrados como decisiones nuevas, limitadas respectivamente a los atributos
  diferidos de CU-026 y a CU-034–CU-038.
- D5-044 integrado con asignación E4/E9 y condiciones verificables, sin retiro ejecutado.

### 8.2 Resultados históricos válidos, no ejecutados en este balance

- E2-15: focal unitaria/arquitectura `86/86`, Emulator focal `5/5`, unitarias `288/288`,
  serialización Emulator `58/58`, Rules/mantenimiento `7/7`; la suite completa conserva TAP sin
  fallos y exit `0`, sin conteo total inventado.
- E2-16 a E2-20: progresión integral documentada de `180/180` a `210/210` en Emulator y de
  `301/301` a `337/337` en unitarias, con gates de Rules, sintaxis, lint, typecheck y build.
- E2-22A: unitarias `344/344`, Emulator `217/217`.
- E2-23: unitarias `350/350`, Emulator `224/224`.
- E2-24: unitarias `355/355`, Emulator `232/232`, sintaxis `320/320`, lint baseline, TypeScript,
  build de 21 páginas y `git diff --check` aprobados.
- UAT manual, automatizada e inspectiva registrada por incremento, manteniendo su clasificación.

Estos resultados demuestran los cortes respectivos. No constituyen una corrida consolidada de la
futura repetición final sobre el SHA que ésta audite.

### 8.3 Límites `NO EJECUTADO` e incertidumbres que se conservan

- No se ejecutó ninguna suite, Emulator o UAT en esta reevaluación.
- En E2-20 no se ejecutó lector de pantalla real.
- En E2-22A no se ejecutaron manualmente un retry por error recuperable espontáneo ni lector de
  pantalla real.
- En E2-23 y E2-24 no se ejecutaron manualmente pérdida controlada de respuesta post-commit ni
  lector de pantalla real; recovery sí posee evidencia automatizada, que no se presenta como manual.
- El incidente local Auth/Functions/Cuenta de E2-16 conserva causa no demostrada. No se atribuye a
  CORS, project ID, orden de arranque, procesos residuales ni otra causa única sin evidencia.
- Los agotamientos históricos de reintentos registrados en E2-23/E2-24 conservan causa no
  determinada. Corridas posteriores verdes prueban no reproducción en esos intentos, no una causa
  raíz ni su eliminación definitiva.
- Emulator y configuración versionada no prueban índices, Rules o Functions desplegados en un
  proyecto remoto.

Los límites anteriores no invalidan retrospectivamente los cierres aprobados. La repetición final
deberá conservarlos como límites, no reclasificarlos como UAT manual aprobada.

## 9. Checks de la futura repetición final de E2-14

### 9.1 Evidencia ya suficiente; revisión documental/estática, no nueva UAT completa

- existencia, integración y trazabilidad de cierres E2-15–E2-24;
- semántica aprobada de CU-030;
- diferimiento acotado de CU-013;
- diferimientos acotados de posición/dorsal/observaciones de CU-026 y de CU-034–CU-038;
- cobertura funcional de CU-010, CU-012 mínimo, CU-014, CU-015, CU-017–019 y CU-029;
- UAT humana ya registrada de los recorridos de cada incremento, sin convertir casos automatizados
  o `NO EJECUTADO` en manuales;
- rollback/checkpoints documentales por incremento;
- no deploy y ausencia de evidencia remota como límite operativo, no como fallo local.

### 9.2 Checks que sí debe ejecutar o reconstruir la repetición final

1. Preflight fresco: rama, SHA auditado, `origin/dev`, divergencia, árbol, índice, stashes y rama
   Auth/UAT.
2. Inventario completo de fichas/informes/cierres, commits ancestros y ausencia de incrementos sin
   cierre o cierres sin informe.
3. Suite unitaria/contratos/arquitectura completa fresca.
4. Emulator Suite completa, secuencial y aislada, con proyecto `demo-*`, loopback, teardown y cero
   listeners residuales.
5. Rules/mantenimiento, sintaxis Functions, lint contra baseline sin regresión, typecheck y build.
6. Pruebas arquitectónicas de Aggregate Roots, backend como escritor, privacidad, no enumeración,
   DTOs mínimos, referencias, historia, idempotencia y recovery.
7. Inspección focal de allowlist E4: exactamente los consumidores aprobados, exclusión de schemas
   canónicos y ausencia de writers organizativos legacy.
8. Verificación de que tombstones y catálogo permanecen conservados y asignados conforme D5-044,
   sin presentar la asignación como retiro ejecutado.
9. Trazabilidad normativa del tratamiento aprobado para CU-026 restante y CU-034–CU-038.
10. `git diff --check`, UTF-8 válido, ausencia de BOM, whitespace final, newline al EOF y referencias
    documentales válidas.
11. Clasificación final de UAT por fuente de evidencia, preservando todos los `NO EJECUTADO` y las
    incertidumbres históricas de concurrencia.

La repetición final debe ejecutar estos checks sobre un SHA integrado. D5-044 resuelve el roadmap,
pero una corrida verde no autoriza por sí sola ningún retiro futuro.

## 10. Estado restante y menor trabajo necesario

| Prioridad | Tipo | Estado restante | Menor trabajo necesario |
| ---: | --- | --- | --- |
| 1 | Validación pendiente | Gate consolidado final de E2-14 no ejecutado | Ejecutar los checks de §9.2 y emitir la repetición final; este balance no la aprueba |
| 2 | Ejecución futura asignada | Catálogo E4 y tombstones E9 permanecen vigentes | Conservarlos; evaluar sus condiciones y obtener una decisión posterior antes de cada retiro |
| 3 | Corrección técnica | No se identificó una corrección técnica autónoma previa a la repetición final | No programar ni retirar superficies por anticipación |

## 11. Próximo paso recomendado

Integrar estas decisiones documentales y ejecutar la repetición final de E2-14 con el gate fresco de
§9.2. No corresponde implementar ahora los retiros E4/E9: cada uno conserva sus condiciones y exige
una decisión posterior.

## 12. Conclusión

La evidencia post E2-24 resuelve E2-F01, E2-F02, E2-F03C, E2-F03D y E2-F05; conserva CU-012 en su
cobertura mínima aprobada; mantiene CU-013 diferido bajo D5-041; y resuelve CU-030 por composición.
DEC-E2-25/D5-042 difiere posición, dorsal y observaciones sin declarar CU-026 completo, y
DEC-E2-25/D5-043 difiere CU-034–CU-038 sin declarar roles o permisos implementados. D5-044 asigna
E2-COMP-01 por superficie y conserva toda compatibilidad hasta una decisión futura de retiro. No se
identifican otros bloqueos documentales; la repetición final y su gate consolidado siguen pendientes.

`DECISIONES DE SALIDA DOCUMENTADAS — ROADMAP DE COMPATIBILIDAD APROBADO — LISTA PARA REPETICIÓN FINAL DE E2-14 — ETAPA 2 ABIERTA — E3 DESHABILITADA`
