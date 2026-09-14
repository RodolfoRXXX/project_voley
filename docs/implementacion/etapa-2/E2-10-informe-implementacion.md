# E2-10 — Informe de implementación de salida voluntaria de Membresía propia

## 1. Identificación

- Rama de trabajo: `feat/e2-10-voluntary-membership-exit`.
- SHA base, upstream y merge-base al iniciar: `16a5d11ced20f4dabcbbf83ed7ed10564cbfc227`.
- Autoridad: `E2-10-ficha-salida-voluntaria-membresia-propia.md`, sin modificaciones.
- Estado previo al versionado: implementación local sin stage, commit, push, merge ni cambio de rama; `HEAD`, upstream y merge-base en `16a5d11ced20f4dabcbbf83ed7ed10564cbfc227`, divergencia `0/0`, índice vacío y ausencia de stashes.

## 2. Alcance implementado y correspondencia ficha–código

Se implementó CU-009 para que el actor autenticado finalice exclusivamente la Membresía activa de su Persona en el Grupo indicado por `groupId`. La capacidad pública nueva resuelve Cuenta, Persona, Membresía, guards, Grupo y Temporada desde datos autoritativos; reutiliza `finalizeMembership`; cierra el período abierto; sustituye los guards; persiste el intent durable; y devuelve un efecto recuperable.

La consulta canónica `listMyCurrentGroupMemberships` agrega `group.viewerIsOwner` como dato de presentación. “Grupos que integrás” incorpora confirmación, advertencia especial para Owner, single-flight, retry con la misma clave, refresco persistido y mensajes accesibles. No se agregó roster, administración de terceros, transferencia, renovación, Actividad, notificaciones ni Plan/Suscripción.

## 3. Contrato público y autorización

Callable exacto: `leaveMyGroupMembership({ groupId, idempotencyKey })`.

- El payload debe ser un objeto plano cerrado. `groupId` admite 1–1500 bytes UTF-8; `idempotencyKey`, 16–128 caracteres con `^[A-Za-z0-9._:-]{16,128}$`.
- Se rechazan propiedades desconocidas y, por lo tanto, UID, `personId`, `membershipId`, `seasonId`, estado, fechas, ordinal, roles, permisos, guards o actor alternativo.
- La autorización deriva de token, Cuenta propia válida, Persona propia vinculada y active guard/raíz correlacionados con esa Persona y el Grupo. No usa roles globales, arrays legacy ni ownership.
- Un Owner con Membresía puede salir y conserva íntegro el ownership; `actorWasOwner` se deriva del Grupo dentro de la transacción y sólo informa el efecto. Un Owner sin Membresía recibe `MEMBERSHIP_NOT_FOUND`.

Respuesta exacta exitosa:

```json
{
  "outcome": "EXIT_CONFIRMED",
  "exit": {
    "membershipId": "string",
    "groupId": "string",
    "seasonId": "string",
    "activationOrdinal": 1,
    "endedAt": "ISO-8601 UTC",
    "actorWasOwner": false
  }
}
```

El único outcome exitoso es `EXIT_CONFIRMED`. Los reasons sanitizados quedan limitados a `UNAUTHENTICATED`, `ACCOUNT_REQUIRED`, `PERSON_REQUIRED`, `PERSON_INCOMPATIBLE`, `GROUP_INCOMPATIBLE`, `VALIDATION_FAILED`, `MEMBERSHIP_NOT_FOUND`, `MEMBERSHIP_NOT_ACTIVE`, `MEMBERSHIP_SEASON_NOT_MODIFIABLE`, `IDEMPOTENCY_CONFLICT`, `INCOMPATIBLE_STATE`, `CONFLICT`, `DEPENDENCY_UNAVAILABLE` e `INTERNAL_ERROR`, con mapping callable cerrado.

## 4. Temporada, dominio y compatibilidad

La primera ejecución exige la Temporada exacta abierta y schema compatible. Una Temporada ausente, cerrada, cambiada o no correlacionada produce `MEMBERSHIP_SEASON_NOT_MODIFIABLE`, sin intent confirmado ni escrituras de ciclo de vida. Un retry de un intent ya confirmado recupera su resultado aunque la Temporada haya cerrado después. La operación nunca modifica Temporada.

- Activa v3: conserva identidad, `fechaIngreso`, `createdAt`, historia y ordinales; fija `fechaEgreso`; cierra exactamente el período abierto; deja cero períodos abiertos; conserva `periodCount`.
- Activa v1: evoluciona a v3, materializa y cierra únicamente el período ordinal 1 con fechas preexistentes y el timestamp autoritativo; no inventa fechas.
- Finalizada v2/v3: sólo recupera el efecto si el intent coincide; sin ese intent devuelve `MEMBERSHIP_NOT_ACTIVE`.
- Schemas desconocidos, cardinalidades inválidas o correlaciones rotas fallan cerrados. La salida no crea una nueva activación; una reactivación posterior continúa bajo E2-09.

## 5. Persistencia, idempotencia y concurrencia

La transacción modifica exclusivamente:

- `memberships/{membershipId}`;
- `memberships/{membershipId}/validityPeriods/{periodId}`;
- `activeMembershipGuards/{personGroupGuardId}`;
- `membershipLifecycleGuards/{personGroupGuardId}`;
- `membershipSelfExitIntents/{intentId}`.

El intent v1 contiene exactamente `userId`, `personId`, `membershipId`, `groupId`, `seasonId`, `activationOrdinal`, `idempotencyKeyHash`, `requestHash`, `status`, `outcome`, `actorWasOwner`, `createdAt`, `finalizedAt`, `completedAt` e `intentVersion`. El ID y los hashes son SHA-256 deterministas sobre encodings length-prefixed y separados por dominio. Nunca se persiste la clave cruda. El intent confirmado es terminal, inmutable, durable y sin TTL; una política futura sólo podría archivarlo conservando un tombstone consultable y el mismo resultado.

La unidad transaccional relee Cuenta, Persona, intent, ambos guards, raíz, cardinalidades, períodos, Grupo, open-season guard y Temporada exacta antes de escribir. La misma clave/request recupera el mismo resultado; la misma clave con otro request produce `IDEMPOTENCY_CONFLICT`. Claves distintas, CU-027, reactivación, transferencia de ownership y cierre de Temporada quedan ordenados por relecturas y contención: como máximo una operación cierra una activación. Un retry antiguo recupera su ordinal y jamás actúa sobre una reactivación posterior.

No se modifican Grupo, `memberIds`, `pendingRequestIds`, otros arrays, Persona, Cuenta, Temporada, Solicitudes, intents de Solicitud, Actividad ni notificaciones. No hay transacción global entre Agregados.

## 6. Seguridad, frontend y UX

`membershipSelfExitIntents/{intentId}` quedó explícitamente deny-all, como Membresías y Períodos para acceso directo cliente. Toda escritura ocurre server-side. La UI canónica ofrece “Salir del grupo”, diálogo explícito accesible, cancelación y Escape, foco gestionado, bloqueo de doble envío, estado cargando, retry recuperable con clave estable, descarte de clave al cancelar o cerrar el ciclo, mensaje específico de Temporada cerrada y éxito sólo después de la respuesta durable seguida de la recarga canónica. Al Owner se le advierte que seguirá siendo propietario y administrando el Grupo.

## 7. Retiro legacy exacto

- `handleLeaveGroup`: retirado de las superficies públicas y protegidas que escribían `memberIds`.
- `POST /groups/{groupId}/join`: retirado únicamente su dispatch de salida; ahora recibe el `404` común.
- `volley-ranking-frontend/src/app/api/groups/[groupId]/join/route.ts`: retirado por ser BFF exclusivo de esa salida.
- `/join/groups/[groupId]`: conservado; el build lo confirma.
- HTTP API compartido, altas/bajas administrativas, Solicitudes, administración, Torneos, Partidos y demás consumidores: conservados.
- Arrays legacy existentes: no leídos, migrados, limpiados ni adoptados por E2-10.

## 8. Inventario exacto

### Creados

- `docs/implementacion/etapa-2/E2-10-informe-implementacion.md`
- `volley-ranking-frontend/src/components/memberships/membershipSelfExitMachine.d.mts`
- `volley-ranking-frontend/src/components/memberships/membershipSelfExitMachine.mjs`
- `volley-ranking-system/functions/callables/leaveMyGroupMembership.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipSelfExitStore.js`
- `volley-ranking-system/functions/test/emulator/membershipSelfExitE2.test.js`
- `volley-ranking-system/functions/test/unit/membershipSelfExitIntent.test.js`
- `volley-ranking-system/functions/test/unit/membershipSelfExitMachine.test.js`

### Modificados

- `volley-ranking-frontend/src/app/(protected)/profile/groups/page.tsx`
- `volley-ranking-frontend/src/app/(public)/groups/page.tsx`
- `volley-ranking-frontend/src/components/memberships/MyCurrentGroupMembershipsSection.tsx`
- `volley-ranking-frontend/src/services/membershipsService.ts`
- `volley-ranking-frontend/src/types/MyCurrentGroupMembership.ts`
- `volley-ranking-frontend/src/types/OwnMembership.ts`
- `volley-ranking-system/firestore.rules`
- `volley-ranking-system/functions/index.js`
- `volley-ranking-system/functions/src/groups/infrastructure/firestoreMemberContext.js`
- `volley-ranking-system/functions/src/httpApi.js`
- `volley-ranking-system/functions/src/memberships/application/membershipContract.js`
- `volley-ranking-system/functions/src/memberships/application/membershipDto.js`
- `volley-ranking-system/functions/src/memberships/application/membershipErrors.js`
- `volley-ranking-system/functions/src/memberships/application/membershipHashing.js`
- `volley-ranking-system/functions/src/memberships/application/membershipObservability.js`
- `volley-ranking-system/functions/src/memberships/application/membershipService.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipCallable.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipExternalContexts.js`
- `volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js`
- `volley-ranking-system/functions/test/emulator/legacyJoinRetirementE2.test.js`
- `volley-ranking-system/functions/test/emulator/membershipListE2.test.js`
- `volley-ranking-system/functions/test/run-emulator-tests.js`
- `volley-ranking-system/functions/test/unit/legacyJoinRetirementArchitecture.test.js`
- `volley-ranking-system/functions/test/unit/membershipArchitecture.test.js`
- `volley-ranking-system/functions/test/unit/membershipCallable.test.js`
- `volley-ranking-system/functions/test/unit/membershipContract.test.js`
- `volley-ranking-system/functions/test/unit/membershipHashing.test.js`
- `volley-ranking-system/functions/test/unit/membershipService.test.js`

### Eliminado

- `volley-ranking-frontend/src/app/api/groups/[groupId]/join/route.ts`

## 9. Pruebas y gates aprobados

Todas las ejecuciones con Firebase usaron sólo Auth, Firestore y Functions Emulator en loopback, proyecto explícito `demo-sportexa-e0-02`, proxies externos bloqueados y sin fallback remoto.

| Gate | Resultado |
| --- | --- |
| Unitarias | 264/264 |
| Contractuales/focalizadas | 63/63 |
| Emulator E2-10 | 12/12 |
| Emulator E2-04 | 10/10 |
| Emulator E2-05 | 18/18 |
| Emulator E2-09 | 7/7 |
| Emulator E2-08 | 6/6 |
| Emulator Suite completa | 149/149 |
| Sintaxis | 256/256 |
| Mantenimiento | 7/7 |
| Lint | aprobado |
| Typecheck | aprobado |
| Build | aprobado |
| `git diff --check` | aprobado |

Estas suites no se repiten durante el cierre. Después de actualizar exclusivamente este informe y crear el cierre se ejecutan sólo las validaciones documentales y de integridad autorizadas.

## 10. Incidencias y correcciones

1. Un fixture v3 focal tenía un inicio de período distinto de `fechaIngreso`; se alineó el fixture con el schema aprobado. Producción no cambió por esta incidencia.
2. La suite completa encontró una expectativa E2-08 que aún exigía salida por `memberIds`; se actualizó para esperar `404` y verificar Grupo inmutable. La focal quedó 6/6 y la suite completa 149/149.
3. El primer typecheck encontró validadores `.next` ignorados que aún referían el BFF eliminado. Se verificó la ruta exacta e ignorada, se retiró sólo esa caché generada y el typecheck posterior aprobó. El build regeneró artefactos consistentes.
4. Firebase CLI no pudo consultar su MOTD por el bloqueo de red esperado; fue advertencia no fatal. No se actualizó ninguna dependencia.

## 11. UAT aprobada y fuentes de evidencia

| Caso | Resultado aprobado | Evidencia |
| --- | --- | --- |
| UAT-01 | Aprobada manualmente | Recorrido manual |
| UAT-02 | Aprobada manualmente | Recorrido manual |
| UAT-03 | Aprobada manualmente | Recorrido manual |
| UAT-04 | Aprobada manualmente y por inspección | Recorrido manual e inspección persistente |
| UAT-05 | Aprobada manualmente y por inspección | Recorrido manual e inspección persistente |
| UAT-06 | Aprobada manualmente y por inspección | Recorrido manual e inspección persistente |
| UAT-07 | Aprobada por cobertura automatizada aceptada | No fue recorrible manualmente porque no se conservó la primera `idempotencyKey`; la prueba Emulator E2-10 cubre replay/idempotencia por ordinal |
| UAT-08 | Aprobada manualmente y por inspección | El Owner finalizó exclusivamente su Membresía y conservó ownership y administración |
| UAT-09 | Aprobada por cobertura automatizada aceptada | No fue recorrible manualmente porque todavía no existe UI para cerrar Temporadas; la prueba Emulator E2-10 verifica `MEMBERSHIP_SEASON_NOT_MODIFIABLE` sin escrituras |
| UAT-10 | Aprobada manualmente y por inspección | Recorrido manual e inspección final de efectos colaterales |

La evidencia manual corresponde sólo a los casos que efectivamente se recorrieron. La inspección persistente confirmó los efectos señalados en UAT-04, UAT-05, UAT-06, UAT-08 y UAT-10. Emulator aporta la cobertura exclusiva aceptada para UAT-07 y UAT-09: no se ejecutaron manualmente esos dos casos y no existió una fixture UAT real de Temporada cerrada. Los IDs concretos de la sesión UAT no fueron conservados en la evidencia recibida; su ausencia se declara y no bloquea el cierre.

## 12. Ausencia de efectos colaterales y operación remota

La inspección final aprobada no encontró cambios colaterales en Grupo, ownership, `memberIds`, `pendingRequestIds`, Temporada, Solicitudes, intents de Solicitud, Persona, Cuenta, Actividad ni notificaciones. Salir finaliza exclusivamente la Membresía propia: no es una baja administrativa y no transfiere ni elimina ownership. Un reintento histórico recupera el resultado del ordinal confirmado; no constituye una nueva salida ni actúa sobre una activación posterior.

No hubo deploy ni acceso a Firebase remoto. Las ejecuciones con Firebase se limitaron a Emulator en loopback. La rama preservada `chore/preserve-auth-emulator-uat-changes` permanece aislada en `fc7135e358902a17372d44f20df50883603520ce` y no forma parte de E2-10.

## 13. Limitaciones, riesgos y deuda residual

- UAT-07 no pudo repetirse manualmente al no conservarse la primera `idempotencyKey`; la cobertura Emulator por activación/ordinal fue aceptada.
- UAT-09 no puede recorrerse manualmente hasta que exista UI de cierre de Temporada; la cobertura Emulator sin escrituras fue aceptada.
- La UI depende de `crypto.randomUUID`, soportado por los navegadores objetivo del build aprobado.
- Permanecen fuera de alcance expulsión o baja de terceros, roster, roles, disciplina, transferencia de ownership, renovación, cierre general de Temporada, notificaciones, Actividad, migraciones, limpieza de arrays y Plan/Suscripción.
- La política futura de archivo o retención de intents debe conservar un tombstone consultable y el mismo resultado idempotente; no se incorporó en E2-10.

## 14. Estado final de Git previo al versionado

- Rama: `feat/e2-10-voluntary-membership-exit`.
- `HEAD`, upstream y merge-base: `16a5d11ced20f4dabcbbf83ed7ed10564cbfc227`.
- Divergencia respecto del upstream: `0/0`.
- No existen commits posteriores inesperados.
- Índice vacío y ausencia de stashes.
- Inventario: 36 rutas propias de implementación y este informe; no hay archivos ajenos.
- La ficha E2-10 y AUD-C05 no fueron modificados.
- Auth/UAT permanece aislada en el commit indicado.
- No se detectaron secretos, logs, archivos de Emulator, dependencias ni artefactos temporales para versionar.
