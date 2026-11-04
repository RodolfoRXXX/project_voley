# IUX-04 — Informe de implementación: detalle de Grupo mobile-first

## Estado

**IMPLEMENTADO Y CERRADO TÉCNICAMENTE EN LOCAL — UAT HUMANA COMPLEMENTARIA PENDIENTE**

- Rama: `feat/iux-04-detalle-grupo-mobile-first`.
- Base validada: `dev@6b7a030299493bcd2b2f12022b67d4daccfbca53`.
- Alcance: ficha IUX-04, addendum y D5-064 vigentes, incluida D07.
- No se realizaron commits, merges, pushes, despliegues ni accesos a datos productivos.
- Los cambios preexistentes de la guía local y `firebase.json` permanecen fuera del alcance propio.

## 1. Resultado implementado

### 1.1 Consulta contextual de tareas

`listMyDashboardTasks` admite `groupId` opcional sin cambiar el consumo global:

```ts
{
  coverage: "N20_N31_V1";
  groupId?: string;
  cursor?: string;
}
```

- El filtro `groupId` se aplica en Firestore antes de `limit` y paginación.
- El cursor firmado liga cuenta, coverage, generación, orden y `groupId | null`.
- Cursores globales anteriores sin el nuevo campo se interpretan exclusivamente como globales.
- El modo contextual revalida Cuenta, Grupo y autorización Owner/reviewer en cada página.
- Un contexto ajeno o inexistente devuelve `GROUP_CONTEXT_NOT_ACCESSIBLE` sin enumerar recursos.
- `totalTasks` filtrado y `groupTaskCounts` pertenecen sólo al Grupo solicitado.
- `groupTaskCounts.count` se conserva y se agregan `N20` y `N31`, con `count = N20 + N31`.
- Totales/desglose sólo se entregan con coverage completa y estado `READY`.
- La salud contextual lee exclusivamente scope/contexto del Grupo; otro Grupo degradado no oculta
  cifras acreditadas del solicitado.
- N20 enlaza a `/members?joinRequestId=...`; N31 conserva el destino económico canónico.
- La consulta no escribe ni incorpora proyección, writer, contador o permiso.

El plan real requirió el índice:

```text
items / COLLECTION:
groupId ASC, projectionState ASC, actionableAt DESC, taskType ASC, resourceId ASC
```

Firestore Emulator ejecutó la consulta con ese índice.

### 1.2 Navegación y `/members`

- Nueva ruta `/dashboard/groups/{groupId}/members` para Owner de Grupo activo.
- Reutiliza `OwnMembershipSection`, `ActiveGroupMembersSection` y
  `PendingGroupJoinRequestsSection` sin cambiar sus contratos, acciones o paginación.
- Owner sin Persona sigue accediendo a administración; Mi membresía presenta su estado propio sin
  convertirse en guard del roster.
- La URL anterior `?joinRequestId=...#integrantes` se redirige a `/members`, preservando query y
  localización de la solicitud.
- Grupos archivados conservan Resumen, Economía y Temporada; no obtienen `/members` navegable ni
  roster histórico.
- Mi participación y Economía delegada mantienen sus rutas y guards existentes.

### 1.3 Resumen y responsive

Orden final: Novedades, Economía, Temporada, Integrantes.

- Novedades pagina N20/N31 del Grupo y sólo navega a destinos canónicos.
- Economía conserva contenido, permisos y acción.
- Temporada conserva contenido y usa “Abrir temporada” con tratamiento visual equivalente.
- Integrantes no presenta total de roster, cero, aproximación ni `items.length`.
- Solicitudes pendientes usa exclusivamente N20 contextual acreditado.
- Novedades e Integrantes comparten una única carga contextual; Economía y Temporada conservan
  cargas, errores y retries propios.
- Bajo `md` se usa el selector “Sección del Grupo”; desde `md`, tabs con sección activa por ruta.
- La navegación primaria ya no depende de `overflow-x-auto`.

### 1.4 Clipboard

El control compartido queda junto al título Integrantes en Resumen y en el encabezado de
`/members`; se retiró el duplicado interno de Solicitudes.

- copia `/join/groups/{groupId}`;
- área mínima 44×44 px, foco estable, nombre accesible y `title`;
- check y “Enlace copiado” durante 2 segundos;
- confirmación de éxito sólo mediante región `aria-live` visualmente oculta;
- fallo visible breve y reintento sobre el mismo botón;
- single-flight para clics simultáneos y reinicio del timer en un nuevo éxito;
- cambio de Grupo desmonta el control mediante `key` y cancela el timer.

## 2. D07 y roster

El lector canónico de roster no fue modificado. No se agregó `totalItems`, aggregate count, barrido,
límite artificial, índice de conteo ni proyección/contador. `/members` conserva páginas de hasta 20
y continúa sus cursores. El conteo exacto permanece diferido según D07.

## 3. Archivos propios

### Backend y contrato

- `functions/src/dashboardTasks/application/dashboardTaskQueryContract.js`
- `functions/src/dashboardTasks/application/dashboardTaskCursor.js`
- `functions/src/dashboardTasks/application/dashboardTaskQueryErrors.js`
- `functions/src/dashboardTasks/infrastructure/dashboardTaskQueryCallable.js`
- `functions/src/dashboardTasks/infrastructure/firestoreDashboardTaskQuery.js`
- `firestore.indexes.json`

### Frontend

- `src/app/(protected)/dashboard/groups/[groupId]/page.tsx`
- `src/app/(protected)/dashboard/groups/[groupId]/members/page.tsx`
- `src/components/groups/GroupContextNavigation.tsx`
- `src/components/groups/GroupNewsCard.tsx`
- `src/components/groups/GroupMembersSummaryCard.tsx`
- `src/components/groups/CopyGroupJoinLinkButton.tsx`
- `src/components/groups/copyFeedback.mjs` y `.d.mts`
- `src/components/groups/useGroupDashboardTasks.ts`
- `src/components/groups/groupDashboardTaskTypes.ts`
- `src/components/groups/GroupSeasonSummaryCard.tsx`
- `src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx`
- `src/services/dashboardTasksService.ts`
- `src/types/DashboardTask.ts`

### Pruebas

- `functions/test/unit/groupDetailIux04.test.js`
- contratos/regresiones unitarias IUX-02/E2 ajustadas a `/members`;
- `functions/test/emulator/dashboardTaskQueryIux02b.test.js` ampliado para IUX-04.

## 4. Evidencia ejecutada

| Gate | Resultado |
| --- | --- |
| TypeScript `tsc --noEmit --incremental false` | PASS |
| Lint baseline | PASS; sin deuda nueva, 11 hallazgos históricos resueltos |
| Sintaxis Functions | PASS — 487/487 archivos |
| Unitarias completas | PASS — 435/435 |
| Unitarias focales IUX-04/Clipboard | PASS — 10/10 |
| Emulator focal consulta IUX-04 | PASS — 3/3, datos sintéticos, cero writes |
| Build Next compilado | PASS; `/dashboard/groups/[groupId]/members` incluida |
| Smoke HTTP compilado | PASS — 200 en Mis grupos, Resumen, `/members`, Economía y Temporada |
| `git diff --check` | PASS |

El Emulator focal cubrió dos Grupos, consulta contextual de 12 tareas en dos páginas, cursor
contextual usado como global, contexto ajeno, cuenta distinta, fuente resuelta, cobertura
UPDATING/REBUILDING/DEGRADED, aislamiento del Grupo sano, reviewer revocado, overlap Owner/reviewer,
generación sustituida y cero escrituras. El fixture Owner continúa sin Persona.

El arranque compilado siguió la guía con `demo-iux01-uat`. Ya existía una instancia coherente de
Auth/Firestore/Functions/PubSub Emulator y `next start` en 3000; no se detuvieron procesos ajenos. Se
inició temporalmente el build actual en 3001, se ejecutó el smoke y se detuvo sólo esa instancia.

## 5. Capturas y UAT pendientes

No se generaron capturas autenticadas: esta ejecución no dispone de una sesión de navegador
controlada y no reutiliza perfiles personales. El smoke HTTP acredita rutas compiladas, no layout,
Clipboard real ni navegación de navegador. **No se marca UAT humana aprobada.**

La revisión humana debe guardar capturas en una futura carpeta
`docs/implementacion/interetapa-ux-movil/evidencia/IUX-04/`, al menos:

1. Resumen Owner activo a 360×800 y 390×844, selector abierto y cerrado;
2. Resumen a 768×900, 1440×900 y zoom 200 %, sin overflow horizontal;
3. `/members` con Owner sin Persona, roster multipágina y solicitud localizada;
4. Grupo archivado sin acceso Integrantes;
5. integrante puro y delegado económico sin tabs Owner;
6. Clipboard antes, check de éxito y error/reintento;
7. navegación Resumen → Integrantes → Atrás → Adelante y deep-link anterior.

## 6. Pasos concretos de UAT

1. Construir el frontend y arrancar una sola sesión `demo-iux01-uat` según la guía.
2. Reconciliar IUX-02 y confirmar `dirtyScopes: 0`, `degradedScopes: 0`, `failedEvents: 0`.
3. Usar cuentas y fuentes sintéticas para Owner sin Persona, miembro puro y reviewer delegado.
4. Validar consulta global en Dashboard/Mis grupos antes de abrir el detalle filtrado.
5. Recorrer las resoluciones y capturas de la sección anterior con teclado y lector de pantalla.
6. Simular Clipboard denegado desde permisos del navegador y volver a habilitarlo para reintentar.
7. Revocar contexto y resolver fuentes entre páginas; verificar que no aparezcan ceros ficticios.
8. Completar la matriz del diagnóstico de consola por separado, con extensiones deshabilitadas.

## 7. Limitaciones

- Responsive, zoom 200 %, foco visible, Atrás/Adelante y Clipboard nativo quedan pendientes de UAT
  humana autenticada.
- No se caracteriza rendimiento productivo ni Android real.
- El diagnóstico `startTime/reportAllChanges` permanece separado; no se tocaron formularios ni se
  ocultaron excepciones.
- IUX-02 conserva sus gates productivos. IUX-04 no cierra IUX/E3 ni habilita E4.

## 8. Continuacion UAT - hallazgos del 3 de noviembre de 2026

### 8.1 Grupo creado despues del backfill

La evidencia y el codigo confirman una brecha contractual previa a IUX-04:

- `createOwnGroup` persiste `groups/{groupId}` y el guard de creacion en una transaccion, pero no
  crea `dashboardTaskScopes` ni `dashboardTaskOutbox`;
- el worker de proyeccion ejecutado cada minuto solo consume outbox existente y no descubre Grupos;
- el unico descubrimiento vigente de un Grupo sin fuentes N20/N31 es
  `onDashboardTaskReconciliation`, programado cada 24 horas;
- la consulta contextual exige scope y metadata acreditada. Por diseno read-only responde
  `PROJECTION_NOT_READY` cuando faltan, y no debe sintetizar `READY/0`.

En emuladores, cargar Pub/Sub y Functions no acredita por si mismo que la reconciliacion diaria haya
corrido despues del alta. Por eso un backfill inicial con cero Grupos seguido de un alta canonica
reproduce el hallazgo. No es configuracion faltante del reader ni debe resolverse con otro backfill.

La alternativa minima es ampliar el writer canonico de creacion para registrar, dentro de la misma
transaccion, el scope y un evento determinista de inicializacion de cobertura; el worker existente
podria procesarlo sin nueva proyeccion ni escritura desde consultas. Esto modifica un writer no
incluido por IUX-04 y requiere autorizacion arquitectonica separada antes de implementarse. Hasta
entonces no puede completarse validamente el ciclo nuevo Grupo -> `READY/0` inmediato -> N20 ->
resolucion sin invocar la reconciliacion diaria.

### 8.2 Doble scroll y espacio inferior

La raiz declaraba `overflow-y-auto` en `body` y el layout protegido declaraba otro
`overflow-y-auto` en `#protected-scroll-container`. El detalle supera la altura disponible con mas
frecuencia que Mis grupos y hacia visibles ambos scroll containers. El espacio observado al mover
el scroller exterior era el remanente del viewport raiz, no margen de la caja Integrantes.

El aviso `firebase-emulator-warning` es inyectado por Firebase Auth con `position: fixed`, `bottom: 0`
y `z-index: 10000`; no participa del flujo ni genera el espacio. Se conserva visible.

Correccion local: `body` usa `h-dvh`, el contenedor raiz usa `h-full` y el unico scroller de la
aplicacion sigue siendo `#protected-scroll-container`. No se oculta overflow global, no se recorta
contenido y no se aplican compensaciones visuales.

UAT humana autenticada sigue pendiente para capturas y verificacion en 360/390 px, escritorio y
zoom 200 %. No se declara aprobacion humana.

## 9. Continuacion UAT - build efectivo, Persona y D08

### 9.1 Build servido

El puerto 3000 estaba servido por PID 20548 con `next start` desde `volley-ranking-frontend` y
BUILD_ID `JYDD1EnumTAx-7SPrZT4n` (3/11/2026 12:00:37). Se detuvo solo ese frontend, se reconstruyo
el paquete y se reinicio en `127.0.0.1:3000`. El proceso efectivo posterior es PID 3920, BUILD_ID
`-mvUk_GWMpwzFyOr2rhAN` (3/11/2026 12:33:20), con HTTP 200 en `/dashboard/groups`. Emuladores y
datos UAT no se detuvieron ni modificaron.

### 9.2 PERSON_REQUIRED

Los consumidores activos hallados son Mis grupos y `GroupContextNavigation`; el componente historico
`MyCurrentGroupMembershipsSection` no esta montado. El detalle originaba la llamada desde
`GroupContextNavigation`, incluso para un Owner cuya ausencia de Persona ya estaba acreditada.

`PersonProvider` expone ahora `personAccountId`, que liga `loading/empty/ready/error` a la Cuenta que
produjo el resultado. Mis grupos y la navegacion contextual solo consultan Membresias cuando ese UID
coincide y el estado es `ready`; `empty` acreditado omite la peticion sin convertirlo en cero. Un
`PERSON_REQUIRED` por carrera se trata como ausencia de contextos member-scoped, conservando los
Grupos administrados. Los effects se invalidan al cambiar UID/estado y descartan respuestas tardias.
Backend y administracion Owner permanecen intactos.

### 9.3 Cobertura automatica y D08-A

D08-A fue adoptada e implementada localmente. `createOwnGroup` construye schema v3 activo con
`ownershipRevision=1`; la transaccion del guard crea Grupo, guard, scope y
`GROUP_COVERAGE_INITIALIZED`. El evento es determinista por `groupId`, declara cobertura a comprobar
y solicita autoactivacion solo al completar el full scan live. El source reader obtiene Owner y
revisores efectivos; por eso materializa raiz/contexto cero sin inventar tareas. Rebuild/backfill no
se autoactivan y conservan su procedimiento operativo.

Regresion aislada `demo-sportexa-e0-02`: Cuenta sin Grupos `READY/0` con `no-contexts-v1`; alta v3;
evento aplicado por `onDashboardTaskOutboxCreate` en aproximadamente 0,8 s; consultas global y
contextual `READY/0`. Suite unitaria: 436/436. El scheduler Pub/Sub no estaba iniciado en esa prueba:
la evidencia corresponde al trigger Firestore inmediato, no a una cadencia inferida.

En la UAT preservada se identificaron por lectura dos Grupos activos v1 afectados:
`EIdfvbibPiRlUD1P2AK3` y `Wc9rcxul2gOiNBkwjwHZ`, ambos sin `ownershipRevision`. Se ejecuto una unica
reparacion restringida al emulador: `ensureOwnershipContext` y la inicializacion determinista en la
misma transaccion por Grupo, seguida del worker canonico; no hubo backfill ni edicion manual. Ambos
quedaron v3/revision 1, scope revision 1 `READY`, raiz live `READY` y contexto N20=0/N31=0. La
repeticion del comando devolvio `duplicate=true`, revision 1 y cero eventos procesados. La regresion
N20/N31 canonica completa en esa UAT aun no se declara verificada.

### 9.4 Layout

El build corregido esta servido, pero no habia una instancia Chrome con depuracion remota ni una
sesion autenticada controlable. No se reutilizo ni reinicio el perfil personal abierto. Por tanto no
hay mediciones DOM autenticadas ni capturas nuevas y el hallazgo visual permanece **NO RESUELTO**.
La proxima UAT debe medir `html`, `body`, raiz, layout protegido, sidebar y
`#protected-scroll-container` (`clientHeight`, `scrollHeight`, `overflowY`, `scrollTop`) tanto en Mis
grupos como en el detalle, a 360/390 px, escritorio y zoom 200 %.

### 9.5 Perfil aislado y medicion DOM reproducible

Cerrar toda instancia de prueba previa y abrir Chrome/Edge con un directorio temporal exclusivo,
por ejemplo `chrome.exe --user-data-dir="%TEMP%\sportexa-iux04-uat" --remote-debugging-port=9223
http://127.0.0.1:3000`. Autenticar una Cuenta sintetica del Auth Emulator; no reutilizar el perfil
personal. En Mis grupos y luego en el Resumen del mismo Grupo, ejecutar en DevTools:

```js
(() => {
  const pick = (selectors) => selectors.map((s) => document.querySelector(s)).find(Boolean) || null;
  const content = document.querySelector("#protected-scroll-container");
  const protectedLayout = content?.parentElement || null;
  const root = content ? [...document.body.children].find((node) => node.contains(content)) || null : null;
  const nodes = {
    documentScroller: document.scrollingElement,
    html: document.documentElement,
    body: document.body,
    root,
    navbar: pick(["nav", "header"]),
    layout: protectedLayout,
    sidebar: protectedLayout?.querySelector("aside") || pick(["aside", "[data-sidebar]"]),
    content,
  };
  const rows = Object.entries(nodes).map(([name, element]) => {
    if (!element) return { name, found: false };
    const css = getComputedStyle(element);
    return { name, found: true, clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight, scrollTop: element.scrollTop,
      overflowY: css.overflowY, height: css.height, minHeight: css.minHeight,
      position: css.position,
      scrollable: element.scrollHeight > element.clientHeight && /^(auto|scroll)$/.test(css.overflowY) };
  });
  console.table(rows);
  return rows;
})()
```

El script solo inspecciona DOM y estilos calculados: no lee storage, cookies, tokens ni datos de
Cuenta. Repetir a 360 y 390 px, escritorio y zoom 200 %, registrando captura y tabla. El criterio es
navbar/sidebar estaticos y un unico `scrollable=true` en contenido central; el aviso Auth Emulator
puede ocupar espacio propio, pero no debe ocultarse ni usarse para compensar el layout.

### 9.6 Gates de este corte

- unitarias: 436/436;
- alta/cobertura aislada: 4/4 (Cuenta vacia, rechazos, alta v3 y READY/0 global/contextual);
- proyeccion IUX-02A: 9/9, incluidos duplicados, concurrencia, N31, rebuild y multipagina;
- consulta IUX-02B: 3/3, cero escrituras y escalas 3/20/100 contextos;
- `node --check` sobre backend y regresion modificados: sin errores;
- `git diff --check`: sin errores.

No se ejecuto build frontend nuevo porque este corte posterior al build servido solo cambio backend,
tests y documentos. El proceso compilado anterior sigue escuchando en 127.0.0.1:3000 (PID 3920).
No hay captura autenticada nueva; layout y ciclo canonico completo N20/N31 en ese demo permanecen
pendientes. Los dos v1 UAT fueron reparados y verificados por lectura estructural. UAT humana no
aprobada.

## 10. Continuacion UAT - N20 confirmado y doble scroll

El usuario confirma que una N20 aparece en Inicio y en Novedades del Grupo sin errores. Esta
confirmacion se limita a ese recorrido N20: no acredita N31 ni concurrencia.

Copilot midio antes del cambio dos scrollers en Resumen: `document.scrollingElement` y
`#protected-scroll-container`. A 390x844, el documento media 844/1166 px y el contenido 779/1282 px
(`clientHeight/scrollHeight`); tambien reprodujo a 360x800 y 1280x800. El extremo inferior del
`span.sr-only[aria-live]` de `CopyGroupJoinLinkButton` coincidia con el `scrollHeight` exterior. Como
el wrapper no estaba posicionado, el elemento absoluto se resolvia contra un containing block ajeno
al control. El aviso Firebase era fijo y no explicaba el overflow.

Correccion minima: el wrapper compartido por Resumen y `/members` ahora es
`relative inline-flex flex-col items-end`. Esto contiene el `sr-only` sin eliminarlo y conserva
`aria-live`, nombre accesible, tooltip, foco, area 44 px, check de dos segundos, error visible y
reintento. No se modificaron overflow global, alturas, margenes ni el aviso del emulador.

Se detuvo el frontend anterior antes del build. `next build` finalizo correctamente y el build
servido es `eh7u6iU3FeQ3E36xanm53` (3/11/2026 15:38:54), listener PID 17428, HTTP 200. Regresion
focal IUX-04: 6/6; lint baseline: sin hallazgos nuevos (31 errores y 8 warnings conocidos, 11
resueltos); el build incluyo TypeScript y generacion de las 22 paginas estaticas.

El usuario confirma visualmente en su prueba actual que desaparecieron el doble scroll y el espacio
inferior. Este resultado cierra esos dos sintomas solo para el recorrido observado. No acredita por
si mismo todos los viewports, zoom real 200 %, foco/lector de pantalla, clipboard fallido/repetido ni
ausencia general de overflow horizontal. Esas verificaciones y la UAT global permanecen abiertas.

## 11. Continuacion UAT - capability de registro directo en Mi participacion

La llamada `getMyGroupDirectPaymentRecordContext` observada al ingresar como integrante se origina
en `/dashboard/groups/{groupId}/membership`. La pagina Mi participacion resuelve bajo demanda y una
sola vez Tesoreria, revision de avisos y registro directo. `GroupFrame` no consulta capabilities en
esa ruta: solo las resuelve al abrir `/economy`. `GroupContextNavigation` no origina la llamada y el
componente historico `MyCurrentGroupMembershipsSection` no esta montado.

El callable es el contrato autoritativo vigente de `GROUP_DIRECT_PAYMENT_RECORD`. Para un integrante
sin grant valido, `PERMISSION_DENIED` con `ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED` es la denegacion
esperada del contrato, no una carga administrativa ni un fallo general. Mi participacion la clasifica
como `record=false`; las obligaciones y acciones propias se cargan por contratos independientes y
permanecen disponibles. Un rechazo diferente, timeout, indisponibilidad o error interno marca la
verificacion como fallida, muestra aviso con reintento y no se convierte en ausencia de permiso. No
hay `console.error`/`console.warn` propios para la denegacion esperada.

No se cambio codigo productivo ni backend: devolver 403 es parte del contrato existente y sustituirlo
solo para limpiar DevTools cambiaria ese contrato o duplicaria autoridad. Se agrego caracterizacion
focal que acredita consulta unica bajo demanda, clasificacion estricta y acceso independiente a
obligaciones. Resultado: 7/7. La regresion Emulator canonica E3-04 dio 6/6 e incluye grant delegado,
contexto autorizado, prohibicion de auto-registro, revocacion y posterior denegacion. El Owner
conserva su recorrido existente; el callable de contexto representa grants delegados y no se usa
para conceder permisos Owner.

## 12. Consolidación de cierre

La validación final sobre el código consolidado produjo:

- unitarias completas: 437/437;
- regresión E2 de alta, idempotencia y recuperación: 23/23;
- regresión focal de cobertura IUX-04: 4/4;
- consulta/proyección IUX-02, capability E3-04, arquitectura, TypeScript, build y baseline de lint:
  aprobados sin ampliar baselines, según las ejecuciones registradas en este informe.

La evidencia automatizada demuestra alta directa v3 con invariantes completas,
`ownershipRevision=1`, guard/scope/outbox atómicos, recuperación del comando, procesamiento
idempotente, cobertura global/contextual y preservación de revisiones frente a N20/N31. Los readers
permanecen sin escrituras y la reconciliación diaria conserva su función reparadora.

La evidencia humana se limita a dos confirmaciones: N20 visible en Inicio y Novedades sin error en
ese recorrido, y desaparición del doble scroll y espacio inferior en la prueba visual actual. No se
declaran aprobados por inferencia N31, concurrencia, todos los viewports, zoom real 200 %, Android
real, lector de pantalla ni los casos de Clipboard que no cuenten con observación humana.

Estado de salida: cierre técnico local de IUX-04, con UAT humana complementaria y gates productivos
separados. D07 mantiene diferido el conteo exacto de integrantes sin arquitectura asignada. Economía
personal por Membresía queda fuera. El diagnóstico `startTime/reportAllChanges` permanece en su
documento separado, sin causa inventada. IUX-02 conserva sus gates productivos; no se cierra IUX/E3
ni se habilita E4.
