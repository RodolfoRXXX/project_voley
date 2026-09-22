# E2-15 — Cierre canónico de Temporada (CU-018)

## Declaración de cierre

E2-15 implementa y valida CU-018. El cierre exige cero Membresías activas: cada Membresía debe finalizarse explícitamente mediante su capacidad administrativa; `closeSeason` no finaliza ni elimina Membresías de forma automática.

Una Temporada cerrada queda en estado terminal. El mismo commit transaccional persiste la Temporada cerrada y su receipt durable, y libera el slot de Temporada abierta. El retry histórico de N recupera su resultado idempotente sin consultar, borrar ni modificar el slot posterior de N+1.

Las Solicitudes intertemporada se preservan. Una Solicitud pendiente puede atravesar N→N+1 y su aprobación se resuelve contra la Temporada abierta actual, sin renovación silenciosa.

## Validación

- UAT-01–06, UAT-08, UAT-10, UAT-11 y UAT-16: aprobadas manualmente.
- UAT-07: confirmada mediante UI e inspección persistente.
- UAT-09: cubierta por Emulator/pruebas de idempotencia; no se atribuye ejecución manual del retry histórico.
- UAT-12: variante no Owner aprobada manualmente; variante de rol global cubierta por Emulator/automatización.
- UAT-13: confirmada manualmente y/o por inspección persistente.
- UAT-14: confirmada por inspección persistente.
- UAT-15: cubierta por inspección/automatización; no se afirma byte-equivalencia manual de Partido y Torneo.

Los gates aprobados registran: focal unitario/arquitectura 86/86; focal Emulator E2-15 5/5; unitarias completas 288/288; serialización Emulator 58/58; mantenimiento/Rules 7/7; sintaxis Functions 276/276; lint baseline, typecheck y build con exit 0; 21/21 páginas estáticas. Para la Emulator Suite completa sólo se conserva evidencia acreditable de TAP sin fallos y exit 0; no se inventa un conteo total.

## Deuda y alcance

`E2-DATA-INTEGRITY-01` permanece como deuda no bloqueante: CU-018 protege estados alcanzables y writers canónicos, pero no realiza saneamiento histórico global.

La posible finalización masiva de Membresías y la invitación de integrantes anteriores deberán evaluarse en incrementos normativos separados. No se incorporan correos, renovación automática, finalización masiva ni UX adicional. La renovación intertemporada corresponde a CU-029/E2-18 y debe preservar consentimiento, trazabilidad e idempotencia.

CU-017, CU-019 y CU-029 quedan fuera de alcance. E2-14 y Etapa 2 continúan abiertas; E3 no queda habilitada. E2-16 no se inicia con este cierre.
