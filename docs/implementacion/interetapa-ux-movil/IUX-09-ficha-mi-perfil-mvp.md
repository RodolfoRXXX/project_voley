# IUX-09 — Mi perfil para el MVP

## Estado de la ficha

- **Estado:** `CERRADO — UAT HUMANA APROBADA; INTEGRACIÓN AUTORIZADA`.
- **Fecha:** 17 de noviembre de 2026.
- **Base verificada:** `dev@3f518b214feb514005e30402cbc4888a2848f2d9`, integración de IUX-08.
- **Etapa del roadmap:** interetapa `IUX` entre E3 y E4.
- **Siguiente identificador disponible:** `IUX-09`.
- **Alcance de este documento:** definición funcional y técnica; no autoriza implementación,
  versionado, push, despliegue, migraciones ni cambios de datos.
- **Estado local observado:** `visuals/` sin seguimiento. Se preserva íntegramente y queda fuera de
  este incremento.
- **Aprobación humana:** UAT funcional y ajuste visual final aprobados el 17 de noviembre de 2026
  sobre el BUILD_ID `2qn119a5HcGb_Qg4yvYWL`.

IUX-08 es el último incremento IUX integrado en la base y Documento 5 registra decisiones hasta
`D5-078`. No existe otra ficha `IUX-09`; por lo tanto, `IUX-09` es el identificador siguiente.

## 1. Objetivo

Reunir la información y los accesos propios de una Cuenta bajo **Mi perfil**, con tres subentradas
idénticas en el sidebar de escritorio y el drawer móvil:

1. **Resumen**;
2. **Ficha personal**;
3. **Mis obligaciones**.

El incremento compone contratos existentes de Cuenta, Persona propia y obligaciones. No fusiona
Cuenta y Persona, no infiere datos personales desde nombres visibles y no crea una segunda fuente
económica.

## 2. Evidencia relevada

### 2.1 Rutas y navegación vigentes

| Superficie | Ruta o componente actual | Evidencia y decisión IUX-09 |
| --- | --- | --- |
| Navegación compartida | `src/lib/navigation/accountNavigation.ts` | Es la única fuente consumida por escritorio y móvil. Hoy `Mis obligaciones` es raíz y `Mi perfil` sólo contiene `Ficha personal`. Se modifica esta fuente para evitar divergencias. |
| Sidebar | `src/components/layout/AppSidebar.tsx` | Consume `visibleAccountNavigationItems`; abre `Mi perfil` automáticamente en rutas `/profile/*`. Debe reconocer también `/dashboard/obligations` como hija activa. |
| Drawer móvil | `src/components/layout/Navbar.tsx` | Consume la misma fuente, cierra el drawer al navegar y soporta submenús. Se preserva el patrón. |
| Resumen histórico | `/profile/info` | Existe, pero hoy redirige a `/dashboard` desde su página y desde `profile/layout.tsx`. IUX-09 la convierte en el destino canónico de Resumen. |
| Ficha personal | `/profile/person` | Ruta canónica vigente. Se conserva el deep-link. |
| Mis obligaciones | `/dashboard/obligations` | Ruta canónica vigente. Se conserva el deep-link, query string y comportamiento completo. |
| Economía personal | `/dashboard/groups/{groupId}/personal-economy` y compatibilidad desde `/membership` | Sus accesos a `/dashboard/obligations` y parámetros `paymentId`, `groupId`, `membershipId`, `returnTo` se preservan. |

No se renombran ni trasladan físicamente `/profile/person` o `/dashboard/obligations`. La
subentrada sólo cambia su ubicación visual dentro del menú. `/profile/info` deja de ser una
redirección neutral y pasa a ser una pantalla real; `/profile` puede redirigir a `/profile/info`
como alias conveniente, sin convertirse en una cuarta entrada.

### 2.2 Cuenta propia

| Pieza | Contrato observado |
| --- | --- |
| Callables | `ensureMyAccount({})` y `getMyAccount({})`, autenticados por `context.auth.uid` |
| DTO frontend | `MyAccount { userId, displayName, accessEmail, accountPhotoUrl }` |
| Provider | `AuthProvider` inicializa Cuenta al cambiar el UID, limpia Cuenta previa y expone `account`, estados y reintento |
| Persistencia | `users/{uid}` contiene `nombre`, `email`, `photoURL`, `createdAt` y puede contener `personaId` |
| DTO backend | `toMyAccountDto` no expone actualmente `createdAt` ni `personaId` |

Fuentes autorizadas para el Resumen:

| Dato mostrado | Fuente | Regla |
| --- | --- | --- |
| Foto | `MyAccount.accountPhotoUrl` | Mostrar si es URL no vacía; si no, usar el avatar neutro vigente. No tomar una foto legacy posterior como autoridad. |
| Nombre visible de Cuenta | `MyAccount.displayName` | Rotular como **Nombre de la cuenta**. No partirlo ni presentarlo como nombre legal. |
| Correo de acceso | `MyAccount.accessEmail` | Rotular como **Correo de acceso**. No sustituirlo por `MyPerson.contactEmail`. |
| Fecha de creación de Cuenta | `users/{uid}.createdAt`, expuesta por el contrato de Cuenta | Debe ser fecha de Cuenta. Nunca usar `personas.createdAt`, fecha de vínculo, Auth metadata o la fecha actual. |
| Nombre personal | `MyPerson.firstName` | Sólo cuando `getMyPerson` devuelve Persona. |
| Apellido personal | `MyPerson.lastName` | Sólo cuando `getMyPerson` devuelve Persona; jamás derivarlo separando `displayName`. |
| Correo de contacto | `MyPerson.contactEmail` | Pertenece a Ficha personal; puede mostrarse diferenciado del correo de acceso. |
| Existencia del vínculo | resultado de `getMyPerson` | `person !== null` confirma vínculo válido; `null` confirma ausencia. Un error no equivale a ausencia. |

### 2.3 Persona propia

| Pieza | Contrato observado |
| --- | --- |
| Consulta | `getMyPerson({}) -> { person: MyPerson | null }` |
| Alta idempotente | `ensureMyPerson({ firstName, lastName, contactEmail }) -> { outcome: "created" | "existing", person }` |
| DTO | `MyPerson { personId, firstName, lastName, contactEmail }` |
| Estado compartido | `PersonProvider`: `idle`, `loading`, `empty`, `ready`, `error`, `inconsistent`, `sessionInvalid` |
| Formulario vigente | `PersonBootstrapForm` en `/profile/person` |

El contrato vigente permite consultar y crear/vincular la Persona propia. No permite editar nombre,
apellido o correo de una Persona ya creada. En esta ficha **Actualizar** significa reconsultar el
estado con `getMyPerson`, usando el patrón visual `RefreshButton`; no significa editar Persona.

### 2.4 Mis obligaciones

| Pieza | Contrato observado |
| --- | --- |
| Consulta propia | `listMyObligations({ status, pageSize?, cursor? })` |
| Pendientes | El servicio frontend fuerza por defecto `status: "OPEN"`; backend selecciona estados `PENDING` y `PARTIAL` |
| Página | `{ items: Obligation[], nextCursor?: string }`; `pageSize` por defecto 20, máximo 50 |
| Orden backend | `dueDate desc, __name__ desc` para estados no anulados |
| Autorización | Cuenta autenticada con Persona propia; backend deriva `personId` desde la Cuenta |
| Listado completo | `MyObligationsView` en `/dashboard/obligations`, con pendientes, saldadas, anuladas, historial, detalle y aviso de pago |

El contrato es paginado y no entrega total. El Resumen no recorre páginas, no suma saldos globales y
no afirma una cantidad total.

## 3. Alcance funcional

### 3.1 Navegación Mi perfil

La fuente compartida queda conceptualmente así:

```text
Mi perfil
├── Resumen             /profile/info
├── Ficha personal      /profile/person
└── Mis obligaciones    /dashboard/obligations
```

- `Mis obligaciones` deja de aparecer duplicada como entrada raíz y pasa a ser subentrada.
- Los tres destinos conservan navegación directa aunque el menú esté cerrado.
- El padre `Mi perfil` aparece abierto y activo para cualquiera de sus tres destinos, incluidas las
  rutas profundas o parámetros admitidos por Mis obligaciones.
- En móvil, abrir/cerrar el submenú mantiene controles de al menos 44 px y al elegir una subentrada
  se cierra el drawer con el comportamiento vigente.
- No se agregan contadores ni badges al menú.

### 3.2 Resumen — `/profile/info`

Al entrar se componen Cuenta y Persona sin bloquear una fuente por el fallo de la otra.

#### Bloque Cuenta

Muestra:

- foto o avatar neutro;
- **Nombre de la cuenta** desde `displayName`;
- **Correo de acceso** desde `accessEmail`;
- **Cuenta creada el** desde el nuevo campo contractual `accountCreatedAt`, cuando esté disponible.

La pantalla no presenta `displayName` como nombre + apellido. Si no hay Persona, nombre personal y
apellido personal se muestran como **No disponibles hasta crear la ficha personal** o se omiten del
bloque Cuenta; nunca se fabrican.

#### Bloque Ficha personal

- Durante `idle/loading`: indicador accesible **Cargando ficha personal…**.
- Con `ready`: muestra nombre, apellido y correo de contacto desde `MyPerson`, más el enlace
  **Ver ficha personal** a `/profile/person`.
- Con `empty`: explica brevemente que la ficha identifica a la persona dentro de SPORTEXA y
  habilita recorridos personales; ofrece **Crear mi ficha personal** a `/profile/person`.
- Con error: informa que no pudo comprobarse el vínculo y ofrece **Reintentar**. No muestra CTA de
  alta ni texto de ausencia.
- `inconsistent` y `sessionInvalid` mantienen sus mensajes específicos y no se degradan a vacío.

#### Vista breve de pagos pendientes

- Usa una única llamada `listMyObligations({ status: "OPEN", pageSize: 3 })`.
- Si hay resultados, muestra hasta tres filas con concepto, grupo si viene disponible, vencimiento,
  estado y saldo pendiente ya presentes en `Obligation`.
- El encabezado/copia dice **Vista parcial de obligaciones pendientes**. No muestra total de
  obligaciones ni total monetario, aun cuando `nextCursor` esté ausente.
- Ofrece **Ver todas mis obligaciones** a `/dashboard/obligations`.
- No sigue `nextCursor`, no hace count, no recorre todas las páginas y no reordena en frontend.
- Si la primera página está vacía, muestra **No tenés obligaciones pendientes**.
- Durante la consulta muestra skeleton o `role="status"` sin falso vacío.
- Ante error muestra un bloque independiente con **No pudimos cargar tus obligaciones pendientes**
  y **Reintentar**; conserva operativos Cuenta y Ficha personal.
- Sin Persona confirmada no invoca el contrato económico: explica que primero se necesita la ficha
  personal y enlaza a su creación. Si Persona está en error, no interpreta ese error como ausencia.

### 3.3 Ficha personal — `/profile/person`

- Consulta `getMyPerson` al entrar, aun cuando exista estado previo en memoria, para evitar una
  ficha obsoleta después de navegación o alta.
- Con Persona válida muestra `firstName`, `lastName` y `contactEmail`.
- Ofrece **Actualizar** con `RefreshButton`; reconsulta y reemplaza el resultado sólo si pertenece a
  la Cuenta todavía activa.
- Con ausencia confirmada explica para qué sirve la ficha y ofrece el formulario vigente con el CTA
  textual **Crear mi ficha personal**.
- Conserva el formulario actual y `ensureMyPerson`; no crea un segundo formulario ni un writer.
- Tras alta confirmada muestra la ficha y el mensaje de éxito. Al volver a Resumen, éste debe
  reflejar inmediatamente la misma Persona y, además, revalidarla al montar/entrar.
- Un error recuperable ofrece reintento; vínculo inconsistente y sesión inválida mantienen estado
  propio. Ninguno muestra el formulario como si no existiera Persona.
- No se incorpora edición de datos personales en IUX-09 porque no existe contrato autorizado para
  actualizar una Persona ya creada.

#### Ubicación futura para fichas pendientes de vinculación

Dentro de **Ficha personal**, después del bloque de Persona propia y separado visual y
semánticamente, se reserva la sección **Fichas pendientes de vinculación**. IUX-09 sólo define su
ubicación: no inventa consulta, contador, estado vacío, permisos ni CTA.

Invitaciones, correos, fichas creadas por un Owner, reclamo de identidad, selección, aceptación,
rechazo y fusión pertenecen al incremento **Agregar integrantes**. No se implementan ni se simulan
desde Mi perfil. Hasta que ese incremento defina un contrato autorizado, la sección reservada no
debe presentarse como funcional ni afirmar que no hay pendientes.

### 3.4 Mis obligaciones — `/dashboard/obligations`

- Se incorpora el acceso vigente como tercera subentrada de Mi perfil.
- Se preservan `MyObligationsView`, su paginación, estados, selección, historial, detalles y aviso de
  pago.
- Se preservan los deep-links con `paymentId`, `groupId`, `membershipId` y `returnTo`.
- Se preserva el enlace de retorno a Economía personal y cualquier acceso desde
  `/dashboard/groups/{groupId}/personal-economy` o su compatibilidad histórica.
- El Resumen no reemplaza ni comparte estado de selección con el listado completo.

## 4. Contratos propuestos y preservados

### 4.1 Ampliación aditiva de Cuenta

Para mostrar la fecha correcta se propone ampliar ambos resultados de Cuenta, sin reemplazar campos:

```ts
type MyAccount = {
  userId: string;
  displayName: string;
  accessEmail: string;
  accountPhotoUrl: string | null;
  accountCreatedAt: string | null; // ISO-8601 derivado sólo de users.createdAt
};
```

Reglas:

- `accountCreatedAt` se serializa desde un Timestamp válido de `users/{uid}.createdAt`.
- No se usa `personas.createdAt`, Auth `metadata.creationTime`, `updatedAt` ni reloj cliente.
- Para cuentas nuevas, `ensureMyAccount` debe devolver la marca persistida/autoritativa; no puede
  fabricar una fecha local. La forma de obtenerla tras el `serverTimestamp` es una decisión de
  implementación del adaptador (relectura o resultado autoritativo equivalente).
- Para datos históricos incompatibles o una marca todavía no materializada, devuelve `null` y la
  UI omite la fila o indica **Fecha no disponible** sin fallar toda la Cuenta.
- `personaId` no se expone para deducir existencia: esa autoridad sigue siendo `getMyPerson`.

### 4.2 Persona

Se preservan sin cambios de payload:

```ts
getMyPerson({}) -> { person: MyPerson | null }
ensureMyPerson({ firstName, lastName, contactEmail })
  -> { outcome: "created" | "existing", person: MyPerson }
```

El provider necesita una operación pública de reconsulta —por ejemplo `refreshMyPerson()`— que use
`getMyPerson`, conserve la taxonomía de estados y descarte resultados de otra Cuenta. No es un
contrato backend nuevo.

### 4.3 Obligaciones

Se preserva:

```ts
listMyObligations({ status: "OPEN", pageSize: 3 })
  -> { items: Obligation[], nextCursor?: string }
```

No se propone endpoint resumen, total agregado, proyección, índice, writer ni permiso nuevo.

## 5. Aislamiento entre cuentas y respuestas tardías

Todas las lecturas privadas del perfil se ligan a una clave de contexto `account.userId` y a una
generación local de carga.

Al cerrar sesión o cambiar el UID autenticado, antes de presentar la nueva Cuenta se debe:

1. limpiar Persona, errores, resultados y resultado de alta;
2. limpiar la página breve de obligaciones, cursor y errores;
3. limpiar cualquier detalle visual derivado de la Cuenta previa;
4. invalidar la generación anterior;
5. ignorar toda promesa que resuelva si su `accountId`/generación ya no coincide.

Esto se aplica también a `ensureMyPerson` en vuelo: su respuesta no puede repoblar el provider de la
Cuenta siguiente. La autorización backend por UID no reemplaza este aislamiento de presentación.

## 6. Estados de interfaz

| Fuente | Cargando | Disponible | Ausencia confirmada | Error |
| --- | --- | --- | --- | --- |
| Cuenta | Layout protegido vigente | foto/nombre visible/correo/fecha disponible | No aplica tras Cuenta inicializada | `AccountInitializationError` y reintento vigentes |
| Persona en Resumen | indicador independiente | datos personales + Ver ficha | explicación + Crear mi ficha personal | mensaje + reintento, sin CTA de alta |
| Persona en Ficha | indicador al entrar/actualizar | ficha + Actualizar | explicación + formulario vigente | recuperable/inconsistente/sesión inválida diferenciados |
| Obligaciones breves | indicador independiente | hasta 3, rotuladas como vista parcial | primera página vacía | mensaje + reintento; no bloquea otros bloques |

Una actualización con datos ya visibles puede conservarlos con indicador discreto; un fallo de esa
actualización debe informar que los datos visibles podrían no estar actualizados, sin convertirlos
en vacío.

## 7. Responsive y accesibilidad

- Escritorio: validar 1440×900 con sidebar completo, submenú abierto, activo correcto y contenido
  sin doble scroll ni solapamiento.
- Móvil: validar 360×800 y 390×844 con drawer, tres subentradas visibles, cierre al navegar y sin
  overflow horizontal.
- Resumen usa una columna en 360/390 px y puede distribuir bloques en dos columnas sólo desde un
  ancho que no comprima etiquetas, correo o importes.
- Foto, estados, botones y enlaces mantienen foco visible; controles interactivos tienen al menos
  44×44 px.
- Carga usa `role="status"`; errores usan `role="alert"`; el color no es el único indicador.
- Correos, nombres largos, importes y conceptos deben envolver sin ensanchar el viewport.
- `Actualizar` expone un nombre accesible específico aunque en móvil use sólo icono.

## 8. Fuera de alcance

- editar una Persona existente;
- editar nombre, correo o foto de Cuenta;
- inferir nombre/apellido desde `displayName`;
- usar una fecha de Persona como alta de Cuenta;
- agregar total o saldo agregado de obligaciones;
- recorrer páginas económicas en segundo plano;
- modificar pagos, historial, avisos o Economía personal;
- contratos de fichas pendientes de vinculación;
- invitaciones, correo, alta por Owner, reclamo o fusión;
- cambios de permisos, Rules, índices, migraciones o datos;
- cambios a `visuals/`;
- cerrar gates productivos IUX-02/E3 o habilitar E4.

## 9. Decisiones

| ID | Decisión | Estado | Impacto |
| --- | --- | --- | --- |
| IUX-09-D01 | Usar `/profile/info` como Resumen canónico; conservar `/profile/person` y `/dashboard/obligations` | Propuesta para adopción | Permite reutilizar rutas y deep-links existentes sin duplicar pantallas. |
| IUX-09-D02 | Mover visualmente `Mis obligaciones` bajo Mi perfil, sin cambiar su ruta ni consumidores | Propuesta para adopción | Evita duplicación de menú y preserva Economía personal. |
| IUX-09-D03 | Exponer `accountCreatedAt` aditivo desde `users.createdAt` en `MyAccount` | **Condiciona mostrar la fecha de alta** | Sin esta ampliación la fecha debe declararse no disponible; está prohibido sustituir otra fecha. |
| IUX-09-D04 | Nombre/apellido personales provienen sólo de `MyPerson`; `displayName` se rotula como Nombre de la cuenta | Propuesta para adopción | Evita inferencias nominales y mantiene separados Cuenta y Persona. |
| IUX-09-D05 | Resumen usa sólo la primera página de 3 obligaciones OPEN y se declara vista parcial, sin total | Propuesta para adopción | Reutiliza el contrato vigente sin barridos ni agregados. |
| IUX-09-D06 | Actualizar Ficha significa reconsultar, no editar | Propuesta para adopción | No requiere writer nuevo; la edición queda fuera. |
| IUX-09-D07 | Reservar debajo de Persona propia la ubicación futura de fichas pendientes; su flujo pertenece a Agregar integrantes | Propuesta para adopción | Evita mezclar vínculo/reclamo/fusión con el perfil propio. |

La única decisión que bloquea un dato solicitado es **D03**. El resto fija navegación y semántica
del incremento; no exige una nueva decisión de dominio si se adopta esta ficha.

## 10. Criterios de aceptación

1. En escritorio, Mi perfil contiene Resumen, Ficha personal y Mis obligaciones; no queda una
   segunda entrada raíz de Mis obligaciones.
2. En 360×800 y 390×844, el drawer muestra las mismas tres subentradas, permite operarlas por tacto
   y teclado, se cierra al navegar y no genera overflow.
3. `/profile/info`, `/profile/person` y `/dashboard/obligations` son accesibles directamente; los
   deep-links de obligaciones y retornos desde Economía personal continúan funcionando.
4. Resumen muestra foto/avatar, nombre visible de Cuenta y correo de acceso desde `MyAccount`.
5. Si D03 se adopta y `users.createdAt` es válido, Resumen muestra esa fecha como creación de
   Cuenta; si no está disponible, no usa fecha de Persona ni inventa una.
6. Con Persona, Resumen muestra nombre y apellido desde `MyPerson`, indica que existe ficha y enlaza
   a Ficha personal.
7. Sin Persona confirmada, Resumen explica el propósito y ofrece **Crear mi ficha personal**; no
   deriva apellido desde `displayName`.
8. Un fallo de Persona no se representa como ausencia y no ofrece alta sustitutiva.
9. Ficha personal consulta al entrar, muestra Persona cuando existe y ofrece **Actualizar** como
   reconsulta.
10. Sin Persona confirmada, Ficha personal presenta explicación y el formulario vigente; alta
    idempotente y doble activación conservan el comportamiento existente.
11. Después de crear la ficha, Ficha personal muestra éxito y al volver a Resumen se ve la Persona
    creada sin recargar manualmente la aplicación.
12. El Resumen solicita una sola página de hasta 3 obligaciones `OPEN`, la rotula como vista parcial,
    no muestra total y enlaza al listado completo.
13. La vista breve distingue carga, primera página vacía y error con reintento, sin bloquear Cuenta
    ni Persona.
14. Mis obligaciones conserva pendientes, saldadas, anuladas, historial, detalle, selección,
    paginación y aviso de pago actuales.
15. Los accesos desde Economía personal siguen abriendo la obligación/contexto solicitado y pueden
    volver mediante `returnTo`.
16. Al cambiar de Cuenta se limpian inmediatamente Persona y obligaciones anteriores; respuestas
    tardías, incluida un alta en vuelo, no repueblan la Cuenta nueva.
17. La sección futura de fichas pendientes queda ubicada después de Persona propia, pero no muestra
    datos, vacío ni acciones sin contrato de Agregar integrantes.
18. A 1440×900, 360×800 y 390×844 nombres, correos, conceptos e importes largos envuelven sin doble
    scroll ni desborde horizontal.
19. No se agregan writers, permisos, índices, Rules, barridos paginados, migraciones o cambios de
    datos fuera de la ampliación de lectura de Cuenta expresamente adoptada.

## 11. Matriz mínima de validación posterior

| Escenario | Viewport | Resultado requerido |
| --- | --- | --- |
| Cuenta con Persona | 1440×900, 360×800, 390×844 | Tres subentradas; datos de Cuenta/Persona correctos; Ver ficha; Actualizar |
| Cuenta sin Persona | mismos | Ausencia confirmada, explicación, formulario vigente y CTA exacto |
| Alta y retorno | mismos | Crear, ver éxito, volver a Resumen y observar vínculo sin datos viejos |
| Obligaciones pendientes | mismos | Máximo 3, vista parcial, sin total, enlace al listado completo |
| Obligaciones vacías | mismos | Vacío verdadero sólo tras primera página exitosa |
| Error Persona | mismos | Error diferenciado, reintento, sin formulario por falsa ausencia |
| Error obligaciones | mismos | Error aislado, reintento, Cuenta y Persona utilizables |
| Cambio Cuenta A → B | al menos escritorio y 390×844 | Limpieza inmediata; ninguna respuesta tardía de A visible en B |
| Deep-link económico | al menos 390×844 | Parámetros y `returnTo` preservados desde Economía personal |

## 12. Archivos previsibles para una implementación posterior

La enumeración orienta el corte; no autoriza cambios:

- `src/lib/navigation/accountNavigation.ts`;
- `src/components/layout/AppSidebar.tsx` y, sólo si el activo compartido lo requiere,
  `src/components/layout/Navbar.tsx`;
- `src/app/(protected)/profile/info/page.tsx` y `profile/layout.tsx`;
- `src/app/(protected)/profile/person/page.tsx`;
- componentes focales nuevos bajo `src/components/profile/`;
- `src/components/providers/PersonProvider.tsx` y `usePerson` para reconsulta/aislamiento;
- `src/types/MyAccount.ts`, `src/services/accountService.ts`, `accountDto.js` y pruebas de Cuenta
  para `accountCreatedAt`;
- consumidor focal de `listMyObligations`, sin modificar el listado completo;
- pruebas de navegación compartida, contrato de Cuenta, carreras de identidad y responsive.

No se prevé modificar `MyObligationsView` salvo una corrección estrictamente necesaria para
preservar deep-links demostrada por pruebas. No se prevén cambios a persistencia, índices, Rules o
datos.

## 13. Evidencia de cierre

La implementación conserva las rutas canónicas `/profile/info`, `/profile/person` y
`/dashboard/obligations`, amplía `MyAccount` de manera compatible con `accountCreatedAt` obtenido
exclusivamente de `users.createdAt` y representa el valor ausente o inválido como `null`. Resumen
omite la fecha cuando no puede serializarse, consulta una sola página de hasta tres obligaciones
`OPEN` y no presenta un total.

Los ajustes finales normalizan márgenes laterales, separación superior, títulos y encabezados de
Resumen, Ficha personal, Mis obligaciones, Inicio autenticado, Mis grupos y Explorar grupos en los
breakpoints verificados. Ficha personal y Mis obligaciones ubican «Volver» arriba del título; desde
Mi perfil retorna a `/profile/info`, mientras que Mis obligaciones conserva el `returnTo` de
Economía personal. Los bloques que requieren un ancho interno menor lo mantienen sin duplicar el
padding del layout.

### UAT humana

El usuario aprobó la UAT funcional y el ajuste visual final sobre el BUILD_ID
`2qn119a5HcGb_Qg4yvYWL` el 17 de noviembre de 2026. La aprobación autoriza versionado, integración
en `dev` y push normal; no autoriza despliegue ni cambios de datos UAT.

### Comprobaciones automatizadas

- pruebas focales de Cuenta, Persona, obligaciones, navegación, aislamiento entre cuentas y
  presentación IUX-09: aprobadas;
- TypeScript, ESLint focal, build y `git diff --check`: aprobados;
- navegación y alineación de las seis vistas a 1440×900, 360×800 y 390×844: aprobadas, sin overflow
  horizontal;
- IUX-06A: 2/3 tanto en la rama IUX-09 como en `dev@3f518b2`; el caso restante exige
  `gridTemplateColumns` en una vista que ya no lo contiene. Se registra como fallo preexistente y no
  como regresión de IUX-09.

La evidencia automatizada acredita los escenarios técnicos indicados, pero no sustituye ni amplía
la aprobación humana. `visuals/`, capturas, builds, configuración local y exportaciones UAT quedan
fuera de los commits.
