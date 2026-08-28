# E2-03 — Cierre formal

## 1. Identificación

- **Incremento:** `E2-03 — Alta explícita de Membresía propia del Owner`.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Fecha de cierre:** 2026-08-28.
- **Checkpoint inicial:** `2ae643c7c9ff8aaa18975297be8075987410ec33`.
- **Rama de implementación:** `feat/e2-03-membership-owner-self`.
- **Commit de implementación:** `4381dee5620d046478416c6f6772b6290ace69b9`.
- **Rama de cierre:** `docs/e2-03-cierre`.
- **Ficha normativa:** `docs/implementacion/etapa-2/E2-03-ficha-membership-owner-self.md`.
- **Informe de implementación y UAT:** `docs/implementacion/etapa-2/E2-03-informe-implementacion.md`.

Este documento cierra exclusivamente E2-03. No cierra la Etapa 2, no define ni implementa E2-04 y no autoriza despliegues.

## 2. Objetivo y corte implementado

Quedó entregado el flujo explícito por el cual el Owner actual de un Grupo canónico v1 incorpora su propia Persona vinculada como integrante durante la Temporada abierta. La identidad deriva exclusivamente del token autenticado y de `users/{uid}.personaId`; el cliente no puede aportar UID, Persona, Temporada, estado, roles, permisos ni datos de ingreso.

El alta es una acción deliberada dentro del detalle canónico del Grupo. No se ejecuta al cargar, navegar, crear el Grupo, abrir la Temporada o vincular la Persona.

## 3. Alcance entregado

- Aggregate Root Membresía puro y reconstrucción estricta;
- coordinación de cuenta, Persona, Grupo y Temporada mediante capacidades explícitas;
- creación atómica de Membresía y guard técnico;
- unicidad de una activa por Persona–Grupo entre Temporadas;
- idempotencia acotada al guard Persona–Grupo;
- relectura autoritativa posterior a contención Firestore;
- consulta owner/self-scoped;
- callables, DTO y errores públicos estables;
- reglas backend-only e índice compuesto mínimo;
- frontend accesible integrado en `/dashboard/groups/[groupId]`;
- pruebas unitarias, estructurales, de reglas y Emulator Suite.

## 4. Trazabilidad Git

El commit de implementación `4381dee5620d046478416c6f6772b6290ace69b9`, con mensaje `feat(e2-03): incorporar membresía propia del owner`, tiene como padre directo el checkpoint `2ae643c7c9ff8aaa18975297be8075987410ec33` y contiene un único incremento posterior a ese corte.

La implementación se integró en `dev` mediante merge explícito no fast-forward:

- **SHA:** `f32d8f2a093705804a6d6b78ae8a036d42cfd25f`;
- **mensaje:** `merge(e2-03): integrar membresía propia del owner`;
- **padres:** `2ae643c7c9ff8aaa18975297be8075987410ec33` y `4381dee5620d046478416c6f6772b6290ace69b9`;
- **conflictos:** ninguno;
- **publicación:** `dev` y `origin/dev` coincidentes, divergencia `0/0`, antes de crear la rama documental.

## 5. Componentes entregados

La entrega incluye dominio, contratos y servicio de Aplicación de Membresía; repositorio, reader owner/self-scoped, guard transaccional, adaptadores de Usuario, Persona, Grupo y Temporada, composición y callables; tipos, servicio y sección frontend; reglas, índice, fixtures acotados y pruebas. El inventario detallado de los 36 archivos del commit se conserva en el informe de implementación y en `git show --stat 4381dee`.

No se modificaron dependencias ni lockfiles y no se incorporaron secretos, `.env`, claves VAPID, logs, artefactos de build o configuración UAT.

## 6. Modelo persistente de Membresía

`memberships/{membershipId}` contiene exclusivamente:

- `personId`;
- `groupId`;
- `seasonId`;
- `estado: "activa"`;
- `fechaIngreso`;
- `createdAt`;
- `schemaVersion: 1`.

El ID es un auto-ID opaco generado por backend. `fechaIngreso` y `createdAt` son timestamps de servidor confirmados en el mismo commit. Usuario, Persona, Grupo y Temporada no se modifican.

## 7. Guard de unicidad

`activeMembershipGuards/{guardId}` contiene exclusivamente `membershipId`, `personId`, `groupId`, `seasonId`, `idempotencyKeyHash`, `requestHash`, `createdAt` y `guardVersion: 1`.

El ID y los hashes usan los dominios y la codificación length-prefixed definidos por la ficha. La clave de idempotencia cruda no se persiste ni registra. El guard es coordinación técnica: no es Aggregate Root, fuente funcional, proyección pública ni sustituto de Membresía.

Guard y Membresía se confirman atómicamente. La detección de activas huérfanas consulta el par Persona–Grupo con `limit 2`; estados ausentes, múltiples o incompatibles fallan cerrados sin reparación, adopción, backfill ni eliminación.

## 8. Contratos públicos y DTO

Se entregaron:

- `createMyMembershipForOwnedGroup({ groupId, idempotencyKey })`;
- `getMyMembershipForOwnedGroup({ groupId })`.

Los payloads son cerrados. El DTO público contiene exclusivamente `id`, `personId`, `groupId`, `seasonId`, `estado` y `fechaIngreso`, serializada como ISO-8601 UTC. No expone `createdAt`, schema, guard, hashes, clave de idempotencia, documentos, referencias, identidad personal, roles o permisos.

## 9. Autorización owner/self-scoped

La autoridad funcional depende exclusivamente de `groups/{groupId}.ownerId == uid autenticado`. La cuenta, Persona, Grupo v1 activo y Temporada abierta se validan antes del alta, y ownership se relee dentro de la transacción.

No autorizan `users.roles`, global admin, arrays legacy, Persona, Membresía, Plan o Suscripción. Un Owner sin Persona mantiene la administración del Grupo pero recibe `PERSON_REQUIRED`; una Membresía activa no concede ownership ni permisos administrativos.

## 10. Idempotencia, concurrencia y contención

La primera intención válida devuelve `CREATED_ACTIVE`; el retry de la misma intención recupera la misma Membresía como `EXISTING_IDEMPOTENT`; una misma clave con request incompatible devuelve `IDEMPOTENCY_CONFLICT`; otra intención frente a una activa devuelve `MEMBERSHIP_ALREADY_EXISTS`.

La implementación reconoce estructuralmente contención Firestore en las formas gRPC `6/ALREADY_EXISTS` y `10/ABORTED`, incluidas causas envueltas. Tras una contención reconocida realiza una relectura autoritativa, sin escrituras, del guard determinista y de su Membresía estrictamente reconstruida:

- misma clave y request: `EXISTING_IDEMPOTENT`;
- par válido con otra clave: `MEMBERSHIP_ALREADY_EXISTS`;
- correlación incompatible: `INCOMPATIBLE_STATE`;
- ausencia de resultado confirmado: `CONFLICT`.

Los errores desconocidos conservan `INTERNAL_ERROR` sanitizado. La resolución no repara, adopta ni amplía la idempotencia fuera del contexto Persona–Grupo.

## 11. Frontend integrado

La sección owner/self-scoped reemplaza la presentación estática de Membresías únicamente en `/dashboard/groups/[groupId]`. Contempla carga, Persona o Temporada requerida, elegibilidad, confirmación, Membresía activa, resultado idempotente, error recuperable y estado no autorizado o incompatible.

La intención conserva su clave ante timeout, indisponibilidad, respuesta perdida y `CONFLICT`. `IDEMPOTENCY_CONFLICT` exige reconsulta, confirmación explícita de ausencia y comienzo de una nueva intención; cambiar `groupId` invalida la intención previa. El single-flight evita doble envío y se preservan foco, regiones anunciables, teclado y diseño responsive.

## 12. Reglas e índice

Las reglas deniegan explícitamente toda lectura y escritura cliente sobre `memberships` y `activeMembershipGuards` para visitante, autenticado, Owner, integrante y global admin. El acceso productivo queda limitado al backend autorizado.

Se versionó únicamente el índice compuesto requerido para `memberships`: `personId` ascendente, `groupId` ascendente y `estado` ascendente. El índice no fue desplegado.

## 13. Revisión independiente y correcciones

La primera verificación independiente requirió correcciones y su historia permanece en el informe:

- **H01:** la clave de intención podía quedar atrapada después de `IDEMPOTENCY_CONFLICT`; se extrajo y probó una máquina de intención con reconsulta y nueva intención explícita.
- **H02:** el teardown borraba colecciones completas; se sustituyó por un registro de fixtures propios que preserva documentos ajenos.
- **H03:** ownership transferido dentro de la ventana concurrente no estaba demostrado; se incorporó una seam interna neutra y una prueba determinista de relectura transaccional.
- **H04-R1:** una perdedora bajo contención podía escapar como `INTERNAL_ERROR`; se reconocieron códigos estructurados y se agregó relectura autoritativa sin escrituras.

La reverificación final cerró H01, H02, H03 y H04-R1 con veredicto `E2-03 APTO PARA UAT — HALLAZGO PREEXISTENTE E2-02 REGISTRADO`.

## 14. Pruebas y gate post-merge

La evidencia aprobada previa al cierre fue: unitarias Functions 157/157; focalizadas H01–H04-R1 26/26; Emulator Suite 80/80; sintaxis Functions 192/192; mantenimiento/reglas 7/7; build 21/21; typecheck correcto; lint sin hallazgos nuevos; `git diff --check` correcto.

Sobre `dev` fusionado se ejecutó nuevamente el gate proporcional antes de publicar:

| Gate | Resultado post-merge |
|---|---|
| Unitarias completas | 157/157 aprobadas |
| Focalizadas H01–H04-R1 | 26/26 aprobadas |
| Emulator Suite | 80/80 aprobadas |
| Sintaxis Functions | 192/192 aprobadas |
| Mantenimiento/reglas | 7/7 aprobadas |
| Typecheck | Correcto |
| Build | Correcto, 21/21 páginas |
| Lint baseline | 39 errores y 9 warnings conocidos; 6 hallazgos resueltos; sin regresiones |
| `git diff --check` | Correcto |
| JSON de índices | Válido |

Una primera ejecución simultánea de typecheck y build encontró transitoriamente ausente `.next/types/validator.ts` mientras Next regeneraba `.next`. El typecheck secuencial posterior al build aprobó. Se clasificó como carrera local entre gates sobre un artefacto generado, no como defecto E2-03, y no se modificó código ni configuración para ocultarla.

Todas las pruebas Firebase usaron Emulator Suite, proyecto `demo-sportexa-e0-02`, loopback y datos sintéticos. No hubo acceso a datos o proyectos Firebase remotos.

## 15. UAT

La UAT manual concluyó `UAT E2-03 APROBADO`: UAT-01 a UAT-09 fueron aprobados sobre Firebase Emulator Suite, proyecto `demo-sportexa-e2-03`, loopback y datos sintéticos.

Durante la preparación, una configuración sintética temporal inválida produjo `Vapid public key should be 65 bytes long when decoded.`. Se reemplazó sólo en el entorno local por una clave VAPID efímera válida. Fue un incidente de entorno UAT resuelto, no un defecto E2-03; no modificó archivos versionados, código, reglas, índices, dependencias ni configuración remota.

## 16. Hallazgo preexistente E2-02

Existe una intermitencia rara en el escenario de dos aperturas concurrentes de Temporada E2-02. Está clasificada como `PREEXISTENTE — NO ATRIBUIBLE A E2-03`:

- los archivos funcionales E2-02 permanecieron idénticos al checkpoint durante la corrección y verificación E2-03;
- no se encontró contaminación proveniente de fixtures o cleanup E2-03;
- no afectó el UAT funcional E2-03;
- no reapareció en la Emulator Suite post-merge 80/80;
- no se corrigió en esta rama para preservar alcance;
- no debe reinterpretarse como defecto de Membresía.

Requiere una intervención correctiva separada. Debe resolverse antes de considerar estable la concurrencia global de apertura de Temporadas y, como máximo, antes de un despliegue productivo que habilite ese flujo. E2-02 conserva esta deuda y no se declara libre de ella.

## 17. Legado, migración y efectos colaterales

Membresía es fuente autoritativa únicamente para el nuevo flujo de incorporación propia del Owner. La pertenencia general del producto continúa en legado y no fue migrada.

No se leyeron, escribieron, sincronizaron ni reinterpretaron arrays, endpoints o estructuras legacy de integrantes, administradores, solicitudes, posiciones, partidos, torneos o inscripciones. No hubo doble escritura, migración, backfill, reparación ni cambios en Usuario, Persona, Grupo o Temporada. Tampoco se crearon Solicitudes, notificaciones, Actividad, pagos, partidos, equipos, participaciones, roles o permisos.

## 18. Exclusiones y deuda aceptada

Quedan fuera de E2-03: incorporación de Personas ajenas, Solicitudes, invitaciones, baja, reactivación, renovación, historial, retención histórica de idempotencia, cierre de Temporada, coordinación entre cierre y alta, roles, cargos, permisos, consumidores deportivos, migración general y despliegue.

La futura operación de cierre de Temporada deberá coordinar su concurrencia con la creación de Membresías. Esa coordinación no se anticipó en este incremento. Persisten además el baseline histórico de lint y las advertencias ambientales de herramientas, sin regresiones E2-03.

## 19. Seguridad, publicación y ausencia de despliegue

La implementación y su merge fueron versionados y publicados. No se desplegaron Functions, frontend, reglas ni índices; no se consultaron ni modificaron datos Firebase remotos. El acceso de la CLI a información auxiliar no produjo acceso a proyectos o datos y las suites permanecieron cerradas a proyectos `demo-*` y loopback.

## 20. Rollback

El cierre documental puede revertirse mediante commits de revert explícitos del commit y merge documentales, sin reescribir historial. Un rollback técnico exige revertir de manera revisada el merge `f32d8f2a093705804a6d6b78ae8a036d42cfd25f` y el commit de implementación, reinicializar únicamente emuladores con datos sintéticos y repetir los gates. No debe abrir reglas, introducir doble escritura, reparar datos ni borrar ramas. No existen despliegues remotos E2-03 que revertir.

## 21. Estado de transición

E2-03 queda cerrado. Membresía es autoritativa sólo para la incorporación propia del Owner en el detalle canónico del Grupo; la pertenencia general legacy continúa sin migrar.

E2-04 queda habilitado únicamente para **definición** mediante su propia Ficha de Incremento Implementable, revisión y decisión de entrada. Este cierre no autoriza automáticamente su implementación ni amplía el alcance de Etapa 2.

## 22. Veredicto formal

La implementación está versionada, publicada, integrada, reverificada y aprobada por UAT. Los hallazgos propios H01–H04-R1 están cerrados; la deuda concurrente E2-02 queda registrada de forma separada y no se oculta ni atribuye a Membresía.

`E2-03 CERRADO — E2-04 HABILITADO PARA DEFINICIÓN`
