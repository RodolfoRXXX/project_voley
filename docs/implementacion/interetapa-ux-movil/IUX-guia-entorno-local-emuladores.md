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
