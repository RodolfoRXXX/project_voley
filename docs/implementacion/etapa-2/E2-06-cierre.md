# E2-06 — Cierre formal

## 1. Identificación y trazabilidad

- Incremento: `E2-06 — Solicitud propia de ingreso a Grupo`.
- Ficha normativa: `docs/implementacion/etapa-2/E2-06-ficha-solicitud-ingreso.md`.
- Informe de implementación y UAT: `docs/implementacion/etapa-2/E2-06-informe-implementacion.md`.
- Rama de implementación: `feat/e2-06-group-join-request`.
- Rama de cierre: `docs/e2-06-cierre`.
- Base documental original: `d9e84d782cfaf67194a8596d6d35519b4f62e0d2`.
- Base final sincronizada: `c1ba65399ddf0fb3ca8c88cd1541a2ce615194bf`.
- Commit de implementación: `64ad2b22de4781d8ef3c2733df29db3a03e76939`.
- Merge no fast-forward de implementación en `dev`: `f77b768a07513af0f580876fcede082a28484f93`.
- Padres del merge: `c1ba65399ddf0fb3ca8c88cd1541a2ce615194bf` y `64ad2b22de4781d8ef3c2733df29db3a03e76939`.

El árbol del merge de implementación es idéntico al árbol del commit probado. La feature y el merge fueron publicados sin force push y sin resolución manual de conflictos.

## 2. Objetivo y alcance entregado

E2-06 entrega el flujo mínimo completo de Solicitud propia de ingreso a un Grupo canónico conocido:

- preview autenticado y candidate-safe mediante `groupId` opaco;
- creación propia idempotente;
- consulta de la Solicitud propia pendiente vigente;
- cancelación propia que conserva historia e intención;
- listado paginado de pendientes para el Owner vigente.

Solicitud quedó implementada como Aggregate Root y fuente de verdad funcional independiente. El guard pendiente se limita a unicidad temporal Persona–Grupo y el intent durable permite recuperar retries y respuestas inciertas.

## 3. Contratos y superficies

Los cinco callables integrados son:

- `getKnownGroupJoinPreview`;
- `createMyGroupJoinRequest`;
- `getMyCurrentGroupJoinRequest`;
- `cancelMyGroupJoinRequest`;
- `listPendingGroupJoinRequestsForOwnedGroup`.

Los contratos usan payloads cerrados y DTO explícitos. UID, Persona, Owner, roles y estados se derivan autoritativamente. Las respuestas no exponen documentos Firestore, email, hashes, claves, guards, intents ni stacks.

El frontend candidato utiliza `/join/groups/[groupId]`, conserva la clave ante respuesta incierta, impide doble envío y exige una acción explícita para iniciar una nueva intención. La superficie Owner lista únicamente pendientes con nombre y apellido, sin aprobar ni rechazar.

## 4. Persistencia, integridad e idempotencia

Las colecciones nuevas son:

- `groupJoinRequests`, autoridad funcional;
- `pendingGroupJoinRequestGuards`, contención temporal;
- `groupJoinRequestIntents`, recuperación durable.

La consulta autoritativa por Persona, Grupo y estado pendiente usa límite 2. Cero pendientes y guard ausente representa ausencia legítima; una única Solicitud y guard exactamente correlacionados representa estado válido; cualquier asimetría, duplicado, huérfana o incompatibilidad falla cerrada sin reparación.

El `intentId` deriva del dominio técnico estable, UID autenticado y clave de idempotencia. El `requestHash` cubre la versión contractual, Persona autoritativa y Grupo. La clave cruda no se persiste ni registra. Cancelar conserva Solicitud e intent, elimina exclusivamente el guard y una nueva intención requiere una nueva clave.

## 5. Autorización, privacidad y reglas

El preview y las acciones propias requieren token, Cuenta y Persona compatibles. El Owner y quien ya posee una Membresía activa son rechazados como candidatos. El listado requiere ownership vigente; una Membresía o un rol global `admin` no conceden administración.

El preview no revela Owner, integrantes, email, Temporada ni configuración. El listado Owner sólo muestra nombre y apellido. Las tres colecciones E2-06 mantienen deny-all para cualquier cliente; el backend opera mediante Admin SDK.

## 6. Concurrencia, paginación e índice

Las transacciones realizan todas las lecturas antes de escribir y no reutilizan transacciones cerradas. Las relecturas sólo recuperan un outcome cuando el estado persistido completo lo demuestra; ausencia, estado parcial, duplicados o corrupción conservan el error estable correspondiente.

El listado aplica máximo 20, orden `createdAt DESC, documentId DESC` y cursor opaco con timestamp e ID. Timestamps iguales no producen omisiones por desempate. Una Persona, Solicitud o guard incompatible hace fallar toda la página.

El único índice incorporado por E2-06 es:

```text
groupId ASC
estado ASC
createdAt DESC
```

No se agregaron overrides ni un índice adicional para la consulta autoritativa con límite 2.

## 7. Correcciones concurrentes incorporadas como prerrequisitos

La base final contiene dos correcciones preexistentes, desarrolladas y versionadas separadamente antes de acreditar la combinación final:

- E2-03/E2-05, creación concurrente de Membresía: commit `0f59d38bbd8bd6dd61a1e619f282013af87962d6`, integrado en la base `7dd60fef12919f8f7b24338d36286230bda2abae`;
- E2-02, apertura concurrente de Temporada: commit `75e077cd0074c3183015e1ce947535df40f35bcf`, merge `c1ba65399ddf0fb3ca8c88cd1541a2ce615194bf`.

Ambas recuperaciones reconocen el error sólo en su límite transaccional privado y exigen estado autoritativo íntegro antes de devolver un outcome. No amplían clasificadores generales ni agregan atomicidad entre Agregados. Sus documentos correctivos permanecen como evidencia complementaria.

## 8. Resultados técnicos

| Evidencia | Resultado |
| --- | --- |
| Sintaxis Functions | `239/239` |
| Unitarias focales Temporada | `10/10` |
| Unitarias focales Membresía | `19/19` |
| Unitarias focales E2-06 | `19/19` |
| Emulator focal Temporada | `11/11` |
| Emulator focal Membresía | `18/18` |
| Emulator focal E2-06 | `13/13` |
| Unitarias completas | `231/231` |
| Emulator Suite completa | `107/107` |
| Mantenimiento/reglas | `7/7` |
| Typecheck | Aprobado |
| Build | Aprobado, 21 páginas |
| Lint baseline | Aprobado |
| `quality:diff` y `git diff --check` | Aprobados |

La primera ejecución combinada de Emulator fue interrumpida por el límite de uso sin resultado final. Tras confirmar que no quedaban procesos ni salida completa, la única repetición autorizada terminó aprobada. La interrupción fue de infraestructura y no un fallo técnico.

## 9. UAT aprobada

La UAT manual fue ejecutada en navegador real con Emulator local, loopback, proyecto `demo-*` y datos sintéticos. Aprobaron preview candidate-safe, creación, bloqueo de doble envío, persistencia tras recarga, cancelación confirmada, nueva intención explícita, listado Owner, privacidad, estados de carga/vacío/error/retry, teclado, foco, anuncios, controles táctiles y responsive.

También se confirmó la ausencia de acciones de aprobar, rechazar o crear Membresía. No se usó Firebase remoto.

## 10. Exclusiones y legado preservados

No se implementaron aprobación, rechazo, creación de Membresía, notificaciones, actividad ni búsquedas o listados públicos. No se modificaron Grupo, Temporada, Persona, Usuario, Membresía ni arrays legacy como efecto del flujo.

Permanecen aislados `pendingRequestIds`, `pendingAdminRequestIds`, `memberIds`, `adminIds`, `admins`, API HTTP y búsqueda legacy, pantallas públicas y administrativas legacy, solicitudes administrativas, partidos, Torneos y roles globales. No existe doble lectura, fallback ni doble escritura.

No se agregaron dependencias ni se modificaron lockfiles, fichas o documentos históricos.

## 11. Riesgos residuales y deuda

- El N+1 del listado Owner permanece expresamente acotado a 20.
- No existe snapshot consistente entre páginas; se conserva la semántica normal de paginación Firestore.
- Los intents no tienen TTL ni cleanup por decisión normativa.
- Aprobación, rechazo y creación de Membresía requieren incrementos posteriores aprobados.
- No se promete atomicidad multi-Agregado entre Solicitud y Membresía.

## 12. Seguridad operacional y publicación

- Sin deploy.
- Sin acceso ni escritura en Firebase remoto.
- Sin credenciales ni datos reales.
- Sin logs, temporales o fixtures Emulator versionados.
- Sin amend, rebase, squash o force push.
- Sin eliminación de ramas.
- Sin repetición de suites durante el versionado y cierre.

## 13. Habilitación siguiente

E2-06 queda implementado, revisado, aprobado por UAT, versionado, integrado y publicado en `dev`. E2-07 queda habilitado únicamente para definición normativa. Este cierre no crea una rama E2-07, no define su contrato y no autoriza su implementación.

## 14. Veredicto formal

**E2-06 CERRADO — E2-07 HABILITADO PARA DEFINICIÓN**
