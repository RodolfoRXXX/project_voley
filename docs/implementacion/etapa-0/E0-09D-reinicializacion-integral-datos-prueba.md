# E0-09D — Reinicialización integral de datos de prueba

## 1. Identificación

| Campo | Valor |
|---|---|
| Incremento | E0-09D |
| Proyecto | `project-groupvolley` |
| Número de proyecto | `211711925841` |
| Fecha de ejecución | 20 de agosto de 2026 |
| Rama | `chore/etapa-0-estabilizacion` |
| Commit de partida | `816873781bd1ed92214d85e23da1a8344b3d8556` |
| Veredicto | **COMPLETADO CON OBSERVACIONES** |

## 2. Objetivo y decisión de alcance

El objetivo de E0-09D fue reinicializar de forma integral los datos de prueba del
proyecto indicado, manteniendo intactos los contenedores y la configuración que
debían sobrevivir a la operación.

Se tomó expresamente la decisión de **no conservar los datos existentes**. No se
realizaron exportaciones, copias de respaldo ni inspecciones de contenido. La
ejecución quedó limitada, en orden estricto, a:

1. confirmar o vaciar Firestore conservando base, ruleset e índices;
2. eliminar las seis cuentas de Authentication del proyecto predeterminado,
   conservando su configuración;
3. eliminar los 111 objetos activos de los dos buckets autorizados, conservando
   ambos buckets y su política obligatoria de soft delete;
4. eliminar exactamente los siete secretos autorizados y todas sus versiones.

## 3. Autorización y límites

La autorización consolidada identificó de manera inequívoca el proyecto
`project-groupvolley` (`211711925841`), exigió el orden A → B → C → D y una
verificación entre bloques. También autorizó operadores efímeros revisados, con
la condición de no persistir PII, nombres de objetos ni valores secretos.

Quedaron fuera de alcance cualquier otro recurso, deploy, cambio IAM, cambio de
configuración, restauración de reglas, commit o push durante la operación remota,
así como el inicio de la Etapa 1. La ejecución debía detenerse ante diferencias
en proyecto, número, ruleset, Functions, conjunto de buckets o conjunto de
secretos, o ante cualquier fallo parcial.

## 4. Preflight e invariantes de seguridad

Antes de iniciar las eliminaciones se comprobaron los siguientes invariantes:

| Control | Resultado previo |
|---|---|
| Proyecto activo | `project-groupvolley` |
| Número de proyecto | `211711925841` |
| Ruleset Firestore | deny-all, hash `cd5089e4e5116dbb994013dc5fd5e7e411ec348935b8d06d13acd00173cca15b` |
| Functions | 0 desplegadas; `updateUserRole` ausente |
| Índices Firestore | 16 `READY`; 0 field overrides |
| Buckets autorizados | conjunto exacto de dos buckets |
| Secretos autorizados | conjunto exacto de siete secretos |
| Git | limpio; HEAD y upstream en `816873781bd1ed92214d85e23da1a8344b3d8556` |

Todos los controles aprobaron. No se detectó una diferencia que obligara a
cancelar la operación.

## 5. Inventario inicial

El inventario inmediatamente anterior al bloque A fue:

| Recurso | Estado inicial |
|---|---|
| Firestore, documentos raíz | 0 |
| Firestore, documentos totales observables desde raíz | 0 |
| Firestore, `pendingAlerts` | 0 |
| Firestore, identificadores residuales de colección | 12 |
| Authentication, proyecto predeterminado | 6 cuentas |
| Storage, `gcf-sources-211711925841-southamerica-east1` | 9 objetos activos |
| Storage, `gcf-sources-211711925841-us-central1` | 102 objetos activos |
| Storage, total activo | 111 objetos; 16.297.836 bytes (aprox. 15,54 MiB) |
| Storage, objetos soft-deleted | 0 |
| Secret Manager | 7 secretos |
| Functions | 0 |

Firestore ya no contenía los 44 documentos y cuatro `pendingAlerts` registrados
en una evidencia anterior. No se atribuyó causalidad a ese cambio. La
autorización permitía confirmar o vaciar Firestore; por ello el bloque A continuó
para retirar los identificadores residuales de colección y verificar el estado
vacío, sin reinterpretar la ausencia previa de documentos como un resultado de
E0-09D.

Los siete contenedores de secretos confirmados y autorizados fueron:

- `APP_BASE_URL`;
- `EMAIL_USER`;
- `EMAIL_PASSWORD`;
- `FIREBASE_CLIENT_EMAIL`;
- `FIREBASE_PRIVATE_KEY`;
- `FIREBASE_PROJECT_ID`;
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.

Esta enumeración identifica únicamente los contenedores. No se leyó, imprimió,
copió ni persistió el valor de ningún secreto.

## 6. Secuencia ejecutada

La operación respetó el orden obligatorio A → B → C → D. Cada bloque fue
seguido por una verificación de solo lectura antes de habilitar el siguiente.

### 6.1. Bloque A — Firestore

Se ejecutó, desde el repositorio de la aplicación y contra el proyecto explícito:

```text
firebase firestore:delete --all-collections --database "(default)" --project project-groupvolley --force
```

El bloque conservó la base `(default)`, el ruleset deny-all y los índices. La
verificación posterior confirmó 0 colecciones raíz, 0 documentos y 0
`pendingAlerts`; también volvió a comprobar los invariantes antes de avanzar.

### 6.2. Bloque B — Authentication

Un operador efímero enumeró únicamente el total de cuentas del proyecto
predeterminado y utilizó las operaciones administrativas de consulta y
eliminación por lotes. El resultado fue:

```text
Auth preflight total=6
Auth deleted=6 remaining=0 errors=0
```

No se imprimieron ni persistieron UID, correos ni otra PII. No se invocaron APIs
de configuración de Authentication. La verificación posterior confirmó 0
cuentas y la conservación de los demás invariantes.

### 6.3. Bloque C — Cloud Storage

La eliminación se limitó a los dos nombres de bucket autorizados y utilizó
precondiciones de generación para cada objeto. No se imprimieron ni persistieron
nombres de objetos.

| Bucket | Activos previos | Eliminados | Activos posteriores | Soft-deleted posteriores |
|---|---:|---:|---:|---:|
| `gcf-sources-211711925841-southamerica-east1` | 9 | 9 | 0 | 9 |
| `gcf-sources-211711925841-us-central1` | 102 | 102 | 0 | 102 |
| **Total** | **111** | **111** | **0** | **111** |

El primer operador emitió su resumen completo. En el segundo bucket, la salida
visible no incluyó el resumen de cierre aunque el proceso terminó. Se trató como
una ambigüedad: la secuencia se detuvo antes del bloque D y se hizo una
verificación inmediata de solo lectura. Esta confirmó 0 objetos activos y 102
objetos soft-deleted en el segundo bucket. Solo con esa evidencia se consideró
completo el bloque C y se autorizó internamente el avance.

Ambos buckets siguieron existiendo y no se modificó su configuración.

### 6.4. Bloque D — Secret Manager

Un operador efímero validó primero que el conjunto remoto coincidiera exactamente
con los siete contenedores enumerados y luego eliminó esos contenedores, junto
con sus versiones. El resumen fue:

```text
Secret Manager preflight total=7
Secret Manager deleted=7 remaining=0 valuesAccessed=0
```

No se invocó ninguna operación de acceso al payload de una versión. La
verificación posterior confirmó 0 secretos.

## 7. Verificaciones entre bloques

La compuerta de cada bloque confirmó el resultado recién obtenido y volvió a
validar los recursos que debían permanecer invariantes:

| Momento | Resultado habilitante |
|---|---|
| Después de A | Firestore 0 colecciones raíz, 0 documentos y 0 `pendingAlerts`; invariantes conservados |
| Después de B | Authentication 0 cuentas; Firestore e invariantes conservados |
| Después del primer bucket de C | 0 activos y 9 soft-deleted; segundo bucket aún sin ejecutar |
| Después del segundo bucket de C | 0 activos y 102 soft-deleted; ambos buckets conservados |
| Después de D | Secret Manager 0 secretos; todos los invariantes conservados |

No se continuó sobre un resultado parcial sin antes resolverlo mediante una
consulta de solo lectura.

## 8. Estado remoto final consolidado

| Recurso | Estado final verificado |
|---|---|
| Proyecto | `project-groupvolley` (`211711925841`) |
| Firestore | 0 colecciones raíz; 0 documentos; 0 `pendingAlerts` |
| Authentication | 0 cuentas en el proyecto predeterminado |
| Storage activo | 0 objetos en ambos buckets |
| Storage soft-deleted | 111 objetos: 9 + 102 |
| Buckets | 2 conservados |
| Secret Manager | 0 secretos |
| Functions | 0; `updateUserRole` ausente |
| Ruleset Firestore | deny-all activo según la última evidencia disponible |
| Hash del ruleset | `cd5089e4e5116dbb994013dc5fd5e7e411ec348935b8d06d13acd00173cca15b` |
| Índices Firestore | 16 `READY`; 0 field overrides |

La evidencia es puntual: describe el estado remoto al cierre de la ejecución y
no sustituye un sistema independiente de auditoría continua.

## 9. Recursos conservados

E0-09D conservó deliberadamente:

- el proyecto y su número;
- la base Firestore `(default)`;
- el ruleset deny-all;
- los 16 índices `READY` y la ausencia de field overrides;
- los dos buckets autorizados;
- la configuración de Authentication;
- la política de soft delete de Storage;
- el repositorio, su código y su configuración.

No se desplegaron Functions ni otros recursos. No se realizaron cambios IAM,
deploys, restauraciones de reglas, cambios de índices ni modificaciones de
Hosting, Vercel o configuración de servicios.

## 10. Retención soft delete y purga estimada

Los 111 objetos eliminados dejaron de ser objetos activos y quedaron retenidos
por la política obligatoria de soft delete durante siete días. Una consulta
posterior de metadata, limitada a agregados y sin nombres ni contenido, confirmó
`hardDeleteTime` para los 111 objetos:

| Bucket | Ventana `hardDeleteTime` en UTC |
|---|---|
| `gcf-sources-211711925841-southamerica-east1` | 27-08-2026 13:08:05.625 a 13:08:06.704 |
| `gcf-sources-211711925841-us-central1` | 27-08-2026 13:09:04.335 a 13:09:51.358 |

Por lo tanto, la purga física automática del conjunto completo se estima, de
forma conservadora, **a más tardar el 27 de agosto de 2026 a las 10:09:51 ART
(13:09:51 UTC)**. No se restauró ni purgó anticipadamente ningún objeto.

La retención física transitoria no contradice el inventario activo final de cero
objetos y no bloquea el cierre de E0-09D ni, por sí sola, el cierre de Etapa 0 o
la futura entrada a Etapa 1.

## 11. Operadores efímeros

Los operadores revisados se alojaron fuera del repositorio en:

```text
C:\Users\Rodolfo\AppData\Local\Temp\e0-09d-8168737
```

El directorio contenía exclusivamente `common.js`, `verify.js`,
`auth-delete.js`, `storage-delete.js` y `secret-delete.js`. Antes de usarlos se
revisó sintaxis y alcance; no incorporaban operaciones de lectura de valores de
secretos, descarga de objetos ni cambios IAM o de configuración.

Los operadores solo emitieron conteos y estados agregados. No persistieron PII,
nombres de objetos ni valores secretos. Tras la verificación final se validó la
ruta absoluta y se eliminó exclusivamente ese directorio temporal. Una
comprobación posterior confirmó que ya no existe y que ninguno de sus cinco
archivos fue rastreado por Git.

## 12. Tratamiento de información sensible

No se accedió al valor de ningún secreto. No se leyó el contenido de objetos de
Storage ni se registraron sus nombres. No se registraron UID, correos ni otra PII
de Authentication. Las evidencias preservadas se limitan a cantidades, estados,
identificadores públicos de recursos y hashes de configuración no secreta.

## 13. Estado de Git antes del informe

La operación remota terminó sin cambios locales:

- rama: `chore/etapa-0-estabilizacion`;
- HEAD: `816873781bd1ed92214d85e23da1a8344b3d8556`;
- upstream: `816873781bd1ed92214d85e23da1a8344b3d8556`;
- divergencia: 0 ahead / 0 behind;
- árbol de trabajo: limpio.

Por tanto, la operación A → B → C → D no introdujo cambios en código,
configuración, reglas, índices ni otros archivos del repositorio.

## 14. Limitaciones y observaciones

1. No se inspeccionó contenido ni se generó una copia de respaldo, conforme a la
   decisión explícita de no conservar los datos de prueba.
2. Durante la preparación, una consulta tentativa de tenants mediante una API v2
   respondió `INVALID_PROJECT_ID`. La operación autorizada y ejecutada se limitó
   a las seis cuentas confirmadas del proyecto predeterminado; no se modificó la
   configuración de Authentication.
3. La salida del operador del segundo bucket fue incompleta. El estado se
   resolvió antes de continuar mediante una verificación de solo lectura que
   confirmó 0 activos y 102 soft-deleted.
4. Los 111 objetos soft-deleted permanecen físicamente retenidos hasta sus
   respectivos `hardDeleteTime`, aunque ya no forman parte del inventario activo.
5. Las verificaciones remotas representan el momento de ejecución y no una
   garantía histórica absoluta frente a cambios posteriores.

Estas observaciones no representan un fallo parcial ni alteran el resultado del
incremento.

## 15. Criterios de salida de E0-09D

| Criterio | Resultado |
|---|---|
| Proyecto y número exactos | Cumplido |
| Orden A → B → C → D | Cumplido |
| Verificación obligatoria entre bloques | Cumplido |
| Firestore vacío con base, ruleset e índices conservados | Cumplido |
| Authentication sin cuentas y configuración conservada | Cumplido |
| Storage con 0 objetos activos y ambos buckets conservados | Cumplido |
| Retención soft delete documentada | Cumplido |
| Secret Manager sin los siete secretos ni sus versiones | Cumplido |
| Functions en 0 y `updateUserRole` ausente | Cumplido |
| Sin acceso o persistencia de información sensible | Cumplido |
| Sin cambios fuera del alcance autorizado | Cumplido |
| Operadores temporales retirados y no versionados | Cumplido |

## 16. Relación con el cierre de Etapa 0

Con la ejecución de E0-09D no se identifica un criterio sustantivo pendiente de
los criterios consolidados de salida de Etapa 0: entorno reproducible, brechas
técnicas prioritarias corregidas y versionadas, controles de seguridad
verificados, caracterización mínima, baseline de calidad, evidencia de pruebas y
ausencia de migraciones productivas innecesarias.

Permanece una actividad formal de cierre, no una reapertura de E0-09D: ejecutar
las compuertas locales consolidadas vigentes, ensamblar la matriz final de
criterios y evidencias, revalidar de solo lectura los invariantes remotos de
mantenimiento y documentar el handoff y la compuerta de entrada a Etapa 1. Esa
actividad no debe restaurar reglas ni iniciar Etapa 1.

## 17. Veredicto

**COMPLETADO CON OBSERVACIONES**.

La reinicialización autorizada terminó con Firestore, Authentication, Storage
activo y Secret Manager vacíos; conservó los recursos y configuraciones
indicados; mantuvo el ruleset deny-all; y no dejó operadores temporales ni
cambios locales. La observación remanente es la retención automática de 111
objetos soft-deleted hasta el 27 de agosto de 2026, que no constituye drift ni
un bloqueo del cierre.

## 18. Siguiente incremento recomendado

Se recomienda **E0-10 — Cierre consolidado de Etapa 0** para realizar únicamente
la verificación y consolidación documental final descrita en la sección 16. Este
informe no ejecuta dicho incremento, no restaura el ruleset normal y no inicia la
Etapa 1.
