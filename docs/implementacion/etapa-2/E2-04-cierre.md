# E2-04 — Cierre formal

## 1. Identificación

- **Incremento:** `E2-04 — Consulta de mis Grupos operativos por Membresía`.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Fecha de cierre:** 2026-09-01.
- **Checkpoint inicial:** `29027e008a1a0dabf614ab66bb041ae894c70689`.
- **Rama de implementación:** `feat/e2-04-my-groups-by-membership`.
- **Commit de implementación:** `d0a19e22f33c538c6d70e579c21b3a40afe57c69`.
- **Merge de implementación en `dev`:** `822691bcbe26bddf9d27d0c34c7b9cf2c614d583`.
- **Rama de cierre:** `docs/e2-04-cierre`.
- **Ficha normativa:** `docs/implementacion/etapa-2/E2-04-ficha-mis-grupos-por-membership.md`.
- **Informe de implementación, correcciones y UAT:** `docs/implementacion/etapa-2/E2-04-informe-implementacion.md`.

Este documento cierra exclusivamente E2-04. No cierra la Etapa 2, no define ni implementa E2-05 y no autoriza despliegues Firebase.

## 2. Objetivo y alcance entregado

Quedó entregada la consulta paginada de los Grupos que una Persona propia integra mediante Membresías operativamente válidas. La operación deriva el UID del token, recupera cuenta y Persona propias, consulta Membresías físicamente activas y confirma por candidata su unicidad, guard, Grupo v1 activo y Temporada abierta exacta.

La condición “operativa” se calcula durante la lectura. No se creó un estado, una proyección ni una escritura persistente. El único consumidor frontend nuevo es “Grupos que integrás” en `/dashboard/groups`.

## 3. Contrato público y DTO

Se agregó un único callable público:

```ts
listMyCurrentGroupMemberships({ pageSize?, cursor? })
```

El payload es un objeto plano cerrado. `pageSize` es entero entre 1 y 20 y usa 20 por defecto; `cursor` es opcional, no vacío y limitado a 2048 caracteres. Se rechazan propiedades desconocidas, `null`, arrays, instancias no planas y cualquier identidad, autoridad, filtro u orden enviados por el cliente.

La respuesta contiene exclusivamente `items` y `nextCursor`. Cada item expone:

```ts
{
  membership: {
    id,
    seasonId,
    estado: "activa",
    fechaIngreso
  },
  group: {
    id,
    nombre,
    deporte: "voleibol",
    estado: "activo"
  }
}
```

`fechaIngreso` se serializa como ISO-8601 UTC. No se exponen Persona, Owner, email, roles, permisos, schema, guards, hashes, timestamps administrativos, snapshots ni rutas Firestore. Los DTO públicos E2-03 permanecen intactos.

## 4. Autorización self-person/member-scoped

La autoridad nace exclusivamente de:

1. autenticación verificada;
2. cuenta propia compatible;
3. Persona propia derivada desde `users/{uid}.personaId`;
4. Membresía propia íntegra;
5. contexto operativo válido.

El UID nunca se usa como `personId`. Si la cuenta no posee Persona, el callable devuelve `PERSON_REQUIRED` antes de consultar Membresías; no crea Persona ni transforma el caso en lista vacía. Ownership, global admin, `users.roles`, email, cursor y arrays legacy no autorizan la consulta. Un integrante no Owner recibe sólo contexto mínimo y ninguna capacidad administrativa.

## 5. Separación de relaciones en frontend

`/dashboard/groups` conserva dos secciones independientes:

- **“Grupos que administrás”:** continúa consumiendo contratos owner-scoped y conserva sus enlaces y funcionamiento aun cuando el Usuario no posee Persona.
- **“Grupos que integrás”:** consume sólo `listMyCurrentGroupMemberships`; presenta carga, `PERSON_REQUIRED`, vacío, items, continuación, página vacía con cursor, retry, dependencia no disponible, incompatibilidad y fin.

Un error member-scoped no bloquea la sección owner-scoped. Un mismo Grupo puede aparecer en ambas relaciones y no se deduplica. Las tarjetas member-scoped no enlazan al detalle owner-scoped ni a rutas legacy, no muestran controles administrativos y no sugieren ownership. Se preservaron teclado, foco visible, anuncios de estado y comportamiento responsive sin scroll horizontal ni actualización optimista.

## 6. Semántica operativa e integridad

Una candidata se incluye únicamente cuando:

- reconstruye estrictamente como Membresía v1 propia y físicamente activa;
- es la única activa del par Persona–Grupo y coincide con el resultado de la consulta `limit(2)`;
- posee el guard determinista E2-03 íntegro y completamente correlacionado;
- referencia un Grupo v1 activo;
- existe una Temporada abierta válida para ese Grupo;
- `membership.seasonId` coincide con esa apertura actual.

Cero o dos activas para una candidata, candidata diferente, Membresía incompatible, activa huérfana, guard ausente o roto y correlación inválida producen `INCOMPATIBLE_STATE` sin lista parcial. Grupo ausente, inactivo o incompatible también falla cerrado.

La ausencia legítima de Temporada abierta, o una apertura válida del mismo Grupo cuyo ID no coincide con `membership.seasonId`, excluye la Membresía sin diagnosticar cierre, retiro ni historia. Corrupción comprobable del contexto abierto produce `INCOMPATIBLE_STATE`; indisponibilidad temporal produce `DEPENDENCY_UNAVAILABLE`. No existe deduplicación, adopción, reparación ni escritura.

## 7. Capacidades internas member-safe

El Módulo Grupos aporta capacidades server-side no callables:

- `getMemberReadableGroupContext({ groupId })`, que devuelve sólo `id`, `nombre`, `deporte` y `estado` de un Grupo v1 activo;
- `getOpenSeasonContextForMembership({ groupId })`, que valida la cardinalidad de Temporadas abiertas y la correlación completa con el guard abierto, devolviendo únicamente el contexto mínimo o una ausencia legítima.

Membresías consume estas capacidades mediante el puerto `memberContextModule`; no importa repositorios privados de Grupo o Temporada. Las capacidades no reciben UID, Owner, roles ni permisos, no enumeran, no escriben, no conceden ownership y no debilitan los contratos owner-scoped existentes. No se exportan desde `functions/index.js`.

## 8. Paginación, cursor e índice

La consulta primaria quedó fijada a:

```text
memberships
  where personId == derivedPersonId
  where estado == "activa"
  orderBy fechaIngreso DESC
  orderBy documentId() DESC
  startAfter(lastFechaIngreso, lastMembershipId) cuando existe cursor
  limit(pageSize + 1)
```

Se procesan como máximo los primeros `pageSize` documentos. El adicional es sólo lookahead: no se hidrata, valida, omite ni procesa. Si existe lookahead, `nextCursor` se crea desde el último documento crudo procesado; el lookahead reaparece como primer candidato de la página siguiente. No se ejecutan loops para rellenar páginas tras el filtrado, por lo que `items: []` con cursor no nulo es un resultado válido.

El cursor v1 usa JSON canónico UTF-8, Base64URL sin padding, contrato y orden exactos, timestamp Firestore, último `membershipId` y checksum SHA-256 con separación de dominio. El checksum detecta corrupción accidental; no es firma, no usa HMAC, no contiene secretos ni concede autorización. La decodificación exige UTF-8 estricto, claves cerradas, versión, contrato, orden, timestamp, ID, checksum y tamaño válidos. Nunca incluye `personId` ni snapshots.

Se agregó exclusivamente el índice `memberships: personId ASC, estado ASC, fechaIngreso DESC`. Firestore Emulator confirmó el desempate final descendente sin declarar `__name__`. El índice E2-03 `personId ASC, groupId ASC, estado ASC` quedó intacto y no se agregó ningún índice de Temporadas. Ningún índice fue desplegado.

## 9. Reglas, privacidad y efectos laterales

`firestore.rules` no fue modificado. Continúa el deny-all cliente sobre Personas, Grupos v1, Temporadas, `openSeasonGuards`, Membresías y `activeMembershipGuards`, probado para integrante, Owner, global admin y autenticado genérico.

El frontend accede únicamente por callable. E2-04 realiza cero escrituras de aplicación, reparaciones, eventos, alertas o notificaciones. La UAT-11 y las pruebas corroboraron el DTO mínimo, la ausencia de datos administrativos o técnicos y cero efectos laterales.

## 10. Revisión independiente y correcciones H01–H04

La primera revisión técnica independiente emitió `E2-04 REQUIERE CORRECCIONES`. Se aplicaron y probaron cuatro correcciones:

- **H01:** la capacidad temporal ahora consulta realmente hasta dos Temporadas abiertas y valida la matriz cerrada de cardinalidad, documentos y guard; una apertura huérfana ya no puede quedar oculta.
- **H02:** el contrato admite sólo objetos planos con prototipo normal o nulo y rechaza instancias, colecciones, arrays y prototipos personalizados.
- **H03:** el cursor exige round-trip UTF-8 exacto y rechaza bytes inválidos antes del parseo JSON.
- **H04:** sólo los códigos transitorios normativos se traducen a `DEPENDENCY_UNAVAILABLE`; errores de programación, genéricos o desconocidos se sanitizan como `INTERNAL_ERROR`, mientras la corrupción normativa conserva `INCOMPATIBLE_STATE`.

Las cuatro rutas adicionales autorizadas fueron `firestoreMemberContext.js`, `transientDependencyError.js` y sus dos suites unitarias. La reverificación independiente no produjo nuevos hallazgos y concluyó `E2-04 APTO PARA UAT`.

## 11. Evidencia automatizada previa al merge

Antes de versionar aprobaron:

| Gate | Resultado |
|---|---|
| Focalizadas H01–H04 | 35/35 |
| Unitarias completas | 177/177 |
| Emulator Suite canónica | 90/90 |
| E2-04 dentro de Emulator | 10/10 |
| E2-03 dentro de Emulator | 13/13 |
| E2-02 dentro de la reverificación | 10/10 |
| Mantenimiento/reglas | 7/7 |
| Sintaxis Functions | 203/203 |
| Typecheck | Aprobado |
| Build | Aprobado, 21 páginas |
| Lint baseline | 39 errores y 9 warnings conocidos; 6 hallazgos resueltos; sin regresiones |
| Índices y `git diff --check` | Aprobados |
| `quality:stage0` | Aprobado |

Las focalizadas E2-04 ejecutaron 10/10 casos funcionales y luego encontraron un `EBUSY` exclusivamente durante cleanup del wrapper temporal. La suite canónica cerró 90/90 con código 0, por lo que el incidente no se clasificó como falla funcional ni se ocultó mediante borrado manual.

## 12. UAT

UAT-01 a UAT-11 fueron aprobados con Auth, Firestore y Functions Emulator, proyecto `demo-sportexa-e2-04`, loopback y datos sintéticos:

| Caso | Evidencia |
|---|---|
| UAT-01 | Un Owner sin Persona conservó “Grupos que administrás”; sólo pertenencia mostró `PERSON_REQUIRED`. |
| UAT-02 | Una Persona sin Membresías observó vacío legítimo en la sección member-scoped. |
| UAT-03 | Un Owner con Membresía observó el mismo Grupo en ambas secciones, sin deduplicación. |
| UAT-04 | Un integrante no Owner observó sólo la tarjeta mínima member-scoped, sin controles administrativos. |
| UAT-05 | Una Membresía sin contexto abierto exacto quedó excluida sin etiqueta histórica. |
| UAT-06 | La paginación conservó el orden observable sin duplicados ni omisiones. |
| UAT-07 | Aprobado con complemento técnico: la UI mostró continuación; `items: []` con cursor no nulo y la reaparición del lookahead se comprobaron en Emulator, no se atribuyen a inspección interna del navegador. |
| UAT-08 | La ruta canónica y los enlaces owner-scoped funcionaron; las tarjetas member-scoped no navegaron a detalles administrativos o legacy. |
| UAT-09 | La indisponibilidad simulada ofreció retry estable, sin actualización optimista ni persistencia. |
| UAT-10 | Teclado, foco, anuncios y responsive aprobaron sin scroll horizontal. |
| UAT-11 | Aprobado manualmente y corroborado técnicamente: DTO mínimo, privacidad y cero escrituras, reparaciones, eventos o efectos laterales. |

Durante la preparación, el frontend apuntaba inicialmente a `project-groupvolley`. Se corrigió sólo la configuración local ignorada en `.env.local` para usar `demo-sportexa-e2-04` y sus emuladores de Auth, Firestore y Functions. Luego se confirmaron `ensureMyAccount` y el dashboard. No hubo cambio productivo, secreto versionado, despliegue ni acceso Firebase remoto.

## 13. Merge de implementación y gate post-merge

El commit `d0a19e22f33c538c6d70e579c21b3a40afe57c69`, con padre `29027e008a1a0dabf614ab66bb041ae894c70689` y mensaje `feat(e2-04): consultar grupos por membresía`, se integró mediante merge explícito no fast-forward:

- **SHA:** `822691bcbe26bddf9d27d0c34c7b9cf2c614d583`;
- **mensaje:** `merge(e2-04): integrar consulta de grupos por membresía`;
- **padres:** `29027e008a1a0dabf614ab66bb041ae894c70689` y `d0a19e22f33c538c6d70e579c21b3a40afe57c69`;
- **árbol:** idéntico al commit de implementación;
- **publicación:** `dev` y `origin/dev` quedaron coincidentes en el merge, divergencia `0/0`, antes de crear esta rama documental.

El gate post-merge quedó aprobado con esta evidencia secuencial:

| Gate | Resultado post-merge |
|---|---|
| Emulator Suite controlada con observabilidad temporal | 90/90; E2-03 13/13; E2-02 10/10; cero `INTERNAL_ERROR` capturados |
| Mantenimiento/reglas | 7/7 |
| Sintaxis Functions | 203/203 |
| Typecheck | Aprobado |
| Build | Aprobado, 21 páginas |
| Lint baseline | 39 errores y 9 warnings conocidos; 6 hallazgos resueltos; sin regresiones |
| JSON y semántica de índices | Aprobados; 9→10, sólo el índice E2-04 y ninguno de Temporadas |
| `git diff --check` | Aprobado |
| `quality:stage0`, una ejecución | Aprobado: lint, typecheck, sintaxis 203/203, unitarias 177/177, Emulator 90/90, build 21 páginas y diff |

## 14. Anomalía concurrente E2-03 durante el primer gate

La primera Emulator Suite ejecutada sobre el merge local falló en `membershipE2.test.js`, caso `concurrencia igual converge y distinta deja como máximo una activa`, iteración 14. La operación perdedora devolvió `INTERNAL_ERROR` donde se esperaba `MEMBERSHIP_ALREADY_EXISTS` o `CONFLICT`. Esa ejecución no conservó etapa, tipo ni cadena de causa; el estado persistido final no mostró corrupción.

El diagnóstico está clasificado como **causa no determinada**:

- el árbol del merge es idéntico al commit E2-04 previamente validado;
- no se demostró una regresión E2-04 determinista;
- existe un hueco potencial preexistente en la clasificación/resolución de contención E2-03, pero no se probó que originara la falla observada;
- dos ejecuciones focalizadas posteriores aprobaron sin reproducir `INTERNAL_ERROR` y conservaron una Membresía, un guard y correlación íntegra;
- la Emulator canónica controlada posterior aprobó 90/90 con captura sanitizada temporal y cero `INTERNAL_ERROR`;
- la Emulator incluida en la única ejecución posterior de `quality:stage0` también aprobó 90/90, incluido el caso concurrente E2-03;
- la observabilidad temporal se retiró completamente y el árbol Git permaneció limpio.

La aceptación del gate no declara inexistente el defecto. Registra que no fue reproducible ni atribuible a E2-04 con la evidencia disponible. El hueco potencial E2-03 queda como deuda técnica separada; no se aplicó una modificación especulativa a `firestoreActiveMembershipGuard.js` ni a código o pruebas E2-03.

## 15. Legado y ausencia de doble lectura o escritura

Membresía es autoridad únicamente para el nuevo flujo “Grupos que integrás”. Ownership continúa siendo autoridad independiente para “Grupos que administrás”. No se declara migrada la pertenencia general.

El flujo E2-04 no lee, escribe, sincroniza ni usa como fallback `memberIds`, `adminIds`, `admins`, solicitudes, jugadores, posiciones, partidos, torneos, inscripciones, alertas o notificaciones. No utiliza APIs o rutas legacy y no produce doble lectura ni doble escritura. No se modificó `derfgtyhj`.

## 16. Exclusiones y deuda aceptada

Permanecen fuera de E2-04 roster, Personas ajenas, detalle member-scoped, roles, permisos, administración, lifecycle, solicitudes, altas de terceros, migración general, proyección persistente, HMAC o secretos, operaciones deportivas y despliegue.

Se aceptan y conservan:

1. el costo N+1 de integridad y contexto para hasta 20 candidatas;
2. páginas escasas o vacías como consecuencia del filtrado posterior;
3. ausencia de snapshot global entre páginas y semántica normal de cursor ante cambios concurrentes;
4. navegación member-scoped limitada, sin detalle administrativo;
5. el hueco potencial E2-03 descripto en la sección anterior, que requiere diagnóstico y eventual intervención separados si reaparece con forma capturable;
6. la deuda rara de concurrencia E2-02, preexistente, separada y no modificada.

E2-04 no modificó `firestoreOpenSeasonGuard.js`, `seasonE2.test.js` ni contratos owner-scoped E2-02. La apertura concurrente de Temporadas no se declara corregida.

## 17. Firebase, entornos y despliegues

Las verificaciones utilizaron únicamente Emulator Suite, proyectos `demo-*`, loopback y datos sintéticos. La CLI no pudo obtener MOTD/config auxiliar bajo el entorno de red restringido, sin impacto en los emuladores ni acceso a proyectos o datos.

No hubo lectura o escritura de Firebase remoto. No se desplegaron frontend, Functions, reglas ni índices. No se versionaron `.env.local`, VAPID, credenciales, logs, datos exportados, `.next` ni artefactos temporales.

## 18. Estado de transición y rollback

E2-04 queda implementado, versionado, publicado, integrado, reverificado y aprobado por UAT. El rollback documental debe realizarse mediante commits de revert explícitos, sin reescribir historia. Un rollback técnico requeriría revertir de manera revisada el merge `822691bcbe26bddf9d27d0c34c7b9cf2c614d583`, reinicializar sólo emuladores con datos sintéticos y repetir los gates; no debe abrir reglas, introducir fallback legacy ni borrar ramas.

E2-05 queda habilitado únicamente para **análisis y definición de corte** mediante su propia ficha. No se declara implementable, aprobado ni iniciado.

## 19. Veredicto formal

La implementación está versionada, publicada e integrada; H01–H04 están corregidos y reverificados; UAT-01 a UAT-11 están aprobados; el gate post-merge aprobó bajo la regla controlada; la anomalía inicial E2-03 y las deudas separadas permanecen registradas sin corrección especulativa.

`E2-04 CERRADO — E2-05 HABILITADO PARA DEFINICIÓN`
