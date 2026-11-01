# IUX — Entorno local coherente con emuladores

Esta guía configura frontend, Auth, Firestore y Functions con un mismo proyecto `demo-*`. No usa
credenciales ni datos productivos. Los archivos locales resultantes están ignorados por Git; sólo
los ejemplos seguros se versionan.

## Variables

### Functions

Ejemplo: `volley-ranking-system/functions/.env.demo.example`.

- `ENABLE_DASHBOARD_TASK_PROJECTION`: configuración local. En `true` habilita productores y workers
  IUX-02 únicamente dentro del proceso Emulator que cargue el archivo.
- `DASHBOARD_TASK_CURSOR_SECRET`: secreto. Firma los cursores del lector; debe tener al menos 32
  caracteres. Usar un valor sintético local diferente del placeholder y de cualquier secreto real.

Firebase CLI carga `.env.<projectId>`. Para el proyecto recomendado:

```bash
cp volley-ranking-system/functions/.env.demo.example \
  volley-ranking-system/functions/.env.demo-sportexa-local
```

Después de copiar, reemplazar únicamente el placeholder del secreto. No agregar el archivo generado
a Git.

### Frontend

Ejemplo: `volley-ranking-frontend/.env.local.example`.

- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
  `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` y `NEXT_PUBLIC_FIREBASE_APP_ID`: configuración necesaria
  para inicializar Firebase Web. Los valores del ejemplo son sintéticos para Emulator.
- `NEXT_PUBLIC_USE_EMULATOR`: configuración local obligatoria; debe valer exactamente `true`.
- `NEXT_PUBLIC_FIREBASE_EMULATOR_HOST`: host común de Auth, Firestore y Functions Emulator, sin
  protocolo ni puerto.
- `NEXT_PUBLIC_FUNCTIONS_BASE_URL`: base HTTP de callables/rutas propias. Debe contener el mismo
  project ID y host que el resto del entorno.

```bash
cp volley-ranking-frontend/.env.local.example volley-ranking-frontend/.env.local
```

Para acceso sólo desde la computadora se conservan los valores `127.0.0.1`. Para acceso desde un
celular en la misma LAN, reemplazar `127.0.0.1` por la IP LAN de la computadora tanto en
`NEXT_PUBLIC_FIREBASE_EMULATOR_HOST` como en `NEXT_PUBLIC_FUNCTIONS_BASE_URL`. Reiniciar Next.js
después de modificar variables. No cambiar archivos de producción.

## Arranque

Terminal 1, desde la raíz del repositorio:

```bash
cd volley-ranking-system
firebase emulators:start \
  --project demo-sportexa-local \
  --only auth,firestore,functions \
  --config firebase.json
```

Terminal 2:

```bash
cd volley-ranking-frontend
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Abrir `http://127.0.0.1:3000/dashboard` en la computadora. Desde otro equipo de la LAN, usar
`http://<IP-LAN>:3000/dashboard` después de configurar los dos hosts frontend como se indicó arriba.
El ID `demo-sportexa-local` debe permanecer idéntico en el nombre del `.env` de Functions, el
argumento `--project`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` y `NEXT_PUBLIC_FUNCTIONS_BASE_URL`.

La proyección continúa deshabilitada por defecto fuera de este archivo local. Esta preparación no
autoriza backfill remoto, despliegue ni uso de datos productivos.

## UAT liviana con frontend compilado

Esta variante reduce recompilaciones y evita mezclar el consumo del bundler con el de Functions.
Usar un solo proyecto demo (por ejemplo `demo-iux01-uat`) en `.env.local`, `.env.<projectId>`, el
argumento `--project` y `NEXT_PUBLIC_FUNCTIONS_BASE_URL`.

1. Detener servidores Next, emuladores y suites anteriores. Confirmar que
   `ENABLE_DASHBOARD_TASK_PROJECTION=true`; N20/N31 necesita sus productores y workers.
2. Desde `volley-ranking-frontend`, ejecutar `npm run build`. Next incorpora las variables
   `NEXT_PUBLIC_*` durante este paso: verificar antes del build el project ID, el host Emulator y
   la URL de Functions. No cambiar esas variables entre `build` y `start`.
3. Iniciar una única instancia de Auth, Firestore y Functions Emulator con el mismo `demo-*`. Para
   preservar la UAT vigente, importar el snapshot y exportar sobre él al detener normalmente:

   ```bash
   cd volley-ranking-system
   firebase emulators:start --project demo-iux01-uat \
     --only auth,firestore,functions --config firebase.json \
     --import /tmp/demo-iux01-uat-current \
     --export-on-exit /tmp/demo-iux01-uat-current
   ```

   Esta terminal permanece abierta. No iniciar otra instancia Emulator sobre los mismos puertos.

4. Después de que Functions informe que cargó `.env.demo-iux01-uat`, inicializar o reconciliar la
   generación IUX-02. No existe un comando `tasks`: el operador canónico es el script de Functions
   siguiente y termina por sí solo. Es idempotente sobre las fuentes N20/N31 y no reemplaza
   contadores manualmente:

   ```bash
   cd volley-ranking-system/functions
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
   GCLOUD_PROJECT=demo-iux01-uat \
   npm run iux-02a:backfill:emulator
   ```

   El resultado operativo debe mostrar `generationId: "live-v1"`, `dirtyScopes: 0`,
   `degradedScopes: 0`, `failedEvents: 0` y `processingEvents: 0`. `users: 0` sólo es válido si
   ninguna fuente canónica tiene destinatarios accionables. Si existen N20/N31 y sigue en cero,
   revisar primero compatibilidad de ownership/cuentas y los errores del outbox; no editar la
   proyección ni sus contadores.

5. En otra terminal, iniciar solamente el artefacto compilado:

   ```bash
   cd volley-ranking-frontend
   npm run start -- --hostname 127.0.0.1 --port 3000
   ```

   Esta terminal también permanece abierta durante la UAT.

6. Usar perfiles aislados del navegador para las dos sesiones y datos sintéticos del mismo
   Emulator. El procesamiento incremental de outbox y la reconciliación viven dentro de Functions
   Emulator de la terminal 1; no requieren otro daemon. Mantener
   `ENABLE_DASHBOARD_TASK_PROJECTION=true`.
7. Recorrer una vez Dashboard, Mis grupos y Economía con ambas sesiones; repetir el mismo recorrido
   y dejar 30 segundos de inactividad. No ejecutar simultáneamente build, suites o una segunda
   instancia de Next/Emulator. La ejecución serial de depuración sirve para diagnóstico funcional,
   no como prueba de rendimiento.

Para detener, usar `Ctrl+C` primero en `next start` y después en Emulator. Esperar el mensaje
`Export complete` antes de cerrar la terminal 1. También puede preservarse una sesión ya iniciada
con `firebase emulators:export /tmp/demo-iux01-uat-current --project demo-iux01-uat` desde una tercera
terminal; este comando no debe ejecutarse simultáneamente con otro export.

Para acceso desde Android real, repetir el procedimiento con `--hostname 0.0.0.0` y la IP LAN en
las variables indicadas anteriormente. El selector de fecha nativo y la simulación táctil deben
validarse en el dispositivo; el modo adaptable de escritorio no sustituye esa comprobación.
