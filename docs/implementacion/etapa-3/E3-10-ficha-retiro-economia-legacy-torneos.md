# E3-10 — Ficha de retiro de economía legacy de Torneos, inscripciones y equipos

## Estado

- **Estado documental:** `ADOPTADA POR D5-057`.
- **Decisiones funcionales aprobadas:** `E3-10-D01=A`, `D02=A`, `D03=A`, `D04=A`, `D05=A`.
- **Aprobación funcional:** recibida por instrucción expresa el 2026-10-22.
- **Estado del incremento:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Base inspeccionada:** `dev` en `7d8b0aed951f6ad0004d8c8c08a5c6dc4fbb3a07`, con árbol e índice
  limpios y sin stashes al iniciar esta definición.
- **Habilitación vigente:** E3-10 está habilitado únicamente para definición.
- **Autorización:** esta ficha no autoriza implementación, pruebas, Emulator, UAT, Firebase remoto,
  deploy, rollout ni operaciones Git de escritura.
- **Paquete documental:** [DEC-E3-10](./DEC-E3-10-retiro-economia-legacy-torneos.md) y
  [addendum a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-10-retiro-economia-legacy-torneos.md),
  adoptados por `D5-057`.
- **Documento 5:** continuidad, decisión y referencias E3-10 integradas por `D5-057`.

El corte aprobado retira autoridad y funcionalidad económica legacy de Torneos, inscripciones y
equipos sin construir un reemplazo vinculado a Pago y sin rediseñar el dominio deportivo. Las
decisiones de §12 y el paquete completo quedan adoptados por `D5-057`. La adopción no autoriza
implementación.

## 1. Objetivo y resultado funcional aprobado

El resultado buscado es que `tournaments`, `tournamentRegistrations` y `tournamentTeams` dejen de
crear, calcular, almacenar como dato nuevo, decidir, presentar o alertar economía. Los valores
económicos históricos permanecen en sus documentos, intactos e inertes, sin transformarse en Pago,
obligación, Recepción, ingreso, Movimiento, deuda, saldo canónico ni correlación retroactiva.

El retiro no elimina Torneos, inscripciones o equipos. Se conservan sus identidades, lifecycle,
administración, roster, aceptación/rechazo, cupos, fases, fixture, resultados, standings, avance y
podio bajo las reglas deportivas existentes.

## 2. Fuentes y límites vigentes

### 2.1 Evidencia normativa comprobada

1. Documento 5 define a Pago como única fuente económica deportiva y exige como salida de Etapa 3
   que participaciones, equipos e inscripciones dejen de ser fuentes económicas.
2. DEC-E3-01 conserva ese retiro como gate de E3 y advierte que crear obligaciones independientes no
   lo satisface.
3. E3-09 retiró localmente la autoridad económica de participaciones de partidos sociales, pero dejó
   separado y pendiente el retiro de inscripciones/equipos de Torneo.
4. D5-056 separa cierre técnico local y habilitación productiva exclusivamente para E3-09. No es
   autoridad para aplicar la misma separación a E3-10.
5. D5-044 asigna superficies de compatibilidad concretas. No incluye
   `updateTournamentRegistrationPayment` y no autoriza por analogía su retiro o conservación.

### 2.2 Evidencia productiva comprobada

#### Campos económicos

| Recurso | Campos comprobados |
| --- | --- |
| `tournaments` | `paymentForPlayer`, `settings.paymentPerPlayer` |
| `tournamentRegistrations` | `paymentForPlayer`, `expectedAmount`, `paidAmount`, `pendingAmount`, `paymentStatus`, `paymentDate`, `paymentVerifiedBy`, `paymentVerifiedAt` |
| `tournamentTeams` | `paymentForPlayer`, `expectedAmount`, `paidAmount`, `pendingAmount`, `paymentStatus`, `paymentDate`, `paymentVerifiedBy`, `paymentVerifiedAt` |

`paymentStatus` usa actualmente `pendiente | parcial | pagado`. No debe confundirse con `status` de
la inscripción, cuyo `pendiente | aceptado | rechazado` es deportivo.

#### UI y readers

- alta y edición de Torneo solicitan y presentan pago por jugador;
- el modal administrativo presenta importes, carga incrementos y expone “Confirmar pago”;
- el detalle de inscripción/equipo presenta precio, total, pagado, saldo y badge económico;
- cards, perfil y view-models combinan roster, revisión y pago en un único estado de readiness;
- adapters y tipos proyectan los campos económicos de inscripciones/equipos;
- las consultas leen documentos completos que contienen configuración deportiva, economía e IDs
  administrativos.

#### Writers y contratos

- `createTournament` exige y escribe `paymentForPlayer` y `settings.paymentPerPlayer`;
- `editTournament` admite ambos destinos mediante reconstrucción de estado y `settings`;
- `requestTournamentRegistration` crea todos los campos económicos iniciales;
- `reviewTournamentRegistration` recibe `paymentStatus` y `paidAmountInput`, calcula economía, la
  escribe y la copia al crear `tournamentTeams`;
- `updateTournamentRegistrationPayment` incrementa `paidAmount`, deriva saldo/estado y registra
  verificación;
- el frontend escribe directamente derivados económicos al cambiar `playerIds`;
- Firestore Rules permite que el administrador del Grupo modifique `expectedAmount`,
  `pendingAmount` y `paymentStatus` junto con el roster.

#### Triggers, alertas y gates

- los triggers de Torneo, inscripción y equipo invocan un servicio compartido de alertas;
- `group_tournament_team_payment_pending` se crea para inscripciones y equipos, con importe pendiente
  y estado económico;
- esos mismos triggers también sostienen alertas deportivas de aceptación y roster incompleto;
- el frontend exige `paymentStatus === "pagado"` para habilitar visualmente la aceptación;
- el backend de `reviewTournamentRegistration` no reproduce ese gate económico: puede aceptar sin
  comprobar pago.

La divergencia entre UI y backend es evidencia comprobada, no una regla a consolidar. El retiro debe
eliminar el gate económico de UI; no debe agregar por rutina una validación deportiva nueva al
backend.

## 3. Información económica e información deportiva independiente

### 3.1 Economía a retirar

- precio o pago por jugador;
- importe esperado, pagado o pendiente;
- estado, fecha, actor o timestamp de verificación de pago;
- cálculos derivados del roster con significado monetario;
- readiness, badges, contadores, mensajes o acciones decididos por pago;
- alertas de pago pendiente/parcial;
- mutaciones de pago desde callables, UI o Rules.

### 3.2 Deporte a conservar

- identidad, nombre, descripción, deporte, formato y fechas del Torneo;
- owner/admins y autorizaciones vigentes;
- mínimos y máximos de equipos y jugadores;
- reglas de sets y puntos;
- fases, grupos, fixture, partidos, resultados, standings, avance y podio;
- apertura y cierre de inscripciones y estados del Torneo;
- solicitud de inscripción y sus estados `pendiente | aceptado | rechazado`;
- identidad/nombre del equipo, `playerIds`, `teamMembersCount` y relación con Grupo/Torneo;
- unicidad, cupo máximo, `acceptedTeamsCount`, aceptación y rechazo;
- alertas de aceptación, rechazo y jugadores faltantes.

No se incorporan nuevos gates de suplentes, elegibilidad, Membresía, Temporada, Persona o ranking. Las
brechas deportivas preexistentes se documentan cuando afectan el corte, pero no se corrigen dentro de
E3-10 sin autorización propia.

## 4. Corte vertical aprobado

Una futura implementación deberá realizar conjuntamente, en las rutas afectadas:

1. retirar el campo económico del formulario y payload canónico de creación/edición de Torneo;
2. dejar de validar, escribir y reconstruir `paymentForPlayer` y `settings.paymentPerPlayer`;
3. actualizar configuración deportiva anidada mediante campos puntuales, sin reescribir ni eliminar
   el campo histórico `settings.paymentPerPlayer`;
4. omitir campos económicos al crear nuevas inscripciones y equipos;
5. dejar de copiar economía desde una inscripción al equipo aceptado;
6. reducir la actualización directa de roster a `playerIds`, `teamMembersCount` y `updatedAt`;
7. reducir en paralelo el allowlist de Rules a esos campos deportivos;
8. retirar argumentos, cálculos y escrituras económicas de `reviewTournamentRegistration`;
9. retirar UI, readers, view-models, tipos productivos y gates económicos;
10. dejar de producir alertas económicas y reconciliar las activas conforme a §8;
11. conservar las ramas deportivas de triggers, alertas y servicios compartidos;
12. convertir `updateTournamentRegistrationPayment` en tombstone conforme a E3-10-D01=A;
13. demostrar que ninguna operación del corte crea o modifica raíces de Pago.

Estos cambios forman un único retiro coherente: no alcanza con ocultar UI si persisten writers,
Rules, alertas o contratos económicos, ni con retirar un callable si el roster continúa recalculando
economía.

## 5. Contratos de callables mixtos

### 5.1 Campos retirados por contrato

| Callable | Campos económicos retirados en request |
| --- | --- |
| `createTournament` | `paymentForPlayer`, `settings.paymentPerPlayer` |
| `editTournament` | `paymentForPlayer`, `settings.paymentPerPlayer` |
| `reviewTournamentRegistration` | `paymentStatus`, `paidAmountInput` |

`requestTournamentRegistration` no posee hoy un campo económico de entrada. Continúa como callable
deportivo, pero debe dejar de generar campos económicos en su resultado persistido.

### 5.2 Regla de presencia aprobada

Bajo E3-10-D02=A:

- **campo ausente:** el request continúa por su recorrido deportivo normal;
- **campo presente con `null`:** se rechaza;
- **campo presente con cero (`0`):** se rechaza;
- **campo presente con cualquier otro número, string, booleano, objeto o array:** se rechaza;
- **propiedad propia presente con `undefined` en una invocación interna o prueba:** se rechaza, aunque
  normalmente no sobreviva a la serialización callable;
- para `settings.paymentPerPlayer`, sólo cuenta la presencia propia de la clave anidada; la ausencia
  de `settings` o un `settings` sin esa clave no activa el rechazo por economía;
- varios campos retirados se informan juntos en orden estable.

La detección ocurre después de autenticación y autorización aplicables y antes de cualquier
transacción, escritura, emisión de evento o efecto deportivo. El request completo falla de manera
atómica: no se crea o edita parcialmente un Torneo y no se acepta/rechaza parcialmente una
inscripción.

El rechazo exacto es:

```text
Firebase code: failed-precondition
message: La gestión económica de Torneos fue retirada
details.code: TOURNAMENT_ECONOMY_RETIRED
details.fields: rutas económicas presentes, sin duplicados y en el orden canónico de §5.1
```

Para `createTournament` y `editTournament`, el orden canónico es `paymentForPlayer`,
`settings.paymentPerPlayer`. Para `reviewTournamentRegistration`, es `paymentStatus`,
`paidAmountInput`. Los requests deportivos nuevos que omiten todos los campos retirados continúan con
el contrato deportivo vigente.

### 5.3 Precedencia exacta de validaciones

La precedencia aprobada impide efectos parciales y evita usar el error de retiro como oráculo:

#### `createTournament`

1. Cuenta autenticada;
2. autorización global vigente para crear Torneo;
3. detección por presencia de campos económicos retirados y, si existe alguno, rechazo terminal de
   §5.2;
4. validaciones deportivas restantes;
5. escritura deportiva.

#### `editTournament`

1. Cuenta autenticada;
2. envelope válido y `tournamentId` string no vacío;
3. existencia del Torneo y autorización administrativa vigente sobre él;
4. detección por presencia de campos económicos retirados y, si existe alguno, rechazo terminal de
   §5.2;
5. validaciones deportivas restantes, incluido lifecycle editable;
6. escritura deportiva.

#### `reviewTournamentRegistration`

1. Cuenta autenticada;
2. autorización global vigente exigida por el callable;
3. campos localizadores mínimos: `registrationId` string no vacío y `source` ausente o dentro de
   `registration | team`;
4. existencia del registro y Torneo y autorización administrativa vigente sobre el Torneo;
5. detección por presencia de `paymentStatus` o `paidAmountInput` y, si existe alguno, rechazo
   terminal de §5.2;
6. validaciones deportivas restantes de `status`, source y lifecycle;
7. mutación deportiva y efectos deportivos posteriores.

Un error anterior conserva precedencia. Una vez alcanzada la detección económica, el rechazo de
§5.2 precede a errores deportivos posteriores y no se inicia transacción de escritura ni se emiten
eventos.

## 6. Tombstone de `updateTournamentRegistrationPayment`

Bajo E3-10-D01=A, el export se conserva temporalmente y:

1. exige autenticación;
2. conserva la autorización global administrativa vigente;
3. valida `registrationId` como string no vacío y `source` ausente o dentro de
   `registration | team`;
4. resuelve el registro, el Torneo y la autorización administrativa vigente sobre el Torneo;
5. para una solicitud válida y autorizada rechaza siempre con `failed-precondition`, mensaje neutro
   “La gestión económica de inscripciones de Torneo fue retirada” y
   `details.code = TOURNAMENT_REGISTRATION_PAYMENT_RETIRED`;
6. no valida ni interpreta `paidAmountToAdd`: ausente, `null`, cero o cualquier otro valor alcanzan
   el mismo error terminal después de autenticación, localización y autorización válidas;
7. nunca devuelve éxito;
8. no calcula ni lee importes históricos para decidir el resultado;
9. no escribe inscripción, equipo, Torneo, alerta, Pago ni otro recurso;
10. conserva prueba explícita de cero efectos.

Solicitudes no autenticadas, inválidas o no autorizadas conservan precedencia de sus errores
correspondientes y no usan el tombstone como oráculo de existencia o autorización.

La conservación aprobada no se atribuye a D5-044. Es una decisión específica de E3-10, motivada por
la incertidumbre sobre consumidores externos y por la necesidad de una señal estable para clientes
antiguos.

## 7. Efectos visibles aprobados

- crear o editar un Torneo ya no muestra ni acepta precio por jugador;
- el administrador deja de registrar o confirmar pagos en inscripción/equipo;
- desaparecen precio, total, pagado, saldo, badges y acciones económicas;
- pago deja de decidir readiness, contadores y habilitación visual de aceptación;
- las superficies no presentan la ausencia de economía como “gratis”, “pagado” o “sin deuda”;
- continúan roster, aceptación/rechazo y las acciones deportivas existentes;
- desaparecen de superficies activas las alertas económicas;
- las alertas deportivas continúan sin adquirir capacidad nueva.

## 8. Alertas históricas y reconciliación aprobada

El código futuro debe dejar de crear o reactivar
`group_tournament_team_payment_pending` tanto para inscripciones como para equipos. Los triggers
compartidos permanecen por sus responsabilidades deportivas.

Bajo E3-10-D03=A, un rollout autorizado ejecutará una reconciliación idempotente y acotada:

1. selecciona únicamente alertas cuyo `kind` sea exactamente
   `group_tournament_team_payment_pending` y cuyo estado sea activo;
2. cambia sólo `status` a `resolved` y el timestamp operativo `updatedAt`;
3. preserva `kind`, severidad, título, mensaje, link, resource, meta, dedupeKey, actorScope,
   `createdAt`, `expiresAt` y cualquier contenido histórico adicional;
4. una alerta ya resuelta produce no-op;
5. una repetición produce el mismo resultado;
6. no toca `group_accepted_in_tournament`, `group_rejected_from_tournament`,
   `group_tournament_team_missing_players` ni otros kinds deportivos;
7. registra conteos de candidatas, resueltas, ya resueltas, omitidas y fallidas;
8. recorre lotes en orden estable, registra en un manifiesto operativo el último cursor completado y
   permite reanudar desde él o reiniciar desde el comienzo sin duplicar efectos;
9. un fallo detiene nuevos lotes, conserva el manifiesto y no revierte lotes confirmados;
10. verifica después que no quedan alertas económicas activas y que las deportivas comparadas no
   cambiaron.

La reconciliación no borra alertas ni reinterpreta su contenido como Pago. Su ejecución requiere
autorización de rollout separada; esta ficha sólo define el resultado.

## 9. Preservación de datos históricos

No se propone migración, borrado, normalización, backfill ni copia a Pago de campos históricos en
`tournaments`, `tournamentRegistrations` o `tournamentTeams`.

La aceptación técnica debe comparar antes y después una proyección formada exclusivamente por los
campos económicos enumerados en §2.2 para cada documento histórico alcanzado. Esa proyección debe ser
idéntica, incluida la distinción entre campo ausente, `null`, cero y cada valor legacy.

La comparación no exige igualdad del documento completo. Una operación deportiva puede modificar
legítimamente, según su contrato vigente:

- `playerIds` y `teamMembersCount`;
- `status`, `acceptedTeamsCount` y demás estado deportivo autorizado;
- actores o timestamps deportivos y `updatedAt`;
- relaciones deportivas creadas por una aceptación válida.

Esos cambios no violan la preservación si la proyección económica histórica permanece idéntica. Para
documentos nuevos, el criterio inverso es ausencia de todos los campos económicos retirados.

La reconciliación de alertas posee su propia excepción explícita de §8: puede cambiar `status` y
`updatedAt` de la alerta económica derivada, preservando el resto de su contenido. No modifica los
campos económicos de Torneo, inscripción o equipo.

## 10. Compatibilidad y consumidores externos

La evidencia del repositorio permite inventariar consumidores internos, pero no demostrar ausencia
de aplicaciones antiguas, scripts o integraciones externas. Tampoco existe en esta definición una
ventana de telemetría cumplida.

Bajo E3-10-D01=A, D02=A y D05=A:

- el callable exclusivamente económico conserva tombstone estable;
- los callables mixtos conservan nombre y capacidad deportiva, pero los requests antiguos que
  incluyan campos económicos pasan a ser incompatibles y reciben rechazo completo;
- la incompatibilidad se documenta por callable, campo, error y condición de presencia;
- no se exige una búsqueda externa indefinida o exhaustiva imposible;
- antes del rollout se usa la evidencia disponible y se decide explícitamente aviso,
  compatibilidad temporal adicional o aceptación del riesgo residual;
- la ausencia de invocaciones internas no se presenta como prueba de ausencia externa.

La eliminación futura del tombstone requeriría evaluación y autorización posteriores. No queda
autorizada por E3-10 ni se asigna ahora a otra etapa.

## 11. Dependencias, bloqueos y alcance de regresión

### 11.1 Dependencias compartidas comprobadas

- `settings` combina configuración deportiva y el alias económico; su actualización debe ser
  granular para no borrar historia ni continuar reescribiendo economía;
- roster y derivados económicos comparten writer frontend y allowlist de Rules;
- aceptación/rechazo y economía comparten `reviewTournamentRegistration`;
- alertas deportivas y económicas comparten triggers y servicio;
- cards y perfil combinan readiness deportivo y económico;
- inscripción aceptada crea el equipo que alimenta el conteo de aceptados y el cierre de
  inscripciones.

### 11.2 Condiciones de entrada local y gates de rollout

Para comenzar la implementación local se exige únicamente:

1. paquete documental adoptado por `D5-057`; y
2. autorización separada de implementación, todavía no otorgada.

Dentro de la implementación local se realizan el inventario final de imports/callers y el diseño,
implementación y prueba con datos sintéticos del reconciliador. No son precondiciones externas.

Antes del rollout se exigen identificación del ambiente, inspección acotada de alertas activas y
resolución operativa para clientes antiguos bajo evidencia externa disponible.

La inspección de datos remotos, la ejecución de reconciliación y la resolución operativa sobre
consumidores externos son gates de rollout, no condiciones de entrada para implementar localmente.
La implementación local puede comenzar con repositorio y datos sintéticos una vez integrado el
paquete y otorgada autorización separada.

### 11.3 Regresión deportiva acotada

La regresión futura se limita a rutas modificadas y dependencias demostradas:

- crear y editar Torneo, incluyendo configuración deportiva compartida;
- abrir inscripciones después de crear/editar;
- solicitar inscripción;
- agregar/quitar jugadores en inscripción y equipo bajo las Rules ajustadas;
- aceptar/rechazar inscripción, crear/rechazar equipo y actualizar `acceptedTeamsCount`;
- cerrar inscripciones como dependencia inmediata del conteo de equipos aceptados;
- alertas de aceptación, rechazo y jugadores faltantes;
- lista/detalle administrativo y perfil de las inscripciones/equipos afectados.

No se exige como parte de E3-10 una revalidación integral de generación de grupos, fixture completo,
registro de resultados, standings, avance de fases, podio o finalización. Sólo se agregará una
regresión focal de alguno de esos consumidores si el diff de implementación toca su código
compartido o si una dependencia ejecutable demuestra impacto.

## 12. Decisiones funcionales aprobadas

Las cinco alternativas A fueron aprobadas por instrucción expresa y adoptadas por `D5-057`. La
adopción no autoriza implementación.

### E3-10-D01 — Compatibilidad del callable económico

- **A — Aprobada:** conservar `updateTournamentRegistrationPayment` como tombstone autenticado y
  autorizado, con error estable, cero efectos y retiro futuro sujeto a decisión posterior.
- **B — No adoptada:** desexportarlo en el mismo corte.
- **Estado:** `APROBADA — A`.

### E3-10-D02 — Campos económicos en callables mixtos

- **A — Aprobada:** rechazar atómicamente el request completo cuando cualquiera de los campos de
  §5 esté presente, incluidos `null`, cero y tipos inválidos; requests sin esos campos continúan por
  el recorrido deportivo.
- **B — No adoptada:** ignorar campos económicos y ejecutar el componente deportivo.
- **Estado:** `APROBADA — A`.

### E3-10-D03 — Alertas económicas históricas

- **A — Aprobada:** dejar de producirlas y reconciliar activas a `resolved` de forma idempotente
  durante rollout, preservando contenido y sin tocar alertas deportivas.
- **B — No adoptada:** dejar de producirlas sin reconciliación.
- **Estado:** `APROBADA — A`.

### E3-10-D04 — Cierre local y habilitación productiva

- **A — Aprobada:** adoptar para E3-10 una separación propia entre cierre técnico local integrado
  y habilitación productiva. El cierre local exige toda la evidencia técnica local de §13.1; UAT y
  rollout permanecen explícitamente obligatorios antes de habilitar el recorrido a usuarios. Esta
  decisión es propia y no adopta, reutiliza ni extiende D5-056.
- **B — No adoptada:** mantener un único cierre posterior a evidencia local, UAT y rollout.
- **Estado:** `APROBADA — A`.

### E3-10-D05 — Incertidumbre sobre consumidores externos

- **A — Aprobada:** conservar el tombstone, documentar incompatibilidades de callables mixtos y
  resolver el rollout con evidencia disponible más una decisión explícita de aviso, compatibilidad
  adicional acotada o aceptación de riesgo; no presumir ausencia ni exigir búsqueda indefinida.
- **B — No adoptada:** bloquear el rollout hasta demostrar exhaustivamente ausencia de todo
  consumidor externo.
- **Estado:** `APROBADA — A`.

## 13. Pruebas y aceptación futuras

Esta sección define evidencia futura; no registra ejecución actual.

### 13.1 Requisitos para implementar y aceptar técnicamente el alcance local

1. búsqueda estructural confirma ausencia de readers/writers económicos productivos fuera del
   tombstone y de fixtures históricos explícitos;
2. create/edit aceptan payload deportivo sin economía y rechazan atómicamente cada presencia
   económica conforme a D02;
3. request crea inscripción sin campos económicos;
4. edición de roster cambia sólo campos deportivos/timestamps autorizados y Rules rechaza intentos
   económicos;
5. aceptación/rechazo no lee, calcula, copia ni escribe economía;
6. equipo nuevo carece de campos económicos;
7. tombstone prueba autenticación, autorización, error estable y cero efectos;
8. triggers no crean/reactivan alertas económicas y conservan las deportivas;
9. UI afectada no presenta economía ni la describe como gratis/pagada;
10. operaciones deportivas focales comparan proyección económica histórica antes/después y permiten
    los cambios deportivos legítimos de §9;
11. snapshots de raíces E3 de Pago demuestran cero creación, modificación o eliminación;
12. typecheck, build, lint contra baseline y suites focales aplicables aprueban;
13. la regresión deportiva permanece dentro de §11.3 salvo dependencia nueva demostrada por el diff.

Para comenzar esta implementación local no se requiere acceso a Firebase remoto, inspección de datos
remotos, ejecución real de reconciliación ni resolución definitiva sobre consumidores externos. El
reconciliador y la compatibilidad se implementan y prueban localmente con datos sintéticos; su
aplicación a un ambiente pertenece a §13.3.

### 13.2 UAT humana

La UAT debe comprobar, con actores autorizados:

1. creación y edición de Torneo sin precio;
2. solicitud y edición de roster sin importes ni estados económicos;
3. aceptación y rechazo mediante reglas deportivas visibles conservadas;
4. ausencia de badges, acciones, contadores y alertas económicas;
5. ausencia de mensajes “gratis”, “pagado” o equivalentes;
6. continuidad de las acciones deportivas afectadas enumeradas en §11.3.

La UAT no se reemplaza por ausencia de navegación, pruebas automatizadas o aprobación documental.

### 13.3 Rollout y habilitación productiva

Un rollout futuro autorizado, separado de la implementación local, debe:

1. identificar ambiente y versiones objetivo;
2. desplegar coordinadamente frontend, Functions y Rules necesarios;
3. comprobar que el tombstone remoto está presente y rechaza sin efectos, si D01=A;
4. ejecutar y verificar la reconciliación de alertas, si D03=A;
5. confirmar que no se crean campos o alertas económicas nuevas;
6. comprobar que datos históricos de Torneo/inscripción/equipo permanecen intactos;
7. revisar la evidencia disponible de clientes antiguos y registrar expresamente aviso,
   compatibilidad adicional acotada o aceptación del riesgo bajo D05, sin exigir búsqueda externa
   indefinida;
8. ejecutar smoke/UAT autorizado antes de habilitar o rehabilitar el recorrido a usuarios;
9. registrar rollback que no reactive writers económicos ni convierta historia en Pago.

Bajo D04=A, aunque llegue a cerrarse el alcance técnico local, UAT y rollout continúan como
requisitos explícitos de habilitación productiva. No se afirmará retiro efectivo desplegado antes de
su cumplimiento.

## 14. Gate residual de Etapa 3

El corte completo cubriría el retiro económico residual de:

- inscripciones de Torneo;
- equipos de Torneo;
- configuración económica de Torneo que alimenta ambas superficies;
- sus UI, readers, writers, Rules, alertas, gates y contratos.

La inclusión de la configuración de Torneo evita que una fuente económica aguas arriba continúe
generando importes en inscripciones/equipos. No constituye un rediseño de Torneos.

E3-10 no cierra por sí solo Etapa 3. Aun después de una implementación local satisfactoria deberán
contrastarse los criterios vigentes, incluidos:

- UAT y rollout propios de E3-10;
- UAT humana y retiro remoto verificado de `onMatchClose` pendientes de E3-09;
- salida consolidada de Etapa 3 y ausencia de doble autoridad;
- contratos, Rules, observabilidad, trazabilidad, baseline y demás línea transversal aplicable.

No se presume que retirar economía de Torneos baste para cerrar Etapa 3 ni se presenta D5-056 como
excepción transferible.

## 15. Exclusiones

E3-10 no propone:

- asociar Torneo, inscripción o equipo con Pago;
- crear obligaciones, conceptos, ocurrencias, Recepciones, ingresos o movimientos;
- migrar, borrar o reinterpretar economía histórica;
- modificar capacidades o permisos de Pago;
- rediseñar Torneo, inscripción, equipo, fixture, standings o resultado;
- crear proyección pública de Torneos o adelantar Etapa 4;
- corregir gaps deportivos no necesarios para el retiro;
- retirar triggers compartidos completos;
- eliminar el tombstone futuro sin evaluación separada;
- modificar D5-044, D5-056 u otra normativa;
- autorizar implementación por la sola adopción documental.

## Checkpoint de definición

`ADOPTADA POR D5-057 — LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`
