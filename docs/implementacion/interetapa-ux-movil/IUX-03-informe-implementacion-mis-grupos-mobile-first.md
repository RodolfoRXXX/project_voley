# IUX-03 — Informe de implementación local de Mis grupos mobile-first

## Estado

- **Resultado:** implementación técnica local completa; UAT humana aprobada.
- **Rama:** `feat/iux-03-mis-grupos-mobile-first`.
- **Base validada:** `dev@ae515a5180d0f8c3de9aa4d1038266de6dc938fa`.
- **Fecha:** 2026-11-01.
- **Decisión aplicable:** D5-062 y ficha IUX-03 adoptada.
- **Versionado:** autorizado para commits, integración en `dev` y push normal; sin despliegue.
- **UAT:** aprobada por el usuario el 1 de noviembre de 2026 para el alcance local IUX-03.

## Resultado implementado

1. `/dashboard/groups` unifica ownership y Membresías por `groupId`, conserva ambas relaciones,
   ordena por nombre con comparación española y desempata por ID. Las fuentes cargan, paginan y
   fallan de forma independiente; una cobertura parcial no produce vacío definitivo ni contador.
2. Las tarjetas tienen un único enlace, chevron, foco visible, datos compactos y destino según
   autorización: Owner al detalle administrativo; integrante puro a `membership`.
3. Los filtros Todos, Administro y Participo operan sobre los resultados acreditados y la interfaz
   comunica la cobertura. Se continúan páginas vacías con cursor, se detectan cursores repetidos y
   se descartan respuestas de una sesión anterior.
4. El historial inicia contraído, se consulta al abrir, conserva `rowKey`, cursor y cronología,
   deduplica CURRENT sólo contra el vínculo principal exacto y separa Grupos propios archivados de
   pertenencias históricas. Su error y reintento son independientes del listado.
5. La ruta `/dashboard/groups/{groupId}/membership`, titulada “Mi participación”, acredita la
   Membresía propia sin guard Owner, muestra Grupo, Temporada y vínculo, y reutiliza la máquina de
   salida, confirmación y recuperación vigente.
6. Las capabilities económicas se consultan sólo al abrir Mi participación. Denegación esperada y
   fallo de dependencia son distintos; los accesos acreditados se conservan aunque otra consulta
   falle y cada destino revalida su autorización. Una espera sin respuesta termina en estado de
   error parcial con reintento, sin inferir ausencia de capability.
7. Se agregó un callable contextual read-only. Deriva Cuenta y Persona desde sesión, acredita la
   pareja exacta Membresía/guard y su vigencia, y devuelve únicamente Grupo, Temporada y vínculo
   propios. No escribe, no cambia Rules, colecciones, invariantes ni permisos.
8. Los consumidores IUX-03 afectados usan `pageSize: 20` y continúan cursores. El límite técnico
   provisional de un Grupo se conserva sin atribuirlo a Planes.
9. La cabecera resume Administración como uso/límite técnico (`1/1` en el caso UAT) contando también
   Grupos archivados, porque archivar no libera el guard. Participación cuenta `groupId` actuales
   únicos sólo con cobertura completa; sin Persona muestra `—` y una única invitación discreta.
10. Cada tarjeta puede mostrar el total positivo de tareas N20/N31 que la cuenta puede atender. El
    total procede de la proyección IUX-02 ya autorizada, se consulta una vez al abrir la vista y se
    omite ante carga, error o cobertura incompleta; no hay consulta por tarjeta ni nueva fuente.

## Archivos principales

| Área | Archivos |
| --- | --- |
| Listado y presentación | `dashboard/groups/page.tsx`, `GroupCard.tsx`, `groupsPresentation.mjs` y su declaración TypeScript |
| Contexto y navegación | `GroupFrame.tsx`, `GroupContextNavigation.tsx`, guard explícito de `economy/page.tsx` |
| Mi participación | `dashboard/groups/[groupId]/membership/page.tsx`, `MembershipSelfExitControl.tsx` |
| Historial | `OwnGroupMembershipHistorySection.tsx` |
| Contratos frontend | `membershipsService.ts`, `MyCurrentGroupMembership.ts`, `OwnMembership.ts` |
| Lector backend | callable `getMyCurrentGroupMembershipContext`, servicio, DTO, errores, reader Firestore y export en `index.js` |
| Pendientes contextuales | extensión `groupTaskCounts` en `firestoreDashboardTaskQuery.js`, tipo `DashboardTask.ts` y `GroupCard.tsx` |
| Cobertura | `groupsMobileFirstIux03.test.js` y ampliaciones de unitarias/Emulator de Membresías y Dashboard Tasks |

No se modificaron navbar/sidebar, detalle Owner, búsqueda, métricas, persistencia de proyección,
infraestructura de datos, Rules ni dominio de permisos.

## Correctivo UAT de Historial

La reproducción quedó registrada en `volley-ranking-system/firebase-debug.log`. La UI invocó
`listMyGroupMembershipHistory` con el payload no sensible `{ pageSize: 20 }`, sin cursor. La llamada
autenticada comenzó a las `22:12:15.858` y Functions la completó correctamente a las
`22:12:33.040`, en `17181.844918 ms`. El frontend, sin embargo, había agregado un timeout local de
12 segundos (`HISTORY_TIMEOUT_MS` / `withHistoryTimeout`) y lanzó
`Error("MEMBERSHIP_HISTORY_TIMEOUT")`. Como ese error no contenía el `details.reason` de una
`HttpsError`, el normalizador lo convirtió en `INTERNAL_ERROR` y mostró “No pudimos completar la
operación…”. El stack terminaba en el wrapper frontend, no en el DTO ni en la callable.

Se eliminó ese timeout artificial. La callable, `pageSize: 20`, cursor, DTO y reglas de Persona,
Grupo y Temporada no se debilitaron. La regresión focal impide reintroducir el wrapper y Emulator
verifica vacío, varias páginas, orden por `rowKey`, períodos CURRENT/finalizados, cursores de otro
actor y referencias incompatibles que fallan de forma cerrada. Los eventos de recarga de workers
adyacentes no se atribuyen como causa: la solicitud que produjo el síntoma terminó con éxito.

## Contrato contextual de pendientes

`listMyDashboardTasks` agrega el campo opcional:

```text
groupTaskCounts?: Array<{ groupId: string, count: integer >= 0 }>
```

Sólo se emite cuando `coverage.complete === true` y `coverage.health === "READY"`. Cada valor suma
N20 y N31 autorizadas para ese Grupo sobre los contadores contextuales de la generación vigente.
La unión de ownership y capability se resuelve antes de sumar, por lo que una cuenta con ambas
relaciones no duplica tareas; N30 queda fuera. Con proyección incompleta, error o revocación en
curso, tanto `groupTaskCounts` como `totalTasks` se omiten. La UI consulta una vez bajo demanda,
sin polling, listeners, barridos ni N+1, y conserva el único enlace principal de cada tarjeta.

Esta ampliación reutiliza el contrato/proyección de IUX-02 y no cambia dominio, autorización,
persistencia ni decisión normativa. La ficha IUX-03 registra la ampliación concreta; la exclusión
histórica de “pendientes por tarjeta” en D5-062 queda superada para este correctivo únicamente por
la autorización UAT expresa, sin reabrir N30 ni crear nuevas clases.

## Correctivos UAT de Economía y pendientes por tarjeta

### Economía desde Mi participación

La reproducción de `demo-iux01-uat` consta en `volley-ranking-system/firebase-debug.log`: el
Emulator aceptó y ejecutó `getMyGroupDirectPaymentRecordContext` en el mismo project ID del frontend,
con Auth válida, y finalizó las llamadas observadas en `27.617668 ms` y `20.662902 ms`. La función
figura además en las definiciones cargadas desde `functions/index.js`. No aparece el log
`Administrative receipt callable failed`, reservado a errores no tipados.

La cuenta recorrida tenía otro acceso económico acreditado pero no la capability independiente
`GROUP_DIRECT_PAYMENT_RECORD`. El store devuelve `ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED`; el adapter
lo traduce a callable `permission-denied` (HTTP 403 en el transporte Emulator) con
`details.reason=ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED`. Es una denegación esperable, no
indisponibilidad ni error interno. No se concedió registro directo ni se ampliaron permisos.

`Mi participación` y `GroupFrame` clasifican ahora por separado las negativas esperables de
Tesorería, revisión y registro directo. Una negativa no oculta otros accesos acreditados; sólo un
fallo no tipado/indisponibilidad sin ningún acceso suficiente produce el mensaje reintentable de
verificación. Cada destino conserva su revalidación canónica.

### Pendientes

El log de la misma sesión registra `listMyDashboardTasks` con Auth válida y
`reason: PROJECTION_NOT_READY` (`durationMs: 541`, ejecución total `625.247325 ms`). La bandera local
estaba habilitada, pero esa cuenta/fixture anterior no tenía generación activa materializada. Por
lo tanto el fallo no provino de `groupTaskCounts`, de la primera página ni del agrupamiento: faltaba
preparar la proyección IUX-02 del fixture mediante el backfill/rebuild local previsto antes del
recorrido. El procedimiento reproducible sigue siendo `npm run iux-02a:backfill:emulator` con el
Emulator UAT activo; no se ejecuta contra remoto ni se convierte el error en cero.

Se retiró por completo la caja superior “Pendientes por Grupo” y su mensaje de error. Las tarjetas
son la única presentación: muestran en rojo `1 pendiente`/`N pendientes` sólo con cobertura READY y
cantidad positiva. Carga, proyección no disponible, revocación o error dejan el badge ausente sin
bloquear grupos ni inventar cero. Recargar o volver a entrar a Mis grupos repite la consulta única;
no se agregaron botones, polling, listeners ni llamadas por tarjeta.

### Validación posterior a los correctivos

- Unitarias Functions: `83/83` archivos aprobados.
- Emulator canónico: `7/7` lotes aprobados. Incluye concesión y revocación de registro directo,
  negativa `ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED`, capabilities económicas independientes,
  ausencia de escrituras del reader, varios Grupos, doce tareas distribuidas en más de una página,
  conteos contextuales `6/6`, overlap Owner/reviewer sin duplicación y omisión de
  `groupTaskCounts` al perder cobertura válida.
- Typecheck y ESLint focal de Mis grupos, tarjeta, GroupFrame y Mi participación: aprobados.
- Build Next.js: aprobado; conserva las rutas `membership` y `economy`.
- `git diff --check`: aprobado.

La presentación responsive conserva el mismo grid y tarjeta ya inspeccionados a 360/390 px y
escritorio: el correctivo elimina un bloque superior y agrega únicamente texto inline dentro del
enlace existente, por lo que no introduce un nuevo control ni ancho mínimo. Las capturas anteriores
siguen documentando el layout base; no se las renombra como re-UAT humana posterior al correctivo.

## Validación técnica

Se usó exclusivamente el proyecto demo `demo-iux01-uat` con Auth, Firestore y Functions Emulator,
cuentas y documentos sintéticos. La corrida canónica completa de Emulator pasó sus siete lotes,
incluyendo el nuevo lector contextual, acceso propio, negativa sobre Grupo ajeno, payload inválido y
comprobación de que la consulta no cambia `updateTime` de Membresía ni guard.

| Gate | Resultado |
| --- | --- |
| Unitarias Functions | PASS — 83/83 archivos |
| Emulator canónico | PASS — 7/7 lotes |
| Typecheck frontend | PASS |
| ESLint focal de archivos IUX-03 | PASS |
| Build frontend | PASS; incluye `/dashboard/groups/[groupId]/membership` |
| `git diff --check` | PASS |
| Lint global | PASS contra baseline: 31 errores y 8 warnings conocidos; 11 hallazgos resueltos |

La cobertura automatizada prueba deduplicación y orden, filtros, identidad histórica exacta,
página vacía con cursor, cursor repetido, descarte por cambio de sesión, ausencia de N+1 por tarjeta,
guards, contrato contextual, estados incompatibles y ausencia de escrituras. Las pruebas existentes
de salida cubren confirmación, finalización y recuperación. La ampliación de Dashboard Tasks prueba
más de una página, varios Grupos, owner+capability sin duplicación, capability revocada y omisión de
conteos cuando la cobertura deja de ser válida.

## Evidencia visual

Todas las capturas declaradas tienen `scrollWidth === clientWidth`. Las tarjetas inspeccionadas no
contienen controles interactivos anidados. La revisión a zoom efectivo 200% mantuvo cero overflow;
los controles del corte conservan altura mínima de 44 px (los valores globales menores medidos
pertenecen al layout compartido, fuera del alcance IUX-03).

- [Owner e integrante, 360×800](./evidencia/IUX-03/groups-owner-both-360x800.png)
- [Owner e integrante, 1440×900](./evidencia/IUX-03/groups-owner-both-1440x900.png)
- [Integrante puro, 390×844](./evidencia/IUX-03/groups-member-390x844.png)
- [Tablet, 768×900](./evidencia/IUX-03/groups-member-tablet-768x900.png)
- [Zoom efectivo 200%](./evidencia/IUX-03/groups-member-zoom-200.png)
- [Owner sin Persona, llamado único](./evidencia/IUX-03/groups-owner-no-person-390x844.png)
- [Mi participación, tres capabilities](./evidencia/IUX-03/membership-capabilities-all-390x844.png)
- [Mi participación, fallo parcial sin perder accesos](./evidencia/IUX-03/membership-capabilities-390x844.png)
- [Archivado separado y error histórico independiente](./evidencia/IUX-03/groups-history-archived-390x844.png)

Estas capturas conservan la trazabilidad visual automatizada y estructural. La aprobación humana
posterior cubre el resultado local final de IUX-03, incluidos los resúmenes y badges corregidos, pero
no convierte estas imágenes anteriores en capturas nuevas ni acredita Android real.

## Limitaciones posteriores a la UAT aprobada

- No hubo prueba en Android real ni se afirma comportamiento del picker nativo en ese dispositivo.
- La aprobación y las mediciones corresponden al entorno demo local con frontend compilado; no
  caracterizan rendimiento, memoria o workers de producción y no descartan una fuga de larga duración.
- No se usaron datos ni credenciales productivos y no se ejecutó despliegue.
- IUX-02 mantiene pendientes sus gates productivos y habilitación coordinada; la generación READY del
  demo sólo acredita el recorrido UAT local.

## Correctivos UAT — 2026-11-01

### Owner sin Persona y tareas administrativas

La reproducción en `demo-iux01-uat` confirmó que `listMyCurrentGroupMemberships` responde HTTP 400
con `failed-precondition` y `reason=PERSON_REQUIRED` para un Owner sin Persona. Es un resultado
tipado esperado, no un error interno; por eso no produce stack de excepción interno en el Emulator.
La pantalla ahora usa el estado autoritativo de `PersonProvider`: cuando es `empty`, no ejecuta el
callable, deja participación como no aplicable (`—`) y mantiene administración y tareas activas. Si
la ausencia aún no era conocida y el backend devuelve la precondición, el manejo explícito existente
converge al mismo estado sin inventar cero ni crear Persona.

Con la proyección sintética preparada, el mismo Owner sin Persona obtuvo HTTP 200 en
`listMyDashboardTasks`. El log registró `dashboardTasks.query` con resultado `UPDATING`, sin `reason`
de error ni stack, y el callable terminó normalmente. El fallo previo no provenía de
`PERSON_REQUIRED`: correspondía a cobertura/proyección no preparada. Se conserva esa incertidumbre
y nunca se transforma en conteo cero. La regresión del reader verifica explícitamente un Owner sin
`personaId` y sus tareas N20/N31 autorizadas.

### Economía personal independiente de capacidades administrativas

Un integrante sintético obtuvo una obligación propia (HTTP 200, un ítem) en
`listMyOwnPaymentObligations`, mientras Tesorería, revisión y registro directo devolvieron por
separado HTTP 403 con `GROUP_TREASURY_NOT_AUTHORIZED`,
`PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED` y `ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED`. Esto demuestra que
la obligación personal no depende de `getMyGroupDirectPaymentRecordContext` ni de otra capability.
“Mi participación” muestra siempre el acceso a “Mis obligaciones” y agrupa aparte los accesos
administrativos acreditados; cada destino continúa revalidando en backend. La regresión estructural
impide volver a condicionar obligaciones a `capabilities.record`.

### Fecha de Temporada

El formulario usa el control nativo `<input type="date">`, no un calendario propio. La causa
demostrada era una regla de esquema oscuro aplicada sólo a `datetime-local`: Firefox podía dibujar
el indicador nativo de `date` con contraste incorrecto. Se incorporó `date` a la misma regla y se
reforzaron foco visible, cursor y manipulación táctil sin convertir la fecha civil ni cambiar su
semántica. La apertura del picker y el gesto táctil en Android real quedan pendientes: Firefox
adaptable/headless no reproduce fielmente el selector del sistema operativo.

### Medición local corta y reproducible

Se midió frontend compilado, una sola instancia de Auth/Firestore/Functions Emulator y dos sesiones
aisladas. RSS se informa por familia como indicador de procesos, no como suma de memoria física
exclusiva.

| Momento | Memoria disponible | Swap usada | Workers coincidentes | RSS por familia (no exclusivo) |
| --- | ---: | ---: | ---: | --- |
| Inicio/inactividad | 3.485 GiB | 730.3 MiB | 3 | Java 235.8 MiB; Next 140.0 MiB; Node 156.3 MiB |
| Dos recorridos | 2.719 GiB | 730.3 MiB | 12 | Java 336.1 MiB; Next 140.0 MiB; Node 1.176 GiB |
| 30 s inactivo | 2.736 GiB | 730.3 MiB | 12 | Java 336.0 MiB; Next 140.0 MiB; Node 1.176 GiB |

Los recorridos repitieron Dashboard, Mis grupos y Economía. El Emulator creó workers de Functions
de forma perezosa (3→12); tras repetir e inactividad su cantidad y RSS quedaron estables, la memoria
disponible recuperó aproximadamente 18 MiB, la swap no creció y las muestras posteriores de
`vmstat` dieron `si=0`, `so=0`. Este corte demuestra calentamiento y workers retenidos, no crecimiento
continuo. Tampoco excluye una fuga de larga duración. La caída histórica de 4.3 GiB a 511 MiB no
puede atribuirse sin su fotografía de procesos; build, suites, servidor de desarrollo e instancias
Emulator simultáneas son comandos distintos y no deben mezclarse en la próxima medición.

### Regresiones, configuración y pendientes

- El build compilado aprobó con `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-iux01-uat`, Emulator habilitado
  y Functions apuntando a `http://localhost:5001/demo-iux01-uat/us-central1`.
- La guía local incorpora el arranque liviano verificado y exige conservar el procesamiento N20/N31.
- La UAT humana local fue aprobada después de los correctivos y de inicializar canónicamente la
  generación IUX-02 del demo. No hubo prueba en Android real; esa ausencia no invalida el recorrido
  local aprobado ni se presenta como evidencia móvil física.

## Aprobación humana y alcance observado

El usuario aprobó IUX-03 el 1 de noviembre de 2026 y confirmó una mejora perceptible de velocidad
al usar el frontend compilado. La aprobación comprende la vista unificada, filtros, tarjetas y
badges N20/N31, Owner sin Persona, integrante puro, Mi participación, obligaciones personales,
capabilities económicas separadas, historial y estados parciales del entorno demo.

El recorrido liviano posterior mostró 4.7 GiB disponibles, swap estable y actividad `si/so`
prácticamente nula según la observación del usuario. Es evidencia del entorno local y de esa sesión,
no un benchmark productivo ni demostración de ausencia definitiva de fugas. Las mediciones técnicas
anteriores siguen mostrando calentamiento y retención de workers sin crecimiento continuo durante
la ventana corta observada.

La ausencia inicial de badges se diagnosticó como inicialización incompleta de IUX-02: evento N20
aplicado, scope sin cobertura completa, Grupo legacy sin `ownershipRevision` y generación de usuario
ausente. Se aplicaron la migración canónica idempotente de ownership y el backfill local autorizado.
El resultado final fue `N20_N31_V1`, generación `live-v1`, cobertura `READY`, un N20 accionable y
contador contextual `1` para el Grupo, sin fallos ni leases pendientes. Esta inicialización del demo
no satisface los gates productivos de IUX-02.
