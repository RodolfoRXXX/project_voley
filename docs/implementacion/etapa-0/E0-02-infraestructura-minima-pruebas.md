# E0-02 — Infraestructura mínima de pruebas

**Proyecto:** SPORTEXA  
**Fecha:** 16 de agosto de 2026  
**Estado:** **COMPLETADO CON OBSERVACIONES — BLOQUEO INICIAL RESUELTO**

> Las secciones 1–10 conservan el registro del bloqueo inicial. Las secciones 11–20 documentan la remediación autorizada, la reanudación y el cierre posterior de E0-02.

## 1. Registro del alcance de la ejecución bloqueada

La ejecución se detuvo en el preflight obligatorio de secretos, antes de seleccionar o incorporar un runner, modificar scripts, iniciar emuladores o ejecutar pruebas.

No se modificaron reglas Firestore, lógica funcional, dependencias, configuración Firebase ni código de producción. No se ejecutaron migraciones, seeds, backfills, despliegues o accesos a Firebase remoto.

## 2. Precondición de repositorio

| Verificación | Resultado |
| --- | --- |
| Rama | `chore/etapa-0-estabilizacion` |
| Commit inicial | `95fc218fbcfd1dc246d3306c1e020f2183742008` |
| Tracking | `origin/chore/etapa-0-estabilizacion` |
| Estado inicial | Limpio |
| E0-01 versionado | Sí; `docs/implementacion/etapa-0/E0-01-linea-base-reproducible.md` pertenece al commit actual |
| Rama específica de Etapa 0 | Sí |
| Cambios locales ajenos | Ninguno detectado |

La precondición de repositorio se consideró satisfecha.

## 3. Resultado del preflight de secretos

Archivo afectado:

`volley-ranking-system/functions/.secret.local`

En la ejecución inicial el archivo estaba versionado. Se inspeccionó mediante clasificación local que no imprimió valores ni fragmentos.

| Variable | Resultado seguro de clasificación |
| --- | --- |
| `PUSH_VAPID_PUBLIC_KEY` | Posible material real con formato compatible con clave VAPID/base64url |
| `PUSH_VAPID_PRIVATE_KEY` | Posible credencial real con formato compatible con clave VAPID/base64url |
| `PUSH_VAPID_SUBJECT` | Identificador operativo no ficticio |

No se registraron longitudes, hashes, valores ni fragmentos. La clasificación no puede probar por sí sola que las claves estén activas, pero sí impide tratarlas como datos ficticios.

## 4. Motivo del bloqueo

La consigna de E0-02 exige detener la intervención antes de ejecutar pruebas que puedan cargar el archivo cuando existan indicios de credenciales reales.

Iniciar Functions Emulator desde el árbol actual podría cargar `.secret.local`. Continuar habría incumplido el preflight y habría ampliado innecesariamente la exposición del material versionado.

Por esa razón no se seleccionó ni implementó todavía un mecanismo de pruebas y no se ejecutaron typecheck, lint, build ni emuladores como parte de E0-02. El baseline de E0-01 permanece como última evidencia técnica válida.

## 5. Acciones necesarias antes de reanudar E0-02

En ese momento estas acciones requerían decisión y autorización explícitas y no fueron ejecutadas:

1. Tratar `PUSH_VAPID_PRIVATE_KEY` como comprometida por haber sido versionada.
2. Rotar el par VAPID en el sistema que lo utiliza y actualizar el almacenamiento autorizado de secretos.
3. Verificar qué ambientes, Functions o clientes consumen el par actual antes de invalidarlo.
4. Retirar `.secret.local` del índice de Git y agregar una regla de ignore apropiada.
5. Incorporar, si se necesita documentación local, una plantilla sin valores reales, por ejemplo `.secret.local.example`.
6. Evaluar y autorizar por separado la purga del archivo en el historial Git y en copias remotas. Retirarlo del último commit no elimina exposiciones históricas.
7. Auditar accesos al repositorio y cualquier distribución adicional del archivo.
8. Confirmar que el árbol de trabajo ya no contiene credenciales reales antes de repetir el preflight.

La clave pública y el subject no equivalen por sí solos a una clave privada, pero deben actualizarse de forma coordinada con la rotación del par y evitar exposición innecesaria de identificadores operativos.

## 6. Infraestructura y comandos en la ejecución bloqueada

No se agregaron archivos de infraestructura, scripts npm, fixtures ni pruebas. No existe todavía un comando E0-02 aprobado.

La selección del mecanismo mínimo compatible con CommonJS, Node 20, Auth Emulator, Firestore Emulator y reglas Firestore queda pendiente hasta superar el gate de secretos. No corresponde decidirla parcialmente mientras la ejecución está bloqueada.

## 7. Evidencia de aislamiento de la ejecución bloqueada

La evidencia negativa de esta ejecución es el fallo cerrado del proceso de preflight:

- se verificó el archivo antes de iniciar Firebase;
- se detectaron indicios sin imprimir valores;
- no se inició Firebase CLI ni Emulator Suite;
- no se accedió a recursos Firebase remotos;
- no se cargaron datos reales ni sintéticos;
- no se ejecutaron pruebas.

Esta evidencia demuestra que el procedimiento humano de preflight falló de forma cerrada. Todavía no satisface el criterio de salida que exige una guarda automatizada y una prueba negativa reproducible.

## 8. Criterios de salida en la ejecución bloqueada

| Criterio E0-02 | Estado |
| --- | --- |
| Comando claro y repetible | No implementado |
| Uso exclusivo de emuladores | No verificado en E0-02 |
| Project ID obligatorio `demo-*` | No implementado |
| Configuración insegura falla antes de Firebase | Preflight manual cumplido; guarda automatizada pendiente |
| Datos sintéticos | No implementados |
| Smoke test del runner | No implementado |
| Comprobación negativa automatizada | No implementada |
| Reglas y lógica funcional sin cambios | Cumplido |
| Cambios y dependencias documentados | Cumplido para el bloqueo |
| Sin regresiones respecto de E0-01 | No evaluado; no se ejecutaron verificaciones posteriores al gate |

## 9. Veredicto inicial

**BLOQUEADO.**

E0-02 no puede cerrarse. El bloqueo concreto es la presencia versionada de posible material VAPID real en `volley-ranking-system/functions/.secret.local`.

## 10. Recomendación emitida durante el bloqueo

El siguiente paso no es E0-03. Primero se requiere una intervención de seguridad autorizada para retirar y rotar el posible secreto, decidir el tratamiento del historial y repetir el preflight. Una vez superado ese gate, debe reanudarse E0-02 desde la selección del mecanismo mínimo de pruebas.

---

## 11. Reanudación autorizada

La reanudación comenzó en:

| Verificación | Resultado |
| --- | --- |
| Rama | `chore/etapa-0-estabilizacion` |
| Commit | `b2fc9b2e49c63d5b63a98f53fba84d407a8fdc1a` |
| Tracking | `origin/chore/etapa-0-estabilizacion` |
| Estado inicial de la reanudación | Limpio |
| Informe bloqueado | Versionado en el commit actual |
| Cambios ajenos | Ninguno detectado |

El commit de reanudación ya contenía el retiro de `.secret.local` del índice y la incorporación del informe bloqueado. No se repitió `git rm --cached` porque el archivo ya no pertenecía a `HEAD`. Su copia local seguía presente.

## 12. Resolución del bloqueo de secretos

| Control | Resultado |
| --- | --- |
| Tracking de `.secret.local` | Retirado; `git ls-files` no lo devuelve |
| Copia local | Preservada y disponible |
| Regla de ignore | `volley-ranking-system/.gitignore` contiene `.secret.local` y `git check-ignore` confirma su aplicación |
| Permiso local | Endurecido de `0664` a `0600` |
| Plantilla | Creada `functions/.secret.local.example` con nombres y valores vacíos/sintéticos |
| Rotación local VAPID | Par nuevo generado mediante `web-push@3.6.7`; sólo se actualizaron las claves pública y privada locales |
| Subject VAPID local | Preservado sin mostrarlo |
| Historial Git | No reescrito ni purgado |
| Commit/push | No realizados durante esta reanudación |

Ningún valor real fue impreso, copiado al informe o incorporado a archivos versionables.

### Consumidores y estado de rotación

Los consumidores son:

- `functions/src/config/functionSecrets.js`, que declara el conjunto de secretos para Functions;
- `functions/src/services/pushService.js`, que configura `web-push` y expone únicamente la clave pública;
- las Functions que aplican `MAIL_AND_PUSH_SECRETS` mediante `runWith`;
- el endpoint HTTP de clave pública y el frontend, que obtiene esa clave dinámicamente.

La rotación está **completa para el entorno local** y **pendiente para cualquier secreto remoto desplegado**. Antes de volver a desplegar o habilitar push debe actualizarse en el proyecto autorizado el trío `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY` y `PUSH_VAPID_SUBJECT`, y luego desplegar solamente las Functions consumidoras mediante una intervención remota separada. No se requiere migrar suscripciones porque se confirmó que no existen usuarios activos ni suscripciones relevantes.

La clave anterior continúa presente en el historial Git. Se considera comprometida; la decisión de reescribir historial permanece diferida y no bloquea las pruebas locales aisladas.

## 13. Mecanismo mínimo elegido

Se eligió el runner nativo `node:test` de Node 20.

Justificación:

- funciona directamente con CommonJS;
- no agrega dependencias ni modifica lockfiles;
- permite pruebas unitarias de guardas y smoke tests asíncronos;
- utiliza el `firebase-admin` ya instalado sólo después de aprobar la guarda;
- Firebase CLI inicia Auth y Firestore Emulator mediante `emulators:exec` y garantiza su apagado al finalizar.

No se incorporaron Jest, Vitest, Mocha ni `@firebase/rules-unit-testing` porque E0-02 sólo exige infraestructura y smoke tests. Las pruebas funcionales de reglas corresponden a incrementos posteriores y no deben congelar la política insegura actual.

## 14. Comandos reproducibles

Desde `volley-ranking-system/functions`:

```bash
npm test
```

Comandos parciales disponibles:

```bash
npm run test:infra:unit
npm run test:infra:emulators
```

`npm test` ejecuta primero el runner y las guardas sin Firebase. Sólo si aprueban inicia Auth y Firestore Emulator con `demo-sportexa-e0-02`.

## 15. Diseño de aislamiento

La infraestructura aplica estas defensas antes de usar Firebase:

1. exige que todos los project IDs presentes comiencen con `demo-` y coincidan;
2. exige `FIRESTORE_EMULATOR_HOST` y `FIREBASE_AUTH_EMULATOR_HOST` en loopback con puerto explícito;
3. rechaza `GOOGLE_APPLICATION_CREDENTIALS`, tokens Firebase/Google y overrides de credenciales;
4. rechaza alias, dominios o IDs asociados con Firebase remoto;
5. valida que `FIREBASE_CONFIG`, si Firebase CLI lo inyecta, pertenezca exactamente al proyecto demo;
6. acepta únicamente valores VAPID sintéticos definidos por la infraestructura;
7. construye un ambiente mediante allowlist en lugar de heredar credenciales del proceso;
8. fuerza proxies externos a un endpoint loopback cerrado y conserva `NO_PROXY` sólo para emuladores;
9. usa un directorio temporal vacío para configuración del CLI;
10. ejecuta Firebase desde otro workspace temporal que sólo contiene `firebase.test.json`, reglas e índices.

El workspace de prueba no contiene `.firebaserc`, `.secret.local`, Functions productivas ni archivos `.env`. `firebase.test.json` tampoco posee sección `functions`, por lo que Firebase CLI no carga secretos locales. El mensaje `Unable to fetch the CLI MOTD and remote config` aporta evidencia de que el egress externo fue bloqueado durante la ejecución aprobada.

## 16. Datos sintéticos y limpieza

El fixture determinista usa:

- project ID `demo-sportexa-e0-02`;
- colección exclusiva `e0_02_infrastructure_smoke`;
- documento con ID fijo y campos marcados como sintéticos;
- usuario Auth con UID fijo, nombre sintético y dominio reservado `example.invalid`.

El smoke test crea, lee y elimina el documento y el usuario dentro de `try/finally`. Además, `emulators:exec` inicia emuladores nuevos y los apaga al finalizar. El workspace y la configuración temporal se eliminan incluso si el comando falla.

## 17. Pruebas y resultados

| Verificación | Resultado | Comparación con E0-01 |
| --- | --- | --- |
| `npm test` | **APRUEBA**, exit 0 | Antes era un placeholder que fallaba |
| Runner y guardas | **9/9 aprueban** | Nueva infraestructura |
| Smoke Auth/Firestore | **1/1 aprueba** | Nueva evidencia con datos sintéticos |
| Project ID remoto | Rechazado antes de Firebase | Nueva comprobación negativa |
| Host ausente/no local | Rechazado antes de Firebase | Nueva comprobación negativa |
| Credenciales de aplicación | Rechazadas antes de Firebase | Nueva comprobación negativa |
| Configuración Firebase remota | Rechazada antes de Firebase | Nueva comprobación negativa |
| VAPID no sintético | Rechazado antes de Firebase | Nueva comprobación negativa |
| Typecheck frontend | **APRUEBA**, exit 0 | Sin regresión |
| Build frontend | **APRUEBA**, exit 0 | Sin regresión |
| Lint frontend | **FALLA**: 41 errores, 13 warnings | Exactamente el baseline; sin regresión |
| Sintaxis Functions | **APRUEBA 91/91** | Los 85 anteriores y los 6 nuevos aprueban |

El primer intento de emuladores dentro del sandbox falló por `EPERM` al abrir puertos. La repetición local autorizada fue la evidencia válida. Otro intento falló cerrado porque la guarda rechazó el `FIREBASE_CONFIG` demo inyectado por CLI; se refinó la validación para aceptar sólo el mismo project ID demo y se agregó una prueba de regresión.

## 18. Archivos de la reanudación

| Archivo | Intervención |
| --- | --- |
| `functions/.secret.local` | Rotado localmente y permiso `0600`; ignorado, no forma parte del diff |
| `functions/.secret.local.example` | Plantilla nueva sin credenciales reales |
| `functions/package.json` | Scripts explícitos `test` y `test:infra:*` |
| `firebase.test.json` | Configuración exclusiva de Auth/Firestore Emulator en loopback |
| `functions/test/guards/firebaseTestGuard.js` | Guarda fail-closed |
| `functions/test/fixtures/syntheticData.js` | Fixture determinista |
| `functions/test/unit/runner.test.js` | Smoke del runner CommonJS |
| `functions/test/unit/isolationGuard.test.js` | Casos positivos y negativos de aislamiento |
| `functions/test/emulator/emulatorSmoke.test.js` | Smoke de datos sintéticos Auth/Firestore |
| `functions/test/run-emulator-tests.js` | Orquestador aislado y sin secretos reales |
| Este informe | Conserva bloqueo y documenta resolución/cierre |

No se modificaron `firestore.rules`, `firestore.indexes.json`, lógica funcional, dependencias ni lockfiles.

## 19. Criterios de salida finales

| Criterio E0-02 | Evidencia | Estado |
| --- | --- | --- |
| Comando claro y repetible | `npm test` | Cumplido |
| Uso exclusivo de emuladores | Auth/Firestore en loopback y proyecto demo | Cumplido |
| Project ID obligatorio `demo-*` | Guarda y CLI usan `demo-sportexa-e0-02` | Cumplido |
| Configuración insegura falla antes de Firebase | Ocho casos de guarda, seis negativos | Cumplido |
| Datos sintéticos | Fixture determinista y dominio reservado | Cumplido |
| Smoke test del runner | Prueba CommonJS con `node:test` | Cumplido |
| Comprobación negativa de aislamiento | IDs, hosts, credenciales, config y VAPID rechazados | Cumplido |
| Reglas y lógica funcional sin cambios | Diff verificado | Cumplido |
| Cambios y dependencias documentados | Secciones 13–18 | Cumplido |
| Sin regresiones respecto de E0-01 | Typecheck/build/sintaxis aprueban; lint idéntico | Cumplido |

## 20. Veredicto final y siguiente incremento

**COMPLETADO CON OBSERVACIONES.**

E0-02 puede cerrarse: el bloqueo local fue resuelto, existe un comando reproducible, las configuraciones inseguras fallan de forma cerrada, los smoke tests usan sólo emuladores y datos sintéticos, y no se cargan secretos reales.

Observaciones pendientes:

- actualizar los tres secretos VAPID del ambiente remoto antes de cualquier futuro despliegue o reactivación de push;
- mantener la clave anterior como comprometida mientras siga presente en el historial;
- revisar y versionar el diff de esta reanudación mediante un commit posterior autorizado.

El siguiente incremento recomendado es **E0-03 — Contención de autopromoción**. No se ejecutó ninguna parte de E0-03.
