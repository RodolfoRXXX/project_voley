# Addendum a Documentos 2, 3 y 4 — IUX-04 / detalle de Grupo mobile-first

## Estado

- **Naturaleza:** complemento normativo focal adoptado.
- **Estado documental:** `ADOPTADO; D07 DIFERIDA; D08-A IMPLEMENTADA; CIERRE TÉCNICO LOCAL`.
- **Fecha:** 2026-11-02.
- **Base:** `dev@1ab39b3`.
- **Incremento:** [IUX-04](../implementacion/interetapa-ux-movil/IUX-04-ficha-detalle-grupo-mobile-first.md).
- **Relevamiento:** [detalle de Grupo](../implementacion/interetapa-ux-movil/IUX-04-relevamiento-detalle-grupo-mobile-first.md).
- **Implementación:** no autorizada; requiere autorización posterior separada.

Este addendum adopta IUX-04-D01–D06 sin reabrir IUX-02, IUX-03, E2-11 ni los permisos de Grupo,
Membresía, Temporada, Solicitud o Economía. No cierra IUX/E3 ni habilita E4.

## 1. Complemento funcional para Documento 2

### 1.1 Detalle Owner

El Owner vigente de un Grupo puede navegar por Resumen, Economía, Temporada e Integrantes mediante
rutas propias. En móvil se usa un selector de sección y desde `md` tabs. La URL es autoridad de
navegación y preserva recarga, deep-link y Atrás/Adelante.

El Resumen presenta, en orden:

1. Novedades N20/N31;
2. Economía;
3. Temporada;
4. Integrantes.

Las cajas son independientes. Resumen no ejecuta decisiones de Solicitud ni Entrega. Economía y
Temporada conservan contenido, autorización y acciones. El acceso de Temporada se denomina “Abrir
temporada”; no ejecuta por sí mismo el comando de apertura.

`/dashboard/groups/{groupId}/members` es el destino Owner de Integrantes y reúne Mi membresía,
roster y solicitudes con los contratos vigentes. Ownership no crea Persona ni Membresía y no suma
un integrante. Administrar no requiere Persona/Membresía propia.

Grupo archivado conserva accesos actuales y no obtiene roster histórico, integrantes actuales ni
acciones nuevas. Mi participación permanece member-safe y no se convierte en administración.

### 1.2 Novedades y deep-links

Novedades reutiliza exclusivamente N20/N31 de IUX-02. Cada item enlaza a la superficie canónica y
allí se revalida autorización y estado.

- N20: `/dashboard/groups/{groupId}/members?joinRequestId={requestId}`.
- N31: `/dashboard/groups/{groupId}/economy?tab=notices&deliveryId={deliveryId}`.
- El deep-link N20 anterior con `#integrantes` se conserva y localiza la misma solicitud.

No se crean notificaciones, campana, leído/oculto, prioridades, N30 ni tipos nuevos.

### 1.3 Integrantes y conteo diferido

IUX-04 no presenta cantidad de integrantes. La caja Resumen conserva título, copia de invitación,
solicitudes pendientes acreditadas y acceso a `/members`; no muestra cero, aproximación ni longitud
de la primera página.

La definición futura se conserva: “Integrantes activos” será la cantidad exacta de Membresías
activas canónicamente válidas de un Grupo activo ligadas a su única Temporada actualmente abierta.

- excluye solicitudes, Membresías finalizadas y otras Temporadas;
- ownership solo no cuenta;
- sin Temporada abierta no existe conteo actual;
- archivado no presenta integrantes actuales;
- cero requiere scope válido y total acreditado.

Solicitudes pendientes se acredita mediante N20 contextual sólo con coverage completa y
autorización vigente. No se deducen cantidades de una primera página.

### 1.4 Invitación

El enlace `/join/groups/{groupId}` y sus permisos no cambian. El Resumen ofrece un botón de icono
junto a “Integrantes”; `/members` conserva un único acceso equivalente y evita duplicarlo dentro de
Solicitudes.

El botón mantiene foco y 44×44 px, no depende del tooltip para uso táctil, cambia temporalmente de
copiar a check, actualiza nombre/tooltip de “Copiar enlace de solicitud” a “Enlace copiado”, anuncia
éxito sólo a lectores de pantalla y muestra un error visible breve con reintento si Clipboard falla.

## 2. Complemento conceptual/técnico para Documento 3

### 2.1 Consulta N20/N31 global y contextual

`listMyDashboardTasks` admite:

```text
coverage=N20_N31_V1
groupId opcional
cursor opcional
```

Sin `groupId`, preserva exactamente el alcance global. Con `groupId`, exige un contexto autorizado,
filtra items y liga el cursor al filtro. Un cursor no cruza cuenta, coverage, generación, versión,
orden ni `groupId | null`.

El DTO contextual por Grupo es:

```text
{ groupId, count, N20, N31 }
count = N20 + N31
```

`count` conserva compatibilidad. `totalTasks` significa:

- global: suma deduplicada N20+N31 de todos los contextos autorizados;
- filtrado: suma deduplicada N20+N31 sólo del Grupo solicitado.

En modo filtrado, `groupTaskCounts` contiene exactamente el Grupo; en global contiene todos los
contextos autorizados. Totales/desglose sólo existen con coverage completa y READY. Revocación,
archivo, cambio de ownership, lifecycle o fuente resuelta excluye el contexto/item en nueva
consulta. El destino revalida nuevamente.

La consulta global evalúa salud sobre todos los contextos autorizados. La filtrada evalúa la
generación/root y el scope/contexto solicitado: degradación de otro Grupo no contamina el filtro,
pero cualquier incompletitud del solicitado omite totales/desglose. Resumen comparte una única
carga filtrada entre Novedades e Integrantes; no ejecuta consultas por card ni por item.

### 2.2 Roster sin extensión de conteo

`listActiveGroupMembersForOwnedGroup` mantiene sin cambios entrada, máximo 20, cursor, autorización,
invariantes y respuesta E2-11. IUX-04 no agrega `totalItems`, aggregate count, barrido exhaustivo,
límite artificial ni proyección/contador. `/members` consume todas las páginas necesarias mediante
el cursor vigente; Resumen no deriva ningún total de ese listado.

El conteo exacto queda como mejora diferida. Este addendum no diseña su arquitectura ni le asigna un
nuevo incremento.

## 3. Complemento de arquitectura para Documento 4

### 3.1 Consulta filtrada de tareas

Se reutilizan generación, items, contextos y contadores IUX-02. El query filtrado incorpora
`groupId` y conserva `projectionState=ACTIVE` y orden vigente. Requiere verificar el índice:

```text
items (COLLECTION):
groupId ASC, projectionState ASC, actionableAt DESC, taskType ASC, resourceId ASC
```

El índice global permanece. No hay otra proyección ni escrituras de consulta.

### 3.2 No cambio del roster

IUX-04 reutiliza el lector, transacción, índices y paginación existentes. No introduce costo, locks,
reintentos o índices propios de agregación. Páginas independientes conservan el comportamiento
concurrente vigente y no se presenta un snapshot global del roster.

### 3.3 Presentación y accesibilidad

Cada card mantiene carga/error/retry independiente. La navegación usa `md` como breakpoint inicial
y debe probar 360/390/768/1440 y zoom 200 %. Selector, tabs, icono Clipboard, regiones vivas y foco
forman parte del contrato accesible.

## 4. Compatibilidad

- Consumidores globales IUX-01/IUX-02 no envían `groupId` y conservan comportamiento.
- IUX-03 conserva `groupTaskCounts[].count`; N20/N31 son campos aditivos.
- Cursors anteriores globales siguen siendo globales; nunca se reinterpretan como filtrados.
- El hash N20 anterior permanece reconocido.
- Economía, Temporada, Mi participación, roster y Solicitudes conservan permisos/acciones.

## 5. Pruebas normativas mínimas

1. global y filtrado, autorización y revocación;
2. coverage incompleta sin totales/desglose;
3. paginación >10, cursor cruzado/alterado/expirado;
4. compatibilidad IUX-02/IUX-03 y ausencia de writes;
5. roster >20 paginado sin total ni aproximación; Owner con/sin Membresía;
6. lector, autorización, invariantes y cursores sin regresión;
7. sin Temporada, archivado y cambio concurrente de Temporada;
8. ausencia de nuevas escrituras, agregados e índices de roster;
9. deep-links anterior/nuevo, navegación mobile-first y accesibilidad Clipboard;
10. cargas, errores y reintentos independientes por caja.

## 6. Decisiones adoptadas y no efectos

| ID | Decisión | Estado |
| --- | --- | --- |
| IUX-04-D01 | filtro `groupId` opcional, autorizado y ligado al cursor | ADOPTADA POR D5-064 |
| IUX-04-D02 | total exacto propuesto; sustituido en IUX-04 por diferimiento, conservando definición futura | SUPERADA POR D07 |
| IUX-04-D03 | desglose N20/N31 desde proyección existente sólo con coverage completa | ADOPTADA POR D5-064 |
| IUX-04-D04 | `/members` canónico y compatibilidad del deep-link anterior | ADOPTADA POR D5-064 |
| IUX-04-D05 | accesos archivados actuales, sin roster histórico/acciones | ADOPTADA POR D5-064 |
| IUX-04-D06 | breakpoint inicial `md`, sujeto a validación | ADOPTADA POR D5-064 |
| IUX-04-D07 | diferir el total fuera de IUX-04, sin elegir arquitectura ni asignar incremento | RESUELTA; ADOPTADA POR D5-064 |
| IUX-04-D08-A | alta nueva directa v3 con `ownershipRevision=1` e inicializacion atomica de cobertura | ADOPTADA POR D5-065 |

La implementación local posterior fue autorizada y queda cerrada técnicamente; no autoriza deploy,
datos productivos, cierre de IUX/E3, habilitación de E4 ni rollout productivo IUX-02. La UAT humana
complementaria y los gates productivos permanecen explícitos en el informe y el cierre.

## 7. Addendum UAT - inicializacion automatica posterior al backfill

Se autoriza la senal minima `GROUP_COVERAGE_INITIALIZED` atomica con el alta canonica de Grupo,
determinista por `groupId`, con scope `DIRTY`, cobertura declarada completa solo como alcance a
procesar y `READY` exclusivamente despues del avance contiguo del worker. Reintentos del comando y
eventos duplicados no incrementan revision. N20/N31 concurrentes conservan revisiones crecientes y
no pueden ser sobrescritos por una revision anterior. El trigger on-create es la via inmediata; el
scheduler de un minuto es recuperacion y la reconciliacion diaria se conserva.

La Cuenta sin Grupos usa el vacio revalidado `no-contexts-v1` sin documentos derivados. La primera
relacion contextual invalida ese caso y exige proyeccion acreditada.

**IUX-04-D08-A queda ADOPTADA:** Grupos nuevos nacen directamente como schema v3 activo con
`ownershipRevision=1`. La misma transaccion crea el guard y prepara scope/evento determinista de
inicializacion. El full scan acredita Owner, raiz y contexto incluso con cero N20/N31; la raiz live se
activa solo al completar esa senal. Rebuild/backfill mantienen activacion operativa separada. El
proyector no evoluciona el Agregado, el reader no escribe y metadata ausente no equivale a cero.

Los v1 anteriores se reparan unicamente mediante la evolucion canonica con precondiciones y una
inicializacion determinista posterior, nunca por edicion manual o migracion masiva.

## 8. Resultado de implementación

D08-A quedó implementada mediante el alta canónica v3 y la señal determinista en la misma
transacción. Outbox, worker, recuperación y reconciliación existentes se reutilizan; readers siguen
sin escrituras. Las regresiones locales acreditan idempotencia, evento duplicado, N20/N31 y
compatibilidad global/contextual. La denegación
`ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED` continúa siendo el resultado autoritativo esperado para un
integrante sin capability y no amplía permisos.

La evidencia humana sólo confirma N20 en Inicio/Novedades y la corrección visual del doble scroll y
espacio inferior en el recorrido observado. No acredita N31, concurrencia, zoom 200 %, Android real
ni lector de pantalla. D07 y las exclusiones originales permanecen sin cambios.
