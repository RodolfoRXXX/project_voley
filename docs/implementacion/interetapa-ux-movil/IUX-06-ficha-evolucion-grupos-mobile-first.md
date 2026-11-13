# IUX-06 — Evolución de Grupos, Explorar e Integrantes

## Estado

- **Incremento:** `IUX-06`.
- **Estado documental:** `DEFINIDO — IMPLEMENTACIÓN NO AUTORIZADA EN ESTA FICHA`.
- **Base revisada:** `dev@9d3361106193a03d6b55a547d8e331b98f187034`.
- **Decisión de Documento 5:** `D5-069`.
- **Primer corte recomendado:** `IUX-06A`.

| Corte | Estado | Autorización requerida |
| --- | --- | --- |
| IUX-06A — Deportes, publicación y Explorar grupos | **LISTO PARA IMPLEMENTAR** | Autorización posterior y separada |
| IUX-06B — Mis grupos, solicitudes e historial | **LISTO PARA IMPLEMENTAR** | Autorización posterior y separada |
| IUX-06C1 — Integrantes y Tu membresía | **LISTO PARA IMPLEMENTAR** | Autorización posterior y separada |
| IUX-06C2 — Total exacto y búsqueda completa | **P01 INTEGRADO EN DEV; P02 CERRADO LOCALMENTE Y UAT APROBADA** | Revisar los commits P02 antes de integrar |
| IUX-06D — Reorganización de Economía | **LISTO PARA IMPLEMENTAR** | Autorización posterior y separada |

Esta ficha autoriza sólo la definición. No autoriza cambios de código, configuración, índices,
Rules, datos, migraciones, despliegues ni habilitación productiva. Los permisos actuales, la
separación entre Owner, Membresía y capabilities, y los gates productivos de IUX-02/E3 permanecen.

## 1. Objetivo y orden recomendado

IUX-06 reduce fricción en cuatro recorridos relacionados sin convertirlos en un único despliegue:

1. ampliar el catálogo deportivo e introducir publicación explícita para **Explorar grupos**;
2. ordenar **Mis grupos** en vínculos actuales, solicitudes propias e historia finalizada;
3. presentar la relación del Owner y el roster en una única superficie de **Integrantes**;
4. separar en Economía la configuración, la deuda, la revisión y la historia.

`IUX-06A` es el primer corte recomendado porque establece el vocabulario deportivo y la distinción
entre Grupo activo y Grupo publicado que consumen los recorridos posteriores. A, B, C1 y D pueden
implementarse sólo con una autorización posterior por corte o una autorización posterior que los
enumere expresamente. P01 ya fue integrado y P02 queda cerrado y versionado localmente como corte
técnico independiente; su integración requiere la autorización posterior correspondiente.

## 2. Evidencia vigente y límites normativos

La revisión del código y de las fichas adoptadas encontró estas condiciones de partida:

- `groups/domain/group.js` limita `GROUP_SPORTS` a `voleibol`, valida esquema cerrado y no contiene
  estado de publicación;
- `GroupActionsMenu` sólo expone editar nombre, archivar y eliminar;
- la ruta pública `/groups` sigue siendo `PublicLegacyGroupsPage`, basada en `visibility:"public"`,
  y no acredita el catálogo canónico, la publicación Owner ni las exclusiones de Explorar;
- el acceso conocido `/join/groups/{groupId}` ya conserva el enlace estable y la solicitud propia
  ya puede cancelarse, pero hoy el flujo exige Persona y no explica desde todos los estados cómo
  completar la ficha;
- `Mis grupos` ya compone ownership y Membresías, deduplica por `groupId` y carga historia de forma
  diferida, pero usa páginas de 20, no presenta solicitudes propias como sección global y mezcla en
  la historia estados distintos del recorte solicitado;
- `/members` ya reúne `Tu Membresía`, integrantes activos y solicitudes recibidas, pero los muestra
  como bloques separados; el Owner sin Membresía requiere una explicación especial;
- el roster Owner pagina y revalida cada Membresía, sus guards y su Período, pero no publica total
  exacto ni búsqueda completa; IUX-04 dejó ese total expresamente diferido;
- Economía usa `Deudas | Pagos informados | Historial`; Conceptos está plegado dentro de Deudas,
  movimientos de ingresos aparecen en Deudas y la historia no concentra aún todos los elementos
  acordados.

Son aplicables las decisiones vigentes de E2 sobre Grupo/ownership, Membresía, Solicitud de ingreso,
reactivación, roster e historia; las de E3 sobre conceptos, obligaciones, avisos, recepciones y
movimientos; y D5-040: ser Owner no crea una Membresía. IUX-03, IUX-04 e IUX-05 se conservan salvo
las presentaciones que esta ficha modifica de manera expresa. Ninguna etiqueta de UI concede
autorización y todo destino revalida su relación o capability en backend.

## 3. IUX-06A — Deportes, publicación y Explorar grupos

### 3.1 Alcance funcional

El catálogo cerrado visible queda compuesto por:

`Vóley`, `Fútbol`, `Básquet`, `Handball`, `Hockey`, `Rugby`, `Tenis`, `Pádel` y `Otro`.

Los valores canónicos son `voleibol`, `futbol`, `basquet`, `handball`, `hockey`, `rugby`, `tenis`,
`padel` y `otro`; tildes y mayúsculas pertenecen a la presentación. `Otro` es una categoría
genérica: no habilita texto libre, subtipo ni nombre de deporte adicional. En este corte el deporte
clasifica y se muestra, pero no cambia reglas, permisos, navegación, Temporadas, Membresías,
solicitudes, Pagos ni comportamiento deportivo.

Todo Grupo nuevo comienza **Solo por invitación**. Publicación y estado operativo son dimensiones
distintas:

- sólo el Owner puede **Publicar en Explorar** o **Quitar de Explorar**;
- la acción vive en el menú de tres puntos del Grupo y muestra estado, progreso, resultado y retry;
- sólo un Grupo activo y publicado puede aparecer en Explorar;
- archivar o dejar de estar activo impide aparecer aunque exista una marca anterior;
- quitar de Explorar no cambia el enlace, no cancela ni resuelve solicitudes existentes y no altera
  Membresías;
- volver a publicar reutiliza la identidad del Grupo y no crea otra invitación.

**Explorar grupos** muestra exclusivamente Grupos activos publicados que la Cuenta autenticada no
administra y no integra actualmente. Las exclusiones se calculan con fuentes autoritativas; una
cobertura parcial o fallida no permite mostrar como candidato un Grupo cuya relación no pudo
descartarse. No se deriva pertenencia desde ownership ni desde una capability.

Una Cuenta sin Persona puede explorar y abrir el detalle del candidato. La solicitud queda
deshabilitada y se explica que debe completar su ficha, con enlace accesible a `/profile/person`.
El acceso por `/join/groups/{groupId}` conserva su función aunque el Grupo no esté publicado y, si
falta Persona, ofrece la misma explicación y enlace. Una Cuenta con Persona usa el flujo canónico
de solicitud, incluida la consulta y cancelación de una solicitud pendiente.

No se define acceso anónimo nuevo, ranking, recomendación, distancia, texto libre, filtros por
subtipo, invitación a usuarios de la plataforma ni cambio de comportamiento según deporte. El
catálogo público legacy asignado por D5-044 no se retira ni se convierte silenciosamente en la
fuente de Explorar; cualquier coordinación o retiro requiere su gate y decisión correspondientes.

### 3.2 Contratos e invariantes mínimos

- El catálogo se valida en backend y frontend contra el mismo conjunto funcional; el backend es
  autoritativo.
- La creación ignora cualquier intento de iniciar publicado y persiste el equivalente canónico de
  `SOLO_POR_INVITACION`.
- Publicar/despublicar exige sesión, Cuenta vigente, ownership actual y Grupo activo; es idempotente
  para la intención equivalente y no acepta propiedades adicionales.
- El lector de Explorar entrega DTO mínimo de identidad, nombre, deporte y estado necesario para
  solicitar; no expone ownerId, Persona, guards ni datos administrativos.
- La consulta y sus cursores quedan ligados a Cuenta, filtros y orden estable. No se deriva un total
  desde una página.
- La estrategia física, compatibilidad de documentos anteriores y cualquier índice o migración se
  justifican durante implementación antes de modificar persistencia. No se reutiliza sin análisis
  la autoridad legacy `visibility:"public"`.

### 3.3 Criterios de aceptación

1. Al crear un Grupo se puede elegir exactamente uno de los nueve valores y `Otro` no muestra campo
   libre.
2. Cada deporte se presenta con su etiqueta acordada y produce el mismo comportamiento funcional.
3. Todo Grupo nuevo queda Solo por invitación aunque el cliente intente enviarlo publicado.
4. El Owner de un Grupo activo puede publicar y quitar de Explorar desde el menú de tres puntos;
   otra Cuenta no puede hacerlo mediante UI ni llamada directa.
5. Despublicar retira el Grupo de Explorar sin cambiar su enlace ni cancelar solicitudes pendientes.
6. Explorar no muestra Grupos archivados, no publicados, administrados o integrados por la Cuenta.
7. Una falla al acreditar exclusiones no se presenta como “sin relación” ni filtra datos ajenos por
   prueba y error.
8. Una Cuenta sin Persona ve candidatos, tiene la solicitud deshabilitada y puede ir a completar la
   ficha; lo mismo ocurre al entrar por enlace.
9. Una Cuenta con Persona conserva creación, consulta, cancelación y recuperación de solicitudes.
10. Deep-links existentes continúan funcionando aunque el Grupo esté Solo por invitación.

### 3.4 UAT mínima

- Crear un Grupo por cada deporte y confirmar etiquetas, ausencia de texto libre y neutralidad de
  comportamiento.
- Probar publicación, repetición idempotente, despublicación y republicación como Owner; repetir la
  llamada como no Owner y verificar rechazo no enumerable.
- Usar cuentas Owner, integrante, ajena con Persona y ajena sin Persona; comprobar exclusiones y el
  enlace a ficha.
- Mantener una solicitud pendiente, despublicar, entrar por el enlace y confirmar que la solicitud
  y su cancelación siguen disponibles.
- Archivar un Grupo publicado y comprobar que desaparece de Explorar sin perder identidad histórica.
- Verificar 360×800, 390×844, 768 px, escritorio, teclado, foco, lector de pantalla y zoom 200 %.

## 4. IUX-06B — Mis grupos, solicitudes e historial

### 4.1 Composición

`Mis grupos` presenta tres secciones independientes:

1. **Tus grupos:** Grupos administrados o integrados actualmente, deduplicados por `groupId`; una
   tarjeta puede conservar simultáneamente `Administrás` e `Integrás`.
2. **Solicitudes pendientes:** solicitudes propias pendientes, en tarjetas compactas con Grupo,
   fecha/estado y acción **Cancelar solicitud** con confirmación y recuperación autoritativa.
3. **Historial de membresías:** disclosure contraído inicialmente que carga sólo al abrir y contiene
   Membresías finalizadas.

Cada sección pagina de manera independiente hasta cinco tarjetas, de la más reciente a la más
antigua según su hecho canónico: creación/actualización de relación vigente para Tus grupos,
creación de la solicitud para pendientes y finalización de la Membresía para historia. Los empates
usan ID canónico estable. Sólo aparece **Cargar más** cuando la fuente acredita continuación; una
página vacía con cursor no autoriza un vacío definitivo.

El historial muestra Grupo, Temporada, inicio y fin. Hay una tarjeta por Membresía finalizada, no
una tarjeta por Período. Si la misma Membresía fue reactivada, las fechas visibles son las del último
Período de vigencia y se identifican como tales; los Períodos anteriores permanecen historia del
mismo vínculo, no tarjetas duplicadas. Una renovación intertemporada conserva otra Membresía y por
eso puede producir otra tarjeta.

### 4.2 Criterios de aceptación

1. Un Grupo acreditado por ownership y Membresía aparece una sola vez con ambas relaciones.
2. Fallar una fuente conserva los resultados de las otras, muestra cobertura parcial y permite
   reintento sin afirmar vacío global.
3. Cada sección entrega como máximo cinco tarjetas por página y mantiene orden estable descendente.
4. Una solicitud pendiente puede cancelarse con confirmación, single-flight, retry y reconsulta de
   resultado; al confirmarse deja la sección sin borrar su historia.
5. El historial no consulta mientras está cerrado y sólo muestra Membresías finalizadas.
6. Cada tarjeta histórica muestra Grupo, Temporada e inicio/fin; una reactivación usa el último
   Período y lo explica sin duplicar la Membresía.
7. `Cargar más` no aparece sin continuación acreditada y nunca repite una tarjeta ya entregada.
8. Cambio de Cuenta o logout invalida items, cursores y respuestas tardías.

### 4.3 UAT mínima

- Cuenta Owner sin Persona, integrante puro, doble relación y Cuenta sin relaciones.
- Más de cinco Grupos, más de cinco solicitudes y más de cinco Membresías finalizadas; verificar
  paginación, orden, empates, deduplicación y foco después de Cargar más.
- Solicitud pendiente normal, cancelación exitosa, respuesta perdida y solicitud resuelta en
  concurrencia.
- Membresía finalizada con un Período, reactivada con varios Períodos y renovada en otra Temporada.
- Falla independiente de cada fuente, página vacía con cursor y cambio de Cuenta durante carga.

## 5. IUX-06C1 — Integrantes y Tu membresía

### 5.1 Composición

En la superficie Owner de **Integrantes**, `Tu Membresía` deja de competir como caja separada y se
integra al mismo listado de filas desplegables. Cada fila presenta nombre, cargo descriptivo y las
acciones que el backend autoriza para ese sujeto; expandir una fila no concede ni precarga permisos
de otra.

El Owner ocupa siempre la primera posición visual:

- si tiene Membresía vigente, su fila representa esa Membresía y se deduplica contra el roster;
- si todavía no integra el Grupo, aparece una fila explicativa no contada como Membresía;
- si falta Persona, la explicación ofrece acceso a `/profile/person`;
- si existe Persona pero falta Temporada o Membresía, se conserva el flujo Owner vigente y se
  explica la precondición correspondiente.

Las demás filas conservan el orden canónico del roster y sus acciones vigentes, incluidas edición
de cargo y finalización cuando correspondan. En móvil las acciones se apilan, mantienen 44×44 px,
no generan overflow y la apertura/cierre conserva foco y nombre accesible. La ruta member-safe
`Mi participación`, sus permisos y sus enlaces directos no se eliminan por esta reorganización.

### 5.2 Criterios de aceptación

1. El Owner aparece primero con Membresía una sola vez o, sin ella, como explicación no contabilizada.
2. Un Owner sin Persona recibe explicación y enlace a su ficha, sin crear una Membresía implícita.
3. Nombre, cargo y acciones autorizadas están dentro de una fila desplegable operable por teclado.
4. Un tercero nunca ve acciones Owner y una revocación durante la interacción se resuelve mediante
   revalidación backend y limpieza de la intención.
5. Edición de cargo y finalización conservan confirmación, idempotencia/recuperación y actualización
   del roster.
6. La paginación no vuelve a insertar al Owner ni pierde integrantes cuando la primera fila visual
   es explicativa.
7. En móvil las acciones quedan apiladas; en escritorio pueden distribuirse sin controles anidados.

### 5.3 UAT mínima

- Owner con Persona y Membresía, con Persona sin Membresía, sin Persona y sin Temporada abierta.
- Owner que también aparece en una página posterior del roster: confirmar deduplicación y primera
  posición.
- Integrante común con cargo, sin cargo, identidad no disponible y acción finalizada en concurrencia.
- Navegación por teclado, Escape, retorno de foco, lector de pantalla, 360/390 px y zoom 200 %.
- Deep-link a Mi participación y permisos económicos antes y después de la reorganización.

## 6. IUX-06C2 — Total exacto y búsqueda completa

### 6.1 Definición funcional

**Integrantes activos** es el total exacto de Membresías activas y canónicamente válidas del Grupo
activo en su Temporada actualmente abierta. Excluye Owner sin Membresía, solicitudes, Membresías
finalizadas, otras Temporadas y filas incompatibles. Nunca se muestra longitud de la primera página,
aproximación, límite o cero no acreditado como total.

La búsqueda comienza desde tres caracteres y compara nombres sin distinguir mayúsculas, minúsculas
ni tildes. Opera sobre todo el padrón que la Cuenta está autorizada a consultar, no sólo sobre items
cargados o visibles. Menos de tres caracteres no inicia búsqueda. El resultado conserva las mismas
reglas de autorización, validez y acciones del roster. Invitar a usuarios de la plataforma queda
fuera de IUX-06.

### 6.2 Decisiones técnicas P01 y P02

#### 6.2.1 P01 — contador derivado exacto

Se adopta un contador materializado por Grupo y Temporada, no `count()` directo ni el tamaño de una
página. `activeRosterSummaries` conserva generación, estado `BUILDING | READY | INCOMPATIBLE` y
total; `activeRosterContributions` acredita una contribución idempotente por Membresía y generación.
Resumen expone el conteo exacto cuando la Temporada abierta coincide y el resumen está `READY`.
La ausencia confirmada de Temporada abierta se informa como `NO_OPEN_SEASON` y se presenta como
**0 integrantes**, sin crear un resumen ficticio. `BUILDING`, ausencia de cobertura, error o
incompatibilidad se presentan como **Total no disponible**.

Las altas Owner, aprobaciones que crean, reactivan o renuevan, salidas y finalizaciones Owner o
administrativas actualizan contribución y resumen en la misma transacción que cambia la Membresía.
Crear o borrar la contribución condiciona el incremento o decremento, por lo que reintentos y
operaciones concurrentes aplican la variación una sola vez. El Owner no recibe tratamiento especial:
cuenta únicamente cuando posee una Membresía activa que supera la validación canónica.

La carga inicial y la reconciliación abren una generación `BUILDING`, recorren el padrón activo por
páginas y revalidan cada candidato dentro de transacción. Los writers concurrentes escriben contra
esa misma generación; la contribución determinista evita pérdidas y doble conteo. Sólo al completar
el recorrido se publica `READY`. Una fila activa incompatible deja `INCOMPATIBLE` y ningún total
parcial queda visible. La lectura y la reconciliación son callables backend exclusivos del Owner;
las colecciones derivadas no admiten acceso directo desde cliente.

Estado: **cerrado técnicamente en local y UAT aprobada; sin deploy ni habilitación productiva**.

La aceptación UAT acredita los tres resultados públicos finales: `NO_OPEN_SEASON` con `total: 0`
cuando la ausencia de Temporada abierta fue confirmada; `READY` con cero o con el total exacto de la
Temporada abierta; y `UNAVAILABLE` o error cuando cobertura, consistencia, autorización o lectura no
permiten determinar el total. Resumen muestra «0 integrantes» para los dos ceros acreditados y
reserva «Total no disponible» más «Reintentar» para el último caso. La evidencia automatizada fija
la secuencia del mismo Grupo: sin Temporada `0` → Temporada vacía `0` → alta `1` → finalización `0`;
también compara el contador con el recorrido canónico multipágina y cubre datos anteriores,
reintentos, concurrencia, reactivación, renovación, salidas y cambio de Temporada.

#### 6.2.2 P02 — proyección privada de búsqueda completa

Se adopta `activeRosterSearchEntries`, una fila privada y determinista por Membresía activa, y
`activeRosterSearchSummaries`, cobertura generacional `BUILDING | READY | INCOMPATIBLE` por Grupo y
Temporada. Cada fila conserva sólo el identificador de Membresía/Persona, la presentación mínima de
nombre y apellido, el ordinal de activación, una clave de orden normalizada y el conjunto deduplicado
de prefijos desde tres caracteres de **cada palabra**. La normalización aplica NFD, elimina marcas
diacríticas y compara en minúsculas; así cubre palabras intermedias y nombres o apellidos compuestos.
Una misma fila aparece una sola vez aunque dos o más palabras satisfagan el prefijo.

`listActiveGroupMembersForOwnedGroup` acepta `search` como una palabra de al menos tres caracteres.
El backend vuelve a acreditar Cuenta, ownership, Temporada abierta, Membresía activa canónica y
Persona antes de devolver la proyección mínima ya autorizada. El cursor de búsqueda queda ligado a
Cuenta, Grupo, Temporada, término normalizado, orden `sortName,__name__` y versión; no se mezcla con
el cursor habitual por `fechaIngreso`. Las colecciones de proyección rechazan acceso directo por
Rules. `Sin resultados` sólo es válido tras una página `READY`; cobertura incompatible, error o
dependencia no disponible conserva indisponibilidad y reintento, nunca acredita vacío.

La primera búsqueda sobre datos anteriores abre `BUILDING`, recorre todas las Membresías activas por
páginas, revalida cada fila transaccionalmente y publica `READY` al terminar. Altas Owner,
aprobaciones, reactivaciones y renovaciones crean o reemplazan la fila dentro de la misma transacción
canónica; salidas y finalizaciones la eliminan en esa transacción. La generación compartida evita
perder o duplicar altas y bajas concurrentes con la carga inicial. El sistema vigente no ofrece un
comando para editar nombre/apellido de Persona: `ensureMyPerson` sólo permite creación inicial. Si se
autoriza un writer nominal futuro, deberá actualizar todas sus filas activas en el mismo corte antes
de habilitarse; P02 no presupone escrituras directas de Persona.

Integrantes consulta todo el padrón desde tres caracteres, pagina resultados sin duplicados y conserva
las acciones actuales sobre cada Membresía. Dos caracteres no disparan backend. Al limpiar el término
se restaura inmediatamente el padrón habitual ya cargado y su cursor independiente.

Estado: **cerrado y versionado localmente en rama P02; Emulator y UAT aprobados; sin integración,
deploy ni habilitación productiva**.

La aprobación UAT incluye los tres ajustes finales solicitados por el usuario: al intentar aprobar
una Solicitud sin Temporada abierta se conserva «Abrí una Temporada antes de aprobar.», la Solicitud
permanece pendiente y aparece el enlace «Ir a Temporada» hacia la ruta canónica del mismo Grupo; el
campo de búsqueda permanece montado y con foco al pasar de `par` a `pari` y `parix`, sin permitir que
una respuesta tardía sustituya el término vigente y restaurando el padrón habitual al bajar de tres
caracteres; y un Owner con Membresía activa válida aparece una sola vez en los resultados.

La secuencia específica Paredes/Paris (`par` devuelve ambos, `pari` sólo Paris y `parix` acredita
«Sin resultados») corresponde a la regresión aislada en Emulator. Sobre UAT se verificó, mediante la
consulta backend autorizada, que Jorge Paredes tenía una Membresía activa en la Temporada abierta,
que su ausencia inicial pertenecía a una proyección aún no inicializada y que, una vez `READY`, las
búsquedas `jor` y `par` devolvían esa Membresía exactamente una vez. La inicialización afectó sólo la
proyección derivada; no modificó datos canónicos de Membresías, Temporadas ni Solicitudes.

### 6.3 Criterios de aceptación y UAT condicionados

1. El total coincide con todas las Membresías válidas de la Temporada activa bajo altas,
   finalizaciones, reactivaciones, renovación y cambio/cierre de Temporada.
2. Una incompatibilidad o cobertura incompleta produce estado no disponible/retry, nunca un número
   parcial.
3. La búsqueda de tres o más caracteres encuentra coincidencias fuera de la primera página y trata
   igual `ÁLVARO`, `Alvaro` y `álvaro`.
4. Dos caracteres no disparan consulta y una búsqueda vacía restaura el roster paginado.
5. Cuenta no autorizada, cambio de Grupo o revocación no conserva resultados anteriores.

La UAT deberá usar padrón multipágina, nombres con tildes/caso, homónimos, cambios concurrentes de
Membresía y Temporada, y medir los presupuestos adoptados en P01/P02. Estos casos no sustituyen la
decisión técnica previa.

## 7. IUX-06D — Economía: Conceptos, Deudas, Pagos e Historial

### 7.1 Composición

Economía separa responsabilidades sin cambiar autoridad:

- **Conceptos:** alta, consulta, edición, desactivación y cobros específicos según permiso vigente;
- **Deudas:** generación y consulta de obligaciones, estados, detalle y registro permitido;
- **Pagos informados:** para el administrador, avisos pendientes primero y avisos resueltos debajo,
  con estados, acciones y paginación independientes;
- **Historial:** recepciones/ingresos registrados y sus movimientos de ingreso, con los detalles y
  acciones históricas ya autorizados.

Los avisos resueltos no se mezclan con los pendientes ni desaparecen por haber sido confirmados,
rechazados o resueltos administrativamente. Ingresos y movimientos dejan de ocupar Deudas y se
ubican en Historial. Cada bloque conserva carga, error, retry y cursor propios.

Las capabilities actuales siguen determinando qué destinos existen: `GROUP_TREASURY` no adquiere
escritura; `GROUP_PAYMENT_NOTICE_REVIEW` no registra pagos; `GROUP_DIRECT_PAYMENT_RECORD` no revisa
avisos; integrar el Grupo no concede acceso económico. El Owner conserva su cobertura vigente.
Los enlaces directos con `tab`, `deliveryId`, `paymentId`, receipt o movimiento se preservan o se
redirigen de forma determinista al nuevo destino, sin perder la identidad ni abrir una pestaña no
autorizada.

### 7.2 Criterios de aceptación

1. Conceptos y Deudas son destinos separados y no duplican formularios ni estado.
2. Pagos informados muestra pendientes antes que resueltos; cada lista tiene vacío, error, retry y
   paginación propios.
3. Resolver un aviso lo mueve al bloque resuelto después de reconsulta autoritativa y conserva su
   deep-link.
4. Historial contiene ingresos/recepciones registrados y movimientos; Deudas deja de montarlos.
5. Cada capability ve sólo destinos y acciones autorizados, incluso mediante URL manipulada.
6. Cambiar de Grupo invalida datos, cursores e identidades del Grupo anterior.
7. Los deep-links vigentes abren el elemento correcto o informan de forma no enumerable que ya no
   está disponible.

### 7.3 UAT mínima

- Owner y cada capability individual y combinada; revocación mientras una pestaña está abierta.
- Concepto activo/inactivo, obligación pendiente/saldada/anulada y registro permitido.
- Aviso pendiente, confirmado, rechazado y resuelto administrativamente; más de una página en ambos
  bloques y transición concurrente durante la consulta.
- Recepción informada, recepción administrativa, reversión y movimientos asociados en Historial.
- Abrir deep-links existentes y nuevos, usar Atrás/Adelante y cambiar de Grupo sin fuga de estado.
- Responsive, teclado, foco, lector de pantalla, zoom 200 % y ausencia de scroll horizontal doble.

## 8. Seguridad, consistencia y pruebas comunes

- Los lectores y comandos se exponen detrás de servicios/callables autorizados; el cliente no
  consulta colecciones para reconstruir permisos.
- Cuenta, Persona, ownership, Membresía y capability siguen siendo relaciones diferentes.
- Cursores incluyen scope, orden y versión suficientes para rechazar mezcla de Cuenta, Grupo,
  Temporada, filtro o consulta.
- Cobertura parcial se presenta como parcial; no acredita ausencia, total, exclusión ni búsqueda
  completa.
- Writes futuros requieren idempotencia, precondiciones y recuperación acordes a los patrones E2/E3.
- No se crean listeners, polling, notificaciones, roles, invitaciones a cuentas, ranking, métricas ni
  comportamiento por deporte en esta definición.

Cada corte autorizado deberá incluir unitarias de dominio/presentación, contratos exactos y errores,
Emulator con positivos/negativos de autorización, regresión de flujos existentes, typecheck/lint/build
focales y UAT humana del apartado correspondiente. Datos y proyectos remotos quedan fuera salvo una
autorización posterior explícita.

## 9. Checkpoint, rollback y condición de cierre

La implementación futura debe crear checkpoints por corte. El rollback de presentación no puede
eliminar datos ya publicados, solicitudes, Membresías, recibos ni movimientos; cualquier campo o
proyección nueva requiere compatibilidad y retiro definidos antes de adoptarse.

Un corte sólo podrá declararse cerrado con código versionado, pruebas proporcionadas, diff acotado,
UAT indicada y gates remotos/productivos explícitos. La mera existencia de una rama, ficha, campo o
pantalla no acredita implementación ni publicación.
