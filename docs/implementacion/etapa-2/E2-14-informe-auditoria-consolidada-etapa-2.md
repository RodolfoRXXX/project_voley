# E2-14 — Informe de auditoría consolidada de Etapa 2

## 1. Estado documental

- **Tipo:** auditoría consolidada documental y técnica.
- **Estado:** `ABIERTA — CIERRE DE ETAPA 2 BLOQUEADO`.
- **Fecha:** 2026-09-21.
- **Rama auditada:** `dev`.
- **SHA auditado:** `9e276c9759e027388d7174597f1648132b3a604d`.
- **Resultado aprobado:** `ETAPA 2 NO APTA PARA CIERRE — INCREMENTO ADICIONAL REQUERIDO`.
- **Siguiente corte recomendado:** `E2-15 — Cierre e historial canónico de Temporadas`.

Este documento registra de forma durable la auditoría E2-14. No es una Ficha de Incremento
Implementable, no constituye un cierre de E2-14 ni de la Etapa 2, no modifica Documento 5 ni las
revisiones AUD-C05, no habilita E3 y no declara readiness productivo.

La auditoría distingue en todo momento norma aprobada, decisión de ficha, implementación real,
evidencia de pruebas, deuda técnica, deuda funcional, compatibilidad transitoria y funcionalidad
asignada a etapas futuras. El mapa implementable de Documento 5 es preliminar en su numeración y
descomposición, pero sus capacidades no se consideran canceladas sólo porque una ficha posterior
las denomine “trabajo futuro”.

## 2. Fuentes y jerarquía aplicadas

La evaluación utilizó, en orden de autoridad:

1. Documentos 1, 1.5 y 2 aprobados.
2. Documentos 3 y 4 AUD-C05, incluidas sus adendas sobre Períodos de Vigencia.
3. Documento 5 vigente en Markdown.
4. Cierre consolidado de Etapa 0 y cierres de Etapa 1.
5. Fichas, informes, correcciones y cierres E2-01 a E2-13.
6. Informe de auditoría técnica original.
7. Código presente en `dev` como evidencia de implementación.
8. Historial Git como evidencia de versionado e integración.

Las fichas pueden concretar, subdividir y ordenar el trabajo sin elevar decisiones históricas de
implementación a norma. Una exclusión local tampoco reasigna por sí sola una capacidad normativa a
otra etapa.

## 3. Preflight

El preflight previo a la auditoría confirmó:

- rama actual `dev`;
- `HEAD`, `dev` y la referencia local `origin/dev` en
  `9e276c9759e027388d7174597f1648132b3a604d`;
- divergencia `dev...origin/dev` igual a `0/0`;
- working tree e índice limpios;
- cero stashes;
- rama Auth/UAT `chore/preserve-auth-emulator-uat-changes` presente en
  `fc7135e358902a17372d44f20df50883603520ce` y no integrada;
- ausencia de ficha, informe, cierre o referencia E2-14 previa;
- trece fichas, trece informes y trece cierres para E2-01 a E2-13;
- dos documentos correctivos adicionales de concurrencia para E2-02 y E2-03/E2-05;
- ningún incremento E2-01 a E2-13 sin cierre y ningún cierre sin informe;
- todos los commits de implementación E2-01 a E2-13 como ancestros de `dev`;
- ningún Emulator ni proceso Firebase, Java o Node escuchando en los puertos locales inventariados;
- ninguna rama eliminada y ninguna modificación de datos o servicios Firebase remotos.

Para la intervención de versionado de este informe se ejecutó posteriormente
`git fetch --no-prune origin`. El fetch finalizó correctamente y confirmó que `dev` y `origin/dev` continuaban en el SHA
auditado, con divergencia `0/0`. No se modificó configuración Git permanente.

## 4. Matriz de incrementos E2-01 a E2-13

### 4.1 Alcance funcional y arquitectura

| ID | Objetivo | Casos de uso | Agregados | Alcance entregado | Exclusiones y deuda diferida |
| --- | --- | --- | --- | --- | --- |
| E2-01 | Alta mínima de Grupo propio y ownership contextual | CU-011 | Grupo | Grupo v1, Owner único, creación y consultas propias, idempotencia y concurrencia | CU-012–015; Temporada, Membresía y Solicitud; límite comercial provisional |
| E2-02 | Alta y apertura mínima de Temporada | Corte CU-016 | Temporada; Grupo sólo como contexto | Temporada independiente, máximo una abierta y consultas Owner-scoped | CU-017–019; cierre, edición, historia y reapertura |
| E2-03 | Alta explícita de Membresía propia del Owner | CU-025 | Membresía | Vínculo Persona–Grupo–Temporada, active guard e idempotencia | Terceros, finalización, reactivación, renovación e historia |
| E2-04 | Consulta de Grupos operativos propios por Membresía | Soporte de CU-008 | Modelo de lectura de Membresía y Grupo | Consulta paginada self-person con validación de Grupo, Temporada y guard | CU-010; historia; N+1 acotado; sin snapshot multipágina |
| E2-05 | Finalización de Membresía propia del Owner | CU-027 | Membresía | Transición activa→finalizada, lifecycle guard y UI propia | CU-026, CU-028, CU-029, CU-030 y operaciones sobre terceros |
| E2-06 | Solicitud propia de ingreso | CU-031 | Solicitud | Alta, consulta, cancelación y listado de pendientes Owner-scoped | Aprobación, rechazo, reactivación, renovación y notificaciones |
| E2-07 | Decisión de Solicitud y coordinación con Membresía | CU-032 y CU-033 | Solicitud; Membresía como efecto separado | Aprobar, rechazar, recuperar y consultar resultado | Reactivación, renovación, notificaciones y cleanup automático |
| E2-08 | Retiro del ingreso legacy por arrays | Preserva CU-031–033 | Sin nuevo Agregado | Retiro de solicitud, cancelación y decisión legacy; camino canónico exclusivo | Arrays históricos y writers legacy no equivalentes todavía existentes en ese corte |
| E2-09 | Reactivación de Membresía por Solicitud | CU-028; adaptación CU-032 | Membresía; Solicitud separada | Misma Membresía, schema v3, Períodos de Vigencia e historia durable de aprobación | CU-026, CU-029, CU-030 y cierre de Temporada |
| E2-10 | Salida voluntaria de la Membresía propia | CU-009; reutiliza CU-027 | Membresía | Finalización self-person idempotente y retiro de la salida legacy equivalente | Renovación, cierre de Temporada, terceros y roles |
| E2-11 | Roster activo Owner-scoped | Consulta de soporte; no crea un CU autónomo | Modelo de lectura de Membresía y Persona | Lista paginada de Membresías activas con identidad mínima | No ejecuta CU-026/027/029/030; sin comandos administrativos |
| E2-12 | Finalización administrativa de un tercero | CU-027 | Membresía | Prepare/finalize, intent durable y Owner sin Persona propia obligatoria | Disciplina, CU-029, cierre de Temporada y administración general |
| E2-13 | Retiro de autoridad organizativa legacy | Retiro transversal | Conserva Grupo canónico; no crea Agregado | Tombstones, retiro de BFF/UI/writers y cierre de Rules organizativas | Cuatro consumidores frontend y writers deportivos E4 preservados |

### 4.2 Contratos, persistencia, frontend, autorización y evidencia

| ID | Contratos públicos | Persistencia | Frontend | Autorización | Pruebas y UAT | Implementación → merge | Deuda principal | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E2-01 | Crear, listar y obtener Grupo; dashboard mínimo | `groups`, `groupCreationGuards` | Crear/listar/detalle | Owner desde token; roles globales ignorados | Emulator 55/55; 20 manuales; UAT-18 automática | `4fba1ae7d01801d33ec7d83070da715083c84dc3` → `c2412861c0843e8bdf4bd1f008a90011fdebe8d2` | Límite provisional de un Grupo | Cerrado |
| E2-02 | `createAndOpenSeason`, `getOpenSeasonContext`, `getOwnSeason` | `seasons`, `openSeasonGuards` | Apertura y contexto temporal | Owner-only; global admin no autoriza | Unitarias/arquitectura 120/120; Emulator 66/66; UAT-09 automática | `a43139fb862b25b46fe443819447366a78b0b271` → `54674d8e29ab46fb91589c3f5724aed1acd69897` | CU-017–019 | Cerrado |
| E2-03 | Crear y consultar Membresía propia del Owner | `memberships`, active guard | Sección de Membresía propia | Owner/self; Cuenta y Persona autoritativas | Unitarias 157/157; Emulator 80/80; UAT-01–09 manual | `4381dee5620d046478416c6f6772b6290ace69b9` → `f32d8f2a093705804a6d6b78ae8a036d42cfd25f` | Ciclo de vida posterior | Cerrado |
| E2-04 | `listMyCurrentGroupMemberships` | Reader, cursor e índice de Membresía | “Grupos que administrás” y “Grupos que integrás” | Self-person/member-scoped | Unitarias 177/177; Emulator 90/90; UAT-01–11 | `d0a19e22f33c538c6d70e579c21b3a40afe57c69` → `822691bcbe26bddf9d27d0c34c7b9cf2c614d583` | Historia y costo N+1 | Cerrado |
| E2-05 | `finalizeMyMembershipForOwnedGroup`; consulta adaptada | Raíz, active/lifecycle guards | Confirmación de finalización propia | Owner/self; ownership se relee | Unitarias 199/199; Emulator 94/94; UAT-01–06 | `d8cfd4ed5eb7d65102051cfa59202c05b42714be` → `0f57426234013aab91f6e6c3f911a257f3edbb3e` | CU-026/028/029/030 | Cerrado |
| E2-06 | Cinco callables de preview, creación, consulta, cancelación y pendientes | `groupJoinRequests`, pending guards e intents | Superficie candidata y listado Owner | Candidata propia/Owner contextual | Unitarias 231/231; Emulator 107/107; UAT manual | `64ad2b22de4781d8ef3c2733df29db3a03e76939` → `f77b768a07513af0f580876fcede082a28484f93` | Resolución y reingreso posteriores | Cerrado |
| E2-07 | Aprobar, rechazar y consultar resultado | Decision intents y approval coordinations | Acciones y recuperación Owner | Owner vigente; sin rol global | Unitarias 240/240; Emulator 124/124; UAT híbrida | `3cd2572fdbac19e5c52da7812383cde3363dd449` → `eec1d26f9c28631c3466be21d58c858357eb4701` | Sin worker/TTL; reactivación entonces pendiente | Cerrado |
| E2-08 | Retiro de contratos legacy equivalentes | Sin nueva fuente funcional | Retiro de controles/listeners legacy | Contratos E2-06/07 quedan como autoridad | Unitarias 244/244; Emulator 130/130; UAT manual completa | `674e5cb3fbad8edf571d94ca3bf625fb61b7feff` → `d24dbf4e12a87e128b7b3ca17acd88f2e7e05577` | Arrays y autoridad legacy restante | Cerrado |
| E2-09 | Aprobación con `REACTIVATE_MEMBERSHIP`; consultas adaptadas | Membresía v3, Períodos, guards/intents v2 | Distingue alta y reactivación | Owner de Solicitud; contexto autoritativo | Unitarias 255/255; Emulator 137/137; UAT híbrida | `0634d6bac08c4120679bdb3ab907104c58d2bc80` → `0f771a809be6ab87c73156192280e64638e03ee6` | CU-029 y Temporada completa | Cerrado |
| E2-10 | `leaveMyGroupMembership` | Self-exit intent y transición v1/v3 | Salida desde grupos integrados | Self-person; ownership no se pierde | Unitarias 264/264; Emulator 149/149; ocho manuales y dos automáticas | `83fdfcbbd49da3ee7d6ebf6791d7278d3dc69e4c` → `d902cea9234d75ffaadceedbc74b3a7444b88df4` | Retención de intents y CU-029 | Cerrado |
| E2-11 | `listActiveGroupMembersForOwnedGroup` | Reader, cursor e índice de roster | Sección `Integrantes` | Owner-only; roster no concede comandos | Unitarias 271/271; Emulator 157/157; once manuales y una automática | `1eb5e2adf3af1aa7f97d04f6a48ed2954a2be06d` → `394ba745f2b9193f5e40d55b0d2658be0cd99c48` | Administración de terceros entonces pendiente | Cerrado |
| E2-12 | Prepare/finalize administrativo | Intent E2-12, raíz/período/guards atómicos | Acción desde roster | Cuenta y ownership; Persona propia opcional | Unitarias/contratos/arquitectura 279/279; Emulator 167/167; UAT-01–12 manual | `9624e1baab031a29c11e8033b7ef59e45bb105cd` → `75f33cc5a6aa80b0511ac108a4723e92192f9196` | CU-029 y administración general | Cerrado |
| E2-13 | Ocho tombstones HTTP y seis callable | Sin migración; Grupo v1 sólo por repositorio canónico | Redirecciones, retiro de UI y catálogo E4 sanitizado | Sin autoridad organizativa por rol/arrays | E2-03 18/18; focal 7/7; Emulator fresca 168/168; arquitectura 9/9; UAT híbrida | `417955275d6fdd6696094fdbd7b7d4417631bdee` → `ef9f9674806383b2d283e2a69c54bb27bd0384e9` | Compatibilidad E4 y tombstones | Cerrado |

Las correcciones concurrentes E2-02 y E2-03/E2-05 quedaron integradas mediante
`c1ba65399ddf0fb3ca8c88cd1541a2ce615194bf` y
`7dd60fef12919f8f7b24338d36286230bda2abae`, respectivamente.

## 5. Cobertura contra Documento 5

Documento 5 define Etapa 2 como Organización, Grupo, Membresía, Solicitud y Temporada. Su salida
exige que Grupo no contenga Membresías ni Solicitudes y que Temporada sea un Agregado independiente
dentro del Módulo Grupos. Su mapa implementable es preliminar respecto de numeración y tamaño, pero
incluye expresamente administración del ciclo de Membresía, renovación, administración de Grupo y
administración e historial de Temporadas.

| Criterio | Clasificación | Evidencia y conclusión |
| --- | --- | --- |
| Grupo canónico independiente y ownership contextual | Cubierto completamente | E2-01 materializa Grupo v1 y E2-13 retira writers organizativos alternativos |
| Temporada como Agregado independiente | Cubierto completamente en frontera; parcialmente en lifecycle | E2-02 implementa alta/apertura; CU-017–019 siguen ausentes |
| Membresía y Solicitud fuera de Grupo | Cubierto completamente para el modelo canónico | E2-03 y E2-06 crean fuentes independientes |
| Grupo sin Membresías/Solicitudes embebidas como autoridad | Cubierto con compatibilidad transitoria | Schema v1 no contiene arrays; documentos legacy quedan read-only para E4 |
| Consultas actuales de Grupo y Membresía | Cubierto parcialmente | Listado propio y roster entregados; CU-010/historial no |
| Administración del ciclo de Membresía | Cubierto parcialmente | Finalización y reactivación entregadas; CU-026/CU-030 pendientes |
| Renovación de Membresía | Pendiente | E2-09 registra CU-029 como no ejecutado |
| Solicitud, aprobación y rechazo | Cubierto completamente | E2-06, E2-07 y adaptación de reingreso E2-09 |
| Administración de Grupo, CU-012–015 | Pendiente | Las capacidades legacy son tombstones; no existe reemplazo canónico |
| Edición, cierre e historia de Temporadas, CU-017–019 | Pendiente | E2-02 las excluye y fichas posteriores las conservan como trabajo futuro |
| Retiro de arrays y doble autoridad | Cubierto para Organización; diferido para E4 | E2-13 mantiene una allowlist cerrada sin escritura organizativa |
| Criterios comunes por incremento | Cubierto | Los trece cierres contienen verificación, UAT, rollback y trazabilidad |
| Cierre consolidado y actualización de Documento 5 | Pendiente | Documento 5 no fue actualizado y E2-13 no cierra la etapa |

La numeración efectiva E2-01 a E2-13 reemplazó legítimamente el orden preliminar, pero no existe una
decisión aprobada que retire del alcance de Etapa 2 los casos pendientes o los asigne a una etapa
posterior con criterio de salida. Las expresiones “trabajo futuro”, “ficha posterior” o “incremento
propio” son exclusiones locales, no reasignaciones aprobadas.

## 6. Cobertura funcional

### 6.1 Cobertura completa o suficiente

- Grupo canónico y ownership único contextual.
- Temporada como Agregado independiente y apertura inicial.
- Membresía como fuente Persona–Grupo–Temporada.
- Períodos de Vigencia internos conforme AUD-C05.
- Solicitud como Agregado independiente.
- Creación, consulta, cancelación, aprobación y rechazo de Solicitudes.
- Creación y reactivación de Membresía mediante los flujos aprobados.
- Salida voluntaria propia.
- Consulta Owner-scoped del roster activo.
- Finalización administrativa de un tercero.
- Guards, intents, concurrencia, idempotencia y recuperación.
- Retiro de autoridad organizativa legacy alcanzable.
- Separación Cuenta–Persona–ownership–Membresía.
- Ausencia de autorización organizativa por roles globales.
- Ausencia de escrituras cliente sobre Organización canónica.
- Preservación consciente de Partido y Torneo para Etapa 4.

### 6.2 Cobertura parcial o pendiente

- CU-010 — consultar historial de grupos.
- CU-012 — editar información del Grupo.
- CU-013 — configurar Grupo.
- CU-014 — archivar Grupo.
- CU-015 — eliminar Grupo bajo las reglas aprobadas.
- CU-017 — editar Temporada.
- CU-018 — cerrar Temporada.
- CU-019 — consultar temporadas anteriores.
- CU-026 — editar Membresía.
- CU-029 — renovar Membresía para una nueva Temporada.
- CU-030 — cambiar estado de Membresía.

Estos faltantes pertenecen funcionalmente a Organización. En particular, Documento 5 dispone que
Temporada queda íntegramente dentro de Etapa 2 y no reaparece como capacidad futura. CU-029 depende
del cierre e historia de Temporadas y no puede considerarse cubierto por CU-028: reactivación conserva
la misma Membresía; renovación crea una nueva para otra Temporada.

## 7. Estado arquitectónico y de persistencia

La implementación canónica respeta los límites principales:

- `groups`, `seasons`, `memberships` y `groupJoinRequests` son persistencias separadas;
- Grupo y Temporada poseen repositorios distintos;
- Persona, Grupo y Temporada permanecen fuera del Agregado Membresía;
- Solicitud y Membresía se coordinan mediante unidades de consistencia separadas;
- Períodos de Vigencia son entidades internas subordinadas a Membresía;
- Admin SDK/backend es el escritor autoritativo de las superficies canónicas;
- Firestore Rules niega acceso cliente directo a Temporadas, Membresías, Períodos, Solicitudes,
  guards e intents;
- Membresía admite lectura compatible v1/v2/v3 y evoluciona sólo mediante escritura autorizada;
- no existe transacción global Solicitud–Membresía ni autoridad organizativa paralela;
- Grupo schema v1 sólo se escribe mediante el repositorio canónico E2;
- `editGroup`, `toggleGroupActivo`, transferencia y administración legacy permanecen únicamente como
  tombstones de rechazo y no constituyen implementación canónica;
- no existen contratos de cierre/edición/historial de Temporada ni renovación de Membresía.

La compatibilidad E4 conserva exactamente cuatro consumidores frontend directos:

1. `getUserManagedGroups`;
2. `getUserTournamentGroupIds`;
3. `getGroupById` consumido por el detalle de inscripción/equipo;
4. el detalle legacy de Partido.

Las Rules y esos consumidores pueden leer documentos legacy completos, incluidos arrays. Esta es una
deuda explícita de privacidad y encapsulación, no una autoridad E2: schema v1 queda excluido, no hay
create/update/delete de Grupo desde cliente y no se autoriza un quinto consumidor. Readers y writers
backend deportivos de Partido/Torneo continúan asignados a Etapa 4.

## 8. Consolidación de pruebas y UAT

No se repitieron suites durante esta auditoría documental. La evidencia reciente es suficiente para
probar lo implementado y para constatar que las capacidades pendientes no existen.

- Unitarias, contratos y arquitectura: progresión hasta 279/279 en E2-12.
- Emulator Suite: progresión desde 55/55 hasta la corrida fresca 168/168 de E2-13.
- Rules y mantenimiento: 7/7 sostenido.
- Sintaxis Functions: hasta 270/270 archivos en E2-12; E2-13 validó runner y fixture corregido.
- Lint: baseline aprobado con 39 errores y 9 warnings históricos, sin regresiones.
- Typecheck y build: aprobados; build de 21/21 páginas.
- Arquitectura y navegación E2-13: 9/9.
- `git diff --check`: aprobado en los cierres relevantes.
- UAT manual: recorridos principales de los trece incrementos.
- UAT automatizada o por inspección: carreras, respuestas perdidas, dependencias caídas, corrupción,
  identidad incompatible y estados inseguros no fabricados manualmente.

Incidentes registrados y resueltos o clasificados:

- clave VAPID sintética inválida durante preparación E2-03;
- diferencia entre fixtures Auth password y la UI Google en E2-07;
- interrupciones del wrapper PowerShell y advertencias Browserslist;
- consulta MOTD/config bloqueada sin acceso efectivo a Firebase remoto;
- `EPERM` del sandbox al resolver rutas locales;
- regresiones concurrentes `code: 3` corregidas dentro de límites privados;
- contaminación de fixture diagnóstica E2-13, corregida sin cambio productivo y seguida por 168/168.

Una nueva corrida verde no resolvería los casos funcionales ausentes. Después de completar los cortes
bloqueantes deberá ejecutarse un gate consolidado fresco con unitarias/contratos, Emulator completa,
Rules, arquitectura, mantenimiento, lint baseline, typecheck, build y `git diff --check`.

## 9. Registro de deuda remanente

| ID | Descripción | Origen | Impacto | Riesgo | Etapa propuesta | Condición de retiro | Bloqueante |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E2-F01 | CU-017–019 no implementados | Documento 2 y mapa E2 de Documento 5 | No existe ciclo completo ni historia real de Temporada | Alto | Etapa 2 | Implementar edición, cierre, historia, frontend, concurrencia y UAT | Sí |
| E2-F02 | CU-029 pendiente | Documento 2; fila preliminar de renovación | No existe continuidad intertemporada ni trazabilidad entre Membresías | Alto | Etapa 2 | Nueva Membresía para nueva Temporada con vínculo histórico e idempotencia | Sí |
| E2-F03 | CU-012–015 sin reemplazo canónico | Documento 2 y administración de Grupo de Documento 5 | Grupo no puede editarse, configurarse, archivarse o eliminarse | Alto | Etapa 2 | Entregar contratos canónicos separados y retirar tombstones cuando corresponda | Sí |
| E2-F04 | CU-026/CU-030 pendientes | Documento 2 y administración de Membresía de Documento 5 | Administración del lifecycle incompleta | Alto | Etapa 2 | Aprobar reglas de estados y entregar comandos, autorización, persistencia y UAT | Sí |
| E2-F05 | CU-010 pendiente | Documento 2; consulta contextual de Documento 5 | No existe historia canónica de grupos de la Persona | Medio | Etapa 2 | Consulta histórica basada en Membresías/Temporadas sin fuente duplicada | Sí |
| E2-E4-01 | Cuatro consumidores frontend legacy allowlisted | E2-13 | Exposición de documentos completos y dependencia de arrays | Medio | Etapa 4 | Sustituir por contratos/proyecciones backend y eliminar lecturas directas | No |
| E2-E4-02 | Readers, Rules y writers deportivos de Partido/Torneo | E2-13 y roadmap | Roles/arrays legacy continúan en flujos deportivos | Alto, acotado fuera de Organización | Etapa 4 | Migrar elegibilidad/autorización y retirar compatibilidad | No |
| E2-COMP-01 | Tombstones callable/HTTP y catálogo público residual | E2-13 | Superficie pública residual sin autoridad | Bajo/medio | Asignación formal pendiente: E4 o Etapa 9 | Definir consumidor mínimo, ventana y retiro verificable | Sí para consolidación documental |
| E2-AUTH-01 | Rama Auth/UAT aislada | Cierres E2-09 a E2-13 | Puede confundir futuras evidencias manuales | Bajo mientras permanezca aislada | Decisión operativa futura | Integrar mediante intervención aprobada o descartar expresamente | No |
| E2-LINT-01 | Baseline 39 errores/9 warnings | E0 y D5-005 | Reduce señal estática global | Medio | Transversal/Etapa 9 | No regresión y reducción controlada al tocar archivos | No |
| TECH-GAP-04 | Arrays dejaron de ser autoridad E2, pero persisten para E4 y faltan ciclos funcionales | Auditoría técnica original | Brecha parcialmente resuelta | Alto | E2 para faltantes; E4 para compatibilidad | Completar E2-F01–F05 y retirar arrays E4 | Sí en su componente funcional |
| TECH-GAP-08/09 | Encapsulación por flujo incompleta globalmente | Auditoría original y Documento 5 | Acceso directo persiste fuera de E2 | Medio | E3–E5 según flujo | Contrato/backend autoritativo en cada migración | No |
| TECH-GAP-13 | N+1 acotado en consultas | E2-04 y auditoría original | Costo y latencia con volumen | Medio | Cuando exista medición | Optimizar preservando integridad y contratos | No |
| E2-INTENT-01 | Intents durables sin TTL | E2-06/07/09/10/12 | Crecimiento futuro | Bajo sin volumen productivo | Política futura/Etapa 9 | Archivo con tombstone consultable e idempotencia estable | No |
| E2-DEPLOY-01 | Rules, índices y código no desplegados | Política de transición local | Estado remoto no verificado | Operativo | Habilitación productiva futura | Deploy autorizado y gate remoto separado | No para evidencia local; sí para producción |

La ausencia de deploy no invalida la evidencia local. Tampoco permite declarar readiness productivo.

## 10. Contradicciones y resolución

| Contradicción | Clasificación | Resolución |
| --- | --- | --- |
| Documento 5 asigna renovación, administración de Grupo y ciclo de Temporada a E2, pero no están implementados | Funcional, bloqueante | No resuelta; requiere incrementos adicionales |
| Las fichas posteriores cambian la numeración preliminar | Aparente, resuelta | La renumeración es válida; no cancela capacidades |
| E2-13 acepta temporalmente no tener reemplazo para administración de Grupo | Funcional, bloqueante | La aceptación local no tiene etapa destino ni criterio de salida suficiente |
| Documento 5 mantiene E2 como `HABILITADA PARA DEFINICIÓN` | Documental | Debe actualizarse sólo cuando exista cierre real o cambio aprobado de plan |
| E2-13 describía su merge documental como previsto | Documental, resuelta | Git demuestra integración final en `9e276c9759e027388d7174597f1648132b3a604d` |
| Rules aún usa roles globales y arrays | Aparente para E2; técnica real para E4 | No autoriza Organización v1; se conserva como deuda E4 |
| “Cuatro consumidores” aparecen en dos archivos | Aparente, resuelta | Son cuatro símbolos/operaciones allowlisted, no cuatro archivos |
| UAT aprobada incluye casos no manuales | Aparente, resuelta | Los cierres distinguen manual, automatizada e inspección sin inventar recorridos |
| El modelo anterior excluía historia interna de Membresía | Aparente, resuelta | AUD-C05 distingue Períodos propios de historia externa y prevalece |
| TECH-GAP-04 podría parecer resuelto por retirar writers | Técnica/funcional | Sólo está parcialmente resuelto; faltan casos y compatibilidad E4 |

## 11. Riesgos

1. Cerrar ahora convertiría casos funcionales pendientes en deuda implícita sin asignación aprobada.
2. Sin cierre real de Temporada no existe un ciclo organizativo completo ni puede verificarse CU-029.
3. Las fixtures de Temporada cerrada prueban defensas de Membresía, no implementan CU-018.
4. Declarar TECH-GAP-04 cerrado ocultaría renovación/historia faltante y compatibilidad E4 activa.
5. Habilitar formalmente E3 desde este documento rompería la trazabilidad de cierre solicitada.
6. Documento 5 permite paralelización controlada entre E2, E3 y E4, pero esa posibilidad requiere una
   decisión separada; esta auditoría no la concede.
7. La lectura completa de documentos legacy por consumidores E4 mantiene un riesgo de privacidad
   conocido, aunque esté allowlisted y sin escritura.
8. La ausencia de deploy exige un gate futuro antes de cualquier habilitación productiva.

## 12. Veredicto

**C. ETAPA 2 NO APTA PARA CIERRE — REQUIERE INCREMENTO ADICIONAL.**

La evidencia es suficiente para decidir. No corresponde “evidencia insuficiente”: los documentos,
el código y los contratos vigentes demuestran materialmente qué capacidades existen y cuáles no.
E2-14 y la Etapa 2 permanecen abiertas. E3 no queda habilitada.

## 13. Secuencia propuesta

La siguiente secuencia es una recomendación de dependencias, no una numeración inmutable. Cada ficha
deberá confirmar alcance, subdivisión, reglas, contratos, riesgos y numeración antes de implementar.

1. **E2-15 — Cierre e historial canónico de Temporadas:** CU-018/CU-019, liberación coherente del
   open-season guard, coordinación con altas/reactivaciones/finalizaciones, frontend y UAT.
2. **E2-16 — Edición de Temporada:** CU-017, después de cerrar sus reglas funcionales.
3. **E2-17 — Renovación e historia intertemporada:** CU-029 y la porción dependiente de CU-010.
4. Incrementos separados para CU-026/CU-030, precedidos por decisiones explícitas sobre estados y
   transiciones permitidas.
5. Incrementos separados para CU-012–CU-015; edición/configuración no debe agruparse automáticamente
   con archivo/eliminación si excede un corte verificable.
6. Asignación formal de tombstones y compatibilidad pública residual, con etapa y criterio de retiro.
7. Repetición posterior de E2-14 y ejecución del gate consolidado final.

E2-14 queda reservado para la auditoría consolidada y su futura reevaluación. No debe reutilizarse
automáticamente como nombre de un incremento funcional.

## 14. Regla de reapertura

- E2-14 no está cerrada.
- Este informe deberá actualizarse después de terminar e integrar todos los incrementos bloqueantes.
- La reevaluación deberá reconstruir nuevamente cobertura, deuda, contradicciones, pruebas, UAT y Git.
- Sólo esa reevaluación podrá recomendar el cierre consolidado y la actualización de Documento 5.
- Este informe no habilita E3.
- Este informe no declara readiness productivo ni autoriza deploy o acceso Firebase remoto.
- Este informe no sustituye las futuras Fichas de Incremento Implementable.
- La secuencia posterior a E2-15 puede subdividirse o renumerarse mediante decisiones aprobadas de
  cada ficha, sin perder ninguno de los bloqueos funcionales registrados.

## 15. Declaración final

`E2-14 REGISTRADA COMO AUDITORÍA ABIERTA — ETAPA 2 NO CERRADA — E3 NO HABILITADA`
