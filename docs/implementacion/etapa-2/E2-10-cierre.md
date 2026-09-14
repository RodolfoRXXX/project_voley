# E2-10 — Cierre de salida voluntaria de Membresía propia

## 1. Estado y veredicto

E2-10 cierra CU-009 para la salida voluntaria de la Membresía propia y reutiliza de forma acotada la transición de finalización de CU-027. El incremento está implementado, sus gates técnicos aprobaron y la UAT fue aprobada.

Este cierre no cierra la Etapa 2, no inicia otro incremento y no autoriza deploy ni acceso a Firebase remoto.

## 2. Objetivo y alcance cerrado

La persona autenticada puede finalizar exclusivamente su propia Membresía activa en un Grupo mediante el contrato público:

`leaveMyGroupMembership({ groupId, idempotencyKey })`

La autorización es self-person: deriva la Cuenta, Persona y Membresía desde la identidad autenticada y datos autoritativos. El payload no admite `personId`, `membershipId`, actor alternativo, roles ni permisos aportados por cliente. La salida propia no es una baja administrativa de terceros.

El único resultado durable exitoso es `EXIT_CONFIRMED`. La operación finaliza la misma raíz Membresía, cierra exactamente su período abierto y conserva identidad, ingreso e historia. Cuando quien sale también es Owner, finaliza exclusivamente su Membresía y conserva ownership y administración del Grupo.

## 3. Persistencia, idempotencia y compatibilidad

La idempotencia queda ligada a la activación y su ordinal mediante un intent durable. La misma clave y request recuperan el mismo `EXIT_CONFIRMED`; una clave en conflicto falla cerrada. Un retry histórico recupera el resultado de la activación confirmada y nunca se interpreta como una salida nueva sobre una reactivación posterior.

La implementación conserva compatibilidad legacy:

- una Membresía activa v1 evoluciona por la escritura autorizada a v3 y materializa/cierra el período ordinal 1 sin inventar fechas;
- una activa v3 conserva sus períodos previos y cierra únicamente el abierto;
- raíces finalizadas v2/v3 sólo recuperan un efecto cuando coincide el intent confirmado;
- schemas o correlaciones incompatibles fallan cerrados;
- no hay migración global, backfill ni adopción de arrays legacy.

El retiro legacy efectivo elimina la salida que escribía `memberIds`, su dispatch HTTP y el BFF exclusivo asociado. Se preservan el ingreso público, las altas y bajas administrativas, Solicitudes y los demás consumidores no equivalentes.

## 4. Gates técnicos

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

Las suites completas no se repitieron durante el cierre; sólo se realizaron las validaciones documentales y de integridad autorizadas.

## 5. Resultado UAT

| Caso | Resultado |
| --- | --- |
| UAT-01 | Aprobada manualmente |
| UAT-02 | Aprobada manualmente |
| UAT-03 | Aprobada manualmente |
| UAT-04 | Aprobada manualmente y por inspección |
| UAT-05 | Aprobada manualmente y por inspección |
| UAT-06 | Aprobada manualmente y por inspección |
| UAT-07 | Aprobada por la prueba Emulator E2-10 de replay/idempotencia por ordinal; no recorrible manualmente porque no se conservó la primera `idempotencyKey` |
| UAT-08 | Aprobada manualmente y por inspección; el Owner finalizó exclusivamente su Membresía y conservó ownership y administración |
| UAT-09 | Aprobada por la prueba Emulator E2-10 de `MEMBERSHIP_SEASON_NOT_MODIFIABLE` sin escrituras; no recorrible manualmente porque todavía no existe UI para cerrar Temporadas |
| UAT-10 | Aprobada mediante recorrido manual e inspección final de efectos colaterales |

UAT-07 y UAT-09 no se ejecutaron manualmente. No existió una Temporada cerrada real durante UAT. La ausencia de IDs concretos conservados de la sesión queda declarada y no bloquea este cierre.

## 6. Exclusiones, deuda y operación

Se preservan fuera de alcance la baja o expulsión administrativa de terceros, roster, roles, disciplina, transferencia de ownership, renovación, cierre o reapertura de Temporada, migraciones, backfills, limpieza de arrays legacy, Actividad, notificaciones y Plan/Suscripción.

Como deuda futura, una eventual política de archivo o retención de intents deberá conservar un tombstone consultable y el resultado idempotente. La UI de cierre de Temporada pertenece a otro incremento. Ninguna de estas deudas se incorporó a E2-10.

No hubo deploy ni acceso a Firebase remoto. Auth/UAT permanece aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`, sin integración.

## Veredicto

**E2-10 CERRADO**
