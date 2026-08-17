# E0-08 — Preparación de la reinicialización controlada

**Proyecto:** SPORTEXA

**Fecha:** 17 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial:** `f36dfdc851e458382c234e2cdbbab4835e52a656`

**Proyecto remoto:** `project-groupvolley` (`211711925841`)

**Alcance:** diagnóstico, inventario agregado y preparación documental. No se ejecutaron eliminaciones, modificaciones, exports, deploys, rotaciones ni escrituras remotas.

**Veredicto:** **COMPLETADO CON DECISIONES PENDIENTES — la ejecución destructiva no está autorizada**

## 1. Precondiciones verificadas

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| E0-07B versionado | HEAD `f36dfdc` (`docs(etapa-0): registrar contencion remota E0-07B`) | Cumplido |
| E0-07B pusheado | HEAD coincide con `origin/chore/etapa-0-estabilizacion` | Cumplido |
| Estado inicial | Git limpio | Cumplido |
| Secreto local | `volley-ranking-system/functions/.secret.local` ignorado y no versionado | Cumplido |
| Entorno CLI | Todas las consultas Firebase se ejecutaron con `DEBUG` y `FIREBASE_DEBUG_MODE` retiradas | Cumplido |
| Sesión | Sesión ya autorizada; no se imprimieron identidad, tokens ni URLs diagnósticas | Cumplido |
| Proyecto | Un único `project-groupvolley`, número `211711925841`, estado activo | Cumplido |
| Function insegura | `updateUserRole` ausente del inventario de 54 Functions | Cumplido |
| Reglas remotas | SHA-256 normalizado `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` | Cumplido |

Las invariantes remotas de E0-07B no cambiaron. Las consultas posteriores fueron de sólo lectura y produjeron únicamente agregados. No se inició un emulador ni se invocó una Function.

## 2. Decisiones aprobadas y alcance de su aprobación

Se mantienen como decisiones definitivas de E0-07A:

- las seis cuentas Authentication pertenecen a testers y pueden descartarse;
- no existen usuarios productivos que deban preservarse;
- los datos actuales de Firestore no tienen valor operativo, histórico, comercial o legal;
- Firestore puede reinicializarse por completo;
- las suscripciones push actuales pueden descartarse;
- no habrá export preventivo de Firestore ni de Authentication;
- se acepta la pérdida definitiva de esos datos y cuentas;
- los testers podrán autenticarse y registrar nuevamente sus suscripciones;
- se admite una ventana completa de mantenimiento;
- no se requiere compatibilidad con el frontend legado, migración, backfill, doble escritura ni coexistencia prolongada.

Estas decisiones definen el resultado deseado, pero **no autorizan ejecutar ningún comando destructivo**. Firestore, Authentication, Functions, Hosting, cada bucket Storage y Secret Manager conservan puntos de autorización independientes.

## 3. Inventario agregado actualizado

### 3.1 Datos y servicios

| Servicio | Estado agregado | Fuente de evidencia |
| --- | --- | --- |
| Firestore | 12 colecciones raíz, 44 documentos raíz y 4 documentos `pendingAlerts` en subcolecciones | Consulta agregada de sólo lectura E0-08 |
| Authentication | 6 cuentas; 0 deshabilitadas; las 6 con inicio de sesión registrado | Consulta agregada de sólo lectura E0-08 |
| Functions | 54 activas; 50 en `us-central1`, 4 en `southamerica-east1`; todas Node 20 y primera generación | Metadata remota E0-08 |
| Hosting | 1 sitio predeterminado | Metadata remota E0-08 |
| Storage | 2 buckets, 111 objetos activos, aproximadamente 15,5 MiB | Metadata agregada E0-07A; no se descargaron objetos |
| Realtime Database | 0 instancias | Metadata remota E0-08 |
| Secret Manager | 6 nombres conocidos, 9 versiones habilitadas en total; 8 Functions asociadas a secretos | Metadata remota E0-08; ningún valor accedido |
| Reglas Firestore | Ruleset seguro de E0-03/E0-04 desplegado; hash coincidente con Git | GET de metadata/contenido y comparación en memoria |
| Índices Firestore | 16 entradas devueltas remotamente; 8 declaraciones y 0 overrides en `firestore.indexes.json` | Metadata remota y archivo local |

La diferencia de representación o estado entre 16 entradas remotas y 8 declaraciones locales no se interpreta automáticamente como equivalencia ni como error. Debe reconciliarse en una intervención de configuración separada. La eliminación de datos no debe modificar índices.

### 3.2 Firestore

| Colección raíz | Documentos esperados |
| --- | ---: |
| `groups` | 6 |
| `matches` | 2 |
| `participations` | 2 |
| `push_subscriptions` | 2 |
| `tournamentAdvancementRules` | 1 |
| `tournamentMatches` | 6 |
| `tournamentPhases` | 5 |
| `tournamentRegistrations` | 4 |
| `tournamentStandings` | 4 |
| `tournamentTeams` | 4 |
| `tournaments` | 2 |
| `users` | 6 |
| **Total raíz** | **44** |

Se observaron además **4 documentos** con collection ID `pendingAlerts` bajo documentos padres. El inventario conocido totaliza 48 documentos, pero el control de vaciado no puede limitarse a ese total: en Firestore, borrar un documento padre no borra automáticamente documentos de subcolecciones. Debe usarse un recorrido recursivo y luego comprobar que no queden documentos huérfanos.

### 3.3 Functions

| Categoría remota/local | Total | Con capacidad de escritura o efecto | Sólo consulta |
| --- | ---: | ---: | ---: |
| Callables | 40 | 36 | 4 |
| HTTP multipropósito | 1 | 1 | 0 |
| Triggers de eventos | 10 | 10 | 0 |
| Programadas | 3 | 3 | 0 |
| **Total** | **54** | **50** | **4** |

La metadata remota no etiqueta de forma fiable todos los HTTPS como callable; la separación entre 40 callables y el endpoint `api` se obtuvo de los 54 exports versionados, que coinciden uno a uno con el inventario remoto.

Las cuatro Functions clasificadas como sólo consulta son `getFormaciones`, `getValidPositions`, `previewFixture` y `previewGroups`. Las otras 50 alcanzan escrituras de Firestore o efectos externos directamente o mediante servicios compartidos. En particular:

- seis triggers `onWrite` pueden reaccionar a borrados de documentos;
- tres Functions programadas pueden escribir sin intervención de un cliente;
- `api` incluye rutas que escriben suscripciones y otras entidades;
- las callables escritoras continúan expuestas mientras estén desplegadas;
- ocho Functions están asociadas a secretos de correo/push.

Ninguna de las 50 escritoras es necesaria para migración, backfill, doble escritura o compatibilidad, porque esas estrategias fueron descartadas expresamente. No se concluye que las 54 deban eliminarse: las cuatro de consulta no repueblan Firestore y su conservación o retiro sigue siendo una decisión independiente.

### 3.4 Secret Manager y VAPID

| Nombre de configuración | Versiones habilitadas | Tratamiento en E0-08 |
| --- | ---: | --- |
| `GMAIL_USER` | 1 | Metadata solamente |
| `GMAIL_PASS` | 2 | Metadata solamente |
| `WEB_APP_URL` | 1 | Metadata solamente |
| `PUSH_VAPID_PUBLIC_KEY` | 2 | Rotación pendiente e independiente |
| `PUSH_VAPID_PRIVATE_KEY` | 2 | Rotación pendiente e independiente |
| `PUSH_VAPID_SUBJECT` | 1 | Rotación/configuración pendiente e independiente |

No se accedió a valores ni se intentó inferirlos. La metadata no basta para certificar qué versión VAPID debe conservarse. La rotación requiere su propia revisión, autorización, cambio coordinado de frontend/Functions y verificación; no forma parte de la limpieza Firestore/Auth.

## 4. Matriz por servicio

| Servicio | Decisión de datos | Riesgo principal | Acción preparada | Autorización pendiente |
| --- | --- | --- | --- | --- |
| Firestore | Descarte total aprobado; ejecución no autorizada | Subcolecciones huérfanas y repoblación por Functions | Borrado recursivo de todas las colecciones de `(default)` | Inmediata, exclusiva de Firestore data |
| Authentication | Descarte de 6 cuentas aprobado; ejecución no autorizada | Borrar un conjunto distinto o exponer PII | Consulta transitoria + `accounts:batchDelete` con guarda exacta | Inmediata, exclusiva de Auth |
| Push | Descarte aprobado | Doble borrado innecesario | Queda incluido en Firestore completo | Ninguna operación separada |
| Storage | Sin decisión de eliminación | Pérdida de objetos o buckets con dependencias técnicas | Tres alternativas documentadas | Decisión y autorización por bucket |
| Functions | `updateUserRole` ya retirada | Repoblar Firestore o mantener APIs legadas | Retirar/contener las 50 escritoras antes del vaciado | Decisión sobre 50 escritoras y 4 lectoras; autorización Functions |
| Hosting | Sin decisión | Frontend legado accesible durante estado vacío | Mantener, deshabilitar, reemplazar o retirar | Decisión y autorización Hosting |
| Secret Manager/VAPID | Rotación pendiente | Romper push o conservar material comprometido | Intervención separada | Decisión de ventana y autorización Secret Manager/deploy |
| Rules | Conservar ruleset seguro | Reabrir lecturas o privilegios | No desplegar durante la limpieza | No corresponde |
| Índices | Conservar durante el vaciado | Confundir configuración con datos | No modificar; reconciliar aparte | Decisión futura de configuración |

## 5. Dependencias entre servicios

La secuencia no es intercambiable:

1. **Rules antes que datos:** el ruleset seguro debe permanecer desplegado durante toda la ventana.
2. **Functions antes que Firestore:** los seis triggers `onWrite`, las tres tareas programadas y las superficies HTTP/callable escritoras pueden reaccionar al borrado o aceptar nuevas escrituras. Una mera promesa operativa de no usar el frontend no las desactiva.
3. **Hosting y clientes:** mantener el sitio legado accesible permite intentos contra Functions todavía activas. Deshabilitar Hosting reduce ese tráfico, aunque no invalida clientes ya cargados ni sustituye la contención de Functions.
4. **Push dentro de Firestore:** `push_subscriptions` se elimina con `--all-collections`; una segunda operación específica sería redundante.
5. **Auth separada de Firestore:** borrar cuentas no elimina los documentos `users`; borrar Firestore no elimina cuentas. Deben verificarse por separado.
6. **Storage independiente:** borrar Firestore/Auth no elimina objetos ni buckets. Un bucket puede servir a la aplicación o a artefactos técnicos; no debe inferirse descarte por el tamaño.
7. **VAPID coordinado:** eliminar suscripciones no rota las claves. La nueva clave pública y la privada deben actualizarse coordinadamente en otra ventana.
8. **Git como fuente de verdad:** reglas, índices y Functions sólo se rehabilitarán desde commits revisados. Nunca se restaurarán `updateUserRole` ni las reglas permisivas históricas.

## 6. Comandos y mecanismos propuestos — no ejecutados

Todos los comandos Firebase futuros deben ejecutarse con `DEBUG` y `FIREBASE_DEBUG_MODE` retiradas. Antes de cada escritura se volverán a comprobar proyecto, número, rama, HEAD, Git limpio, inventario esperado y autorización inmediata.

### 6.1 Firestore data

Comando destructivo propuesto, desde `volley-ranking-system/`:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase firestore:delete \
  --all-collections \
  --database '(default)' \
  --project project-groupvolley \
  --force
```

**Alcance exacto:** todos los documentos y subcolecciones de la base `(default)` de `project-groupvolley`. La implementación de Firebase CLI enumera collection IDs raíz y ejecuta borrado recursivo para cada colección. No elimina la base, rulesets, releases de reglas, índices, TTL/configuración, Functions, Auth, Storage ni Hosting.

**Resultado esperado:** cero documentos en las 12 colecciones conocidas y cero documentos `pendingAlerts`, sin colecciones/subcolecciones residuales.

**Punto de no retorno:** envío de la operación con `--force`. No existe rollback porque se aprobó no exportar. Debe pedirse autorización inmediata después de mostrar nuevamente `project-groupvolley`, `211711925841`, los conteos esperados y la evidencia de que las Functions escritoras ya no están activas.

**Verificación:** volver a enumerar collection IDs; consultar en modo agregado las 12 colecciones conocidas y el collection group `pendingAlerts`; esperar a que no existan operaciones/invocaciones pendientes; comprobar que el hash de reglas y el inventario de índices no cambiaron.

### 6.2 Authentication

Firebase CLI no ofrece un comando nativo de borrado masivo de Auth que cumpla este alcance sin exportar. El mecanismo exacto propuesto es la API Identity Toolkit:

```text
POST https://identitytoolkit.googleapis.com/v1/projects/project-groupvolley/accounts:batchDelete
body: { "localIds": [seis identificadores obtenidos en memoria], "force": true }
```

No se congelan ni se muestran los seis `localIds`. La ejecución futura debe usar un operador efímero revisado, fuera del repositorio, que:

1. resuelva por metadata `project-groupvolley` y `211711925841`;
2. consulte las cuentas en memoria mediante `accounts:query`;
3. falle cerrado si el total no es exactamente 6, si hay paginación sin consumir, si cambia el proyecto o si aparecen tenants no inventariados;
4. muestre sólo `total=6`, nunca UID, correo, teléfono, nombre ni tokens;
5. se detenga para autorización inmediata;
6. envíe una sola solicitud `accounts:batchDelete` con esos seis identificadores y `force=true`;
7. falle si `successCount != 6` o `failureCount != 0`;
8. repita `accounts:query` y exija `total=0`.

El helper no se creó en E0-08. Su interfaz propuesta para el incremento de ejecución es:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE node /tmp/e0-auth-delete-reviewed.js \
  --project project-groupvolley \
  --project-number 211711925841 \
  --expected-users 6
```

El archivo temporal deberá ser revisado antes de ejecutarse, no aceptar defaults, no persistir respuestas, no registrar PII y requerir una confirmación fuera del proceso inmediatamente antes del POST. No debe usar `auth:export`.

### 6.3 Functions escritoras

La alternativa recomendada es retirar explícitamente las 50 escritoras antes de Firestore. Primera generación no ofrece una pausa uniforme que cierre simultáneamente callables, HTTP, Auth, Firestore y Scheduler. Un deploy de stubs agregaría código transitorio; dejar activas las Functions y confiar sólo en la ventana no falla de forma cerrada.

Se propone un lote autorizado del servicio Functions, ejecutado en cinco comandos verificables. **No fueron ejecutados:**

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  onMatchDeadline onMatchStart onPendingAlertsMaintenance \
  --region us-central1 --project project-groupvolley --force

env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  onUserCreate onParticipationCreate onParticipationUpdate onMatchClose \
  onUserPendingAlertsSync onGroupPendingAlertsSync onTournamentPendingAlertsSync \
  onTournamentRegistrationPendingAlertsSync onTournamentMatchPendingAlertsSync \
  onTournamentTeamPendingAlertsSync \
  --region us-central1 --project project-groupvolley --force

env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  api \
  --region us-central1 --project project-groupvolley --force

env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  completeOnboarding createMatch editMatch editGroup toggleGroupActivo joinMatch \
  leaveMatch updatePagoEstado eliminarJugador reincorporarJugador cerrarMatch \
  reabrirMatch eliminarMatch updatePreferredPositions generarEquipos createTournament \
  requestTournamentRegistration reviewTournamentRegistration \
  updateTournamentRegistrationPayment openTournamentRegistrations confirmFixture \
  closeTournamentRegistrations startTournament finalizeTournament cancelTournament \
  confirmGroups addTournamentAdmin removeTournamentAdmin editTournament \
  recordMatchResult advancePhase dismissPendingAlert \
  --region us-central1 --project project-groupvolley --force

env -u DEBUG -u FIREBASE_DEBUG_MODE firebase functions:delete \
  addGroupAdmin removeGroupAdmin reorderGroupAdmins transferGroupOwnership \
  --region southamerica-east1 --project project-groupvolley --force
```

La autorización futura deberá incluir el manifiesto de exactamente 50 nombres. Antes de cada comando se confirmará que cada nombre existe una sola vez en la región indicada y que no apareció ninguna Function no versionada. Después se esperará la terminación de las operaciones y se exigirá un inventario de exactamente cuatro Functions lectoras, salvo que el propietario autorice también su retiro en una operación separada.

Retirar una Function es una modificación remota, pero el código permanece en Git y es técnicamente redeplegable. No debe redeplegarse durante el vaciado ni presentarse ese redeploy como rollback seguro si vuelve a habilitar escrituras legadas.

### 6.4 Hosting

Alternativas preparadas:

| Alternativa | Mecanismo futuro | Consecuencia |
| --- | --- | --- |
| Mantener | Ningún comando | Conserva el frontend legado accesible; no es compatible con un backend vacío y no bloquea clientes ya cargados |
| Deshabilitar temporalmente | `firebase hosting:disable --site project-groupvolley --project project-groupvolley --force` | Deja de servir tráfico sin borrar datos Firestore/Auth; requiere deploy posterior para rehabilitar |
| Reemplazar por mantenimiento | Crear artefacto revisado y `firebase deploy --only hosting --project project-groupvolley` | Ofrece mensaje controlado, pero es código/deploy nuevo y necesita incremento propio |
| Eliminar el sitio | `firebase hosting:sites:delete project-groupvolley --project project-groupvolley --force` | Retira el recurso Hosting y puede afectar URL/app asociada; es más destructivo y no es requisito para reinicializar datos |

La opción recomendada para la ventana es **deshabilitar temporalmente**, con autorización Hosting separada. No elimina la necesidad de retirar las Functions escritoras.

### 6.5 Storage

No se documenta un comando ejecutable con identificadores de bucket porque todavía no existe decisión de descarte y el informe no debe mostrar nombres. Las alternativas son:

| Opción | Alcance | Consecuencias y dependencias | Costo operativo |
| --- | --- | --- | --- |
| Conservar buckets y objetos | 2 buckets / 111 objetos / ~15,5 MiB | Máxima reversibilidad; conserva posibles assets o artefactos técnicos | Costo de almacenamiento y operaciones continúa, aunque el volumen es pequeño |
| Eliminar sólo objetos | Enumerar todas las generaciones activas y borrar por bucket, conservando cada recurso | Libera contenido; mantiene región, namespace, IAM/configuración y posibilidad de reutilización; puede romper URLs o artefactos | Operaciones de listado/borrado y posibles cargos; luego costo de objetos cercano a cero |
| Eliminar objetos y buckets | Vaciar primero y luego borrar cada bucket | Máxima pérdida; puede afectar bucket predeterminado, artefactos de deploy, referencias de aplicación y recreación regional | Operaciones de borrado; elimina costo futuro del bucket/objetos, sujeto a cargos/reglas del proveedor |

Para cualquiera de las dos opciones destructivas se requiere: decisión explícita por cada bucket, clasificación técnica de su función sin descargar objetos, herramienta disponible y revisada, guarda exacta de proyecto/número, conteo previo de 111 sin drift, autorización inmediata, borrado separado por bucket y verificación agregada. Si se eligen objetos solamente, el mecanismo será listado paginado + delete por generación dentro del bucket autorizado. Si se elige eliminar el bucket, se verificará primero `objectCount=0` y luego se usará la operación de eliminación del recurso. No se agruparán ambos buckets en una autorización implícita.

### 6.6 Secret Manager y VAPID

No hay comando de rotación en este plan. La intervención futura deberá:

1. decidir qué Functions y frontend volverán a operar;
2. generar el nuevo par sin imprimirlo ni guardarlo en Git;
3. crear versiones nuevas de los nombres VAPID correspondientes;
4. coordinar clave pública del frontend y clave privada/subject de Functions;
5. desplegar únicamente componentes aprobados;
6. verificar con testers y datos nuevos;
7. deshabilitar y, con otra autorización, destruir versiones comprometidas;
8. confirmar que los informes y logs no contienen valores.

La eliminación de `push_subscriptions` sólo invalida registros actuales; no rota credenciales.

## 7. Riesgos y puntos de no retorno

| Riesgo | Control | Punto de no retorno |
| --- | --- | --- |
| Proyecto equivocado | Match exacto de ID y número; sin alias implícito | Primera solicitud de escritura |
| Drift entre inventario y ejecución | Recontar inmediatamente; detener ante cualquier diferencia | Confirmación con `--force`/POST |
| Pérdida sin backup | Decisión explícita de no exportar ya registrada | Primer documento/cuenta eliminado |
| Subcolecciones huérfanas | `--all-collections` recursivo + verificación por collection group | Ejecución Firestore |
| Repoblación asíncrona | Retirar primero 50 escritoras y esperar operaciones | Inicio del borrado de datos |
| PII en logs Auth | Agregados solamente; identificadores sólo en memoria | Ejecución del operador Auth |
| Rotura de frontend | Modo mantenimiento y no exigir compatibilidad legado | Deshabilitación/reemplazo Hosting |
| Pérdida Storage indebida | Decisión y autorización individual por bucket | Primer delete de objeto/generación |
| Reapertura de seguridad | Conservar ruleset y prohibir `updateUserRole` | Cualquier deploy posterior |
| Rotación VAPID incompleta | Ventana separada y cambio coordinado | Activación de la nueva versión |

## 8. Checklists previos y posteriores

### 8.1 Functions escritoras

**Previo:** ventana abierta; Git limpio y HEAD autorizado; proyecto/número exactos; 54 Functions; `updateUserRole` ausente; manifiesto de 50 revisado; decisión sobre las 4 lectoras; autorización inmediata Functions.

**Posterior:** cinco comandos exit 0; ninguna operación pendiente; exactamente 4 lectoras y 0 escritoras del manifiesto; regiones correctas; reglas y datos sin cambios; registrar cualquier fallo parcial y no iniciar Firestore.

### 8.2 Firestore

**Previo:** Functions escritoras ausentes/contenidas; ruleset seguro con hash esperado; 12 colecciones, 44 documentos raíz y 4 `pendingAlerts`; índices inventariados; proyecto/número/base exactos; no export ratificado; autorización inmediata Firestore.

**Posterior:** cero documentos raíz; cero `pendingAlerts`; cero collection IDs residuales con documentos; sin invocaciones pendientes; hash de reglas sin cambios; índices sin modificación; Auth/Storage/Hosting sin cambios.

### 8.3 Authentication

**Previo:** proyecto/número exactos; exactamente 6 cuentas en el ámbito predeterminado; tenants enumerados o ausencia confirmada; operador efímero revisado; salida sin PII; no export ratificado; autorización inmediata Auth.

**Posterior:** `successCount=6`, `failureCount=0`; nueva consulta `total=0`; no se crearon cuentas; Firestore, Storage y secretos sin cambios; no persistieron identificadores ni respuestas.

### 8.4 Hosting

**Previo:** propietario elige mantener, deshabilitar, reemplazar o retirar; sitio único confirmado; impacto comunicado; autorización inmediata Hosting.

**Posterior:** estado esperado confirmado sin mostrar URLs innecesarias; Functions/datos no modificados por la operación; plan explícito de rehabilitación si se deshabilitó.

### 8.5 Storage

**Previo:** opción y bucket individual aprobados; rol técnico clasificado; 2 buckets/111 objetos/~15,5 MiB revalidados; política de generaciones y retención revisada; herramienta disponible; autorización inmediata por bucket.

**Posterior:** conteo cero para objeto/bucket autorizado o preservación confirmada; segundo bucket intacto salvo autorización propia; ninguna descarga; Functions/Hosting revisados por posibles dependencias; evidencia sólo agregada.

### 8.6 Secret Manager/VAPID

**Previo:** intervención distinta; consumidores exactos; nuevo material generado de forma local segura; coordinación frontend/Functions; recuperación segura; autorización de versiones y deploy.

**Posterior:** consumidores usan el par coordinado; testers se reinscriben; versiones comprometidas se deshabilitan/destruyen sólo según autorización; ningún valor en Git, logs o informe.

## 9. Decisiones todavía pendientes del propietario

Antes de cualquier operación destructiva o de retiro el propietario debe decidir expresamente:

1. autorizar o rechazar el retiro de las **50 Functions escritoras** del manifiesto;
2. conservar o retirar separadamente las **4 Functions de consulta**;
3. elegir para Hosting: mantener, deshabilitar temporalmente, reemplazar por mantenimiento o eliminar;
4. elegir para cada bucket Storage: conservar, vaciar objetos o vaciar y eliminar el bucket;
5. autorizar, en puntos inmediatos separados, la operación Functions, el borrado Firestore y el borrado Authentication;
6. fijar una ventana independiente para rotación VAPID y decidir el ciclo de deshabilitación/destrucción de versiones;
7. aceptar que la diferencia entre índices remotos y declaraciones locales se revise aparte, sin alterar índices durante la limpieza.

No hace falta una decisión de borrado push separada: las dos suscripciones quedan incluidas en el vaciado completo de Firestore. Los testers deberán volver a autenticarse y reinscribirse después de la rehabilitación.

## 10. Secuencia recomendada

1. Mantener el ruleset seguro y comprobar que `updateUserRole` sigue ausente.
2. Abrir ventana completa y, si el propietario lo decide, deshabilitar Hosting en una operación propia.
3. Autorizar y retirar las 50 Functions escritoras; verificar que no quedan writers ni operaciones pendientes.
4. Revalidar inventario Firestore y solicitar autorización inmediata exclusiva.
5. Vaciar Firestore con `--all-collections`; comprobar estado vacío, subcolecciones incluidas, ruleset e índices intactos.
6. Revalidar las 6 cuentas y solicitar autorización inmediata exclusiva de Authentication.
7. Eliminar las cuentas mediante `accounts:batchDelete`; comprobar total cero sin PII.
8. Conservar Storage por defecto hasta que exista decisión individual; ejecutar su opción sólo en incremento separado.
9. Mantener la rotación VAPID separada; las suscripciones ya no existirán y los testers se reinscribirán con el nuevo par.
10. Registrar el estado remoto vacío y comparar Git/configuración antes de comenzar cualquier nueva implementación.

Una falla o drift en cualquier paso detiene los siguientes. No se intenta “completar” parcialmente otro servicio para compensarla.

## 11. Criterio de salida de E0-08

| Criterio | Estado |
| --- | --- |
| Precondiciones y controles E0-07B revalidados | Cumplido |
| Inventario agregado actualizado sin PII/secretos | Cumplido |
| Firestore/Auth/Push/Storage/Functions/Hosting/Secret Manager separados | Cumplido |
| Subcolecciones y configuración separada contempladas | Cumplido |
| Functions escritoras y riesgo de repoblación identificados | Cumplido |
| Mecanismos y comandos preparados sin ejecutarlos | Cumplido |
| Puntos de autorización y no retorno explícitos | Cumplido |
| Checklists previos/posteriores definidos | Cumplido |
| Decisiones pendientes del propietario enumeradas | Cumplido |
| Ninguna escritura o cambio remoto | Cumplido |

E0-08 cierra cuando este informe sea revisado y versionado. No requiere que el propietario haya elegido todavía Storage, Hosting o el destino de las cuatro Functions lectoras; sí exige que esas decisiones permanezcan visibles antes de cualquier ejecución.

## 12. Propuesta exacta del siguiente incremento

El siguiente incremento recomendado, sin ejecutarlo, es:

> **E0-09A — Retiro controlado de Functions escritoras legadas**

Debe limitarse al preflight, autorización inmediata y eventual retiro del manifiesto exacto de 50 Functions escritoras documentado aquí. Debe conservar las cuatro Functions de consulta salvo decisión expresa adicional, mantener `updateUserRole` ausente, no desplegar código, no tocar Firestore/Auth/Hosting/Storage/Secret Manager y verificar que queden cero superficies capaces de repoblar datos antes de preparar el borrado Firestore.

Después, y sólo con cierres independientes:

- **E0-09B — Reinicialización completa de Firestore**;
- **E0-09C — Retiro de cuentas Authentication de testers**;
- intervenciones separadas para Hosting, Storage y VAPID según las decisiones pendientes.

Cada incremento deberá repetir proyecto, número, inventario, Git, ventana y autorización inmediatamente antes de su primera escritura.

## 13. Veredicto

**COMPLETADO CON DECISIONES PENDIENTES — preparación exacta disponible; ninguna operación destructiva autorizada ni ejecutada.**

La evidencia permite cerrar E0-08 porque el estado objetivo está delimitado por servicio, los writers que podrían repoblar Firestore están identificados, el borrado recursivo contempla subcolecciones, Authentication evita PII, Push no se duplica, Storage/Hosting/VAPID conservan decisiones propias y cada punto irreversible exige una nueva autorización inmediata.

No se ejecutó E0-09A ni se inició Etapa 1.
