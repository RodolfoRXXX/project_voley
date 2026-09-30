# Ficha de Incremento Implementable E2-22A — Cargo descriptivo de Membresía

## Estado

- **Estado:** `REVISADA / LISTA PARA VERSIONAR — IMPLEMENTACIÓN NO INICIADA`.
- **Fecha de revisión:** 2026-09-30.
- **Base examinada:** `dev` en `d92ddf873252afd43b1462431f19f2aa8c04dd16`, igual a `origin/dev` al iniciar.
- **Caso de uso:** CU-026 — Editar una Membresía, limitado al cargo descriptivo.
- **Decisión funcional:** [addendum E2-22A](../../arquitectura/Documento-2-addendum-E2-22A-cargo-descriptivo-membresia.md).
- **Implementación:** comenzará únicamente después de versionar e integrar esta definición.
- **Plan:** E2-14 y Etapa 2 siguen abiertas; E3 permanece deshabilitada; Auth/UAT continúa aislada.

E2-22A no agota CU-026 ni aprueba la división completa propuesta durante E2-22. Dorsal, posición y
observaciones continúan como candidatos pendientes. Rol deportivo, perfiles y permisos conservan
sus casos de uso propios.

## 1. Objetivo, trazabilidad y problema

El objetivo es permitir que el Owner vigente asigne, reemplace o quite un único cargo descriptivo
de una Membresía activa de su Grupo, con Temporada abierta. El cargo comunica una función
organizativa; no concede capacidades.

La definición completa el vacío de CU-026 sin convertirlo en un `PATCH` genérico ni mezclarlo con
identidad, ciclo de vida, Persona, catálogos, roles, permisos o información deportiva de otros
Agregados.

### 1.1 Norma funcional

- [Documento 1](../../arquitectura/Documento-1-Arquitectura-del-Producto-y-Modelo-de-Dominio-6.5.pdf),
  §§3.4, 6, 7 y glosario: Membresía representa Persona–Grupo; el cargo pertenece a esa relación, es
  descriptivo y los permisos no dependen de él.
- [Documento 1.5](../../arquitectura/Documento-1.5-Modelo-Conceptual-del-Dominio-AUD-C03.pdf),
  §§2.9–2.10 y entidad Membresía: los atributos de pertenencia son contextuales; roles y permisos no
  son globales.
- [Documento 2](../../arquitectura/Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf),
  PF-02, RF-03/04, RF-17–20 y CU-026–030/CU-034–038: editar atributos, finalizar, reactivar,
  renovar y administrar roles/permisos son responsabilidades distintas; una Temporada cerrada no
  admite cambios de Membresía.
- [Documento 3 AUD-C05](../../arquitectura/Documento-3-Arquitectura-Funcional-y-Dise-o-Tecnico-AUD-C05.pdf),
  adenda §§4.1–4.4, 7–8 y cuerpo §§6.3–6.4, 8.7–8.10: Membresía es la raíz de consistencia; Persona,
  Grupo y Temporada son referencias externas.
- [Documento 4 AUD-C05](../../arquitectura/Documento-4-Dise-o-de-la-Arquitectura-de-Software-AUD-C05.pdf),
  adenda §§4–5, 8 y cuerpo §§4–5, 7.2, 10.2, 11, 13: contratos mínimos, mutaciones por la raíz y su
  repositorio, Firestore fuera del contrato público y Períodos sin API independiente.
- [Documento 5](../../transicion/Documento%205%20-%20Plan%20de%20Implementaci%C3%B3n%20y%20Transici%C3%B3n%20T%C3%A9cnica-borrador.md),
  §§3.6, 3.10–3.13, 5.14–5.17, 7.4, D5-024/025/026/033/034/035/041 y §9: privado por defecto,
  autorización contextual, frontend en el mismo incremento y prohibición de inferir reglas faltantes.

### 1.2 Decisiones e incrementos

- [DEC-E2-21](./DEC-E2-21-propuesta-decision-funcional.md), su
  [addendum](../../arquitectura/Documento-2-addendum-DEC-E2-21-diferimiento-CU-013.md) y
  [D5-041](./DEC-E2-21-propuesta-ajuste-documento-5.md): E2-22 es independiente de CU-013 y no
  puede consumir catálogos o permisos inexistentes.
- [Addendum E2-22A](../../arquitectura/Documento-2-addendum-E2-22A-cargo-descriptivo-membresia.md):
  cierra actor, destinatario, visibilidad, opcionalidad y comportamiento de ciclo de vida.
- [E2-03](./E2-03-ficha-membership-owner-self.md), [E2-05](./E2-05-ficha-finalizacion-membership-owner-self.md),
  [E2-09](./E2-09-ficha-reactivacion-membership-por-solicitud.md),
  [E2-10](./E2-10-ficha-salida-voluntaria-membresia-propia.md) y
  [E2-12](./E2-12-ficha-finalizacion-administrativa-membership-owner.md): alta y lifecycle vigentes.
- [E2-18](./E2-18-cierre.md): renovar crea una raíz nueva con lineage; E2-22A dispone que nazca sin cargo.
- [E2-19](./E2-19-cierre.md): la consulta histórica no contiene snapshots de atributos.
- [E2-20](./E2-20-cierre.md): precedente técnico para token, receipt, reautorización y recovery; no
  constituye norma funcional de Membresía.
- [Corrección E2-14/CU-030](./E2-14-correccion-resolucion-CU-030.md): sólo existen `activa` y
  `finalizada`; CU-026 no edita estado ni introduce un setter genérico.

### 1.3 Código observado, no norma

- `membership.js` posee schemas exactos v1–v4 y rechaza campos extra; ninguno contiene cargo.
- `firestoreMembershipRepository.js` persiste raíz y Períodos, sin comando de edición de atributos.
- `membershipDto.js` no expone cargo; el roster Owner entrega identidad mínima, ingreso y Owner.
- `membershipContract.js` no tiene payload de CU-026.
- `firestore.rules` niega al cliente acceso directo a Membresías y Períodos.
- `ActiveGroupMembersSection.tsx` presenta roster Owner y finalización; el detalle legacy fue retirado.
- `posiciones.js` y roles/arrays legacy no son fuente funcional ni de autorización.

Rutas auditadas: `volley-ranking-system/functions/src/memberships/`,
`volley-ranking-system/functions/src/requests/`, `volley-ranking-system/firestore.rules` y
`volley-ranking-frontend/src/components/memberships/`.

## 2. Alcance exacto y exclusiones

### Incluido

- Un único atributo opcional `cargo` en una raíz de Membresía.
- Asignar o reemplazar un texto canónico de 1–80 caracteres.
- Quitar el cargo mediante ausencia explícita.
- Lectura exclusiva del Owner en detalle de edición y roster administrativo.
- Conservación en finalización y reactivación de la misma raíz.
- Nueva Membresía de renovación sin cargo.

### Excluido

- `membershipId`, `personId`, `groupId`, `seasonId`, `estado`, fechas, Períodos y lineage.
- Alta, finalización, reactivación y renovación, que conservan sus comandos propios.
- Catálogos de cargos, roles o posiciones.
- Rol deportivo, perfiles, permisos, asignaciones o delegación.
- Dorsal, posición y observaciones: candidatos pendientes, no aprobados por esta ficha.
- Datos personales de Persona y preferencias legacy de Usuario.
- Datos producidos por Partido, Entrenamiento, Seguimiento, Torneo o Pago.
- Timeline, snapshots o auditoría funcional de cambios de cargo.

## 3. Cargo descriptivo y perfiles de permisos

El cargo es texto descriptivo. Un futuro perfil de permisos será otra entidad conceptual: tendrá
identidad estable y capacidades explícitas, definidas por sus propios casos de uso. El nombre visible
del cargo nunca es credencial de autorización y no se comparará para inferir una asignación.

E2-22A no agrega `profileId`, perfiles vacíos, catálogo anticipado, flags, mapas, arrays de permisos
ni asociaciones cargo–perfil. Los identificadores y asignaciones persistentes aparecerán sólo cuando
exista el primer módulo con capacidades reales para delegar. La persistencia opcional de `cargo`
permite esa evolución por separación conceptual, pero no promete compatibilidad automática,
migración ni vínculo futuro.

## 4. Autorización, estados y visibilidad

La preparación, confirmación y recuperación requieren:

1. autenticación y Cuenta canónica compatible;
2. Grupo canónico accesible y `ownerId == UID` al preparar y al confirmar;
3. Membresía objetivo perteneciente exactamente al Grupo y a la Temporada referenciada;
4. Membresía `activa`;
5. Temporada exacta `abierta` al confirmar;
6. schema y referencias compatibles.

El Owner no necesita Persona ni Membresía propia para administrar a un tercero. Administrador,
integrante, rol global, Plan, cargo, arrays legacy o conocimiento del ID no autorizan. La habilitación
comercial no aplica mientras no exista una regla aprobada. Errores de acceso no enumeran objetivos.

El cargo se expone sólo al Owner vigente en roster administrativo y detalle de edición. No alcanza
DTO propios, de integrantes, Solicitudes, historial ni APIs públicas.

## 5. Ausencia, normalización e invariantes

Contrato de entrada:

- `cargo: string` asigna o reemplaza;
- `cargo: null` solicita remoción explícita;
- propiedad omitida, `undefined`, cadena vacía o sólo whitespace son inválidas.

Para una cadena se rechazan controles Unicode de categoría `Cc`; luego se aplica NFC, `trim`, colapso
de whitespace Unicode interno a un espacio ASCII y conteo por code points. El resultado debe tener
1–80 caracteres inclusive. Se compara y persiste el valor canónico.

La ausencia se persiste omitiendo físicamente `cargo`; nunca como `null`, vacío o sentinel. Quitar un
cargo ya ausente y guardar el mismo valor canónico producen `NO_CHANGES`.

La operación no altera identidad, referencias, estado, fechas, Períodos, lineage, Persona, Grupo,
Temporada, Solicitudes, guards de lifecycle ni otros Agregados. Campos desconocidos y schemas
incompatibles fallan cerrados. No existe escritura cliente directa ni actualización libre.

## 6. Contratos públicos cerrados

### 6.1 Lectura Owner-scoped

`getMembershipCargoForOwnedGroup({ groupId, membershipId })`

```text
{
  membership: {
    id,
    person: { status: "AVAILABLE", firstName, lastName }
          | { status: "UNAVAILABLE" },
    cargo: string | null
  },
  editToken
}
```

El token opaco liga versión contractual, Grupo, Membresía, Temporada, activación/estado, cargo
canónico actual y Owner vigente. No es autorización durable.

### 6.2 Confirmación

`updateMembershipCargoForOwnedGroup({ groupId, membershipId, cargo, editToken, idempotencyKey })`

```text
{
  outcome: "UPDATED" | "NO_CHANGES",
  recovered: boolean,
  appliedEffect: null | {
    membershipId,
    cargo: string | null,
    confirmedAt,
    editToken
  },
  currentMembership: {
    id,
    estado: "activa" | "finalizada",
    cargo: string | null
  },
  currentEditToken: string | null
}
```

`NO_CHANGES` hace cero escrituras, no crea receipt y no consume la clave. `UPDATED` confirma la
mutación y un receipt durable. Un recovery exacto devuelve el efecto aplicado y el estado actual
reautorizado, sin repetir la escritura. Si la raíz fue finalizada después, el efecto sigue siendo el
confirmado, `currentMembership.estado` es `finalizada` y `currentEditToken` es `null`.

Errores públicos: `UNAUTHENTICATED`, `ACCOUNT_REQUIRED`, `GROUP_NOT_ACCESSIBLE`,
`TARGET_MEMBERSHIP_NOT_ACCESSIBLE`, `TARGET_MEMBERSHIP_NOT_ACTIVE`,
`MEMBERSHIP_SEASON_NOT_MODIFIABLE`, `EDIT_TOKEN_STALE`, `VALIDATION_FAILED`,
`IDEMPOTENCY_CONFLICT`, `INCOMPATIBLE_STATE`, `CONFLICT`, `DEPENDENCY_UNAVAILABLE` e
`INTERNAL_ERROR`. Mensajes internos, paths y existencia ajena no se filtran.

## 7. Persistencia y compatibilidad de schema

Los schemas v1–v4 permanecen legibles sin backfill ni migración global. Se propone:

- **v5:** familia sin lineage, con `cargo` opcional. Admite una variante legacy activa que conserva
  exactamente la forma temporal de v1, sin `latestPeriodId` ni `periodCount`, y variantes
  period-aware activa/finalizada equivalentes a v3;
- **v6:** familia con lineage equivalente a v4, activa o finalizada, con
  `previousMembershipId` y `cargo` opcional.

Cada variante mantiene una forma exacta: sólo se admite `cargo` ausente o string canónico; `null`,
vacío y campos extra son incompatibles. La presencia de metadata de Períodos en v5 no es opcional
libre: corresponde exclusivamente a la variante legacy activa o a las variantes period-aware
cerradas. No existe variante v5 finalizada sin Períodos.

La matriz de evolución al editar es exhaustiva:

| Schema de origen | Estado posible | Resultado de editar cargo | Períodos, lineage y metadata histórica |
| --- | --- | --- | --- |
| v1 | Activa, sin Períodos | v5 legacy activa | Conserva ausencia de Períodos; no crea `latestPeriodId`, `periodCount`, subdocumentos ni lineage |
| v2 | Finalizada, sin Períodos | No editable; `TARGET_MEMBERSHIP_NOT_ACTIVE` | Reactivar por su caso propio crea Períodos y v3; una edición posterior sigue la fila v3 |
| v3 | Activa o finalizada, period-aware | Sólo activa: v5 period-aware activa | Conserva exactamente `latestPeriodId`, `periodCount` y Períodos; finalizada no es editable |
| v4 | Activa o finalizada, period-aware con lineage | Sólo activa: v6 activa | Conserva exactamente `latestPeriodId`, `periodCount`, Períodos y `previousMembershipId`; finalizada no es editable |
| v5 | Activa o finalizada, sin lineage | Sólo activa: conserva su variante v5 | No agrega ni quita metadata temporal; finalizada no es editable |
| v6 | Activa o finalizada, con lineage | Sólo activa: conserva v6 | No agrega ni modifica metadata temporal o lineage; finalizada no es editable |

Altas nuevas posteriores al rollout nacen v5 period-aware sin cargo. Renovaciones nuevas nacen v6
sin cargo, aunque la predecesora lo tenga. Agregar, reemplazar o quitar cargo jamás crea, elimina ni
reescribe Períodos, `latestPeriodId`, `periodCount`, `previousMembershipId`, fechas de lifecycle o
metadata histórica.

Finalizar una v5 legacy activa conserva cargo y ejecuta la adaptación histórica ya propia de
finalización: materializa el primer Período y deja v5 period-aware finalizada. Esa creación de
Período pertenece exclusivamente a CU-027/CU-028, no a la edición de cargo. Finalizar v5
period-aware o v6 conserva cargo, versión, metadata y lineage. Reactivar una v2 sigue produciendo v3
sin cargo; reactivar v5/v6 conserva cargo y lineage existente mientras agrega únicamente el nuevo
Período previsto por CU-030. Renovar desde cualquier versión crea una v6 nueva sin cargo y sólo con
el lineage que corresponde a CU-029.

El repositorio sigue siendo el único escritor. `validityPeriods` no cambia. Un store transaccional
específico conserva los campos no editados y crea receipt sólo para `UPDATED`. La colección física
propuesta `membershipCargoUpdateReceipts` —o nombre equivalente cerrado al implementar— queda
deny-all, con actor, Membresía, hash canónico de request, efecto string/null, timestamp y versión de
receipt. Su ID deriva de actor y `idempotencyKey`. Los receipts E2-22A se retienen indefinidamente:
este corte no define TTL, expiración ni borrado, por lo que el recovery de una clave confirmada no
caduca. Un cambio futuro requerirá otra decisión explícita y una estrategia que preserve el recovery
de receipts existentes; no puede reinterpretarlos como historial consultable. No se requiere índice
nuevo.

## 8. Auditoría de lectores y escritores actuales

| Flujo actual | Regla de adaptación E2-22A |
| --- | --- |
| Alta Owner y alta por Solicitud | Crear v5 period-aware sin `cargo`; no aceptar ni inferir cargo |
| Finalización Owner/self/administrativa | Preservar último cargo; v5 legacy materializa Período sólo aquí; v5 period-aware/v6 conservan schema, metadata y lineage |
| Reactivación por Solicitud | v2→v3 sin cargo; v5/v6 preservan cargo y lineage y agregan sólo el Período propio de reactivación |
| Renovación | Crear v6 sin cargo; nunca leer/copiar el cargo de la predecesora |
| Guards de unicidad/lifecycle | Reconocer v5/v6; no almacenar ni autorizar por cargo |
| Repositorio y Períodos | Admitir v5/v6 exactos; Períodos permanecen sin cambios |
| Roster administrativo | Agregar cargo opcional sólo al DTO Owner-scoped |
| Detalle Owner | Nuevo DTO mínimo de §6.1; tolerar Persona `UNAVAILABLE` |
| Consulta propia actual E2-04 | Hidratar v5/v6; DTO sin cargo |
| Historial E2-19 | Hidratar v5/v6; DTO sin cargo ni snapshot |
| Solicitudes y sus resultados | No aceptar, copiar ni exponer cargo |
| Lectores públicos, integrantes y legacy | Sin cargo y sin nuevos comportamientos |

Esta auditoría obliga a adaptar hydrators/writers exhaustivos durante implementación, pero no
autoriza cambios de código en esta definición.

El inventario concreto comprende el dominio `membership.js`; el repositorio de Membresías; los
stores de finalización propia y administrativa; `firestoreMembershipLifecycleGuard` y
`firestoreActiveMembershipGuard`; `groupJoinRequestMembershipCapability` para alta, reactivación y
renovación; `seasonClosureMembershipCapability`; los readers de roster Owner, Membresías propias e
historial; DTO, contratos y exports; Rules; y el servicio, tipos y componente de roster frontend.
Todo branch exhaustivo que hoy discrimina `[3, 4]`, `schemaVersion === 4` o campos exactos debe ser
revisado para v5/v6 sin ampliar los DTO excluidos.

## 9. Concurrencia, idempotencia y recovery

- Dos ediciones preparadas sobre el mismo estado: una aplica; la otra recibe `EDIT_TOKEN_STALE`.
- Finalización primero: la edición se rechaza; edición primero: finalización preserva el cargo.
- Reactivación conserva cargo, pero cambia activación y vuelve inválido todo token anterior.
- Renovación crea otra raíz sin cargo; un token de la predecesora nunca aplica a la sucesora.
- Cierre de Temporada antes de confirmar bloquea la edición.
- Transferencia de ownership obliga a reautorizar; el ex Owner no edita ni recupera datos privados.
- Otra escritura sobre la raíz provoca conflicto/revalidación transaccional, nunca lost update.

Para recovery, tras reautorizar al Owner y comprobar pertenencia Grupo–Membresía se consulta el
receipt antes de exigir estado activo. Así se recupera exactamente una respuesta perdida aunque una
finalización posterior haya cambiado el estado. Mismo actor/clave con request diferente produce
`IDEMPOTENCY_CONFLICT`; la autorización actual siempre prevalece sobre el receipt.

## 10. Efecto en roster, detalle, consultas e historial

- El roster Owner muestra el cargo vigente o su ausencia y ofrece la acción contextual.
- El detalle de edición muestra únicamente identidad segura, cargo actual y token.
- Las consultas propias, de integrantes, Solicitudes y públicas no cambian.
- E2-19 continúa sin cargo. No existen snapshots ni timeline de ediciones.
- Una raíz finalizada conserva el último cargo como dato final preservado. Un lector futuro sólo
  podría presentarlo con esa semántica, no como valor vigente en cada instante histórico.
- La nueva raíz renovada carece de cargo; el lineage no implica herencia.

## 11. Frontend completo del incremento

La implementación deberá integrar el flujo en `ActiveGroupMembersSection` o su composición Owner:

1. mostrar cargo opcional y acción «Editar cargo» sólo en filas elegibles;
2. obtener detalle seguro y token desde backend antes de editar;
3. admitir Persona `UNAVAILABLE` sin bloquear una Membresía válida;
4. ofrecer Guardar, Quitar y Cancelar; Quitar envía `null` explícito;
5. mostrar ayuda: «El cargo es descriptivo y no otorga permisos»;
6. aplicar validación equivalente, contador, teclado, foco restaurado y controles de al menos 44 px;
7. usar single-flight y conservar la clave durante retries recuperables;
8. cubrir loading, no-op, éxito, stale, pérdida de autorización, Temporada cerrada, raíz finalizada,
   dependencia no disponible y error sanitizado;
9. refrescar autoritativamente el roster después de éxito o stale;
10. retirar de inmediato contenido privado si cambia ownership;
11. mantener responsive y cero acceso Firestore directo.

No se revive la ruta legacy ni se muestran controles futuros de rol, permiso, dorsal, posición u
observaciones.

## 12. Pruebas, Emulator y UAT

### Automatizadas

- Dominio: variantes exactas v5/v6, matriz v1–v6, normalización, ausencia, no-op, transición y
  preservación sin fabricar Períodos o lineage al editar.
- Contrato/aplicación: payload cerrado, Auth/Cuenta/Owner, Temporada, objetivo, token, clave, errores
  y DTO exactos.
- Persistencia: preservación de campos, receipt sólo para `UPDATED`, recovery y cero efectos laterales.
- Concurrencia determinista para todos los órdenes de §9.
- Arquitectura: dominio sin Firebase, Application sin Admin SDK, repositorio exclusivo, capacidad
  pública mínima para Grupo/Temporada, sin constantes legacy ni repositorios ajenos.
- Regresión: alta, finalización, reactivación, renovación, Solicitudes, guards, roster, E2-04 y E2-19.
- Frontend: estados, validación, quitar, single-flight, retry, foco y ausencia de Firestore directo.

### Emulator

- Forma exacta v5/v6 y Rules deny-all para raíz, Períodos y receipts.
- Owner/no Owner/global admin/integrante/ID conocido.
- Temporada abierta/cerrada, activa/finalizada, referencias cruzadas y schema corrupto.
- Carreras con edición, finalización, reactivación, renovación, cierre y transferencia de ownership.
- Respuesta perdida, retry exacto, clave conflictiva y recovery reautorizado.
- Roster actualizado; DTO propios/históricos/Solicitudes sin cargo.
- Lectura compatible v1–v4, edición v1→v5 sin Períodos, v3→v5, v4→v6 y evolución sólo mediante
  comando autorizado.

### UAT

La UAT manual cubre exclusivamente recorridos observables: asignar, reemplazar, quitar, no-op,
validación, error recuperable, stale visible, actualización del roster, teclado, foco y responsive.
Carreras, schemas, Rules, atomicidad y persistencia corresponden a pruebas/Emulator/inspección. La
rama Auth/UAT permanece aislada y no constituye evidencia de esta definición.

## 13. Criterios Dado/Cuando/Entonces

1. **Dado** un Owner vigente, una Membresía activa y su Temporada abierta, **cuando** confirma texto
   válido con token vigente, **entonces** sólo cambia el cargo y recibe `UPDATED`.
2. **Dado** un cargo presente, **cuando** confirma `null`, **entonces** se omite el campo y el roster
   Owner muestra ausencia.
3. **Dado** el mismo valor canónico o ausencia ya existente, **cuando** confirma, **entonces** recibe
   `NO_CHANGES`, sin escritura, receipt ni consumo de clave.
4. **Dada** entrada omitida, vacía, sólo whitespace, con controles o fuera de 1–80, **cuando** se
   confirma, **entonces** recibe `VALIDATION_FAILED` sin escritura.
5. **Dado** un no Owner, **cuando** prepara, confirma o recupera, **entonces** se rechaza sin enumerar.
6. **Dada** una Temporada cerrada o raíz finalizada, **cuando** se intenta editar, **entonces** falla
   sin alterar raíz, Períodos ni guards.
7. **Dada** una finalización posterior a preparar, **cuando** se confirma el token, **entonces** se
   rechaza; si la edición ocurrió primero, la finalización conserva el cargo.
8. **Dada** una reactivación, **cuando** se usa un token de la activación anterior, **entonces** queda
   stale y el cargo preservado no cambia.
9. **Dada** una renovación, **cuando** nace la sucesora, **entonces** nace sin cargo y no acepta el
   token de la predecesora.
10. **Dadas** dos ediciones concurrentes, **cuando** confirman valores distintos, **entonces** una
    aplica y la otra queda stale.
11. **Dada** una respuesta perdida tras `UPDATED`, **cuando** el Owner vigente repite request y clave,
    **entonces** recupera el efecto sin otra mutación, aun si luego se finalizó la raíz.
12. **Dada** una transferencia de ownership, **cuando** el ex Owner reintenta, **entonces** no recibe
    datos; el efecto previamente confirmado no se revierte.
13. **Dado** cualquier texto de cargo, **cuando** se autoriza otra operación, **entonces** no concede
    permiso, rol, ownership ni capacidad legacy.
14. **Dada** una consulta propia, de integrante, Solicitud, pública o histórica, **cuando** responde,
    **entonces** no incluye cargo ni snapshots.

## 14. Inventario técnico esperado

- Dominio: schemas v5/v6, hidratación compatible y comando específico de cambio de cargo.
- Application: contratos, DTO Owner, validación, token, hashing, servicio y errores específicos.
- Infraestructura: repositorio/store transaccional y receipts deny-all.
- Integraciones: adaptación exhaustiva de escritores, guards y readers indicados en §8.
- Callable/export con nombres específicos; ningún `updateMembership` genérico.
- Frontend: tipos, servicio, componente Owner y estados de §11.
- Pruebas unitarias, contractuales, arquitectónicas, frontend y Emulator focales.
- Informe y cierre posteriores separados.

No se anticipan reglas permisivas, índices, migración global, backfill, deploy, Firebase remoto,
eventos, notificaciones, catálogos ni infraestructura de permisos.

## 15. Riesgos y controles

| Riesgo | Control cerrado |
| --- | --- |
| Cargo tratado como permiso | Nunca autoriza; sin asociación textual ni profile ID |
| Perfil anticipado sin consumidor | No crear hasta el primer módulo delegable y sus casos propios |
| Campo abierto o PATCH genérico | Comando, DTO y schema exactos sólo para `cargo` |
| Ruptura de raíces antiguas | Lectura v1–v4; v5/v6 aditivos y sin backfill |
| Reescritura histórica | Sólo activa/abierta; finalizada preserva último valor; sin snapshots |
| Herencia falsa al renovar | Sucesora v6 siempre sin cargo |
| Filtración a integrantes/público | Cargo limitado a DTO Owner; regresiones obligatorias |
| Lost update o retry duplicado | Token, transacción, receipt e idempotencia reautorizada |
| Constantes o autoridad legacy | Prohibidas como catálogo o fuente de permisos |

## 16. Decisiones pendientes fuera de E2-22A

1. Dorsal: tipo, formato, nulabilidad, rango, unicidad, actor y visibilidad.
2. Posición: semántica, cardinalidad y catálogo multideporte; no usar constantes legacy.
3. Observaciones: finalidad, lectores, sensibilidad, longitud y retención.
4. Rol deportivo, catálogo, perfiles, capacidades, asignación y revocación mediante CU-034–038.

Estas decisiones no bloquean E2-22A y no permiten declarar agotado CU-026 ni aprobada toda su
división.

## 17. Criterio de salida documental

La ficha queda lista para versionar porque tiene decisión funcional trazable, atributo único,
contratos cerrados, compatibilidad explícita, concurrencia/recovery, frontend, pruebas y UAT. No
autoriza implementación antes de su versionado e integración ni modifica gates de Etapa 2.

`E2-22A REVISADO — LISTO PARA VERSIONAR`
