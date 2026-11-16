# IUX-07 — Inicio público y sidebar del MVP

## Estado de la ficha

- **Estado:** `LISTO PARA IMPLEMENTAR — IMPLEMENTACIÓN NO AUTORIZADA EN ESTA FICHA`.
- **Responsable:** a asignar al iniciar la implementación.
- **Fecha:** 16 de noviembre de 2026.
- **Rama o checkpoint de partida:** `dev@827379abfb10bab21141ef1f13e7bdfa822424bc`.
- **Etapa del roadmap:** interetapa `IUX` entre E3 y E4.
- **Documento 5 vigente:** borrador consolidado en `dev`, con cierre documental IUX-06 y decisiones
  `D5-069` a `D5-076`.
- **Estado de Git relevado:** rama `dev`, alineada con `origin/dev` y sin cambios al iniciar esta
  definición.

Esta ficha define el incremento documental siguiente a IUX-06. No autoriza cambios de aplicación,
configuración, datos, Rules, índices, despliegue ni habilitación productiva.

## 1. Identificación

- **ID del incremento:** `IUX-07`.
- **Nombre:** Inicio público y sidebar del MVP.
- **Casos incluidos:**
  - presentar SPORTEXA en `/` como herramienta para crear, organizar y participar en grupos
    deportivos;
  - reutilizar el acceso vigente con Google para alta inicial e inicio de sesión;
  - ofrecer `Ir a Mis grupos` a quien visita `/` con una sesión iniciada;
  - retirar del Inicio público los bloques `Torneos vigentes` y `Próximos partidos` y su código
    exclusivo;
  - simplificar la navegación compartida de escritorio y móvil, conservando `Mis grupos` y
    `Explorar grupos`;
  - retirar todos los enlaces visibles a Torneos de la navegación del MVP, incluidos los accesos
    público, personal y administrativo.
- **Casos expresamente excluidos:**
  - cambios al Inicio autenticado `/dashboard`, sus pendientes o accesos rápidos;
  - nuevos mecanismos de registro, login o recuperación de cuenta;
  - cambios a logo, `Mi perfil`, ficha personal, perfil de cuenta o logout;
  - `Agregar integrantes` y cambios a integrantes, solicitudes o membresías;
  - cambios funcionales, migraciones o retiro de rutas de Torneos;
  - retiro de rutas históricas o servicios compartidos sólo porque dejan de estar enlazados desde
    este menú;
  - cambios de autorización, dominio, persistencia, backend, Firestore o datos.
- **Documentos relacionados:** Documento 5, secciones 5.16 y 5.17; cierre consolidado IUX-06
  (`D5-076`); ficha consolidada IUX-06.
- **Brechas atendidas:** posicionamiento público todavía centrado en Torneos/partidos y navegación
  autenticada que mezcla destinos MVP con accesos históricos.

### Convención e identificador elegido

La interetapa usa la secuencia `IUX-NN`. `IUX-06` ya comprende A, B, C1, C2-P01, C2-P02 y D, todos
integrados en `dev`; esos sufijos son cortes internos del mismo incremento y no liberan el número.
Por lo tanto, el siguiente identificador disponible es **`IUX-07`**.

## 2. Objetivo funcional

Una persona que llega a SPORTEXA debe comprender que el producto le permite crear un grupo
deportivo, organizar integrantes y seguir cuotas y pagos, o explorar grupos publicados para pedir
ingreso. El acceso a esos recorridos debe ser coherente con el estado de sesión y la navegación del
MVP debe dejar de promover accesos públicos históricos o de Torneos que no forman parte de este
corte.

El incremento agrupa Inicio y sidebar porque ambos forman la puerta de entrada al mismo MVP y
comparten el estado de autenticación, pero no modifica el Inicio autenticado ni los recorridos de
destino.

## 3. Actores

| Actor | Participación | Contexto | Resultado esperado |
| --- | --- | --- | --- |
| Visitante | Actor principal | Abre `/` sin sesión | Entiende la propuesta y puede iniciar el acceso con Google |
| Cuenta nueva | Actor principal | Completa Google por primera vez | Se conserva el alta implícita vigente y llega al Inicio autenticado |
| Cuenta existente | Actor principal | Inicia sesión con Google | Llega al Inicio autenticado sin cambios al flujo |
| Cuenta autenticada | Actor principal | Abre `/`, escritorio o móvil | Ve `Ir a Mis grupos` como acción principal y accede luego a la navegación simplificada |
| Administrador legacy | Actor secundario | Posee `userDoc.roles === "admin"` | Usa la navegación MVP sin accesos visibles a Torneos; conserva permisos y rutas para una etapa posterior |
| Sistema | Soporte | Resuelve sesión y Cuenta canónica | Mantiene estados de comprobación, inicialización y error existentes |

## 4. Precondiciones

- La base de definición es `dev@827379abfb10bab21141ef1f13e7bdfa822424bc`.
- `AuthProvider` continúa siendo la fuente de `firebaseUser`, `accountStatus`, `authError` y la
  operación `login`.
- El alta y el inicio de sesión continúan compartiendo `loginWithGoogle`; para una identidad nueva,
  `ensureMyAccount` materializa la Cuenta canónica después del cambio de sesión. No existe hoy una
  acción o pantalla separada de “Registrarse”.
- `/dashboard/groups` y `/dashboard/groups/explore` deben continuar protegidas por el layout
  autenticado.
- Este incremento no depende de cerrar las UAT complementarias de IUX-06, pero no las reemplaza ni
  altera sus pendientes.

## 5. Flujo principal

### 5.1 Visitante sin sesión

1. El visitante abre `/`.
2. El sistema conserva la comprobación de sesión vigente.
3. El Inicio muestra el título **«Gestioná tu grupo deportivo»**.
4. Muestra el texto: **«Creá tu grupo, organizá a sus integrantes y llevá el seguimiento de las
   cuotas y los pagos. Si querés sumarte a un grupo, podés explorar los publicados y solicitar el
   ingreso»**.
5. La acción de acceso reutiliza `login`; no crea formulario, proveedor o contrato nuevo.
6. Una identidad nueva sigue el alta implícita vigente y una identidad existente sigue el inicio de
   sesión vigente.
7. Tras completarse la autenticación, la navegación posterior continúa en `/dashboard`.

### 5.2 Cuenta autenticada que abre el Inicio público

1. La Cuenta abre `/` directamente o mediante el logo.
2. El mismo posicionamiento público permanece visible.
3. La acción principal es **`Ir a Mis grupos`** y navega a `/dashboard/groups`.
4. No se dispara autenticación nuevamente.
5. `/` conserva el Navbar raíz. Al entrar en `Mis grupos`, el layout protegido muestra el sidebar
   en escritorio; en móvil, el drawer de Navbar conserva la misma fuente de navegación.

### 5.3 Navegación simplificada

1. La Cuenta abre el sidebar de escritorio o el menú móvil.
2. Se conservan `Inicio`, `Mis grupos`, `Explorar grupos`, `Mis obligaciones`, `Mi perfil` y las
   entradas condicionadas que no fueron incluidas en el retiro.
3. Se retiran de la fuente compartida:
   - `Grupos` → `/groups`;
   - `Torneos` público → `/tournaments`;
   - `Mi perfil > Mis torneos` → `/profile/tournaments`;
   - `Mi gestión > Torneos` → `/admin/tournaments`.
4. `Mi perfil` conserva `Ficha personal`.
5. Como `Mi gestión` sólo contiene hoy la opción `Torneos`, se oculta el contenedor completo. La
   implementación debe filtrar también cualquier grupo sin hijos visibles; si en la base de
   implementación aparecieran otras opciones ajenas a Torneos, se conservan y `Mi gestión`
   permanece visible.
6. El menú de cuenta de escritorio en `/` conserva `Tablero` y `Cerrar sesión`; no contiene accesos
   adicionales a Torneos. Navbar, sidebar y drawer no deben introducir equivalentes por otro texto.
7. Al navegar desde móvil se cierra el drawer mediante el `onClick` vigente.
8. El resaltado activo continúa resolviéndose por la coincidencia más específica.

## 6. Flujos alternativos y errores

| Condición | Respuesta funcional | Estado resultante | Feedback | ¿Reintento? |
| --- | --- | --- | --- | --- |
| Sesión todavía en comprobación | No presentar una acción contradictoria | Estado de autenticación sin modificar | Mantener tratamiento de carga vigente | Automático |
| Popup de Google cancelado o fallido | No navegar | Visitante permanece en `/` | `authError`/toast vigente | Sí |
| Cuenta en inicialización | No sustituir ni duplicar `ensureMyAccount` | Sesión iniciada, Cuenta pendiente | `Inicializando tu cuenta…` | Según flujo vigente |
| Error de Cuenta | Conservar recuperación de `AuthProvider`/layout | Sin acceso falso al área protegida | Feedback vigente | Sí |
| URL retirada del menú abierta directamente | No bloquear ni redirigir por este incremento | La ruta conserva su comportamiento actual | Ninguno nuevo | No aplica |
| Ruta profunda de grupos | Resolver el ítem más específico | Navegación disponible | Resaltado activo correspondiente | No aplica |

## 7. Postcondiciones y criterios de aceptación

### Postcondiciones

- `/` comunica la propuesta de grupos deportivos acordada.
- Los dos bloques dinámicos legacy dejan de renderizarse y el Inicio no conserva estado, imports,
  skeletons o temporizadores exclusivos que queden sin consumidor.
- No se crea, modifica ni borra información de dominio.
- Las rutas retiradas del sidebar siguen existiendo; sólo dejan de ser entradas de la navegación
  MVP indicada.
- El Inicio autenticado `/dashboard`, autenticación, perfil y destinos de grupos conservan sus
  contratos y comportamiento.

### Criterios de aceptación

1. **Dado** un visitante sin sesión, **cuando** abre `/`, **entonces** ve el título y el texto
   acordados, y una acción vigente que permite tanto el alta inicial como el inicio de sesión con
   Google sin introducir un segundo flujo de autenticación.
2. **Dada** una identidad Google nunca registrada, **cuando** completa la acción de acceso,
   **entonces** se conserva la creación canónica de Cuenta y la navegación a `/dashboard`.
3. **Dada** una Cuenta existente, **cuando** inicia sesión desde `/`, **entonces** llega a
   `/dashboard` y su sesión, perfil y Cuenta no cambian de semántica.
4. **Dada** una Cuenta con sesión iniciada, **cuando** abre `/`, **entonces** la acción principal es
   `Ir a Mis grupos`, su destino es `/dashboard/groups` y no se muestra como acción principal un
   nuevo login.
5. **Dado** cualquier estado de sesión, **cuando** se renderiza `/`, **entonces** no aparecen
   `Torneos vigentes` ni `Próximos partidos`, ni se ejecutan consultas para alimentarlos.
6. **Dada** una Cuenta autenticada, **cuando** abre el sidebar de escritorio o el menú móvil,
   **entonces** ve `Mis grupos` y `Explorar grupos`, y no ve `Grupos`, `Torneos`, `Mis torneos` ni
   ningún enlace equivalente hacia una ruta de Torneos.
7. **Dada** una Cuenta administradora, **cuando** revisa el sidebar en escritorio, el drawer móvil,
   el Navbar y el menú de cuenta, **entonces** no se ofrece `/tournaments`,
   `/profile/tournaments`, `/admin/tournaments` ni otro acceso visible a Torneos.
8. **Dado** que `Mi gestión` no tiene hijos distintos de Torneos, **cuando** se construye la
   navegación, **entonces** `Mi gestión` no se renderiza; si conserva otro hijo visible ajeno a
   Torneos, el contenedor y ese hijo permanecen disponibles.
9. **Dada** la ruta `/dashboard/groups/explore`, **cuando** se calcula el estado activo,
   **entonces** se resalta `Explorar grupos` y no `Mis grupos`.
10. **Dada** la ruta `/dashboard/groups` o un detalle bajo ella que no sea `/explore`, **cuando** se
   calcula el estado activo, **entonces** se conserva el resaltado de `Mis grupos` conforme al
   matcher vigente.
11. **Dado** el drawer móvil abierto a 360 o 390 px, **cuando** se elige `Mis grupos`, `Explorar
    grupos`, `Ficha personal` u otra entrada conservada, **entonces** navega al destino vigente y el
    drawer se cierra.
12. **Dada** la implementación del incremento, **cuando** se abre `/dashboard`, **entonces** se
    conservan saludo, Pendientes y accesos rápidos, sin nuevas consultas ni cambios funcionales.
13. **Dadas** las URL `/groups`, `/tournaments`, `/profile/tournaments` y `/admin/tournaments`,
    **cuando** se abren de forma directa bajo sus precondiciones actuales, **entonces** este
    incremento no las elimina ni cambia su código, datos, permisos o contrato.

## 8. Frontend

### Rutas y componentes comprobados

| Ruta o componente | Estado observado en `dev` | Cambio definido |
| --- | --- | --- |
| `src/app/page.tsx` — `/` | Hero centrado en Torneos; cards de partidos/Torneos/ranking; bloques vacíos de Torneos y partidos | Reorientar copy y CTA; retirar los dos bloques y código exclusivo |
| `src/components/layout/Navbar.tsx` | Login escritorio/móvil; drawer móvil consume navegación compartida y cierra al hacer click | Conservar autenticación y cierre; recibir el inventario simplificado |
| `src/components/layout/AppSidebar.tsx` | Sidebar `md+` consume la misma navegación y matcher activo | Recibir el inventario simplificado sin cambiar logout, tema o perfil |
| `src/lib/navigation/accountNavigation.ts` | Fuente común para escritorio y móvil; `Mi gestión` contiene sólo `Torneos` | Retirar los cuatro accesos identificados y no devolver grupos vacíos; conservar destinos restantes |
| `src/lib/navigation/activeRoute.mjs` | Elige la coincidencia de ruta más larga | Reutilizar sin cambiar semántica y agregar/regenerar regresión |
| `src/app/layout.tsx` | Layout raíz de `/`; monta Navbar, Auth y providers, pero no AppSidebar | Conservar |
| `src/app/(public)/layout.tsx` | Envuelve rutas públicas agrupadas como `/groups` y `/tournaments`; muestra sidebar con sesión, pero no envuelve `/` | Conservar |
| `src/app/(protected)/layout.tsx` | Protege rutas y monta sidebar | Conservar |
| `src/components/providers/AuthProvider.tsx` | Google + `ensureMyAccount`; estados de sesión/Cuenta | Reutilizar sin cambiar contratos |
| `src/services/authService.ts` | `loginWithGoogle` con popup y deduplicación in-flight | Reutilizar |
| `src/app/(protected)/dashboard/page.tsx` — `/dashboard` | Inicio autenticado con Pendientes y accesos rápidos | Sin cambios; smoke de regresión obligatorio |
| `src/app/(protected)/dashboard/groups/page.tsx` | Destino canónico `Mis grupos` | Conservar URL y acceso |
| `src/app/(protected)/dashboard/groups/explore/page.tsx` | Destino canónico `Explorar grupos`; usa `listExploreGroups` | Conservar URL, consulta y acceso |
| `src/app/(public)/groups/page.tsx` | `Grupos históricos públicos`; usa `/api/groups/public` | Retirar sólo del menú; no reutilizar como Explorar |

### Superficies de navegación revisadas

| Superficie | Hallazgo | Definición |
| --- | --- | --- |
| `AppSidebar` escritorio | Renderiza `visibleAccountNavigationItems`; abre `Mi gestión` bajo rutas `/admin` | El inventario no contiene accesos a Torneos ni grupos vacíos |
| Drawer móvil de `Navbar` | Renderiza la misma fuente y sus submenús | Misma ausencia total; conserva cierre al navegar |
| Navbar escritorio | No muestra enlaces directos a Torneos | Conservar sin agregar equivalentes |
| Menú de cuenta en `/` | Sólo ofrece `Tablero` y `Cerrar sesión` | Conservar; verificar ausencia con Cuenta admin |
| Bloque `Torneos vigentes` de `/` | Incluye `Ver todos` → `/tournaments` | Se retira junto con el bloque |

### Acciones y estados visuales

- Sin sesión: conservar una acción de autenticación basada en Google; la validación debe cubrir
  por separado primer acceso y Cuenta existente aunque compartan el mismo botón técnico.
- Con sesión: `Ir a Mis grupos` es la acción principal de `/` y usa un enlace accesible a
  `/dashboard/groups`.
- Con sesión en inicialización o error: conservar feedback y recuperación existentes; no mostrar
  éxito anticipado.
- El copy público no debe mantener mensajes prominentes que contradigan el foco en grupos. Las
  cards actuales de partidos, Torneos y ranking deben retirarse o reemplazarse por contenido
  estático coherente; su composición exacta es una decisión de presentación no bloqueante.
- No debe existir scroll horizontal a 360/390 px; acciones con área táctil mínima de 44 px, foco
  visible y orden de tabulación lógico.

## 9. Servicios, agregados, contratos y persistencia

- **Módulo propietario:** presentación/navegación frontend.
- **Servicio de Aplicación nuevo:** no aplica.
- **Operación coordinada:** sólo navegación y autenticación ya existente.
- **Autorizaciones:** sin cambios; los layouts y servicios de destino revalidan como hasta ahora.
- **Agregados modificados:** ninguno.
- **DTO de entrada/salida:** ninguno nuevo.
- **Firestore, índices, Rules y transacciones:** no aplica.
- **Eventos y efectos posteriores:** no aplica.

## 10. Consultas y código exclusivo del Inicio público

El estado vigente de `src/app/page.tsx` no ejecuta consultas de Torneos ni partidos. Desde E0-04,
el código conserva placeholders locales:

- `matches: Match[] = []`, `groupsMap = {}` y `matchesLoading = false`;
- `tournaments: PublicTournamentListItem[] = []` y `tournamentsLoading = false`.

Antes de E0-04, los bloques se alimentaban mediante:

1. listener Firestore sobre `matches` por estados sociales, más consulta de `groups` por IDs para
   resolver nombres;
2. `getPublicTournamentListView()`, filtrado a `inscripciones_abiertas | activo`, orden y límite 5.

Esas operaciones ya no se invocan desde `/`; no hay consulta activa que retirar. Durante la
implementación deben eliminarse del Inicio el estado muerto, `loading`, `displayedMatches`, imports
de `Match`, `PublicTournamentListItem`, `MatchCard`, `TournamentSummaryCard` y los skeletons
exclusivos de ambos bloques. `CardCarousel` sólo puede retirarse de este archivo si deja de usarse
allí; el componente y `getPublicTournamentListView()` se conservan porque tienen consumidores fuera
del Inicio, en especial `/tournaments`.

## 11. Destinos de navegación verificados

| Entrada | Destino vigente | Decisión IUX-07 |
| --- | --- | --- |
| Inicio | `/dashboard` | Conservar |
| Mis grupos | `/dashboard/groups` | Conservar |
| Explorar grupos | `/dashboard/groups/explore` | Conservar |
| Mis obligaciones | `/dashboard/obligations` | Conservar |
| Grupos | `/groups` | Retirar del menú; ruta histórica distinta de Explorar |
| Torneos público | `/tournaments` | Retirar del menú; conservar URL |
| Mi perfil > Ficha personal | `/profile/person` | Conservar |
| Mi perfil > Mis torneos | `/profile/tournaments` | Retirar del menú; conservar URL |
| Mi gestión > Torneos | `/admin/tournaments` | Retirar del menú también para admin; conservar URL, código, datos y permisos |
| Mi gestión | Contenedor sin `href`; hoy sólo contiene Torneos | Ocultar completo mientras quede sin hijos visibles |

`Explorar grupos` **no reutiliza** la ruta histórica `Grupos`: la primera es una vista autenticada
IUX-06A con `listExploreGroups`; la segunda es una vista pública legacy de partidos asociados que
consulta `/api/groups/public`.

## 12. Seguridad y autorización

| Operación | Visitante | Cuenta autenticada | Admin legacy |
| --- | --- | --- | --- |
| Ver `/` | Sí | Sí | Sí |
| Ejecutar acceso Google | Sí | No debe ser CTA principal | No debe ser CTA principal |
| Ir a Mis grupos desde `/` | No como acción autenticada | Sí | Sí |
| Ver navegación autenticada | No | Sí | Sí |
| Ver enlaces de navegación a Torneos | No | No | No |
| Abrir directamente una ruta de Torneos vigente | Según controles actuales | Según controles actuales | Según controles actuales; sin cambios de permisos |

El ocultamiento de una entrada no constituye autorización. Las rutas y backends conservan sus
controles vigentes. No se relajan lecturas públicas ni se expone información nueva.

## 13. Plan de pruebas

| Nivel | Casos mínimos | Herramienta o entorno | Evidencia requerida |
| --- | --- | --- | --- |
| Unitario | inventario visible común; admin/no admin; retiro de las tres rutas de Torneos; supresión de grupos vacíos; matcher más específico para `/dashboard/groups/explore` | Node/runner focal existente o extracción testeable | Salida PASS y casos nominados |
| Frontend público | copy exacto, ausencia de ambos bloques, CTA sin sesión y CTA `Ir a Mis grupos` con sesión | Navegador local | Capturas y assertions DOM |
| Autenticación | primera identidad crea Cuenta; identidad existente inicia sesión; cancelación/error no navega; inicialización conserva feedback | Emulator/Auth local cuando sea reproducible y UAT focal Google | Resultado por flujo, sin registrar credenciales |
| Navegación escritorio | sidebar, Navbar y menú de cuenta; inventario; destinos; resaltado activo; perfil conservado; admin sin ningún acceso a Torneos | 1440×900 | Capturas de Cuenta común y admin en `/`, Mis grupos y Explorar |
| Navegación móvil | drawer, Navbar, inventario admin/no admin, ausencia total de Torneos, cierre después de navegar, foco, tap targets, overflow | 360×800 y 390×844 | Capturas y assertions de viewport/scroll |
| Regresión Inicio autenticado | saludo, Pendientes y accesos rápidos permanecen; acceso a Mis grupos funciona | 1440×900, 360×800 y 390×844 | Smoke documentado |
| Regresión destinos | carga de `/dashboard/groups` y `/dashboard/groups/explore`; URL directa de rutas retiradas sigue resolviendo según reglas vigentes | Navegador local | Matriz de rutas PASS |
| Calidad | archivos tocados, TypeScript, build y baseline | ESLint focal, `npm run typecheck`, `npm run build`, `npm run lint:baseline` | Comandos y resultados |

### Matriz manual mínima

1. **1440×900, sin sesión:** copy acordado; acceso Google; sin sidebar ni bloques retirados.
2. **1440×900, sesión iniciada:** `Ir a Mis grupos` en `/`; al seguirlo, sidebar simplificado;
   navegación a Mis grupos y Explorar; resaltado correcto.
3. **360×800, sin sesión:** copy legible, acción accesible, sin overflow horizontal.
4. **360×800, sesión iniciada:** abrir drawer, comprobar inventario, navegar a Mis grupos y confirmar
   cierre; repetir con Explorar.
5. **390×844, sesión iniciada:** repetir drawer, perfil y destinos; confirmar foco visible, scroll y
   ausencia de recorte.
6. **Cuenta administradora, 1440×900:** revisar sidebar, Navbar y menú de cuenta; confirmar que no
   aparecen `Torneos`, `Mis torneos`, `Mi gestión` ni enlaces equivalentes y que las opciones no
   relacionadas permanecen.
7. **Cuenta administradora, 360×800 y 390×844:** abrir el drawer, revisar todos los niveles y
   confirmar la misma ausencia; comprobar además que el cierre al navegar continúa vigente.
8. **Cuenta nueva:** completar primer acceso y confirmar `/dashboard` más Cuenta inicializada.
9. **Cuenta existente:** cerrar sesión, volver a ingresar y confirmar `/dashboard` sin duplicación de
   Cuenta.
10. **Regresión `/dashboard`:** Pendientes, estado vacío/error/reintento disponible según fixture y
   accesos rápidos sin modificaciones.

## 14. Componentes reutilizados

| Componente | Reutilización | Adaptación | Riesgo |
| --- | --- | --- | --- |
| `AuthProvider` / `authService` | Sesión, alta implícita, login y errores | Ninguna contractual | Confundir registro e inicio como dos mecanismos distintos |
| `accountNavigation.ts` | Fuente única de escritorio/móvil | Reducir inventario y suprimir grupos vacíos | Dejar `Mi gestión` vacío o retirar opciones futuras no relacionadas |
| `AppSidebar` | Navegación escritorio, tema, Cuenta y logout | Ninguna estructural | Regresión de activo en rutas profundas |
| `Navbar` | Login y drawer móvil | Ninguna estructural | No cerrar drawer al navegar |
| `activeRoute.mjs` | Coincidencia específica | Sólo pruebas | Resaltar Mis grupos en vez de Explorar |
| layouts público/protegido | Composición según sesión | Ninguna | Flash o CTA contradictoria durante carga |

## 15. Estructuras anteriores retiradas

| Estructura | Consumidor anterior | Reemplazo | Evidencia de retiro |
| --- | --- | --- | --- |
| Bloque `Torneos vigentes` de `/` | Inicio público | Posicionamiento de grupos | DOM ausente; imports/estado exclusivo ausentes |
| Bloque `Próximos partidos` de `/` | Inicio público | Posicionamiento de grupos | DOM ausente; imports/estado exclusivo ausentes |
| Entrada `Grupos` | Sidebar/Navbar | `Explorar grupos` como acceso MVP, sin equivalencia de ruta | Inventario común y ambos viewports |
| Entrada pública `Torneos` | Sidebar/Navbar | Ninguno en este corte | Inventario común y ambos viewports |
| Entrada `Mis torneos` | Submenú Mi perfil | Ninguno en este corte | Perfil conserva Ficha personal |
| Entrada `Mi gestión > Torneos` | Submenú administrativo | Ninguno durante el MVP | Cuenta admin sin enlace en escritorio y móvil |
| Contenedor `Mi gestión` vacío | Sidebar/Navbar | Ninguno | No se renderiza si no conserva otros hijos |

No se retiran las rutas, componentes compartidos, servicios ni contratos subyacentes. Tampoco se
declara que `Explorar grupos` sea un alias de `/groups`.

## 16. Checkpoint, rollback y evidencia de cierre

- **Commit inicial:** `827379abfb10bab21141ef1f13e7bdfa822424bc`.
- **Rama de implementación:** a crear sólo con autorización posterior.
- **Estado de pruebas inicial:** deberá registrarse al abrir la implementación.
- **Rollback de código:** revertir exclusivamente el commit del incremento; no hay datos que
  revertir.
- **Datos de prueba:** no modificar datos productivos; cuentas de prueba identificadas sin guardar
  credenciales en evidencia.
- **Interrumpir si:** el cambio exige modificar autenticación, autorización, rutas, código, datos o
  permisos de Torneos, backend o el Inicio autenticado. Retirar sus enlaces visibles sí pertenece a
  IUX-07.
- **Reanudar si:** existe una decisión separada que amplía expresamente el alcance.

El cierre deberá adjuntar commits, comandos de calidad, matriz de rutas, pruebas de primer acceso e
inicio de sesión, capturas 1440/360/390, verificación del drawer y activo, regresión de `/dashboard`
y evidencia admin en escritorio y móvil de que no se ofrece ningún acceso visible a Torneos.

## 17. Decisiones de alcance y pendientes

### Decisiones adoptadas en esta ficha

1. `IUX-07` es el siguiente código disponible.
2. Registro e inicio de sesión son dos escenarios de aceptación del mismo acceso Google vigente;
   no se crea una acción técnica separada de registro.
3. `Ir a Mis grupos` apunta a `/dashboard/groups`, no al Inicio autenticado `/dashboard`.
4. `Explorar grupos` conserva `/dashboard/groups/explore`; `/groups` no se reutiliza ni redirige.
5. Se retiran todos los accesos visibles a Torneos, incluido `Mi gestión > Torneos`; como hoy es el
   único hijo, se oculta `Mi gestión`. Una opción futura o concurrente ajena a Torneos deberá
   conservarse.
6. El contenido público secundario debe ser coherente con grupos; su composición visual exacta no
   altera el alcance ni bloquea la implementación.

### Decisiones pendientes que afecten el alcance

**Ninguna identificada.** El retiro de `Mi gestión > Torneos` ya forma parte del alcance. Eliminar
las URL o el código de Torneos, modificar sus datos o permisos, separar registro de login, cambiar
el destino post-auth o rediseñar el Inicio autenticado sería una ampliación y requeriría decisión
separada antes de implementar.

