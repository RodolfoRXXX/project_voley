# Ficha de Incremento Implementable E2-19 — Historial propio de grupos por Membresías

## Estado de la ficha

`APROBADA — LISTA PARA VERSIONAR`

- **Fecha:** 2026-09-25.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Caso de uso:** CU-010 — Consultar el historial de grupos.
- **Rama de definición:** `feat/e2-19-own-group-history`.
- **Checkpoint:** `dev`, `origin/dev` y HEAD de partida en `bfb994c3f5dce11445b5f99b8a3c137e75e7ff44`.
- **Fuente de verdad:** raíces canónicas de Membresía y sus Períodos de Vigencia.
- **Naturaleza:** consulta propia, privada y exclusivamente read-only.

Esta ficha define un corte implementable independiente. No implementa código, no modifica documentos anteriores, no cierra E2-14 ni la Etapa 2, no habilita E3 y no autoriza deploy ni acceso a Firebase remoto.

## 1. Objetivo y resultado observable

Una Persona vinculada a su Cuenta puede consultar una cronología paginada de las relaciones de pertenencia que tuvo o mantiene con Grupos. Cada fila representa exactamente una raíz de Membresía en una Temporada concreta, aunque el mismo Grupo aparezca varias veces por renovaciones intertemporada.

La superficie se denomina **“Historial de grupos”**, está separada de **“Grupos que integrás”** de E2-04 y no ofrece acciones administrativas ni de lifecycle.

## 2. Fundamento normativo y fuentes contrastadas

### 2.1 Jerarquía normativa

1. Documento 1 define Membresía como la relación Persona–Grupo, con contexto de Temporada, estado, fecha de ingreso y fecha de egreso, y admite múltiples Membresías a lo largo de la vida deportiva.
2. Documento 1.5 distingue Usuario, Persona y Membresía; establece que una Persona puede tener múltiples Membresías y que la incorporación a un Grupo integra su historia.
3. Documento 2 define CU-008 “Visualizar los grupos a los que pertenece” y, por separado, CU-010 “Consultar el historial de grupos”; asigna a CU-010 las entidades Persona y Membresía.
4. Documentos 3 y 4 mantienen a Membresía como único Aggregate Root de su Agregado, con Persona, Grupo y Temporada como referencias externas, y exigen contratos mínimos y composición sin transferir ownership.
5. AUD-C05 y sus adendas establecen que los Períodos de Vigencia son información original subordinada del ciclo de vida de Membresía; no son Actividad, guard, intent, log ni proyección. CU-028 conserva la misma raíz y CU-029 crea una raíz nueva para otra Temporada.
6. Documento 5 se usa como mapa preliminar de transición: exige fuente única, backend autoritativo, frontend en el incremento, compatibilidad acotada y evidencia reproducible. No redefine CU-010.

### 2.2 Evidencia de incrementos cerrados

- E2-03 crea la primera Membresía canónica y su unicidad activa.
- E2-04 lista sólo pertenencias actuales operativas y reserva expresamente la semántica histórica.
- E2-05, E2-10 y E2-12 finalizan Membresías y conservan sus fechas y Períodos.
- E2-09 reactiva la misma raíz dentro de la misma Temporada; una reactivación no crea otra fila histórica.
- E2-11 lista integrantes activos para el Owner y no autoriza historia ajena.
- E2-16 fija el patrón read-only para historia paginada, cursor contextual, ancla puntual, lookahead y ausencia de snapshot multipágina.
- E2-18 crea una raíz v4 por renovación, enlaza sólo la predecesora inmediata y prohíbe usar guards como historia.
- Los correctivos concurrentes E2-02 y E2-03/E2-05 exigen releer estado autoritativo ante fallos ambiguos; no habilitan inferir éxito ni reparar durante una consulta.

E2-18 está formalmente cerrada e integrada. E2-14 continúa `ABIERTA — CIERRE DE ETAPA 2 BLOQUEADO`, queda reservada para repetir la auditoría consolidada, y E3 sigue deshabilitada.

### 2.3 Evidencia física vigente

El repositorio contiene:

- raíces de Membresía v1, v2, v3 y v4 con schemas cerrados;
- Períodos materializados sólo para v3/v4;
- `previousMembershipId` sólo en v4;
- active guards y lifecycle guards para unicidad/coordinación vigente;
- readers actuales y owner-scoped, pero ningún reader de historia propia;
- Rules deny-all para `memberships`, subcolecciones de Períodos y guards;
- un índice `personId + estado + fechaIngreso DESC`, insuficiente para consultar todos los estados sin filtrar;
- frontend callable-only para las superficies canónicas migradas.
- `@google-cloud/firestore` 6.8.0, instalado transitivamente, expone transacciones explícitamente `readOnly`, `transaction.getAll(...)` y uso transaccional de queries; el repositorio ya utiliza `transaction.getAll(...)` en otros módulos.

La auditoría técnica original aporta la deuda de acceso directo y modelos legacy de la línea base. La auditoría E2-14 confirma que CU-010 sigue pendiente y exige resolverlo desde Membresías/Temporadas sin fuente duplicada.

## 3. Significado aprobado de CU-010

### 3.1 Alternativa elegida

Se elige la **Alternativa B — una entrada por Membresía**.

Una raíz representa una relación histórica Persona–Grupo en una Temporada concreta. La misma raíz puede contener varios Períodos por reactivaciones dentro de esa Temporada; una renovación intertemporada crea otra raíz y, por tanto, otra fila.

CU-010 devuelve una cronología completa de raíces activas y finalizadas. Las activas se identifican inequívocamente como actuales y las finalizadas como históricas. Esta inclusión no sustituye E2-04:

- E2-04 sigue siendo la superficie operativa de pertenencias utilizables y aplica Grupo activo, Temporada abierta, guards e integridad operativa;
- E2-19 explica la trayectoria, admite filas finalizadas y no concede navegación ni acciones operativas;
- la duplicación mínima de contexto actual es necesaria para que la cronología no oculte una raíz reactivada que conserva Períodos anteriores.

La microcopy obligatoria debajo del título es: **“Esta cronología incluye tus pertenencias actuales y finalizadas. Las actuales también aparecen en ‘Grupos que integrás’, donde están disponibles las acciones operativas.”** Así, la repetición entre secciones es deliberada y explicada: E2-04 responde “¿qué puedo usar ahora?” y E2-19 responde “¿cuál fue y es mi trayectoria?”. Dentro de E2-19 una raíz activa aparece una sola vez, con `CURRENT`; sus reactivaciones no se convierten en filas adicionales.

No existe una segunda consulta ni un array separado para el estado actual: el orden es único y cada fila se clasifica mediante `status`. Así se preservan paginación y coste directos sin confundir una raíz activa con una finalizada.

### 3.2 Alternativas descartadas

**Alternativa A — una entrada por Grupo:** descartada porque colapsa raíces creadas por CU-029, oculta renovaciones, exige agregación multipágina y puede requerir reconstruir el linaje completo. Confunde resumen de UI con identidad normativa.

**Alternativa C — Grupo resumido con episodios subordinados:** descartada porque demanda agrupación no acotada, arrays crecientes o N+1 sin techo, complica cursor y orden, y convierte una consulta por raíces en un DTO excesivo.

## 4. Alcance incluido

- callable `listMyGroupMembershipHistory`;
- Cuenta propia y Persona propia obligatorias;
- todas las raíces compatibles de esa Persona, activas y finalizadas;
- una fila por raíz, sin agrupar por Grupo;
- Grupo y Temporada mínimos por composición server-side;
- resumen mínimo de cantidad de Períodos;
- clasificación autoritativa de origen inicial o renovación desde la versión cerrada de la raíz, sin resolver ni exponer IDs enlazados;
- orden total, paginación por cursor y lookahead;
- frontend separado en `/dashboard/groups`;
- pruebas focales, Emulator, arquitectura, frontend y UAT local;
- cero escrituras.

No existe límite temporal artificial: se recorre toda la historia compatible de la Persona mediante páginas acotadas.

## 5. Exclusiones

- CU-026 y CU-030;
- CU-012 a CU-015 y cualquier administración de Grupo;
- CU-029, ya cerrado en E2-18;
- edición, cierre o reapertura de Temporada;
- historia administrativa del Grupo o historia de ownership;
- historia de otra Persona, roster o búsqueda de integrantes;
- reportes, exportaciones, notificaciones y correos;
- Partido, Torneo, deuda E4 y registros deportivos/económicos externos;
- migraciones, backfill, reparación, scans globales y proyecciones persistidas;
- detalle completo de todos los Períodos;
- recorrido recursivo o reconstrucción completa de lineage;
- consultas directas del cliente a Firestore;
- acciones de renovación, reactivación, finalización o navegación legacy;
- deploy y acceso a Firebase remoto;
- numeración de incrementos posteriores.

## 6. Actor y autorización

| Actor o condición | Decisión |
| --- | --- |
| Usuario autenticado | Obligatorio; el UID se obtiene sólo de Auth |
| Cuenta propia | Obligatoria y compatible |
| Persona propia | Obligatoria, existente y compatible |
| Owner del Grupo | No adquiere acceso por ownership |
| Rol global o app admin | No concede historia ajena |
| Persona solicitada por payload | Prohibida |
| Historia ajena | Prohibida sin excepción en E2-19 |

El backend deriva `personId` desde la Cuenta autenticada, lee la Persona referida y consulta exclusivamente sus Membresías. `personId`, UID, rol, ownership, filtros por Grupo/Temporada/estado y dirección de orden no son entradas públicas.

Cada página revalida desde cero Auth, Cuenta, vínculo Cuenta–Persona y Persona. El cursor no conserva autorización.

- Si se revoca el vínculo antes de continuar, se devuelve `PERSON_REQUIRED` y no se consulta historia.
- Si el vínculo apunta a una Persona incompatible o inexistente, se devuelve `PERSON_INCOMPATIBLE`.
- Si el vínculo cambia a otra Persona, el hash de contexto del cursor no coincide: se devuelve `CURSOR_INVALID`, sin consultar la Persona anterior.
- La transferencia de ownership, un rol global o ser Owner de un Grupo no alteran el resultado propio.

## 7. Invariantes

1. Cada item corresponde a una raíz real y compatible de Membresía de la Persona derivada.
2. Una raíz aparece a lo sumo una vez en una respuesta.
3. Dos raíces del mismo Grupo nunca se fusionan.
4. CU-028 conserva una fila y aumenta su resumen de Períodos; CU-029 produce otra fila.
5. `fechaIngreso` es el primer ingreso histórico de la raíz y no se deriva de `createdAt`.
6. `fechaEgreso` sólo existe para una raíz finalizada.
7. En v3/v4, primer y último Período deben correlacionar con `fechaIngreso`, `periodCount`, `latestPeriodId`, estado y `fechaEgreso`; no se cargan Períodos intermedios.
8. En v1/v2, la ausencia de Períodos materializados es válida y no provoca escritura.
9. `previousMembershipId` nunca se entrega ni se acepta del cliente.
10. Guards, intents, receipts, coordinaciones, hashes y logs no son fuente histórica.
11. Grupo y Temporada se leen como referencias externas y nunca se copian como autoridad persistida.
12. Una incompatibilidad materializada falla cerrada para toda la página; no hay lista parcial.
13. La consulta no crea, modifica, migra ni repara documentos.

## 8. Fuente de verdad y papel de cada concepto

### 8.1 Raíz de Membresía

Es la unidad de la fila, la autoridad de `personId`, `groupId`, `seasonId`, estado, `fechaIngreso`, `fechaEgreso`, versión y resumen de Períodos.

### 8.2 Períodos de Vigencia

Son entidades internas subordinadas. Para v3/v4 se leen como máximo el primero y el último para validar fronteras y estado; `periodCount` proviene del resumen persistido y autoritativo de la raíz, no de contar la subcolección. Los writers lo crean en `1` junto con el Período ordinal `1` y, en cada reactivación, escriben atómicamente `periodCount + 1`, `latestPeriodId` y el nuevo Período con ese ordinal. Finalizar no cambia el conteo.

La prueba mínima de integridad para exponer `validityPeriodCount` es:

1. `periodCount` es entero seguro y `>= 1`;
2. `latestPeriodId` coincide con el ID determinista derivado de `(membershipId, periodCount)`;
3. el primer Período existe, tiene ordinal `1` y `startedAt == fechaIngreso`;
4. el último existe, su ID coincide con `latestPeriodId`, su ordinal coincide con `periodCount` y su estado/frontera temporal coincide con el estado de la raíz;
5. si `periodCount == 1`, el primer y último ID son el mismo y se hace una sola lectura.

Esto no prueba por lectura cada ordinal intermedio ni pretende auditar globalmente la subcolección: la exactitud del resumen descansa en la raíz autoritativa y en las transiciones atómicas existentes. No existe repositorio, callable, DTO ni autorización independiente de Períodos.

### 8.3 `previousMembershipId`

Sólo existe y es obligatorio en el schema cerrado v4. La versión v4, producida exclusivamente por el writer de renovación, basta para clasificar la fila como `RENEWAL`; v1–v3 se clasifican como `INITIAL`. E2-19 valida sintácticamente el ID y rechaza la autorreferencia ya prohibida por `hydrateMembership`, pero no lee la predecesora: su existencia, estado o resto del lineage no aporta al DTO, al orden ni a la autorización. No se expone, no se recorre y no determina el orden.

### 8.4 Lifecycle guard y active guard

El lifecycle guard es el puntero técnico vigente a la última raíz Persona–Grupo y el active guard protege unicidad activa. Sirven a comandos y validaciones operativas; no contienen la historia completa y E2-19 no los consulta para enumerar, ordenar ni componer filas.

### 8.5 Grupo y Temporada

Son contexto externo leído mediante capacidades internas mínimas de sus módulos. No se devuelven documentos completos. La Temporada v1 abierta y v2 cerrada son contexto compatible; la referencia debe pertenecer al mismo Grupo que la Membresía.

## 9. Compatibilidad v1–v4

### 9.1 Matriz exacta de raíz y proyección

| Versión | Estados admitidos | Campos obligatorios de raíz | Campos prohibidos | Períodos | Egreso y resumen | Lineage | Proyección |
| --- | --- | --- | --- | --- | --- | --- | --- |
| v1 | sólo `activa` | `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `createdAt`, `schemaVersion` exactamente `1` | `fechaEgreso`, `latestPeriodId`, `periodCount`, `previousMembershipId` y cualquier extra | no materializados; E2-19 no consulta la subcolección | sin egreso ni resumen persistido | imposible | `CURRENT`, conteo normativo `1`, `INITIAL` |
| v2 | sólo `finalizada` | `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `fechaEgreso`, `createdAt`, `schemaVersion` exactamente `2` | `latestPeriodId`, `periodCount`, `previousMembershipId` y cualquier extra | no materializados; E2-19 no consulta la subcolección | `fechaEgreso >= fechaIngreso`; sin resumen persistido | imposible | `HISTORICAL`, conteo normativo `1`, `INITIAL` |
| v3 | `activa` o `finalizada` | `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `createdAt`, `latestPeriodId`, `periodCount`, `schemaVersion` exactamente `3`; finalizada agrega `fechaEgreso` | `previousMembershipId`; en activa también `fechaEgreso`; cualquier extra | materializados y obligatorios desde ordinal `1` | `periodCount >= 1`; última frontera abierta/cerrada según raíz | imposible | estado normalizado, conteo de raíz validado, `INITIAL` |
| v4 | `activa` o `finalizada` | `personId`, `groupId`, `seasonId`, `estado`, `fechaIngreso`, `createdAt`, `latestPeriodId`, `periodCount`, `previousMembershipId`, `schemaVersion` exactamente `4`; finalizada agrega `fechaEgreso` | en activa `fechaEgreso`; cualquier extra | materializados y obligatorios desde ordinal `1` | igual que v3 | predecesora inmediata declarada; sólo se valida ID no vacío/sin `/` y no autorreferencia | estado normalizado, conteo de raíz validado, `RENEWAL` |

Los campos enumerados son exactos: el hydrator vigente rechaza faltantes y extras. La ausencia física de Períodos en v1/v2 es el legado válido que representan esos schemas; CU-010 no hace una consulta de subcolección para intentar demostrar ausencia ni crea documentos sustitutos.

### 9.2 Auditoría específica de `fechaIngreso`

| Versión | Presencia y tipo exacto | Origen | Mutabilidad | Uso vigente | Compatibilidad histórica | Ausencia o valor inválido |
| --- | --- | --- | --- | --- | --- | --- |
| v1 | obligatoria; Firestore `Timestamp` válido | writer de creación legado | inmutable | orden y fecha de ingreso | inicio único de la raíz activa | el documento no es válido; si falta puede quedar excluido del índice y CU-010 no puede detectarlo por scan |
| v2 | obligatoria; Firestore `Timestamp` válido | preservada al finalizar la v1 histórica | inmutable | orden e inicio; `fechaEgreso` cierra el intervalo | inicio único de la raíz finalizada | mismo tratamiento cerrado |
| v3 | obligatoria; Firestore `Timestamp` válido | timestamp autoritativo de `createInitialMembership`, o valor legado preservado al reactivar/finalizar | inmutable en finalización y reactivación | orden e inicio de la raíz; debe igualar `startedAt` del Período ordinal `1` | inicio de toda la raíz, no del último Período | `INCOMPATIBLE_STATE` si la query lo materializa; ausencia puede ser invisible por indexación |
| v4 | obligatoria; Firestore `Timestamp` válido | timestamp propio de la nueva raíz creada por renovación | inmutable en finalización y reactivación | igual que v3 | inicio de la raíz renovada; no hereda la fecha de la predecesora | mismo tratamiento cerrado |

Todos los writers que crean una raíz válida terminan persistiendo `fechaIngreso`: los writers vigentes v3/v4 la asignan junto con el Período inicial; los schemas históricos v1/v2 también la exigen. Renovar crea una v4 con timestamp propio. Reactivar v2/v3/v4 conserva el mismo `membershipId` y la misma `fechaIngreso`, elimina `fechaEgreso` y abre un nuevo Período; no reescribe el inicio. Finalizar también conserva el ingreso. Por eso `fechaIngreso` significa inicio de la raíz y `orderBy(fechaIngreso)` incluye todo documento válido v1–v4.

### 9.3 Fallo cerrado

Reglas exactas:

- v1 finalizada y v2 activa son incompatibles;
- v3 no admite `previousMembershipId`; v4 lo exige;
- todos los schemas son cerrados: campos desconocidos, faltantes, tipos o timestamps inválidos fallan;
- las fechas públicas son ISO-8601 UTC obtenidas exclusivamente de timestamps autoritativos de Membresía/Período;
- v1/v2 no leen, inventan ni materializan Períodos; su único intervalo se representa desde `fechaIngreso` y, para v2, `fechaEgreso`;
- v3/v4 leen sólo primer y último Período, o un único documento si ambos coinciden;
- v4 no provoca lecturas de predecesora ni recorrido de lineage;
- una autorreferencia v4 vuelve incompatible la raíz; una predecesora ausente/incompatible o un ciclo de más de un salto no se buscan y, por diseño, no condicionan CU-010;
- schema/estado desconocido o contradicción temporal falla con `INCOMPATIBLE_STATE`;
- cualquier raíz entregable incompatible hace fallar toda la página con `INCOMPATIBLE_STATE`, cero items y cero resultados parciales;
- el lookahead se hidrata estrictamente como raíz, aunque no se compone hasta la página siguiente;
- un documento corrupto sin `personId` o `fechaIngreso` puede quedar fuera del índice y no ser observable por esta consulta. E2-19 no ejecuta scan para detectarlo.

No hay migración, reparación ni actualización de versión durante lectura.

## 10. Contrato público

### 10.1 Entrada

```text
listMyGroupMembershipHistory({
  pageSize?: integer,
  cursor?: string
})
```

- payload con claves exactas;
- `pageSize` por defecto `20`, mínimo `1`, máximo `20`, sin coerción;
- `cursor` opcional, no vacío, base64url canónico y máximo `2048` caracteres;
- se rechazan claves desconocidas y cualquier selector, ID, UID, estado, filtro, offset, orden o referencia Firestore.

### 10.2 Respuesta

```text
{
  items: OwnGroupMembershipHistoryItem[],
  nextCursor: string | null,
  hasMore: boolean
}
```

`items` contiene como máximo `pageSize`. `hasMore` deriva exclusivamente de la fila `limit + 1`. `nextCursor` se ancla en la última fila entregada y es `null` cuando no existe lookahead.

## 11. Consulta, orden y paginación

### 11.1 Consulta primaria

```text
where(personId == derivedPersonId)
orderBy(fechaIngreso DESC)
orderBy(__name__ DESC)
startAfter(last.fechaIngreso, last.membershipId) // sólo continuación
limit(pageSize + 1)
```

No se filtra por estado: activas y finalizadas forman la misma cronología. No hay offset, scan, agrupación, consulta cliente ni reconstrucción de lineage.

### 11.2 Orden elegido

`fechaIngreso DESC` es el campo autoritativo porque representa el primer ingreso histórico de cada raíz, existe en v1–v4, es inmutable y no requiere cargar Períodos. El ID documental descendente completa un orden total estable.

Se descartan:

- `createdAt`: metadato técnico, no fuente de fechas del lifecycle;
- inicio del primer Período: ausente físicamente en v1/v2 y exigiría lecturas previas al orden;
- `fechaEgreso`: ausente en activas y mutable por lifecycle;
- Temporada: contexto, no instante total y puede contener huecos;
- último Período: reordenaría una raíz al reactivarse y exige composición.

### 11.3 Lookahead

La consulta lee hasta `pageSize + 1`. Las primeras `pageSize` raíces se validan y componen. A la raíz adicional se le aplican exclusivamente: schema cerrado v1–v4, versión/estado, tipos, timestamps y relación `personId == derivedPersonId`; esto incluye detectar una autorreferencia v4. Si falla cualquiera, falla toda la página con `INCOMPATIBLE_STATE`, sin entregar los 20 válidos ni ocultar una raíz 21 corrupta.

El lookahead no carga Grupo, Temporada, Períodos ni predecesora, no construye DTO y no valida integridad externa que corresponde a la página siguiente. `hasMore` significa únicamente “existe otra raíz compatible con el contrato de raíz”, no “la próxima página ya fue compuesta”. Nunca se entrega ni se usa como ancla: el cursor se construye desde la última raíz efectivamente entregada, de modo que el documento 21 vuelva a ser el primero consultado y se componga en la continuación.

## 12. Cursor

El cursor es opaco para la UI, versionado, JSON UTF-8 canónico codificado como base64url sin padding. No es secreto, no está firmado y no otorga autorización. No se usa HMAC: manipularlo no amplía el conjunto autorizado y toda continuación revalida actor, Cuenta y Persona. Los hashes sólo contextualizan y minimizan datos en claro; no se consideran prueba de autoridad.

Payload conceptual exacto:

```text
{
  v: 1,
  contract: "listMyGroupMembershipHistory:v1",
  order: "fechaIngreso:desc,__name__:desc",
  actorHash: sha256("E2-19:actor:v1\0" + uid),
  personHash: sha256("E2-19:person:v1\0" + personId),
  lastFechaIngreso: { seconds, nanoseconds },
  membershipId
}
```

Ésas son las seis claves exactas de primer nivel y las dos claves exactas, en ese orden canónico, del timestamp. El token no contiene UID ni `personId` en claro. El decoder valida máximo 2048 caracteres, alfabeto base64url sin `=`, round-trip idéntico (rechaza codificación no canónica), UTF-8 fatal, JSON objeto no duplicado, serialización canónica byte a byte, claves exactas, versión, contrato, orden, hashes hexadecimales de 64 caracteres, `seconds` entero representable, `nanoseconds` entero entre 0 y 999.999.999, e ID válido sin `/`.

En cada continuación:

1. se revalidan Auth, Cuenta, vínculo y Persona;
2. se recalculan y comparan `actorHash` y `personHash`;
3. se lee puntualmente la raíz ancla;
4. el ancla debe existir, hidratar con schema compatible, pertenecer a la Persona derivada y conservar exactamente `fechaIngreso`;
5. recién entonces se ejecuta `startAfter`.

Forma, codificación no canónica, propiedades desconocidas, actor, Persona, contrato, versión u orden incorrectos producen `CURSOR_INVALID`. Ancla ausente, incompatible, cambiada de Persona o con otra `fechaIngreso` produce `CURSOR_STALE`. Un cambio de Cuenta–Persona se detecta por `personHash` antes de leer el ancla y produce `CURSOR_INVALID`. Un cambio de estado del ancla que siga siendo compatible no vuelve obsoleto el cursor porque no altera el filtro ni las claves de orden; un cambio de fecha sí lo vuelve obsoleto. El `membershipId` sólo ubica y desempata: nunca autoriza ni se expone como selector público.

No hay snapshot multipágina. Con claves de orden canónicamente inmutables y fixture estable no existen duplicados ni omisiones. Bajo concurrencia:

- una raíz insertada por delante del ancla después de la primera página puede no verse en ese recorrido;
- una raíz nueva por detrás del ancla puede aparecer en páginas posteriores;
- una eliminación puede producir una omisión;
- cambios de estado o contexto pueden verse según la página en la que se lean;
- modificar `fechaIngreso` sería corrupción y puede causar duplicados u omisiones fuera de la garantía;
- el frontend reinicia si detecta un ID ya acumulado o recibe cursor inválido/obsoleto.

## 13. Índices y configuración

### 13.1 Inventario actual relevante

Existen índices de `memberships` para:

- `groupId ASC, estado ASC`;
- `groupId ASC, seasonId ASC, estado ASC, fechaIngreso ASC`;
- `personId ASC, groupId ASC, estado ASC`;
- `personId ASC, estado ASC, fechaIngreso DESC`.

`fieldOverrides` está vacío. `firebase.json` y `firebase.test.json` apuntan al mismo `firestore.indexes.json`. Las Rules niegan lectura y escritura cliente de Membresías, Períodos y guards.

### 13.2 Índice mínimo nuevo

```text
collectionGroup: memberships
queryScope: COLLECTION
personId ASC
fechaIngreso DESC
```

La consulta exacta es la del apartado 11.1: igualdad por `personId`, luego `fechaIngreso DESC` y `FieldPath.documentId() DESC`, sin filtro por estado. Requiere el compuesto nuevo porque el existente intercala `estado` y no sirve para esta forma. Firestore agrega `__name__` implícitamente con la dirección del último campo ordenado; como `fechaIngreso` es `DESC`, el índice definido termina en `__name__ DESC` y no hace falta declararlo en `firestore.indexes.json`. Si se eligiera otra dirección para el ID habría que declararla explícitamente, pero ése no es este contrato.

No se agregan `estado`, Grupo, Temporada, `createdAt`, `fechaEgreso` ni `previousMembershipId` porque no filtran ni ordenan. `fechaIngreso` conserva indexación de campo simple y `fieldOverrides` está vacío.

`personId` y `fechaIngreso` existen en todos los schemas v1–v4 y no están excluidos de indexación. Un documento al que falte alguno puede quedar fuera de resultados; el índice no reemplaza una auditoría de integridad.

`firebase.json` y `firebase.test.json` ya apuntan a esta configuración local. Emulator permite probar forma, orden y cursor, pero puede no reproducir la exigencia o el error de índice compuesto del servicio remoto; por eso la configuración se verifica además por inspección y test de arquitectura. Ni esa inspección ni una ejecución local demuestran despliegue remoto: el deploy del índice queda pendiente para la futura implementación. Un `failed-precondition` que identifique inequívocamente índice faltante se traduce a `DEPENDENCY_NOT_CONFIGURED`; esta revisión no accede a Firebase remoto.

## 14. Composición y coste acotado

### 14.1 Límite transaccional y orden de lecturas

La página completa se resuelve con `db.runTransaction(callback, { readOnly: true })`. Esta garantía fija un único snapshot coherente para Cuenta, Persona, ancla, roots consultadas, Períodos y referencias de **esa página**. No congela páginas anteriores o futuras ni promete snapshot multipágina.

El SDK instalado admite queries y `getAll(...)` dentro de `Transaction`; el repositorio ya usa esa capacidad. Además, su implementación configura un único intento para `readOnly: true`, por lo que no existe multiplicador automático de hasta cinco reintentos por conflictos. Fallos transitorios pueden causar retry explícito del cliente como una nueva invocación y un nuevo snapshot, pero nunca una escritura.

Orden obligatorio:

1. leer Cuenta y Persona propias dentro de la transacción y validar autorización;
2. decodificar/contextualizar el cursor y, si existe, leer e hidratar el ancla;
3. ejecutar la query primaria `limit(pageSize + 1)`;
4. hidratar estrictamente todas las raíces devueltas, incluido lookahead;
5. recortar las entregables y deduplicar referencias antes de cualquier composición;
6. obtener por `transaction.getAll(...)` o capacidad batch equivalente los Períodos frontera y los Grupos/Temporadas únicos;
7. hidratar, correlacionar y recién entonces construir los DTOs en el orden original.

La deduplicación ocurre por ruta documental antes del I/O: como máximo quedan 40 referencias de Período, 20 de Grupo y 20 de Temporada. Se obtienen en un `getAll` acotado o en batches acotados dentro de la misma transacción si la capacidad modular los separa; nunca mediante 80 llamadas N+1. Un Grupo o Temporada repetido se materializa una sola vez por página y el mismo documento de Período no se solicita dos veces.

No se llama `create`, `set`, `update` ni `delete`. Si la duración de la lectura o el servicio exceden los límites efectivos de la plataforma, la página falla como dependencia; no se divide silenciosamente en snapshots diferentes. La alternativa de sacar composición de la transacción reduciría duración, pero permitiría combinar raíz, nombre o frontera de instantes distintos y exigiría revalidaciones adicionales. Con un techo corregido de 104 lecturas y batches deduplicados no compensa perder consistencia intrapágina. La alternativa “transacción sólo para autoridad/query y composición afuera” queda descartada por la misma razón.

### 14.2 Presupuesto matemático para `pageSize = 20`

Se cuentan lecturas de documentos intentadas, incluidas las puntuales que resulten ausentes. La query retorna como máximo 21 documentos y se contabiliza por documentos retornados, no como una lectura adicional por la operación query. El lookahead no se compone.

| Concepto | Bruto sin deduplicar | Después de deduplicación | Naturaleza |
| --- | ---: | ---: | --- |
| Cuenta | 1 | 1 | puntual |
| Persona | 1 | 1 | puntual |
| Ancla en continuación | 1 | 1 | puntual; 0 en primera página |
| Raíces, incluido lookahead | 21 | 21 | documentos retornados por query |
| Primer + último Período de 20 v3/v4 | 40 | entre 0 y 40 | puntuales; v1/v2 no leen; si ambos IDs coinciden se lee una vez |
| Grupos de 20 filas | 20 | entre 1 y 20 | puntuales batch por ID único |
| Temporadas de 20 filas | 20 | entre 1 y 20 | puntuales batch por ID único |
| Predecesoras/lineage | 0 | 0 | no se leen |
| **Total continuación** | **104** | **26 a 104** | según versiones, conteos y referencias |
| **Total primera página** | **103** | **25 a 103** | sin ancla |

El mínimo deduplicado de 26 supone página completa, continuación, raíces v1/v2 sin lecturas de Período y un único Grupo y Temporada compartidos; no describe necesariamente datos reales. Como caso normal representativo y reproducible para presupuesto —20 raíces v3/v4 con una vigencia, 20 Grupos y 20 Temporadas distintos— son `2 + 1 + 21 + 20 + 20 + 20 = 84` lecturas en continuación y 83 en primera página. El peor caso real es 104: 20 raíces v3/v4 con al menos dos vigencias, 20 Grupos y 20 Temporadas distintos. El máximo teórico bruto coincide con 104; la deduplicación es obligatoria, pero el dataset puede impedir ahorros.

Mantener máximo 20 queda justificado: el peor caso baja 16,1 % respecto del 124 anterior, cabe en dos tandas conceptuales (autoridad/query y referencias deduplicadas), no recorre colecciones sin techo y limita cada respuesta a 20 DTOs. Reducir `pageSize` sólo por comodidad aumentaría round-trips y no elimina ninguna clase de lectura. El presupuesto se instrumenta por categoría y debe fallar el test si supera 104. Si mediciones focales futuras muestran latencia incompatible con el timeout operativo, la ficha debe reabrirse; no se degrada consistencia ni se sube el techo sin revisión.

Se evaluó quitar `validityPeriodCount`: ahorraría hasta 40 lecturas sólo si también se renunciara a validar fronteras. Se conserva porque la raíz contiene un resumen autoritativo, la cantidad explica reactivaciones sin desplegar episodios y la prueba mínima evita exponerlo ciegamente. No se cargan Períodos intermedios, raíces anteriores, historia de Grupo ni Temporadas intermedias.

### 14.3 Referencias históricas y fallo de composición

- Grupo ausente o incompatible: `INCOMPATIBLE_STATE` para toda la página.
- Temporada ausente, incompatible o cuyo `groupId` no coincide con la raíz: `INCOMPATIBLE_STATE` para toda la página. Una raíz activa que apunte a una Temporada cerrada también es incompatible; una raíz finalizada puede referir una Temporada todavía abierta porque la salida puede preceder a su cierre.
- Grupo o Temporada renombrados: se muestra el nombre canónico vigente al snapshot de la página; no existe snapshot histórico del nombre. Si la Temporada cambió de nombre antes de cerrar, se muestra ese nombre persistido final/vigente.
- v4 con predecesora ausente, incompatible, de otro Grupo/Persona o partícipe de un ciclo no autorreferente: E2-19 no la lee y no convierte esa auditoría de lineage en requisito de la consulta. La autorreferencia local sí invalida la root al hidratarla.
- múltiples raíces del mismo Grupo, incluso para una misma Persona: se mantienen como filas independientes ordenadas por su propio ingreso; nunca se fusionan.

Grupo, Temporada o Período frontera requeridos que estén ausentes o sean incompatibles producen `INCOMPATIBLE_STATE`, respuesta sin items y cero resultados parciales. No se devuelve placeholder, no se omite una fila y no se migra ni repara durante lectura.

## 15. DTO privado y mínimo

```text
OwnGroupMembershipHistoryItem = {
  rowKey: string,
  group: {
    id: string,
    nombre: string
  },
  season: {
    id: string,
    nombre: string
  },
  status: "CURRENT" | "HISTORICAL",
  joinedAt: string,
  leftAt?: string,
  validityPeriodCount: integer,
  continuity: "INITIAL" | "RENEWAL"
}
```

- `rowKey = base64url(sha256("E2-19:row:v1\0" + membershipId))` es una clave técnica opaca y estable para render, acumulación y detección de duplicados. Se devuelve al frontend, pero no es un dato de dominio visible, no se muestra, no se acepta en ningún payload y no habilita detalle ni acciones. El `membershipId` crudo no sale del backend fuera del cursor opaco.
- `status = CURRENT` sólo para raíz `activa`; `HISTORICAL` sólo para `finalizada`. `CURRENT` describe el estado autoritativo de esa relación, no promete por sí solo todas las condiciones operativas de E2-04 ni habilita acciones.
- no se agrega `isCurrent`: sería redundante con el enum cerrado `status` y permitiría combinaciones contradictorias;
- `leftAt` está presente sólo en `HISTORICAL`.
- `validityPeriodCount` es 1 para v1/v2 y el `periodCount` validado para v3/v4.
- `continuity = RENEWAL` sólo para v4 por definición del schema cerrado; v1–v3 usan `INITIAL`. No se lee la predecesora y el valor no implica Temporadas adyacentes ni lineage íntegro.

No se exponen `membershipId`, `personId`, `previousMembershipId`, schema, estado físico, IDs de Períodos, guards, intents, receipts, hashes de contexto/cursor, UID, owner, roles, permisos, `createdAt`, documentos completos de Grupo/Temporada ni metadata interna.

## 16. Frontend y UX

La única ubicación es `/dashboard/groups`, debajo y separada de **“Grupos que integrás”**. Esa sección conserva pertenencias vigentes y utilizables con sus operaciones. El título visible nuevo es **“Historial de grupos”** y usa la microcopy obligatoria del apartado 3.1; una segunda frase puede aclarar que un Grupo se repite al existir raíces distintas por Temporada o renovación. La fila `CURRENT` repetida entre secciones es el mismo hecho visto con propósito distinto, no dos hechos dentro del historial.

Comportamiento requerido:

- carga inicial independiente;
- estado `PERSON_REQUIRED` con vínculo al flujo canónico de Persona;
- vacío legítimo “Todavía no tenés pertenencias registradas”;
- error inicial con retry;
- error incremental que conserva las páginas previas ya confirmadas —nunca items parciales de la página fallida— y permite retry;
- botón “Cargar más”, sin scroll infinito;
- badge “Actual” para `CURRENT` y “Finalizada” para `HISTORICAL`;
- Grupo, Temporada, ingreso, egreso si existe, cantidad de vigencias y renovación en lenguaje comprensible;
- filas repetidas del mismo Grupo sin deduplicar;
- diseño responsive, wrapping de nombres y controles mínimos de 44 px;
- semántica de sección/lista, fechas con `<time>`, teclado completo, foco visible y `aria-live`/`aria-busy`;
- foco en la primera fila agregada después de “Cargar más”, sin desplazarlo en errores;
- single-flight para carga inicial, continuación y retry;
- generación de solicitud para descartar respuestas tardías tras pérdida/cambio de sesión o Persona;
- al perder sesión o Persona se retira inmediatamente la historia acumulada;
- `CURSOR_INVALID`, `CURSOR_STALE` o `rowKey` duplicada descartan acumulación y reinician desde la primera página con anuncio accesible.

No se agregan botones de finalizar, reactivar, renovar, administrar, exportar ni navegar a superficies legacy u owner-scoped.

## 17. Errores contractuales

| Razón | Condición | Respuesta UI |
| --- | --- | --- |
| `UNAUTHENTICATED` | sin sesión válida | retirar datos y solicitar sesión |
| `ACCOUNT_REQUIRED` | Cuenta ausente | orientar a inicialización |
| `PERSON_REQUIRED` | Cuenta sin Persona | orientar a vincular Persona |
| `PERSON_INCOMPATIBLE` | vínculo o Persona corruptos | error cerrado, sin vacío |
| `VALIDATION_FAILED` | payload/pageSize inválido | error de solicitud |
| `CURSOR_INVALID` | token o contexto inválido | reiniciar desde primera página |
| `CURSOR_STALE` | ancla obsoleta | reiniciar desde primera página |
| `INCOMPATIBLE_STATE` | fila, Período o referencia incompatible | fallo de página completa |
| `DEPENDENCY_NOT_CONFIGURED` | índice requerido ausente | error recuperable tras configuración |
| `DEPENDENCY_UNAVAILABLE` | dependencia transitoria | retry seguro |
| `INTERNAL_ERROR` | fallo no clasificado | mensaje sanitizado |

Los mensajes no revelan IDs internos, existencia de historia ajena, detalles de documentos ni trazas. Una lista vacía nunca sustituye un error de Cuenta, Persona, schema o referencia.

## 18. Cero escrituras, Rules y arquitectura

- callable exclusivamente read-only;
- transacción de lectura sin `create`, `set`, `update` ni `delete`;
- cero migraciones, backfills, reparaciones y marcas de lectura;
- cero receipts, intents, coordinaciones, eventos y proyecciones persistidas;
- cero actualización de roots, Períodos, guards, Grupo, Temporada, Cuenta o Persona;
- Rules deny-all preservadas sin habilitar SDK cliente;
- Presentación consume sólo el servicio/callable y no importa Firestore para este flujo;
- el Módulo Membresías coordina y usa capacidades públicas internas mínimas de Grupos/Temporadas, sin acceder a sus repositorios internos;
- ningún repositorio/API independiente para Períodos ni “HistoryRepository” como nueva fuente de verdad.

## 19. Plan de pruebas

### 19.1 Unitarias de dominio, schema y DTO

- matrices exactas v1 activa, v2 finalizada, v3 activa/finalizada y v4 activa/finalizada;
- combinaciones versión/estado imposibles, campos extra/faltantes y timestamps inválidos;
- v1/v2 proyectan conteo 1 sin Períodos;
- v3/v4 validan primer/último Período sin cargar intermedios;
- DTO exacto, fechas ISO, presencia condicional de `leftAt`, estados y continuidad;
- ausencia de campos prohibidos;
- clasificación v4 como renovación sin lectura de predecesora; autorreferencia local incompatible; ciclos no locales fuera de alcance.

### 19.2 Unitarias de contrato y cursor

- payload cerrado; default 20; límites 1 y 20; rechazo de cero, decimal, string y 21;
- cursor base64url/UTF-8/JSON canónico, rechazo de padding y codificación alternativa, claves exactas, versión, contrato y orden;
- hashes de actor/Persona, timestamp e ID del ancla;
- cursor manipulable no concede autoridad;
- ancla válida, ausente, incompatible o con `fechaIngreso` distinta;
- cambio de estado compatible del ancla no invalida el cursor; estado/schema incompatible o cambio de fecha produce `CURSOR_STALE`;
- cursor de otra sesión o Persona;
- `limit + 1`, cursor en última entregada y nunca en lookahead.

### 19.3 Emulator

- sin raíces, una raíz y varias páginas 20/21;
- varios Grupos, un mismo Grupo en varias Temporadas y varias raíces del mismo Grupo, sin fusión;
- Temporadas intermedias sin Membresía;
- una activa más varias finalizadas;
- v1–v4 combinadas;
- reactivación con múltiples Períodos permanece una fila y expone sólo conteo;
- renovación v4 produce fila separada y continuidad segura;
- empate de `fechaIngreso` por ID descendente;
- primera/intermedia/última página y lookahead no omitido;
- cambio o revocación Cuenta–Persona entre páginas;
- no enumeración: payloads con Persona/UID/IDs, cursor de otro actor y referencias ajenas no revelan existencia ni amplían resultados;
- ancla borrada/modificada y cursor obsoleto;
- inserciones antes/después del ancla y garantías concurrentes documentadas;
- Grupo/Temporada/Período ausente o incompatible;
- deduplicación observable: un Grupo y una Temporada repetidos se leen una vez por página; primer/último Período coincidente se lee una vez;
- fila incompatible y lookahead incompatible fallan sin lista parcial;
- documento corrupto con campos indexados falla; documento sin campo indexado se registra como limitación no detectable;
- índice exacto y dirección efectiva de `__name__ DESC`;
- ausencia del índice mapeada a `DEPENDENCY_NOT_CONFIGURED` mediante doble controlado cuando Emulator no reproduzca fielmente el error remoto;
- Rules niegan lectura/escritura cliente;
- snapshot de colecciones antes/después acredita cero escrituras.

### 19.4 Arquitectura y configuración

- callable exportado y cableado sólo a servicio/readers autorizados;
- frontend sin imports Firestore ni escrituras directas;
- ausencia de writer, receipt, intent, proyección o repositorio de Períodos/historia;
- no acceso directo a repositorios internos de Grupo/Temporada;
- índice nuevo exacto, `fieldOverrides` sin exclusiones y archivos Firebase apuntando a la configuración versionada;
- Rules deny-all de Membresías, Períodos y guards intactas;
- consulta sin offset, scan, agrupación ni recursión de lineage;
- presupuesto por categoría instrumentado y asertado en 104 lecturas intentadas como máximo; cero lecturas de predecesora.
- transacción configurada con `{ readOnly: true }`, sólo un intento del SDK vigente y ausencia estática/dinámica de escrituras.

### 19.5 Frontend

- carga, vacío, Persona requerida, error, retry y fin;
- “Cargar más”, single-flight y error incremental conservando filas;
- actual/finalizada inequívocos y repetición legítima de Grupo;
- cursor inválido/obsoleto y `rowKey` duplicada reinician;
- cambio de Persona/sesión descarta datos y respuestas tardías;
- teclado, foco, `aria-live`, `aria-busy`, `<time>` y responsive;
- ausencia de acciones y rutas fuera de alcance.

### 19.6 Clasificación de evidencia

| Evidencia | Clasificación |
| --- | --- |
| schemas, DTO, contrato, cursor y errores | Unitarias/contratos |
| autorización real, Cuenta/Persona, consulta, orden, paginación, referencias, compatibilidad y concurrencia | Emulator |
| dependencias, límites modulares, cero writers y configuración | Arquitectura/inspección estática |
| estados, accesibilidad, single-flight y respuestas tardías | Frontend automatizada + UAT manual |
| recorrido visible normal, vacío, actual/histórica, carga incremental, responsive y teclado | UAT manual |
| corrupción, índice ausente, carreras, lookahead y coste | Automatización; no se atribuye ejecución manual |
| cero escrituras y Rules deny-all | Emulator + inspección persistente antes/después |
| ausencia de deploy, migración, temporales y cambios fuera de alcance | Inspección persistente/Git |

No se exige ejecutar suites completas durante la definición. El cierre futuro deberá ejecutar gates focales y los gates completos que correspondan al riesgo real del cambio.

## 20. UAT propuesta

1. Persona válida sin Membresías: vacío legítimo.
2. Una raíz activa: fila “Actual” sin egreso.
3. Una raíz finalizada: fila “Finalizada” con ingreso y egreso.
4. Activa más finalizadas: orden descendente y estados inequívocos.
5. Mismo Grupo en dos Temporadas: dos filas, sin agrupación.
6. Raíz reactivada: una fila con más de una vigencia.
7. Raíz renovada: fila separada marcada como renovación, sin IDs internos.
8. Paginación: validar “Cargar más”, foco en nuevas filas y fin correcto sólo si el ambiente ya ofrece un fixture preparado; UAT manual no exige fabricar 21 Membresías.
9. Error inicial/incremental y retry, conservando filas en el segundo caso.
10. Persona requerida: sólo las superficies member-scoped se afectan.
11. Cierre de sesión/cambio de Persona: datos retirados y respuesta tardía descartada.
12. Teclado, lector de pantalla básico, contraste, wrapping y viewport móvil/escritorio.

Los casos 20/21, cursor, corrupción, concurrencia, índice, referencias ausentes, coste, Rules y cero escrituras se clasifican como Emulator/automatización/inspección persistente y no deben declararse UAT manual ni exigir corrupción o fabricación masiva de Membresías por interfaz.

## 21. Rollback

Como E2-19 es read-only, el rollback futuro consiste en revertir exclusivamente callable, reader, cursor, DTO, índice configurado, frontend y pruebas del incremento. No hay datos creados por E2-19 que restaurar, migración inversa ni limpieza de receipts/proyecciones.

Si falla el índice, la integridad de referencias, el presupuesto, la autorización por página o la garantía de cero escrituras, se detiene la implementación y no se habilita la UI. No se mitiga con consulta cliente, scan, índice remoto manual no versionado ni fallback legacy.

## 22. Riesgos y deuda aceptada

| Riesgo | Tratamiento |
| --- | --- |
| Coste máximo alto aunque acotado | techo real 104, batch/deduplicación obligatoria, transacción read-only de un intento y prueba por categoría |
| Sin snapshot multipágina | semántica explícita, ancla puntual y reinicio seguro |
| Documento corrupto excluido del índice | limitación documentada; sin scan ni reparación |
| Referencia histórica eliminada | fallo cerrado de página; reparación fuera de alcance |
| v1/v2 sin Períodos | proyección de intervalo único desde fechas autoritativas, sin escritura |
| Nombre de Grupo/Temporada cambia entre páginas | cada página muestra contexto vigente; no se persiste snapshot histórico |
| Cursor no firmado | no es autoridad; actor y Persona se revalidan y contextualizan |
| Índice sólo validado localmente | configuración versionada; deploy remoto separado |
| Duplicación visual de una activa respecto de E2-04 | necesaria para cronología completa; superficies y acciones permanecen distintas |
| Lineage v4 ausente, incompatible o cíclico fuera de la autorreferencia | no se lee porque no aporta a DTO/autorización; v4 sigue siendo `RENEWAL`; auditoría global fuera de CU-010 |

Quedan fuera y no bloquean: detalle completo de episodios de vigencia, snapshot estable multipágina, reparación de corrupción, navegación member-safe a detalle, reportes/exportación y optimizaciones que reduzcan lecturas sin debilitar invariantes.

## 23. Criterios de aceptación observables

1. Un actor no autenticado recibe `UNAUTHENTICATED` sin datos ni escritura.
2. Cuenta o Persona ausentes/incompatibles no se convierten en lista vacía.
3. El cliente no puede seleccionar Persona ni ampliar autoridad por Owner o rol global.
4. Cada página revalida Cuenta–Persona; revocación o cambio bloquea continuación.
5. La consulta devuelve activas y finalizadas, una fila por raíz, incluso para el mismo Grupo.
6. Una reactivación permanece una fila con conteo mayor; una renovación es otra fila.
7. v1–v4 se proyectan según la matriz sin migrar, reparar ni inventar fechas.
8. Una incompatibilidad materializada falla toda la página y no devuelve resultados parciales.
9. Grupo y Temporada mínimos se correlacionan; referencias rotas fallan cerradas.
10. El orden efectivo es `fechaIngreso DESC, __name__ DESC` y empates son deterministas.
11. `pageSize` omitido usa 20; nunca se entregan más de 20 items.
12. `limit + 1`, lookahead y cursor desde la última entregada no omiten el lookahead.
13. Cursor inválido/ajeno y ancla obsoleta tienen outcomes distintos y reinicio seguro.
14. Con fixture inmutable, recorrer todas las páginas no duplica ni omite raíces.
15. El índice versionado mínimo no contiene `estado` ni campos innecesarios; la query/orden funcionan en Emulator y la necesidad remota queda pendiente de deploy, no falsamente probada por Emulator.
16. La composición no supera 104 lecturas intentadas por continuación de 20 y deduplica Períodos coincidentes, Grupos y Temporadas.
17. El DTO no expone Persona, UID, predecesora, guards, intents, hashes, roles ni documentos completos.
18. “Historial de grupos” es independiente de “Grupos que integrás” y muestra estados claros.
19. La UI cubre carga, vacío, error, retry, paginación, foco, teclado, `aria-live`, responsive y respuestas tardías.
20. No existen acciones administrativas, de renovación, reactivación o rutas legacy nuevas.
21. Rules continúan deny-all y Presentación no accede directamente a Firestore.
22. La inspección antes/después acredita cero escrituras, migraciones, receipts, intents, proyecciones o backfill.

## 24. Decisiones cerradas y decisiones abiertas

Quedan cerradas:

- Alternativa B, una fila por raíz de Membresía;
- cronología completa con activas y finalizadas claramente separadas;
- E2-04 conserva la superficie operativa actual;
- `fechaIngreso DESC, __name__ DESC`;
- página default/máxima 20;
- cursor contextual sin secreto y ancla puntual;
- compatibilidad exacta v1–v4;
- lectura de fronteras de Períodos, no historia completa;
- clasificación v4 sin lectura ni reconstrucción de lineage;
- índice `personId ASC, fechaIngreso DESC`;
- DTO y frontend mínimos;
- techo de coste 104;
- fallo cerrado y cero escrituras.

No quedan decisiones normativas fundamentales abiertas para implementar el corte. Las deudas del apartado 22 son límites explícitos, no autorización para ampliar E2-19 durante la implementación.

## 25. Condiciones de continuidad

- La implementación sólo puede comenzar después de aprobar esta ficha.
- La ficha debe permanecer intacta durante implementación; cualquier cambio normativo requiere revisión documental separada.
- E2-14, Documento 5, documentos normativos y cierres anteriores no se modifican.
- Auth/UAT permanece aislada en `chore/preserve-auth-emulator-uat-changes` y no se integra.
- No se cierra Etapa 2 ni se habilita E3.
- El informe de implementación y el cierre de E2-19 serán artefactos posteriores; no existen en esta definición.

---

`E2-19 APROBADO — LISTO PARA VERSIONAR`
