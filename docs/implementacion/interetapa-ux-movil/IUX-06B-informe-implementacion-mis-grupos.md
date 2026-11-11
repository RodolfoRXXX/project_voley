# IUX-06B — Informe de implementación local de Mis grupos

- Fecha de cierre: 2026-11-11.
- Base integrada de IUX-06A: `f244675eefcb1f443df98b2ac03d7c237165f625`.
- Rama: `feat/iux-06b-mis-grupos`.
- Alcance: sólo IUX-06B; IUX-06C1, C2 y D permanecen fuera.
- Estado: cierre técnico local y UAT humana acotada aprobada; sin merge, push ni despliegue.

## Resultado implementado

`Mis grupos` presenta, en orden, **Grupos actuales**, **Solicitudes pendientes** e **Historial**.
Los tres bloques distinguen carga, vacío y error. Cada avance muestra hasta cinco tarjetas y sólo
ofrece `Cargar más` cuando existe continuación acreditada.

**Grupos actuales** reutiliza la composición vigente de Grupos administrados y Membresías activas.
Deduplica por `groupId`; si la cuenta administra e integra el mismo Grupo conserva ambas relaciones
y el enlace administrativo. La lectura de ownership no depende de Persona, por lo que el Owner sin
ficha conserva sus Grupos. Los filtros son `Todos`, `Administro` e `Integro`.

**Solicitudes pendientes** usa el nuevo callable autorizado `listMyPendingGroupJoinRequests`. La
identidad se deriva de Auth y Persona; el backend filtra exclusivamente `personId` propio y estado
`pendiente`, ordena por creación descendente con ID como desempate, pagina de a cinco y sólo expone
ID de la Solicitud propia, ID/nombre del Grupo y fecha de creación. No depende de que el Grupo siga
publicado y no hace una llamada frontend por tarjeta. La cancelación reutiliza
`cancelMyGroupJoinRequest`: revalida titularidad y estado en transacción, refresca pendientes y
Grupos actuales, e informa el estado vigente si una decisión del Owner ganó la carrera.

**Historial** arranca cerrado y no consulta hasta expandirse. El lector propio ahora selecciona sólo
Membresías `finalizada`, ordenadas por `fechaEgreso` descendente e ID descendente. Muestra Grupo,
Temporada, inicio y fin acreditados. Para schemas anteriores usa las fechas canónicas de la raíz;
para una Membresía con Períodos usa el inicio y fin del último Período validado y muestra `Último
período` cuando hubo reactivación. No infiere fechas ausentes. Una renovación intertemporada sigue
siendo otra Membresía y otra tarjeta.

Se agregaron los índices mínimos para las consultas propias de Solicitudes pendientes e Historial.
Firestore Rules continúa deny-all para estas raíces: el acceso sigue exclusivamente en backend.

## Evidencia automatizada

La prueba focal usa identidades y fixtures descartables en `demo-sportexa-e0-02`, y limpia al
finalizar. No importa ni modifica los datos UAT persistentes.

| Escenario | Evidencia | Resultado |
| --- | --- | --- |
| Owner e integrante del mismo Grupo | lectores autorizados + composición real por `groupId` | PASS; una tarjeta y acceso administrativo |
| Owner sin Persona | `listOwnGroups` no exige Persona | PASS |
| Pendientes propias | siete Solicitudes, páginas 5 + 2 | PASS |
| Grupo no publicado | las Solicitudes siguen visibles sin consultar publicación | PASS |
| Cancelación | comando canónico y relectura del bloque | PASS |
| Aprobación concurrente | cancelación devuelve `DECISION_ALREADY_APPROVED`; sale de pendientes | PASS |
| Aprobación acreditada | la Membresía activa hace aparecer el Grupo en actuales | PASS |
| Aislamiento | otra Persona obtiene pendientes e historial vacíos | PASS |
| Historial | siete Membresías finalizadas, páginas 5 + 2, sin duplicados | PASS |
| Reactivación | una tarjeta y fechas del último Período | PASS |
| Empate de finalización | orden estable por ID canónico descendente | PASS |

Comando focal reproducible:

```powershell
$env:IUX_06B_FOCAL='1'
npm --prefix volley-ranking-system/functions run test:infra:emulators
Remove-Item Env:IUX_06B_FOCAL
```

| Control | Resultado |
| --- | --- |
| Unitarias completas | PASS — 465/465 |
| Emulator focal IUX-06B | PASS — 1/1 |
| TypeScript | PASS |
| Lint focal | PASS |
| Functions syntax | PASS — 513/513 archivos JavaScript |
| Build Next.js | PASS; incluye `/dashboard/groups` |
| `git diff --check` | PASS |

## Cobertura UAT y pendientes humanos

La aceptación humana cubre: aparición y cancelación de una Solicitud propia; actualización de
Novedades e Integrantes sin recarga manual; y el mismo Grupo UAT de fútbol Owner-integrante visible
una sola vez en `Todos`, en `Administro` y en `Integro`, conservando el acceso administrativo. La
evidencia automatizada, separada de esa aceptación, cubre autorización y aislamiento, carrera de
cancelación/aprobación, paginación estable 5 + 2, reactivación y fechas del último período, empate de
finalización, carga lazy del Historial, estados carga/vacío/error y estructura responsive sin una
consulta por tarjeta.

Siguen pendientes de verificación humana: expandir el Historial real y comprobar sus fechas,
`Último período` y `Cargar más`; la aprobación concurrente observada en navegador; y la revisión
visual completa en Android 360/390 px y escritorio de foco, legibilidad, una y varias tarjetas,
ausencia de desborde horizontal y doble scroll. Las pruebas estructurales y el build cubren reglas
responsive y composición, pero no sustituyen esas comprobaciones visuales. Recorridos pendientes:

1. Repetir con un Owner sin Persona en navegador, aunque el lector y la regresión ya acreditan que
   conserva su Grupo administrado y no lo incluyen en `Integro` sin Membresía.
2. Con más de cinco Grupos actuales, verificar cinco tarjetas iniciales, `Cargar más grupos
   actuales`, filtros y ausencia de duplicados.
3. Confirmar visualmente que una Solicitud de un Grupo despublicado sigue visible mientras
   permanezca pendiente.
4. Resolver otra Solicitud desde la cuenta Owner mientras la candidata conserva la pantalla
   abierta. Intentar cancelar y comprobar el aviso de estado vigente. Si fue aprobada, confirmar que
   sale de pendientes y el Grupo aparece en actuales cuando existe la Membresía.
5. Expandir Historial: comprobar que antes del clic no hay carga; verificar cinco tarjetas,
   `Cargar más`, Grupo, Temporada, inicio/fin y `Último período` en una reactivación.
6. Cambiar de cuenta y recargar para comprobar aislamiento y descarte de respuestas tardías.
7. En escritorio y Android a 360/390 px, revisar foco visible, estados carga/vacío/error,
   legibilidad, ausencia de desborde horizontal y ausencia de doble scroll.

No queda un fallo funcional automatizado conocido. No se implementaron Integrantes/Tu membresía,
conteo o búsqueda de padrón, Conceptos ni reorganización de Economía (IUX-06C1, C2 y D).

## Ajustes posteriores por hallazgos UAT — 2026-11-11

### Solicitudes pendientes no visible

La solicitud UAT `8ITmuulzHaRqnTWKyR7i`, de la cuenta solicitante y el Grupo `Grupo UAT B
posterior`, estaba canónicamente `pendiente`. El lector backend ejecutado con la identidad de esa
misma cuenta devolvió exactamente una tarjeta y `nextCursor: null`; no hubo consulta omitida, error
del lector ni lista vacía. Functions había cargado `listMyPendingGroupJoinRequests` en el proyecto
efectivo `demo-iux01-uat`.

La causa fue el frontend servido: `next start` había arrancado el 2026-11-10 a las 14:44, antes del
build IUX-06B escrito a las 15:22. Los chunks HTTP servidos no contenían
`listMyPendingGroupJoinRequests` ni `Solicitudes pendientes`. Se recompiló y reinició únicamente el
frontend, sin reiniciar Emulator. El build servido quedó:

- `BUILD_ID`: `LPCWBzrkAMhqdN7-Oze85`;
- LAN: `http://192.168.44.184:3000`;
- proyecto: `demo-iux01-uat`;
- Auth/Firestore/Functions conservaron sus procesos y datos.

El escenario Emulator aislado verificó lectura inicial, recarga con una sola aparición de la misma
Solicitud, cancelación canónica y ausencia posterior. La Solicitud UAT real quedó pendiente para la
revisión humana.

### Cobertura inicial del Grupo

Novedades e Integrantes ya compartían una única instancia de `useGroupDashboardTasks`. En el alta
observada, el Grupo se confirmó a las `12:18:16.370Z`; la consulta empezó 227 ms después y terminó
aproximadamente 360 ms después del alta. La cobertura pasó a `READY` a los 344 ms. La transacción
de lectura había conservado el snapshot inicial `UPDATING`; el hook aceptaba esa respuesta una sola
vez y no volvía a consultar, por lo que ambos bloques retenían el resultado provisional hasta una
recarga manual.

El hook ahora conserva el aviso y reintenta en segundo plano a los 250, 500, 1000 y 2000 ms, tanto
para `PROJECTION_NOT_READY` como para una respuesta válida cuya cobertura todavía no sea `READY`.
Al acreditarse READY, el mismo estado compartido actualiza Novedades y el resumen de Integrantes sin
recargar la página. Tras agotar los intentos se conserva el aviso y Novedades ofrece `Reintentar
ahora`; no se inventan totales.

Validación posterior: unitarias focales 12/12, Emulator focal 1/1, TypeScript PASS, lint focal PASS,
build Next.js PASS y chunks LAN verificados con ambas correcciones. Queda pendiente la repetición
visual autenticada con las dos cuentas UAT.

### Aceptación humana posterior

El usuario confirmó el 2026-11-11 los dos recorridos funcionales corregidos: la Solicitud propia
aparece en `Mis grupos` y puede cancelarse mediante el flujo canónico; además, Novedades y el resumen
de Integrantes alcanzan la cobertura acreditada y cargan sin recarga manual. Esta aceptación humana
se registra separada de la evidencia automatizada. La igualación visual del ancho de las tarjetas de
Solicitudes pendientes queda servida en LAN para revisión antes del cierre.

### Hallazgo UAT: filtros de Grupos actuales

La revisión comprobó que la deduplicación por `groupId` ya conservaba dos condiciones independientes:
`administers` proviene de los Grupos administrados y `participates` sólo se activa con una Membresía
actual acreditada por el lector existente. Administrar por sí solo no se interpreta como integrar.
El desajuste estaba en la presentación: el filtro se rotulaba `Participo` en lugar de `Integro` y el
vacío agregaba una precisión no acordada. Se corrigieron ambos textos sin alterar la deduplicación,
la paginación ni el acceso administrativo de la tarjeta unificada.

La regresión focal cubre sólo administra, sólo integra y doble rol; acredita una sola tarjeta en
`Todos`, presencia en ambos filtros para el doble rol y acceso administrativo conservado. También
comprueba el resultado vacío de `Integro` y que la vista lo condiciona a cobertura completa: el
lector agota las páginas de membresías actuales antes de pasar a `ready`, mientras carga y error
conservan sus estados sin anunciar una ausencia prematura. Este filtro queda señalado para revisión
visual antes del cierre de IUX-06B.

Validación posterior: regresión focal 4/4, TypeScript PASS, lint focal PASS, build Next.js PASS y
`git diff --check` PASS (sólo avisos de normalización LF/CRLF en archivos preexistentes del corte).
El build `QPjPXKHjFg6uHqBjFd5ga` quedó servido por LAN. El usuario confirmó con el mismo Grupo UAT
Owner-integrante que la tarjeta aparece una sola vez en `Todos`, y también aparece en `Administro`
e `Integro`, conservando el acceso administrativo. El problema del doble rol queda resuelto.

### Corrección UAT: deportes distintos de Vóley en Membresías actuales

En la cuenta UAT reproducida, `listMyCurrentGroupMemberships` respondía HTTP 400 con
`FAILED_PRECONDITION`, `details.reason=INCOMPATIBLE_STATE` y
`Member-readable Group context is invalid`. El Grupo era de fútbol y la validación del adapter de
contexto de Membresía exigía `deporte === "voleibol"`, aunque el dominio de Grupo admite otros
deportes normalizados. La Membresía activa propia del Owner sí había sido creada por el flujo normal:
el log registra `createOwnGroup`, `createAndOpenSeason` y `createMyMembershipForOwnedGroup`; sus
guards, temporada abierta y período de vigencia estaban correlacionados. La fixture automatizada que
pasaba usaba un Grupo de Vóley, por lo que no ejercitaba esa restricción.

El adapter ahora valida que `deporte` tenga forma de string y delega la validación del deporte
canónico al lector de Grupo; los contratos frontend usan `GroupSport`. La regresión de Emulator usa
un Grupo de fútbol con Membresía actual y verifica respuesta, filtros, deduplicación y acceso
`Administro` sin Membresía. En el navegador UAT, la callable respondió HTTP 200 y la tarjeta apareció
una vez en cada filtro (`Administro`, `Integro`, `Todos`), con ambas relaciones. También se abrió
“Mi participación” y se comprobó la Membresía activa y la Temporada. El registro UAT sólo se leyó;
no se modificaron sus datos.
