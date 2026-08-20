# E0-09C — Despliegue controlado de la barrera temporal Firestore

**Proyecto:** SPORTEXA

**Fecha del deploy y primera verificación:** 17 de agosto de 2026

**Fecha de reanudación y cierre documental:** 20 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**HEAD y upstream reconstruidos:** `c047ee4df8ddd7729043aecc65ca5ede43f210bb`

**Proyecto remoto verificado:** `project-groupvolley` (`211711925841`), estado `ACTIVE`

**Alcance ejecutado:** despliegue previo exclusivo del ruleset temporal deny-all y verificación posterior. Durante la reanudación del 20 de agosto sólo se realizaron inspecciones locales y consultas remotas GET/list de metadata; no se produjo ninguna escritura remota.

**Veredicto:** **COMPLETADO CON OBSERVACIONES — barrera deny-all activa; diferencia de Secret Manager explicada como omisión del baseline**

## 1. Reconstrucción después de la pérdida del hilo

La reanudación no asumió que el estado local o remoto continuara igual. Se reconstruyó mediante Git, archivos locales, procesos/listeners y consultas remotas actuales de sólo lectura.

| Control | Evidencia actual | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| HEAD | `c047ee4df8ddd7729043aecc65ca5ede43f210bb` | Cumplido |
| Upstream | `origin/chore/etapa-0-estabilizacion` en el mismo commit | Cumplido |
| Divergencia | `+0 -0` | Ninguna |
| Árbol inicial | Limpio, sin archivos no versionados | Cumplido |
| Informe E0-09C parcial | No encontrado | Ninguno que preservar |
| E0-09A y E0-09B | Informes presentes y versionados | Cumplido |
| `.secret.local` | Regla de ignore vigente; no versionado; la copia local no existe actualmente | Cumplido, con ausencia de copia local registrada |
| Emuladores huérfanos | Sin procesos Firebase/Node/Java visibles ni listeners en puertos habituales | Ninguno detectado |

Git rechazó inicialmente las consultas por la diferencia de propietario entre el repositorio y el usuario del sandbox. Se repitieron con `git -c safe.directory=C:/Users/Rodolfo/Documents/projectoVoley`, limitado a cada invocación; no se modificó la configuración global.

## 2. Operación remota desplegada

Antes de la interrupción del hilo se ejecutó desde `volley-ranking-system/`:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase deploy \
  --only firestore:rules \
  --project project-groupvolley \
  --config firebase.maintenance.json \
  --non-interactive
```

La configuración empleada contiene exclusivamente:

```json
{
  "firestore": {
    "rules": "firestore.maintenance.rules"
  }
}
```

Por configuración y por `--only`, el despliegue sólo podía crear un ruleset y actualizar el release de reglas Firestore. No incluía índices, Functions, Hosting, Storage, Authentication, datos, Secret Manager ni IAM.

La verificación completa inmediatamente posterior, conservada como contexto confirmado de la operación, obtuvo:

- deploy exitoso de reglas;
- hash remoto deny-all esperado;
- lectura anónima rechazada con HTTP 403 `PERMISSION_DENIED`;
- cero Functions y ausencia de `updateUserRole`;
- 44 documentos raíz y 4 `pendingAlerts`, sin cambios;
- 6 cuentas Authentication, sin cambios;
- 2 buckets Storage, 111 objetos y aproximadamente 15,5 MiB, sin cambios;
- un sitio Firebase Hosting y cero versiones, sin cambios;
- el despliegue de Vercel permaneció publicado y no fue modificado. Sin embargo, mientras continúe activo el ruleset deny-all, las funcionalidades que dependan de accesos cliente a Firestore permanecerán bloqueadas.

Esas consultas de datos, Authentication, Storage, Hosting y Vercel no se repitieron durante la reanudación, cuyo permiso remoto quedó limitado a metadata de proyecto, reglas, Functions, Secret Manager e índices.

## 3. Estado remoto actual

### 3.1 Proyecto y Functions

| Control | Estado actual | Resultado |
| --- | --- | --- |
| Project ID | `project-groupvolley` | Coincide |
| Número | `211711925841` | Coincide |
| Estado | `ACTIVE` | Coincide |
| Functions totales | 0 | Coincide con E0-09A |
| `updateUserRole` | Ausente porque el inventario completo está vacío | Cumplido |

### 3.2 Ruleset activo

El release actual es `projects/project-groupvolley/releases/cloud.firestore` y apunta a `projects/project-groupvolley/rulesets/c218845b-f08d-42ad-8b95-65e255ed3a83`.

| Evidencia | Resultado |
| --- | --- |
| Archivo remoto | `firestore.maintenance.rules` |
| Última actualización del release | `2026-08-18T00:42:33.822312Z` (`2026-08-17 21:42:33 -03:00`) |
| SHA-256 remoto | `cd5089e4e5116dbb994013dc5fd5e7e411ec348935b8d06d13acd00173cca15b` |
| SHA-256 deny-all autorizado | `cd5089e4e5116dbb994013dc5fd5e7e411ec348935b8d06d13acd00173cca15b` |
| SHA-256 seguro normal, no desplegado | `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` |

El hash remoto coincide exactamente con la barrera autorizada. No se repitió el deploy y no se restauró el ruleset normal.

En Windows, `Get-FileHash` sobre el checkout produjo hashes distintos porque los archivos de trabajo tienen CRLF. La comparación reproducible se realizó sobre el contenido remoto y sobre la fuente versionable normalizada a LF; no se interpretó el hash de bytes CRLF como drift.

### 3.3 Índices Firestore

La consulta actual devolvió:

| Métrica | E0-09A | Actual | Diferencia |
| --- | ---: | ---: | --- |
| Índices remotos | 16 | 16 | 0 |
| Estado `READY` | 16 | 16 | 0 |
| Field overrides | 0 | 0 | 0 |

El inventario actual coincide con la evidencia disponible de E0-09A en cantidad y overrides, y todas las entradas actuales están `READY`. El archivo local continúa declarando 8 índices y 0 overrides; la diferencia de representación 16 remotos/8 locales ya estaba registrada y no fue creada por E0-09C. E0-09A no conservó en su informe los 16 IDs remotos, por lo que no es posible una comparación histórica identificador por identificador. No se modificó ningún índice.

## 4. Secret Manager

### 4.1 Comparación agregada

| Métrica | Baseline E0-09A | Actual | Explicación |
| --- | ---: | ---: | --- |
| Secretos | 6 | 7 | E0-09A enumeró sólo secretos conocidos y omitió uno sin versiones |
| Versiones totales listadas | 9 | 9 | Sin diferencia |
| Versiones habilitadas | 9 | 9 | Sin diferencia |
| Versiones deshabilitadas | 0 | 0 | Sin diferencia |
| Versiones destruidas | 0 | 0 | Sin diferencia |

Los seis secretos incluidos en E0-09A conservan exactamente las mismas nueve versiones habilitadas:

| Nombre | Versiones habilitadas actuales |
| --- | ---: |
| `GMAIL_USER` | 1 |
| `GMAIL_PASS` | 2 |
| `WEB_APP_URL` | 1 |
| `PUSH_VAPID_PUBLIC_KEY` | 2 |
| `PUSH_VAPID_PRIVATE_KEY` | 2 |
| `PUSH_VAPID_SUBJECT` | 1 |

No se accedió a valores secretos. No se invocó `versions access` ni ningún equivalente.

### 4.2 Metadata del séptimo secreto

| Campo | Metadata observada |
| --- | --- |
| Nombre | `APP_BASE_URL` |
| Creación | `2026-02-18T18:31:51.010807Z` (`2026-02-18 15:31:51 -03:00`) |
| Etiqueta | `firebase-managed=functions` |
| Replicación | Automática |
| Rotación configurada | Ninguna |
| Topics/notificaciones | Ninguno |
| Versiones | 0 |
| Estados de versiones | No aplica; nunca tuvo versiones listadas |
| Fecha de actualización | La respuesta de Secret Manager no expone un campo `updateTime` para este recurso |

El secreto fue creado aproximadamente seis meses antes de E0-09A y de E0-09C. También precede por meses al ruleset deny-all. No aparece usado en el código o la documentación actuales; éstos declaran `WEB_APP_URL`, no `APP_BASE_URL`. La etiqueta demuestra asociación histórica de administración con Functions, pero no identifica por sí sola la operación concreta que lo creó.

### 4.3 Clasificación

La clasificación es:

1. **Ya existía cuando se tomó el baseline:** demostrado por `createTime`.
2. **Conteo incompleto en E0-09A:** demostrado porque la tabla de E0-09A contiene sólo los seis nombres con versiones y omite `APP_BASE_URL`.
3. **Sin versiones:** demostrado por el listado completo de versiones vacío.
4. **No fue creado entre E0-09A y E0-09C:** descartado por fecha.
5. **Sin evidencia de modificación por el deploy de reglas:** el secreto preexistía; el deploy se limitó a `firestore:rules`; las nueve versiones habilitadas de los otros seis secretos permanecen iguales. La ausencia de `updateTime` impide afirmar una ausencia histórica absoluta de cambios de metadata.
6. **Origen histórico exacto:** indeterminado. La etiqueta permite asociarlo genéricamente a Functions, no a una ejecución concreta.

`APP_BASE_URL` no fue creado por E0-09C, pues existe desde el 18 de febrero de 2026. No posee versiones y los nueve estados habilitados correspondientes a los otros seis secretos permanecen sin cambios. El deploy se limitó exclusivamente a `firestore:rules` y no existe evidencia de que haya modificado Secret Manager. La ausencia de `updateTime` impide afirmar una ausencia histórica absoluta de cambios de metadata, pero no afecta la conclusión de que la diferencia observada corresponde a una **omisión del inventario de E0-09A** y no a drift generado por E0-09C. No se elimina ni se propone eliminar el secreto dentro de este incremento.

## 5. Comandos y consultas de la reanudación

Todas las invocaciones Firebase/Google retiraron `DEBUG` y `FIREBASE_DEBUG_MODE` del entorno.

| Comando o familia | Tipo | Resultado |
| --- | --- | --- |
| `git -c safe.directory=... status/rev-parse/log/diff` | Local, lectura | Rama, HEAD, upstream y árbol reconstruidos |
| `git -c safe.directory=... check-ignore/ls-files` | Local, lectura | `.secret.local` ignorado y no versionado |
| `Get-Process` y `Get-NetTCPConnection` sobre puertos conocidos | Local, lectura | Sin emuladores huérfanos detectados |
| `firebase projects:list --json` | Remoto, list | Proyecto/número/estado confirmados |
| `firebase functions:list --project project-groupvolley --json` | Remoto, list | Lista vacía |
| `firebase firestore:indexes --project project-groupvolley --json` | Remoto, list | 16 índices y 0 overrides |
| GET `firebaserules.googleapis.com/v1/projects/.../releases` y GET del ruleset activo | Remoto, GET | Hash deny-all exacto |
| GET `secretmanager.googleapis.com/v1/projects/.../secrets` | Remoto, list | 7 secretos y metadata sin payloads |
| GET `.../secrets/{name}/versions` | Remoto, list | 9 versiones, todas habilitadas; `APP_BASE_URL` sin versiones |
| GET Firestore Admin de índices y field overrides | Remoto, GET | 16 `READY`, 0 overrides |

Se utilizó un ayudante Node temporal para reutilizar la autenticación de Firebase CLI y limitar explícitamente las operaciones a GET/list. El primer intento no alcanzó la red porque no resolvió el módulo global; se corrigió únicamente la ruta local. El ayudante fue retirado después de capturar la evidencia y no forma parte del resultado final.

No se ejecutaron POST, PATCH, PUT, DELETE, deploy, acceso a versiones secretas, cambios IAM, migraciones, seeds, backfills ni llamadas de escritura durante esta reanudación.

## 6. Verificaciones locales finales

| Verificación | Resultado |
| --- | --- |
| Hashes versionables normalizados a LF | Coinciden con deny-all y ruleset seguro documentados |
| Suite aislada `test:maintenance` | Aprobada: 7/7 tests; todos los accesos cliente rechazados |
| `git diff --check` | Aprobado |
| Estado Git final | Sólo este informe nuevo; sin cambios en código o configuración |

La invocación ordinaria de la suite no llegó a iniciar emuladores: primero el sandbox rechazó la resolución de rutas con `EPERM` y luego Node 20 en Windows devolvió `spawnSync firebase.cmd EINVAL`. Se repitió con una adaptación temporal que invocó el mismo entrypoint de Firebase CLI mediante `process.execPath`, conservando sin cambios el workspace aislado, el proyecto `demo-sportexa-e0-02`, los proxies cerrados, la ausencia de credenciales y los hosts loopback. La adaptación se revirtió inmediatamente y no forma parte del diff final.

## 7. Limitaciones de la evidencia

- Secret Manager no proporciona `updateTime` del recurso secreto en la respuesta consultada; se dispone de `createTime`, etiquetas, replicación y metadata completa de versiones.
- La etiqueta `firebase-managed=functions` no identifica al actor ni al comando histórico que creó `APP_BASE_URL`.
- La reanudación no repitió consultas de datos Firestore, Authentication, Storage, Hosting o Vercel porque no estaban incluidas en la autorización remota nueva. Se conserva como evidencia la verificación completa inmediatamente posterior al deploy.
- No se realizó una nueva lectura anónima de un documento Firestore; el cierre actual se demuestra por el hash exacto del ruleset deny-all, complementado por el 403 confirmado en la verificación posterior original.

## 8. Criterios de cierre

| Criterio | Estado |
| --- | --- |
| Proyecto y número exactos | Cumplido |
| Ruleset remoto deny-all con hash exacto | Cumplido |
| Ruleset normal no restaurado | Cumplido |
| Cero Functions | Cumplido |
| `updateUserRole` ausente | Cumplido |
| Índices iguales al baseline disponible (16/0) y todos `READY` | Cumplido |
| Diferencia de Secret Manager clasificada sin acceder a valores | Cumplido |
| Deploy limitado exclusivamente a reglas | Cumplido |
| Recursos no incluidos en el deploy verificados sin cambios inmediatamente después | Cumplido |
| Ninguna escritura remota durante la reanudación | Cumplido |
| Verificaciones locales finales | Cumplido |

## 9. Veredicto y siguiente acción

**COMPLETADO CON OBSERVACIONES.** La barrera temporal deny-all permanece activa con el hash exacto autorizado. El proyecto continúa activo, sin Functions y con los 16 índices en estado `READY`. El séptimo secreto no constituye drift creado por E0-09C: `APP_BASE_URL` existía desde febrero de 2026 y no posee versiones; su ausencia en E0-09A fue un conteo incompleto de metadata.

La siguiente acción recomendada, **sin ejecutarla**, es revisar y versionar este informe. Después, cualquier reinicialización administrativa de Firestore debe abrirse como un incremento separado, repetir sus precondiciones y obtener autorización destructiva inmediata propia. No debe restaurarse todavía el ruleset normal ni iniciarse el siguiente incremento desde esta intervención.
