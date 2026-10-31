# IUX-03 — Relevamiento de `/dashboard/groups` mobile-first

## Estado y preflight

- Fecha: 2026-10-31.
- Alcance de esta intervención: relevamiento y documentación; sin cambios de código, dependencias,
  datos, configuración, documentos normativos, commits, ramas ni entornos remotos.
- Rama observada: `dev`.
- HEAD observado: `0cd1a7782a01c3439eee812db95c942d1cb6b8fd`.
- Upstream y divergencia: `origin/dev`, `dev` local 17 commits por delante.
- Working tree inicial: limpio.
- No existe `AGENTS.md` en el repositorio. Se aplicaron Documento 5 §§5.2–5.18 y §7.5A, la
  estructura de fichas vigente y los antecedentes IUX/E2/E3.
- ID adoptado para la definición: **`IUX-03`**. Se contrastaron archivos, referencias textuales, historial
  Git (`-S IUX-03`), tags y ramas locales/remotas conocidas; no se encontró uso ni reserva de
  `IUX-03`. La conclusión se limita a las referencias ya disponibles localmente: no se hizo `fetch`.

## Estado real de IUX y del entorno

IUX-01 no está sólo definido: su implementación y cierre técnico local están integrados en `dev`.
El historial contiene `52e20eb` (presentación), `8979ec4` (cierre técnico), el merge `21060db` y
`1ad6242` (registro de integración en `dev`). IUX-02A e IUX-02B también preceden a ese merge. El
[informe IUX-01](./IUX-01-informe-implementacion-dashboard-mobile-first.md) declara correctamente
el alcance local integrado, sin habilitación productiva.

Antes de D5-062, Documento 5 conservaba una fotografía anterior: §7.5A y su estado de redacción
decían que IUX-01/IUX-02 todavía no estaban implementados. D5-062 corrige esa deriva usando los
informes, cierres e historial Git comprobados: IUX-01 e IUX-02A/B están integrados y validados
técnicamente en local; IUX-02 completo continúa abierto y no hay habilitación productiva. La misma
decisión incorpora IUX-03 sin cerrar IUX/E3 ni habilitar E4.

La [guía de entorno local](./IUX-guia-entorno-local-emuladores.md),
`volley-ranking-frontend/.env.local.example` y
`volley-ranking-system/functions/.env.demo.example` están versionados en HEAD. La guía fue agregada
por `0cd1a77` y exige un único project ID `demo-*`, Auth/Firestore/Functions Emulator, secreto
sintético y proyección deshabilitada por defecto fuera del archivo local. No se verificó arranque en
esta intervención porque sólo se autorizó relevamiento/documentación.

## Vista y fuentes actuales

La ruta principal es
`volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx`. Hoy compone tres bloques
independientes:

1. Grupos propios mediante `listOwnGroups` y `GroupCard`;
2. Membresías actuales mediante `MyCurrentGroupMembershipsSection`;
3. historia propia mediante `OwnGroupMembershipHistorySection`.

El encabezado actual dice “Mis Grupos” y explica ownership/roles globales. Los dos listados activos
se presentan por separado y pueden repetir un Grupo cuando la persona es Owner e integrante. El
historial carga de inmediato y también repite la pertenencia actual. La vista puede mostrar dos
advertencias `PERSON_REQUIRED` —Membresías e historial— y ejecuta tres verificaciones de capability
por cada Grupo de Membresía cargado.

### Contratos disponibles

| Fuente | Ruta / servicio | DTO útil | Cobertura y paginación |
| --- | --- | --- | --- |
| Grupos administrados | `listOwnGroups` en `groupsService.ts`; `groupService.listOwnGroups`; `firestoreOwnGroupsReader.listByOwner` | `id`, `nombre`, `deporte`, `estado`, `ownerUserId`, `createdAt`, y `archivedAt` si aplica | Sin cursor ni límite de respuesta. Devuelve todos los Grupos cuyo `ownerId` coincide, incluidos archivados. El límite provisional hace pequeña la cardinalidad actual, pero el lector no debe asumirse paginado. |
| Membresías actuales | `listMyCurrentGroupMemberships` en `membershipsService.ts` | Membresía: `id`, `seasonId`, `estado`, `fechaIngreso`; Grupo: `id`, `nombre`, `deporte`, `estado`, `viewerIsOwner` | Cursor opaco; página por defecto y máxima 20. La consulta primaria toma raíces activas y luego omite las que no coinciden con la Temporada abierta, por lo que una página puede traer cero items y conservar `nextCursor`. |
| Historial propio | `listMyGroupMembershipHistory` | `rowKey`; Grupo `id/nombre`; Temporada `id/nombre`; `CURRENT/HISTORICAL`; ingreso/egreso; continuidad y cantidad de períodos | Cursor opaco; página por defecto y máxima 20; expone `nextCursor` y `hasMore`. Incluye historia actual y finalizada. No expone deporte ni estado del Grupo. |
| Capabilities de Economía | `getMyGroupTreasuryContext`, `getMyPaymentReviewContext`, `getMyDirectPaymentRecordContext` | Sólo acredita la capability solicitada para un `groupId`; no existe DTO global de capabilities en esta vista | Sin consulta global. La UI actual realiza hasta tres callables por cada tarjeta de Membresía. |
| Límite de creación | `createOwnGroup` / `firestoreGroupCreationGuard.confirmFirstGroup` | Error `PROVISIONAL_LIMIT_REACHED` | Es un guard transitorio por Usuario y una comprobación por `ownerId`; no es Plan, Suscripción ni derecho comercial. Archivar no libera cupo; una eliminación elegible sí puede liberarlo. |

## Hallazgos funcionales y técnicos

### Ownership, Persona y Membresía

- `ownerId` acredita administración; no crea Persona ni Membresía. D5-040 y E2-01 lo fijan de
  forma explícita.
- Una Persona vinculada tampoco acredita Membresía. La etiqueta `Integrás` sólo puede derivarse de
  una Membresía actual devuelta por el contrato correspondiente.
- `viewerIsOwner` en el DTO de Membresía permite corroborar la doble relación, pero la fuente de
  ownership debe seguir siendo `listOwnGroups`; no debe promoverse a Owner a partir de otro dato.
- Si falta Persona, no puede existir una Membresía propia válida. Ownership puede seguir cargándose
  y debe mostrarse. La página debe emitir una sola invitación neutra a `/profile/person`.

### Estados cerrados y archivados

- Grupo Owner `activo`: pertenece al listado principal.
- Grupo Owner `archivado`: sale del listado operativo y entra al apartado Historial; conserva destino
  Owner de consulta `/dashboard/groups/{groupId}`.
- Membresía actual: sólo entra al listado principal si sigue activa y coincide con la Temporada
  abierta exacta. La fuente puede omitir candidatos de una página por cierre/cambio de Temporada.
- Membresía finalizada y Temporada cerrada: permanecen en el historial. El historial debe conservar
  cada ocurrencia por `rowKey`; deduplicarlo por `groupId` destruiría cronología.
- Un Grupo archivado no admite acceso delegado nuevo/operativo; sus capacidades no deben sugerirse
  como vigentes. La historia de Membresía sigue siendo consulta, no autorización actual.

### Destinos autorizados y bloqueo de navegación

| Relación efectiva | Destino hoy acreditado | Observación |
| --- | --- | --- |
| Owner activo o archivado | `/dashboard/groups/{groupId}` | `getOwnGroup` autoriza sólo por ownership. Archivado queda en consulta. |
| Integrante sin capability | **No existe destino canónico de detalle propio** | Las rutas legacy `/profile/groups/{groupId}` redirigen al listado. Enviar aquí a `/dashboard/groups/{groupId}` termina en una superficie cuyo resumen es Owner-only. |
| Integrante con `GROUP_TREASURY` o `GROUP_DIRECT_PAYMENT_RECORD` | `/dashboard/groups/{groupId}/economy?tab=debts` | La operación revalida la capability. |
| Integrante con `GROUP_PAYMENT_NOTICE_REVIEW` | `/dashboard/groups/{groupId}/economy?tab=notices` | La operación revalida la capability y prohíbe autorevisión. |
| Integrante con varias capabilities | Más de un tab autorizado dentro de Economía | No corresponde elegir silenciosamente uno si con ello se oculta el otro acceso. |

Hay además un defecto previo relevante: `GroupFrame.membershipGroupName` y
`GroupContextNavigation.loadContexts` solicitan `pageSize: 50`, pero el contrato de Membresías
acepta como máximo 20. Esto puede impedir la resolución del contexto delegado y no debe heredarse
en IUX-03. Se registra como evidencia; no se corrige en este corte documental.

**Decisión aprobada:** incorporar la ruta member-safe
`/dashboard/groups/{groupId}/membership`, con título visible “Mi participación”. La tarjeta
`Integrás` enlaza allí; esa superficie ofrece el vínculo propio, Grupo y Temporada, conserva “Salir
del grupo” y, después de revalidar, presenta todos los accesos económicos disponibles. Si también
hay ownership, prevalece el destino Owner y ambas etiquetas se conservan. No crea otra
administración del Grupo, no amplía permisos y evita consultas de capabilities por tarjeta.

La URL queda bajo el layout dinámico actual de Grupo. `GroupFrame.resolveAccess` hoy acredita
primero ownership y, de no existir, exige al menos una capability económica; por eso un integrante
sin capability no puede alcanzar la nueva página. IUX-03 debe volver ese frame un guard contextual
genérico que admita una Membresía actual propia, mientras cada página conserva su guard específico:
el resumen sigue Owner-only, Economía sigue capability/Owner y “Mi participación” exige la
Membresía propia. `GroupContextNavigation` tampoco debe ofrecer Economía a un integrante puro.

### Brecha contractual de “Mi participación”

`listMyCurrentGroupMemberships` permite acreditar la relación recorriendo páginas, pero no es un
contrato apropiado para un deep-link por `groupId`: obliga a escanear una lista global, puede devolver
páginas intermedias vacías con cursor y sólo expone `seasonId`, no el nombre de Temporada requerido
por la pantalla. Los contratos Owner de Membresía/Temporada no autorizan al integrante.

Se requiere el contrato mínimo `getMyCurrentGroupMembershipContext({ groupId })`, dentro del módulo
Membresías, sin almacenamiento nuevo. Debe resolver Cuenta y Persona propias, acreditar exactamente
una Membresía activa íntegra del par Persona–Grupo y su Temporada abierta exacta, y devolver:

- `group: { id, nombre, deporte, estado, viewerIsOwner }`;
- `season: { id, nombre, estado: "abierta" }`;
- `membership: { id, estado: "activa", fechaIngreso }`.

Inexistencia, pertenencia ajena y vínculo no vigente deben converger en una respuesta no enumerable;
incompatibilidad persistida y dependencia no disponible permanecen diferenciadas. Este lector no
infiere capabilities ni las concede. Los tres contextos económicos existentes se consultan en
paralelo sólo después de acreditar la Membresía y sus fallos se presentan por acceso, sin convertir
la pantalla completa en falsa ausencia del vínculo.

### Deduplicación y cobertura

Para el listado principal se puede usar un `Map<groupId, PresentableGroup>` en frontend:

1. incorporar sólo Grupos propios activos con `administers=true`;
2. consumir **todas** las páginas de Membresías actuales, incluso páginas vacías con cursor;
3. incorporar cada Grupo de Membresía con `participates=true`;
4. al coincidir `groupId`, conservar una tarjeta, unir flags y usar el DTO Owner como autoridad de
   estado, sin perder el `membershipId` requerido por acciones propias;
5. ordenar el snapshot cargado por nombre con comparación española y desempatar por `groupId`.

El historial se mantiene separado y distingue visualmente Grupos propios archivados de
pertenencias. No se deduplican las filas históricas por Grupo. Una fila `CURRENT` sólo puede omitirse
si el mismo vínculo —no sólo el mismo `groupId`— ya está acreditado y visible en el listado
principal; si la fuente principal falló, sigue parcial o no lo representó, la fila se conserva al
abrir Historial. `rowKey` preserva la identidad cronológica y los períodos no se colapsan.

Ownership y Membresías cargan de forma independiente. Cada fuente publica inmediatamente los Grupos
que ya acreditó y conserva su propio loading/error/reintento; la interfaz anuncia “resultados
parciales” mientras otra fuente siga pendiente o haya fallado. Los filtros pueden operar sobre ese
snapshot si comunican la limitación. Sólo se muestran vacíos definitivos cuando ambas fuentes
terminan correctamente y Membresías agotó `nextCursor`; nunca se muestran contadores completos.
Cada solicitud queda ligada a la sesión/generación activa y respuestas anteriores se descartan.

El historial puede cargarse de forma diferida al abrir el plegable y paginarse con “Cargar más”. Su
fallo no convierte el listado principal en vacío, pero sí debe mostrarse dentro del apartado como
error separado. No se muestran contadores de filtros o historia a partir de páginas parciales.

### Información disponible sin consultas por tarjeta

Los DTO actuales alcanzan para las tarjetas: nombre, deporte, estado operativo, `groupId`,
`Administrás`, `Integrás`, doble relación y datos de historial. No alcanzan para el deep-link “Mi
participación”: falta consulta directa segura y nombre de Temporada. Tampoco exponen el conjunto de
capabilities. Por eso se adopta el lector contextual mínimo anterior, se mantienen fuera del DTO de
tarjeta las capabilities y se ejecutan sus tres contextos existentes sólo al abrir la nueva ruta.
No se justifica una proyección global.

## Ajuste mínimo propuesto

La unificación visual cabe en frontend reutilizando contratos existentes si se acepta:

- publicar resultados acreditados por fuente y agotar Membresías antes de afirmar cobertura total;
- mantener historial paginado y lazy;
- agregar un helper de presentación puro para merge/deduplicación/estado;
- implementar la ruta member-safe con un lector contextual mínimo por `groupId`;
- adaptar el frame/layout para integrante sin capability sin relajar los guards de cada página;
- cambiar los `pageSize: 50` afectados a 20 **y continuar todos sus cursores**.

No se justifica una nueva colección, proyección, índice, writer, permiso o cambio de dominio. El
nuevo callable es una consulta contextual mínima sobre autoridades existentes, no una proyección ni
una nueva fuente de verdad.
