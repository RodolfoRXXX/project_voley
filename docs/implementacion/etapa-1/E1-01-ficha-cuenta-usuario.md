# Ficha de Incremento Implementable E1-01 - Cuenta de Usuario autenticada y acceso propio

## Estado de la ficha

- **Estado:** Listo para implementar
- **Responsable:** Rodolfo / Codex, sujeto a aprobación de la ficha
- **Fecha:** 2026-08-21
- **Rama o checkpoint de partida:** `feat/e1-01-cuenta-usuario` en `a2eeda5b43fadf4ff868d878be5c3253d866e58f`, posterior a la integración y verificación de Etapa 0
- **Rama prevista:** `feat/e1-01-cuenta-usuario`
- **Etapa del roadmap:** Etapa 1 - Usuario, Persona y autorización contextual
- **Ambiente autorizado:** Firebase Emulator Suite y datos sintéticos
- **Ambiente remoto:** Fuera de alcance; debe permanecer bajo ruleset `deny-all`

## Decisiones rectoras del incremento

1. E1-01 implementa exclusivamente la cuenta digital `Usuario`; no implementa `Persona`.
2. Firebase Authentication acredita la identidad técnica, pero no sustituye al Agregado Usuario.
3. Después de autenticarse, el cliente solicita un bootstrap idempotente de su propia cuenta.
4. El bootstrap crea el Usuario si no existe o devuelve el existente si ya fue creado.
5. El actor se obtiene exclusivamente del token verificado. El cliente no envía un `userId` objetivo.
6. El frontend migrado no lee ni escribe directamente la persistencia de Usuario.
7. El onboarding deja de asignar rol global, posición o autoridad deportiva.
8. E1-01 no incorpora `personaId`, roles, posiciones, Membresías, datos deportivos, Plan ni Suscripción.
9. La autorización inicial es `self-account`: un Usuario sólo opera sobre su propia cuenta.
10. No se despliegan Functions, reglas, índices ni recursos en el proyecto Firebase remoto.

---

## 1. Identificación

- **ID del incremento:** E1-01
- **Nombre:** Cuenta de Usuario autenticada y acceso propio
- **Casos de uso incluidos:**
  - CU-001 - Registrarse en la plataforma, limitado al alta mediante el proveedor de Authentication ya habilitado y a la materialización de Usuario.
  - CU-002 - Iniciar sesión.
  - CU-003 - Cerrar sesión.
  - Consulta técnica de soporte: obtener la cuenta propia después de autenticar, sin introducir un nuevo caso de uso de dominio.
- **Casos de uso expresamente excluidos:**
  - CU-004 - Editar cuenta de Usuario.
  - CU-005 - Configurar preferencias.
  - CU-006 - Vincular Usuario con Persona.
  - CU-007 - Desvincular Usuario de Persona.
  - Búsqueda, alta, edición, fusión o consulta de Persona.
  - Grupo, Membresía, Solicitud, Temporada, roles y permisos contextuales deportivos.
  - Plan, Suscripción y cualquier habilitación comercial.
  - Migración, backfill o compatibilidad con datos remotos.
  - Restauración de reglas remotas y despliegue productivo.
- **Documentos y secciones normativas relacionadas:**
  - Documento 1, definición de Usuario y separación respecto de Persona y Comercial.
  - Documento 1.5, §§2.3 y 2.4, distinción Usuario-Persona-Membresía y vinculación opcional.
  - Documento 2, PF-01, CU-001, CU-002, CU-003 y RF-05.
  - Documento 3, Módulo Usuarios y Agregado Usuario.
  - Documento 4, §§11.1 a 11.5, identidad, autenticación y autorización funcional.
  - Documento 5, §§3.8 a 3.15, 4.1, 4.13, 4.14, 5.16, 5.17 y 7.3.
  - E0-10, §§10 y 11, condiciones de operación y handoff a Etapa 1.
- **Brechas técnicas atendidas:**
  - TECH-GAP-03, únicamente respecto de separar la cuenta Usuario de rol, posiciones y rendimiento en el flujo intervenido.
  - TECH-GAP-08, encapsulación del acceso a Firestore para la cuenta propia.
  - TECH-GAP-09, retiro de escrituras directas y autoridad duplicada en el onboarding afectado.
  - Continuidad de TECH-GAP-01: el onboarding no puede reintroducir autopromoción.

### Brechas no declaradas como cerradas

- TECH-GAP-03 no se cierra por completo hasta separar Persona y retirar todos los consumidores deportivos del documento legado.
- TECH-GAP-07 permanece para la etapa de fuentes derivadas y Rendimiento.
- TECH-GAP-08 y TECH-GAP-09 sólo se reducen en los accesos modificados por E1-01.

---

## 2. Objetivo funcional

Permitir que una persona se autentique mediante el proveedor técnico habilitado, disponga de una cuenta Usuario mínima y acceda a una navegación protegida sin recibir autoridad deportiva, administrativa global ni habilitación comercial.

El incremento resuelve el primer corte de la mezcla legada entre identidad digital, identidad deportiva y autorización global. Al completarlo, el alta y el inicio de sesión producirán o recuperarán exclusivamente una cuenta digital. El actor podrá consultar únicamente esa cuenta mediante un contrato de Aplicación.

CU-001, CU-002 y la consulta de cuenta propia se agrupan porque forman una única capacidad observable: **obtener una sesión autenticada y una cuenta Usuario utilizable de manera idempotente**. CU-003 completa el ciclo técnico de la sesión sin modificar el Agregado.

### Valor para el actor

- ingreso reproducible a SPORTEXA;
- cuenta inicializada aunque una ejecución previa haya sido interrumpida;
- ausencia de pasos falsos de rol o posición global;
- feedback distinguible ante autenticación, inicialización o recuperación fallida.

---

## 3. Actores

| Actor | Participación | Contexto | Resultado esperado |
|---|---|---|---|
| Visitante | Inicia registro o sesión | Sin identidad autenticada | Completar el flujo del proveedor o recibir un error de autenticación |
| Usuario autenticado | Actor principal del bootstrap y consulta | Cuenta propia | Obtener un Usuario mínimo y entrar en navegación protegida |
| Sistema | Verifica identidad, coordina el bootstrap y persiste Usuario | `trusted-system` y `self-account` | Crear una sola cuenta o devolver la existente |
| Firebase Authentication | Servicio técnico externo al dominio | Infraestructura de identidad | Emitir una identidad verificable y cerrar la sesión cuando corresponda |
| Administrador de Grupo | No participa | Fuera de alcance | Ninguno |
| Persona | No participa | Fuera de alcance | Ninguno |

---

## 4. Precondiciones

### Precondiciones funcionales

- CU-001/CU-002: el visitante puede iniciar el proveedor de Authentication habilitado.
- Bootstrap: existe un token válido y verificable del actor.
- Consulta de cuenta propia: el actor está autenticado.
- CU-003: existe una sesión local o el cierre es idempotente aunque ya no exista.
- No se requiere Persona, Grupo, Membresía, rol, permiso deportivo, Plan ni Suscripción.

### Precondiciones técnicas

- Etapa 0 cerrada con el veredicto `ETAPA 0 CERRADA - ETAPA 1 HABILITADA`.
- `chore/etapa-0-estabilizacion` integrada en `dev` y verificaciones posteriores al merge aprobadas.
- Rama E1-01 creada desde ese `dev`.
- Estado Git inicial registrado.
- Versiones de Node.js, npm, frontend, Functions y Firebase CLI registradas.
- Diferencia Node 20.14/20.20 resuelta mediante alineación o compatibilidad formal del runner.
- Emuladores de Authentication, Firestore y Functions operables.
- Suite de Etapa 0 aprobada antes de modificar el flujo.
- Proyecto remoto identificado y preservado bajo `deny-all`.

### Gate técnico completado

- **Rama y HEAD verificados:** `feat/e1-01-cuenta-usuario` en `a2eeda5b43fadf4ff868d878be5c3253d866e58f`.
- **Estado Git inicial:** limpio.
- **Runtime efectivo:** Windows `AMD64`, Node.js `20.20.0` mediante `fnm`, npm `10.8.2` y Firebase CLI `15.18.0`.
- **Decisiones físicas cerradas:** `users/{firebaseUid}`, Firebase UID como identidad interna, callables v1 `ensureMyAccount` y `getMyAccount`, `DocumentReference.create()` con recuperación de `ALREADY_EXISTS`, bootstrap explícito como único creador, backend como único escritor, lecturas legadas temporales y retiro de `onUserCreate` durante la implementación.
- **Onboarding objetivo:** bootstrap sin rol, posiciones ni `onboarded` como estado de cuenta, seguido por navegación a `/dashboard`.
- **Ambiente:** únicamente proyecto `demo-sportexa-e0-02`, Auth/Firestore/Functions Emulator, hosts loopback, secretos sintéticos y egress bloqueado. No hubo consulta, escritura ni despliegue remoto.

#### Correcciones portables del runner

| Fallo | Causa raíz | Corrección de tooling |
|---|---|---|
| Unitarios en Windows | El shell no expandía `test/unit/*.test.js` y Node recibía el glob literal | Runner Node enumera `*.test.js`, ordena, falla si no encuentra archivos y ejecuta Node Test Runner con argumentos explícitos |
| Workspace de emuladores | La copia recursiva materializaba `node_modules` antes de crear el enlace | Copia explícita del código excluyendo `node_modules`, `test`, secretos y logs; luego junction/symlink validado hacia las dependencias instaladas |
| Mantenimiento en Windows | `spawnSync firebase.cmd` sin shell devolvía `EINVAL` | Resolución explícita del entrypoint efectivo de Firebase CLI y ejecución con `process.execPath`, argumentos separados y `shell: false` |

El runner de Functions usa un margen de descubrimiento de 30 segundos para el handshake local de Firebase CLI en Windows. La carga medida del stack fue de 54 endpoints en aproximadamente 317 ms; no se detectó una regresión funcional. La limpieza conserva `finally` y reintenta de forma acotada los bloqueos `EBUSY`/`ENOTEMPTY`/`EPERM` que Windows libera después del apagado de los emuladores.

#### Evidencia canónica del 2026-08-21

| Comando | Directorio | Resultado | Evidencia | Duración aproximada |
|---|---|---|---|---:|
| `npm run quality:lint` | raíz | Aprobado | baseline histórico: 41 errores y 13 warnings; 0 regresiones | 13.7 s |
| `npm run quality:typecheck` | raíz | Aprobado | TypeScript sin errores | 9.5 s |
| `npm run quality:functions:syntax` | raíz | Aprobado | 97/97 archivos JavaScript | 4.3 s |
| `npm run quality:build` | raíz | Aprobado | Next.js compiló y generó 18/18 páginas | 22.0 s |
| `npm run quality:test` | raíz | Aprobado | 18/18 unitarios y 26/26 de emuladores | ~78 s |
| `npm run test:infra:emulators` | `volley-ranking-system/functions` | Aprobado | 26/26; Auth `19099`, Firestore `18080`, Functions `15001`, websocket `18150` | ~75 s; TAP 33.7 s |
| `npm run test:maintenance` | `volley-ranking-system/functions` | Aprobado | 7/7; Auth `29099`, Firestore `28080`, websocket `28150` | 13.7 s; TAP 1.7 s |
| `npm run quality:stage0` | raíz | Aprobado | lint, typecheck, sintaxis 97/97, tests 44/44, build y diff | ~110 s |
| `git diff --check` | raíz | Aprobado | sin errores de whitespace; sólo avisos informativos LF/CRLF | 2.7 s |

Se ejecutaron 51 pruebas únicas del gate: 18 unitarias/de guardas y tooling, 26 de regresión con Auth/Firestore/Functions Emulator y 7 de reglas de mantenimiento. Las suites obligatorias también se repitieron dentro de los comandos agregados sin omisiones.

#### Archivos de tooling del gate

- `volley-ranking-system/functions/package.json`;
- `volley-ranking-system/functions/test/run-unit-tests.js`;
- `volley-ranking-system/functions/test/helpers/runnerTools.js`;
- `volley-ranking-system/functions/test/run-emulator-tests.js`;
- `volley-ranking-system/functions/test/run-maintenance-tests.js`;
- `volley-ranking-system/functions/test/unit/runnerTools.test.js`.

No se modificaron código funcional, frontend, reglas de producto, dependencias, lockfiles ni configuración de Firebase. Los tests agregados cubren enumeración determinista y fallo cerrado, exclusiones de copia, creación segura del enlace, limpieza, resolución/fallo del entrypoint y propagación de errores/exit codes.

---

## 5. Flujo principal

### 5.1 Registro o primer acceso y bootstrap

1. El visitante selecciona la acción de ingresar mediante el proveedor habilitado.
2. Firebase Authentication ejecuta el flujo técnico de autenticación.
3. El frontend recibe una sesión autenticada o un error del proveedor.
4. El frontend invoca `ensureMyAccount` sin enviar `userId`, rol, posición, Persona ni datos deportivos.
5. El adaptador de identidad verifica el token y obtiene el sujeto autenticado.
6. El Servicio de Aplicación construye la información confiable mínima de identidad desde el contexto autenticado.
7. Aplica autorización `self-account`: el único recurso posible es la cuenta del actor.
8. Consulta el Repositorio de Usuario mediante el identificador interno derivado del sujeto autenticado.
9. Si Usuario no existe, solicita al Aggregate Root su creación con los datos mínimos aprobados.
10. Persiste el nuevo Usuario mediante el Repositorio de Usuario.
11. Si ya existe, no lo recrea ni sobrescribe campos con datos controlados por el cliente.
12. Devuelve el DTO mínimo de cuenta propia.
13. El frontend finaliza el estado de carga y habilita la navegación protegida neutral.

### 5.2 Recuperación de cuenta propia

1. Con una sesión válida, el frontend invoca `getMyAccount` sin identificador objetivo.
2. Infraestructura verifica el token y resuelve el actor.
3. Aplicación aplica `self-account` y consulta el modelo de cuenta propio.
4. Si existe, devuelve el DTO mínimo.
5. Si no existe por una inicialización incompleta, el frontend ofrece reintentar el bootstrap; no crea datos mediante acceso directo.

### 5.3 Cierre de sesión

1. El Usuario solicita cerrar sesión.
2. El adaptador de Authentication elimina o invalida la sesión local según el mecanismo vigente.
3. Se limpia del estado del frontend cualquier DTO o caché privada de la cuenta.
4. El Usuario vuelve a la navegación pública.
5. Usuario persistido permanece sin cambios.

### Habilitación comercial

**NO APLICA.** Registro, inicio, bootstrap, consulta propia y cierre de sesión no consultan Plan ni Suscripción.

---

## 6. Flujos alternativos y errores

| Condición | Respuesta funcional | Estado resultante | Feedback al actor | ¿Permite reintento? |
|---|---|---|---|---|
| Actor no autenticado invoca bootstrap o consulta | `UNAUTHENTICATED` | Sin cambios | “Tu sesión no es válida. Volvé a ingresar.” | Sí, después de autenticarse |
| Token inválido, vencido o del proyecto incorrecto | `UNAUTHENTICATED` | Sin cambios | Mensaje de sesión inválida, sin detalles internos | Sí |
| Proveedor cancelado por el visitante | `AUTH_CANCELLED` | Sin Usuario nuevo | “El ingreso fue cancelado.” | Sí |
| Proveedor de Authentication no disponible | `AUTH_UNAVAILABLE` | Sin cambios | “No pudimos iniciar sesión. Intentá nuevamente.” | Sí |
| Usuario no existe al ejecutar bootstrap | Se crea una única cuenta | Usuario creado | Ingreso confirmado | No aplica |
| Usuario ya existe al reintentar bootstrap | Se devuelve la cuenta existente | Sin duplicados ni sobrescritura indebida | Ingreso confirmado | Sí; es idempotente |
| Dos bootstrap concurrentes para el mismo actor | Uno crea y ambos convergen en la misma cuenta | Un solo Usuario | Sin error visible si puede recuperarse | Sí |
| Datos mínimos confiables incompletos | `IDENTITY_DATA_INCOMPLETE` | No se crea una cuenta inválida | “No pudimos completar los datos de acceso.” | Sí, tras renovar autenticación |
| Persistencia falla antes de confirmar | `ACCOUNT_BOOTSTRAP_FAILED` | No confirmado | “No pudimos preparar tu cuenta. Reintentá.” | Sí, con la misma operación idempotente |
| Cuenta ausente al consultar | `ACCOUNT_NOT_INITIALIZED` | Sin cambios | Acción para reintentar inicialización | Sí |
| Cliente intenta enviar `userId`, rol, posición, permisos o datos deportivos | `INVALID_ARGUMENT` o campo ignorado según contrato final | Sin cambios indebidos | Error genérico de solicitud inválida | Sí, corrigiendo la solicitud |
| Acceso directo del cliente a persistencia de Usuario | Denegado por reglas | Sin cambios | El frontend normal no debe producir este camino | No desde ese camino |
| Cierre de sesión cuando ya no existe sesión | Resultado idempotente de cierre | Estado local público | Sin error técnico innecesario | No aplica |

Los códigos definitivos deberán adecuarse al mecanismo de transporte elegido sin filtrar detalles de Firebase o persistencia.

---

## 7. Postcondiciones y criterios de aceptación

### Postcondiciones

- Existe como máximo un Usuario por sujeto autenticado.
- Usuario conserva exclusivamente información propia de identidad digital y cuenta requerida por E1-01.
- El registro no crea Persona, Membresía, Grupo, Solicitud ni Suscripción.
- Ningún rol, posición, permiso deportivo, compromiso, ranking o estadística se escribe desde el flujo migrado.
- Authentication permanece como mecanismo técnico y no como modelo de dominio.
- La persistencia interna no se expone al frontend migrado.
- La estructura legada deja de ser autoridad para rol y posición en el onboarding sustituido.
- Los consumidores legados fuera del flujo permanecen inventariados, no declarados como migrados.
- No se produce ningún despliegue remoto.

### Criterios de aceptación

1. **Dado** un visitante que completa correctamente la autenticación por primera vez, **cuando** el frontend ejecuta el bootstrap, **entonces** se crea un único Usuario y se muestra la navegación protegida.
2. **Dado** un Usuario ya creado, **cuando** vuelve a iniciar sesión, **entonces** el bootstrap devuelve la misma cuenta sin crear otro documento ni reemplazar datos con información del cliente.
3. **Dado** dos intentos concurrentes de bootstrap para el mismo actor, **cuando** ambos finalizan, **entonces** existe un único Usuario válido.
4. **Dado** un actor no autenticado, **cuando** invoca bootstrap o consulta propia, **entonces** la operación se deniega y no modifica Firestore.
5. **Dado** un Usuario A autenticado, **cuando** intenta indicar el identificador de Usuario B, **entonces** el contrato rechaza el dato o no ofrece ese campo y B permanece inaccesible.
6. **Dado** un cliente autenticado, **cuando** intenta leer o escribir directamente la persistencia de Usuario, **entonces** las reglas lo deniegan.
7. **Dado** el nuevo flujo de alta, **cuando** se inspecciona el Usuario persistido, **entonces** no contiene rol global, posición, permisos deportivos, Persona, membresías, estadísticas, rendimiento, Plan ni Suscripción.
8. **Dado** un fallo de persistencia no confirmado, **cuando** el actor reintenta, **entonces** la operación converge en una única cuenta.
9. **Dado** un Usuario autenticado, **cuando** cierra sesión, **entonces** se elimina el estado privado del frontend y Usuario persistido no cambia.
10. **Dado** que el proyecto remoto continúa bajo `deny-all`, **cuando** se implementa y verifica E1-01, **entonces** ninguna prueba ni comando escribe fuera de los emuladores.
11. **Dado** el onboarding migrado, **cuando** un Usuario accede por primera vez, **entonces** no se le solicita elegir rol ni posición global.
12. **Dado** un rechazo de autenticación y un fallo de bootstrap, **cuando** se presentan al actor, **entonces** el frontend muestra estados diferenciables.

---

## 8. Frontend

### Pantallas y rutas afectadas

- Pantalla o componente actual de ingreso: adaptado para distinguir autenticación y bootstrap.
- Onboarding actual: sustituido en su responsabilidad; deja de solicitar rol y posiciones.
- Layout o navegación protegida: consume el DTO de cuenta propia y maneja estado de inicialización.
- Pantalla pública de acceso: conserva registro/inicio según el proveedor habilitado.
- Rutas exactas: a completar luego de inspeccionar el `dev` integrado.

### Acciones

- Ingresar o registrarse mediante proveedor.
- Reintentar autenticación.
- Reintentar inicialización de cuenta.
- Cerrar sesión.

No se incorpora edición de cuenta, preferencias, creación de Persona ni selección de rol o posición.

### Estados visuales

- inicial no autenticado;
- autenticando;
- autenticación cancelada;
- inicializando cuenta;
- cuenta disponible;
- cuenta no inicializada;
- error recuperable de inicialización;
- sesión inválida;
- cerrando sesión;
- navegación protegida neutral.

### Feedback

- No utilizar “no autorizado” para un fallo del proveedor ni “sin plan” para un fallo de dominio.
- Diferenciar autenticación fallida de inicialización fallida.
- Mostrar reintento sólo para operaciones idempotentes o reiniciables.
- No mostrar identificadores internos, stack traces ni códigos de Firebase.
- Confirmar navegación protegida sólo después de obtener la cuenta.
- El estado visual deberá ser accesible por texto, no sólo por color.
- Mantener comportamiento usable en móvil y escritorio en las pantallas modificadas.
- No aplicar actualización optimista al bootstrap: la navegación se confirma tras respuesta exitosa.

---

## 9. Servicio de Aplicación responsable

- **Módulo propietario:** Usuarios.
- **Servicio de Aplicación:** nombre conceptual `EnsureMyAccount` para bootstrap y `GetMyAccount` para consulta; nombres físicos a confirmar según convenciones reales.
- **Operación coordinada:** identificar actor, validar identidad confiable, recuperar Usuario, crearlo si falta, persistirlo y devolver la cuenta mínima.
- **Autorizaciones aplicadas:** autenticación obligatoria y `self-account` implícito por ausencia de `userId` objetivo.
- **Habilitación comercial:** NO APLICA.
- **Contratos consumidos:** contrato de identidad autenticada provisto por Infraestructura.
- **Repositorio utilizado:** Repositorio de Usuario.
- **Respuesta producida:** DTO de cuenta propia.

El Servicio de Aplicación no decide roles, posiciones, permisos, Plan, Persona ni reglas deportivas. Tampoco recibe documentos o snapshots Firestore.

CU-003 utiliza el adaptador cliente de Authentication y no requiere modificar Usuario ni crear un Servicio de Aplicación de dominio artificial.

---

## 10. Agregados y reglas

| Agregado o referencia | Tipo de participación | Operación sobre Aggregate Root | Invariantes aplicadas | ¿Se modifica? |
|---|---|---|---|---|
| Usuario | Propietario | Crear cuenta mínima si no existe | Un Usuario por sujeto autenticado; identidad confiable; ausencia de autoridad deportiva | Sí, sólo en primer bootstrap |
| Usuario | Propietario | Consultar cuenta propia | No expone estado interno ni datos ajenos | No |
| Firebase Authentication | Referencia técnica externa | Verificar identidad | El dominio no depende del SDK concreto | No |
| Persona | Excluido | Ninguna | Puede existir separada; no se crea ni vincula | No |
| Plan/Suscripción | Excluido | Ninguna | No condicionan acceso a cuenta propia | No |

### Invariantes de Usuario aplicadas

- la identidad de acceso proviene de un contexto autenticado confiable;
- un actor no elige el identificador del Usuario objetivo;
- un sujeto autenticado no produce más de un Usuario;
- la creación repetida es idempotente;
- rol, posición, permisos y datos deportivos no pertenecen al Agregado Usuario;
- Persona y Comercial permanecen fuera del Agregado;
- la consulta no modifica el Agregado.

---

## 11. Consultas y contratos públicos

| Proveedor | Consumidor | Capacidad pública | Información mínima | Errores |
|---|---|---|---|---|
| Infraestructura de identidad | Aplicación Usuarios | Obtener actor autenticado confiable | sujeto, proveedor, identificador del proveedor, correo de acceso, fotografía de cuenta cuando exista | no autenticado, token inválido, identidad incompleta |
| Módulo Usuarios | Frontend | `ensureMyAccount` | cuenta propia mínima | no autenticado, identidad incompleta, persistencia fallida |
| Módulo Usuarios | Frontend | `getMyAccount` | cuenta propia mínima | no autenticado, cuenta no inicializada, dependencia no disponible |
| Firebase Authentication cliente | Frontend | cerrar sesión | resultado técnico de cierre | fallo técnico recuperable |

### Clasificación

- `ensureMyAccount`: contrato modificador idempotente.
- `getMyAccount`: contrato de consulta.
- DTO de cuenta propia: modelo de salida, no Aggregate Root ni documento Firestore.
- CU-003: operación del adaptador de Authentication, sin persistencia de dominio.

No se introduce un contrato genérico de autorización, repositorio genérico ni contrato de Persona.

---

## 12. DTO de entrada y salida

### DTO de entrada - `ensureMyAccount`

El contrato no requiere payload funcional. La identidad se obtiene del contexto autenticado.

| Campo | Tipo | Obligatorio | Validación | Origen |
|---|---|---|---|---|
| contexto autenticado | técnico/no serializado por el cliente | Sí | token válido del ambiente autorizado | Infraestructura |

Se prohíben como entrada `userId`, `email`, `provider`, `providerSubject`, `photoUrl`, `role`, `positions`, `permissions`, `personaId` y datos deportivos.

### DTO de entrada - `getMyAccount`

Sin payload funcional; utiliza exclusivamente el contexto autenticado.

### DTO de salida - cuenta propia

| Campo | Tipo | Semántica | Consumidor |
|---|---|---|---|
| `userId` | string | Identificador interno estable de Usuario | Frontend |
| `accessEmail` | string | Correo de acceso asociado a la identidad digital | Frontend |
| `authProvider` | string | Proveedor técnico utilizado en el alcance actual | Frontend/diagnóstico controlado |
| `accountPhotoUrl` | string o null | Fotografía de la cuenta cuando el proveedor la suministra | Frontend |
| `createdAt` | fecha serializable | Momento confirmado de creación de Usuario | Frontend si la UI lo necesita; retirar del DTO si no hay consumidor |

`createdAt` queda condicionado a que exista un consumidor real. No se agregará al contrato sólo porque exista en persistencia.

### Errores contractuales

| Código o categoría | Significado | Respuesta del frontend |
|---|---|---|
| `UNAUTHENTICATED` | No existe identidad válida | Volver al ingreso |
| `AUTH_CANCELLED` | El actor canceló el proveedor | Mantener pantalla y permitir reintento |
| `AUTH_UNAVAILABLE` | Proveedor no disponible | Informar indisponibilidad y reintento |
| `IDENTITY_DATA_INCOMPLETE` | Falta información confiable requerida | Renovar sesión o reintentar autenticación |
| `ACCOUNT_NOT_INITIALIZED` | La consulta ocurrió antes de bootstrap confirmado | Ofrecer bootstrap idempotente |
| `ACCOUNT_BOOTSTRAP_FAILED` | No se confirmó la creación o recuperación | Mostrar reintento seguro |
| `INVALID_ARGUMENT` | Se enviaron campos no admitidos | Rechazar sin modificar datos |
| `INTERNAL` | Fallo no clasificable sin exponer infraestructura | Mensaje genérico y registro técnico |

---

## 13. Diseño físico Firestore

### 13.1 Colecciones y documentos

| Colección o ruta | Finalidad | Autoridad o proyección | Escritores | Lectores |
|---|---|---|---|---|
| `users/{userId}` | Persistir el Agregado Usuario mínimo | Autoridad de cuenta Usuario | Repositorio de Usuario ejecutado desde backend/emulador | Repositorio/modelo de consulta del Módulo Usuarios |

Se propone conservar el nombre físico `users` porque es compatible con el concepto Usuario y evita una renombrada sin beneficio demostrado. Su esquema y autoridad cambian. La decisión deberá confirmarse contra los consumidores reales antes de implementar.

El frontend no será lector ni escritor directo de esta ruta en el flujo migrado.

### 13.2 Campos mínimos propuestos

| Campo | Tipo | Obligatorio | Propietario conceptual | Original/derivado | Regla |
|---|---|---|---|---|---|
| ID del documento `userId` | string | Sí | Usuario | Original | Derivado de la identidad autenticada; no enviado por cliente |
| `authProvider` | string | Sí | Usuario | Original | Obtenido del contexto autenticado |
| `providerSubject` | string | Sí | Usuario | Original | Identificador externo del proveedor; no editable por cliente |
| `accessEmail` | string | Sí en el proveedor actual | Usuario | Original | Normalizado para almacenamiento sin utilizarlo como ID |
| `accountPhotoUrl` | string o null | No | Usuario | Original | URL suministrada por identidad confiable; validar formato y política |
| `createdAt` | timestamp | Sí | Usuario | Original técnico | Fijado una sola vez por servidor |
| `updatedAt` | timestamp | Sí | Usuario | Original técnico | En E1-01 coincide con creación salvo reparación explícita aprobada |

### Campos expresamente ausentes

- `role`, `roles`, `isAdmin`, `admin`;
- `positions`, `position`, `dorsal`;
- `permissions`;
- `estadoCompromiso`, `partidosTotales`, ranking o estadísticas;
- `groupIds`, membresías o solicitudes;
- `personaId`;
- Plan, Suscripción o capacidades comerciales;
- preferencias y configuración, diferidas a E1-02.

### 13.3 Referencias

E1-01 no persiste referencias a otros Agregados. `providerSubject` es una referencia de identidad técnica propia de Usuario, no una referencia a un Agregado de dominio.

### 13.4 Datos originales

| Dato | Propietario | Escritor autorizado | Momento de confirmación | Consistencia |
|---|---|---|---|---|
| Identidad de acceso | Usuario | Repositorio mediante Servicio de Aplicación | Bootstrap confirmado | Conjunta dentro de Usuario |
| Proveedor y sujeto | Usuario | Backend desde token verificado | Creación | Inmutables en E1-01 |
| Correo de acceso | Usuario | Backend desde identidad confiable | Creación | No editable en E1-01 |
| Fotografía de cuenta | Usuario | Backend desde identidad confiable | Creación | No editable en E1-01 |

### 13.5 Proyecciones o datos derivados

**NO APLICA.** E1-01 no crea proyecciones, contadores, actividad, estadísticas ni duplicaciones de Usuario.

### 13.6 Índices

| Consulta | Campos | Orden | Índice necesario | Justificación |
|---|---|---|---|---|
| Obtener Usuario propio | ID de documento | No aplica | No adicional | Acceso directo por identificador derivado del actor |

No se diseñan búsquedas por correo ni listados de Usuarios.

---

## 14. Seguridad y autorización

| Operación | Visitante | Usuario autenticado | Owner | Administrador | Integrante | Sistema |
|---|---|---|---|---|---|---|
| Iniciar proveedor de Authentication | Permitido | Permitido si necesita renovar | No aplica | No aplica | No aplica | Soporte técnico |
| `ensureMyAccount` | Denegado | Permitido sólo para sí mismo | Sin privilegio adicional | Sin privilegio adicional | Sin privilegio adicional | Permitido como coordinación confiable |
| `getMyAccount` | Denegado | Permitido sólo para sí mismo | Sin privilegio adicional | Sin privilegio adicional | Sin privilegio adicional | Permitido como coordinación confiable |
| Lectura directa de `users/{id}` | Denegada | Denegada en el flujo objetivo | Denegada | Denegada | Denegada | Backend confiable fuera de reglas cliente |
| Escritura directa de `users/{id}` | Denegada | Denegada | Denegada | Denegada | Denegada | Sólo Repositorio autorizado |
| Cerrar sesión propia | No aplica/idempotente | Permitido | Sin privilegio adicional | Sin privilegio adicional | Sin privilegio adicional | No aplica |

### Autenticación

- obligatoria para bootstrap y consulta;
- verificada del lado backend;
- no concede acceso general;
- no se confía en UID, correo, proveedor o rol enviados por el cliente.

### Autorización funcional

- política mínima `self-account`;
- el contrato no recibe identificador objetivo;
- ownership deportivo, administración e integración no participan;
- una futura condición comercial no podrá reemplazar esta autorización.

### Habilitación comercial

**NO APLICA.** No se consulta ni simula.

### Validez de dominio

- identidad mínima completa;
- unicidad por sujeto autenticado;
- creación idempotente;
- ausencia de campos ajenos a Usuario;
- datos confiables no editables desde el cliente.

### Publicación y privacidad

- Usuario es privado por defecto;
- no existe listado público;
- correo, proveedor y sujeto no se publican;
- la fotografía de cuenta no se convierte en recurso público por almacenarse en Usuario.

### Pruebas negativas obligatorias

- visitante invoca contratos privados;
- token inválido;
- intento de indicar otro `userId`;
- intento de inyectar rol, posición, permisos o Persona;
- lectura y escritura directa desde SDK cliente;
- bootstrap repetido y concurrente;
- uso accidental de proyecto remoto detectado y bloqueado.

---

## 15. Repositorios y adaptadores

| Componente | Capa | Contrato | Implementación | Agregado o consulta |
|---|---|---|---|---|
| Puerto de identidad autenticada | Aplicación | Obtener actor confiable | Adaptador Firebase Authentication | Referencia técnica |
| Repositorio de Usuario | Dominio/Aplicación | obtener por ID y guardar Usuario | Adaptador Firestore | Agregado Usuario |
| Consulta de cuenta propia | Aplicación | obtener DTO mínimo propio | Adaptador/modelo de lectura; puede reutilizar el repositorio si no expone el Aggregate Root | Consulta |
| Controlador de `ensureMyAccount` | Presentación/backend | DTO contractual | Callable o mecanismo existente compatible | Caso de uso |
| Controlador de `getMyAccount` | Presentación/backend | DTO contractual | Callable o mecanismo existente compatible | Consulta |
| Adaptador de sesión | Infraestructura frontend | iniciar/cerrar sesión | Firebase Web SDK | Identidad técnica |

Reglas:

- no crear Repositorio genérico;
- ningún consumidor externo accede al Repositorio de Usuario;
- Firestore no aparece en contratos públicos;
- el controlador no contiene reglas de dominio;
- el Repositorio no decide autorización;
- si consulta y repositorio comparten implementación física, conservar contratos conceptualmente diferentes.

---

## 16. Transacción y unidad de consistencia

- **Aggregate Root modificado:** Usuario.
- **Límite transaccional:** un único Usuario identificado por el actor autenticado.
- **Datos confirmados conjuntamente:** proveedor, sujeto, correo de acceso, fotografía opcional y timestamps aprobados.
- **Validaciones externas previas:** token válido y datos mínimos confiables.
- **Concurrencia:** dos bootstrap simultáneos deben converger en el mismo documento y resultado funcional.
- **Idempotencia:** repetir `ensureMyAccount` devuelve el Usuario existente sin duplicar ni resetear datos.
- **Operaciones posteriores separadas:** navegación y estado del frontend; no condicionan la persistencia confirmada.

No intervienen varios Agregados. No se requiere transacción global, Saga, Process Manager, Event Sourcing ni doble escritura.

La implementación física podrá utilizar creación condicional o transacción Firestore si resulta necesaria para garantizar convergencia. Debe elegirse el mecanismo más simple que satisfaga la prueba concurrente.

---

## 17. Eventos y efectos posteriores

### Eventos de dominio

**NO APLICA en E1-01.** No se introduce `UsuarioCreado` por uniformidad porque no existe consumidor obligatorio aprobado.

### Efectos posteriores

| Hecho o efecto | Productor | Consumidor | Obligatorio | Recuperable | Idempotente |
|---|---|---|---|---|---|
| Actualizar estado de sesión/cuenta en frontend | Respuesta de bootstrap | Frontend | Sí para completar UX | Sí, repitiendo consulta/bootstrap | Sí |
| Navegar al área protegida | Frontend | Router/layout | Sí para el flujo | Sí | Sí |

No se envían correos, notificaciones, analytics de dominio ni solicitudes de vinculación.

---

## 18. Plan de pruebas

| Nivel | Casos mínimos | Herramienta o entorno | Evidencia |
|---|---|---|---|
| Dominio | creación válida; rechazo de identidad incompleta; ausencia de campos deportivos; invariantes de identidad | Framework existente o mínimo aprobado | Resultado de tests |
| Aplicación | crear si falta; devolver si existe; actor obligatorio; error de repositorio; no consulta Comercial o Persona | Tests unitarios con puertos controlados | Resultado de tests |
| Contrato | sin payload de identidad; DTO mínimo; errores estables; rechazo de campos extra sensibles | Tests del controlador/callable | Resultado de tests |
| Integración | Auth Emulator + Functions + Firestore; primer acceso; acceso repetido; concurrencia; fallo y reintento | Firebase Emulator Suite | Logs y reporte reproducible |
| Reglas | lectura/escritura directa denegadas a visitante y autenticado; contratos backend operables | Rules Unit Testing o equivalente | Matriz permitidos/denegados |
| Frontend | autenticando; inicializando; éxito; cancelación; fallo; reintento; cierre; sin rol/posición | Tests disponibles y verificación manual reproducible | Capturas o registro de pasos |
| Arquitectura | frontend sin acceso directo en flujo; contrato sin Firestore; sin dependencia Persona/Comercial; un Repositorio específico | Búsquedas, lint arquitectónico o revisión | Informe de límites |
| Recuperación | bootstrap repetido; dos solicitudes concurrentes; respuesta perdida; persistencia fallida; rollback de código | Emuladores y dobles controlados | Resultado y procedimiento |
| Regresión E0 | pruebas de autopromoción y exposición continúan aprobando | Suite de Etapa 0 | Resultado completo |

### Baseline de calidad

- registrar typecheck frontend;
- registrar sintaxis y tests backend;
- registrar lint histórico y comprobar que E1-01 no incrementa deuda;
- limpiar razonablemente los archivos modificados sin convertir lint global cero en requisito;
- no ocultar fallos funcionales como deuda histórica.

### Protección de ambiente

Toda ejecución debe utilizar emuladores explícitos. Las pruebas deberán fallar de forma segura si faltan indicadores de emulador o si resuelven el proyecto remoto.

---

## 19. Componentes actuales reutilizados

| Componente | Reutilización | Adaptación requerida | Riesgo |
|---|---|---|---|
| Firebase Authentication | Flujo técnico con Google y sesión | Encapsular identidad confiable y distinguirla de Usuario | Confundir Auth user con Agregado Usuario |
| Pantalla de acceso | UI y navegación existentes | Incorporar estados de bootstrap y errores diferenciados | Conservar supuestos de rol/onboarding |
| Onboarding | Sólo estructura visual o navegación útil | Retirar rol, posiciones y autopromoción; redefinir responsabilidad | Mantener escritores legados ocultos |
| Layout protegido | Protección y composición visual | Consumir DTO de cuenta propia mediante contrato | Inferir permisos desde datos cliente |
| Firebase Functions/callables | Transporte backend disponible | Formalizar entrada, salida, errores y autorización | Exponer Firestore o mezclar capas |
| Firestore | Persistencia | Redefinir esquema mínimo y encapsular acceso | Conservar campos deportivos por comodidad |
| Emuladores y pruebas E0 | Red de seguridad | Extender con flujo Usuario | Ejecutar accidentalmente contra remoto |
| `onUserCreate` legado | Conocimiento del alta actual | Evaluar si se retira o se convierte en consumidor del mismo Servicio de Aplicación | Dos escritores con reglas distintas |

### Decisión sobre `onUserCreate`

La opción preferida es que el bootstrap explícito sea el camino funcional principal porque ofrece respuesta y reintento controlado al frontend. El trigger legado no deberá conservar una segunda lógica de creación.

Durante la inspección se elegirá una de estas alternativas:

1. retirarlo si queda completamente sustituido; o
2. mantenerlo sólo si delega exactamente en la misma coordinación idempotente y existe una necesidad demostrada.

No se aceptan dos esquemas, dos conjuntos de defaults ni dos autoridades para Usuario.

---

## 20. Estructuras anteriores retiradas

| Estructura | Lectores anteriores | Escritores anteriores | Reemplazo | Evidencia de retiro |
|---|---|---|---|---|
| Rol global en onboarding/Usuario | UI protegida, reglas y servicios a inventariar | Onboarding y callable legado a inventariar | Ninguno en E1-01; autorización `self-account` | Búsqueda de escritores, tests de inyección y diff |
| Posiciones deportivas en onboarding/Usuario | Perfil, ranking y flujos deportivos a inventariar | Onboarding legado | Futuro atributo contextual de Membresía; no se crea aún | Onboarding sin campo/escritura; consumidores restantes registrados |
| Escritura directa de cuenta desde cliente | UI/servicios a identificar | SDK web o rutas actuales | `ensureMyAccount` | Pruebas de reglas y búsqueda de llamadas |
| Lectura directa de cuenta en flujo migrado | Layout/perfil/onboarding a identificar | No aplica | `getMyAccount`/DTO | Revisión de dependencias y pruebas |
| `onboarded` como prueba de rol/posición completados | Navegación a inventariar | Onboarding/trigger a inventariar | Estado derivado del bootstrap o ausencia de gate legado | Tests de navegación y búsqueda global |

### Permanencia temporal permitida

Los lectores de rol, posiciones o rendimiento pertenecientes a flujos todavía no sustituidos pueden permanecer temporalmente sólo si:

- se inventarían con ubicación y consumidor;
- no reciben nuevos escritores desde E1-01;
- no gobiernan el acceso al flujo migrado;
- no se declaran normativos;
- poseen etapa concreta de retiro.

No habrá doble escritura ni sincronización entre esquema nuevo y campos legados.

---

## 21. Checkpoint y rollback

- **Commit inicial:** pendiente de registrar después del merge en `dev`.
- **Rama:** `feat/e1-01-cuenta-usuario`.
- **Estado de pruebas inicial:** pendiente de ejecutar y adjuntar.
- **Checkpoint intermedio recomendado:** dominio/Aplicación/Repositorio y contratos aprobando antes de modificar onboarding y navegación.
- **Rollback de código:** revertir commits de E1-01 o cerrar la rama; no modificar `dev` hasta verificación.
- **Tratamiento de datos de prueba:** reinicializar Auth y Firestore Emulator según procedimiento; nunca tocar remoto.
- **Condición para interrumpir:** contradicción normativa real, acceso al remoto, reintroducción de autopromoción, doble autoridad de Usuario, imposibilidad de garantizar idempotencia, regresión de seguridad o necesidad no aprobada de Persona/Comercial.
- **Condición para reanudar:** conflicto resuelto y documentado, ambiente nuevamente verificado, rollback aplicado si corresponde y baseline aprobado.

### Rollback funcional

- eliminar o revertir únicamente código, reglas locales, pruebas y datos sintéticos de E1-01;
- restaurar el checkpoint inicial de la rama;
- reinicializar emuladores;
- ejecutar nuevamente la suite E0;
- no restaurar el onboarding inseguro como salida definitiva ni habilitar reglas remotas.

No se utiliza doble escritura como mecanismo de rollback.

---

## 22. Evidencia de cierre

E1-01 deberá adjuntar en `docs/implementacion/etapa-1/` o referenciar inequívocamente:

- commit inicial y commits del incremento;
- rama y estado Git final;
- preflight de versiones y ambiente;
- pruebas aprobadas por nivel;
- resultado de Firebase Emulator Suite;
- baseline y delta de typecheck, lint y sintaxis;
- contratos finales de `ensureMyAccount` y `getMyAccount`;
- DTO y errores finales;
- reglas locales verificadas;
- evidencia del frontend en estados principales y de error;
- inventario final de lectores y escritores de Usuario;
- evidencia de retiro de rol/posición del onboarding;
- evidencia de ausencia de acceso directo en el flujo migrado;
- evidencia de que el proyecto remoto permaneció sin cambios y bajo `deny-all`;
- matriz de trazabilidad actualizada;
- deuda aceptada y etapa de tratamiento;
- procedimiento de rollback verificado.

### Declaración final

- **Estado final:** Pendiente; sólo podrá ser `Verificado` y luego `Cerrado`.
- **Criterios incumplidos:** Pendiente de ejecución.
- **Deuda aceptada:** Pendiente de inventario; no podrá incluir fallos de seguridad, autoridad duplicada ni ausencia de pruebas obligatorias.
- **Responsable de aprobación:** Rodolfo.
- **Fecha de cierre:** Pendiente.

---

## Gate para pasar a “Listo para implementar”

La ficha cambia de `En definición` a `Listo para implementar` al quedar completada esta lista:

- [x] Etapa 0 integrada y verificada en `dev`.
- [x] Commit de partida registrado.
- [x] Rama E1-01 creada desde el `dev` correcto.
- [x] Preflight de Node/npm/Firebase ejecutado.
- [x] Emuladores y suite E0 aprobados.
- [x] Proveedor actual de Authentication confirmado.
- [x] Rutas y componentes frontend afectados inventariados.
- [x] Trigger, callables, servicios y reglas afectados inventariados.
- [x] Lectores y escritores de `users` y campos legados inventariados.
- [x] Diseño físico mínimo confirmado contra consultas y consumidores reales.
- [x] Alternativa final para `onUserCreate` aprobada.
- [x] Contratos, DTO, errores, reglas y pruebas de esta ficha revisados.
- [x] Ausencia de escrituras o despliegues remotos confirmada.

## Veredicto de preparación

**E1-01 LISTO PARA IMPLEMENTAR**

Este veredicto habilita la implementación posterior del incremento; no declara E1-01 implementado, verificado ni cerrado.
