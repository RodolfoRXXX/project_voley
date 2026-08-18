# E0-09B — Barrera temporal de mantenimiento Firestore

**Proyecto:** SPORTEXA

**Fecha:** 17 de agosto de 2026

**Rama:** `chore/etapa-0-estabilizacion`

**Commit inicial y upstream:** `2f0899a51e9e3d1b6e050be40786b1a446efd8d0`

**Proyecto remoto verificado:** `project-groupvolley` (`211711925841`)

**Alcance ejecutado:** cambios locales, pruebas con emuladores y preparación documental. No se ejecutó ningún deploy ni escritura remota.

**Veredicto:** **COMPLETADO — barrera local preparada y probada; despliegue pendiente de autorización independiente**

## 1. Precondiciones

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| E0-09A | Informe revisado, versionado y presente en HEAD/upstream | Cumplido |
| HEAD/upstream | `2f0899a51e9e3d1b6e050be40786b1a446efd8d0` | Cumplido |
| Git inicial | Limpio | Cumplido |
| `.secret.local` | Ignorado y no versionado | Cumplido |
| Firebase CLI | Ejecuciones remotas de sólo lectura con `DEBUG` y `FIREBASE_DEBUG_MODE` retiradas | Cumplido |
| Project ID | `project-groupvolley` | Cumplido |
| Número de proyecto | `211711925841` | Cumplido |
| Functions remotas | 0 | Cumplido |
| `updateUserRole` | Ausente | Cumplido |
| Ruleset remoto vigente | Hash seguro `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` | Cumplido |
| Diferencias respecto del estado autorizado | Ninguna | Cumplido |

Las comprobaciones remotas fueron exclusivamente de metadata y recuperación de reglas mediante GET. No se invocaron Functions, no se consultaron valores secretos y no se modificó ningún recurso remoto.

## 2. Archivos creados o modificados

### 2.1 Nuevos

| Archivo | Propósito |
| --- | --- |
| `volley-ranking-system/firestore.maintenance.rules` | Ruleset temporal independiente que deniega todo acceso cliente |
| `volley-ranking-system/firebase.maintenance.json` | Configuración mínima para un futuro deploy exclusivo de reglas |
| `volley-ranking-system/firebase.maintenance.test.json` | Configuración aislada de Auth y Firestore Emulator |
| `volley-ranking-system/functions/test/run-maintenance-tests.js` | Runner seguro y reproducible de la suite de mantenimiento |
| `volley-ranking-system/functions/test/emulator/maintenanceRules.test.js` | Casos negativos de acceso cliente con datos sintéticos |
| `docs/implementacion/etapa-0/E0-09B-barrera-mantenimiento-firestore.md` | Informe de ejecución y preparación del deploy futuro |

### 2.2 Modificados

| Archivo | Cambio focalizado |
| --- | --- |
| `volley-ranking-system/functions/package.json` | Incorpora el comando explícito `test:maintenance` |
| `volley-ranking-system/functions/test/guards/firebaseTestGuard.js` | Permite que una suite declare el subconjunto obligatorio de emuladores, conservando por defecto la exigencia anterior |
| `volley-ranking-system/functions/test/unit/isolationGuard.test.js` | Comprueba la nueva opción y su fallo cerrado cuando falta Auth Emulator |

No se modificaron `firestore.rules`, `firebase.json`, índices, Functions productivas ni frontend.

## 3. Política aplicada

El ruleset temporal utiliza `rules_version = '2'` y una única coincidencia recursiva:

```text
/databases/{database}/documents/{document=**}
```

Para ese espacio completo define `allow read, write: if false`. En consecuencia:

- visitantes y usuarios autenticados reciben rechazo;
- roles globales, owners y administradores contextuales no introducen excepciones;
- se rechazan lecturas, listados, creación, actualización y eliminación;
- la denegación alcanza documentos raíz y cualquier profundidad de subcolección;
- ninguna operación permitida por el ruleset arquitectónico normal permanece permitida durante mantenimiento.

Esta política es una barrera operativa temporal. No redefine el modelo de autorización aprobado ni reemplaza el ruleset seguro normal.

La configuración de despliegue alternativa contiene únicamente la referencia a `firestore.maintenance.rules`. No contiene Project ID implícito, índices, Functions, Hosting, Storage ni otros targets. El proyecto debe proporcionarse explícitamente en la línea de comandos.

## 4. Aislamiento de pruebas

El comando específico es:

```bash
npm --prefix volley-ranking-system/functions run test:maintenance
```

El runner:

- crea un directorio de trabajo y un directorio de configuración Firebase temporales;
- copia exclusivamente el ruleset y la configuración de pruebas de mantenimiento;
- no copia el código de Functions ni `.secret.local`;
- construye el entorno mediante una lista permitida, sin heredar credenciales Firebase o Google;
- usa el Project ID sintético `demo-sportexa-e0-02`;
- exige hosts loopback para Auth y Firestore Emulator;
- inicia exclusivamente `auth,firestore`;
- bloquea tráfico saliente mediante proxies dirigidos a un puerto loopback cerrado;
- utiliza datos, usuarios, tokens y clave API sintéticos;
- elimina los directorios temporales y detiene los emuladores al finalizar.

La suite normal continúa separada y se ejecuta con:

```bash
npm --prefix volley-ranking-system/functions test
```

El gate consolidado de Etapa 0 continúa siendo:

```bash
npm --prefix volley-ranking-system run quality:stage0
```

La suite de mantenimiento no se añadió automáticamente al gate consolidado para no reemplazar ni mezclar el ruleset deny-all con la suite funcional normal. Antes de desplegar la barrera deben ejecutarse ambos comandos.

## 5. Matriz de pruebas

Los documentos iniciales se cargan únicamente mediante Admin SDK contra el emulador para preparar el fixture. Las operaciones evaluadas se realizan como clientes y deben recibir HTTP 403.

| Actor | Recurso/operación | Esperado | Resultado |
| --- | --- | --- | --- |
| Visitante | Leer documento de Grupo | Rechazo | Aprobado |
| Visitante | Listar colección de Grupos | Rechazo | Aprobado |
| Visitante | Crear Grupo | Rechazo | Aprobado |
| Visitante | Actualizar Grupo existente | Rechazo | Aprobado |
| Visitante | Eliminar Grupo existente | Rechazo | Aprobado |
| Usuario autenticado | Leer su propio Usuario | Rechazo | Aprobado |
| Usuario autenticado | Crear su propio Usuario | Rechazo | Aprobado |
| Usuario autenticado | Modificar su propio Usuario | Rechazo | Aprobado |
| Owner/administrador contextual | Leer su Grupo | Rechazo | Aprobado |
| Owner/administrador contextual | Modificar su Grupo | Rechazo | Aprobado |
| Visitante | Leer subcolección | Rechazo | Aprobado |
| Usuario autenticado | Leer subcolección | Rechazo | Aprobado |
| Usuario autenticado | Crear/eliminar en subcolección | Rechazo | Aprobado |

La combinación de casos incluye operaciones que el ruleset normal permite a actores legítimos y confirma que bajo mantenimiento dejan de estar permitidas.

## 6. Resultados

| Verificación | Resultado |
| --- | --- |
| Suite específica de mantenimiento | Aprobada: 7/7 tests; todos los accesos cliente rechazados |
| Suite normal de reglas e infraestructura | Aprobada: 26/26 tests con emuladores |
| Guardas unitarias | Aprobadas: 10/10 |
| ESLint | Baseline conocido: 41 errores y 13 warnings; 0 hallazgos nuevos |
| Typecheck | Aprobado |
| Sintaxis Functions | Aprobada: 94/94 archivos |
| Build | Aprobado: 18 páginas |
| `npm run quality:stage0` | Aprobado |
| `git diff --check` | Aprobado |
| Emuladores | Apagados al finalizar; sin listeners en los puertos reservados de las suites |
| Regresiones respecto del baseline | Ninguna detectada |

Todas las pruebas Firebase utilizaron exclusivamente emuladores y un ID `demo-*`. No cargaron `.secret.local`, credenciales ADC ni configuración de proyecto remoto.

## 7. Hashes

Los hashes SHA-256 se calcularon sobre los archivos con finales de línea LF y newline final versionable:

| Ruleset | Archivo | SHA-256 |
| --- | --- | --- |
| Mantenimiento deny-all | `volley-ranking-system/firestore.maintenance.rules` | `cd5089e4e5116dbb994013dc5fd5e7e411ec348935b8d06d13acd00173cca15b` |
| Seguro normal | `volley-ranking-system/firestore.rules` | `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9` |

El segundo hash coincide con el ruleset remoto recuperado durante el preflight. El archivo seguro normal permaneció intacto.

## 8. Despliegue futuro propuesto — no ejecutado

Desde `volley-ranking-system/`, el comando exacto propuesto es:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase deploy \
  --only firestore:rules \
  --project project-groupvolley \
  --config firebase.maintenance.json \
  --non-interactive
```

Alcance exacto:

- proyecto: `project-groupvolley` (`211711925841`), sujeto a revalidación inmediata;
- configuración: `firebase.maintenance.json`;
- archivo: `firestore.maintenance.rules`;
- recurso modificable: exclusivamente las reglas de la base Firestore predeterminada;
- excluidos por configuración y por `--only`: índices, Functions, Hosting, Storage, Authentication, datos y cualquier otro target.

Antes de ejecutarlo en un incremento posterior se debe:

1. confirmar rama, HEAD y Git limpio;
2. confirmar que el informe y los archivos de E0-09B estén revisados y versionados;
3. revalidar Project ID `project-groupvolley` y número `211711925841`;
4. confirmar inventario remoto de cero Functions y ausencia de `updateUserRole`;
5. comprobar que el hash local de mantenimiento sea exactamente `cd5089e4e5116dbb994013dc5fd5e7e411ec348935b8d06d13acd00173cca15b`;
6. repetir la suite de mantenimiento y `quality:stage0` sólo con emuladores `demo-*`;
7. presentar nuevamente el comando exacto y solicitar autorización inmediata.

Verificaciones posteriores propuestas:

- recuperar mediante GET el ruleset desplegado y comparar su hash con el hash de mantenimiento autorizado;
- confirmar mediante metadata el mismo proyecto y cero Functions;
- comprobar de sólo lectura que Hosting, índices y demás recursos permanecen sin cambios;
- realizar lecturas remotas negativas, anónimas y autenticadas, sin exponer identidad ni PII;
- realizar intentos negativos de escritura sólo si la autorización futura los incluye expresamente; al ser rechazados no deben crear, modificar ni eliminar datos;
- detenerse y activar recuperación segura ante cualquier diferencia.

Este comando **no fue ejecutado** en E0-09B.

## 9. Recuperación

El ruleset seguro normal permanece en Git con el hash indicado. Desde `volley-ranking-system/`, su restauración futura exclusiva se preparó como:

```bash
env -u DEBUG -u FIREBASE_DEBUG_MODE firebase deploy \
  --only firestore:rules \
  --project project-groupvolley \
  --config firebase.json \
  --non-interactive
```

Antes de restaurar se debe verificar que `firestore.rules` conserva el hash seguro `d6e6b8a46ef6c64420080972cd11bf09dce2ac322343ba06d860f36af33beab9`, presentar el comando y obtener autorización inmediata. Después debe recuperarse el ruleset remoto y comprobar el mismo hash.

No se restaurarán las reglas permisivas históricas. Mientras la plataforma continúe en transición puede mantenerse el ruleset deny-all. El borrado administrativo futuro de Firestore usa una superficie privilegiada distinta de las reglas cliente y requerirá un incremento y autorización propios.

## 10. Límites y efectos

- E0-09B no desplegó reglas ni escribió en Firebase remoto.
- No borró documentos Firestore ni cuentas Authentication.
- No modificó Vercel ni Firebase Hosting.
- No desplegó ni eliminó Functions; el inventario remoto permanece en cero.
- No modificó índices, Storage, secretos, migraciones, seeds ni backfills.
- No leyó ni copió valores secretos.
- No hizo commit ni push.
- Un futuro despliegue deny-all interrumpirá deliberadamente todo acceso cliente a Firestore, incluido el frontend operativo en Vercel, hasta restaurar explícitamente el ruleset normal.
- Las operaciones administrativas autorizadas con credenciales privilegiadas no quedan bloqueadas por reglas cliente; requieren controles independientes.

## 11. Criterio de salida

E0-09B se considera cerrado localmente porque:

- existe un ruleset separado, mínimo y explícitamente deny-all;
- existe una configuración de deploy mínima sin Project ID implícito ni targets adicionales;
- la suite aislada demuestra rechazo para visitantes, autenticados, owners, administradores contextuales, documentos y subcolecciones;
- las suites de mantenimiento y normal son ejecutables por separado y aprueban;
- el aislamiento exige un Project ID `demo-*`, hosts locales y un entorno sin secretos;
- el ruleset seguro normal y su suite no fueron reemplazados;
- los hashes, comandos, impacto, verificación y recuperación están documentados;
- no se produjeron regresiones ni escrituras remotas.

El deploy remoto no forma parte del criterio de cierre de este incremento de preparación y permanece pendiente de una autorización explícita posterior.

## 12. Siguiente incremento propuesto

Se recomienda **E0-09C — despliegue controlado de la barrera temporal Firestore**. Debe limitarse a revalidar todas las precondiciones, solicitar autorización inmediata, desplegar exclusivamente `firestore.maintenance.rules`, verificar el hash remoto deny-all y demostrar el cierre cliente sin modificar datos.

E0-09C no se inició. La reinicialización administrativa de Firestore deberá tratarse después como un incremento separado, con inventario, alcance, recuperación y autorización propios.
