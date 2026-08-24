# Ficha de Incremento Implementable E1-02 — Alta de Persona propia y vinculación inicial

## Estado de la ficha

- **Estado:** `LISTO PARA IMPLEMENTAR`.
- **Responsable:** Rodolfo.
- **Fecha:** 2026-08-24.
- **Rama o checkpoint de partida:** `feat/e1-02-persona-vinculacion-inicial` en `e44c8d061fe1ff15b2141d7ec1cfc7fb804eb4a4`.
- **Upstream al iniciar la definición:** `origin/feat/e1-02-persona-vinculacion-inicial`, alineado `0/0`.
- **Working tree al iniciar la definición:** limpio.
- **Etapa del roadmap:** Etapa 1 — Usuario, Persona y autorización contextual.
- **Ambiente autorizado para la implementación futura:** Firebase Emulator Suite, proyecto `demo-*`, hosts loopback y datos sintéticos descartables.
- **Ambiente remoto:** fuera del alcance de esta ficha y de la intervención que la redacta.

### Naturaleza de las decisiones

- Las reglas de identidad, cardinalidad, datos mínimos, autorización, alcance y comportamiento funcional consignadas como **decisión normativa aprobada** provienen de los Documentos 1–4 y de las decisiones funcionales aprobadas para E1-02.
- Las rutas, nombres de funciones, DTO, campos persistentes, estrategia transaccional, repositorios, adaptadores y componentes consignados como **decisión física E1-02** fueron revisados y aprobados con las correcciones incorporadas en esta versión.
- El código inspeccionado sólo documenta el estado técnico de partida. Sus estructuras legadas no se convierten en norma.

---

## 1. Identificación

- **ID del incremento:** E1-02.
- **Nombre:** Alta de Persona propia y vinculación inicial.
- **Casos de uso incluidos:**
  - Registrar Persona, limitado al alta explícita de la Persona propia de un Usuario autenticado, materializado y todavía no vinculado.
  - Vinculación inicial Usuario–Persona como subcaso restringido, atómico y backend-only de CU-006.
  - Consulta de la Persona propia vinculada, necesaria para representar el estado vacío, el existente y la inconsistencia.
- **Trazabilidad funcional:**
  - “Registrar Persona” queda incluido.
  - CU-006 — Vincular un Usuario con una Persona existente queda **parcialmente atendido**, sólo respecto de vincular en el mismo acto la Persona nueva creada por el propio Usuario. CU-006 no queda completamente cerrado.
  - CU-007 — Desvincular Usuario de Persona queda excluido.
  - CU-004 y CU-005 permanecen postergados.
- **Casos de uso y capacidades expresamente excluidos:**
  - buscar, listar, seleccionar o reclamar una Persona existente;
  - alta de Persona por administrador;
  - asociación automática por correo;
  - Solicitud de vinculación, invitaciones, email, enlace o token;
  - aceptación o rechazo de invitaciones;
  - detección definitiva, fusión o resolución general de duplicados;
  - desvinculación, cambio de Persona vinculada y edición posterior de Persona;
  - fecha de nacimiento, sexo, teléfono, domicilio, fotografía, datos físicos, médicos u observaciones;
  - posición, dorsal, rol, cargo, permisos, compromiso o rendimiento;
  - Grupo, Membresía, Temporada, Partido, Torneo, ranking, Plan, Suscripción o capacidades comerciales;
  - migración, backfill, seed o modificación de datos remotos.
- **Documentos y secciones normativas relacionadas:**
  - Documento 1, dominio Usuario y dominio Persona: Usuario es cuenta de acceso y no debe contener información propia de Persona; Persona es identidad deportiva permanente y puede existir sin Usuario.
  - Documento 1.5, §§2.3, 2.4, 3 y 4: distinción Usuario–Persona–Membresía, vínculo con Persona y cardinalidad conceptual opcional.
  - Documento 2, PF-01, CU-006, CU-007 y matriz de trazabilidad; matriz de Gestión de Personas para “Registrar Persona”.
  - Documento 3, §§5, 6.1, 6.2, 8.2 y 8.7: Módulos Usuarios y Personas, Contextos de Identidad y Personas, Agregados Usuario y Persona.
  - Documento 4, §§3.5, 5, 7, 9, 10 y 11: contratos, Servicios de Aplicación, Repositorios, unidades de consistencia y separación de autenticación/autorización.
  - Documento 5, §§2.4–2.11, 3.3–3.6, 4, 5.16, 5.17 y 7.3.
  - `docs/implementacion/etapa-1/E1-01-cierre.md`, en particular §§5–12, 17, 18 y 21.
  - `docs/implementacion/etapa-1/E1-01-ficha-cuenta-usuario.md` y `E1-01-informe-implementacion.md` como evidencia técnica complementaria.
- **Brechas técnicas atendidas:**
  - TECH-GAP-03, en el corte que materializa Persona separada y añade al Usuario sólo la referencia opcional.
  - TECH-GAP-08 y TECH-GAP-09, en los accesos de alta y consulta propia encapsulados tras contratos de Aplicación y con backend como único escritor.
  - Continuidad de TECH-GAP-01: ni rol global ni datos enviados por cliente autorizan el alta.
- **Brechas no declaradas cerradas:**
  - TECH-GAP-03 permanece abierto mientras lectores deportivos sigan usando `users` como perfil.
  - TECH-GAP-07, autorización contextual completa, Grupo, Membresía, Partido, Torneo y ranking permanecen fuera de este incremento.
  - TECH-GAP-08 y TECH-GAP-09 sólo se reducen en el flujo intervenido.

---

## 2. Objetivo funcional

Permitir que un Usuario autenticado, ya materializado y sin Persona vinculada decida crear su identidad personal/deportiva permanente con nombre, apellido y email de contacto, y quede vinculado a ella sin duplicados, estados parciales ni autoridad derivada del cliente.

El valor para el actor es disponer de una Persona propia que pueda ser referenciada por capacidades deportivas posteriores, sin convertir la ausencia de Persona en un bloqueo global de su cuenta ni reinstalar el onboarding deportivo legado.

El alta y la vinculación se agrupan porque la decisión aprobada exige que la Persona creada por este flujo nazca vinculada al Usuario solicitante. Para E1-02 no existe un resultado funcional válido con una Persona nueva huérfana ni con un Usuario enlazado a una Persona inexistente.

El objetivo no incluye migrar los flujos deportivos existentes a Persona o Membresía. E1-02 establece la fuente de verdad y el contrato inicial sobre los que podrán hacerlo incrementos posteriores.

---

## 3. Actores

| Actor | Participación | Contexto | Resultado esperado |
|---|---|---|---|
| Visitante | Intenta consultar o crear | Sin autenticación | Denegación `unauthenticated`, sin escritura |
| Usuario autenticado sin Persona | Actor principal | `self-person-bootstrap` sobre su propia cuenta | Crear una Persona y obtener el vínculo |
| Usuario autenticado con Persona válida | Repite o recupera la operación | `self-person-bootstrap` | Obtener la Persona ya vinculada, sin crear ni actualizar otra |
| Usuario con vínculo inconsistente | Consulta o intenta crear | `self-person-bootstrap` fail-closed | Error específico, sin creación sustitutiva |
| Sistema / Servicio de Aplicación | Coordina identidad, validación, raíces y persistencia | Backend confiable | Confirmar un único resultado atómico e idempotente |
| Firebase Authentication | Acredita identidad técnica | Infraestructura externa al dominio | Proveer exclusivamente el UID autenticado al backend |
| Administrador global legado | No obtiene privilegio especial | Fuera del contexto funcional | Mismo comportamiento que cualquier Usuario respecto de su propia Persona |
| Plan / Suscripción | No participan | `NO APLICA` | No habilitan ni restringen la operación |
| Grupo / Membresía | No participan | Fuera de alcance | Ninguna modificación ni autorización contextual |

---

## 4. Precondiciones

### 4.1 Funcionales

- El actor posee una sesión autenticada válida.
- Existe `users/{firebaseUid}` y representa al mismo actor autenticado.
- Para crear, el Usuario no posee `personaId`.
- Si ya existe `personaId`, debe ser un identificador válido y `personas/{personaId}` debe existir y ser legible por backend.
- El actor aporta nombre, apellido y email de contacto.
- El email de contacto es dato de Persona, puede diferir del acceso, no es único y no prueba identidad.
- La autorización se evalúa como `self-person-bootstrap`; no se recibe Usuario objetivo.
- **Habilitación comercial:** `NO APLICA`; Plan y Suscripción no intervienen.
- **Relaciones contextuales:** `NO APLICA`; no se requiere Grupo, Membresía, rol, cargo o permiso.

### 4.2 Validación mínima aprobada

- `firstName`: string, `trim()`, entre 1 y 80 caracteres Unicode.
- `lastName`: string, `trim()`, entre 1 y 80 caracteres Unicode.
- `contactEmail`: string, `trim()`, máximo 254 caracteres y formato sintáctico de email razonable; se conserva el casing confirmado por el Usuario después de retirar únicamente los espacios exteriores.
- Se rechazan propiedades adicionales y valores no string.
- La validación de formato no cambia el casing ni transforma el email en identificador, prueba de acceso o clave única.

### 4.3 Técnicas

- E1-01 está cerrado y deja disponibles `ensureMyAccount`, `getMyAccount`, `MyAccount`, `AuthProvider`, navegación protegida, emuladores y runners.
- El baseline de E1-01 consta como aprobado en `E1-01-cierre.md`: lint sin regresiones, typecheck, sintaxis, unitarias, emuladores, mantenimiento y build.
- La implementación futura parte del checkpoint registrado en esta ficha y vuelve a comprobar rama, upstream y working tree antes de modificar código.
- Toda prueba de persistencia utiliza emuladores y datos sintéticos; Firebase remoto permanece fuera de alcance.

### 4.4 Decisiones faltantes

No se detecta una decisión funcional o física faltante que bloquee la implementación. Las decisiones físicas de esta ficha fueron revisadas y aprobadas con las correcciones incorporadas.

---

## 5. Flujo principal

1. El Usuario autenticado abre `/profile/person` desde la invitación del dashboard o desde “Mi perfil”.
2. El frontend consulta `getMyPerson` con payload vacío.
3. El backend deriva `firebaseUid` exclusivamente de `context.auth.uid`.
4. El Servicio de Aplicación carga el Usuario propio.
5. Si no existe vínculo, la consulta devuelve `{ person: null }`; el frontend muestra el estado vacío y el formulario sólo cuando el actor elige crear.
6. El actor ingresa nombre, apellido y email de contacto y activa una única operación de envío.
7. El frontend llama `ensureMyPerson` sólo con esos tres campos; no escribe Firestore.
8. El adaptador de transporte valida forma y propiedades; el dominio Persona aplica `trim`, conserva el casing del email y valida los valores.
9. El Servicio de Aplicación aplica `self-person-bootstrap`. Rol, permisos, Plan y Suscripción no se consultan.
10. El Servicio de Aplicación prepara una Persona nueva con un ID opaco generado por backend.
11. Dentro de una transacción Firestore se leen primero Usuario y, si existe vínculo, la Persona referenciada.
12. Si el Usuario continúa sin vínculo, el Aggregate Root Persona confirma su estado inicial y el Aggregate Root Usuario confirma `linkPerson(personaId)`.
13. La transacción crea `personas/{personaId}` y actualiza únicamente `users/{firebaseUid}.personaId`.
14. Firestore confirma ambos cambios o ninguno.
15. El backend devuelve `EnsureMyPersonResult` con `outcome: "created"` y el DTO de Persona.
16. El frontend actualiza el contexto de Persona con la respuesta confirmada, muestra éxito y conserva acceso al dashboard.
17. **Efectos posteriores:** `NO APLICA`; no se envían emails, no se crean eventos obligatorios, Membresías, alertas ni proyecciones.

---

## 6. Flujos alternativos y errores

| Condición | Respuesta funcional | Estado resultante | Feedback al actor | ¿Permite reintento? |
|---|---|---|---|---|
| Visitante | `unauthenticated` / `AUTHENTICATION_REQUIRED` | Sin cambios | “Tu sesión no es válida. Volvé a ingresar.” | Sí, tras autenticarse |
| Payload no objeto, incompleto, con campos extra o tipos inválidos | `invalid-argument` / `INVALID_PERSON_DATA` | Sin cambios | Errores de campos sin exponer internals | Sí, al corregir |
| Nombre, apellido o email incumplen validación | `invalid-argument` / `INVALID_PERSON_DATA` | Sin cambios | Error junto al campo y resumen accesible | Sí |
| Usuario Auth sin `users/{uid}` | `failed-precondition` / `ACCOUNT_NOT_INITIALIZED` | Sin cambios | “No pudimos encontrar tu cuenta. Reintentá la inicialización.” | Sí, mediante bootstrap de cuenta |
| Usuario sin `personaId` | Consulta `{ person: null }` | Sin cambios | Invitación clara y formulario opcional | Sí, puede iniciar alta |
| Usuario con Persona válida llama `ensureMyPerson` | Respuesta exitosa con `outcome: "existing"` y Persona persistida | Sin cambios | Mostrar identidad ya existente; no informar creación nueva | Sí; es idempotente |
| Reintento con datos distintos cuando ya existe Persona | Respuesta `existing`; los datos enviados no editan ni sincronizan Persona | Sin cambios | Mostrar datos persistidos y aclarar que edición no está disponible | Sí, aunque no modifica |
| `personaId` no es string válido | `failed-precondition` / `PERSON_LINK_INCONSISTENT` | Sin cambios | Mensaje de cuenta inconsistente y vía de reintento/soporte | Sí para comprobar recuperación; no autocorrige |
| `personaId` apunta a documento inexistente | `failed-precondition` / `PERSON_LINK_INCONSISTENT` | Sin cambios; no se crea otra Persona | Mensaje específico de inconsistencia | Sí para comprobar; requiere corrección autorizada fuera de E1-02 |
| Persona vinculada tiene esquema inválido | `failed-precondition` / `PERSON_LINK_INCONSISTENT` | Sin cambios | Cuenta inconsistente, sin mostrar datos parciales | Sí para comprobar; no autocorrige |
| Dos llamadas concurrentes sin vínculo | Firestore reintenta una transacción; una crea y la otra observa el vínculo y devuelve `existing` | Un Usuario, una Persona, un vínculo | Ambas terminan con la misma Persona | Sí |
| Respuesta perdida después del commit | El reintento observa el vínculo y devuelve `existing` | Se conserva el único resultado confirmado | Recuperación transparente | Sí |
| Conflicto transaccional agotado | `aborted` / `CONCURRENT_MODIFICATION` | Ningún commit parcial de ese intento | “Hubo un cambio simultáneo. Reintentá.” | Sí |
| Firestore no disponible o persistencia falla antes del commit | `unavailable` o `internal` / `PERSON_PERSISTENCE_FAILED` | Ambos documentos sin cambios para ese intento | Error recuperable, valores del formulario preservados | Sí |
| Capacidad comercial no habilitada | `NO APLICA` | No se consulta Comercial | No se muestra límite comercial | No corresponde |
| Rol administrativo global presente | No altera autorización | Sólo puede actuar sobre la propia cuenta | Mismo flujo que Usuario ordinario | Sí |

---

## 7. Postcondiciones y criterios de aceptación

### 7.1 Postcondiciones

- Tras creación exitosa existe exactamente una Persona nueva válida en `personas/{personaId}`.
- El Usuario propio conserva su identidad digital y añade exclusivamente `personaId`.
- Persona no contiene `userId`, `firebaseUid`, email de acceso, roles, permisos ni referencias deportivas/comerciales.
- No existe estado confirmado con Persona nueva huérfana ni con vínculo nuevo apuntando a una Persona inexistente.
- Authentication, Grupo, Membresía, Temporada, Partido, Torneo, ranking, Plan y Suscripción permanecen sin cambios.
- No se sincroniza `users.email` con `personas.emailContacto`, ni `users.nombre` con nombre/apellido de Persona.
- No se genera información derivada ni efecto posterior obligatorio.
- `users.nombre` y `users.email` continúan siendo datos de cuenta E1-01; dejan de ser candidatos a fuente de verdad personal en cualquier componente nuevo de E1-02.

### 7.2 Criterios de aceptación

1. **Dado** un Usuario autenticado y materializado sin `personaId`, **cuando** envía datos válidos, **entonces** se crea una Persona y se enlaza el Usuario en un único commit observable.
2. **Dado** el alta confirmada, **cuando** se inspeccionan los documentos, **entonces** Persona contiene exactamente datos propios y Usuario sólo añade `personaId` al esquema E1-01.
3. **Dado** un visitante, **cuando** invoca cualquiera de los contratos propios, **entonces** recibe `unauthenticated` y no hay escrituras.
4. **Dado** un Usuario ordinario, **cuando** intenta enviar `userId`, `firebaseUid`, `personaId`, rol o permisos, **entonces** recibe `invalid-argument` y no puede elegir actor u objetivo.
5. **Dadas** dos solicitudes concurrentes, **cuando** ambas terminan, **entonces** existe una sola Persona y ambas respuestas identifican la misma Persona.
6. **Dada** una respuesta perdida tras el commit, **cuando** el actor reintenta, **entonces** recibe `outcome: "existing"` sin duplicación ni actualización silenciosa.
7. **Dado** un vínculo válido preexistente, **cuando** el actor repite el alta con cualquier payload válido, **entonces** se devuelve la Persona persistida y no se crea ni edita otra.
8. **Dado** un vínculo a Persona inexistente o inválida, **cuando** se consulta o crea, **entonces** el backend falla cerrado con `PERSON_LINK_INCONSISTENT` y no crea reemplazo.
9. **Dado** un email de contacto distinto del acceso, **cuando** se confirma el alta, **entonces** ambos permanecen distintos y ninguno sobrescribe al otro.
10. **Dado** un email de contacto ya usado por otra Persona, **cuando** se crea una Persona válida, **entonces** no se rechaza por unicidad ni se vincula automáticamente con la existente.
11. **Dado** un Usuario sin Persona, **cuando** navega al dashboard u otras capacidades no dependientes, **entonces** no sufre redirección ni bloqueo global y ve una invitación no coercitiva.
12. **Dado** un envío en curso, **cuando** se activa dos veces el control, **entonces** el frontend conserva una única solicitud en vuelo y muestra estado de carga.
13. **Dada** una falla recuperable, **cuando** se restablece backend y se reintenta, **entonces** el formulario conserva valores y converge al estado persistido real.
14. **Dado** cualquier cliente Firestore, **cuando** intenta crear, actualizar o eliminar `personas` o modificar `users.personaId`, **entonces** las reglas lo deniegan.
15. **Dado** un Usuario con rol global `admin`, **cuando** intenta operar sobre otra cuenta o enviar otro UID, **entonces** no obtiene autoridad adicional.
16. **Dado** el incremento implementado, **cuando** se buscan escritores nuevos, **entonces** sólo el backend de E1-02 escribe Persona y vínculo.
17. **Dado** E1-02 completo, **cuando** se revisa trazabilidad, **entonces** CU-006 continúa marcado como parcial y CU-007 como excluido.

---

## 8. Frontend

### 8.1 Pantallas y rutas

- **Pantalla nueva aprobada:** `volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx` en `/profile/person`.
- **Componentes nuevos previstos:** `PersonBootstrapCard`, `PersonBootstrapForm` y un error recuperable específico bajo `src/components/person/`.
- **Pantalla modificada:** `src/app/(protected)/dashboard/page.tsx`; la tarjeta “Ficha deportiva / No disponible” pasa a reflejar estado de Persona y ofrece una invitación clara.
- **Navegación modificada:** `AppSidebar.tsx` y `Navbar.tsx`; “Mi identidad” enlaza `/profile/person` dentro de “Mi perfil”.
- **Provider/contexto modificado:** `AuthProvider.tsx` o un `PersonProvider` anidado en navegación protegida. Propuesta: un `PersonProvider` separado para no mezclar sesión/cuenta con identidad Persona y para que un fallo de consulta de Persona no invalide globalmente una cuenta E1-01 válida.
- **Pantallas retiradas:** ninguna pantalla general de perfil o Grupo se retira en E1-02.
- **Rutas legadas:** `/onboarding` y `/profile/info` continúan como redirecciones neutrales a `/dashboard`; no se reutilizan como formulario ni se elimina su compatibilidad en este incremento.

### 8.2 Acciones

- Abrir “Crear mi identidad” desde dashboard o navegación.
- Mostrar el formulario sólo por decisión explícita del Usuario.
- Validar nombre, apellido y email de contacto.
- Enviar una sola solicitud en vuelo; botón deshabilitado y `aria-busy` durante el envío.
- Cancelar antes de enviar y volver al dashboard sin efecto.
- Reintentar consulta o envío fallido conservando los datos ingresados.
- Si ya existe Persona, mostrar sus tres datos como sólo lectura; edición no disponible en E1-02.

### 8.3 Estados visuales obligatorios

| Estado | Representación |
|---|---|
| Inicial | Contexto todavía no consultado, sin inferir ausencia |
| Cargando | Skeleton o indicador con texto accesible |
| Vacío | Cuenta válida sin Persona, invitación clara y no bloqueante |
| Formulario | Tres campos, labels visibles, ayudas y validación |
| Validación | Errores por campo y resumen `aria-live` |
| Envío | Control deshabilitado, `aria-busy`, sin doble activación |
| Éxito | Datos confirmados, mensaje de creación y enlace al dashboard |
| Existente/idempotente | Misma vista de Persona, sin afirmar nueva creación |
| Error recuperable | Mensaje estable, valores preservados y botón Reintentar |
| Cuenta inconsistente | Contenido deportivo no supuesto, mensaje específico y fallo cerrado |
| No autorizado | Reautenticación; no se muestran datos privados |
| Límite comercial | `NO APLICA`; no debe aparecer |

### 8.4 Feedback y comportamiento

- La UI sólo presenta éxito después de respuesta confirmada; no hay actualización optimista del vínculo.
- En viewport móvil y escritorio los campos, errores y controles deben ser utilizables sin scroll horizontal.
- El foco se dirige al primer campo inválido o al resumen de error.
- Un fallo de Persona no elimina `account`, no cierra sesión y no bloquea `/dashboard`.
- El frontend no importa operaciones de escritura Firestore para `users` o `personas`.
- `users.nombre`, `users.email`, `onboarded`, roles, posiciones y compromiso no determinan si existe Persona.

---

## 9. Servicio de Aplicación responsable

- **Propiedad modular:** el Módulo Usuarios es propietario de Usuario y del vínculo opcional `personaId`; el Módulo Personas es propietario de Persona y sus datos. Ninguno adquiere ownership sobre el estado del otro.
- **Servicio de Aplicación aprobado:** `SelfPersonBootstrapService`.
- **Naturaleza del coordinador:** Servicio de Aplicación transversal del caso de uso, fuera de ambos Agregados. Ejecuta el flujo completo mediante capacidades públicas y no constituye un nuevo Agregado, dominio, módulo de negocio ni fuente de verdad.
- **Operaciones coordinadas:** `ensureMyPerson(authenticatedUserId, personInput)` y `getMyPerson(authenticatedUserId)`.
- **Autorizaciones aplicadas:** `self-person-bootstrap`; actor y objetivo son el UID autenticado.
- **Habilitación comercial:** `NO APLICA`.
- **Contratos consumidos:** capacidad pública del Módulo Usuarios para cargar Usuario y expresar `linkPerson(personaId)`; capacidad pública del Módulo Personas para construir, validar y consultar Persona; puerto específico `SelfPersonBootstrapUnitOfWork` para confirmar los dos estados válidos. No se consume Grupo, Membresía ni Comercial.
- **Persistencia participante:** `UserRepository` y `PersonRepository` continúan perteneciendo a sus módulos y restringidos a sus Aggregate Roots. El coordinador no los importa ni navega directamente; el adaptador específico de unidad de trabajo materializa sus capacidades de persistencia dentro del único commit autorizado.
- **Respuesta producida:** `EnsureMyPersonResult` o `GetMyPersonResult`, nunca documentos Firestore.
- **Regla de capa:** el Servicio coordina identidad, autorización, capacidades públicas, orden y unidad de trabajo. `Usuario.linkPerson()` protege la ausencia de vínculo y `Persona.create()` protege los datos propios; cada modificación se expresa mediante su Aggregate Root y esas invariantes no se reimplementan en el servicio o en la unidad de trabajo.

No se propone Servicio de Dominio: no aparece una regla sin propietario natural. La validación de Persona pertenece a Persona; la cardinalidad del enlace saliente pertenece a Usuario; la secuencia pertenece a Aplicación.

---

## 10. Agregados y reglas

| Agregado | Tipo de participación | Operación sobre Aggregate Root | Invariantes aplicadas | ¿Se modifica? |
|---|---|---|---|---|
| Usuario | Propietario del vínculo opcional | `linkPerson(personaId)` | Usuario materializado; `personaId` ausente antes de crear; no aceptar reemplazo; referencia no vacía | Sí, sólo `personaId` |
| Persona | Identidad nueva independiente | `Persona.create(personId, nombre, apellido, emailContacto)` | ID válido; datos mínimos con trim; casing del email preservado; email no es autoridad ni único | Sí, creación |
| Authentication | Referencia técnica externa | Ninguna operación de dominio | UID sólo desde token verificado | No |
| Grupo | Fuera de alcance | `NO APLICA` | No condiciona alta | No |
| Membresía | Fuera de alcance | `NO APLICA` | No se crea ni infiere | No |
| Plan / Suscripción | Fuera de alcance | `NO APLICA` | No otorgan permiso | No |

### Reglas de Usuario

- La cardinalidad saliente es cero o una Persona.
- Una vez enlazado, E1-02 no permite reemplazo ni desvinculación.
- Usuario conserva exclusivamente la referencia `personaId`; no copia nombre, apellido o email de contacto.
- `users.nombre` y `users.email` conservan semántica de cuenta E1-01 y no se sincronizan.

### Reglas de Persona

- Persona tiene identidad propia, distinta de UID y del documento Usuario.
- Nombre, apellido y email de contacto pertenecen a Persona.
- El email puede repetirse y no autoriza asociación.
- Persona no contiene referencia inversa a Usuario en E1-02.
- Persona no contiene rol, permiso, posición, dorsal, compromiso, Grupo, Membresía o capacidad comercial.

### Cardinalidad 1:1 opcional

- La única fuente de verdad del enlace es `users/{uid}.personaId`.
- La cardinalidad “un Usuario como máximo una Persona” la protege `Usuario.linkPerson()` y la precondición transaccional sobre el documento Usuario.
- La cardinalidad “una Persona como máximo un Usuario” se preserva en E1-02 por construcción: el flujo sólo crea una Persona nueva y la enlaza al mismo Usuario en el mismo commit; no existe contrato para reclamar una Persona existente.
- No se agrega `userId` inverso ni consulta por email. El futuro flujo de vínculo con Persona existente deberá diseñar su propia reserva/solicitud segura antes de ampliar CU-006.

---

## 11. Consultas y contratos públicos

| Proveedor | Consumidor | Capacidad pública | Información mínima | Errores |
|---|---|---|---|---|
| Módulo Usuarios / Aplicación | Frontend protegido | `ensureMyPerson` — modificador idempotente | Tres datos de alta; actor desde Auth | autenticación, validación, cuenta no inicializada, vínculo inconsistente, concurrencia, persistencia |
| Módulo Usuarios / Aplicación | Frontend protegido | `getMyPerson` — consulta propia | Payload vacío; devuelve Persona o ausencia | autenticación, payload, cuenta no inicializada, vínculo inconsistente, persistencia |
| Módulo Personas | Coordinador de Aplicación | Crear/validar Persona | ID y datos propios | estado Persona inválido |
| Módulo Personas | Coordinador de Aplicación | Consultar Persona por referencia | DTO mínimo de Persona | Persona inexistente o inválida |

### 11.1 Contrato modificador aprobado

- **Nombre/export:** callable v1 `ensureMyPerson`, siguiendo `ensureMyAccount` y `getMyAccount`.
- **Actor:** `context.auth.uid` exclusivamente.
- **Semántica:** crear y enlazar si no existe vínculo; devolver la Persona válida existente si ya está vinculada.
- **Idempotencia:** no requiere clave cliente. La referencia del Usuario y la transacción constituyen el punto de convergencia.
- **Datos distintos en un reintento:** no actualizan Persona; el contrato devuelve lo persistido.

### 11.2 Contrato de consulta aprobado

- **Nombre/export:** callable v1 `getMyPerson`.
- **Payload:** ausente, `null` o `{}`.
- **Semántica:** `{ person: null }` cuando el Usuario válido no tiene vínculo; Persona cuando el vínculo es válido; error estable cuando es corrupto.
- No consulta por email, no lista Personas y no expone documentos o timestamps.

### 11.3 Modelo de lectura

El DTO de Persona propia es suficiente; no se crea colección/proyección de perfil. La composición Usuario–Persona ocurre en Aplicación o frontend mediante contratos separados, sin fabricar un Agregado común.

---

## 12. DTO de entrada y salida

### 12.1 DTO de entrada de `ensureMyPerson`

```typescript
type EnsureMyPersonInput = {
  firstName: string;
  lastName: string;
  contactEmail: string;
};
```

| Campo | Tipo | Obligatorio | Validación | Origen |
|---|---|---:|---|---|
| `firstName` | `string` | Sí | trim, 1–80 caracteres | Cliente |
| `lastName` | `string` | Sí | trim, 1–80 caracteres | Cliente |
| `contactEmail` | `string` | Sí | trim exterior, casing preservado, formato y máximo 254 | Cliente |

Propiedades adicionales producen `INVALID_PERSON_DATA`. UID, Usuario objetivo, `personaId`, rol, permisos y referencias deportivas/comerciales no forman parte del DTO.

### 12.2 DTO compartido de Persona propia

```typescript
type MyPerson = {
  personId: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
};
```

| Campo | Tipo | Semántica | Consumidor |
|---|---|---|---|
| `personId` | `string` | Identidad opaca de Persona | Frontend y contratos futuros |
| `firstName` | `string` | Nombre confirmado de Persona | Frontend |
| `lastName` | `string` | Apellido confirmado de Persona | Frontend |
| `contactEmail` | `string` | Email de contacto, no de acceso | Frontend |

### 12.3 DTO de salida del modificador

```typescript
type EnsureMyPersonResult = {
  outcome: "created" | "existing";
  person: MyPerson;
};
```

### 12.4 DTO de salida de consulta

```typescript
type GetMyPersonResult = {
  person: MyPerson | null;
};
```

### 12.5 Errores contractuales

| Código HTTPS | `details.reason` estable | Significado | Respuesta del frontend |
|---|---|---|---|
| `unauthenticated` | `AUTHENTICATION_REQUIRED` | Falta identidad válida | Reingreso |
| `invalid-argument` | `INVALID_PERSON_DATA` | Payload o datos inválidos | Marcar campos; conservar valores |
| `failed-precondition` | `ACCOUNT_NOT_INITIALIZED` | Auth existe pero Usuario no | Reintentar bootstrap de cuenta |
| `failed-precondition` | `PERSON_LINK_INCONSISTENT` | Referencia ausente, inválida o Persona mal formada cuando debía existir | Estado de cuenta inconsistente; no crear reemplazo |
| `aborted` | `CONCURRENT_MODIFICATION` | Firestore agotó reintentos por conflicto | Reintentar |
| `unavailable` | `PERSON_SERVICE_UNAVAILABLE` | Dependencia temporalmente no disponible | Reintentar sin perder formulario |
| `internal` | `PERSON_PERSISTENCE_FAILED` | Falla no clasificable de persistencia | Mensaje genérico y trazabilidad servidor |

Los mensajes internos, documentos, stack traces y tipos Firebase no forman parte del contrato.

---

## 13. Diseño físico Firestore

### 13.1 Colecciones y documentos

| Colección o ruta | Finalidad | Autoridad o proyección | Escritores | Lectores |
|---|---|---|---|---|
| `users/{firebaseUid}` | Cuenta digital y vínculo opcional | Autoridad del Agregado Usuario | Backend; E1-02 sólo añade `personaId` | Backend y lectura propia/administrativa legada transitoria |
| `personas/{personaId}` | Identidad personal/deportiva permanente | Autoridad del Agregado Persona | Backend E1-02 | Backend mediante contratos; cliente directo denegado |

**Ruta física aprobada para Persona:** colección raíz `personas`. Mantiene identidad y ciclo propios, evita anidarla bajo Usuario y permite que Personas futuras existan sin cuenta.

**Identificador aprobado:** Firestore auto-ID opaco, generado por backend antes de ejecutar la transacción y nunca elegido por cliente. No usar UID evita equiparar cuenta digital con Persona y admite Personas sin Usuario.

### 13.2 Campos

#### `personas/{personaId}`

```javascript
{
  nombre,
  apellido,
  emailContacto,
  createdAt
}
```

No se admiten otros campos en el alta E1-02.

| Campo | Tipo | Obligatorio | Propietario conceptual | Original/derivado | Regla |
|---|---|---:|---|---|---|
| `nombre` | string | Sí | Persona | Original | trim, 1–80 |
| `apellido` | string | Sí | Persona | Original | trim, 1–80 |
| `emailContacto` | string | Sí | Persona | Original | trim exterior, casing preservado, no único ni autoridad |
| `createdAt` | timestamp servidor | Sí | Auditoría técnica de Persona | Metadato | Fijado al crear |

#### Adición a `users/{firebaseUid}`

| Campo | Tipo | Obligatorio | Propietario conceptual | Original/derivado | Regla |
|---|---|---:|---|---|---|
| `personaId` | string | No | Usuario | Referencia original del vínculo | Ausente o ID opaco válido; inmutable en E1-02 |

El esquema base E1-01 permanece `nombre`, `email`, `photoURL`, `createdAt` más el nuevo `personaId` opcional. El documento Persona se limita a los cuatro campos indicados; cualquier metadato de edición pertenece a un incremento futuro.

### 13.3 Referencias

| Referencia | Destino | Motivo | Validación | ¿Forma parte del Agregado? |
|---|---|---|---|---|
| `users/{uid}.personaId` | `personas/{personaId}` | Vinculación opcional de cuenta con identidad Persona | Existencia y esquema dentro de operación/consulta backend | No; sólo identidad externa |

**Referencia inversa en Persona:** `NO APLICA` en E1-02. Duplicaría el vínculo, exigiría sincronización y crearía dos fuentes de verdad. La unicidad inversa se garantiza por la capacidad restringida de crear-y-vincular, no por un segundo campo.

### 13.4 Datos originales

| Dato | Propietario | Escritor autorizado | Confirmación | Consistencia |
|---|---|---|---|---|
| Nombre, apellido, email de contacto | Persona | Backend E1-02 tras validación de Persona | Commit transaccional | Inmediata para el alta |
| Vínculo `personaId` | Usuario | Backend E1-02 mediante `Usuario.linkPerson()` | Mismo commit físico | Inmediata con la Persona creada |

La misma transacción se justifica porque el resultado funcional aprobado es indivisible: E1-02 no admite Persona nueva huérfana ni vínculo nuevo roto. La atomicidad física no transfiere ownership ni crea un Aggregate Root conjunto.

### 13.5 Proyecciones o datos derivados

`NO APLICA`. No se crea documento de perfil, índice por email, referencia inversa, proyección Usuario–Persona, evento, alerta o copia de datos. Las vistas componen DTO de cuenta y DTO de Persona sin persistir una tercera autoridad.

### 13.6 Índices

| Consulta | Campos | Orden | Índice necesario | Justificación |
|---|---|---|---|---|
| Usuario propio | ID documental UID | `NO APLICA` | No | Lookup directo |
| Persona propia | ID desde `personaId` | `NO APLICA` | No | Lookup directo |
| Crear/reintentar | Dos lookups documentales | `NO APLICA` | No | Transacción por referencias exactas |

No se modifica `firestore.indexes.json`. No existe consulta por email, nombre, Usuario inverso ni colección completa.

---

## 14. Seguridad y autorización

| Operación | Visitante | Usuario | Owner | Administrador | Integrante | Sistema |
|---|---|---|---|---|---|---|
| `ensureMyPerson` propio | Denegado | Permitido si es la cuenta autenticada | Equivale al propio Usuario | Sin privilegio adicional | `NO APLICA` | Coordina y escribe |
| `getMyPerson` propio | Denegado | Permitido si es la cuenta autenticada | Equivale al propio Usuario | Sin privilegio adicional | `NO APLICA` | Lee |
| Elegir otro Usuario | Denegado | Denegado | Denegado | Denegado | Denegado | Sin contrato público |
| Reclamar Persona existente | Denegado | Denegado | Denegado | Denegado | Denegado | Fuera de alcance |
| Firestore directo `personas` | Denegado | Denegado | Denegado | Denegado | Denegado | Admin SDK únicamente |
| Firestore directo `users.personaId` | Denegado | Denegado | Denegado | Denegado | Denegado | Admin SDK únicamente |

### 14.1 Separación de condiciones

- **Autenticación:** Firebase Authentication verifica quién es el Usuario.
- **Autorización funcional:** `self-person-bootstrap` permite actuar sólo sobre la propia cuenta y sólo bajo las reglas de vínculo.
- **Habilitación comercial:** `NO APLICA`.
- **Validez de dominio:** Usuario y Persona protegen sus invariantes por separado.

### 14.2 Reglas Firestore aprobadas

- Añadir `match /personas/{personaId}` con `allow read, write: if false` para clientes.
- Conservar para `users/{userId}` las lecturas transitorias aprobadas y `allow create, update, delete: if false`.
- No habilitar actualización cliente parcial de `personaId`.
- Admin SDK en Functions omite reglas; por ello la identidad, payload, invariantes, existencia referenciada y atomicidad se validan en backend.
- El rol global legado `users.roles == "admin"` no se consulta para `self-person-bootstrap`.

### 14.3 Protección frente al cliente

- Payload cerrado a tres propiedades.
- UID sólo desde `context.auth`.
- ID de Persona generado por backend.
- No se acepta email de acceso como prueba de identidad; el email de contacto sólo se valida como dato.
- No se confía en `personaId`, rol, permisos, Grupo, Membresía, Plan o Suscripción enviados.
- Logs del servidor no deben registrar el email completo ni los datos personales del payload.

---

## 15. Repositorios y adaptadores

| Componente aprobado | Capa | Contrato | Implementación | Agregado o consulta |
|---|---|---|---|---|
| `PersonRepository` | Dominio/Aplicación port | `getById`, `create` sólo mediante la sesión específica de bootstrap cuando hay commit conjunto | `FirestorePersonRepository` | Persona |
| `UserRepository` ampliado | Dominio/Aplicación port | `getById`, `linkPerson` sólo mediante la sesión específica de bootstrap cuando hay commit conjunto | ampliación de `FirestoreUserRepository` | Usuario |
| `SelfPersonBootstrapUnitOfWork` | Aplicación port específico | Confirmar exclusivamente una Persona nueva y su vínculo inicial con el Usuario | `FirestoreSelfPersonBootstrapUnitOfWork` | Coordinación física específica, no Agregado ni Repositorio |
| `CallableAuthenticatedIdentity` | Infraestructura | Derivar UID autenticado | Reutilización de `identityFromCallableContext` | Identidad técnica |
| `PersonCallable` | Infraestructura | Validar payload, mapear errores y DTO | Handler callable v1 específico | Transporte |
| `personService.ts` | Frontend | `ensureMyPerson`, `getMyPerson`, mensajes | Firebase callable adapter | Contrato público |

### Restricciones

- Un repositorio por Agregado; no crear repositorio genérico ni `IdentityRepository` compartido.
- `SelfPersonBootstrapUnitOfWork` se configura en el composition root y sólo recibe o persiste los estados válidos producidos por Usuario y Persona. No expone una transacción Firestore genérica, callback arbitrario, repositorios, documentos crudos ni operaciones sobre otros Agregados.
- El puerto y su adaptador están limitados a crear una Persona nueva y establecer el vínculo inicial en todo-o-nada. No habilitan invitación, edición, desvinculación, reclamo de Persona existente o Membresía y no contienen reglas de dominio.
- El Módulo Usuarios no importa `FirestorePersonRepository` y el Módulo Personas no importa `FirestoreUserRepository`; la colaboración atraviesa capacidades públicas y el adaptador específico de coordinación.
- El Servicio de Aplicación no accede directamente a `db.collection()`.
- El frontend no accede a los Repositorios ni a Firestore para este flujo.
- Los módulos externos futuros consumen contratos, no `PersonRepository`.

### Ubicación candidata

```text
volley-ranking-system/functions/src/persons/domain/person.js
volley-ranking-system/functions/src/persons/application/personDto.js
volley-ranking-system/functions/src/persons/infrastructure/firestorePersonRepository.js
volley-ranking-system/functions/src/users/domain/user.js
volley-ranking-system/functions/src/users/infrastructure/firestoreUserRepository.js
volley-ranking-system/functions/src/application/selfPersonBootstrapService.js
volley-ranking-system/functions/src/application/selfPersonBootstrapErrors.js
volley-ranking-system/functions/src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork.js
volley-ranking-system/functions/src/infrastructure/selfPersonBootstrapCallable.js
volley-ranking-system/functions/callables/ensureMyPerson.js
volley-ranking-system/functions/callables/getMyPerson.js
```

La ubicación mantiene dominio y repositorio de cada Aggregate Root dentro de su módulo real y coloca únicamente el Servicio de Aplicación transversal y el adaptador transaccional específico en capas técnicas raíz ya compatibles con la estructura `functions/src`. Esas carpetas no representan un nuevo dominio o módulo de negocio. Ningún lado importa la infraestructura interna del otro.

---

## 16. Transacción y unidad de consistencia

- **Aggregate Roots modificados:** una Persona nueva y el Usuario autenticado.
- **Unidades de consistencia lógicas:** una Persona y un Usuario, independientes.
- **Límite transaccional físico aprobado:** una transacción Firestore de backend sobre `users/{uid}` y, sólo al crear, `personas/{generatedId}`.
- **Puerto transaccional:** `SelfPersonBootstrapUnitOfWork`, específico de este caso y sin API de transacción genérica.
- **Datos confirmados conjuntamente:** estado inicial de Persona y referencia `Usuario.personaId`.
- **Validaciones externas previas:** autenticación y forma del payload. La lectura autoritativa de Usuario/vínculo y Persona referenciada ocurre dentro de la transacción.
- **Orden Firestore:** todas las lecturas antes de cualquier escritura; luego create de Persona y update acotado de Usuario.
- **Concurrencia:** dos transacciones leen el mismo Usuario sin vínculo; la primera confirma y la segunda se reejecuta, observa `personaId` y devuelve la Persona existente. El ID reservado por el intento perdedor nunca se confirma.
- **Idempotencia:** `personaId` persistido es el punto de convergencia; un reintento no vuelve a crear ni actualiza datos.
- **Respuesta perdida:** el siguiente intento lee Usuario y Persona dentro de la transacción/consulta y devuelve `existing`.
- **Vínculo corrupto:** si `personaId` existe pero Persona no, la operación aborta con `PERSON_LINK_INCONSISTENT`; no se confirma una Persona sustituta.
- **Fallo parcial observable:** ninguno para la creación inicial; Firestore confirma ambos documentos o ninguno. Un fallo de respuesta posterior al commit se resuelve por reintento.
- **Operaciones posteriores separadas:** `NO APLICA` en E1-02.

### Justificación arquitectónica

La arquitectura establece que varios Agregados no forman automáticamente una unidad común y que la atomicidad sólo se amplía cuando una regla de negocio la exige. Aquí la decisión funcional exige simultáneamente operación completa, ausencia de Persona huérfana, ausencia de vínculo roto, idempotencia y convergencia concurrente. La transacción física mínima satisface esa regla sin introducir una transacción distribuida, Saga, Process Manager, outbox, estado pendiente o compensación.

La transacción no fusiona los Agregados porque:

- cada raíz valida y produce exclusivamente su propio estado;
- Persona no se almacena dentro de Usuario y Usuario no se almacena dentro de Persona;
- existen dos repositorios y dos documentos autoritativos;
- la única relación persistida es un ID externo;
- no existe un Aggregate Root coordinador ni repositorio compartido;
- `SelfPersonBootstrapUnitOfWork` sólo confirma estados ya validados y no puede modificar otros Agregados;
- futuras operaciones de Persona y Usuario mantienen ciclos y transacciones propios.

Esta excepción física queda limitada a la creación-vinculación inicial. No autoriza transacciones globales para invitaciones, edición, desvinculación, Membresías u otros flujos.

---

## 17. Eventos y efectos posteriores

`NO APLICA` para E1-02.

No se requiere Evento de Dominio, EventEmitter, email, Web Push, alerta, outbox, Saga, Process Manager, proyección ni tarea de reconciliación. El contrato síncrono y la transacción Firestore satisfacen completamente el resultado funcional.

Un evento futuro de Persona creada sólo podrá incorporarse cuando exista un consumidor real y se defina si el efecto es obligatorio y recuperable. No forma parte de este incremento.

---

## 18. Plan de pruebas

| Nivel | Casos mínimos | Herramienta o entorno | Evidencia requerida |
|---|---|---|---|
| Dominio | Persona válida; trim; límites; email inválido; email no único; `Usuario.linkPerson` una sola vez; rechazo de reemplazo | Node Test Runner | Casos y resultados |
| Aplicación | crear; existente; cuenta ausente; vínculo inválido/inexistente; datos distintos en reintento; errores de repositorio; autorización sin rol/Plan | Node Test Runner con dobles | Casos y resultados |
| Contrato | payload exacto; campos extra; tipos; UID sólo desde contexto; DTO exacto; `details.reason`; consulta nullable | Node Test Runner | Casos y snapshots semánticos |
| Integración | repositorios por raíz; timestamps; esquema exacto; transacción todo-o-nada; consulta propia | Firestore Emulator/Admin SDK | Documentos y asserts |
| Reglas | visitante/propio/ajeno/admin; lectura y toda escritura directa de `personas` denegadas; update de `users.personaId` denegado; regresión `pendingAlerts` | Firestore Emulator | Matriz permitidos/denegados |
| Frontend | inicial, vacío, formulario, validación, envío, éxito, existente, error recuperable, inconsistente, doble activación, responsive y accesibilidad | Pruebas de componentes si se habilita herramienta; arquitectura + UAT reproducible como mínimo | Capturas/checklist y resultados |
| Arquitectura | Persona fuera de Usuario; repositorios separados; frontend sin writer; sin búsqueda/email único/inversa; exports exactos; CU-006 parcial | Node Test Runner y búsquedas `rg` | Lista de reglas aprobadas |
| Recuperación | dos llamadas concurrentes; respuesta perdida; conflicto agotado; caída antes del commit; vínculo corrupto; reintento tras backend restablecido | Unitarias + Emulator | Una Persona, un vínculo, sin huérfana |
| Regresión | E1-01, E0, mantenimiento, lint, typecheck, sintaxis y build | scripts existentes | Gate completo |

### Casos negativos imprescindibles

- `firebaseUid`, `userId`, `personaId`, rol, permisos, Grupo o Plan enviados por cliente.
- rol global `admin` intentando seleccionar otro Usuario.
- cliente autenticado intentando crear, actualizar, borrar o leer directamente Persona.
- mismo email de contacto para dos Personas creadas por Usuarios distintos: ambas válidas, sin asociación automática.
- `users/{uid}.personaId` apuntando a documento inexistente.
- documento Persona sin un campo obligatorio o con tipo incorrecto.
- dos requests simultáneos con payloads distintos: una Persona confirmada y ambas respuestas convergen a ella.

### Comandos previstos

```text
npm run quality:lint
npm run quality:typecheck
npm run quality:functions:syntax
npm run quality:test
npm --prefix volley-ranking-system/functions run test:maintenance
npm run quality:build
npm run quality:stage0
git diff --check
```

La implementación deberá extender `run-unit-tests.js` por descubrimiento automático y añadir explícitamente la nueva suite de emulador a `run-emulator-tests.js`, conservando sus guardas contra Firebase remoto.

---

## 19. Componentes actuales reutilizados

| Componente | Reutilización | Adaptación requerida | Riesgo |
|---|---|---|---|
| `src/users/domain/user.js` | Aggregate Root Usuario mínimo | Añadir `personaId` opcional y `linkPerson()` sin incorporar datos Persona | No alterar bootstrap E1-01 |
| `accountService.js` / `accountDto.js` | Consulta/materialización de cuenta | Conservar contratos; no añadir Persona a `MyAccount` | Evitar DTO combinado autoritativo |
| `callableAuthenticatedIdentity.js` | Derivación segura de UID | Reutilizar identidad; validador de payload distinto | No aceptar actor cliente |
| `accountCallable.js` | Patrón de mapeo `HttpsError` | Extraer/reutilizar sólo si no oculta `details.reason`; de otro modo handler específico | Abstracción prematura |
| `firestoreUserRepository.js` | Acceso aislado a Usuario | Añadir lectura/hidratación de `personaId` y operación transaccional acotada | No usar merge indiscriminado |
| `ensureMyAccount` / `getMyAccount` | Convención callable v1/export | Conservar sin cambio funcional | No sincronizar cuenta con Persona |
| `functions/index.js` | Export explícito | Añadir `ensureMyPerson` y `getMyPerson` | Carga/sintaxis de todos los exports |
| `firestore.rules` | Backend-only para `users` | Añadir deny-all de `personas`, preservar reglas E1-01 | No ampliar lectura cliente |
| `AuthProvider` | Sesión y cuenta E1-01 | Integrar `PersonProvider` separado en layout raíz/protegido | No bloquear cuenta por fallo Persona |
| `accountService.ts` / `MyAccount.ts` | Patrón de callable/DTO frontend | Crear `personService.ts` y `MyPerson.ts`, no ampliar `MyAccount` con datos personales | Evitar sincronización implícita |
| Dashboard | Punto visible no bloqueante | Sustituir tarjeta “No disponible” por invitación/estado Persona | No convertirla en gate global |
| Navbar / AppSidebar | Navegación protegida | Añadir acceso a `/profile/person` desktop y móvil | Estados coherentes |
| `AccountInitializationError` | Patrón accesible de recuperación | Reusar estilo/comportamiento, no semántica de cuenta | Distinguir cuenta de Persona |
| Runners y guardas E0/E1-01 | Infraestructura segura | Añadir suites E1-02 | Mantener egress bloqueado y proyecto `demo-*` |

### Evidencia de código inspeccionado

Se inspeccionaron, entre otros:

- `functions/src/users/{domain,application,infrastructure}` completos;
- `functions/callables/ensureMyAccount.js`, `getMyAccount.js` e `index.js`;
- `firestore.rules`, `firestore.indexes.json`, configuraciones y paquetes;
- pruebas `accountDomain`, `accountService`, `accountInfrastructure`, `accountArchitecture` y `accountE1`;
- runners de unitarias, emuladores y mantenimiento;
- `MyAccount.ts`, ambos tipos `UserDoc`, `accountService.ts`, `legacyUserService.ts`, `AuthProvider.tsx` y `useAuth.ts`;
- layouts protegido/administrativo/de perfil, dashboard, onboarding, Navbar y AppSidebar;
- componentes de perfil y consumidores de Grupo, Partido, Torneo y ranking localizados mediante búsquedas globales.

---

## 20. Estructuras anteriores retiradas

| Estructura | Lectores anteriores | Escritores anteriores | Reemplazo | Evidencia de retiro |
|---|---|---|---|---|
| Tarjeta “Ficha deportiva / No disponible” estática | Dashboard | Ninguno | Estado real de `getMyPerson` e invitación a `/profile/person` | Prueba frontend/arquitectura |
| Ausencia de acceso a identidad dentro de “Mi perfil” | Navbar y AppSidebar | Ninguno | Enlace “Mi identidad” | UAT desktop/móvil |
| Uso potencial de campos de cuenta como datos del nuevo formulario | No existe aún en E1-02 | No existe | Formulario inicial vacío salvo decisión explícita del actor; no copiar `users.nombre/email` automáticamente | Prueba de arquitectura/contrato |

### Compatibilidad que debe conservarse temporalmente

- `legacyUserService.ts` y `AuthProvider.userDoc` se conservan porque roles globales y consumidores deportivos no migrados aún dependen de ellos. No participan en la decisión de Persona ni escriben el vínculo.
- `users.nombre`, `users.email` y `users.photoURL` se conservan como cuenta digital E1-01.
- `users.roles`, `posicionesPreferidas`, `estadoCompromiso` y `onboarded` pueden existir en fixtures/legado, pero E1-02 no los lee ni escribe para alta, consulta o autorización de Persona.
- `/onboarding` y `/profile/info` conservan la redirección neutral creada por E1-01; no se reinstala el formulario legado.
- `ProfileHeader`, `EditionProfile`, `PreferredPositionsEditor`, lecturas de `users` en Grupo/Torneo/Partido y servicios `userGameService`, `rankingService`, triggers de participación y APIs legadas permanecen como deuda para incrementos propietarios posteriores.

### Residuo identificado que E1-02 no debe reinterpretar

`MatchCard.tsx` todavía redirige a `/onboarding` según `userDoc.onboarded`. Es una contradicción técnica con la separación objetivo, pero migrar la participación de Partido a Persona/Membresía excede E1-02. Debe registrarse en pruebas/deuda y no reemplazarse silenciosamente por `personaId` hasta que el caso de uso deportivo defina su precondición propia.

### Condición de retiro posterior

Los lectores deportivos de `users.nombre`, `users.email`, posiciones, compromiso y `onboarded` se retiran flujo por flujo cuando Persona, Membresía, Partido, Torneo, ranking y autorización contextual expongan sus contratos aprobados. E1-02 prohíbe nuevos consumidores, pero no declara esa migración global completada.

---

## 21. Checkpoint y rollback

- **Commit inicial:** `e44c8d061fe1ff15b2141d7ec1cfc7fb804eb4a4`.
- **Rama:** `feat/e1-02-persona-vinculacion-inicial`.
- **Upstream inicial:** alineado `0/0`.
- **Estado de pruebas inicial:** baseline E1-01 cerrado: lint sin regresiones, typecheck aprobado, sintaxis 108/108, unitarias/tooling/arquitectura 47/47, emuladores 32/32, mantenimiento 7/7 y build 18/18, según `E1-01-cierre.md`. Antes de implementar se debe reejecutar el gate para confirmar el nuevo HEAD.
- **Checkpoint intermedio futuro:** commit de implementación local sólo después de aprobar dominio, aplicación, contrato y emuladores; no forma parte de la intervención de definición.
- **Rollback de código:** revertir exclusivamente los commits E1-02 o abandonar la rama antes de integración; no restaurar onboarding deportivo ni habilitar escrituras cliente.
- **Tratamiento de datos de prueba:** detener y reinicializar Auth/Firestore/Functions Emulator; los datos son sintéticos y descartables.
- **Datos remotos:** `NO APLICA`; no se despliega ni migra.
- **Rollback de datos confirmados:** en emulador, reinicialización completa. No usar doble escritura, referencia inversa ni copia en Usuario como mecanismo de rollback.
- **Condición para interrumpir:** rama/árbol incorrectos; gate base regresivo; contradicción normativa; imposibilidad de todo-o-nada; acceso remoto; necesidad de reclamar Persona existente; escritura cliente; o aparición de Persona huérfana/vínculo roto en pruebas.
- **Condición para reanudar:** causa resuelta y documentada, ficha revisada si cambia una decisión, árbol controlado, baseline y pruebas de recuperación aprobados.

---

## 22. Evidencia de cierre

E1-02 sólo podrá pasar a `VERIFICADO` o `CERRADO` cuando adjunte:

- commits de implementación y correcciones;
- diff completo y listado de archivos;
- pruebas de dominio, aplicación, contrato, integración, reglas, frontend, arquitectura y recuperación aprobadas;
- resultado completo de Firebase Emulator Suite con guardas de entorno;
- baseline lint sin regresiones, typecheck, sintaxis Functions y build;
- contratos finales `ensureMyPerson` y `getMyPerson`, DTO y catálogo de errores;
- esquema efectivo de `users` y `personas`, y reglas verificadas;
- evidencia de concurrencia, respuesta perdida, vínculo corrupto y ausencia de Persona huérfana;
- evidencia frontend de estados inicial, vacío, formulario, validación, envío, éxito, existente, error, doble activación e inconsistencia en móvil/escritorio;
- búsqueda global de escritores y prueba de backend-only;
- evidencia de que no se agregaron índices ni dependencias innecesarias;
- evidencia de que `legacyUserService` y demás compatibilidad conservada no participan en Persona;
- matriz de trazabilidad que mantenga CU-006 parcial y CU-007 excluido;
- deuda aceptada y condición concreta de retiro;
- procedimiento de rollback ejercitado en emuladores;
- confirmación de ausencia de consulta, escritura o despliegue Firebase remoto.

### Declaración final de esta ficha

- **Estado final del incremento:** `NO APLICA`; E1-02 no está implementado, verificado ni cerrado.
- **Estado documental actual:** `LISTO PARA IMPLEMENTAR`.
- **Criterios incumplidos:** no evaluables hasta la implementación.
- **Deuda aceptada:** lectores/escritores deportivos legados inventariados en §20; no se declaran resueltos.
- **Responsable de cierre:** pendiente.
- **Fecha de cierre:** pendiente.

### Decisiones físicas finales aprobadas

1. `personas/{personaId}` como ruta raíz y autoridad de Persona.
2. Auto-ID opaco generado por backend.
3. Persona mínima `{ nombre, apellido, emailContacto, createdAt }`, con casing del email preservado después de `trim` exterior.
4. `users/{uid}.personaId` como única fuente del vínculo, sin inversa.
5. Callables v1 `ensureMyPerson` y `getMyPerson` con DTO cerrados.
6. Transacción Firestore mínima para creación más vínculo.
7. Repositorios separados y `SelfPersonBootstrapUnitOfWork` específico, sin transacción genérica expuesta.
8. Reglas deny-all cliente para `personas` y escrituras de `users` preservadas en backend-only.
9. Sin índices, eventos, proyecciones, Saga, outbox o colección de coordinación.
10. `/profile/person`, `PersonProvider` no bloqueante e invitación desde dashboard/navegación.

### Decisiones abiertas

No se identifican decisiones funcionales o físicas bloqueantes. Sólo quedan detalles visuales de implementación que no pueden alterar contrato, seguridad, ownership, consistencia o alcance.

### Recomendación de preparación

Las decisiones físicas fueron revisadas y aprobadas con correcciones obligatorias incorporadas. La ficha queda en `LISTO PARA IMPLEMENTAR`; este estado no declara el incremento implementado, verificado ni cerrado.

**Veredicto documental:** `E1-02 FICHA LISTA PARA IMPLEMENTAR`.
