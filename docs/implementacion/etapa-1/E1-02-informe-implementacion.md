# E1-02 — Informe de implementación

## 1. Rama, checkpoint y estado Git

- Rama inicial y final: `feat/e1-02-persona-vinculacion-inicial`.
- HEAD inicial y final: `149645792a9e8d99acfdf60a6a82c32110153365`.
- Upstream inicial: `origin/feat/e1-02-persona-vinculacion-inicial`, alineado `0/0`.
- Estado inicial observado en esta consolidación: cambios locales de E1-02 presentes y el informe aún no rastreado; la rama y HEAD coinciden con el checkpoint esperado.
- Estado final: cambios locales E1-02 sin commit; la rama y HEAD no cambiaron.
- Baseline previo: `quality:stage0` aprobado con lint sin regresiones, tipos, sintaxis 108/108, unitarias 47/47, emuladores 32/32, build 18/18 y diff-check.
- Proyecto autorizado: `demo-sportexa-e0-02`, con Auth, Firestore y Functions exclusivamente en hosts loopback.

No se realizó commit, push, deploy, acceso a datos Firebase remotos ni modificación de dependencias, lockfiles o índices.

## 2. Resultado y arquitectura

E1-02 incorpora el alta explícita de la Persona propia y su vínculo inicial con el Usuario autenticado. La identidad técnica se deriva sólo de `context.auth.uid`; el cliente no elige Usuario, Persona, rol ni contexto.

La separación efectiva es:

- Usuario conserva la cuenta y es dueño de `linkPerson(personaId)`.
- Persona valida y conserva `nombre`, `apellido` y `emailContacto`.
- `selfPersonBootstrapService` coordina ambos Agregados sin acceder a Firestore.
- `firestoreUserPersonLinkRepository` y `firestorePersonRepository` encapsulan la persistencia de cada raíz.
- `firestoreSelfPersonBootstrapUnitOfWork` limita la transacción a alta y vínculo inicial; no expone callbacks ni operaciones genéricas.
- `firestoreSelfPersonReader` coordina la consulta propia mediante ambos repositorios.

No se creó un Agregado coordinador, Saga, outbox, evento, proyección, referencia inversa ni repositorio compartido.

## 3. Contratos finales

### `ensureMyPerson`

- Callable v1 autenticada.
- Payload cerrado: `firstName`, `lastName`, `contactEmail`, todos string.
- Aplica `trim`, límites de 80/80/254 caracteres Unicode y validación sintáctica de email.
- Conserva casing; no exige unicidad del email.
- Devuelve `{ outcome: "created" | "existing", person: MyPerson }`.
- Un vínculo válido devuelve los datos persistidos y no edita Persona.

### `getMyPerson`

- Callable v1 autenticada con payload vacío.
- Devuelve `{ person: null }` sin vínculo y `{ person: MyPerson }` con vínculo válido.
- Persona inexistente, vínculo inválido o esquema Persona inválido fallan cerrado.

DTO público:

```typescript
type MyPerson = {
  personId: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
};
```

Catálogo estable: `unauthenticated/AUTHENTICATION_REQUIRED`, `invalid-argument/INVALID_PERSON_DATA`, `failed-precondition/ACCOUNT_NOT_INITIALIZED`, `failed-precondition/PERSON_LINK_INCONSISTENT`, `aborted/CONCURRENT_MODIFICATION`, `unavailable/PERSON_SERVICE_UNAVAILABLE` e `internal/PERSON_PERSISTENCE_FAILED`. Los callables sólo exponen `details.reason`, nunca documentos, timestamps, stacks o tipos Firebase.

## 4. Persistencia, autorización y reglas

Persona se confirma exactamente como:

```javascript
personas/{personaId} = {
  nombre,
  apellido,
  emailContacto,
  createdAt
}
```

Usuario sólo incorpora:

```javascript
users/{firebaseUid}.personaId
```

El ID es un auto-ID opaco reservado por backend. No se agregan `updatedAt`, UID dentro de Persona, copia de datos personales en Usuario ni campos auxiliares.

`firestore.rules` deniega toda lectura y escritura cliente de `personas`; la prohibición existente de create/update/delete cliente sobre `users` también protege `personaId`. Las pruebas cubren visitante, actor autenticado y actor con rol global `admin`; el rol no concede privilegio adicional. Plan, Suscripción, Grupo y Membresía no intervienen.

## 5. Atomicidad, concurrencia y recuperación

La unidad transaccional lee primero Usuario y, si hay vínculo, Persona. Si no hay vínculo, confirma `create` de Persona y `update` acotado de `Usuario.personaId` en la misma transacción.

Se verificó:

- dos llamadas simultáneas con payload igual y diferente;
- una respuesta `created`, otra `existing`, ambas con el mismo `personId`;
- una sola Persona y un solo vínculo, sin documento perdedor huérfano;
- reintento posterior/respuesta perdida mediante lectura del vínculo confirmado;
- payload posterior distinto sin edición silenciosa;
- Usuario ya vinculado;
- cuenta ausente y fallo antes de escribir;
- Persona referenciada inexistente o con esquema ampliado;
- conflicto agotado, indisponibilidad y error interno mapeados establemente.

## 6. Frontend y feedback

- Nueva ruta protegida `/profile/person`.
- `PersonProvider` separado de `AuthProvider`; sólo consulta tras cuenta `ready` y nunca elimina cuenta ni cierra sesión ante un error de Persona.
- Estados explícitos: inicial, cargando, vacío/formulario, validación, enviando, creado, existente, error recuperable, vínculo inconsistente y sesión inválida.
- Formulario vacío con nombre, apellido y email de contacto; no copia `users.nombre` ni `users.email`.
- Single-flight mediante promesa compartida y botón deshabilitado; éxito sólo después de respuesta backend.
- Los valores controlados permanecen ante errores recuperables.
- Mensajes con `role="alert"` y confirmación con `role="status"`.
- Persona existente se presenta sólo lectura; no hay edición ni onboarding deportivo.
- Dashboard reemplaza la tarjeta estática por estado/invitación real; Navbar y Sidebar agregan “Ficha personal”.
- El flujo no importa writers de Firestore.

## 7. Compatibilidad y retiro

Se retiró únicamente la tarjeta estática “Ficha deportiva / No disponible” y la ausencia de acceso a Persona propia. Se conservaron `legacyUserService`, `userDoc`, roles y consumidores deportivos legados, posiciones, compromiso, `onboarded`, `/onboarding`, `/profile/info` y lectores de Grupo, Partido, Torneo y ranking. Ningún gate deportivo fue reemplazado por `personaId`.

CU-006 permanece parcial y CU-007 excluido. No se implementaron búsqueda, reclamo, fusión, invitación, Solicitud, email, desvinculación ni edición.

## 8. Pruebas añadidas

- Dominio: trim/casing, límites, email inválido/no único, esquema exacto y `Usuario.linkPerson` sin reemplazo.
- Aplicación: alta, nullable, existente, payload posterior distinto, cuenta ausente y errores de persistencia.
- Contrato: payload cerrado, UID desde contexto, códigos y `details.reason`.
- Unidad transaccional: todo-o-nada previo al commit y mapeo de conflicto/indisponibilidad/internal.
- Arquitectura: repositorios separados, UoW específico, frontend sin writer, ruta/navegación/dashboard y reglas.
- Emulador: 10 escenarios funcionales de E1-02, agrupados por autenticación, atomicidad, esquema, casing, reintento, concurrencia igual/diferente, no unicidad, reglas y corrupción. Esta agrupación funcional no representa una correspondencia uno a uno con casos automatizados individuales.
- Regresión: suites E0, E1-01, reglas mínimas, mantenimiento y build.

La baseline de emulador previa era `32/32`. El runner incorporó 11 pruebas automatizadas adicionales para E1-02 y regresión, por lo que el resultado final observado de Emulator Suite fue `43/43`. Los 10 escenarios anteriores son grupos de comportamiento; no se presenta una equivalencia individual entre esos grupos y las 11 pruebas añadidas.

## 9. Comandos y resultados

| Comando | Resultado |
|---|---|
| baseline inicial `npm run quality:stage0` | Aprobado: 47/47 unitarias, 32/32 emuladores, 18/18 páginas |
| `npm run quality:lint` | Aprobado: 39 errores y 10 warnings históricos, 0 regresiones, 5 resueltos |
| `npm run quality:typecheck` | Aprobado |
| `npm run quality:functions:syntax` | Aprobado: 126/126 |
| prueba específica del callable `node --test test/unit/selfPersonCallable.test.js` | Aprobado: 4/4 |
| Emulator Suite mediante runner local | Aprobado: 43/43; proyecto `demo-sportexa-e0-02`, Auth/Firestore/Functions locales |
| `npm --prefix volley-ranking-system/functions run test:maintenance` | Aprobado: 7/7 |
| `npm run quality:build` | Aprobado: 19/19 páginas, incluida `/profile/person`, confirmado en la ejecución final de `quality:stage0` |
| `npm run quality:stage0` final | Aprobado completo |
| `git diff --check` | Aprobado; sólo avisos informativos LF/CRLF de Git |

Durante una pasada intermedia, el runner histórico tuvo un `ENOTEMPTY` transitorio al limpiar un enlace temporal de `node_modules`; la reejecución aislada y el gate final aprobaron 67/67. El primer gate final también detectó un nuevo `set-state-in-effect`; se corrigió y lint quedó sin regresiones.

Advertencias no bloqueantes: `caniuse-lite` desactualizado, SDK `firebase-functions` 4.9.0 sin capacidades recientes de Extensions —no usadas— y perfil PowerShell que referencia `fnm` no instalado. No se cambiaron dependencias para silenciarlas.

## 10. UAT manual

| Identificador | Resultado | Evidencia observada | Incidencia encontrada |
|---|---|---|---|
| UAT-01 | APROBADO | Sesión y dashboard disponibles sin Persona vinculada; formulario accesible en `/profile/person`. | El dashboard emitió errores `permission-denied` en listeners de `matches`; incidencia externa a E1-02. |
| UAT-02 | APROBADO | Alta completada y mensaje “Tu ficha fue creada correctamente.” observado. | Ninguna en E1-02. |
| UAT-03 | APROBADO | Recarga con la misma Persona, sin duplicación. | Ninguna. |
| UAT-04 | APROBADO | Persona con `nombre`, `apellido`, `emailContacto` y `createdAt`; presentación de sólo lectura. | Ninguna. |
| UAT-05 | APROBADO | Sin controles de edición ni escrituras directas desde la interfaz. | Ninguna. |
| UAT-06 | APROBADO | Vínculo persistente después de cerrar y abrir sesión. | Ninguna. |
| UAT-07 | APROBADO | Reejecución idempotente: misma Persona y mismo `personaId`. | Ninguna. |

Veredicto: `UAT E1-02 APROBADA`

## 11. Archivos

### Creados

- `volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx`
- `volley-ranking-frontend/src/components/person/PersonBootstrapForm.tsx`
- `volley-ranking-frontend/src/components/providers/PersonProvider.tsx`
- `volley-ranking-frontend/src/hooks/usePerson.ts`
- `volley-ranking-frontend/src/services/personService.ts`
- `volley-ranking-frontend/src/types/MyPerson.ts`
- `volley-ranking-system/functions/callables/ensureMyPerson.js`
- `volley-ranking-system/functions/callables/getMyPerson.js`
- `volley-ranking-system/functions/src/application/selfPersonBootstrapErrors.js`
- `volley-ranking-system/functions/src/application/selfPersonBootstrapService.js`
- `volley-ranking-system/functions/src/infrastructure/firestorePersonSupport.js`
- `volley-ranking-system/functions/src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork.js`
- `volley-ranking-system/functions/src/infrastructure/firestoreSelfPersonReader.js`
- `volley-ranking-system/functions/src/infrastructure/selfPersonBootstrapCallable.js`
- `volley-ranking-system/functions/src/persons/domain/person.js`
- `volley-ranking-system/functions/src/persons/application/personDto.js`
- `volley-ranking-system/functions/src/persons/infrastructure/firestorePersonRepository.js`
- `volley-ranking-system/functions/src/users/infrastructure/firestoreUserPersonLinkRepository.js`
- `volley-ranking-system/functions/test/emulator/personE1.test.js`
- `volley-ranking-system/functions/test/unit/personArchitecture.test.js`
- `volley-ranking-system/functions/test/unit/personDomain.test.js`
- `volley-ranking-system/functions/test/unit/selfPersonBootstrapService.test.js`
- `volley-ranking-system/functions/test/unit/selfPersonCallable.test.js`
- `volley-ranking-system/functions/test/unit/selfPersonUnitOfWork.test.js`
- este informe.

### Modificados

- `volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx`
- `volley-ranking-frontend/src/app/layout.tsx`
- `volley-ranking-frontend/src/components/layout/AppSidebar.tsx`
- `volley-ranking-frontend/src/components/layout/Navbar.tsx`
- `volley-ranking-system/firestore.rules`
- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/src/users/domain/user.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`
- `volley-ranking-system/functions/test/unit/accountArchitecture.test.js`

No se retiraron archivos legados.

## 12. Deuda, riesgos y decisiones de revisión

- Continúan los lectores deportivos legados de `users.nombre`, `users.email`, posiciones, compromiso, roles y `onboarded`; se retiran por flujo en incrementos propietarios posteriores.
- `MatchCard` conserva su redirect legado a `/onboarding`; no se reinterpretó como gate de Persona.
- No existe suite automatizada de navegador; responsive, foco, mensajes visuales y recuperación interactiva requieren UAT.
- El dashboard emitió errores `permission-denied` en listeners de `matches`. La incidencia no afectó el alta, consulta, vínculo ni persistencia de Persona; no se corrigió por estar fuera del alcance autorizado. Requiere caracterización posterior como deuda o comportamiento legado. No debe asumirse automáticamente que es inocua: deberá determinarse si el listener debe retirarse, condicionarse o adaptarse a la política de lectura vigente.
- El baseline lint histórico, `caniuse-lite`, el aviso de Extensions y el perfil local de `fnm` permanecen sin cambios.
- No se identifican discrepancias funcionales o físicas respecto de la ficha ni decisiones abiertas bloqueantes.

## 13. Rollback

Como no hay commit, deploy ni datos remotos, el rollback consiste en descartar exclusivamente los archivos y hunks E1-02 listados, reiniciar Auth/Firestore/Functions Emulator para eliminar datos sintéticos y reejecutar `quality:stage0` desde el HEAD inicial. No se debe restaurar la tarjeta como autoridad, habilitar writers cliente ni tocar datos remotos.

## 14. Ausencia de acceso remoto

Todas las pruebas persistentes usaron `demo-sportexa-e0-02`, Auth `127.0.0.1:19099`, Firestore `127.0.0.1:18080` y Functions `127.0.0.1:15001`, con datos sintéticos descartables. Las guardas fallan cerrado ante project IDs remotos, hosts no loopback o credenciales de aplicación.

Firebase CLI intentó obtener su MOTD/configuración informativa; el proxy bloqueado impidió esa consulta y la CLI la reportó como no fatal. No se consultaron ni modificaron datos o APIs de un proyecto Firebase remoto. No hubo deploy, restore, migración, commit, push ni comando Git remoto.

## 15. Veredicto

`E1-02 IMPLEMENTADO, VERIFICADO Y APROBADO EN UAT — LISTO PARA VERSIONAR`

El incremento no se declara formalmente cerrado; la rama no está integrada, no existe commit definitivo y no hubo despliegue remoto.

## 15A. Corrección E1-02-MED-01

Se sustituyó el log que adjuntaba el objeto de error por el mensaje constante `Person callable failed`. El mapeo público a `HttpsError` y `details.reason` no cambió.

La prueba unitaria del callable verifica un error de infraestructura con `message`, `stack`, `code` y `details`, intercepta `console.error`, confirma que recibe únicamente el mensaje constante y que la respuesta es `internal/PERSON_PERSISTENCE_FAILED`. El mock se restaura en `finally`.

Resultados ejecutados en esta corrección:

- `node --test test/unit/selfPersonCallable.test.js`: 4/4 aprobadas.
- `npm run quality:stage0`: completado; 43/43 pruebas de Emulator Suite, build 19/19 y `git diff --check` sin errores.
- `npm run test:maintenance`: 7/7 aprobadas.

Las pruebas persistentes usaron Emulator Suite con proyecto `demo-sportexa-e0-02`, servicios `auth,firestore,functions`, hosts loopback y datos sintéticos. No se accedió a Firebase remoto, no se desplegó y no se modificaron dependencias.

`E1-02-MED-01 CORREGIDO`

`E1-02 IMPLEMENTADO, VERIFICADO Y APROBADO EN UAT — LISTO PARA VERSIONAR`
