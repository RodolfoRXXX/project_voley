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

```powershell
$source = 'volley-ranking-system\functions\.env.demo.example'
$target = 'volley-ranking-system\functions\.env.demo-iux01-uat'
if (-not (Test-Path -LiteralPath $target)) { Copy-Item $source $target }
```

```bash
test -e volley-ranking-system/functions/.env.demo-iux01-uat ||
  cp volley-ranking-system/functions/.env.demo.example \
     volley-ranking-system/functions/.env.demo-iux01-uat
```

Si el archivo ya existe, conservarlo. Después de copiar, configurar localmente
`ENABLE_DASHBOARD_TASK_PROJECTION=true` y reemplazar únicamente el placeholder del secreto por un
valor sintético de al menos 32 caracteres. No imprimir ni versionar el secreto. `.gitignore` excluye
`.env.*` locales y conserva los ejemplos `*.example`.

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

```powershell
if (-not (Test-Path -LiteralPath 'volley-ranking-frontend\.env.local')) {
  Copy-Item 'volley-ranking-frontend\.env.local.example' 'volley-ranking-frontend\.env.local'
}
```

```bash
test -e volley-ranking-frontend/.env.local ||
  cp volley-ranking-frontend/.env.local.example volley-ranking-frontend/.env.local
```

Para acceso sólo desde la computadora, usar `127.0.0.1`. Para un celular en una LAN privada,
reemplazar ese host por la IP LAN de la computadora en `NEXT_PUBLIC_FIREBASE_EMULATOR_HOST` y
`NEXT_PUBLIC_FUNCTIONS_BASE_URL`, y arrancar Next.js escuchando en `0.0.0.0`. `firebase.json` ya
escucha Auth, Firestore, Functions y Emulator UI en todas las interfaces para permitir ese acceso;
esto expone esos emuladores en la red local. Usar sólo una red confiable y aplicar el firewall
local. Pub/Sub permanece ligado a `127.0.0.1`, porque sólo lo necesita Functions localmente. Reiniciar
Next.js después de modificar variables. No cambiar archivos de producción.

## Arranque local de desarrollo

Desde la raíz, iniciar Auth, Firestore, Functions y Pub/Sub con un project ID demo explícito. Pub/Sub
es necesario para las Functions programadas, incluida la reconciliación de la proyección:
no omitir `--project` ni confiar en el proyecto predeterminado de `.firebaserc`.

```powershell
Set-Location volley-ranking-system
firebase emulators:start --project demo-iux01-uat --only auth,firestore,functions,pubsub --config firebase.json
```

```bash
cd volley-ranking-system
firebase emulators:start --project demo-iux01-uat \
  --only auth,firestore,functions,pubsub --config firebase.json
```

En una segunda terminal, iniciar Next en loopback:

```powershell
Set-Location volley-ranking-frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

```bash
cd volley-ranking-frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abrir `http://127.0.0.1:3000/dashboard`. Usar el mismo proyecto en `--project`, el nombre de
`.env.<projectId>`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` y `NEXT_PUBLIC_FUNCTIONS_BASE_URL`. Esta
configuración sólo inicializa emuladores y no autoriza despliegue ni acceso a datos productivos.

## UAT con frontend compilado y exportación persistente

Usar `demo-iux01-uat` de manera consistente en `.env.demo-iux01-uat`, `--project`,
`NEXT_PUBLIC_FIREBASE_PROJECT_ID` y `NEXT_PUBLIC_FUNCTIONS_BASE_URL`. Confirmar localmente
`ENABLE_DASHBOARD_TASK_PROJECTION=true` sin mostrar ni compartir el secreto del cursor. Antes del
build, verificar `.env.local` y las variables públicas; Next las incorpora al artefacto compilado.
Todos los comandos especifican `--project demo-iux01-uat`; no omitirlo ni usar el proyecto
predeterminado de `.firebaserc`.

1. Detener cualquier `next start`/`next dev` que use el mismo `.next`. Construir una sola vez:

   ```powershell
   Set-Location volley-ranking-frontend
   npm run build
   ```

   ```bash
   cd volley-ranking-frontend
   npm run build
   ```

2. Elegir **una sola** forma de arranque del emulador. Ambos ejemplos preservan cada sesión en un
   directorio persistente fuera del repositorio y fuera de `/tmp`; generan una carpeta de salida
   nueva, se niegan a reutilizarla, y esperan `Export complete` al detenerse.

   **Primer arranque, sin snapshot:** no pasar `--import`.

   PowerShell:

   ```powershell
   $exportRoot = Join-Path $env:LOCALAPPDATA 'SPORTEXA\demo-iux01-uat\exports'
   New-Item -ItemType Directory -Force -Path $exportRoot | Out-Null
   $exportPath = Join-Path $exportRoot ("demo-iux01-uat-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
   if (Test-Path -LiteralPath $exportPath) { throw "El destino ya existe: $exportPath" }
   Set-Location volley-ranking-system
   firebase emulators:start --project demo-iux01-uat --only auth,firestore,functions,pubsub --config firebase.json --export-on-exit $exportPath
   ```

   Bash (Linux/macOS):

   ```bash
   exportRoot="$HOME/.local/share/SPORTEXA/demo-iux01-uat/exports"
   mkdir -p "$exportRoot"
   exportPath="$exportRoot/demo-iux01-uat-$(date +%Y%m%d-%H%M%S)"
   test ! -e "$exportPath" || { echo "El destino ya existe: $exportPath" >&2; exit 1; }
   cd volley-ranking-system
   firebase emulators:start --project demo-iux01-uat \
     --only auth,firestore,functions,pubsub --config firebase.json \
     --export-on-exit "$exportPath"
   ```

   Conserva el valor generado de `exportPath`. No uses `--force`, ni cierres la terminal antes del
   mensaje de exportación completa.

   **Arranques posteriores, con snapshot válido:** seleccionar la última exportación terminada;
   verificar que contiene `firebase-export-metadata.json`; importar desde allí y exportar a una
   carpeta nueva. Nunca reutilizar como salida la carpeta de entrada.

   PowerShell:

   ```powershell
   $exportRoot = Join-Path $env:LOCALAPPDATA 'SPORTEXA\demo-iux01-uat\exports'
   $importPath = Join-Path $exportRoot 'demo-iux01-uat-AAAAMMDD-HHMMSS'
   if (-not (Test-Path -LiteralPath (Join-Path $importPath 'firebase-export-metadata.json'))) { throw "Snapshot inválido: $importPath" }
   New-Item -ItemType Directory -Force -Path $exportRoot | Out-Null
   $exportPath = Join-Path $exportRoot ("demo-iux01-uat-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
   if ($exportPath -eq $importPath -or (Test-Path -LiteralPath $exportPath)) { throw "El destino debe ser una carpeta nueva: $exportPath" }
   Set-Location volley-ranking-system
   firebase emulators:start --project demo-iux01-uat --only auth,firestore,functions,pubsub --config firebase.json --import $importPath --export-on-exit $exportPath
   ```

   Bash (Linux/macOS):

   ```bash
   exportRoot="$HOME/.local/share/SPORTEXA/demo-iux01-uat/exports"
   importPath="$exportRoot/demo-iux01-uat-AAAAMMDD-HHMMSS"
   test -f "$importPath/firebase-export-metadata.json" || { echo "Snapshot inválido: $importPath" >&2; exit 1; }
   mkdir -p "$exportRoot"
   exportPath="$exportRoot/demo-iux01-uat-$(date +%Y%m%d-%H%M%S)"
   test "$exportPath" != "$importPath" && test ! -e "$exportPath" || { echo "El destino debe ser una carpeta nueva: $exportPath" >&2; exit 1; }
   cd volley-ranking-system
   firebase emulators:start --project demo-iux01-uat \
     --only auth,firestore,functions,pubsub --config firebase.json \
     --import "$importPath" --export-on-exit "$exportPath"
   ```

   Mantener abierta esta terminal y no iniciar una segunda instancia sobre los mismos puertos.

3. Las altas nuevas de Grupo inicializan scope y cobertura automáticamente mediante el writer
   canónico; `onDashboardTaskOutboxCreate` procesa el evento incremental. No ejecutar backfill tras
   cada Grupo. Pub/Sub habilita la reconciliación programada y la comprobación de salud. La
   proyección sólo se acredita `READY` cuando la cobertura `N20_N31_V1` está completa; cobertura
   incompleta no equivale a cero tareas.

   El operador `npm run iux-02a:backfill:emulator` se reserva para un conjunto preexistente que
   requiera una inicialización/reconciliación justificada (por ejemplo, migración de datos
   anteriores a la inicialización automática) o un procedimiento de recuperación documentado.
   Antes, capturar el estado y revisar eventos fallidos, en proceso y leases. No ejecutarlo como
   sustituto del procesamiento incremental. No editar proyecciones ni contadores manualmente. El
   operador requiere `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` y
   `GCLOUD_PROJECT=demo-iux01-uat`.

   PowerShell (sólo si esa reconciliación está justificada):

   ```powershell
   Set-Location volley-ranking-system\functions
   $env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
   $env:GCLOUD_PROJECT = 'demo-iux01-uat'
   npm run iux-02a:backfill:emulator
   ```

   Bash (Linux/macOS):

   ```bash
   cd volley-ranking-system/functions
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-iux01-uat \
     npm run iux-02a:backfill:emulator
   ```

4. En una segunda terminal, iniciar **solo** el build compilado:

   ```powershell
   Set-Location volley-ranking-frontend
   npm run start -- --hostname 127.0.0.1 --port 3000
   ```

   ```bash
   cd volley-ranking-frontend
   npm run start -- --hostname 127.0.0.1 --port 3000
   ```

   Abrir `http://127.0.0.1:3000/dashboard`. No ejecutar `next dev`, `next build` y `next start`
   simultáneamente sobre `.next`; detener Next antes de cambiar variables o recompilar. No mezclar
   `localhost` y `127.0.0.1` dentro de una misma sesión de navegador.

5. No hay un bootstrap UAT de datos por script seguro. Crear usuarios, Grupos, Temporadas y
   solicitudes desde la aplicación; no ejecutar fixtures de pruebas contra la UAT, porque pueden
   incluir cleanup. Usar perfiles de navegador aislados para las sesiones.

## Detener y preservar

Detener primero `next start` y después Functions/Auth/Firestore/Pub/Sub con `Ctrl+C`. Esperar
`Export complete` en la terminal de Emulator antes de cerrarla. El destino generado por
`--export-on-exit` conserva la sesión. Como alternativa para un checkpoint manual, detener primero
Next pero dejar los emuladores en ejecución, elegir una ruta nueva persistente y exportar sin
`--force`; ejecutar el export desde una tercera terminal. No hacer el export manual simultáneamente
con otro export:

```powershell
$exportRoot = Join-Path $env:LOCALAPPDATA 'SPORTEXA\demo-iux01-uat\exports'
New-Item -ItemType Directory -Force -Path $exportRoot | Out-Null
$exportPath = Join-Path $exportRoot ("demo-iux01-uat-checkpoint-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $exportPath) { throw "El destino ya existe: $exportPath" }
Set-Location volley-ranking-system
firebase emulators:export $exportPath --project demo-iux01-uat
```

```bash
exportRoot="$HOME/.local/share/SPORTEXA/demo-iux01-uat/exports"
mkdir -p "$exportRoot"
exportPath="$exportRoot/demo-iux01-uat-checkpoint-$(date +%Y%m%d-%H%M%S)"
test ! -e "$exportPath" || { echo "El destino ya existe: $exportPath" >&2; exit 1; }
cd volley-ranking-system
firebase emulators:export "$exportPath" --project demo-iux01-uat
```

No ejecutar exportaciones simultáneas. Para validar el diseño táctil en un dispositivo real, además
de abrir Next en `0.0.0.0` y usar la IP LAN en las variables del frontend, confirmar que el firewall
permite sólo esa red confiable; el modo adaptable del escritorio no sustituye la validación física.
