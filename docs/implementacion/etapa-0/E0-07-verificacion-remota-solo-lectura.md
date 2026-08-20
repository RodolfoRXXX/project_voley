# E0-07 — Verificación remota de sólo lectura

**Proyecto:** SPORTEXA

**Fecha:** 17 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial:** `6fb544dc25dd717aac4cd436922b917772bd23c0`

**Alcance:** consultas remotas agregadas y de metadatos; no modifica datos, Authentication, reglas, Functions, secretos, índices, IAM ni configuración.

**Veredicto:** **COMPLETADO CON HALLAZGOS CRÍTICOS — pendiente de revisión y versionado**

## 1. Precondiciones

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| E0-06 versionado | HEAD `6fb544d` (`chore(etapa-0): establecer baseline de calidad E0-06`) | Cumplido |
| Estado inicial | `git status --short --branch` sin cambios | Cumplido |
| Gate de Etapa 0 | `npm run quality:stage0`, exit 0 | Cumplido |
| Suite | Guardas 9/9 y emuladores 26/26 | Cumplido |
| Calidad | Lint baseline 41/13, typecheck, build y sintaxis 92/92 aprobados | Cumplido |
| Emuladores | Puertos libres antes y después del gate | Cumplido |
| Secreto local | `.secret.local` ignorado y no versionado | Cumplido |
| Firebase CLI | Versión 15.3.1; una sesión autorizada existente | Cumplido |

La identidad de la sesión no se imprimió ni se incorporó al informe. No se solicitó login, token, clave ni credencial. La Firebase CLI creó archivos `firebase-debug.log` durante algunas consultas; eran artefactos locales no versionados, se retiraron sin leerlos y Git volvió a quedar limpio antes de crear este informe. El `firestore-debug.log` preexistente e ignorado se preservó.

## 2. Proyecto y ambiente confirmados

| Metadato | Resultado |
| --- | --- |
| Alias local | `default` |
| Project ID | `project-groupvolley` |
| Nombre visible | `project-groupvolley` |
| Número de proyecto | `211711925841` |
| Estado | `ACTIVE` |
| Firestore | Base `(default)`, Native, concurrencia pesimista |
| Ubicación Firestore | `southamerica-east1` |
| Protección contra borrado | Deshabilitada |
| Aplicaciones registradas | 1 aplicación Web |

La cuenta autorizada puede ver tres proyectos, pero sólo uno coincide con la única entrada de `.firebaserc`, con el proyecto esperado por E0-07 y con los recursos inspeccionados. Los otros dos proyectos no poseen alias ni configuración en este repositorio y quedaron fuera de alcance.

La combinación de Hosting, Functions activas, datos coherentes, cuentas con actividad reciente y suscripciones push recientes demuestra que no debe tratarse como un proyecto vacío o descartable. Se clasifica como **ambiente remoto legado operativo**, aparentemente el único ambiente desplegado de esta aplicación. “Operativo” describe la evidencia técnica; no afirma un SLA ni un estado comercial.

## 3. Método de acceso de sólo lectura

Se utilizaron exclusivamente la sesión existente de Firebase CLI y operaciones cuya semántica es de lectura:

| Área | Operación | Método lógico | Datos conservados |
| --- | --- | --- | --- |
| Proyecto y aplicaciones | listados de proyectos y apps | list | Metadatos permitidos y conteos |
| Firestore database | obtención de metadata | get | Ubicación, tipo y protección |
| Reglas | releases y ruleset activo | GET | Hash, fecha y evaluación semántica; no se guardó el contenido remoto |
| Firestore | `listCollectionIds` | POST de listado | Nombres de colecciones |
| Firestore | `runAggregationQuery` | POST de consulta agregada | Conteos únicamente |
| Firestore | `runQuery` | POST de consulta | Hasta 3 documentos por colección para esquema; luego sólo campos de referencia para orfandad |
| Authentication | `accounts:query` | POST de consulta | Agregados en memoria; ningún registro individual persistido |
| Functions, Hosting y RTDB | listados | list | Conteos, runtime, región y tipo |
| Storage | listado de buckets | GET | Cantidad, región y clase; ningún objeto |
| Secret Manager | metadata de secretos conocidos | get | Nombre, cantidad y estado de versiones; ningún valor |

Aunque ciertas APIs de Google usan POST para consultas, los cuerpos empleados fueron `structuredQuery`, `structuredAggregationQuery` y `accounts:query`. No se llamó a `commit`, `batchWrite`, create, update, patch, delete, deploy, import, export ni acceso de valores de secretos. Un primer GET de Rules falló antes de inicializar correctamente la sesión dentro del proceso; no produjo datos ni mutaciones y se repitió con la misma operación GET.

## 4. Reglas Firestore desplegadas

| Evidencia | Remoto | Rama actual |
| --- | --- | --- |
| Fecha del release remoto | `2026-01-14T15:35:23.005984Z` | No aplica |
| SHA-256 normalizado | `2f46201d8b5fb00bba75a88c4c6e073830d9704db611760a4780fbc5dd9049c1` | `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` |
| Coincidencia exacta | No | — |

El contenido remoto coincide exactamente, por hash normalizado, con `firestore.rules` del commit histórico `631dd2390f3a2c352bf550edf8638a2b35df5695`. Esto permite identificar una versión anterior sin reconstrucción especulativa. La coincidencia de contenido no implica que ese commit haya originado el despliegue, pues sus fechas no establecen esa causalidad.

### 4.1 Diferencias semánticas críticas

La versión remota:

- permite lectura pública de `users`, Grupos, Partidos, participaciones, equipos, estadísticas y todas las colecciones de Torneos;
- permite a un usuario autenticado crear su propio documento `users/{uid}` sin excluir `roles`, `role`, `isAdmin`, claims, permisos o privilegios;
- bloquea cambios posteriores del campo exacto `roles`, pero esa protección no contiene el camino de creación ni los nombres alternativos;
- continúa usando `users.roles == "admin"` como privilegio global;
- no aplica las comprobaciones contextuales de integrante/administrador de Grupo o administrador de Torneo incorporadas localmente;
- conserva algunas actualizaciones directas de datos de inscripción y pago bajo el modelo legado.

La rama actual agrega la contención de E0-03 y la lectura mínima de E0-04: payload cerrado para privilegios globales, identidad propia privada, acceso contextual y privado por defecto. Esas correcciones están versionadas y probadas localmente, pero **no están desplegadas**.

No se desplegaron reglas durante E0-07.

## 5. Inventario agregado de Firestore

La base contiene **12 colecciones raíz, 44 documentos raíz y 4 documentos `pendingAlerts` en subcolecciones conocidas**.

| Colección | Documentos | Esquema aproximado observado, sin valores |
| --- | ---: | --- |
| `users` | 6 | identidad, onboarding, posiciones, compromiso, rol global legado y timestamps |
| `groups` | 6 | nombre/descripción, owner, admins, integrantes, solicitudes, visibilidad, actividad y configuración de ingreso |
| `matches` | 2 | Grupo, horario, formación, cupos, estado, bloqueo, visibilidad y deadlines |
| `participations` | 2 | Usuario, Partido, estado, posición, rankings, puntaje y estado de pago |
| `push_subscriptions` | 2 | Usuario, endpoint, claves públicas de suscripción, agente y timestamps |
| `tournaments` | 2 | ownership/admins, formato, fases, cupos, reglas, fechas, pago, estado y estructura |
| `tournamentPhases` | 5 | Torneo, tipo, orden, configuración, estado y confirmación |
| `tournamentRegistrations` | 4 | Torneo, Grupo, jugadores, estado, decisión e importes/pago |
| `tournamentTeams` | 4 | Torneo, Grupo, registro, jugadores, estado e importes/pago duplicados |
| `tournamentMatches` | 6 | Torneo, fase, equipos, ronda, secuencia, fuentes, estado y resultado |
| `tournamentStandings` | 4 | Torneo, fase, equipo, posición, clasificación y estadísticas |
| `tournamentAdvancementRules` | 1 | Torneo, fases origen/destino y reglas de avance |
| `users/*/pendingAlerts` | 4 | tipo, estado, severidad, prioridad, recurso, vínculo, deduplicación y timestamps |

El muestreo de esquema estuvo limitado a tres documentos por colección y produjo únicamente nombres de campos y tipos Firestore. No se imprimieron IDs, nombres de personas, correos, importes, endpoints, claves, contenido de alertas ni valores deportivos.

### 5.1 Integridad referencial observada

Se revisaron 21 relaciones conocidas entre usuarios, Grupos, Partidos, participaciones, Torneos, fases, inscripciones, equipos, standings, avance, push y alertas. Resultado agregado:

- referencias rotas detectadas: **0**;
- documentos afectados: **0**;
- cuentas Auth sin documento `users`: **0**;
- documentos `users` sin cuenta Auth: **0**;
- identidades emparejadas: **6**.

Esta comprobación cubre las referencias conocidas por la implementación actual; no afirma integridad semántica completa de campos embebidos o valores de negocio.

### 5.2 Actividad push

- suscripciones: **2**;
- usadas en los últimos 30 días: **0**;
- usadas en los últimos 90 días: **2**;
- usadas en los últimos 365 días: **2**.

Por tanto, la declaración previa de que no existían suscripciones relevantes no puede sostenerse frente a la evidencia remota actual.

## 6. Inventario agregado de Authentication

Ventanas calculadas al 17 de agosto de 2026:

| Métrica | Resultado |
| --- | ---: |
| Cuentas totales | 6 |
| Con inicio de sesión registrado | 6 |
| Sin inicio de sesión registrado | 0 |
| Deshabilitadas | 0 |
| Inicio de sesión en últimos 30 días | 0 |
| Inicio de sesión en últimos 90 días | 6 |
| Inicio de sesión en últimos 365 días | 6 |
| Último inicio anterior a 365 días | 0 |
| Proveedor | Google: 6 |

No se imprimieron ni persistieron UID, correo, nombre, teléfono, foto, fechas individuales ni metadata identificable. La actividad remota contradice la hipótesis de ausencia de usuarios activos: todas las cuentas poseen actividad dentro de los últimos 90 días.

## 7. Otros servicios detectados

### 7.1 Functions

- 55 Functions desplegadas y activas;
- runtime Node.js 20, primera generación;
- 51 en `us-central1` y 4 en `southamerica-east1`;
- 41 callables, 1 HTTP, 10 de eventos y 3 programadas;
- 8 Functions declaran secretos remotos.

La comparación por nombre encontró una Function remota que no existe en la rama: **`updateUserRole`**. Continúa **ACTIVE**, callable, primera generación, Node.js 20, en `us-central1`. No fue invocada. Su mera presencia mantiene remotamente el camino de autopromoción que E0-03 retiró localmente.

### 7.2 Hosting, Storage y Realtime Database

| Servicio | Inventario |
| --- | --- |
| Hosting | 1 sitio |
| Storage | 2 buckets Standard: uno en `SOUTHAMERICA-EAST1` y uno en `US-CENTRAL1` |
| Realtime Database | 0 instancias |

No se enumeraron ni leyeron objetos de Storage, versiones de Hosting ni contenido servido.

### 7.3 Secretos remotos

Sólo se consultó metadata de los nombres declarados por el código:

| Nombre | Versiones registradas | Estado agregado |
| --- | ---: | --- |
| `GMAIL_USER` | 1 | 1 habilitada |
| `GMAIL_PASS` | 2 | 2 habilitadas |
| `PUSH_VAPID_PUBLIC_KEY` | 2 | 2 habilitadas |
| `PUSH_VAPID_PRIVATE_KEY` | 2 | 2 habilitadas |
| `PUSH_VAPID_SUBJECT` | 1 | 1 habilitada |

No se accedió a ningún valor. Como E0-02 declaró comprometido el par VAPID anteriormente versionado y existen dos versiones habilitadas de cada clave, no puede determinarse cuál versión está activa o comprometida sin acceder a valores, acción prohibida en E0-07. La rotación y deshabilitación deberá tratar explícitamente las dos suscripciones usadas recientemente.

## 8. Datos relevantes y decisiones de descarte

### 8.1 Firestore

**No puede aprobarse su descarte.** Contiene identidades enlazadas, Grupos, Partidos, participaciones, Torneos, fixture, standings, pagos legados, alertas y suscripciones con integridad referencial observable. El volumen es pequeño, pero el dato es coherente y está asociado con usuarios recientes.

### 8.2 Authentication

**No puede aprobarse su descarte.** Las seis cuentas iniciaron sesión en los últimos 90 días, ninguna está deshabilitada y todas corresponden con un documento `users`.

### 8.3 Otros servicios

Functions, Hosting, los dos buckets y la metadata de secretos deben incorporarse al inventario de preservación. La ausencia de RTDB sí queda confirmada. No existe evidencia suficiente para decidir sobre objetos de Storage porque E0-07 sólo comprobó buckets.

## 9. Recomendación sobre export preventivo

Se recomienda preparar un export preventivo antes de cualquier cambio remoto destructivo o incompatible, pero **no se ejecutó ningún export**.

La preparación deberá cubrir por separado:

1. Firestore `(default)`, incluidos índices/reglas como configuración reproducible y las subcolecciones;
2. las 6 cuentas de Authentication mediante un mecanismo aprobado que preserve los identificadores necesarios sin incorporar PII al repositorio;
3. inventario y decisión de preservación para objetos de los 2 buckets;
4. configuración y release vigente de Hosting;
5. inventario de Functions, con tratamiento explícito de `updateUserRole`;
6. metadata de secretos y plan de rotación, nunca valores dentro de Git o del informe.

El destino, cifrado, retención, responsables y prueba de restauración deben aprobarse antes de exportar.

## 10. Riesgos

1. **Crítico — autopromoción remota:** `updateUserRole` permanece callable y activo.
2. **Crítico — reglas remotas desactualizadas:** permiten lecturas públicas generales y creación propia de Usuario con campos privilegiados.
3. **Alto — diferencia local/remoto:** E0-03 y E0-04 están probados pero no protegen el ambiente activo.
4. **Alto — usuarios recientes:** cualquier borrado, cierre de lectura o cambio de identidad puede afectar seis cuentas activas.
5. **Alto — VAPID comprometido:** hay dos suscripciones usadas en 90 días y dos versiones habilitadas de cada clave VAPID.
6. **Medio — datos de pago legados:** existen campos de importes/pago duplicados en inscripciones y equipos; deben preservarse aun sin considerarlos modelo definitivo.
7. **Medio — Storage no caracterizado a nivel de objetos:** existen dos buckets, pero no se inspeccionó su contenido.
8. **Medio — protección de borrado deshabilitada:** Firestore no posee esa barrera administrativa.
9. **Operativo — endurecimiento puede romper vistas actuales:** desplegar la política local de lectura cerrará accesos públicos que el frontend remoto podría seguir usando.

Los dos primeros riesgos exigen contención remota posterior con autorización específica. E0-07 no estaba autorizado para desplegar reglas ni eliminar Functions.

## 11. Archivos modificados

- `docs/implementacion/etapa-0/E0-07-verificacion-remota-solo-lectura.md` — este informe.

No se modificó ningún archivo productivo, regla, configuración, dependencia, lockfile, secreto ni prueba. No se hizo commit ni push.

## 12. Evidencia de ausencia de escrituras

- todos los comandos Firebase fueron `list` o `get`;
- Rules se obtuvo mediante GET y sólo se retuvieron hashes/controles semánticos;
- los POST utilizados fueron operaciones de consulta: list collections, query, aggregation query y accounts query;
- los muestreos existieron sólo en memoria del proceso y no se guardaron;
- no se ejecutó ningún endpoint funcional, incluido `updateUserRole`;
- no se usaron operaciones de escritura Firestore ni métodos de modificación de Authentication;
- no se accedió a valores de secretos;
- no se ejecutaron deploy, import, export, seed, migración, backfill, habilitación de API, cambio de IAM o índices;
- no cambió ningún release remoto observado durante la intervención;
- el único cambio persistente es este documento local.

La ausencia de escrituras se establece por la semántica y el inventario de operaciones ejecutadas; E0-07 no consultó Cloud Audit Logs para formular una prueba independiente adicional.

## 13. Veredicto

**COMPLETADO CON HALLAZGOS CRÍTICOS — pendiente de revisión y versionado.**

E0-07 alcanzó su objetivo: confirmó proyecto, reglas, datos, cuentas y servicios mediante lectura agregada. La conclusión normativa es que el ambiente **no está vacío**, Firestore y Authentication **no son descartables**, y las correcciones locales de E0-03/E0-04 **no contienen todavía el riesgo remoto**.

## 14. Propuesta exacta para E0-08

E0-08 debe limitarse a **preparación destructiva**, conforme al Documento 5, y no ejecutar acciones remotas. Su entregable debería contener:

1. clasificación formal del proyecto como ambiente legado activo y congelamiento de toda hipótesis de descarte inmediato;
2. decisión aprobada de export preventivo para Firestore y Authentication, con destino, cifrado, retención, custodio y prueba de restauración;
3. inventario de objetos de Storage por metadata agregada y decisión separada para cada bucket;
4. checklist previo/posterior para retirar la Function remota `updateUserRole`;
5. checklist previo/posterior para desplegar las reglas versionadas, incluyendo prueba de compatibilidad del frontend y plan de reversión;
6. secuencia y ventana de mantenimiento que reduzca el tiempo entre eliminar el callable inseguro y activar reglas seguras;
7. plan de rotación/deshabilitación de versiones VAPID y recuperación o reinscripción de las dos suscripciones recientes;
8. delimitación explícita de Firestore, Authentication, Storage, Hosting, Functions y secretos: qué se preserva, qué podría retirarse y bajo qué autorización futura;
9. evidencia requerida para una autorización destructiva posterior, sin incluir todavía comandos de borrado, deploy o export.

### Decisiones que requieren aprobación antes de E0-08

- aceptar que Firestore y Authentication deben preservarse y no descartarse;
- autorizar que E0-08 diseñe el export preventivo y sus controles, sin ejecutarlo;
- decidir si la contención remota crítica (`updateUserRole` y reglas) se prepara dentro del checklist de E0-08 o en una intervención de seguridad separada y prioritaria;
- autorizar la futura interrupción controlada que pueda causar el cierre de lecturas públicas;
- decidir el tratamiento de las dos suscripciones push recientes durante la rotación VAPID;
- autorizar una futura caracterización de sólo lectura del contenido agregado de Storage antes de decidir su preservación.

No se ejecutó E0-08 ni se prepararon comandos destructivos.
