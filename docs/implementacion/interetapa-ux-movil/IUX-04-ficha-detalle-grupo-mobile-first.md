# IUX-04 — Ficha de incremento: detalle de Grupo mobile-first

## Estado

**IMPLEMENTADO Y CERRADO TÉCNICAMENTE EN LOCAL — UAT HUMANA COMPLEMENTARIA PENDIENTE**

Registra IUX-04-D01–D06 y el
[addendum focal IUX-04](../../arquitectura/Documento-2-3-4-addendum-IUX-04-detalle-grupo-mobile-first.md).
Completa definición documental; no autoriza
código, instalaciones, commits, merges, pushes, migraciones, datos ni despliegues.

- Base: `dev@1ab39b3`, con IUX-03 cerrado e integrado.
- Rama documental: `docs/iux-04-detalle-grupo-mobile-first`.
- IUX-02 conserva pendientes productivos; IUX-04 no cierra IUX/E3 ni habilita E4.
- Diagnóstico de consola: separado y fuera del alcance visual.

## 1. Objetivo y resultado

Mejorar el detalle Owner accesible desde Mis grupos mediante navegación mobile-first y un Resumen
interno, preservando contratos, permisos y acciones.

- móvil `< md`: selector “Sección del Grupo” sin overflow;
- escritorio `>= md`: tabs Resumen, Economía, Temporada, Integrantes;
- rutas canónicas, recarga, deep-links y Atrás/Adelante;
- Resumen: Novedades, Economía, Temporada, Integrantes;
- N20/N31 informativas; resolución sólo en destino canónico;
- Economía intacta antes de Temporada;
- “Abrir temporada” con estilo de “Abrir economía”;
- `/members` con Mi membresía, roster y solicitudes;
- solicitudes pendientes acreditadas, sin ceros bajo incertidumbre;
- copia accesible de invitación;
- Owner sin Persona/Membresía conserva administración.

## 2. Rutas y permisos

| Sección | Ruta | Autorización |
| --- | --- | --- |
| Resumen | `/dashboard/groups/{groupId}` | Owner |
| Economía | `/dashboard/groups/{groupId}/economy` | Owner o capability actual |
| Temporada | `/dashboard/groups/{groupId}/seasons` | Owner; lectura actual en archivado |
| Integrantes | `/dashboard/groups/{groupId}/members` | Owner de Grupo activo |
| Mi participación | `/dashboard/groups/{groupId}/membership` | Membresía actual; fuera de tabs Owner |

La navegación no reemplaza el guard. Archivados no ganan `/members`, historia ni acciones. N20 pasa
a `/members?joinRequestId=...`; la URL anterior con `#integrantes` preserva parámetro y localización.

## 3. Contrato de Novedades

```ts
listMyDashboardTasks({
  coverage: "N20_N31_V1",
  groupId?: string,
  cursor?: string
})
```

`groupId` opcional conserva el uso global. Presente exige contexto N20/N31 autorizado y filtra
items. El cursor firma cuenta, coverage, generación, orden, `groupId | null` y ancla; no cruza
global/filtrado, Grupos ni cuentas.

```ts
type GroupTaskCount = {
  groupId: string;
  count: number;
  N20: number;
  N31: number;
};
```

- `count === N20 + N31`; `count` mantiene compatibilidad IUX-03.
- Global: `totalTasks` suma todos los contextos autorizados; arreglo por contexto.
- Filtrada: `totalTasks`, arreglo, items y cursor pertenecen sólo al Grupo.
- Global evalúa salud de todos los contextos; filtrada evalúa generación/root y sólo el
  scope/contexto solicitado, sin quedar degradada por otro Grupo.
- Totales/desglose sólo con coverage completa y READY; en otro estado se omiten.
- Página máxima 10, orden vigente y revalidación por página.
- N20 sólo Owner activo; N31 según Owner/reviewer vigente; overlap no duplica.
- Contexto no autorizado: `GROUP_CONTEXT_NOT_ACCESSIBLE`, no enumerable.

Query: `groupId ==`, `projectionState == ACTIVE`, orden por `actionableAt DESC`, `taskType ASC`,
`resourceId ASC`. Índice probable, a confirmar con Emulator:

```text
items / COLLECTION:
groupId ASC, projectionState ASC, actionableAt DESC, taskType ASC, resourceId ASC
```

No hay writes ni proyección nueva.

## 4. Integrantes y conteo diferido

IUX-04 conserva sin cambios el lector canónico, su autorización, validaciones, máximo de página,
cursor y comportamiento frente a cambios de Temporada. No incorpora `totalItems`, aggregate count,
barrido exhaustivo, límite artificial ni proyección/contador persistido.

La caja Resumen no muestra cantidad de integrantes: tampoco cero, aproximación ni longitud de la
primera página. Mantiene título “Integrantes”, copia de invitación, solicitudes pendientes N20
acreditadas y acceso “Abrir integrantes”. El roster completo sigue disponible paginado en `/members`.

Se conserva como definición de una mejora futura: “Integrantes activos” será la cantidad exacta de
Membresías activas canónicamente válidas del Grupo activo y su Temporada actualmente abierta; no
contará solicitudes, Membresías finalizadas, otras Temporadas ni ownership por sí solo. Su
arquitectura y eventual incremento no se asignan en IUX-04.

## 5. Composición y Clipboard

Resumen:

1. Novedades: consulta filtrada única y paginación contextual;
2. Economía: card actual;
3. Temporada: card actual con “Abrir temporada”;
4. Integrantes: N20 acreditado, copia de invitación y acceso `/members`, sin total de roster.

Cada caja administra carga/error/reintento independientemente.
Novedades e Integrantes comparten una sola carga contextual de tareas a nivel de página. No hay una
consulta por card/item; cada caja aísla su presentación y el retry de esa fuente no bloquea las
fuentes de Economía, Temporada o roster.

`/members` reutiliza `OwnMembershipSection`, `ActiveGroupMembersSection` y
`PendingGroupJoinRequestsSection`, conservando acciones, recovery y paginación.

La caja Resumen ubica junto a “Integrantes” un botón de icono que copia
`/join/groups/{groupId}`. `/members` conserva uno en su encabezado y elimina el duplicado interno de
Solicitudes.

- botón estable, foco conservado y 44×44 px;
- copiar + “Copiar enlace de solicitud”;
- éxito: check + “Enlace copiado” por 2 s;
- éxito sólo en `aria-live=polite` oculto; sin texto visible permanente;
- móvil no depende del tooltip;
- una operación en vuelo evita duplicados; clic posterior reinicia timer;
- unmount/cambio de Grupo cancela timer;
- error visible breve `role=alert`, icono restaurado y retry disponible.

## 6. Archivos previstos

| Área | Archivos / cambio previsto |
| --- | --- |
| Navegación | `GroupContextNavigation.tsx`: selector, tabs, orden/active state |
| Resumen | `[groupId]/page.tsx`: cards y compatibilidad hash |
| Integrantes | nuevo `[groupId]/members/page.tsx`; composición existente |
| Cards | cards Economía/Temporada y nuevas Novedades/Integrantes |
| Clipboard | control focal/compartido y reubicación desde Solicitudes |
| Cliente tareas | `dashboardTasksService.ts`, `DashboardTask.ts`, request gate |
| Backend tareas | contract, cursor, query, DTO/errors/tests; misma proyección |
| Índices | `firestore.indexes.json` sólo si plan confirma índice |
| Roster | sin cambios; reutilización de lector, paginación y componentes actuales |
| N20 | compositor de destino y compatibilidad URL anterior |

No modificar formularios Persona/Temporada, diagnóstico de consola, navbar/sidebar, Rules, writers,
colecciones ni scripts de proyección salvo wiring estricto del lector existente.

## 7. Plan de implementación futuro

1. Extender contratos/types/cursor N20/N31 aditivamente y conservar tests globales.
2. Implementar query filtrado y verificar/medir índice.
3. Crear `/members`, compatibilidad del hash y nuevo destino N20, reutilizando el roster intacto.
4. Reorganizar Resumen/navegación responsive sin cifra de integrantes.
5. Reubicar Clipboard con icono/check/timer/accesibilidad.
6. Ejecutar unitarias, Emulator, typecheck, lint focal, build, arquitectura, responsive y UAT.
7. Documentar implementación; evaluar cierre local sin mezclar rollout IUX-02.

## 8. Pruebas obligatorias

Tareas:

- global sin `groupId` compatible con IUX-02/IUX-03;
- filtrado, más de 10 items y cursor continuo;
- `totalTasks`, count/N20/N31, overlap sin duplicación;
- contexto ajeno/inexistente y revocaciones;
- READY vs cobertura incompleta, sin totales inciertos;
- cursores cruzados/alterados, otra cuenta/Grupo y generación sustituida;
- cero nuevas escrituras y misma proyección.

Roster:

- contrato, máximo 20, cursor, autorización e invariantes sin regresión;
- Owner sin/con Membresía; sin Temporada, archivado y cambio de Temporada;
- paginación multipágina intacta, sin total, aproximación ni nuevas escrituras;
- incompatibilidad observada continúa fallando cerrada.

Frontend/UAT:

- deep-links nuevo/anterior, `joinRequestId`, foco/localización;
- selector con historial, tabs URL/`aria-current`;
- 360×800, 390×844, 768×900, 1440×900 y zoom 200 % sin overflow;
- cargas/errores/reintentos independientes;
- copiar/check, foco, 44 px, clic repetido, timer/unmount, anuncio SR y error visible;
- acciones previas alcanzables; Owner sin Persona/Membresía y archivado sin regresión.

## 9. UAT, rollback y decisiones

UAT acredita orden, permisos, multipágina, navegación, accesibilidad y no regresión. Rollback futuro
revierte navegación, cards, `/members`, extensiones de readers/DTO/cursor y destino N20, conservando
temporalmente el hash. Sin persistencia nueva no hay datos a reparar.

IUX-04-D07 queda resuelta por diferimiento: IUX-04 no entrega total de integrantes ni modifica el
roster. D02 se sustituye sólo en ese alcance por esta resolución; la definición del conteo futuro se
preserva sin adoptar arquitectura. No quedan decisiones bloqueantes. Nombres internos y técnica del
tooltip pueden variar sin alterar resultados; check adoptado por 2 segundos.

## 10. Ampliacion UAT autorizada - cobertura de altas posteriores

La UAT del 3 de noviembre de 2026 autoriza que el alta canonica de Grupo emita, en su misma
transaccion, un evento determinista e idempotente de inicializacion de cobertura. Debe reutilizar
scope, outbox, trigger inmediato, worker, recuperacion cada minuto y reconciliacion diaria. El reader
permanece read-only y nunca sintetiza `READY/0`.

La Cuenta nueva sin Grupos conserva el contrato vacio acreditado `no-contexts-v1`: el backend
revalida que no existan contextos autorizados y devuelve cero sin persistir proyeccion. Al aparecer
el primer Grupo deja de aplicar ese caso vacio y se exige cobertura materializada del contexto.

**IUX-04-D08-A ADOPTADA:** toda alta nueva crea directamente el Grupo canonico activo schema v3,
con `ownershipRevision=1` y el resto de invariantes vigentes. Grupo, guard de idempotencia, scope y
`GROUP_COVERAGE_INITIALIZED` se confirman en una unica transaccion. La senal lleva
`coverageComplete=true` como alcance a comprobar y `activateOnComplete=true`; solo el full scan
completo puede materializar raiz/contexto del Owner y pasar la raiz live a `READY`. El proyector no
evoluciona el Grupo. Rebuild/backfill conservan su activacion explicita y no heredan esa marca.

Grupos v1 preexistentes no cambian por esta decision. Su reparacion UAT exige primero la capability
canonica `ensureOwnershipContext` bajo precondiciones (activo, v1, Owner valido, sin revision) y luego
la misma inicializacion determinista; queda separada de la regresion de altas nuevas y no autoriza
migracion masiva ni edicion manual.

Plazo: el trigger Firestore `onDashboardTaskOutboxCreate` intenta procesamiento inmediato cuando
Functions esta realmente ejecutando; `onDashboardTaskProjection` reintenta/recupera cada minuto y
la reconciliacion diaria repara drift. En Emulator, iniciar Functions/PubSub solo carga funciones:
la evidencia debe observar la invocacion del trigger y el evento `APPLIED`, no inferirla del arranque.

## 11. Cierre técnico local

IUX-04 queda implementado y validado técnicamente en local. La evidencia automatizada final acredita
alta canónica v3, recuperación/idempotencia del comando, inicialización de cobertura global y
contextual, N20/N31, cursores ligados al contexto, compatibilidad IUX-03 y autorización de registro
directo. El usuario confirmó N20 en Inicio y Novedades, y confirmó la desaparición del doble scroll y
del espacio inferior en el recorrido observado.

La confirmación humana no se extiende a N31, concurrencia, matriz completa de viewports, zoom real
200 %, Android real ni lector de pantalla. Esas comprobaciones son UAT complementaria y gates de
habilitación, no evidencia implícita. D07 mantiene diferido el conteo exacto de integrantes; Economía
personal por Membresía queda fuera. El diagnóstico `startTime/reportAllChanges` continúa separado y
sin causa atribuida. Este cierre no cierra IUX/E3, no habilita E4 y no satisface los gates productivos
pendientes de IUX-02.
