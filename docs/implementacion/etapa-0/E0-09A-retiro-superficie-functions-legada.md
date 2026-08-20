# E0-09A — Retiro de la superficie Functions legada

**Proyecto:** SPORTEXA

**Fecha:** 17 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial:** `10843f1b4d9d32002ed5e81cd5a904e96b67ca36`

**Proyecto remoto:** `project-groupvolley` (`211711925841`)

**Alcance ejecutado:** retiro exclusivo de las 54 Cloud Functions restantes y de los recursos administrados Scheduler/Pub/Sub asociados exclusivamente a las tres Functions programadas.

**Veredicto:** **COMPLETADO — superficie remota de Functions cerrada**

## 1. Decisiones y autorizaciones

El propietario tomó dos decisiones separadas:

1. **Operación A — Firebase Hosting: no autorizada.** No se ejecutó `hosting:disable` ni ninguna otra modificación de Hosting.
2. **Operación B — Functions: autorizada inmediatamente.** Se autorizó retirar exactamente las 54 Functions del manifiesto aprobado: 50 en `us-central1` y 4 en `southamerica-east1`.

La autorización de Functions incluyó los jobs de Cloud Scheduler y topics Pub/Sub administrados asociados únicamente a:

- `onMatchDeadline`;
- `onMatchStart`;
- `onPendingAlertsMaintenance`.

No se autorizó deploy, eliminación de datos Firestore, eliminación de cuentas Authentication, modificación de Storage, reglas, índices, Hosting, Vercel o Secret Manager, ni rotación de secretos.

## 2. Corrección documental del frontend operativo

La caracterización correcta, confirmada por el propietario, es:

- el recurso Firebase Hosting `project-groupvolley` existe;
- contiene un canal `live`, pero **cero versiones**;
- una lectura pública devuelve HTTP 404;
- Firebase Hosting está vacío y no sirve el frontend de SPORTEXA;
- el frontend operativo está desplegado en **Vercel**;
- E0-09A no ejecutó acciones sobre Firebase Hosting ni Vercel.

Por tanto, deshabilitar Firebase Hosting habría sido una escritura redundante y no habría puesto el frontend real en mantenimiento. El comando propuesto en el preflight fue descartado y no se ejecutó.

La pertenencia del frontend operativo a Vercel se registra como decisión e información aportada por el propietario. E0-09A no consultó ni modificó Vercel.

## 3. Preflight final

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| E0-08 versionado y pusheado | HEAD y upstream `10843f1` | Cumplido |
| Git inicial | Limpio | Cumplido |
| `.secret.local` | Ignorado y no versionado | Cumplido |
| Entorno Firebase | `DEBUG` y `FIREBASE_DEBUG_MODE` retiradas en cada ejecución CLI | Cumplido |
| Proyecto | `project-groupvolley` | Cumplido |
| Número | `211711925841` | Cumplido |
| Estado proyecto | Activo | Cumplido |
| Functions remotas | 54 | Cumplido |
| Exports locales | 54 | Cumplido |
| Coincidencia | Sin Functions desconocidas, faltantes ni discrepancias regionales | Cumplido |
| Regiones | 50 `us-central1`; 4 `southamerica-east1` | Cumplido |
| `updateUserRole` | Ausente | Cumplido |
| Ruleset seguro | Hash remoto/local `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` | Cumplido |
| Hosting | Sitio existente, 0 versiones, HTTP 404 | Cumplido |

Las condiciones se revalidaron inmediatamente antes del primer borrado.

## 4. Gate local

Se ejecutó el gate de Etapa 0 exclusivamente con `demo-sportexa-e0-02` y emuladores locales.

| Verificación | Resultado |
| --- | --- |
| Baseline ESLint | 41 errores y 13 warnings conocidos; 0 nuevos |
| Typecheck | Aprobado |
| Sintaxis Functions | 92/92 |
| Guardas de aislamiento | 9/9 |
| Suite con emuladores | 26/26 |
| Build | Aprobado; 18 páginas |
| `git diff --check` | Aprobado |
| Emuladores posteriores | Cerrados; ninguno huérfano |

Una primera ejecución fue rechazada por el sandbox con `EPERM` antes de ejecutar ESLint. La repetición autorizada del mismo comando completó el gate. El runner de emuladores construye un entorno aislado por lista permitida y no hereda `DEBUG`, credenciales ni configuración remota.

## 5. Resultado por lote

Cada lote se ejecutó por separado. Después de cada uno se recuperó el inventario remoto y se comparó nombre y región contra el conjunto restante esperado. No hubo fallos parciales.

| Lote | Alcance | Eliminadas | Esperadas después | Reales después | Diferencias | Resultado |
| --- | --- | ---: | ---: | ---: | --- | --- |
| B1 | Programadas `us-central1` | 3 | 51 | 51 | Ninguna | Aprobado |
| B2 | Eventos `us-central1` | 10 | 41 | 41 | Ninguna | Aprobado |
| B3 | HTTP `api` | 1 | 40 | 40 | Ninguna | Aprobado |
| B4 | Callables escritoras `us-central1` | 32 | 8 | 8 | Ninguna | Aprobado |
| B5 | Callables lectoras `us-central1` | 4 | 4 | 4 | Ninguna | Aprobado |
| B6 | Callables `southamerica-east1` | 4 | 0 | 0 | Ninguna | Aprobado |

### 5.1 B1 — programadas

Comando ejecutado:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  onMatchDeadline onMatchStart onPendingAlertsMaintenance \
  --region us-central1 \
  --project project-groupvolley \
  --force
```

Las tres eliminaciones finalizaron correctamente. El inventario posterior fue 47 Functions en `us-central1` y 4 en `southamerica-east1`.

### 5.2 B2 — triggers de eventos

Comando ejecutado:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  onUserCreate onParticipationCreate onParticipationUpdate onMatchClose \
  onUserPendingAlertsSync onGroupPendingAlertsSync \
  onTournamentPendingAlertsSync \
  onTournamentRegistrationPendingAlertsSync \
  onTournamentMatchPendingAlertsSync \
  onTournamentTeamPendingAlertsSync \
  --region us-central1 \
  --project project-groupvolley \
  --force
```

Las diez eliminaciones finalizaron correctamente. El inventario posterior fue 37 Functions en `us-central1` y 4 en `southamerica-east1`.

### 5.3 B3 — HTTP

Comando ejecutado:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  api \
  --region us-central1 \
  --project project-groupvolley \
  --force
```

`api` fue retirada correctamente. El inventario posterior fue 36 Functions en `us-central1` y 4 en `southamerica-east1`.

### 5.4 B4 — callables escritoras de `us-central1`

Comando ejecutado:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  completeOnboarding createMatch editMatch editGroup toggleGroupActivo \
  joinMatch leaveMatch updatePagoEstado eliminarJugador reincorporarJugador \
  cerrarMatch reabrirMatch eliminarMatch updatePreferredPositions \
  generarEquipos createTournament requestTournamentRegistration \
  reviewTournamentRegistration updateTournamentRegistrationPayment \
  openTournamentRegistrations confirmFixture closeTournamentRegistrations \
  startTournament finalizeTournament cancelTournament confirmGroups \
  addTournamentAdmin removeTournamentAdmin editTournament recordMatchResult \
  advancePhase dismissPendingAlert \
  --region us-central1 \
  --project project-groupvolley \
  --force
```

Las 32 eliminaciones finalizaron correctamente. Quedaron exclusivamente:

- cuatro callables lectoras en `us-central1`;
- cuatro callables en `southamerica-east1`.

### 5.5 B5 — callables lectoras de `us-central1`

Comando ejecutado:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  getFormaciones getValidPositions previewFixture previewGroups \
  --region us-central1 \
  --project project-groupvolley \
  --force
```

Las cuatro eliminaciones finalizaron correctamente. Permanecieron sólo las cuatro Functions esperadas de `southamerica-east1`.

### 5.6 B6 — `southamerica-east1`

Comando ejecutado:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  addGroupAdmin removeGroupAdmin reorderGroupAdmins transferGroupOwnership \
  --region southamerica-east1 \
  --project project-groupvolley \
  --force
```

Las cuatro eliminaciones finalizaron correctamente. El inventario remoto final devolvió cero Functions.

## 6. Scheduler y Pub/Sub

Firebase CLI eliminó los recursos administrados de las tres Functions programadas antes de retirar sus Functions de primera generación.

La verificación posterior mediante GET confirmó:

| Recurso administrado esperado | Total | Ausentes | Resultado |
| --- | ---: | ---: | --- |
| Jobs Cloud Scheduler | 3 | 3 | Cumplido |
| Topics Pub/Sub | 3 | 3 | Cumplido |

No se consultaron ni modificaron otros jobs o topics. La autorización no se extendió a recursos ajenos a esas tres Functions.

## 7. Inventario remoto final

### 7.1 Functions

| Control | Resultado |
| --- | --- |
| Functions totales | **0** |
| `us-central1` | 0 |
| `southamerica-east1` | 0 |
| HTTP/callables | 0 |
| Triggers de eventos | 0 |
| Programadas | 0 |
| `updateUserRole` | Ausente |
| Functions desconocidas | 0 |

El código de las 54 Functions permanece versionado en Git. No se desplegaron stubs ni código transitorio. Rehabilitarlas requeriría un deploy explícito desde una versión revisada; no existe una reversión remota automática.

### 7.2 Recursos que permanecieron sin cambios

| Recurso | Antes | Después | Resultado |
| --- | ---: | ---: | --- |
| Firestore: documentos raíz | 44 | 44 | Sin cambios |
| Firestore: `pendingAlerts` | 4 | 4 | Sin cambios |
| Authentication | 6 cuentas | 6 cuentas | Sin cambios |
| Storage | 2 buckets / 111 objetos / ~15,5 MiB | Igual | Sin cambios |
| Índices Firestore | 16 entradas / 0 overrides | Igual | Sin cambios |
| Secret Manager | 6 nombres / 9 versiones habilitadas | Igual | Sin cambios |
| Firebase Hosting | Sitio, canal `live`, 0 versiones, HTTP 404 | Igual | Sin cambios |
| Vercel | Frontend operativo según propietario | No consultado ni modificado | Sin cambios por E0-09A |

### 7.3 Ruleset

El ruleset remoto continuó coincidiendo con el archivo local autorizado:

```text
d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9
```

No se desplegaron reglas ni se modificaron índices.

### 7.4 Secret Manager

Se comprobó únicamente metadata:

| Nombre | Versiones habilitadas finales |
| --- | ---: |
| `GMAIL_USER` | 1 |
| `GMAIL_PASS` | 2 |
| `WEB_APP_URL` | 1 |
| `PUSH_VAPID_PUBLIC_KEY` | 2 |
| `PUSH_VAPID_PRIVATE_KEY` | 2 |
| `PUSH_VAPID_SUBJECT` | 1 |

No se accedió a valores. La rotación VAPID continúa diferida como intervención independiente.

## 8. Límites respetados

No se ejecutaron:

- `hosting:disable` ni ninguna modificación Firebase Hosting;
- consulta o modificación de Vercel;
- deploys;
- invocaciones de Functions;
- eliminación o modificación de documentos Firestore;
- eliminación o modificación de cuentas Authentication;
- eliminación de objetos o buckets Storage;
- cambios de reglas o índices;
- acceso a valores o rotación de secretos;
- cambios de IAM;
- scripts destructivos persistentes;
- commit o push.

La única modificación local es este informe.

## 9. Criterios de cierre

| Criterio | Estado |
| --- | --- |
| Autorización Hosting rechazada y respetada | Cumplido |
| Autorización Functions explícita | Cumplido |
| 54 Functions exactas retiradas | Cumplido |
| Verificación después de cada lote | Cumplido |
| Cero Functions finales | Cumplido |
| Recursos Scheduler/Pub/Sub autorizados retirados | Cumplido |
| `updateUserRole` ausente | Cumplido |
| Hosting/Vercel sin acciones | Cumplido |
| Ruleset seguro intacto | Cumplido |
| Datos, cuentas, Storage, índices y secretos intactos | Cumplido |
| Corrección documental sobre Vercel | Cumplido |

## 10. Veredicto y siguiente incremento

**COMPLETADO — la superficie remota legada de Cloud Functions quedó cerrada.**

El proyecto conserva cero Functions desplegadas. Firebase Hosting permanece vacío y sin modificaciones; no es el frontend operativo. Vercel contiene el frontend operativo según la decisión del propietario y quedó fuera de alcance.

El siguiente incremento recomendado, sin ejecutarlo, es **E0-09B — Reinicialización completa y controlada de Firestore**. Deberá repetir el preflight, confirmar cero Functions, conservar ruleset e índices, presentar nuevamente el comando destructivo y detenerse para autorización inmediata exclusiva de Firestore.

No se inició E0-09B.
