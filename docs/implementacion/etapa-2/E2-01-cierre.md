# E2-01 — Cierre formal

## 1. Identificación

- **Incremento:** `E2-01 — Alta mínima de Grupo propio, ownership y acceso contextual del Owner`.
- **Etapa:** Etapa 2 — Organización, Grupo, Membresía, Solicitud y Temporada.
- **Fecha de cierre:** 2026-08-26.
- **Rama de implementación:** `feat/e2-01-grupo-ownership`.
- **Rama de cierre:** `docs/e2-01-cierre`.
- **Ficha normativa:** `docs/implementacion/etapa-2/E2-01-ficha-grupo-ownership.md`.
- **Informe de implementación y UAT:** `docs/implementacion/etapa-2/E2-01-informe-implementacion.md`.
- **Estado anterior:** implementación, verificación automática, UAT, versionado e integración en `dev` completados; cierre formal pendiente.
- **Estado final:** incremento cerrado y E2-02 habilitado únicamente para definición mediante su propia ficha.

Este documento cierra exclusivamente E2-01. No cierra la Etapa 2, no define ni implementa E2-02 y no autoriza desplegar recursos Firebase.

## 2. Objetivo cerrado

Quedó entregado el corte vertical que permite a un Usuario autenticado y con cuenta propia válida crear un Grupo organizativamente mínimo, quedar establecido como su único Owner vigente, recuperar sus Grupos mediante consultas owner-scoped y abrir la vista básica del recurso confirmado.

El resultado no exige Persona, Membresía ni Temporada y preserva:

`autorización funcional ≠ habilitación comercial ≠ validez de dominio`

## 3. Alcance funcional entregado

E2-01 entregó:

- creación mínima de Grupo propio;
- asignación backend del Owner inicial desde el UID del token verificado;
- listado de Grupos propios por ownership;
- consulta básica de un Grupo propio;
- proyección mínima para dashboard;
- autorización exclusiva `owner-access`;
- payload de creación cerrado;
- idempotencia ante reintentos y respuesta perdida;
- serialización y control de concurrencia por Usuario;
- límite provisional de un Grupo propio por Usuario;
- reglas cliente conservadoras;
- frontend protegido de creación, listado y vista básica;
- estados vacío, carga y feedback diferenciado de errores;
- aislamiento o retiro del flujo legado afectado.

## 4. Exclusiones preservadas

No se implementaron Persona, Membresía, Temporada, Solicitudes, invitaciones, incorporación de integrantes, administradores delegados, edición general, configuración, visibilidad pública, Club, transferencia de ownership, operaciones deportivas, Plan, Suscripción, segundo Grupo, migración global del legado ni despliegue remoto.

Tampoco se convirtieron estructuras legadas en contratos normativos ni se adelantaron capacidades de E2-02.

## 5. Decisiones normativas confirmadas

- Grupo es un Agregado independiente y su único Aggregate Root es Grupo.
- Todo Grupo posee exactamente un Owner vigente.
- El Owner inicial deriva exclusivamente del UID del token verificado.
- El cliente no puede enviar, elegir ni sustituir al Owner.
- Ownership pertenece al Grupo como fuente de verdad.
- Ownership no equivale a Membresía.
- El Owner no requiere Persona ni Membresía.
- No se crea una Membresía inicial automática para el Owner.
- Un Grupo puede existir sin Membresías y sin Temporada.
- Los roles globales no autorizan acceso a Grupos.
- Un usuario legado con rol `admin`, pero sin ownership, no obtiene acceso a un Grupo schema v1.
- El backend continúa como único escritor del Grupo canónico.
- La Presentación no accede directamente a Firestore en el flujo E2-01.
- No se crearon colateralmente Persona, Membresía, Temporada, Solicitud, Plan ni Suscripción.

## 6. Arquitectura y componentes implementados

La solución conserva separación entre Dominio, Aplicación, Infraestructura y Presentación:

- Dominio puro de Grupo, sin dependencia de Firebase;
- servicio de Aplicación responsable de identidad, cuenta, validación, capacidad e interacción entre puertos;
- repositorio específico de Grupo y reader owner-scoped;
- puerto técnico separado para el control transitorio de creación;
- adaptadores Firestore con transacción atómica;
- callables públicos delgados;
- DTO y mappers explícitos sin tipos de persistencia;
- frontend consumidor de contratos backend.

No se introdujeron repositorio o coordinador genéricos, Saga, outbox, Aggregate Root artificial ni acceso del servicio de Aplicación al Admin SDK.

## 7. Contratos públicos entregados

Se entregaron las capacidades lógicas para crear Grupo propio, listar Grupos propios, obtener un Grupo propio y obtener la proyección mínima del dashboard.

El DTO público de Grupo contiene `id`, `nombre`, `deporte`, `estado`, `ownerUserId` y `createdAt` ISO-8601. La creación distingue outcomes `created` y `existing`. Los contratos no exponen documentos, snapshots, timestamps, referencias, hashes ni guards Firestore.

El catálogo schema v1 admite únicamente `voleibol`; el estado inicial es `activo`. El payload acepta exactamente `nombre`, `deporte` e `idempotencyKey` y rechaza campos desconocidos.

## 8. Autorización por ownership

La creación exige token verificado, cuenta propia válida mediante `self-account` y política transitoria satisfecha. Las consultas comparan el UID autenticado con `Grupo.ownerId`.

No se deriva autoridad de arrays, Membresía, Persona ni `users.roles`. Un no-Owner es rechazado aunque posea el rol global legado `admin`. El flujo no implementa `member-access`.

## 9. Política comercial transitoria

Continúa vigente el máximo provisional de un Grupo propio por Usuario, aplicado en Aplicación mediante `groupCreationGuards/{firebaseUid}`.

El guard es estado técnico, no un Agregado ni una fuente de verdad comercial. La política no representa Plan Free, Plan, Suscripción, rol, permiso o beneficio comercial. Debe retirarse o reemplazarse por una capacidad Comercial real antes de permitir un segundo Grupo o implementar Comercial.

## 10. Persistencia

El documento canónico se persiste en `groups/{groupId}` con ID aleatorio, opaco, estable e independiente del UID y de la clave de idempotencia. Su schema v1 cerrado contiene exactamente:

- `nombre`;
- `deporte`;
- `ownerId`;
- `estado`;
- `createdAt`;
- `schemaVersion`.

El control técnico se persiste separadamente en `groupCreationGuards/{firebaseUid}` con `groupId`, `idempotencyKeyHash`, `requestHash`, `createdAt` y `guardVersion`. No conserva la clave cruda. Grupo y guard se confirman atómicamente.

## 11. Idempotencia y concurrencia

Una primera creación válida devuelve `created`. La misma clave y el mismo payload devuelven posteriormente `existing` con el Grupo persistido; la misma clave con payload diferente devuelve conflicto. Una clave distinta frente a un Grupo confirmado respeta el límite provisional.

Las creaciones del mismo Usuario se serializan mediante el guard transitorio. Las solicitudes iguales concurrentes producen un único Grupo y outcomes `created`/`existing`; las solicitudes diferentes no crean un segundo Grupo. Los fallos previos al commit no dejan estado parcial, una respuesta perdida no duplica y un guard inconsistente falla cerrado sin reparación silenciosa. El UID no se utiliza como ID del Grupo.

## 12. Frontend entregado

Se entregaron las rutas protegidas:

- `/dashboard/groups`;
- `/dashboard/groups/new`;
- `/dashboard/groups/[groupId]`.

Incluyen estado inicial, carga, vacío, CTA de creación, formulario cerrado, bloqueo de doble envío, clave estable para reintentos, confirmación desde la respuesta persistida, navegación al detalle y feedback diferenciado de validación, autorización, límite, conflicto y dependencia.

La ausencia de Persona, Membresías o Temporada se presenta como estado organizativo vacío válido. No hay actualización optimista, Firestore directo ni acciones prematuras de edición, configuración, transferencia o actividad deportiva.

## 13. Legado aislado o retirado

Se retiró el escritor directo de `/admin/groups/new` como autoridad de alta y la creación cliente basada en `addDoc(collection(db, "groups"))`, junto con las precondiciones de rol global y la asignación automática del Owner como miembro o administrador.

Los consumidores legados fuera de alcance permanecen aislados y rechazan documentos `schemaVersion == 1` cuando corresponde. Los cambios en reglas, exports, servicios administrativos, triggers y rutas se limitaron a ese aislamiento; no se realizó una migración global ni se declaró resuelto el legado completo.

## 14. Pruebas automatizadas y gates

La verificación integrada sobre `dev` produjo:

| Gate | Resultado |
|---|---|
| Pruebas específicas E2-01 | 23/23 aprobadas |
| Suite unitaria completa | 95/95 aprobadas |
| Firebase Emulator Suite | 55/55 aprobadas, incluidos 11 escenarios E2-01 |
| Mantenimiento | 7/7 aprobadas |
| Sintaxis Functions | 148/148 archivos |
| Typecheck | Correcto |
| Build de producción | Correcto, 21/21 páginas |
| Lint | Sin regresiones frente al baseline de 39 errores y 9 warnings |
| `quality:stage0` | Correcto |
| `git diff --check` | Correcto, código 0 y sin hallazgos |

La cobertura incluye dominio, contratos, Aplicación, persistencia atómica, idempotencia, concurrencia, reglas, frontend, límites arquitectónicos y ausencia de efectos colaterales.

## 15. UAT

La UAT funcional fue aprobada con observaciones no bloqueantes: 20 pruebas manuales aprobadas y ningún defecto detectado.

UAT-18 quedó `NO EJECUTADA MANUALMENTE` porque no se simuló una caída de Functions. Sus aspectos críticos —fallo antes o después del commit, respuesta perdida e idempotencia— poseen cobertura automatizada mediante Emulator Suite. Esta cobertura fue aceptada expresamente como suficiente para la integración, sin atribuir aprobación manual a UAT-18.

## 16. Seguridad y Firebase

- Las lecturas y escrituras cliente sobre Grupos canónicos schema v1 están denegadas.
- Las lecturas y escrituras cliente sobre guards están totalmente denegadas.
- El rol global `admin` no abre acceso.
- No se ampliaron permisos de colecciones ajenas.
- Las pruebas utilizaron únicamente Firebase Emulator Suite, hosts loopback, datos sintéticos y el proyecto `demo-sportexa-e0-02`.
- No hubo consultas, escrituras, modificaciones ni despliegues sobre Firebase remoto.

## 17. Trazabilidad Git

| Hito | SHA | Evidencia |
|---|---|---|
| Ficha implementable | `5d507b83c2404562c2db727abd77c6c7cab4b971` | Checkpoint documental de E2-01 |
| Implementación | `4fba1ae7d01801d33ec7d83070da715083c84dc3` | Backend, frontend, reglas, aislamiento legado y pruebas |
| Informe y UAT | `8f66fdafa6192b94aaeaff4fb250db4566a08885` | Evidencia de implementación, gates y UAT |
| Integración en `dev` | `c2412861c0843e8bdf4bd1f008a90011fdebe8d2` | Merge no fast-forward trazable |

El merge de integración tiene como padres `5d507b83c2404562c2db727abd77c6c7cab4b971` y `8f66fdafa6192b94aaeaff4fb250db4566a08885`, con mensaje `merge: integrar E2-01 grupo propio y ownership`.

## 18. Inventario documental

- Ficha normativa: `E2-01-ficha-grupo-ownership.md`.
- Informe de implementación y UAT: `E2-01-informe-implementacion.md`.
- Cierre formal: `E2-01-cierre.md`.

La ficha conserva las decisiones aprobadas; el informe conserva el detalle operativo; este cierre consolida el resultado sin modificar los Documentos 1–5.

## 19. Riesgos y deuda residual

1. UAT-18 no fue ejecutada manualmente; mantiene cobertura automatizada aceptada como observación no bloqueante.
2. Persiste el baseline de lint de 39 errores y 9 warnings, sin regresiones atribuibles a E2-01.
3. Persisten advertencias ambientales conocidas sobre `firebase-functions`, Browserslist y otra instancia local del emulador.
4. El límite de un Grupo es provisional y debe sustituirse por Comercial antes de ampliar capacidad.
5. El legado quedó aislado, no globalmente migrado.

Estas observaciones no constituyen defectos bloqueantes según la evidencia aprobada y tampoco se declaran resueltas.

## 20. Condiciones para incrementos posteriores

Los incrementos posteriores deben preservar el Grupo como Agregado independiente, ownership como fuente de verdad del Grupo, autorización contextual sin roles globales, escritura backend-only y separación entre Grupo, Temporada, Membresía, Solicitud y Comercial.

Antes de permitir un segundo Grupo o incorporar Comercial debe reemplazarse el guard provisional. La introducción futura de Membresía no puede reinterpretar ownership ni crear retroactivamente una Membresía automática para el Owner. El legado schema anterior sólo podrá migrarse mediante inventario, ficha y evidencia específicos.

## 21. Rollback documental y técnico

El cierre documental puede revertirse mediante un revert explícito de su commit y del merge documental, sin reescribir historia. El rollback técnico de E2-01 requiere revertir de forma revisada la integración y sus commits, reinicializar emuladores con datos sintéticos y repetir los gates; no debe recurrir a doble escritura ni abrir reglas. No existen datos o despliegues Firebase remotos que revertir.

## 22. Habilitación del siguiente incremento

E2-01 deja disponible el Grupo mínimo, ownership contextual y los contratos owner-scoped necesarios para evaluar el próximo corte del roadmap.

Queda habilitada únicamente la **definición** de `E2-02 — Temporada inicial abierta`, mediante su propia Ficha de Incremento Implementable completa, revisada y declarada lista. Este cierre no diseña ni autoriza la implementación de E2-02.

## 23. Veredicto formal

No existen criterios incumplidos ni defectos funcionales conocidos dentro del alcance aprobado. La implementación está versionada e integrada, los gates post-merge están aprobados y la UAT fue aceptada con una observación no bloqueante registrada honestamente.

`E2-01 CERRADO — E2-02 HABILITADO PARA DEFINICIÓN`
