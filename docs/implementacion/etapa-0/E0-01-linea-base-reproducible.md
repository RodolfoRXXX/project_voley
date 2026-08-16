# E0-01 — Línea base reproducible

**Proyecto:** SPORTEXA  
**Fecha de ejecución:** 16 de agosto de 2026  
**Zona horaria:** America/Argentina/Buenos_Aires  
**Alcance:** diagnóstico y documentación; no se corrigió funcionalidad, arquitectura, seguridad ni deuda técnica.  
**Veredicto:** **COMPLETADO CON OBSERVACIONES**

## 1. Referencias y método

Se tomó como referencia normativa:

- los Documentos 1, 1.5, 2, 3 y 4 congelados en `docs/arquitectura/`;
- `docs/transicion/Informe de auditoría técnica del repositorio actual producido por Codex.md`;
- el roadmap y los capítulos 1–6 de `docs/transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md`, en particular 6.3 y la secuencia E0-01 del capítulo 11.

La intervención se limitó a inspección del repositorio, comprobaciones estáticas, arranques locales temporales y documentación. No se ejecutaron migraciones, seeds, backfills, limpiezas, despliegues ni llamadas funcionales. No se consultaron ni modificaron recursos de proyectos Firebase. No se leyeron ni registraron valores de secretos; sólo se inventariaron nombres.

## 2. Estado inicial de Git

| Evidencia | Resultado |
| --- | --- |
| Rama | `dev` |
| Commit | `d86318a0281455835d200784c46e54efce76cf51` (`d86318a`) |
| Fecha del commit | `2026-08-15T21:04:10-03:00` |
| Tracking | `dev...origin/dev`, divergencia local/remota conocida `0/0` |
| Estado inicial | Limpio; sin cambios tracked, staged ni untracked |
| Cambios locales existentes | Ninguno visible para Git. Sí existían artefactos ignorados: archivos `.env*`, `.next`, `node_modules` y logs de Firebase. Se preservaron. |

Antes de crear este informe se volvió a verificar que Git continuaba limpio. El build sólo regeneró artefactos ignorados bajo `.next`; no se limpió ni restauró ese directorio.

## 3. Herramientas y versiones

| Herramienta | Requisito identificado | Versión efectiva | Evaluación |
| --- | --- | --- | --- |
| Node.js | Functions declara `nodejs20`; Next 16.1.3 exige `>=20.9.0` | `v20.20.0` | Compatible |
| npm | No existe versión fijada ni `packageManager` | `10.8.2` | Funciona, pero no está fijada |
| Firebase CLI | No existe versión fijada en el repositorio | `15.3.1` | Funciona, pero no está fijada |
| Java | Necesario para Firestore Emulator; sin versión fijada | OpenJDK `21.0.10` | Firestore Emulator inició correctamente |

No existen `.nvmrc`, `.node-version`, campos `engines` en los `package.json` ni declaración `packageManager`. La única fijación efectiva de Node está en `firebase.json` para Functions y en el requisito transitivo de Next. Esto permite ejecutar con el entorno actual, pero no reconstruir automáticamente las versiones de herramientas desde el repositorio.

## 4. Estructura técnica observada

| Área | Ubicación | Configuración principal |
| --- | --- | --- |
| Raíz | `/` | README histórico y paquete npm independiente con `lucide-react`; no es un workspace |
| Frontend | `volley-ranking-frontend/` | Next.js 16.1.3, React 19.2.3, TypeScript, ESLint, Firebase Web SDK |
| Functions | `volley-ranking-system/functions/` | Firebase Functions v1, JavaScript CommonJS, Node 20 configurado por Firebase |
| Reglas | `volley-ranking-system/firestore.rules` | Reglas Firestore versionadas |
| Índices | `volley-ranking-system/firestore.indexes.json` | Índices Firestore versionados |
| Firebase | `volley-ranking-system/firebase.json` | Functions, reglas, índices y emuladores |
| Alias de proyecto | `volley-ranking-system/.firebaserc` | `default = project-groupvolley` |
| Emuladores | `firebase.json` | Auth 9099, Firestore 8080, Functions 5001, UI 4000; hosts `0.0.0.0` |

No se encontró configuración de Storage, Realtime Database, Hosting ni Pub/Sub Emulator. Como consecuencia, los triggers programados fueron ignorados durante la prueba local al no existir Pub/Sub Emulator.

## 5. Instalación reproducible

### 5.1 Procedimiento declarado por los lockfiles

Desde la raíz del repositorio:

```bash
npm ci
npm ci --prefix volley-ranking-frontend
npm ci --prefix volley-ranking-system/functions
```

Los tres directorios poseen `package-lock.json` versión 3. No deben sustituirse estos comandos por un único `npm ci` en la raíz: no existe un npm workspace y cada árbol es independiente.

### 5.2 Resultado de verificación

- `npm ci --dry-run --ignore-scripts --offline` resolvió los tres lockfiles sin modificarlos.
- Una instalación real en directorios temporales, con `--ignore-scripts --offline`, completó Functions con 306 paquetes.
- La instalación real offline de raíz y frontend no completó porque el caché local no contiene todos los tarballs requeridos (`react` transitivo de `lucide-react` en raíz y `lucide` en frontend). Esto no demuestra inconsistencia del lockfile; demuestra que una instalación limpia requiere acceso al registro npm o un caché/artefacto completo.
- No se autorizó acceso de red para instalar dependencias y no se modificaron dependencias.
- Los `node_modules` existentes permiten typecheck, lint, build y arranque, pero `npm ls --depth=0` del frontend devuelve exit 1: falta `lucide@^0.563.0` y existen cinco paquetes extraneous. El build aprueba porque no se encontró un consumidor vigente de esa dependencia declarada.
- `npm ls --depth=0` aprueba en raíz y Functions. Functions tiene efectivamente `firebase-functions@4.9.0`, resuelto por el rango `^4.4.1`.

**Conclusión de instalación:** reproducible con los tres lockfiles y acceso al registro npm; no reproducible totalmente offline con el caché actual. El repositorio no fija Node, npm ni Firebase CLI de forma autosuficiente.

## 6. Ejecución reproducible

### 6.1 Frontend de desarrollo

```bash
cd volley-ranking-frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Resultado observado: Next.js inició con webpack y alcanzó `Ready` en 5,3 s durante una prueba acotada. El proceso fue detenido por timeout, sin invocar rutas funcionales.

Para operación segura con emuladores, `NEXT_PUBLIC_USE_EMULATOR` debe ser `true`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` debe contener el mismo ID `demo-*` usado por Firebase CLI y `NEXT_PUBLIC_FUNCTIONS_BASE_URL` debe apuntar a Functions Emulator. Si `NEXT_PUBLIC_USE_EMULATOR` no vale exactamente `true`, Auth, Firestore y Functions usan sus endpoints remotos configurados.

### 6.2 Build y servidor de producción local

```bash
cd volley-ranking-frontend
npm run build
npm run start
```

`npm run build` aprobó con Next.js 16.1.3: compilación, TypeScript, generación de 18 páginas estáticas y catálogo de rutas completados. Emitió sólo una advertencia de `caniuse-lite` desactualizado. `npm run start` no fue necesario para demostrar la ejecución solicitada y requiere el build previo; no fue ejecutado.

El build escribe en `.next`. El primer intento dentro del sandbox falló porque Turbopack intentó abrir un puerto interno; repetido en el entorno local autorizado, aprobó. Por tanto, ese primer fallo no pertenece al baseline funcional del proyecto.

### 6.3 Functions y emuladores

Functions no posee script de ejecución independiente. Se carga mediante Firebase Emulator Suite:

```bash
cd volley-ranking-system
firebase emulators:start \
  --project demo-sportexa-local \
  --only auth,firestore,functions \
  --config firebase.json
```

Resultado observado con `demo-sportexa-e0-01`:

- Auth, Firestore, Functions y Emulator UI iniciaron;
- el CLI confirmó que los servicios no emulados para el ID demo fallarán;
- las reglas e índices locales fueron tomados desde la copia temporal;
- las Functions HTTP/callable y los triggers Auth/Firestore fueron descubiertos e inicializados;
- los triggers programados se ignoraron porque Pub/Sub Emulator no está configurado;
- el proceso se cerró limpiamente por timeout;
- se excluyeron `.firebaserc` y `.secret.local` de la copia temporal.

No debe usarse para una prueba segura el comando corto `firebase emulators:start` tal como está hoy el repositorio, porque heredaría el proyecto remoto por defecto de `.firebaserc`.

## 7. Variables y configuraciones requeridas

No se registran valores.

### 7.1 Frontend y rutas server-side

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_USE_EMULATOR`
- `NEXT_PUBLIC_FUNCTIONS_BASE_URL`

También aparece `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` en archivos de ambiente, pero el código actual usa un `authDomain` literal y no consume esa variable.

### 7.2 Functions e integraciones

- `GMAIL_USER`
- `GMAIL_PASS`
- `WEB_APP_URL`
- `PUSH_VAPID_PUBLIC_KEY`
- `PUSH_VAPID_PRIVATE_KEY`
- `PUSH_VAPID_SUBJECT`
- `HTTP_API_ALLOWED_ORIGINS`
- `ENABLE_ON_MATCH_DEADLINE`
- `ENABLE_ON_MATCH_START`
- `ENABLE_ON_PENDING_ALERTS_MAINTENANCE`

### 7.3 Variables de control del runtime/emuladores

- `NODE_ENV`
- `FUNCTIONS_EMULATOR`
- `FIRESTORE_EMULATOR_HOST`

Archivos encontrados, sin leer valores: frontend `.env.local`, `.env.staging`, `.env.production`; Functions `.secret.local`. Los `.env*` del frontend están ignorados. `volley-ranking-system/functions/.secret.local` está versionado por Git, lo que constituye un riesgo de higiene de secretos aunque su contenido no se haya expuesto en esta intervención.

## 8. Matriz de comandos ejecutados

| Comando o verificación | Resultado | Clasificación / limitación |
| --- | --- | --- |
| `git branch --show-current`, `git rev-parse HEAD`, `git status` | Aprueba | Sólo lectura; estado inicial conocido |
| Versiones Node/npm/Firebase/Java | Aprueba | Firebase CLI mostró fallo no bloqueante de su update-check en el primer sondeo |
| Inventario `rg`, `find`, lectura de manifests/configuración | Aprueba | No se mostraron valores de secretos |
| `npm ls --depth=0` raíz | Aprueba | Depende de `node_modules` local |
| `npm ls --depth=0` frontend | Falla | Falta `lucide`; cinco paquetes extraneous |
| `npm ls --depth=0` Functions | Aprueba | Depende de `node_modules` local |
| `npm ci --dry-run --ignore-scripts --offline` en los 3 árboles | Aprueba | Simula; no instala |
| `npm ci --ignore-scripts --offline` temporal, Functions | Aprueba | Instalación limpia local comprobada |
| Mismo comando temporal, raíz/frontend | Falla | Caché npm incompleto; requeriría registro npm |
| `tsc --noEmit --incremental false` | Aprueba, exit 0 | Typecheck explícito no definido en scripts |
| `npm run lint` | Falla, exit 1 | 54 problemas: 41 errores, 13 warnings |
| `node --check` sobre 85 JS de Functions | Aprueba, 85/85 | Sintaxis, no comportamiento |
| Inventario de `*.test.*`, `*.spec.*`, `__tests__` | 0 archivos | No existe suite |
| `npm test` en Functions | Falla, exit 1 | Marcador `Error: no test specified`; no es una prueba |
| `npm run build` frontend | Aprueba, exit 0 | Escribe `.next`; necesitó permitir puertos internos de Turbopack |
| `npm run dev -- --hostname 127.0.0.1 --port 3100` | Aprueba el arranque | `Ready` en 5,3 s; detenido por timeout |
| `firebase emulators:start --project demo-* --only auth,firestore,functions` | Aprueba el arranque | Copia temporal sin alias ni secretos; detenido por timeout |

## 9. Baseline de calidad

| Dimensión | Baseline E0-01 |
| --- | --- |
| Typecheck frontend | **APRUEBA** (`tsc --noEmit --incremental false`, exit 0) |
| Lint frontend | **FALLA**: 54 problemas, 41 errores y 13 warnings |
| Build frontend | **APRUEBA** (`next build`, exit 0) |
| Sintaxis Functions | **APRUEBA**: 85/85 archivos JavaScript |
| Pruebas frontend | **NO IMPLEMENTADAS**: sin script y sin archivos de prueba |
| Pruebas Functions | **NO IMPLEMENTADAS**: script marcador que falla |
| Emuladores | **APRUEBAN EL ARRANQUE** para Auth, Firestore y Functions; scheduled Functions quedan fuera |

Este baseline coincide con la auditoría previa en typecheck, lint, sintaxis y ausencia de pruebas, y agrega evidencia de build, frontend y emuladores.

## 10. Scripts y acciones sensibles

| Acción | Riesgo | Estado E0-01 |
| --- | --- | --- |
| `migrate:group-admins` y variante `:write` | Migración/posible escritura remota | No ejecutadas; además apuntan a `src/scripts/migrateGroupAdmins.js`, archivo inexistente |
| `seed:dev` y `seed:dev:dry` | Seed/posible escritura remota | No ejecutadas; apuntan a `src/scripts/seedDevelopmentData.js`, archivo inexistente |
| `backfill:pending-alerts` | Aunque sea dry-run, inicializa Admin SDK y lee colecciones; sin emulator host puede leer remoto | No ejecutado |
| `backfill:pending-alerts:write` | Lee y escribe Firestore | No ejecutado |
| Callables, HTTP y triggers | Múltiples escrituras, borrados y envíos de correo/push al invocarse | Sólo se cargaron en emulador; no fueron invocados |
| `firebase deploy`, `firebase firestore:delete`, Auth import/export | Modifican o leen recursos remotos | No ejecutados; no hay scripts npm que los encapsulen |
| `npm ci` | Sustituye `node_modules` | Sólo se ejecutó realmente en directorios temporales |
| `npm run build` | Regenera `.next` | Ejecutado; artefactos ignorados |

Los nombres “dry” no bastan para considerar segura una acción: el backfill sin `--write` sigue leyendo Firestore y el seed dry-run ni siquiera existe en el commit actual.

## 11. Riesgo de conexión accidental con Firebase remoto

**Evaluación:** los emuladores pueden usarse de forma segura sólo con salvaguardas explícitas; la configuración por defecto no es suficientemente segura.

Riesgos comprobados:

1. `.firebaserc` selecciona `project-groupvolley` como proyecto por defecto.
2. El frontend sólo conecta emuladores cuando `NEXT_PUBLIC_USE_EMULATOR === "true"`; cualquier ausencia o valor distinto habilita endpoints remotos.
3. `NEXT_PUBLIC_FUNCTIONS_BASE_URL` controla rutas HTTP propias y puede apuntar de forma independiente a remoto.
4. Firebase Admin se inicializa sin project ID fijo y depende del entorno/credenciales.
5. Los hosts de emuladores son `0.0.0.0`, por lo que quedan accesibles desde otras interfaces de red, no sólo loopback.
6. Scripts dry-run pueden leer remoto si no se exportan hosts de emulador.
7. Durante la prueba, aun con `CI=1` y `FIREBASE_CLI_DISABLE_UPDATE_CHECK=true`, Firebase CLI consultó `firebase-public.firebaseio.com/cli.json` y escribió/materializó un archivo local de Application Default Credentials. No hubo acceso a recursos de un proyecto ni se mostraron credenciales, pero el comportamiento demuestra que el CLI no es completamente offline por defecto.

Salvaguarda mínima reproducible:

- usar siempre `--project demo-<nombre>`;
- excluir o no depender de `.firebaserc` en verificaciones;
- alinear el mismo ID demo en frontend;
- fijar explícitamente `NEXT_PUBLIC_USE_EMULATOR=true` y la URL local de Functions;
- verificar `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` y `FUNCTIONS_EMULATOR` antes de ejecutar scripts de datos;
- no invocar scripts de datos en E0-01;
- preferir hosts `127.0.0.1` en una futura corrección/configuración dedicada.

El propio CLI confirmó: para un ID `demo-*`, los intentos de acceso a servicios no emulados fallan. Esa es la evidencia principal de aislamiento respecto de proyectos Firebase remotos.

## 12. Bloqueantes reales y observaciones

### Bloqueantes para afirmar reproducibilidad plena

- no están fijadas en el repositorio las versiones de Node, npm y Firebase CLI;
- no se comprobó instalación limpia completa sin red para raíz/frontend por caché incompleto;
- el árbol `node_modules` actual del frontend no coincide con su manifest;
- no existe suite de pruebas y el script de test de Functions falla intencionalmente;
- dos scripts declarados de migración/seed apuntan a archivos ausentes;
- el uso seguro de emuladores depende de flags manuales; el comando por defecto hereda un alias remoto.

### Observaciones no bloqueantes del incremento diagnóstico

- typecheck, build, frontend, sintaxis backend y emuladores funcionan en el entorno actual;
- lint conserva el baseline auditado de 41 errores y 13 warnings;
- Functions Emulator advierte que `firebase-functions` es antiguo y que scheduled Functions no se cargan sin Pub/Sub Emulator;
- no se verificó comportamiento funcional, reglas mediante tests, integración frontend–backend ni servicios remotos, porque pertenecen a incrementos posteriores.

TECH-GAP-01 y TECH-GAP-02 permanecen sin corregir, conforme al límite explícito de E0-01.

## 13. Criterio de salida de E0-01

| Criterio del Documento 5 | Evidencia | Estado |
| --- | --- | --- |
| Estado técnico reproducible o bloqueos documentados | Git, herramientas, tres árboles npm, instrucciones y bloqueantes registrados | Cumplido |
| Emuladores necesarios pueden iniciarse | Auth, Firestore y Functions alcanzaron `All emulators ready` con ID demo | Cumplido con observación sobre Pub/Sub |
| Comandos técnicos poseen resultados esperados | Matriz de instalación, typecheck, lint, sintaxis, tests, build y arranque | Cumplido |
| Estado Git inicial conocido | Rama, commit, tracking y limpieza registrados | Cumplido |
| Ningún secreto incorporado a documentación/pruebas | Sólo se registraron nombres; la copia de emuladores excluyó secretos | Cumplido |
| Scripts destructivos identificados | Migraciones, seed, backfill, callables y comandos Firebase clasificados | Cumplido |

## 14. Veredicto y evidencia de cierre

**COMPLETADO CON OBSERVACIONES.**

E0-01 puede cerrarse porque existe evidencia fechada y reproducible de:

- estado Git inicial limpio en `dev` y commit exacto;
- herramientas efectivas y requisitos de runtime;
- procedimiento de instalación de los tres árboles npm y sus limitaciones;
- typecheck aprobado, baseline exacto de lint, build aprobado, 85/85 comprobaciones de sintaxis y ausencia comprobada de pruebas;
- arranque del frontend y carga de Functions mediante Auth/Firestore/Functions Emulator;
- aislamiento seguro mediante ID `demo-*`, junto con los riesgos de la configuración remota por defecto;
- inventario de variables sin valores e inventario de acciones sensibles no ejecutadas;
- ausencia de cambios funcionales, de reglas, dependencias, datos, despliegues, commits o pushes.

Las observaciones no impiden cerrar el incremento diagnóstico porque el criterio de 0.A permite documentar los bloqueos; sí impiden afirmar que el repositorio sea autosuficiente, offline y protegido por pruebas.

## 15. Siguiente incremento recomendado — no ejecutado

El siguiente incremento del roadmap es **E0-02 — Infraestructura mínima de pruebas**: incorporar un mecanismo de pruebas, preparar datos sintéticos y demostrar que ninguna prueba utiliza proyectos remotos. Debe comenzar usando obligatoriamente un project ID `demo-*` y guardas explícitas de emulator hosts. No se ejecutó ninguna parte de E0-02 durante esta intervención.
