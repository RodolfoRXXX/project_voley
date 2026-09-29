# E2-21 — Análisis archivado de CU-013, configuración de Grupo diferida

## Estado de la ficha

- **Estado:** `ANÁLISIS DIFERIDO / NO IMPLEMENTABLE`.
- **Decisión:** [DEC-E2-21](./DEC-E2-21-propuesta-decision-funcional.md), opción C adoptada por el usuario.
- **Caso de uso:** CU-013 — Configurar el Grupo.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Base examinada:** `dev` y `origin/dev` en `fc0a9a2f8d2076e915e43e0fcf392be6bc6205f0`, divergencia `0/0`.
- **Predecesor:** E2-20 cerrado; permitió analizar E2-21 sin autorizar implementación.
- **Implementación autorizada:** ninguna.

Este documento se archiva como análisis de frontera y registro del diferimiento adoptado; no es una
Ficha de Incremento Implementable activa. **No declara CU-013
implementado, cerrado por código ni listo para programar.** Los documentos aprobados reconocen la
configuración como información propia de Grupo, pero no existe una necesidad funcional concreta que
justifique atributos. Por DEC-E2-21 no se crean campos, contratos, UI, schema o migración. CU-013
permanece reconocido y sin cobertura implementada hasta cumplir la condición de reapertura de §17.

## 1. Objetivo, caso de uso y trazabilidad

El objetivo eventual de CU-013 es permitir una modificación autorizada de la configuración propia del
Agregado Grupo, sin convertir “configuración” en un PATCH genérico ni modificar información de otros
Agregados.

Fuentes normativas y de planificación:

1. [Documento 1](../../arquitectura/Documento-1-Arquitectura-del-Producto-y-Modelo-de-Dominio-6.5.pdf),
   sección **Grupo**: asigna a Grupo la responsabilidad de administrar configuración y enumera como
   información propia nombre, descripción, deporte, configuración, Owner, referencia a temporada
   activa y Club asociado; excluye Torneos, Pagos, Entrenamientos, Estadísticas y amistosos.
2. [Documento 1.5](../../arquitectura/Documento-1.5-Modelo-Conceptual-del-Dominio-AUD-C03.pdf),
   §§2.1, 2.2 y 2.5: Grupo es una comunidad autónoma; su configuración no pertenece a Club; el Owner
   posee control de administración y configuración sobre el recurso.
3. [Documento 2](../../arquitectura/Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf),
   §§1.2, actores 3 y 4, capacidades por actor, RF-04, RF-12 y Documento 2.3/PF-02: separa CU-012,
   CU-013, CU-014 y CU-015; atribuye al Owner la configuración de Grupo; asigna estado, rol, cargo,
   permisos, posición y dorsal a Membresía; no detalla CU-013.
4. [Documento 3](../../arquitectura/Documento-3-Arquitectura-Funcional-y-Dise-o-Tecnico-AUD-C05.pdf),
   §§6.3, 6.4, 8.5, 8.7 y 9.5–9.7: configuración e información organizativa son responsabilidad del
   Agregado Grupo; Temporada, Membresía y demás Agregados permanecen fuera; autorización funcional,
   habilitación comercial y validez de dominio son condiciones diferentes.
5. [Documento 4](../../arquitectura/Documento-4-Dise-o-de-la-Arquitectura-de-Software-AUD-C05.pdf),
   §§2.4, 4.1–4.5 y 7.2: Presentación depende de Aplicación; contratos y DTO deben ser explícitos y
   acotados; Grupo y Temporada tienen Repositorios y unidades de consistencia independientes.
6. [Documento 5](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md),
   §§5.14–5.17, 7.4 y decisiones D5-019, D5-024, D5-026, D5-034 y D5-035: exige control de alcance,
   ficha previa, contrato cerrado, frontend en el mismo incremento y señalamiento de reglas faltantes;
   Plan no concede permisos deportivos y la visibilidad es privada por defecto.
7. [E2-01](./E2-01-cierre.md), §§5, 7–10 y 20: fija Grupo v1, Owner único, backend como escritor,
   estado `activo`, deporte `voleibol`, ausencia deliberada de configuración y separación de
   Membresía, Temporada, Solicitud y Comercial.
8. [E2-13](./E2-13-ficha-retiro-autoridad-organizativa-legacy.md), §§6.4, 6.5, 6.9, 7.6 y 14:
   retira writers organizativos legacy, niega escrituras cliente y conserva una allowlist E4 de
   consumidores legacy sin convertirla en autoridad canónica.
9. [E2-20](./E2-20-ficha-edicion-minima-grupo.md), §§3–6, 8, 14–17 y 21–24, y su
   [cierre](./E2-20-cierre.md), §§3–4 y 8–9: CU-012 sólo reemplaza `nombre`; `deporte`, Owner,
   estado, identidad y metadata permanecen inmutables; descripción, configuración y catálogos no
   fueron agregados; E2-23/E2-24 conservan archivo y eliminación.
10. [E2-14](./E2-14-informe-auditoria-consolidada-etapa-2.md), §§5, 6.2, 9 y 12: CU-013 continúa
    pendiente y CU-012–015 requieren contratos canónicos separados.

Precedencia: los Documentos 1–4 son norma; Documento 5 gobierna transición e incrementos; fichas,
cierres y código integrado prueban decisiones ya aplicadas y restricciones de compatibilidad, pero no
pueden completar una regla funcional ausente.

## 2. Hallazgo normativo y significado permitido de “configuración”

La única interpretación aprobada que puede cerrarse hoy es estructural:

- configuración es información propia del Agregado Grupo;
- modificarla debe ocurrir mediante una operación de Grupo y dentro de la unidad de consistencia de un
  único Grupo;
- el Owner posee capacidad general para configurar el recurso;
- configurar no autoriza editar cualquier campo de Grupo;
- configurar no absorbe datos de Temporada, Membresía, Solicitud, Club, Plan ni consumidores
  deportivos;
- el término no aporta por sí mismo un atributo persistente, una clave, un catálogo ni un valor.

No está aprobado si CU-013 comprende horarios, reglas deportivas, preferencias de ingreso,
publicación, catálogos de roles/cargos/posiciones, parámetros económicos, notificaciones u otra opción.
Ninguno de esos conceptos se incorpora a esta ficha.

## 3. Matriz de atributos y ownership

| Dato o capacidad | Propietario normativo | Estado para E2-21 | Actor y estado conocidos | Fundamento |
| --- | --- | --- | --- | --- |
| ID de Grupo | Grupo | Inmutable | Ningún actor lo cambia | Identidad del Aggregate Root; Documento 3 §8.7 |
| `nombre` | Grupo | Excluido; ya cubierto | Owner, Grupo v1 `activo`, por E2-20 | E2-20 §§3–9 |
| descripción | Grupo | No incorporable a CU-013 sin decisión | Owner posee control general; operación concreta no definida | Documento 3 distingue “nombre y descripción” de “configuración”; CU-012 y CU-013 son casos separados |
| `deporte` | Grupo | Inmutable | Sólo se elige al crear en schema v1; no hay transición aprobada | E2-01 y E2-20 §4; cambiarlo puede invalidar consumidores e historia |
| configuración | Grupo | **Bloqueante: contenido indefinido** | Owner es el único actor inequívocamente autorizado; sólo `activo` existe hoy | Documentos 1/1.5/2/3 nombran la capacidad, no sus atributos |
| `ownerId` | Grupo | Inmutable | Sólo una transferencia de ownership separada podría cambiarlo | Documento 1.5 §2.5; E2-01; E2-20 |
| `estado` | Grupo | Excluido | E2-23/CU-014 debe definir archivo o inactivación | Documento 2 PF-02; E2-20 §§4, 14.3 y 21 |
| `createdAt` | metadata de Grupo | Inmutable | Sistema | E2-01 y E2-20 |
| `schemaVersion` | persistencia de Grupo | No editable por actor; una evolución técnica deberá definirse | Sistema | Grupo v1 posee esquema exacto y cerrado |
| referencia a Temporada activa | Temporada/Organización, fuera del Agregado Grupo salvo decisión explícita de referencia | Excluida | Casos CU-016–019 y guards ya implementados | Documentos 3 §6.4/§8.7 y 4 §§2.4/7.2 |
| estado, fechas, objetivos u observaciones de Temporada | Temporada | Excluidos | Operaciones de Temporada | Documento 1, sección Temporada; Documentos 3/4 |
| relación Persona–Grupo, estado, rol deportivo, cargo, permisos, posición, dorsal y observaciones de la relación | Membresía | Excluidos | Casos de Membresía; los permisos finos no están definidos para CU-013 | Documento 1, sección Membresía; Documento 2 RF-04; Documento 3 §6.3 |
| definición/edición/asignación/revocación de roles y configuración de permisos | Casos CU-034–CU-038; contexto de Membresía/autorización | Excluidos de CU-013 | No puede inferirse un comando de Grupo | Documento 2, PF-02/Gestión de Roles |
| Solicitud de ingreso y su estado | Solicitud | Excluidos | CU-031–CU-033 | Documento 3, límites de Grupo; E2-06–E2-09 |
| Club asociado y configuración institucional | Club/relación organizativa futura | Excluidos | Etapa 8 | Documentos 1/1.5; Documento 3 §8.7; Documento 5 §7.10 |
| visibilidad/publicación | Política transversal; operación fina no aprobada para Grupo v1 | Excluida hasta decisión específica | Privado por defecto; publicación debe ser explícita | Documento 5 §§3.11, 8/D5-024; E2-13 sólo preserva catálogo legacy |
| catálogo público legacy (`visibility`, `activo`, `descripcion`) | Compatibilidad E4, no Grupo canónico | Excluido | Read-only y sólo legacy | E2-13 §§6.8–6.9; `functions/src/httpApi.js` |
| Plan, Suscripción, capacidades y límites | Dominio Comercial | Excluidos | No otorgan permisos ni modifican Grupo | Documentos 1–3; Documento 5 D5-019 |
| preferencias personales | Usuario | Excluidas | Usuario sobre su cuenta | Documento 3 §8.7, Agregado Usuario |
| `memberIds`, `adminIds`, `admins`, `pendingAdminRequestIds` | Legado histórico; no autoridad canónica | Prohibidos | Ningún actor puede escribirlos | E2-13 |
| Partidos, Torneos, Entrenamientos, Pagos, Estadísticas y Actividad | Agregados/módulos respectivos | Excluidos | Sus propios casos de uso | Documentos 1 y 3 §§6.4/8.7 |

### 3.1 Actor y autorización que sí pueden afirmarse

- El Owner vigente es el único actor expresamente asociado a “configurar el Grupo” y disponible en el
  modelo canónico actual.
- Un rol global `admin`, arrays legacy, autenticación simple, condición de integrante o Plan no
  autorizan CU-013.
- Documento 2 admite un Administrador de Grupo cuyas capacidades dependen del rol/permisos de su
  Membresía, pero no existe una matriz fina aprobada ni una capacidad canónica implementada que le
  conceda CU-013. No se lo agrega como actor de escritura.
- El único estado persistente válido de Grupo v1 es `activo`. No existe norma que diga si un Grupo
  archivado puede consultar o cambiar configuración; E2-23 deberá resolverlo. CU-013 no anticipa esa
  transición.

## 4. Decisión sobre unidad o división

DEC-E2-21 eligió diferir CU-013. No existe por tanto un corte implementable que dividir: dividir
campos inexistentes sería tan especulativo como implementarlos. Si se cumple la condición de
reapertura, una nueva revisión deberá decidir si la necesidad cabe en un único incremento o si
publicación, roles/permisos, catálogos o coordinación con otros Agregados requieren casos propios.

E2-22 sólo podrá usar valores o permisos aprobados por su propio caso propietario; E2-23 y E2-24
siguen siendo responsables de archivo y eliminación. El diferimiento no inicia esos incrementos.

## 5. Alcance incluido y excluido

### 5.1 Incluido en este registro

- delimitación del ownership de los datos;
- identificación de la ausencia normativa;
- inventario de restricciones y consumidores;
- condiciones mínimas que una ficha implementable posterior deberá satisfacer;
- prohibición de introducir campos, permisos o reglas por analogía con el legado.
- registro trazable del diferimiento adoptado y de su condición de reapertura.

### 5.2 Excluido

- código, schema nuevo, migración, Rules, índices, callables, DTO productivo, UI productiva y pruebas;
- descripción como supuesto campo de configuración;
- edición de `deporte`, Owner, estado, identidad o metadata;
- visibilidad o publicación de Grupo v1;
- roles, cargos, permisos, posición, dorsal u observaciones de Membresía;
- defaults, preferencias o constantes específicos de vóley;
- Plan/Suscripción y cualquier capacidad comercial no aprobada;
- CU-012, CU-014, CU-015, CU-026 y CU-034–CU-038;
- capacidades de E4, E6 o posteriores.

## 6. Invariantes, validaciones y estados

Invariantes ya aprobadas que toda futura definición debe preservar:

1. Grupo conserva un único Owner vigente.
2. Una mutación de configuración modifica exclusivamente un Grupo, salvo coordinación explícitamente
   aprobada mediante operaciones independientes.
3. Temporada, Membresía, Solicitud, Club, Plan y recursos deportivos no ingresan al Agregado Grupo.
4. La autorización es contextual y se separa de habilitación comercial y validez de dominio.
5. Firestore cliente no escribe `groups`; el backend revalida identidad, cuenta y ownership.
6. `deporte`, `ownerId`, `estado`, ID, `createdAt` y `schemaVersion` no son campos configurables por
   inferencia.
7. Un Grupo v1 con campos inesperados es hoy incompatible por diseño; una evolución debe resolver
   schema y compatibilidad de forma explícita.

No se definen validaciones de configuración mientras CU-013 esté diferido. Tipo, cardinalidad,
obligatoriedad, normalización, límites, catálogos, defaults y transición deberán aprobarse sólo si se
reabre el caso.

## 7. Comandos, consultas, payload, resultados y errores públicos

**Por decisión funcional no existe un contrato público implementable.** Definir un nombre de comando o aceptar un
objeto libre `config`, `settings`, PATCH, field mask o mapa de claves sería prematuro.

La revisión normativa deberá permitir cerrar, como mínimo:

| Elemento | Decisión requerida |
| --- | --- |
| Consulta | si la configuración se incorpora al detalle Owner-scoped o requiere una proyección propia; campos exactos y privacidad |
| Comando | una única intención de negocio, no un PATCH genérico |
| Payload | `groupId` y atributos configurables enumerados; rechazo de propiedades desconocidas; estrategia de concurrencia e idempotencia sólo si corresponde |
| Resultado | `UPDATED`/`NO_CHANGES` u outcomes alternativos aprobados; estado vigente y semántica de recovery |
| Errores | no autenticado, cuenta requerida, Grupo no accesible, incompatible, validación, stale/conflicto, dependencia e interno; sólo los aplicables al contrato final |

Mientras rija el diferimiento, ninguna clave de configuración, catálogo, error adicional ni callable
queda reservado por esta ficha.

## 8. Idempotencia, concurrencia y recuperación

No hay mutación autorizada, por lo que idempotencia, concurrencia y recuperación no aplican al
alcance diferido. Si CU-013 se reabre como mutación, deberá decidir antes de implementar:

- serialización en la unidad de consistencia de un Grupo;
- revalidación de ownership dentro de la unidad confirmatoria;
- prevención de pérdida silenciosa frente a E2-20 y otras mutaciones futuras;
- efecto de cambios de configuración sobre el token de edición de nombre de E2-20;
- idempotencia durable sólo para efectos confirmados que necesiten recuperación;
- respuesta a retry después de otra edición, archivo futuro o transferencia de ownership;
- retención de receipts frente a E2-24.

No se reutiliza automáticamente el token de E2-20: hoy liga `groupId`, Owner y `nombre`, y excluye
deliberadamente otros campos. La definición final debe decidir si existe un token independiente o una
revisión común sin invalidar concurrencias no relacionadas.

## 9. Persistencia y límites de lectura/escritura

### 9.1 Estado físico actual

`groups/{groupId}` schema v1 admite exactamente:

```text
nombre, deporte, ownerId, estado, createdAt, schemaVersion
```

`hydrateGroup` rechaza claves adicionales; `FirestoreGroupRepository` sólo crea el documento exacto y
E2-20 actualiza exclusivamente `nombre`. No existe campo ni documento canónico de configuración.

### 9.2 Condición para una eventual persistencia

Sólo después de reabrir CU-013 y aprobar atributos deberá decidirse si la evolución corresponde a una nueva versión del
schema de Grupo o a persistencia interna del mismo Agregado. La decisión física debe preservar:

- un único Repositorio conceptual de Grupo;
- backend como único escritor;
- Rules `create/update/delete: false` para cliente;
- DTOs que no expongan documentos Firestore;
- compatibilidad explícita de schema v1 y estrategia para Grupos ya creados;
- ausencia de colecciones o proyecciones sin consumidor probado.

No se autoriza una subcolección por conveniencia ni una segunda fuente de verdad.

## 10. Interacción con E2-20, CU-014 y CU-015

- **E2-20:** el nombre continúa siendo editable sólo por su contrato. CU-013 no amplía
  `updateOwnGroupName`, no convierte el detalle en PATCH y no modifica sus receipts. Una evolución de
  schema deberá mantener legibles sus recovery y DTO o versionarlos explícitamente.
- **E2-23/CU-014:** conserva estado y lifecycle de Grupo. Debe definir si archivo bloquea consulta o
  cambio de configuración y adaptar recovery sin reabrir el Grupo.
- **E2-24/CU-015:** conserva eliminación. Debe decidir referencias, tombstone y retención de receipts;
  CU-013 no elimina ni limpia configuración.

## 11. Frontend y accesibilidad

No se agrega una superficie de configuración: no existe atributo ni efecto que representar. Si el caso
se reabre, una futura ficha implementable deberá ubicarla en el
detalle canónico Owner-scoped `/dashboard/groups/[groupId]`, salvo fundamento aprobado distinto, y
deberá incluir en el mismo incremento:

- controles sólo para atributos aprobados y valores comprensibles;
- estados inicial, carga, edición, envío, éxito confirmado, no changes, stale, error y pérdida de
  ownership;
- labels, asociación de ayuda/error, foco inicial y retorno de foco, navegación por teclado,
  `aria-live`, `aria-busy`, contraste y targets de interacción;
- comportamiento responsive y protección contra doble envío;
- retiro inmediato de datos Owner-scoped si se pierde autorización.

No se mostrarán controles de descripción, deporte, estado, Owner, visibilidad, permisos o catálogos
mientras no exista decisión que los asigne al caso.

## 12. Compatibilidad de consumidores y legado

Una evolución de Grupo afecta a todo consumidor que hidrata el schema exacto, incluso si no usa la
configuración. La implementación futura deberá preservar:

| Consumidor | Comportamiento que debe conservar |
| --- | --- |
| alta, listado, dashboard y detalle Owner de Grupo | crear y leer Grupos compatibles; DTO actual no crece por reflejo de persistencia |
| E2-20, edición de nombre y recovery | editar sólo `nombre`; tokens/receipts no se corrompen ni restauran configuración anterior |
| apertura, consulta, edición, cierre e historia de Temporada | validar Grupo/Owner sin absorber configuración ni fallar por una evolución compatible |
| alta, consulta, salida, finalización, reactivación, renovación e historia de Membresía | conservar referencias y autorización actuales; configuración no muta Membresía |
| Solicitudes de ingreso y decisiones | conservar preview, estado y coordinación; no copiar configuración dentro de Solicitud |
| roster Owner-scoped | conservar autorización y contexto de Temporada |
| catálogo público legacy | seguir excluyendo Grupo canónico hasta una decisión expresa de publicación |
| cuatro consumidores frontend E4 allowlisted y writers/lectores deportivos legacy | continuar limitados a documentos legacy y sin adquirir autoridad canónica nueva |
| Firestore Rules | schema canónico no se vuelve legible/escribible directamente por cliente |

La implementación actual usa `hydrateGroup` desde el Repositorio en Grupos, Temporadas, Membresías,
Solicitudes, roster y modelos de historia. Agregar una clave a documentos v1 sin adaptar/versionar ese
contrato convertiría todos esos flujos en `incompatible`.

## 13. Pruebas automatizadas, Emulator y UAT ante una reapertura

El diferimiento no requiere pruebas de producto y en esta ejecución no se ejecutan suites. Una ficha
posterior lista para implementar deberá
exigir, según el contrato aprobado:

### 13.1 Automatizadas

- dominio: atributos, normalización, defaults y combinaciones aprobadas; rechazo de campos ajenos;
- aplicación: autenticación, cuenta, Owner vigente, estado permitido y separación comercial;
- contrato: payload cerrado, DTO mínimo, errores y compatibilidad de versión;
- concurrencia/idempotencia/recovery: mismas y distintas intenciones, stale y pérdida de ownership;
- repositorio: escritura de paths exactos y cero mutaciones colaterales;
- arquitectura: Grupo como única raíz modificada; ningún acceso directo de Presentación a Firestore;
- regresión de todos los lectores enumerados en §12;
- frontend: máquina de intención, feedback, foco, teclado y pérdida de acceso.

### 13.2 Emulator

- éxito y no-op del Owner sobre Grupo compatible;
- no autenticado, no-Owner, rol global, integrante y arrays legacy no autorizan;
- Rules niega toda escritura cliente y lectura de schema canónico;
- transacciones concurrentes no pierden cambios;
- sólo cambian los campos aprobados y, si aplica, el receipt cerrado;
- Temporadas, Membresías, Solicitudes, guards, Partido/Torneo y documentos legacy permanecen iguales;
- suites canónicas completas sin regresión.

### 13.3 UAT

- sólo el Owner ve y recorre la configuración aprobada;
- lectura, edición, cancelación, guardado, recarga y feedback observable;
- dos sesiones muestran conflicto/recarga sin overwrite silencioso;
- pérdida de ownership retira la superficie;
- lectores existentes siguen mostrando nombre, deporte, estado, Temporadas, roster, Solicitudes e
  historia según sus contratos;
- teclado, foco, lectores de pantalla y viewport móvil.

UAT no sustituye pruebas automatizables de autorización, Rules, persistencia o carreras.

## 14. Riesgos y condiciones no resueltas por el diferimiento

| ID | Condición exigible si se reabre | Nivel que debe resolverla | Riesgo si se infiere |
| --- | --- | --- | --- |
| E2-21-D01 | propósito funcional y lista exacta de atributos de “configuración” | Documento 2 detallado o addendum funcional aprobado | payload y UI inventados |
| E2-21-D02 | tipo, valores, defaults, obligatoriedad, validación y combinaciones | misma decisión funcional | datos imposibles de interpretar o migrar |
| E2-21-D03 | actor por atributo; eventual permiso delegado | autorización funcional de Etapa 2 | ampliar autoridad a admins/integrantes sin base |
| E2-21-D04 | estados de Grupo en que se consulta/modifica | CU-013 coordinado con CU-014 | conflicto con archivo futuro |
| E2-21-D05 | privacidad y eventual publicación de cada atributo | política fina de visibilidad de la etapa | exponer información privada o adelantar catálogo público |
| E2-21-D06 | relación, si existe, con catálogos de roles/cargos/posiciones | CU-034–CU-038 y CU-026, no inferencia de CU-013 | mezclar Grupo y Membresía |
| E2-21-D07 | estrategia compatible de schema y concurrencia con E2-20 | ficha técnica posterior, una vez resuelto D01–D06 | romper todos los hydrators y recovery |

No hay contradicción entre que Grupo pueda ser propietario de configuración y que CU-013 se difiera:
lo primero fija una frontera potencial; lo segundo evita crear contenido sin necesidad. Documento 5
§5.17 permite decidir reglas antes de implementar y D5-035 impide programar reglas fundamentales no
definidas.

## 15. Criterios Dado/Cuando/Entonces de esta definición

1. **Dado** que los Documentos 1–4 sólo nombran configuración, **cuando** se intenta enumerar sus
   campos, **entonces** no se adopta ningún atributo sin decisión funcional aprobada.
2. **Dado** que CU-012 y CU-013 son casos separados, **cuando** se analiza descripción o nombre,
   **entonces** no se los reclasifica automáticamente como configuración.
3. **Dado** un Owner, **cuando** se analiza CU-013, **entonces** su control general no convierte
   `deporte`, Owner, estado, identidad o metadata en campos editables.
4. **Dado** un Administrador de Grupo conceptual, **cuando** no existe permiso fino canónico aprobado,
   **entonces** no obtiene autoridad de escritura en CU-013.
5. **Dado** un rol global, una Membresía, un array legacy o un Plan, **cuando** se evalúa autorización,
   **entonces** ninguno sustituye ownership ni concede CU-013.
6. **Dado** que roles, cargos, permisos, posición y dorsal pertenecen a Membresía/casos propios,
   **cuando** se delimita Grupo, **entonces** no se persisten dentro de `groups` por CU-013.
7. **Dado** Grupo v1 con esquema exacto, **cuando** se proponga un atributo, **entonces** antes de
   implementar se define versión, compatibilidad de lectores, DTO, concurrencia y migración/default.
8. **Dado** que visibilidad pública fina no está asignada a CU-013, **cuando** se revise el catálogo
   legacy, **entonces** no se copia `visibility`, `activo` ni `descripcion` a Grupo v1.
9. **Dado** que E2-23 y E2-24 son futuros, **cuando** se define CU-013, **entonces** no archiva ni
   elimina Grupo y registra las interacciones pendientes.
10. **Dada** DEC-E2-21, **cuando** se evalúa la ficha, **entonces** permanece diferida y sin cobertura
    implementada hasta que una reapertura aprobada resuelva E2-21-D01–D07.

## 16. Inventario técnico eventual después de una reapertura

No se planifican cambios técnicos bajo el diferimiento. Si se reabre, el inventario exacto sólo podrá
cerrarse después de E2-21-D01–D07 y como mínimo deberá revisar, sin
presuponer que todos cambien:

- Dominio: `functions/src/groups/domain/group.js`.
- Aplicación: `groupContract.js`, `groupDto.js`, `groupHashing.js`, `groupErrors.js`,
  `groupService.js`.
- Infraestructura: `firestoreGroupRepository.js`, un store de mutación específico si corresponde,
  receipts, `groupCallable.js` y `groupModule.js`.
- Exports: callable del caso en `functions/index.js` y wrapper delgado en `functions/callables/`.
- Seguridad: `firestore.rules`; escritura cliente debe continuar denegada.
- Capacidades/consumidores: módulos `groups/public`, Temporada, Membresía, Solicitud, historia y E2-20.
- Frontend: `types/OwnGroup.ts`, `services/groupsService.ts`, detalle Owner-scoped y componente accesible
  de configuración.
- Pruebas: dominio, aplicación, contrato, arquitectura, frontend/máquina de intención, Emulator focal,
  Rules y regresión completa.
- Documentación: informe de implementación, UAT y cierre separados; no alterar Documentos 1–5 por
  implementación.

No se habilita crear un campo genérico, documento opaco o nueva colección sólo para satisfacer este
inventario.

## 17. Condición de reapertura y veredicto

E2-21 no puede pasar directamente de diferido a implementación. Primero debe aprobarse una necesidad
funcional concreta y verificable, demostrar que el atributo o regla pertenece a Grupo y cerrar actor,
valores/default, validaciones, estados, privacidad y efecto observable. Luego una revisión nueva debe:

1. resolver E2-21-D01–D06 en el nivel normativo indicado;
2. determinar si el resultado cabe en un único corte o exige incrementos separados;
3. derivar contrato público y payload cerrados;
4. resolver schema, compatibilidad, concurrencia, idempotencia y recovery cuando correspondan;
5. concretar inventario, pruebas, Emulator y UAT sin adelantar otros casos;
6. recibir aprobación expresa; esta ficha no se autoaprueba.

DEC-E2-21-PLAN/D5-041 establece que CU-013 diferido no bloquea el futuro cierre una vez satisfechos
los demás gates. Esto no lo convierte en implementado. E2-14 y Etapa 2 siguen abiertas y E3
deshabilitada hasta repetir la auditoría y aprobar expresamente el cierre.

`E2-21 ARCHIVADO COMO ANÁLISIS DIFERIDO — CU-013 RECONOCIDO Y SIN COBERTURA IMPLEMENTADA`
