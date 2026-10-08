# E3-02 — Ficha inicial de delegación mínima de Tesorería y consulta económica

## Estado de la ficha

- **Fecha de preparación:** 2026-10-08.
- **Rama comprobada:** `dev`.
- **HEAD comprobado:** `31a59fb4e648822dcc1722d5306bacb8d95c9e8c`.
- **Divergencia local `dev...origin/dev`:** `0/0`, sin `fetch`.
- **Árbol e índice al iniciar:** limpios.
- **Stashes:** ninguno listado.
- **Autorización recibida:** definición y preparación documental exclusivamente.
- **Normativa E3-02:** formalizada localmente por el addendum y DEC-E3-02/D5-047.
- **Implementación y deploy:** no autorizados.
- **Estado:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.

Las decisiones E3-02-D01–D04, el addendum consolidado y DEC-E3-02/D5-047 fueron aprobados
expresamente por el usuario. La definición normativa está cerrada. La dependencia técnica de Grupo
descrita en §8.4 debe implementarse dentro de un futuro alcance autorizado y quedar operativa antes
de habilitar concesiones. Esta formalización no autoriza código ni despliegue.

## 1. Finalidad y corte vertical

E3-02 incorpora una única delegación real y verificable:

```text
Owner vigente concede GROUP_TREASURY
    -> integrante autorizado consulta la economía E3-01 del mismo Grupo
    -> revocación o pérdida de vigencia impide toda consulta nueva
```

El valor operativo es permitir ayuda administrativa en la lectura de obligaciones sin transferir
ownership ni adelantar registro o validación de dinero. El corte termina en la consulta.

E3-02 incluye solamente:

- concesión explícita por el Owner vigente;
- revocación explícita por el Owner vigente;
- consulta Owner de concesiones e historia mínima;
- acreditación privada del acceso del propio tesorero;
- acceso read-only a un subconjunto cerrado de las consultas económicas E3-01;
- pérdida automática de eficacia por lifecycle o contexto, sin borrar historia;
- trazabilidad, idempotencia y revalidación backend.

E3-02 no incluye:

- crear o editar roles o perfiles configurables;
- catálogo, jerarquía, composición o editor general de permisos;
- registrar, avisar, validar o rechazar pagos o entregas de dinero;
- crear conceptos, ocurrencias u obligaciones;
- cambiar importes, vencimientos, estados o snapshots;
- consultar candidatos MONTHLY o roster operativo;
- correcciones, condonaciones, reversiones, devoluciones, Caja o balance;
- liquidación de obligaciones prearchivo;
- operaciones económicas sobre Grupo archivado;
- retiro D5-044, integración Auth/UAT, reapertura rutinaria E2-14 ni tratamiento adicional de
  D5-045.

La prohibición futura de validar deuda propia, si se aprueba para E3-03, no se traslada a E3-02. Ver
información y validar un ingreso son capacidades distintas. Esta ficha no define la segunda.

## 2. Fuentes revisadas y autoridad

La definición usa las versiones del repositorio en el checkpoint indicado:

- cierre, ficha e informe final E3-01;
- DEC-E3-01 / D5-046 y el addendum E3-01 a Documentos 2, 3 y 4;
- DEC-E2-25 / D5-043, cierre E2-25 y addendum de diferimientos de CU-034–CU-038;
- addendum E2-22A sobre cargo descriptivo;
- addendum E2-23 sobre archivo de Grupo;
- aclaraciones AUD-C05 de Documentos 3 y 4 sobre Períodos de Vigencia;
- Documento 5, en particular §§5.5, 5.8, 5.10–5.12, 7.5 y D5-043–046;
- contratos E3-01 implementados sólo para comprobar reutilización y fronteras, sin inventario
  económico legacy ni auditoría general.

Prevalecen las normas aprobadas. Esta ficha separa expresamente regla vigente, decisión aprobada,
recomendación técnica y decisión todavía necesaria.

## 3. Casos de uso alcanzados

La correspondencia adoptada con CU-034–CU-038 es deliberadamente parcial:

| Caso | Tratamiento E3-02 adoptado |
| --- | --- |
| CU-034 — crear rol | No implementado. No se crea un rol configurable. |
| CU-035 — editar rol | No implementado. `GROUP_TREASURY` no se edita ni compone. |
| CU-036 — asignar rol/capacidad | Cobertura focal mediante concesión explícita de la capacidad fija. |
| CU-037 — revocar rol/capacidad | Cobertura focal mediante revocación explícita y conservación de historia. |
| CU-038 — configurar permisos | Cobertura parcial sólo por definición normativa cerrada de lo que permite y prohíbe `GROUP_TREASURY`; no existe configuración en runtime. |

No se declaran resueltos todos los CU-034–CU-038. La formalización satisface la condición
de reapertura de D5-043 para esta primera capacidad delegable y conserva el resto como deuda visible.

## 4. Clasificación de reglas y decisiones

### 4.1 Reglas normativas vigentes

1. Cargo, rol deportivo y autorización son conceptos separados.
2. El cargo descriptivo no concede ownership, permiso, capacidad ni elegibilidad.
3. Los permisos contextuales pertenecen a la relación Persona–Grupo; no son roles globales de
   Cuenta.
4. Un permiso no sustituye ownership, Membresía, Temporada ni reglas del módulo económico.
5. La autorización debe acreditarse en backend para cada operación; el cliente no es fuente de
   autoridad.
6. Membresía es la única autoridad de su activación: las formas period-aware usan Períodos internos
   reales y las formas legacy compatibles se acreditan desde fechas autoritativas sin materializar
   Períodos. Finalizar invalida la activación; reactivar acredita otra sobre la misma raíz; renovar
   crea otra Membresía.
7. Reactivación y renovación no permiten inferir herencia de autorizaciones externas.
8. Los registros económicos permanecen fuera de Membresía y se consultan por composición.
9. Grupo archivado conserva historia read-only dentro de los contratos ya autorizados, sin ampliar
   actores ni visibilidad.
10. Acceso directo del cliente a persistencia económica y técnica permanece denegado.

### 4.2 Decisiones ya aprobadas que E3-02 preserva

1. D5-043 difirió CU-034–CU-038 hasta la primera capacidad real delegable y exige, antes de
   implementarla, definir casos, perfiles si fueran necesarios, capacidades, asignación,
   revocación, alcance, privacidad, revalidación, concurrencia, idempotencia e historia.
2. D5-046 ubica E3-02 como delegación mínima y consulta Tesorería, separada de avisos e ingresos.
3. E3-01 deja conceptos, ocurrencias, obligaciones y consultas económicas como fuente canónica;
   Tesorería no fue implementada allí.
4. E3-01 permite al Owner consultar economía incluso con Grupo archivado, pero esa excepción no
   amplía automáticamente el actor.
5. E2-23 no admite desarchivo y prohíbe nuevas mutaciones operativas sobre Grupo archivado.
6. D5-045 conserva su tratamiento de riesgo residual antes de producción.
7. DEC-E3-02/D5-047 adopta `GROUP_TREASURY` y el addendum E3-02 exclusivamente para esta capacidad
   concreta, sin cerrar los demás CU-034–CU-038 ni alterar el gate económico de Etapa 3.

### 4.3 Contratos técnicos adoptados y dependencia de implementación

1. Modelar una concesión focal, no un RBAC general.
2. Usar `GROUP_TREASURY` como identificador estable de una capacidad cerrada de lectura.
3. Persistir la concesión fuera de Membresía y referenciar la Membresía y su período/activación
   exactos; no agregar arrays o flags de permisos a la raíz Membresía.
4. Reutilizar los readers y DTOs E3-01, cambiando sólo la autorización contextual.
5. Conservar receipts y concesiones históricas privadas; nunca reconstruir autorización desde logs.
6. Mantener Firestore deny-all para cliente y exponer exclusivamente contratos backend.
7. Evolucionar Grupo con `ownershipRevision`, preservada por todos los writers ordinarios y sólo
   incrementable por una futura transferencia canónica junto con `ownerId`.

Los puntos 1–6 forman parte del contrato implementable adoptado. El punto 7 es una dependencia
técnica propiedad de Grupo que todavía no existe en código: deberá implementarse dentro del futuro
alcance autorizado y completarse antes de habilitar cualquier concesión.

### 4.4 Decisiones funcionales aprobadas para E3-02

E3-02-D01–D04 fijan cardinalidad, vínculo Cuenta–Persona, lifecycle y alcance de consulta. Se
registran con su contenido aprobado en §18. No quedan decisiones funcionales bloqueantes dentro del
corte. La normativa quedó formalizada; la implementación continúa pendiente de autorización.

## 5. Capacidad fija `GROUP_TREASURY`

### 5.1 Semántica adoptada

`GROUP_TREASURY` es una capacidad estable, privada y contextual a un Grupo. Autoriza únicamente a
consultar los recursos E3-01 enumerados en §13. No es un cargo, un rol visible, un perfil editable ni
un contenedor abierto de permisos.

El identificador satisface D5-043 sólo si la norma fija su contenido. El nombre no concede por sí
mismo ninguna operación. En particular, `GROUP_TREASURY` no autoriza ahora ni autorizará por analogía:

- alta o edición de conceptos;
- alta de ocurrencias;
- generación o modificación de obligaciones;
- aviso, registro, validación o rechazo de ingresos;
- corrección, condonación, reversión o devolución;
- Caja, movimientos o balance;
- cualquier operación de una etapa posterior.

Una futura capacidad de escritura deberá poseer identificador, reglas, pruebas, decisión normativa y
autorización de implementación propios. No se ampliará silenciosamente `GROUP_TREASURY`.

### 5.2 Por qué no se requiere un perfil configurable

La necesidad actual es una sola capacidad real y cerrada. Un perfil configurable agregaría CRUD,
composición, naming, versiones, migración y administración sin consumidor adicional. Para D5-043,
la frase “perfiles e identificadores estables, si efectivamente se requieren” permite documentar que
en este corte no se requieren.

La concesión fija sí debe tener identidad durable y lifecycle explícito. Eso resuelve la necesidad
de autorización sin crear un Agregado de roles ni prometer un RBAC general.

## 6. Actores y autorización

### Owner vigente

- Concede y revoca para su Grupo activo.
- Lista concesiones vigentes e históricas de su Grupo.
- Conserva sus consultas Owner E3-01; no necesita `GROUP_TREASURY`.
- No puede conceder para otro Grupo, a una Membresía finalizada/incompatible ni con una capacidad
  enviada libremente por cliente.

### Integrante autorizado

- Debe estar autenticado.
- Su Cuenta y Persona deben corresponder a las fijadas en la concesión.
- Debe conservar activa e íntegra la Membresía exacta, en el Grupo exacto y en la activación/período
  exactos para los que se concedió.
- Sólo consulta. No ve controles Owner ni concesiones de terceros.

### Otros actores

- Integrante sin concesión, exintegrante, ex-tesorero, actor de otro Grupo, rol global, administrador
  legacy, conocimiento de IDs o texto de cargo no autorizan.
- Grupo inexistente y Grupo no accesible deben converger públicamente cuando corresponda para no
  revelar existencia o economía.

## 7. Invariantes

1. Sólo el Owner vigente concede o revoca.
2. La capacidad es siempre `GROUP_TREASURY`; el cliente no envía permisos arbitrarios.
3. Destinatario, Persona, Cuenta, Membresía, Grupo, Temporada y activación vigente se derivan o
   revalidan en backend.
4. La Membresía debe estar `activa`, ser íntegra y pertenecer al mismo Grupo.
5. El cargo descriptivo nunca participa en una decisión de autorización.
6. La concesión no modifica Membresía, Períodos, Persona, Cuenta, Grupo, Temporada ni Pago.
7. Revocar conserva la concesión histórica y hace ineficaz todo acceso posterior.
8. Finalizar la Membresía vuelve ineficaz la concesión aunque el registro no sea borrado.
9. Reactivar la misma `membershipId` abre otra vigencia y no revive la concesión anterior.
10. Renovar crea otra `membershipId` y no hereda la concesión.
11. Una nueva autorización siempre requiere otra concesión explícita.
12. El cierre canónico de Temporada sólo confirma después de finalizar todas sus Membresías activas;
    esa finalización ya vuelve ineficaz la concesión. Un contexto imposible o incoherente falla
    cerrado y no crea una excepción histórica para ex-tesoreros.
13. Cada contexto de ownership posee una revisión estable. Cualquier cambio de Owner crea una nueva
    revisión; A → B → A no recupera la revisión inicial ni revive grants.
14. Revocación o pérdida de eficacia entre páginas impide obtener la página siguiente.
15. Revocación o pérdida de eficacia entre apertura de página y consulta impide la consulta nueva.
16. Una respuesta ya emitida no puede “desleerse”; no se prometen sesiones ni cachés revocables.
17. Grupo archivado nunca acredita `GROUP_TREASURY` en este corte.
18. La consulta delegada no cambia las reglas, estados o DTOs económicos de E3-01.
19. No se persiste la idempotency key cruda ni se expone trazabilidad técnica al cliente.

## 8. Fuente de verdad, identidad y ubicación

### 8.1 Fuente de verdad funcional

La fuente de verdad es una concesión durable de autorización, separada de cargo y de
Membresía. Membresía acredita la relación y su vigencia, pero no contiene la concesión. Pago conserva
la economía, pero no decide quién es tesorero.

No se crea un nuevo Agregado de dominio. La concesión es un registro de autorización contextual con
repositorio focal y unidad transaccional propia. Los módulos Grupo, Cuenta/Persona, Membresía,
Temporada y Pagos se consumen mediante capacidades públicas estrechas; no se importan sus
repositorios internos.

### 8.2 Identidad adoptada

Cada hecho de concesión recibe un `grantId` opaco nuevo. Su identidad funcional correlaciona:

```text
groupId + GROUP_TREASURY + membershipId + validityAnchor + accountId
    + ownershipRevision + grantId
```

`validityAnchor` identifica la activación exacta de la Membresía:

- para una forma period-aware, el `periodId` abierto real acreditado por el Agregado;
- para una forma legacy activa compatible, un ancla legacy canónica derivada exclusivamente de sus
  fechas autoritativas.

La capacidad pública de Membresía decide y devuelve el ancla. Conceder a una forma legacy compatible
no exige materializar Períodos, evolucionar su schema, migrarla ni repararla. Una forma incompatible
falla cerrado; E3-02 no inventa fechas ni corrige Membresía.

La comparación nunca usa sólo `membershipId`. Cuando una forma legacy se finaliza y luego reactiva,
su nueva activación es period-aware y no coincide con el ancla anterior. Así se comprueba que una
concesión antigua no revive incidentalmente.

La alternativa preferible durante una futura implementación es consumir una capacidad pública de
Membresía que devuelva un `validityAnchor` opaco y comparable; Tesorería no debe interpretar ni
escribir Períodos directamente.

### 8.3 Persistencia física definida

Nombres orientativos, sujetos a la formalización y autorización posteriores:

- `groupCapabilityGrants/{grantId}`: hecho durable, estado y trazabilidad;
- `groupCapabilityGrantSlots/{slotId}`: guard técnico de unicidad por Grupo/capacidad/Cuenta;
- `groupCapabilityCommandReceipts/{receiptId}`: idempotencia/recovery de conceder y revocar.

Campos mínimos del grant:

```text
grantId
capabilityId = "GROUP_TREASURY"
groupId
membershipId
validityAnchor
personId
accountId
ownerIdAtGrant
ownershipRevisionAtGrant
state = "ACTIVE" | "REVOKED"
grantedAt
grantedByAccountId
revokedAt?
revokedByAccountId?
schemaVersion
```

Campos mínimos del slot:

```text
slotId
groupId
capabilityId = "GROUP_TREASURY"
accountId
currentGrantId
membershipId
validityAnchor
ownershipRevision
updatedAt
schemaVersion
```

Campos mínimos del receipt:

```text
receiptId
command = "GRANT" | "REVOKE"
actorAccountId
idempotencyKeyHash
requestHash
groupId
grantId
outcome
confirmedAt
schemaVersion
```

Los documentos se hidratan con schemas exactos. Timestamps son autoritativos del backend; IDs,
estado, hashes y capacidad no provienen libremente del cliente. La retención de grants y receipts es
indefinida mientras no exista una política aprobada que conserve igual trazabilidad e idempotencia.

`ownerIdAtGrant` identifica al concedente, pero no basta como barrera de lifecycle: A → B → A volvería
a igualar el mismo ID. `ownershipRevisionAtGrant` fija el contexto irrepetible y se compara en cada
consulta. `personId` y `accountId` evitan activar la concesión para una Cuenta vinculada después o
para otra identidad. Los IDs de actor son privados y no se incluyen en DTOs ordinarios.

### 8.4 Dependencia mínima de ownership

La inspección del checkpoint comprobó que Grupo v1/v2 sólo persiste `ownerId`; no existe versión o
ancla canónica. `transferGroupOwnership` es un tombstone `LEGACY_GROUP_CAPABILITY_RETIRED`, por lo
que E3-02 no puede reutilizar una transferencia canónica ni afirmar que ya existe historial.

Antes de implementar E3-02, el módulo Grupo deberá ofrecer estas capacidades públicas mínimas:

```text
ensureOwnershipContext({ unitOfWork, groupId })
  -> { groupId, ownerId, estado, ownershipRevision }

getOwnershipContext({ unitOfWork, groupId })
  -> { groupId, ownerId, estado, ownershipRevision }
```

`ensureOwnershipContext` es idempotente y propiedad de Grupo. Evoluciona una raíz activa compatible
que todavía no tenga revisión a `ownershipRevision = 1`; no cambia Owner ni crea historia. Puede
ejecutarse como fase previa durable. La transacción posterior de concesión relee
`getOwnershipContext`; no confía en la respuesta preparada.

`ownershipRevision` es un entero positivo monotónico dentro del Grupo. Una futura transferencia
canónica deberá cambiar `ownerId` e incrementar la revisión en la misma unidad de consistencia de
Grupo. Nunca reutiliza una revisión, incluso si vuelve un Owner anterior. Este contrato no implementa
transferencia, no autoriza editar ownership y no crea un historial general. Una raíz que declare una
forma evolucionada sin revisión válida, o una revisión que retroceda/desborde, es incompatible y
falla cerrado.

Desde que la raíz posea `ownershipRevision`, todos los writers canónicos existentes de Grupo deben
preservarla exactamente. Renombre, archivo y cualquier edición ordinaria no pueden omitirla,
reiniciarla ni incrementarla. Sólo una futura transferencia canónica podrá incrementar la revisión,
en el mismo cambio que sustituya `ownerId`. Esta exigencia es contractual; esta tarea no implementa
la evolución ni modifica writers.

### 8.5 Capacidades públicas de identidad y vigencia

E3-02 requiere contratos estrechos, sin acceso a repositorios internos:

```text
resolveUniqueAccountForPerson({ unitOfWork, personId })
  -> { status: "READY", accountId, personId }
   | { status: "MISSING" | "AMBIGUOUS" | "INCOMPATIBLE" }

getOwnCanonicalPerson({ unitOfWork, accountId })
  -> { status: "READY", accountId, personId }
   | { status: "MISSING" | "INCOMPATIBLE" }

getActiveAuthorizationContext({ unitOfWork, membershipId, groupId })
  -> { status: "READY", membershipId, personId, groupId, seasonId, validityAnchor }
   | { status: "NOT_ACTIVE" | "INCOMPATIBLE" }

requireOpenSeasonContext({ unitOfWork, groupId, seasonId })
  -> { status: "OPEN", seasonId }
   | { status: "NOT_OPEN" | "INCOMPATIBLE" }
```

Cuenta/Persona es dueña de los dos primeros; Membresía del tercero; Grupo/Temporada del cuarto. El
resolver inverso exige exactamente una Cuenta compatible y nunca expone email. `validityAnchor` es
opaco para E3-02 y sólo Membresía decide cómo acreditar la activación vigente: Período abierto real
para formas period-aware o ancla legacy compatible desde fechas autoritativas. No materializa
Períodos para conceder, no migra y no repara.

### 8.6 Frontera y consistencia conforme a Documentos 3/4

La concesión no es “un registro sin reglas”. Tiene identidad, invariantes, repositorio focal y una
unidad de consistencia que confirma grant, slot y receipt juntos. No se la incorpora a Membresía,
Grupo o Pago porque ninguno es dueño simultáneo del hecho humano “Owner concedió esta capacidad a
esta Cuenta para esta vigencia”.

La composición respeta Documentos 3/4:

- Grupo conserva ownership y su revisión dentro de su propia raíz;
- Membresía conserva estado y Períodos dentro de su propia raíz;
- Cuenta/Persona conserva el vínculo canónico;
- Temporada conserva su estado;
- Pago conserva economía;
- autorización sólo referencia y relee esas fuentes, sin corregirlas ni absorberlas.

`ensureOwnershipContext` es una evolución técnica propiedad de Grupo y termina antes del commit de
concesión; no combina dos transiciones funcionales. La concesión posterior relee todas las fuentes y
confirma únicamente sus documentos de autorización. Revocación confirma únicamente grant, slot y
receipt. Las consultas son composición read-only. No existe transacción distribuida que cambie dos
Agregados ni una excepción a sus reglas de consistencia.

El slot no es fuente histórica ni permiso por sí mismo: sólo serializa la ausencia/presencia de una
concesión efectiva para el mismo destinatario y ancla. El grant es la fuente durable. Los receipts
son evidencia técnica privada, no historia funcional sustitutiva.

## 9. Relaciones y fronteras

| Concepto | Relación con E3-02 | Lo que E3-02 no hace |
| --- | --- | --- |
| Grupo | Fija scope, estado y Owner vigente. | No cambia ownership, estado ni configuración. |
| Cuenta | Identifica al actor autenticado y al destinatario exacto conforme a D02 aprobada. | No crea, vincula ni repara cuentas. |
| Persona | Correlaciona Cuenta y Membresía. | No modifica ni expone datos de contacto. |
| Membresía | Acredita pertenencia activa e íntegra y entrega el ancla de vigencia. | No incorpora el grant ni altera Períodos/cargo. |
| Temporada | Acredita el contexto abierto al conceder y consultar según D03. | No abre, cierra ni repara Temporadas. |
| Pago | Provee las consultas E3-01 reutilizadas. | No recibe permiso, writer ni estado nuevo. |

## 10. Contratos de comando definidos

### 10.1 `grantGroupTreasuryCapability`

Entrada cerrada:

```text
{ groupId, membershipId, idempotencyKey }
```

El backend deriva actor, capacidad, Persona, Cuenta destinataria, Temporada, ancla, timestamps y
estado. La confirmación transaccional relee:

1. Cuenta del actor y ownership vigente;
2. Grupo activo e íntegro;
3. Membresía activa, íntegra y correlacionada al Grupo;
4. activación vigente acreditada por Membresía mediante Período real period-aware o ancla legacy
   compatible derivada de fechas autoritativas;
5. Temporada exacta abierta;
6. vínculo canónico único Cuenta–Persona del destinatario;
7. `ownershipRevision` vigente e igual a la leída al preparar;
8. slot de unicidad y receipt.

Resultado mínimo:

```text
{ outcome: "GRANTED" | "EXISTING", grant }
```

`EXISTING` sólo corresponde a la misma intención y payload, o a la recuperación inequívoca del
mismo efecto. No convierte una concesión revocada o vencida en activa.

### 10.2 `revokeGroupTreasuryCapability`

Entrada cerrada:

```text
{ groupId, grantId, idempotencyKey }
```

Sólo el Owner vigente del mismo Grupo activo puede confirmar. El backend relee Grupo, ownership,
grant, correlación y receipt. Resultado:

```text
{ outcome: "REVOKED" | "EXISTING", grantId, revokedAt }
```

Un retry idéntico recupera el mismo resultado. Una concesión ya ineficaz por lifecycle pero no
revocada puede revocarse explícitamente mientras el Grupo siga activo, preservando una razón humana
clara. No se revive ni reemplaza.

### 10.3 Nueva concesión explícita

Después de revocación, finalización, reactivación, renovación o cambio de Owner no existe “activar”
el grant previo. El Owner ejecuta `grantGroupTreasuryCapability` con una nueva idempotency key sobre
la Membresía y vigencia actuales; se crea otro `grantId` y la historia anterior permanece.

El slot técnico tiene identidad determinista por `groupId + capabilityId + accountId`. Contiene
`currentGrantId`, `membershipId`, `validityAnchor` y la revisión de ownership del grant efectivo.
Revocar marca el grant y libera condicionalmente el slot sólo si todavía apunta a ese `grantId`.
Lifecycle u ownership pueden volver ineficaz un grant sin reescribirlo; una concesión nueva para la
misma Cuenta reemplaza el puntero del mismo slot únicamente después de comprobar que el grant previo
es ineficaz, y crea un `grantId` nuevo. Nunca cambia el grant histórico a `ACTIVE`. Así reactivación,
renovación o nuevo ownership sustituyen autoridad vigente sin borrar la anterior.

## 11. Lifecycle y concurrencia

### Finalización y reactivación

- La autorización efectiva exige Membresía activa y `validityAnchor` igual al del grant.
- Si finalización confirma primero, conceder o consultar falla cerrado.
- Si concesión confirma primero, puede ser efectiva hasta que finalización confirme; desde ese
  instante toda consulta nueva falla.
- Reactivar la misma raíz abre otro período/ancla. El grant anterior queda histórico e ineficaz.
- La carrera se serializa leyendo la raíz y el período vigente en la transacción de concesión; las
  consultas releen ambos en cada request/página.

### Renovación

- La nueva Temporada produce otra Membresía.
- La referencia a la predecesora no copia ni acredita `GROUP_TREASURY`.
- Conceder sobre la nueva raíz es un hecho humano nuevo.

### Archivo

- Conceder y revocar exigen Grupo activo.
- Consultar como tesorero exige Grupo activo en cada request.
- Archivo que confirma primero bloquea el comando/consulta; concesión que confirmara antes pierde
  eficacia al confirmar el archivo.
- El historial de grants no se borra. La excepción de consulta Owner E3-01 sobre archivados no se
  extiende al tesorero.

### Cierre de Temporada

- E2-15, `E2-15-ficha-cierre-temporada.md` §§2, 3.1 y 5 y `E2-15-cierre.md` §Declaración de cierre,
  exige cero Membresías activas: cada una debe finalizarse explícitamente y `closeSeason` no las
  finaliza en cascada.
- Por ello la finalización previa ya vuelve ineficaz el grant. E3-02 no promete ni modela como caso
  alcanzable “Temporada cerrada con Membresía activa canónica”.
- Conceder y consultar revalidan igualmente la Temporada exacta abierta. Una combinación cerrada +
  Membresía activa, o cualquier divergencia raíz/guard/Período, es incompatibilidad y falla cerrado;
  no habilita consulta histórica a un ex-tesorero.
- No se transfiere el grant a la Temporada siguiente.

### Ownership

- Se exige igualdad de `ownerId` y, de manera decisiva, de `ownershipRevision` con el grant.
- Un cambio de Owner incrementa la revisión e invalida todas las concesiones anteriores sin
  borrarlas. El retorno A → B → A conserva otra revisión y no revive ninguna concesión de A.
- El nuevo Owner debe conceder otra vez y puede consultar la historia privada para entender el
  estado previo.

### Revocación y paginación

- Cada consulta y cada página revalidan desde persistencia; no existe una autorización de sesión.
- Si revocación o invalidación gana antes de la lectura autorizante de una página, no se devuelven
  ítems de esa página.
- Si una página ya fue emitida antes de la revocación, se conserva el orden real de los hechos y no
  se promete retirar datos ya recibidos.
- Los cursores no son credenciales y nunca omiten la reautorización.

## 12. Idempotencia, errores y recuperación

### Idempotencia

- Clave de 16–128 caracteres con el patrón ya probado por E3-01.
- Receipt identificado por hash; la clave cruda no se persiste ni registra.
- Mismo comando, key y payload devuelve el outcome confirmado.
- Misma key con payload distinto devuelve `IDEMPOTENCY_CONFLICT`.
- Un bloqueo funcional previo al efecto no crea grant ni consume una concesión ficticia.
- Un fallo incierto se reconcilia contra grant, slot y receipt antes de repetir.
- Revocar y volver a conceder son intenciones distintas y requieren claves distintas.

### Errores públicos mínimos definidos

| Código | Uso |
| --- | --- |
| `VALIDATION_FAILED` | Objeto abierto, ID, cursor o límite inválido. |
| `ACCOUNT_CONTEXT_REQUIRED` | Actor sin Cuenta/Persona utilizable. |
| `GROUP_NOT_ACCESSIBLE` | Grupo inexistente o actor sin autoridad, sin revelar cuál. |
| `GROUP_NOT_OPERATIONAL` | Grupo acreditado pero archivado/no operativo. |
| `MEMBERSHIP_NOT_ELIGIBLE` | Membresía no activa, ajena, no íntegra o sin vigencia correlacionable. |
| `TARGET_ACCOUNT_LINK_REQUIRED` | D02 aprobada y no existe una única Cuenta–Persona compatible. |
| `OPEN_SEASON_REQUIRED` | La Temporada exacta no está abierta. |
| `TREASURY_GRANT_ALREADY_ACTIVE` | Ya existe otro hecho activo para ese destinatario/vigencia. |
| `TREASURY_GRANT_NOT_ACCESSIBLE` | Grant inexistente o ajeno, sin enumeración. |
| `GROUP_TREASURY_NOT_AUTHORIZED` | Consulta sin grant efectivo. |
| `IDEMPOTENCY_CONFLICT` | Reutilización incompatible de key. |
| `DATA_INCOMPATIBLE` | Estado persistido no interpretable; falla cerrado. |
| `PENDING_RECOVERY` | Efecto incierto que exige retry de la misma intención. |

La UI traduce códigos estables, no mensajes internos. No se devuelven paths, hashes, account IDs,
owner IDs, schema ni detalles que revelen economía ajena.

## 13. Consultas privadas, DTOs y paginación

### 13.1 Reutilización económica

Con la recomendación E3-02-D04, el tesorero puede invocar, para el mismo Grupo:

- `listGroupChargeConcepts`;
- `listChargeOccurrences`;
- `listGroupObligations`.

Estos contratos reutilizan readers, queries, DTOs, orden y cursores E3-01. La única extensión es la
política backend `Owner vigente OR grant GROUP_TREASURY efectivo`. No se duplica persistencia ni se
crean `listTreasurer*` que puedan divergir.

Permanecen Owner-only:

- `listOwnerMonthlyMembershipCandidates`;
- todas las mutaciones de conceptos y ocurrencias;
- `generateMembershipObligations`;
- intents, rows, receipts y cualquier dato técnico.

`listMyObligations` conserva su autorización propia y no cambia por Tesorería.

### 13.2 Consultas de autorización

Se proponen dos contratos nuevos y focales:

- `listGroupTreasuryGrantsForOwner({ groupId, pageSize?, cursor? })`: Owner, vigente e historia;
- `getMyGroupTreasuryContext({ groupId })`: actor propio, respuesta mínima para habilitar la página.

DTO Owner de grant:

```text
{
  grantId,
  capabilityId: "GROUP_TREASURY",
  membershipId,
  person: { status, firstName?, lastName? },
  state: "ACTIVE" | "REVOKED" | "LAPSED",
  grantedAt,
  revokedAt?,
  lapseReason?: "MEMBERSHIP" | "SEASON" | "OWNERSHIP" | "GROUP"
}
```

`LAPSED` es una proyección derivada y no reescribe `state`. No expone Cuenta, Períodos, IDs de actor
ni causa interna incompatible.

DTO propio de contexto:

```text
{ groupId, capabilityId: "GROUP_TREASURY", canViewEconomy: true }
```

Una respuesta negativa no enumera grants ni economía. La autorización efectiva se vuelve a evaluar
en cada consulta económica, aunque la página haya recibido `canViewEconomy: true`.

### 13.3 Paginación

- `pageSize` por defecto 20, rango 1–50 para grants.
- Orden histórico estable `grantedAt DESC, grantId DESC`.
- Cursor opaco, firmado/hasheado y ligado a contrato, `userId`, `groupId`, capacidad y `pageSize`.
- Cursor inválido, de otro actor o de otro scope falla cerrado.
- Cada página revalida Cuenta, Grupo, ownership o grant, Persona, Membresía, ancla y Temporada.
- Los contratos económicos conservan los límites y órdenes E3-01 ya implementados.

### 13.4 Queries y necesidades de índices definidas

| Finalidad | Query lógica | Soporte físico a definir, no ejecutable |
| --- | --- | --- |
| Historia Owner | grants por `groupId`, `grantedAt DESC`, ID DESC | compuesto `groupId + grantedAt` |
| Grants del actor | grants por `accountId` y capacidad, filtrados/revalidados por Grupo | compuesto `accountId + capabilityId + grantedAt` |
| Grant por ID | lectura documental directa tras acreditar scope | sin compuesto |
| Slot efectivo | ID determinista por Grupo/capacidad/Cuenta | sin query ni compuesto |
| Receipt | ID hash de actor/comando/key | sin query ni compuesto |

La consulta nunca considera `state == ACTIVE` suficiente: hidrata el grant y relee Cuenta–Persona,
Grupo activo, `ownerId`, `ownershipRevision`, Membresía, `validityAnchor` y Temporada abierta. No se
propone un índice por cargo, email, nombre de Persona o estado económico. Los índices exactos sólo
podrán declararse durante una implementación autorizada; esta tabla cierra necesidades, no modifica
`firestore.indexes.json`.

## 14. Rules y acceso desde cliente

Las colecciones de grants, slots y receipts deben ser deny-all para acceso directo del cliente. Las
colecciones económicas E3-01 continúan deny-all. Conocer un path, `grantId`, `membershipId`, cargo o
cursor no concede lectura ni escritura.

Toda operación pasa por callable/servicio backend, contrato cerrado y autorización contextual. No se
propone código de Rules, índices ejecutables ni configuración en esta etapa documental.

## 15. Frontend definido

### 15.1 Controles Owner

En el detalle canónico del Grupo activo, una sección **Acceso a Tesorería** separada de **Economía**:

- lista paginada de concesiones activas e históricas;
- muestra Persona, estado y fechas, nunca UID/email;
- permite seleccionar sólo integrantes activos e íntegros elegibles;
- acción **Conceder acceso de consulta** con confirmación que enumera exactamente lo visible;
- acción **Revocar acceso** con confirmación y single-flight;
- resultado accesible `aria-live`, foco y estados loading/vacío/error/recovery;
- no ofrece edición de permisos ni campos libres de rol/capacidad;
- no ofrece controles sobre Grupo archivado.

El cargo se presenta, si ya corresponde a la superficie Owner, bajo la etiqueta **Cargo
descriptivo — no concede permisos**. La concesión se presenta como **Acceso a Tesorería — sólo
consulta**. Cambiar uno nunca cambia el otro.

### 15.2 Superficie del tesorero

- Ruta protegida focal, por ejemplo `/dashboard/groups/{groupId}/economy`, compartiendo componentes
  read-only E3-01.
- Muestra conceptos, ocurrencias y obligaciones según D04.
- No renderiza alta/edición/desactivación/generación ni controles Owner.
- No reutiliza la página Owner completa como mecanismo de ocultamiento visual.
- Si pierde autorización, limpia datos del estado de la vista, bloquea páginas nuevas y muestra
  “Tu acceso de consulta a Tesorería ya no está vigente”.
- Si finaliza Membresía, cambia Owner, cierra Temporada o se archiva Grupo, usa feedback específico
  sólo cuando el backend puede revelarlo sin filtrar información ajena; de lo contrario converge en
  acceso no vigente.

### 15.3 Ausencia de exposición a otros integrantes

- No se agrega Tesorería al roster público, perfil, historial propio general, cargo, solicitudes o
  catálogo legacy.
- Un integrante sin grant no ve navegación, sección, contadores ni estados económicos del Grupo.
- Ocultar UI es sólo presentación; backend y Rules conservan la barrera autoritativa.

## 16. Pruebas requeridas para implementación

### Dominio y contratos

1. Identificador único permitido `GROUP_TREASURY`; valores aportados por cliente se rechazan.
2. Cargo `tesorero` no concede; cualquier otro cargo tampoco impide una concesión válida.
3. DTOs exactos omiten UID, email, hashes, paths, schema y trazabilidad interna.
4. Cursores quedan ligados a actor, Grupo, capacidad y tamaño.

### Autorización y privacidad

5. Sólo Owner vigente concede/revoca/lista.
6. Integrante autorizado consulta sólo el Grupo concedido.
7. Integrante sin grant, exintegrante, otro Grupo, anónimo y rol global fallan sin efectos.
8. `listMyObligations` no se amplía y otro integrante no recibe exposición económica.
9. Cuenta–Persona–Membresía desalineadas fallan cerrado.

### Lifecycle

10. Finalización invalida el grant sin borrar historia.
11. Reactivación de la misma `membershipId` con una nueva activación acreditada no revive el grant
    anterior, haya usado éste un Período real o un ancla legacy.
12. Renovación con nueva `membershipId` no hereda.
13. Nueva concesión explícita crea otro `grantId`.
14. Archivo invalida acceso delegado y bloquea conceder/revocar; Owner conserva sólo lo ya aprobado
    por E3-01.
15. Cierre de Temporada y cambio de Owner cumplen D03.

### Concurrencia e idempotencia

16. Concesión contra finalización, reactivación, renovación, cierre, archivo y cambio de Owner
    serializa o falla cerrado.
17. Revocación que gana antes de consulta/página impide datos; consulta que gana primero refleja el
    orden real sin autorizar la siguiente página.
18. Dos concesiones concurrentes al mismo destinatario/vigencia producen un efecto.
19. Retry idéntico recupera outcome; payload distinto con la misma key conflictúa.
20. Pérdida de respuesta antes/después del commit no crea grants duplicados ni falso éxito.

### Reutilización económica y arquitectura

21. Tesorero lista conceptos, ocurrencias y obligaciones mediante los readers E3-01.
22. No puede listar candidatos MONTHLY ni invocar ninguna mutación E3-01.
23. Pagos no importa repositorios internos de autorización y autorización no importa repositorios
    internos de Membresía/Grupo/Pagos.
24. No existe lectura/escritura directa del cliente a grants, slots, receipts o economía.
25. No existe perfil CRUD, arreglo de permisos en Membresía ni comparación de cargo.

No se ejecuta ninguna suite, Emulator o comprobación implementativa bajo esta autorización.

## 17. UAT requerida y aceptación

### Recorrido humano futuro

1. Owner abre un Grupo activo con dos integrantes elegibles y observa **Acceso a Tesorería** separado
   del cargo.
2. Concede a uno; confirma que el diálogo dice “sólo consulta”.
3. El destinatario abre Economía y ve exactamente los recursos aprobados por D04, sin controles
   Owner.
4. El segundo integrante no ve acceso ni datos económicos.
5. Owner cambia el cargo del tesorero y comprueba que el acceso no cambia.
6. Owner revoca; una consulta y página posterior del destinatario fallan y la UI limpia datos.
7. Owner concede de nuevo y se observa un hecho nuevo, no reactivación del anterior.
8. Se finaliza la Membresía; la consulta deja de funcionar y la historia Owner permanece.
9. Se reactiva la misma Membresía; el acceso no vuelve hasta una nueva concesión.
10. Se renueva a otra Temporada; la nueva Membresía no hereda.
11. Se comprueban cierre de Temporada y cambio de Owner conforme a D03.
12. Se archiva el Grupo cuando sea elegible; el tesorero no accede y el Owner conserva la consulta
    histórica E3-01 sin controles de concesión.

### Criterios de aceptación de una futura implementación

1. El paquete normativo de §19 fue aprobado antes del código.
2. E3-02-D01–D04 constan como decisiones del usuario.
3. Sólo Owner vigente concede/revoca y el destinatario cumple identidad y vigencia.
4. `GROUP_TREASURY` sólo consulta el alcance cerrado; no concede operaciones futuras.
5. Cargo y permiso se presentan y autorizan separadamente.
6. Finalización, reactivación, renovación, archivo, cierre y ownership no reviven ni heredan grants.
7. Cada request y página revalidan backend; los cursores no autorizan.
8. Revocación e idempotencia conservan historia sin duplicados.
9. Economía usa readers/DTOs E3-01; no existe segunda fuente.
10. Rules niega acceso directo; privacidad negativa queda demostrada.
11. UAT confirma feedback, ausencia de controles Owner y ausencia de exposición a otros integrantes.
12. La evidencia no declara resueltos todos los CU-034–CU-038 ni cierre de Etapa 3.

## 18. Decisiones funcionales aprobadas

### E3-02-D01 — Cantidad de tesoreros por Grupo

**Aprobada:** cero o varios tesoreros. Cada concesión y revocación es individual; no existe reemplazo
implícito ni límite arbitrario. Cada Cuenta sólo puede tener una concesión efectiva de
`GROUP_TREASURY` por Grupo; una concesión posterior sustituye el puntero del slot, no la historia.

### E3-02-D02 — Vínculo Cuenta–Persona al conceder

**Aprobada:** al conceder debe existir exactamente una Cuenta canónica vinculada a la Persona de la
Membresía. Ausencia, multiplicidad o incompatibilidad bloquean sin reparación. El grant fija ambos
IDs y cada consulta vuelve a acreditar el vínculo.

### E3-02-D03 — Cierre de Temporada y cambio de Owner

**Aprobada:** conceder exige Grupo activo, Membresía activa e íntegra y Temporada exacta abierta.
Finalización invalida, reactivación no revive y renovación no hereda. El cierre canónico sólo ocurre
después de finalizar activas; la Temporada se relee como defensa y las incoherencias fallan cerrado.
Todo cambio de Owner invalida grants anteriores y requiere nueva concesión. La comparación usa una
revisión de ownership irrepetible, no sólo `ownerId`, para cubrir A → B → A.

### E3-02-D04 — Información consultable

**Aprobada:** conceptos, ocurrencias y obligaciones de todo el Grupo, incluida historia de
exintegrantes y presentación mínima ya autorizada por E3-01. Quedan excluidos roster, candidatos,
mutaciones, intents, receipts, hashes y demás datos técnicos. No existe acceso delegado sobre Grupo
archivado ni consulta histórica especial para ex-tesoreros.

## 19. Paquete normativo formalizado para D5-043

El paquete normativo formalizado contiene:

1. **Un addendum conjunto E3-02 a Documentos 2, 3 y 4**, que establezca:
   - correspondencia parcial CU-036/CU-037/CU-038 y no cobertura de CU-034/CU-035;
   - `GROUP_TREASURY` fijo, read-only y no ampliable por analogía;
   - actor, destinatario, identidad Cuenta–Persona–Membresía–Grupo y cardinalidad;
   - concesión, revocación, visibilidad, lifecycle, no herencia e historia;
   - fuente de verdad separada, revalidación backend, idempotencia, concurrencia y deny-all;
   - alcance exacto de consultas y exclusión de toda mutación/operación futura.
2. **DEC-E3-02 / D5-047**, que registra que D5-043 fue reabierta y satisfecha sólo para esta primera
   capacidad delegable, adopta el addendum y mantiene los casos restantes sin cobertura completa.

No se requiere editar retrospectivamente los PDFs ni crear un catálogo general de roles. Tampoco se
debe declarar “CU-034–CU-038 resueltos”. La ficha actual puede ser fuente de preparación, pero no
sustituye aprobación normativa.

## 20. Preservaciones y no efectos

Esta ficha y su formalización:

- no implementa código, Rules, índices, dependencias, suites, Emulator o Firebase remoto;
- no autoriza deploy, stage, commit, push, merge o cambio de rama;
- no autorizan implementación ni producción por efecto de la aprobación normativa;
- no modifica E3-01 ni duplica sus fuentes económicas;
- no implementa E3-03, validación de dinero o liquidación prearchivo;
- no retira D5-044 ni integra Auth/UAT;
- no reabre rutinariamente E2-14;
- conserva D5-045 y sus condiciones;
- mantiene Etapa 3 abierta.

## Declaración final

`LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`

Las decisiones normativas están adoptadas y los contratos técnicos rutinarios quedan cerrados. La
evolución mínima `ownershipRevision` pertenece a Grupo: todos sus writers ordinarios deberán
preservarla y sólo una futura transferencia canónica podrá incrementarla junto con `ownerId`. Esa
dependencia deberá implementarse y verificarse dentro del alcance autorizado antes de habilitar
concesiones. Este estado no autoriza código, Rules, índices, configuración, pruebas o deploy.
