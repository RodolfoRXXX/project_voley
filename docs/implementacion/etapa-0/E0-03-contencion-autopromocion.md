# E0-03 — Contención de autopromoción

**Proyecto:** SPORTEXA  
**Fecha:** 16 de agosto de 2026  
**Alcance:** contención focalizada de TECH-GAP-01; no implementa autorización contextual ni la política de lectura de E0-04.  
**Veredicto:** **COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado**

## 1. Precondiciones y estado inicial

| Control | Evidencia | Resultado |
| --- | --- | --- |
| Rama | `chore/etapa-0-estabilizacion` | Cumplido |
| Commit inicial | `df5c9ef107f62ebb3a602d7744bd3ad83f2485b3` | Registrado |
| Tracking | `origin/chore/etapa-0-estabilizacion` | Confirmado |
| Estado inicial | `git status` limpio | Cumplido |
| E0-02 versionado | El informe y la infraestructura pertenecen al commit inicial `df5c9ef` | Cumplido |
| Baseline E0-02 | `npm test`: 9/9 guardas/runner y 1/1 smoke Auth/Firestore | Cumplido |
| `.secret.local` | Ignorado por `volley-ranking-system/.gitignore`, no versionado y con copia local preservada | Cumplido |
| Proyecto de prueba | `demo-sportexa-e0-02` | Cumplido |

No existían cambios locales ajenos al comenzar. No se leyó ni cargó `.secret.local`, no se heredaron credenciales del proceso y no se utilizó `.firebaserc`.

## 2. Caminos de autopromoción encontrados

### 2.1 Callable pública

`functions/callables/updateUserRole.js` aceptaba cualquier usuario autenticado, tomaba `role` del payload y actualizaba `users/{uid}.roles` mediante Admin SDK. No comprobaba una autoridad superior ni restringía el valor a un rol no privilegiado.

La Function estaba exportada desde `functions/index.js`. Su consumidor conocido era `PreferredPositionsEditor`, que permitía alternar entre `player` y `admin` desde el perfil. El método subyacente también estaba exportado por `functions/src/services/userGameService.js`.

### 2.2 Onboarding

`completeOnboarding` aceptaba `roles` enviado por el cliente y lo persistía sin validar autoridad. La pantalla de onboarding ofrecía explícitamente `player` y `admin` y enviaba la selección.

Además existía `functions/src/services/onboardingService.js`, sin exportación o consumidor vigente, que conservaba otra implementación capaz de aceptar y escribir el rol aportado por el cliente. Aunque no formaba parte de la superficie desplegada actual, constituía una ruta alternativa insegura susceptible de reutilización accidental.

### 2.3 Escritura directa en Firestore

Las reglas impedían que un propietario modificara el campo existente `roles`, pero permitían crear su propio documento `users/{uid}` con cualquier contenido. Por ello un cliente podía intentar crear el documento con `roles: "admin"`. La protección tampoco contemplaba alias de privilegio como `role`, `isAdmin`, `customClaims`, `claims`, `permissions` o `privileges`.

No se encontraron escrituras directas desde el frontend vigente sobre `users`. Las escrituras backend encontradas actualizan datos de perfil, posiciones o proyecciones mediante Admin SDK; ninguna alternativa legítima requería que el cliente eligiera un rol global.

### 2.4 Custom claims y consumidores legados

No se encontró código que cree o modifique custom claims de Firebase Auth. Las pruebas verifican que los usuarios sintéticos permanecen sin claims.

El rol global legado todavía se consulta en:

- reglas Firestore (`isAppAdmin`);
- layouts, navegación, dashboard, perfiles y listados del frontend;
- `adminAccessService`, `httpApi`, `joinMatch`, administración de grupos y administración de torneos.

Estas lecturas no otorgan una vía de escritura, pero impiden retirar inmediatamente el campo sin abordar una migración mayor. Se conservaron como compatibilidad temporal y no se presentan como el modelo definitivo.

## 3. Causa

La autorización global se trataba como una preferencia de perfil controlada por el cliente. La callable confiaba en autenticación como si implicara autorización y usaba Admin SDK, eludiendo las reglas Firestore. Al mismo tiempo, onboarding copiaba un campo privilegiado del payload y las reglas protegían sólo una actualización parcial, no la creación ni posibles alias.

Ocultar los controles de interfaz no habría contenido la vulnerabilidad: las callables y las escrituras directas seguían siendo invocables con payloads manipulados.

## 4. Decisión aplicada

1. Se retiró `updateUserRole` de `functions/index.js` y se eliminaron su callable y método de servicio.
2. Se eliminó el servicio de onboarding alternativo, no consumido y capaz de reintroducir la misma escritura.
3. `completeOnboarding` acepta exclusivamente `posicionesPreferidas`, rechaza cualquier campo adicional, valida de una a tres posiciones únicas del catálogo y actualiza sólo posiciones y estado de onboarding.
4. `onUserCreate` conserva `roles: null`: crear la identidad no concede un rol deportivo ni administrativo. El cliente no lo elige ni lo modifica.
5. Las reglas rechazan al crear o modificar `roles`, `role`, `isAdmin`, `customClaims`, `claims`, `permissions` y `privileges` desde clientes. No se alteraron permisos de lectura ni otras políticas funcionales.
6. El frontend dejó de ofrecer roles durante onboarding y edición de perfil, y dejó de invocar la callable retirada.

No se creó un endpoint equivalente con otro nombre. El control efectivo reside en backend y reglas; la modificación visual es sólo adaptación del consumidor.

## 5. Compatibilidad temporal conservada

El campo `users.roles` se conserva únicamente porque varios flujos actuales todavía lo leen. Los nuevos usuarios reciben `null`; ningún flujo de cliente puede escoger `player` o `admin` ni cambiar el campo propio o ajeno. Los valores históricos permanecen legibles durante la transición.

También se conservan temporalmente `posicionesPreferidas` y otros datos deportivos dentro de `users`. Separar Usuario, Persona, Membresía o Rendimiento está fuera de E0-03 y no se realizó ninguna migración.

## 6. Infraestructura de pruebas extendida

El runner de E0-02 se extendió sólo para cargar Functions Emulator junto con Auth y Firestore:

- copia Functions a un workspace temporal;
- excluye explícitamente `test`, `node_modules`, logs y `.secret.local`;
- enlaza únicamente las dependencias ya instaladas;
- usa hosts loopback y `demo-sportexa-e0-02`;
- bloquea egress mediante proxies loopback cerrados;
- genera en memoria un par VAPID sintético y efímero con `web-push` para permitir cargar las Functions sin leer secretos locales;
- valida el formato y el marcador de origen sintético antes de iniciar Firebase;
- elimina los workspaces temporales al finalizar.

El primer intento integrado falló de forma cerrada porque los marcadores VAPID anteriores no tenían un formato aceptado por `web-push`; Functions no llegó a cargar ni se ejecutaron casos funcionales. Se corrigió únicamente el fixture de infraestructura mediante claves efímeras sintéticas y se repitió la suite completa.

## 7. Pruebas positivas y negativas

| Caso | Capa verificada | Resultado |
| --- | --- | --- |
| Onboarding sin autenticación | Callable real | Rechazado como `UNAUTHENTICATED` |
| Invocación anónima de `updateUserRole` | Superficie Functions | HTTP 404; no exportada |
| Autopromoción autenticada | Superficie Functions | HTTP 404; no exportada |
| Intento de promover a otro usuario | Superficie Functions | HTTP 404; no exportada |
| Payload de onboarding con `roles` y `userId` | Validación backend | Rechazado como `INVALID_ARGUMENT`; ambos usuarios permanecen sin rol global |
| Onboarding válido | Callable y persistencia | Aprueba; guarda posiciones y `onboarded`, conserva el rol global en `null` |
| Cambio directo de `roles` propio | Reglas Firestore | Rechazado |
| Cambio directo de `roles` ajeno | Reglas Firestore | Rechazado |
| Alias de campos privilegiados | Reglas Firestore | Rechazados |
| Creación directa propia con `roles: admin` | Reglas Firestore | Rechazada |
| Actualización de identidad propia sin privilegios | Reglas Firestore | Permitida; rol permanece `null` |
| Custom claims | Auth Emulator | Ambos usuarios permanecen sin claims |

Los usuarios, correos, contraseñas, IDs y datos utilizados son sintéticos. La limpieza se realiza en `finally` y los emuladores parten de un estado nuevo en cada ejecución.

## 8. Resultados de verificación

| Verificación | Resultado E0-03 | Comparación con E0-01/E0-02 |
| --- | --- | --- |
| `npm test` en Functions | **APRUEBA** | Guardas/runner 9/9; emuladores 9/9 |
| Suite E0-02 | **APRUEBA** | Smoke Auth/Firestore preservado |
| Casos E0-03 | **APRUEBAN 7/7** | Nueva cobertura sobre Functions y reglas |
| Carga de Functions | **APRUEBA** | `updateUserRole` ausente de las definiciones cargadas |
| Typecheck frontend | **APRUEBA**, exit 0 | Sin regresión |
| Build frontend | **APRUEBA**, exit 0 | Sin regresión; 18 páginas generadas |
| Sintaxis Functions | **APRUEBA 90/90** | Sin regresión; el conteo cambia por retirar dos archivos y agregar una prueba |
| Lint frontend | **FALLA**: 41 errores y 13 warnings | Exactamente el baseline conocido; sin regresión nueva |
| `git diff --check` | **APRUEBA** | Sin errores de whitespace |

La ejecución de emuladores requirió autorización local para abrir puertos loopback. Firebase CLI confirmó el uso de un project ID demo y que los servicios no emulados fallarían. El intento de consultar MOTD/configuración remota fue bloqueado, sin acceso a un proyecto Firebase.

## 9. Archivos modificados

### Producción y reglas

- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/callables/completeOnboarding.js`
- `volley-ranking-system/functions/callables/updateUserRole.js` (retirado)
- `volley-ranking-system/functions/src/services/userGameService.js`
- `volley-ranking-system/functions/src/services/onboardingService.js` (retirado)
- `volley-ranking-system/functions/src/triggers/onUserCreate.js`
- `volley-ranking-system/firestore.rules`

### Frontend

- `volley-ranking-frontend/src/components/onboarding/onboardingForm.tsx`
- `volley-ranking-frontend/src/components/profile/PreferredPositionsEditor.tsx`
- `volley-ranking-frontend/src/components/profile/EditionProfile.tsx`
- `volley-ranking-frontend/src/app/(protected)/profile/info/page.tsx`

### Pruebas

- `volley-ranking-system/firebase.test.json`
- `volley-ranking-system/functions/test/guards/firebaseTestGuard.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`
- `volley-ranking-system/functions/test/unit/isolationGuard.test.js`
- `volley-ranking-system/functions/test/emulator/autopromotionSecurity.test.js` (nuevo)
- este informe (nuevo)

No se modificaron dependencias, lockfiles, índices, datos reales ni configuración remota.

## 10. Deuda diferida

- Sustituir las lecturas del rol global por autorización contextual dentro de los incrementos aprobados correspondientes.
- Separar identidad de datos deportivos al migrar Usuario/Persona/Rendimiento; no hacerlo dentro de esta contención.
- Determinar un mecanismo administrativo autorizado para altas excepcionales si surge un caso de uso aprobado. E0-03 no incorpora ninguno.
- Resolver TECH-GAP-02 mediante E0-04: `users` continúa con lectura pública porque cambiar visibilidad estaba expresamente fuera de alcance.
- Revisar la clave VAPID comprometida en el historial y completar cualquier rotación remota antes de un despliegue futuro, según E0-02.
- Versionar el diff después de revisión; no se hizo commit ni push por límite explícito.

## 11. Criterios de cierre

| Criterio | Evidencia | Estado |
| --- | --- | --- |
| Nadie elige o modifica su rol administrativo | Callable retirada, onboarding restringido y reglas probadas | Cumplido |
| Nadie modifica el rol de otro usuario | Sin endpoint global y reglas exigen propietario sin campos privilegiados | Cumplido |
| Payload manipulado no eleva privilegios | Prueba callable negativa y verificación posterior de ambos documentos | Cumplido |
| Onboarding válido continúa | Prueba positiva con posiciones válidas | Cumplido |
| Seguridad independiente del frontend | Pruebas directas de callable y Firestore REST contra emuladores | Cumplido |
| No hay endpoint global equivalente | Inventario de exports y definiciones cargadas | Cumplido |
| Datos sintéticos, demo y sin secretos | Guarda E0-02, workspace aislado y VAPID efímero | Cumplido |
| No se implementó E0-04 ni modelo contextual | Lecturas y política general sin cambios | Cumplido |
| Sin regresiones respecto del baseline | Tests, typecheck, build y sintaxis aprueban; lint idéntico | Cumplido |
| Cambios versionados | Prohibido hacer commit/push durante esta intervención | Pendiente de revisión autorizada |

## 12. Veredicto y siguiente incremento

**COMPLETADO CON OBSERVACIONES — pendiente de revisión y versionado.**

La evidencia técnica permite considerar contenida la autopromoción en el repositorio local: desapareció la superficie pública, onboarding rechaza autoridad aportada por clientes, las reglas cierran creación y actualización privilegiadas, y las pruebas integradas demuestran los casos positivos y negativos sobre emuladores aislados.

El cierre formal del incremento requiere revisar y versionar este diff en la rama de Etapa 0. El siguiente incremento recomendado, sin ejecutarlo, es **E0-04 — Política mínima de lectura**, para contener TECH-GAP-02 mediante reglas y pruebas específicas de visibilidad.
