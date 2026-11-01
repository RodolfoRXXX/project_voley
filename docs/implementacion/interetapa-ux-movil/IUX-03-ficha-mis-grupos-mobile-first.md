# IUX-03 — “Mis grupos” mobile-first y acceso “Mi participación”

## Estado de la ficha

- Estado: **CERRADO EN SU ALCANCE LOCAL — UAT HUMANA APROBADA**.
- Responsable: a designar.
- Fecha: 2026-10-31.
- Rama/checkpoint de relevamiento: `dev@0cd1a7782a01c3439eee812db95c942d1cb6b8fd`.
- Etapa: Interetapa UX móvil (`IUX`) entre E3 y E4; no cierra E3 ni habilita E4.
- ID: `IUX-03`, adoptado por D5-062.
- Fuente técnica: [relevamiento IUX-03](./IUX-03-relevamiento-mis-grupos-mobile-first.md).

Esta ficha incorpora IUX-03-D01–D05 aprobadas y la decisión D5-062. Queda lista para una
implementación posterior expresamente autorizada. No autoriza código por sí sola ni modifica
permisos, Agregados, persistencia, cierre de IUX/E3 o habilitación de E4.

## 1. Identificación

- Nombre: mejora mobile-first de `/dashboard/groups` (“Mis grupos”).
- Casos incluidos: consulta unificada de Grupos administrados y participados; filtros de relación;
  historial plegable; estados de carga/error/vacío/Persona; acceso secundario a creación; navegación
  sólo a destinos autorizados; ruta member-safe “Mi participación”; corrección acotada de paginación.
- Exclusiones: búsqueda; nuevas clases de pendientes fuera de N20/N31; métricas globales; Plan/Suscripción;
  cambio del límite de creación; navbar/sidebar; rediseño del detalle de Grupo; roles/permisos;
  nuevas capabilities; modificación de dominio; proyección/backend nuevo por defecto; despliegue.
- Normativa relacionada: Documento 5 §§5.2–5.18, §7.5A, D5-025/026/033–036/040/058–062; E2-01,
  E2-04, E2-10, E2-19, E2-23, E2-24 y capacidades E3-02/E3-03/E3-04.
- Brechas atendidas: duplicación de Grupo por relación, jerarquía desktop-first, dobles avisos de
  Persona, vacío prematuro, historial siempre expandido y navegación que puede confundir ownership,
  Membresía y capability.

## 2. Objetivo funcional

Presentar una sola vista simple y mobile-first donde el usuario reconozca qué Grupos administra y/o
integra sin exponer conceptos internos. Cada Grupo operativo aparece una vez y conserva relaciones
reales independientes. El historial queda disponible sin competir con la tarea principal. Ningún
estado parcial se comunica como cobertura completa y ningún enlace amplía autorización.

## 3. Actores

| Actor | Participación | Contexto | Resultado esperado |
| --- | --- | --- | --- |
| Usuario autenticado | Principal | Cuenta canónica | Consulta sus relaciones reales y navega a un destino autorizado |
| Owner | Relación contextual | `group.ownerId == uid` | Ve `Administrás`, incluso sin Persona/Membresía |
| Integrante | Relación contextual | Membresía activa propia y Temporada abierta exacta | Ve `Integrás`, sin inferir ownership |
| Holder de capability | Autorización adicional | Capability vigente y revalidada | Conserva acceso a Economía sin convertirse en Owner ni “integrante” por la capability |
| Sistema | Coordinador de lectura | Contratos existentes | Evita vacíos y filtros completos sobre cobertura parcial |

## 4. Precondiciones

1. Sesión autenticada y Cuenta canónica disponible.
2. Ownership se deriva sólo del contrato de Grupos propios.
3. Participación se deriva sólo del contrato de Membresías actuales; Persona no basta.
4. La falta de Persona no invalida ownership y produce una única invitación neutra.
5. La creación conserva el guard provisional vigente de un Grupo propio; **no es una regla
   comercial ni un Plan**.
6. La ruta member-safe adoptada es `/dashboard/groups/{groupId}/membership`, título visible “Mi
   participación”; no constituye administración ni detalle Owner.
7. Todo consumidor paginado usa `pageSize <= 20` y continúa hasta `nextCursor == null` cuando deba
   afirmar cobertura completa.

## 5. Flujo principal

1. El usuario abre `/dashboard/groups` y ve el encabezado **“Mis grupos”**.
2. La página inicia ownership y Membresías actuales como fuentes independientes. Cada una publica
   inmediatamente sus Grupos acreditados y expone su propio loading/error/reintento.
3. Mientras una fuente esté pendiente o fallida, la UI anuncia cobertura parcial. Los filtros operan
   sólo sobre resultados cargados y no se muestran vacíos definitivos ni contadores completos.
4. El cliente agota cada cursor de Membresías, incluso si una página intermedia no trae items.
5. Un helper puro une por `groupId`, conserva `administers`/`participates` independientemente y
   retiene los identificadores necesarios para navegación/acciones.
6. Ordena el snapshot cargado por nombre con comparación española y desempata por `groupId`, sin
   presentar las respuestas independientes como transacción global.
7. Se muestran filtros `Todos`, `Administro` y `Participo`; `Todos` queda seleccionado inicialmente.
8. Cada tarjeta compacta muestra nombre, deporte, estado y las etiquetas `Administrás` y/o
   `Integrás`. La tarjeta completa es un único enlace con chevron; no contiene botones o enlaces
   anidados.
9. En móvil se usa una columna. En escritorio se usan dos columnas y tres sólo cuando el ancho útil
   lo permite, sin fijar tres columnas por cantidad de items.
10. “Crear grupo” aparece como acceso secundario. El backend conserva `PROVISIONAL_LIMIT_REACHED` y
   la UI no menciona Planes.
11. “Historial” aparece plegado inicialmente. Al abrirlo se carga su primera página; “Cargar más”
   conserva la paginación real.
12. Una tarjeta sólo `Integrás` abre “Mi participación”. El guard acredita directamente la Membresía
    actual propia; la pantalla muestra Grupo, Temporada y vínculo, y conserva “Salir del grupo”.
13. Recién después de acreditar la Membresía, la ruta consulta las tres capabilities existentes y
    muestra todos sus destinos autorizados. Sus fallos no inventan relación ni ownership.
14. Si la tarjeta también tiene `Administrás`, abre el detalle Owner y conserva ambas etiquetas.
15. Todas las respuestas asíncronas quedan ligadas a sesión/generación; las tardías de otra sesión
    se descartan.

No se modifica ningún Agregado, no hay persistencia nueva y no se producen efectos posteriores.

## 6. Flujos alternativos y errores

| Condición | Respuesta funcional | Estado resultante | Feedback | Reintento |
| --- | --- | --- | --- | --- |
| Ownership o Membresías cargando | Mostrar lo ya acreditado y marcar cobertura parcial | `partial-loading` | Estado por fuente, distinto de vacío | Automático |
| Falla una fuente principal | Conservar Grupos de la otra fuente; no afirmar cobertura total | `partial-error` | Error y “Reintentar” sólo para esa fuente | Sí |
| Página vacía con cursor | Continuar paginación | `loading` | Sin falso vacío | Automático |
| Ambas fuentes completas y sin items | Vacío verdadero | `ready-empty` | “Todavía no tenés grupos” | No aplica |
| `Participo` sin coincidencias con cobertura completa | Lista filtrada vacía | `ready-filter-empty` | “No integrás ningún grupo actualmente” | No aplica |
| Falta Persona | Ownership sigue visible; no consultar/repetir historia privada | `person-required` parcial | Una sola invitación neutra a completar ficha personal | Tras completar Persona |
| Historial aún no abierto | No consultar historia | `collapsed` | Sólo encabezado/control plegable | Al abrir |
| Historial completo sin filas visibles no representadas | Vacío del apartado | `history-empty` | “No hay historial para mostrar” | No aplica |
| Falla historial | Listado principal intacto | `history-error` | Error y reintento dentro del plegable | Sí |
| Capability revocada al navegar | Destino falla cerrado | `not-authorized` | Mensaje del módulo y retorno a Mis grupos | Tras recuperar acceso |
| Límite provisional al crear | No crear | sin cambios | Mensaje vigente, sin ofrecer Plan | No mientras persista límite |
| Deep-link ajeno, finalizado o sin Temporada abierta exacta | No exponer contexto | `not-accessible` | Mensaje no enumerable y retorno | Tras recuperar vínculo |
| Una capability falla/revocada | Conservar vínculo y otros accesos acreditados | `capability-partial` | Acceso omitido/error acotado; sin falsa ausencia | Sí |

## 7. Postcondiciones y criterios de aceptación

### Postcondiciones

- No cambia estado de dominio ni persistencia.
- Ownership, Membresía, historia y capabilities conservan sus fuentes de verdad.
- Las secciones actuales separadas dejan de ser la presentación principal, no su autoridad.
- No se crean contadores, eventos, colecciones, índices ni permisos; los badges reutilizan los
  contadores contextuales derivados de IUX-02.

### Criterios de aceptación

1. Dado un Owner sin Persona ni Membresía, cuando carga la vista, entonces ve una tarjeta con
   `Administrás`, ninguna etiqueta `Integrás` y una única invitación neutral a completar la ficha.
2. Dada una persona con Membresía pero sin ownership, entonces ve una tarjeta con `Integrás` y nunca
   es enviada a una ruta exclusiva del Owner.
3. Dado el mismo `groupId` en ownership y Membresías, entonces aparece una sola tarjeta con ambas
   etiquetas.
4. Dada una fuente principal fallida o pendiente, entonces los Grupos ya acreditados por la otra
   siguen visibles, la cobertura parcial es explícita, no aparece un vacío definitivo ni contador
   global y existe reintento por fuente.
5. Dada una página de Membresías vacía con `nextCursor`, entonces la carga continúa hasta terminar o
   fallar.
6. Dada cobertura completa sin Grupos, entonces el único vacío principal es “Todavía no tenés grupos”.
7. Dado `Participo` sin items, entonces se muestra “No integrás ningún grupo actualmente”.
8. Dado Historial cerrado, entonces no se consulta; al abrirlo vacío se muestra “No hay historial
   para mostrar”. Una fila `CURRENT` sólo se omite si ese vínculo exacto ya está visible en principal.
9. Dado un Grupo propio archivado, entonces no aparece como operativo y queda disponible en
   Historial con destino Owner de consulta.
10. Dada una Membresía finalizada o una Temporada cerrada, entonces no se presenta como participación
    actual y su cronología permanece en Historial.
11. Dado un holder de una o más capabilities, entonces las conserva en un destino revalidado sin que
    la tarjeta afirme ownership o participación por la capability.
12. Cada tarjeta enlazada contiene un solo objetivo interactivo y chevron, sin controles anidados.
13. En 360 px y 390 px no hay overflow horizontal, truncado de relación ni objetivo táctil menor a
    44×44 px; en escritorio la grilla usa dos o tres columnas según espacio.
14. Navbar/sidebar y detalle Owner permanecen visual y funcionalmente fuera del rediseño.
15. Dado un integrante sin capability, entonces abre “Mi participación” sin atravesar un guard Owner
    ni recibir un enlace a Economía; puede ejecutar el flujo vigente de salida.
16. Dadas varias capabilities, “Mi participación” conserva todos los destinos vigentes, sin elegir
    uno silenciosamente ni convertirlos en etiquetas de relación.
17. Nombre se ordena con comparación española y `groupId` resuelve empates de forma estable.
18. Un logout/cambio de cuenta descarta páginas y respuestas de la sesión anterior.

## 8. Frontend

### Composición aprobada

- Encabezado: “Mis grupos”, sin explicación de ownership, roles globales ni detalles internos.
- Filtros: `Todos` (inicial), `Administro`, `Participo`; sin contadores dentro de los filtros.
- Tarjeta: nombre; deporte; estado (`Activo` o `Archivado` sólo en Historial); etiquetas de relación;
  chevron; enlace completo.
- Historial: `details`/disclosure accesible o componente equivalente, contraído inicialmente.
- Crear grupo: enlace secundario separado de la lista.
- Sin búsqueda, N30, métricas nuevas ni acciones embebidas en tarjeta. La ampliación UAT agrega un
  badge informativo N20/N31 cuando la cobertura contextual IUX-02 está completa.

### Destinos adoptados

| Caso | Destino |
| --- | --- |
| `Administrás` (con o sin `Integrás`) | `/dashboard/groups/{groupId}` |
| Sólo `Integrás` | `/dashboard/groups/{groupId}/membership`, título “Mi participación” |
| Grupo Owner archivado en Historial | `/dashboard/groups/{groupId}` en modo consulta |
| Capability de deudas/registro | Desde la ruta member-safe a `/dashboard/groups/{groupId}/economy?tab=debts` |
| Capability de revisión | Desde la ruta member-safe a `/dashboard/groups/{groupId}/economy?tab=notices` |

No se adopta `/dashboard/groups/{groupId}` para un integrante puro: el resumen actual es Owner-only.
La nueva página comparte URL/layout contextual, pero no puede depender de superar ownership o una
capability; el frame acredita también la Membresía y cada hijo conserva su guard específico.

### Contenido de “Mi participación”

- encabezado visible “Mi participación” y nombre del Grupo;
- deporte y estado operativo del Grupo;
- nombre de Temporada abierta;
- vínculo propio: estado activo y fecha de ingreso;
- acción “Salir del grupo” con confirmación, single-flight, recuperación/reintento, estados de
  Temporada cerrada y limpieza posterior ya vigentes;
- bloque “Accesos económicos” sólo con los destinos que sus contextos acrediten: Deudas/consulta,
  Pagos informados y/o Registro directo, sin presentarlos como ownership o participación.

No incluye roster, solicitudes, edición, Temporadas Owner, administración de accesos ni resumen
económico Owner.

### Validación visual

| Viewport | Validación mínima |
| --- | --- |
| 360×800 | Una columna; filtros utilizables sin overflow; textos y etiquetas legibles; tarjeta completa enfocada |
| 390×844 | Igual cobertura; estados de error, vacío, Persona e Historial abierto |
| 768/1024 | Transición estable a dos columnas sin saltos ni tarjetas excesivamente estrechas |
| 1280/1440 | Dos o tres columnas según ancho útil; sidebar intacta; líneas de lectura compactas |
| 200% zoom | Reflow sin pérdida de contenido/acción y sin controles superpuestos |

## 9. Servicio de Aplicación responsable

- Módulo propietario del nuevo lector: Membresías; Grupos/Temporada aportan contexto público
  interno y las capabilities económicas permanecen en sus módulos.
- Servicios: `groupService.listOwnGroups`, `membershipService.listMyCurrentGroupMemberships` y
  `membershipService.listMyGroupMembershipHistory`; se agrega
  `membershipService.getMyCurrentGroupMembershipContext` para el deep-link.
- Operación coordinada: composición de lista en frontend y consulta contextual directa por
  `groupId` en Membresías; no crea Servicio de Dominio ni fuente de verdad.
- Autorizaciones: autenticación, self-account, Persona para Membresías/historia, ownership y cada
  capability revalidada por su backend.
- Habilitación comercial: NO APLICA. Se conserva un guard provisional técnico de creación.
- Repositorios: lectores específicos existentes; sin repositorio genérico ni acceso Firestore cliente.
- Respuesta: DTO existentes para lista/historia, DTO contextual mínimo para “Mi participación” y
  modelo de presentación efímero.

## 10. Agregados y reglas

| Agregado | Participación | Operación | Invariantes | ¿Se modifica? |
| --- | --- | --- | --- | --- |
| Grupo | Fuente de ownership/estado | Consulta | Owner independiente de Membresía; archivado no operativo | No |
| Membresía | Fuente de participación/historia | Consulta | Persona+Grupo+Temporada; vigencia real | No |
| Temporada | Contexto de Membresía | Consulta indirecta | Una pertenencia actual coincide con abierta exacta | No |
| Capability/Grant | Autorización económica | Revalidación en destino | No crea ownership ni participación | No |

## 11. Consultas y contratos públicos

| Proveedor | Consumidor | Capacidad | Información mínima | Errores relevantes |
| --- | --- | --- | --- | --- |
| Grupos | Mis grupos | `listOwnGroups` | DTO completo propio | sesión, Cuenta, dependencia |
| Membresías | Mis grupos | `listMyCurrentGroupMemberships` | relación actual + Grupo + cursor | Persona, cursor, incompatibilidad, dependencia |
| Membresías | Historial | `listMyGroupMembershipHistory` | filas cronológicas + cursor/hasMore | Persona, cursor stale, incompatibilidad |
| Membresías | Mi participación / frame | `getMyCurrentGroupMembershipContext` nuevo | Grupo, Temporada abierta y Membresía propia activa | sesión, Cuenta/Persona, no accesible, incompatibilidad, dependencia |
| Tesorería/Entregas/Recepciones | Ruta member-safe/Economía | contextos por `groupId` | capability acreditada | revocación/no autorizado |

El contrato Owner es completo y no paginado. Los dos contratos de Membresía paginan hasta 20. La
unificación no necesita un callable global ni proyección. El deep-link sí necesita una consulta
directa mínima: reutilizar el listado exigiría escanear páginas y no aportaría nombre de Temporada.

## 12. DTO de entrada y salida

El modelo efímero de presentación del listado será:

```text
PresentableGroup {
  groupId, name, sport, state,
  administers: boolean,
  participates: boolean,
  membershipId?: string,
  archivedAt?: string
}
```

Reglas: `administers` sólo desde ownership; `participates` sólo desde Membresía actual; el merge se
hace por `groupId`; capabilities no forman parte del modelo ni de las etiquetas. Las filas de
historial conservan su `rowKey` y no se colapsan por Grupo.

### Contrato nuevo mínimo

Entrada cerrada:

| Campo | Tipo | Obligatorio | Validación | Origen |
| --- | --- | --- | --- | --- |
| `groupId` | string | Sí | ID canónico no vacío, sin propiedades adicionales | URL validada por cliente |

Salida cerrada:

| Campo | Tipo | Semántica |
| --- | --- | --- |
| `group` | `{ id, nombre, deporte, estado:"activo", viewerIsOwner }` | Contexto mínimo del Grupo de la Membresía |
| `season` | `{ id, nombre, estado:"abierta" }` | Temporada exacta y vigente del vínculo |
| `membership` | `{ id, estado:"activa", fechaIngreso }` | Vínculo propio acreditado; no expone Persona/cargo/guards |

Errores: `UNAUTHENTICATED`, `ACCOUNT_REQUIRED`, `PERSON_REQUIRED`,
`CURRENT_MEMBERSHIP_NOT_ACCESSIBLE` (inexistente, ajena, finalizada o sin contexto vigente, sin
enumeración), `INCOMPATIBLE_STATE`, `DEPENDENCY_UNAVAILABLE` e `INTERNAL_ERROR`. El nombre final del
error puede alinearse con la taxonomía existente durante implementación, pero debe conservar esa
semántica y prueba negativa; no es una decisión funcional abierta.

## 13. Diseño físico Firestore

No hay cambios físicos. El nuevo lector consulta las colecciones/índices actuales de Membresía,
Grupo y Temporada mediante adaptadores backend; no escribe. No se crean ni cambian colecciones,
documentos, campos, índices, Rules, proyecciones, backfills, TTL o writers. Si el plan de query real
exigiera un índice no existente, la implementación debe detenerse y justificarlo antes de agregarlo.

## 14. Seguridad y autorización

| Operación | Visitante | Usuario autenticado | Owner | Integrante | Holder capability | Sistema |
| --- | --- | --- | --- | --- | --- | --- |
| Abrir Mis grupos | No | Sí, datos propios | Sí | Sí | Sí | — |
| Ver etiqueta `Administrás` | No | Sólo si fuente Owner lo acredita | Sí | No por Membresía | No por grant | Deriva |
| Ver etiqueta `Integrás` | No | Sólo si Membresía actual lo acredita | Sólo si además tiene Membresía | Sí | No por grant | Deriva |
| Abrir detalle Owner | No | No por defecto | Sí | No | No | Revalida |
| Abrir Mi participación | No | Sólo vínculo propio actual | Si además tiene Membresía | Sí | No por grant | Revalida |
| Abrir Economía delegada | No | No por defecto | Según reglas Owner | Sólo con capability | Sí | Revalida cada operación |

No se envía integrante/delegado al resumen Owner. No se confía en IDs, flags del cliente, rol global,
Persona sola o textos de UI. Firestore cliente y Rules permanecen sin cambios.

## 15. Repositorios y adaptadores

Se reutilizan `firestoreOwnGroupsReader`, `firestoreMyCurrentGroupMembershipsReader` y
`firestoreOwnGroupMembershipHistoryReader` detrás de sus servicios/callables. El frontend sólo usa
servicios. El reader de Membresías actuales se amplía con lookup contextual íntegro por
Persona+Grupo, reutilizando repositorio/guards y el contexto Grupo/Temporada; no se crea repositorio
genérico. El helper de presentación es puro y no se convierte en repositorio ni fuente de verdad.

## 16. Transacción y unidad de consistencia

NO APLICA a escrituras. Ownership y Membresías son snapshots independientes: la UI los publica como
tales, ordena lo cargado y anuncia cobertura parcial. Cada reintento pertenece a su fuente. El lector
contextual debe validar en una lectura consistente la Membresía, integridad y contexto vigente. No
se crea transacción global entre fuentes, bloqueo, idempotencia ni doble escritura.

## 17. Eventos y efectos posteriores

NO APLICA. No se producen eventos, tareas, notificaciones ni métricas persistidas.

## 18. Plan de pruebas proporcionado

| Nivel | Casos mínimos | Herramienta/entorno | Evidencia esperada |
| --- | --- | --- | --- |
| Presentación unitaria | merge por `groupId`, doble etiqueta, orden es-AR+groupId, filtros parciales, historia condicional | Node/test existente | IDs únicos y flags correctos |
| Aplicación/contrato | lector contextual: payload exacto, DTO mínimo, integridad, error no enumerable; máximo 20 y cursores | unitarias focales | contrato y cobertura sin falso vacío |
| Frontend | loading/error/empty/Persona separados; disclosure lazy; un enlace por tarjeta | Testing Library/estructural | estados y nombres accesibles |
| Seguridad | lector contextual propio/ajeno/finalizado; integrante puro evita resumen Owner; capabilities revocadas | Emulator sintético | positivos/negativos por relación |
| Integración | owner, member, doble relación, archivado, finalizada, varias capabilities | Auth/Firestore/Functions Emulator `demo-*` | recorrido completo sin datos reales |
| Responsive | 360, 390, 768, 1280/1440 y zoom 200% | navegador/CDP | capturas, medidas y cero overflow |
| Calidad | typecheck, baseline lint, build, syntax Functions si se toca wiring | scripts canónicos | salida registrada, sin empeorar baseline |
| Regresión | crear, salir, archivo, historia y Economía siguen accesibles desde destino correcto | Emulator/browser | acciones preservadas |

No se requieren nuevas transiciones de dominio ni cambios de Rules. El lector backend nuevo exige
pruebas unitarias, contractuales y Emulator de autorización, integridad, dependencia y cero
escrituras; la ruta member-safe exige navegación/guard extremo a extremo.

## 19. Componentes actuales reutilizados

| Componente | Reutilización | Adaptación requerida | Riesgo |
| --- | --- | --- | --- |
| `GroupPageShell` | Contenedor | Cambiar título/descripción | Bajo |
| `groupsService` | Ownership/errores | Ninguna de contrato | Bajo |
| `membershipsService` | Actual/historia/contexto | Consumir páginas y agregar callable contextual | Medio |
| `GroupCard` | Base visual | Convertir en tarjeta compacta genérica enlazada | Medio |
| `MyCurrentGroupMembershipsSection` | Lógica/acciones como antecedente | Extraer salida a “Mi participación”; no conservar segundo listado | Medio |
| `OwnGroupMembershipHistorySection` | Paginación/errores | Lazy; omitir `CURRENT` sólo si vínculo exacto está visible | Medio |
| `GroupFrame` / `GroupContextNavigation` | Layout/guard contextual | Admitir Membresía sin capability; conservar guards por página y destinos reales | Alto, prueba E2E obligatoria |
| contextos de Economía | Revalidación | Resolver al abrir destino, no por tarjeta | Medio |

Debe cambiarse `pageSize: 50` a 20 en `GroupFrame.membershipGroupName` y
`GroupContextNavigation.loadContexts`, continuando todos los cursores hasta encontrar el Grupo o
agotar cobertura. Reemplazar 50 por 20 sin paginar no satisface IUX-03.

## 20. Estructuras anteriores retiradas

Sólo se retira de esta ruta la composición visual en tres listas simultáneas y las explicaciones de
ownership/roles. No se eliminan callables, servicios, componentes compartidos ni rutas. Los módulos
anteriores pueden refactorizarse o dejar de ser consumidores directos únicamente con evidencia de
que acciones, errores y accesos fueron preservados.

### Inventario previsto de implementación

| Archivo/componente | Cambio previsto |
| --- | --- |
| `volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx` | Orquestar fuentes independientes, cobertura parcial, filtros, merge, orden y acceso secundario |
| `volley-ranking-frontend/src/components/groups/GroupCard.tsx` | Tarjeta compacta de enlace único, relaciones y chevron |
| Nuevo helper `src/services/groupsPresentation.mjs` + declaración TS | Merge estable, comparación española, filtros y supresión histórica condicionada, sin I/O |
| `MyCurrentGroupMembershipsSection.tsx` / máquina de salida actual | Extraer/reutilizar flujo de salida sin duplicar reglas ni recovery |
| `OwnGroupMembershipHistorySection.tsx` | Disclosure lazy, tipos de fila, paginación y coordinación con vínculos visibles |
| Nuevo `dashboard/groups/[groupId]/membership/page.tsx` | Vista “Mi participación” y destinos económicos acreditados |
| `GroupFrame.tsx` | Resolver contexto member-safe además de Owner/capabilities; exponer vínculo sin relajar hijos |
| `GroupContextNavigation.tsx` | Página Mi participación, destinos según relación/capability y paginación 20 completa |
| `membershipsService.ts` y tipos de `MyCurrentGroupMembership` | Cliente/DTO del contexto directo |
| `membershipContract.js`, `membershipService.js`, `membershipDto.js`, `membershipErrors.js` | Validación, coordinación, DTO mínimo y error no enumerable |
| `firestoreMyCurrentGroupMembershipsReader.js` | Lookup íntegro por Persona+Grupo reutilizando guards/períodos/contexto |
| `membershipCallable.js`, `membershipModule.js`, nuevo wrapper en `functions/callables/`, `functions/index.js` | Wiring/export del lector; sin writer ni feature flag |
| Pruebas focales Functions/frontend y arquitectura | Contrato, autorización, parciales, orden, guards, paginación y responsive |

Los nombres del helper/componente nuevo pueden ajustarse sin cambiar responsabilidades. No están
previstos cambios en navbar/sidebar, Rules, índices, colecciones, detalle Owner, Economía interna,
búsqueda, métricas ni infraestructura de proyección. El badge N20/N31 aprobado en UAT reutiliza
la proyección IUX-02 y no altera esta exclusión de infraestructura.

## 21. Checkpoint y rollback

- Commit inicial propuesto: el HEAD de `dev` que se apruebe al iniciar; el relevamiento usó
  `0cd1a7782a01c3439eee812db95c942d1cb6b8fd`.
- Rama de implementación: a crear sólo con autorización futura. La definición se versiona en la
  rama documental `docs/iux-03-mis-grupos-mobile-first` y se integra a `dev`.
- Estado inicial: `dev@0cd1a77`; los dos documentos IUX-03 nuevos eran los únicos cambios y fueron
  preservados. No se ejecutaron suites por ser definición documental.
- Rollback de código: revertir frontend y lector callable del incremento completo al checkpoint, sin
  tocar datos porque el contrato es read-only.
- Datos de prueba: sólo sintéticos en proyecto `demo-*`; no requieren migración ni recuperación.
- Interrumpir si: se necesita ampliar permisos/dominio, una fuente no permite cobertura verificable,
  aparece un destino no autorizado o el lector mínimo exige persistencia/proyección no aprobada.
- Reanudar si: un ajuste documental separado resuelve esa condición sin ampliar silenciosamente.

## 22. Decisiones adoptadas y pendientes reales

| ID | Decisión adoptada | Consecuencia |
| --- | --- | --- | --- |
| IUX-03-D01 | Ruta `/dashboard/groups/{groupId}/membership`, “Mi participación”, con contexto propio y salida vigente | Resuelve integrante puro sin usar detalle Owner |
| IUX-03-D02 | Capabilities al abrir la ruta, fuera del DTO/tarjeta y sin proyección | Preserva todos los destinos y elimina N+1 por tarjeta |
| IUX-03-D03 | Fuentes independientes visibles con aviso parcial, reintento propio y descarte por sesión | No oculta Grupos válidos ni afirma cobertura falsa |
| IUX-03-D04 | Historial lazy por `rowKey`; `CURRENT` sólo se omite si el vínculo exacto ya está visible | Conserva cronología y evita duplicación injustificada |
| IUX-03-D05 | Guard member-safe extremo a extremo y flujo actual de salida | No relaja permisos ni pierde confirmación/recovery |

No quedan decisiones funcionales bloqueantes. Durante implementación sólo permanecen decisiones
técnicas locales no bloqueantes —nombres internos, composición exacta del helper y taxonomía final
del error compatible— siempre que respeten contratos, autorización y resultados de esta ficha.

### Declaración actual

- Estado: **CERRADO EN SU ALCANCE LOCAL — UAT HUMANA APROBADA**.
- La aprobación recibida cubre Mis grupos, Mi participación, historial, estados sin Persona,
  separación de Economía personal/capabilities, pendientes N20/N31 por tarjeta y el recorrido local
  con frontend compilado en `demo-iux01-uat`.
- No se declara prueba en Android real, rendimiento productivo, ausencia definitiva de fugas,
  habilitación productiva de IUX-02 ni despliegue.

## 23. Ampliación aprobada durante UAT — resúmenes y pendientes contextuales

### Resúmenes

- Administración muestra `usados/límite`. `usados` es la cantidad de Grupos propios devueltos por
  `listOwnGroups`, sin filtrar archivados; `límite` es el guard técnico provisional vigente (`1`).
  Archivar no libera el guard. No se presenta Plan ni contratación.
- Participación muestra la cantidad de `groupId` actuales únicos sólo al terminar todas las páginas.
  Falta de Persona muestra `—` y una ayuda contextual discreta con acceso a Ficha personal. Loading,
  error y ausencia de Persona no se convierten en cero.

### Contrato mínimo de badges

Se amplía la salida existente de `listMyDashboardTasks` con el campo opcional:

```text
groupTaskCounts?: Array<{ groupId: string, count: integer >= 0 }>
```

El campo existe únicamente cuando `coverage.complete == true` y `coverage.health == READY`; debe
estar ausente junto con `totalTasks` para `UPDATING`, `REBUILDING` o `DEGRADED`. Cada cantidad es la
suma autorizada N20+N31 del contador contextual de la generación activa. La unión de ownership y
capability se resuelve antes de sumar, por lo que una tarea no se duplica. Los ceros pueden formar
parte del contrato, pero la tarjeta sólo muestra badge para un valor positivo.

La vista realiza una consulta bajo demanda al montar o al reintentar. Consume los contadores de
todos los contextos autorizados sin paginar items ni agrupar la primera página; no hace llamadas por
tarjeta, polling, listeners, barridos de solicitudes/pagos, writes ni proyección adicional. Ante
carga, error o cobertura incompleta oculta badges sin agregar una caja global. El listado permanece
utilizable y una actualización/reentrada a la vista vuelve a intentar la consulta independiente.
El badge es texto dentro del único enlace de la tarjeta y no ejecuta decisiones.

### Pruebas agregadas

- más de una página global con conteos exactos por varios Grupos;
- overlap Owner+capability sin duplicación;
- capability revocada y cobertura actualizándose sin `groupTaskCounts`;
- ausencia de contextos con arreglo vacío y total cero sólo bajo cobertura READY;
- presentación móvil/escritorio, badge positivo y ausencia bajo incertidumbre;
- Grupo activo y archivado consumen el cupo técnico;
- participación completa, sin Persona y con error conservan estados distintos;
- Historial vacío/multipágina y períodos CURRENT/HISTORICAL conservan cursor y `rowKey`.
