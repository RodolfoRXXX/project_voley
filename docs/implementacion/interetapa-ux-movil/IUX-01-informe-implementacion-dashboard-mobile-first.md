# IUX-01 — Informe de implementación local del dashboard mobile-first

## Estado

- **Resultado:** cierre técnico local confirmado y versionado; integración en `dev` pendiente.
- **Rama:** `feat/iux-01-dashboard-mobile-first`.
- **Checkpoint:** `dev@5def9ea5a7d4dd7472880f920032fa51843d00c8`, que contiene IUX-02A e IUX-02B.
- **Fecha de cierre técnico local:** 2026-10-28.
- **Commits de implementación:** `f88f47f` (correctivos UAT) y `52e20eb` (presentación IUX-01).
- **Límites:** sin despliegue, backfill remoto, datos productivos ni
  habilitación productiva. `ENABLE_DASHBOARD_TASK_PROJECTION` continúa deshabilitado por defecto.

## Comportamiento implementado

1. El dashboard presenta “Dashboard” con jerarquía secundaria y el saludo desde
   `account.displayName`, luego `firebaseUser.displayName`; si ambos faltan, muestra sólo “Hola”.
2. Pendientes comienza contraído, consulta IUX-02B al montar y expone badge sólo cuando la respuesta
   declara cobertura completa y health `READY`.
3. La lista global presenta exclusivamente N20/N31, muestra Grupo y Temporada cuando existe, pagina
   bajo demanda y navega a los deep-links contextuales ya implementados.
4. La consulta se repite al volver porque la ruta se monta nuevamente, y también mediante el control
   manual. No hay polling, listener ni handler de `focus`.
5. Una sesión nueva construye otro cliente; cleanup invalida solicitudes anteriores y limpia lista,
   total, cursores y health. Las respuestas tardías se descartan mediante el request gate de IUX-02B.
6. Carga, error/reintento, `UPDATING`, `REBUILDING`, `DEGRADED`, proyección deshabilitada/no preparada
   y vacío verdadero son estados diferentes. Un resultado incompleto invalida el total anterior.
7. Los accesos rápidos son enlaces a Crear grupo, Mis grupos, Ficha personal y Mis obligaciones. No
   ejecutan comandos; el acceso a obligaciones no incorpora N30 a Pendientes.
8. Se retiraron sólo del dashboard el listener de `pendingAlerts`, dismiss, consultas N+1 y UI de
   Torneos destacados/actividades. Sus módulos y rutas externas permanecen intactos.
9. En móvil, cada acceso rápido reúne icono y etiqueta visible en un enlace de 80 px de ancho, admite
   dos líneas y hace wrap; desde `sm` conserva la presentación amplia con icono, título y descripción.

## Correcciones surgidas de la UAT local del 2026-10-27

### Defecto de fixture en Economía

Los dos pagos iniciales se habían escrito directamente con `schemaVersion=1` y campos económicos
que esa versión no admite (`balanceMinor`, `netConfirmedIncomeMinor` y `economicRevision`). El
hidrator usa forma exacta por versión y falló en
`firestorePaymentStore.js:243`; el wrapper produjo
`PaymentIncompatibleStateError`, reason `INCOMPATIBLE_STATE`, desde
`persistedPayment` (`firestorePaymentStore.js:277`) y ambos callables devolvieron
`FAILED_PRECONDITION`: `getOwnerGroupEconomySummary` y `listGroupObligations`.

No intervino el deep-link: la reproducción directa con Owner y `groupId` correctos falló igual. Se
eliminaron sólo los diez documentos económicos sintéticos afectados —dos pagos, dos entregas, tres
receipts, dos guards y una aplicación— y el generador local pasó a usar
`createGroupChargeConcept`, `generateMembershipObligations` y `reportOwnPaymentDelivery`. Con los
documentos canónicos, resumen y Deudas responden HTTP 200 en ambos Grupos. La reproducción aislada
del documento inválido se eliminó inmediatamente después de capturar el stack.

### Defecto de descubrimiento del worker

Las resoluciones originales sí dejaron sus fuentes terminales y outbox durable, pero el scope del
primer Grupo quedó `sourceRevision=12`, `projectedRevision=8`, `DIRTY`; las revisiones 9–12 estaban
`PENDING`, sin lease, error ni intento. El manifiesto del Emulator no contenía
`onDashboardTaskOutboxCreate`, `onDashboardTaskProjection` ni
`onDashboardTaskReconciliation`: el flag del proceso padre no estaba disponible cuando
`index.js` condicionaba sus exports.

La corrección de IUX-02A declara siempre los triggers y aplica el flag dentro de cada handler. En
`false` siguen siendo no-op y no procesan ni escriben; en esta UAT el archivo local específico del
project ID demo los habilita sin tocar configuración productiva. La prueba normal, sin backfill,
demostró:

- alta N20: scope 14→15, evento aplicado y respuesta `READY` con N20+N31;
- resolución N20+N31 en el segundo Grupo: fuentes `aprobada` y `CONFIRMED/APPLIED`, scope 10→14,
  outbox pendiente vacío y respuesta `READY`, `totalTasks=0`, lista vacía.

El backfill se usó sólo para recomponer la generación después de sustituir los fixtures inválidos;
no fue la solución para las altas o resoluciones posteriores.

### Ajuste visual de accesos rápidos

En 360×800 los cuatro accesos miden 80×94 px y se distribuyen 3+1; en 390×844 entran en una fila.
Cada uno muestra icono y etiqueta centrada —hasta dos líneas— y conserva `aria-label` específico. El
contenedor permite wrap y no fuerza una fila. Desde `sm` se conserva la card amplia con descripción.
No hubo overflow horizontal en ninguno de los dos tamaños móviles.

## Archivos locales de IUX-01

| Archivo | Cambio |
| --- | --- |
| `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx` | Reemplazo del consumidor legacy por composición mobile-first |
| `volley-ranking-frontend/src/components/dashboard/PendingTasksSection.tsx` | Plegable, estados, consulta, paginación y navegación |
| `volley-ranking-frontend/src/services/dashboardPresentation.mjs` | Saludo y deduplicación estable de páginas |
| `volley-ranking-frontend/src/services/dashboardPresentation.d.mts` | Contrato TypeScript del helper |
| `volley-ranking-system/functions/test/unit/dashboardMobileFirstIux01.test.js` | Pruebas funcionales y estructurales del corte |
| `docs/implementacion/interetapa-ux-movil/evidencia/IUX-01/*.png` | Capturas locales con datos sintéticos |
| Esta ficha e informe | Estado y evidencia del incremento |

## Validación funcional y visual

La revisión se ejecutó contra Auth, Firestore y Functions Emulator del proyecto sintético
`demo-iux01-uat`. Se autenticó una cuenta sintética y se cargaron 12 estados fuente/proyección de
prueba (6 N20, 6 N31) repartidos en dos Grupos; no se usaron datos ni credenciales productivos. El
fixture visual valida presentación y consumo, no sustituye las pruebas de writers/proyector de
IUX-02A ni debe publicarse. Esas pruebas canónicas ya demostraron alta/resolución y procesamiento
durable mediante los comandos existentes.

| Caso | Evidencia local |
| --- | --- |
| 360×800 | Sin overflow (`scrollWidth=clientWidth=360`), título/badge completos, control táctil de actualización con nombre accesible |
| 390×844 | Lista N20/N31 expandida con contexto visible y navegación |
| 768×1024 | Sin overflow (`768=768`) |
| 1280×800 | Sin overflow (`1280=1280`) |
| 1440×900 | Sidebar/layout compartido intactos y lista legible (`1440=1440`) |
| Paginación | 10 elementos iniciales + 2 al usar “Ver más”; 12 IDs únicos y sin cursor restante |
| Total | Badge `12 tareas` sólo con `READY` y cobertura completa |
| Proyección no preparada | Error explícito sin badge ni cero; reintento disponible |
| Sesión | Auth Emulator; descarte tardío cubierto por request gate y prueba estructural IUX-01/IUX-02B |
| UAT correctiva 360×800 | `scrollWidth=clientWidth=360`; cuatro enlaces 80×94 en distribución 3+1, etiquetas legibles y plegable con vacío verdadero |
| UAT correctiva 390×844 | `scrollWidth=clientWidth=390`; cuatro enlaces 80×94 en una fila, etiquetas legibles y vacío únicamente “No hay pendientes”, sin badge cero |
| UAT correctiva 1280×800 | `scrollWidth=clientWidth=1280`; icono y texto visibles en cards 296×112 |
| Economía canónica | PASS — resumen y Deudas HTTP 200 en los dos Grupos |
| Convergencia normal | PASS — resolución N20/N31 por writers canónicos termina `READY`, total 0, sin outbox pendiente |
| Deep-link N20 | PASS — abre Integrantes sobre Carla Candidata y conserva las decisiones en el flujo contextual |
| Deep-link N31 | PASS — abre el diálogo de la entrega exacta de Pablo Pagador; no muestra incompatibilidad canónica ni error de resumen |

Capturas:

- [360×800, contraído](./evidencia/IUX-01/dashboard-360x800-contraido.png)
- [390×844, N20/N31](./evidencia/IUX-01/dashboard-390x844-pendientes.png)
- [1440×900, escritorio](./evidencia/IUX-01/dashboard-1440x900-pendientes.png)
- [390×844, accesos rápidos móviles](./evidencia/IUX-01/dashboard-390x844-accesos-rapidos.png)
- [360×800, accesos rápidos móviles](./evidencia/IUX-01/dashboard-360x800-accesos-rapidos.png)
- [390×844, vacío verdadero después de resolver](./evidencia/IUX-01/dashboard-390x844-sin-tareas.png)

La inspección técnica de capturas se completó. El usuario confirmó que el recorrido UAT probado
funciona sin errores, que la dirección visual general es satisfactoria y que el arranque local
corregido funciona. Estas confirmaciones no se extienden a casos no ejecutados ni a producción.

## Pruebas y gates

| Gate | Resultado |
| --- | --- |
| Unidad focal IUX-01 | PASS, 1/1 archivo; saludo, deduplicación, links, plegable, ausencia legacy/polling/comandos |
| Unitarias completas Functions | PASS, 82/82 en la corrida previa al ajuste visual; el ajuste posterior sólo cambió markup del control de actualización |
| Typecheck frontend final | PASS |
| Lint baseline final | PASS; baseline intacto, 31 errores/8 warnings conocidos y 11 hallazgos previamente resueltos |
| Build frontend final | PASS; `/dashboard` generado. La primera corrida quedó bloqueada por `EPERM` del sandbox al abrir un puerto interno de Turbopack; la repetición fuera del sandbox pasó sin cambios |
| Validación responsive CDP | PASS en 360/390/768/1280/1440, sin overflow horizontal |
| Functions syntax final | PASS — 484/484 |
| Focal IUX-02B por correctivo de Cuenta sin contextos | PASS — 1 caso ejecutado y 2 omitidos por el patrón focal |
| `git diff --check` | PASS antes del versionado |
| Unitarias Functions tras correcciones UAT | PASS — 82/82 archivos del runner canónico |
| Typecheck frontend tras correcciones UAT | PASS |
| Lint baseline tras correcciones UAT | PASS — 31 errores/8 warnings conocidos y 11 hallazgos resueltos |
| Browser correctivo | PASS técnico en 360×800 y 390×844: cuatro destinos exactos, etiquetas visibles, wrap y cero overflow; dirección visual general confirmada por el usuario |
| Arranque local coherente | PASS — frontend y tres emuladores usan `demo-iux01-uat`; `ensureMyAccount` 200 y Cuenta sintética inicializada |
| Cuenta sin Grupos | PASS — lector revalida cero contextos, responde READY/0 y muestra únicamente “No hay pendientes” |

No se repitió el gate integral IUX-02. El correctivo posterior toca únicamente la rama de lectura
para una Cuenta canónica con cero contextos: se cubrió con la regresión focal IUX-02B, sintaxis y
recorrido real en navegador. No modifica writers, proyector, Rules, índices ni decisiones.

## Correctivo de arranque local del 2026-10-28

La causa del error de inicialización no fue una política CORS: `.env.local` compilaba el frontend
con `project-groupvolley`, mientras Functions Emulator servía el proyecto demo. La ruta incorrecta
`/project-groupvolley/us-central1/ensureMyAccount` respondió 404 sin cabeceras CORS y Firefox la
presentó como fallo CORS con estado null. Para `demo-iux01-uat`, el preflight respondió 204 con el
origen local y el callable respondió 200 al autenticarse.

El entorno local ignorado ahora declara `demo-iux01-uat` en `NEXT_PUBLIC_FIREBASE_PROJECT_ID` y en
`NEXT_PUBLIC_FUNCTIONS_BASE_URL`; `firebase.ts` toma también `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` en
lugar de fijar el dominio productivo. Producción conserva su archivo y `NEXT_PUBLIC_USE_EMULATOR=false`.
Functions cargó `.env.demo-iux01-uat`, con proyección habilitada sólo para Emulator.

El navegador creó una identidad Google sintética mediante Auth Emulator, ejecutó
`ensureMyAccount` (preflight 204, POST 200) y llegó al dashboard sin error de Cuenta. La primera
consulta reveló que una Cuenta sin Grupos no tenía metadata proyectada; el reader se corrigió para
revalidar cero contextos y devolver `READY`, total 0, sin writes ni backfill. La recarga final obtuvo
`listMyDashboardTasks` 200 y mostró “No hay pendientes” sin badge cero.

## Limitaciones y pendientes

- El usuario confirmó que el recorrido UAT probado funciona sin errores, que la dirección visual
  general es satisfactoria y que el arranque corregido funciona. Permanecen fuera de esa
  confirmación los casos no recorridos, cualquier entorno remoto y producción.
- IUX-01 tiene cierre técnico local y está versionado. IUX-02A/IUX-02B están implementados y
  validados técnicamente en local, pero IUX-02 completo continúa abierto hasta su habilitación y
  validación coordinada/productiva autorizadas por separado.
- Activación, backfill, presupuesto/rendimiento productivo y gates de seguridad/operación son
  condiciones posteriores; las mediciones de Emulator no son SLO productivos.
- No se habilitaron proyección ni callable en la configuración por defecto y no se retiró ninguna
  ruta o funcionalidad externa del panel legacy.
- Los gates productivos pendientes de E3 continúan sin cambios.

## Prueba local manual

1. Iniciar Auth, Firestore y Functions Emulator con un project ID `demo-*`,
   `ENABLE_DASHBOARD_TASK_PROJECTION=true` y un secreto sintético de cursor de al menos 32 caracteres.
2. Preparar N20/N31 sólo en Emulator mediante los comandos canónicos y ejecutar allí el
   procesamiento/backfill de IUX-02A hasta obtener scope/generación `READY`.
3. Iniciar el frontend con `NEXT_PUBLIC_USE_EMULATOR=true` y el mismo project ID.
4. Ingresar con una cuenta sintética, abrir `/dashboard`, expandir Pendientes y probar actualización,
   paginación y cada deep-link.
5. Resolver desde Integrantes/Economía, volver al dashboard y confirmar que la consulta al remontar
   retira la tarea. Repetir con cambio/logout de cuenta.

Nunca ejecutar este procedimiento de revisión contra producción ni publicar los fixtures.

## Entorno usado para la revisión humana

- Proyecto Emulator: `demo-iux01-uat`.
- Durante la sesión se usaron `http://127.0.0.1:3000/dashboard` y
  `http://192.168.100.5:3000/dashboard`; los procesos se detuvieron al terminar y esas URL no se
  declaran disponibles permanentemente.
- Frontend, Auth, Firestore y Functions usan el mismo project ID; los cuatro endpoints responden por
  `192.168.100.5`. Functions responde 404 sólo en su raíz, como corresponde, y sirve los callables
  bajo su ruta regional.
- `uat.owner@sportexa.test` / Olivia Owner conserva dos tareas reales en Vóley Centro UAT: una N20
  de Carla Candidata y una N31 de Pablo Pagador.
- `uat.owner2@sportexa.test` / Omar Owner conserva el segundo Grupo y el vacío verdadero ya
  comprobado después de resolver sus N20/N31.
- El login no usa contraseñas: “Ingresar con Google” abre Auth Emulator y permite elegir la cuenta
  sintética existente.
- El archivo local `functions/.env.demo-iux01-uat`, sin commit, habilita únicamente este project ID
  demo y contiene un secreto de cursor sintético. Debe excluirse del versionado.

La confirmación humana queda limitada al recorrido descripto. No acredita escenarios no ejecutados,
despliegue ni operación productiva.
