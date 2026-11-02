# IUX-04 — Relevamiento del detalle de Grupo mobile-first

## 1. Estado, alcance y preflight

- Fecha: 2026-11-02.
- Estado documental: decisiones IUX-04-D01, D03–D06 adoptadas y D07 resuelta por diferimiento del
  conteo; definición lista para implementación bajo autorización posterior separada.
- Naturaleza: documentación; sin código, instalaciones, datos, commits, merges, pushes, migraciones
  ni despliegues.
- Identificador confirmado: **`IUX-04`**.
- Rama documental: `docs/iux-04-detalle-grupo-mobile-first`.
- Base local y remota comprobada: `dev` y `origin/dev` en
  `1ab39b3d59bf9fb70493de82d4c6b4bcfd6cb36e`, merge de IUX-03. No había avances posteriores.
- Upstream `origin/dev`, sin divergencia comprobada. La rama propuesta no existía en remoto.
- No existe `AGENTS.md` en el árbol.
- Se preservaron los cambios ajenos en `IUX-guia-entorno-local-emuladores.md` y
  `volley-ranking-system/firebase.json`; no se ejecutó `reset` ni `stash`.

Fuentes: Documento 5 §7.5A y D5-058–D5-063; addendum IUX-02; definición/cierre IUX-03; E2-11 y
contratos vigentes de Grupo, Temporada, Membresía, Solicitud y Economía; código integrado en `dev`
sólo como evidencia. IUX-04 no cierra IUX/E3, no habilita E4 ni altera gates productivos IUX-02.
Las decisiones se consolidan en el
[addendum IUX-04](../../arquitectura/Documento-2-3-4-addendum-IUX-04-detalle-grupo-mobile-first.md)
y D5-064.

## 2. Superficie actual

| Ruta | Superficie | Autorización efectiva |
| --- | --- | --- |
| `/dashboard/groups` | Mis grupos IUX-03 | Cuenta autenticada; ownership y Membresía separados |
| `/dashboard/groups/{groupId}` | Resumen administrativo | Owner canónico |
| `/dashboard/groups/{groupId}/membership` | Mi participación | Membresía actual y Temporada abierta exacta |
| `/dashboard/groups/{groupId}/economy` | Economía | Owner o capability económica efectiva |
| `/dashboard/groups/{groupId}/seasons` | Temporadas | Owner; archivado en lectura |
| `/dashboard/groups/{groupId}/seasons/new` | Crear y abrir Temporada | Owner de Grupo activo |

`GroupFrame` intenta `getOwnGroup`; sin ownership prueba Membresía y, al entrar en Economía,
capabilities. Cada página conserva su guard. Ser Owner no requiere Persona ni Membresía.

La navegación Owner activa muestra Resumen, Integrantes como `#integrantes`, Temporadas y Economía.
Archivado omite Integrantes. Integrante muestra Mi participación y Economía sólo con capability. La
barra actual usa `overflow-x-auto`. El Resumen muestra Temporada, Economía, Tu Membresía, roster y
solicitudes. Los listados pagan hasta 20; Solicitudes contiene hoy el acceso para copiar la invitación.

## 3. Navegación adoptada

| Sección | Ruta | Alcance |
| --- | --- | --- |
| Resumen | `/dashboard/groups/{groupId}` | Dashboard interno Owner |
| Economía | `/dashboard/groups/{groupId}/economy` | Contrato y permisos actuales |
| Temporada | `/dashboard/groups/{groupId}/seasons` | Contrato actual; lectura en archivado |
| Integrantes | `/dashboard/groups/{groupId}/members` | Owner de Grupo activo |

- `< md`: `<select>` rotulado “Sección del Grupo”, con `router.push` a URL canónica.
- `>= md`: tabs `Link` en orden Resumen, Economía, Temporada, Integrantes.
- Sección activa por `pathname`; Economía conserva query strings internas.
- `md` es el breakpoint inicial, sujeto a UAT 360/390/768/1440 y zoom 200 %.
- No se usa scroll horizontal como navegación móvil primaria.
- Mi participación permanece member-safe, fuera de tabs Owner.
- Archivados conservan Resumen, Temporada en lectura y Economía actual; no ganan `/members`, roster
  histórico ni acciones.

Deep-links:

- N20 nuevo: `/dashboard/groups/{groupId}/members?joinRequestId={requestId}`.
- N31 permanece: `/dashboard/groups/{groupId}/economy?tab=notices&deliveryId={deliveryId}`.
- La URL previa `/dashboard/groups/{groupId}?joinRequestId=...#integrantes` se reconoce y reenvía a
  `/members`, preservando `joinRequestId` y localización/foco.
- `/join/groups/{groupId}` sigue siendo la invitación canónica.
- URLs directas, recarga y Atrás/Adelante son parte del contrato.

## 4. Resumen como dashboard interno

Orden adoptado: Novedades, Economía, Temporada, Integrantes. Cada caja tiene carga, error y reintento
independientes; una falla o cobertura incompleta no bloquea las otras.

### 4.1 Novedades — contrato IUX-02 extendido

Se reutilizan `listMyDashboardTasks` y `N20_N31_V1`; no hay otra proyección, listener, polling ni
consulta por tarjeta.

```ts
type DashboardTaskQuery = {
  coverage: "N20_N31_V1";
  groupId?: string;
  cursor?: string;
};
```

- Sin `groupId`, el uso global IUX-01/IUX-03 permanece compatible.
- Con `groupId`, el backend exige un contexto N20/N31 actualmente autorizado. Grupo inexistente,
  ajeno o sin contexto devuelve `GROUP_CONTEXT_NOT_ACCESSIBLE`, sin enumeración.
- N20: Owner de Grupo activo. N31: Owner bajo el contrato vigente —incluido archivo prearchivo
  válido— o reviewer efectivo de Grupo activo. Cada página revalida fuentes y permisos.
- Query filtrado: `groupId == filtro`, generación activa, orden `actionableAt DESC, taskType ASC,
  resourceId ASC`, página máxima 10.
- Cursor firmado: cuenta, coverage, generación, schema/orden, `groupId | null` y ancla. Cursor global
  con filtro, de otro Grupo o filtro cambiado produce `INVALID_CURSOR`; generación sustituida obliga
  a reiniciar según IUX-02.

Salida aditiva compatible:

```ts
type GroupTaskCount = {
  groupId: string;
  count: number; // siempre N20 + N31; compatibilidad IUX-03
  N20: number;
  N31: number;
};
```

`groupTaskCounts` y `totalTasks` sólo existen con `coverage.complete === true` y `health === READY`.

- Global: `totalTasks` suma tareas deduplicadas de todos los contextos autorizados y el arreglo
  contiene cada contexto, incluidos ceros acreditados.
- Filtrada: `totalTasks` suma sólo el Grupo; el arreglo contiene exactamente ese registro; items y
  cursor pertenecen sólo al Grupo.
- La salud global evalúa todos los contextos autorizados. La salud filtrada evalúa integridad de la
  generación/root y scope/contexto del Grupo solicitado; un segundo Grupo degradado no oculta cifras
  completas del filtro, pero cualquier incompletitud del Grupo solicitado sí las omite.
- Overlap Owner+reviewer no duplica N31. N20/N31 mantienen identidades distintas.
- UPDATING/REBUILDING/DEGRADED, descarte por revalidación, error o flag deshabilitado omiten totales;
  la UI no muestra cero.
- Revocación, archivo, ownership, cierre/finalización o tarea resuelta se reflejan en nueva consulta;
  el destino vuelve a autorizar antes de operar.

Índice previsto, sujeto a Emulator y plan real antes de habilitar:

```text
items (COLLECTION):
groupId ASC, projectionState ASC, actionableAt DESC, taskType ASC, resourceId ASC
```

El índice global actual se conserva. No cambian persistencia ni writers. La caja sólo enlaza y
pagina; no resuelve tareas ni crea notificaciones, campana, leído/oculto, prioridad o N30.

### 4.2 Economía y Temporada

Economía reutiliza `GroupEconomySummaryCard`/`getOwnerGroupEconomySummary`, con cifras, permisos,
estados y “Abrir economía” intactos. Temporada reutiliza `GroupSeasonSummaryCard` y
`getOpenSeasonContext`; “Ver temporadas” pasa a **“Abrir temporada”** con estilo equivalente. No
ejecuta el comando de apertura.

### 4.3 Integrantes — caja y conteo diferido

La caja Resumen conserva título “Integrantes”, icono de copia, solicitudes pendientes acreditadas y
“Abrir integrantes”. No presenta una cantidad de integrantes.

La definición futura permanece: “Integrantes activos” es la cantidad de **Membresías activas
canónicamente válidas del Grupo activo que pertenecen a su única Temporada actualmente abierta**.

- Excluye solicitudes, Membresías finalizadas y otras Temporadas.
- Ownership solo no suma; el Owner cuenta una vez únicamente con Membresía incluida.
- Sin Temporada abierta no existe conteo actual.
- Archivado: no se consulta ni presenta como integrantes actuales.
- IUX-04 no muestra cero, aproximación ni longitud de la primera página.

El lector E2-11 permanece intacto: revalida contexto, pagina hasta 20 y aplica sus invariantes
canónicas por fila. IUX-04 no agrega `totalItems`, aggregate count, barrido exhaustivo, límite
artificial de roster, índice para conteo ni proyección/contador persistido. `/members` continúa todos
los cursores mediante el contrato vigente. La arquitectura del conteo exacto queda diferida sin
asignar ahora un incremento adicional.

Solicitudes pendientes usa N20 contextual, nunca `items.length`, y muestra cero sólo en READY.
Novedades e Integrantes consumen una única carga contextual de tareas coordinada a nivel de página;
no duplican el callable por card ni consultan por item. Cada caja conserva su estado visual y puede
reintentar la fuente que falló sin bloquear Economía, Temporada o el total de roster.

## 5. `/members` y copia del enlace

`/members` reúne, sin duplicar reglas, `OwnMembershipSection`, `ActiveGroupMembersSection` y
`PendingGroupJoinRequestsSection`. Conserva acciones, recovery, paginación y permisos. Administración,
roster y decisiones derivan de ownership, sin exigir Persona/Membresía al Owner.

El icono de copia queda junto a **“Integrantes”** en la caja Resumen. Copia
`/join/groups/{groupId}`. En `/members` se conserva un único acceso en el encabezado y se retira del
encabezado interno Solicitudes, evitando dos controles en la misma sección.

- mismo botón/foco; área mínima 44×44 px;
- icono copiar y nombre/tooltip “Copiar enlace de solicitud”;
- éxito: check y nombre/tooltip “Enlace copiado” durante 2 segundos;
- anuncio sólo para lector de pantalla con `aria-live=polite` visualmente oculto;
- sin texto visible de éxito ni subtexto permanente; móvil no depende del tooltip;
- escritura Clipboard en vuelo impide duplicados; clic posterior reinicia timer;
- cambio de Grupo/unmount cancela timer;
- fallo restaura copiar, muestra error breve `role=alert` y permite reintentar.

## 6. Brechas reales y decisiones

Brechas de implementación no bloqueantes documentales:

1. tareas aún no aceptan `groupId`, no ligan cursor al filtro ni exponen N20/N31;
2. el índice filtrado debe confirmarse y, probablemente, agregarse;
3. no existe `/members` ni compatibilidad del hash;
4. Clipboard actual tiene texto, vive en Solicitudes y no implementa check/timer;
5. falta UAT responsive.

IUX-04 no requiere otra proyección, colección, writer, Rule, migración, índice ni contador para roster.

| ID | Decisión adoptada |
| --- | --- |
| IUX-04-D01 | `groupId` opcional, autorización contextual, compatibilidad global y cursor ligado |
| IUX-04-D02 | superada por D07 sólo para IUX-04; se conserva la definición futura del conteo exacto |
| IUX-04-D03 | desglose N20/N31 existente sólo bajo coverage completa/autorización vigente |
| IUX-04-D04 | `/members` canónico con hash, `joinRequestId` y localización compatibles |
| IUX-04-D05 | accesos actuales de archivados, sin roster histórico/acciones nuevas |
| IUX-04-D06 | `md` inicial, sujeto a responsive y zoom 200 % |

### IUX-04-D07 — RESUELTA: diferir el conteo

IUX-04 no incorpora total de integrantes. No adopta count físico, barrido exhaustivo, límite
artificial ni proyección/contador. La caja conserva solicitudes pendientes N20 acreditadas y acceso
al roster paginado. La definición exacta futura permanece registrada sin arquitectura ni incremento
asignado. Estado: **LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA**.
