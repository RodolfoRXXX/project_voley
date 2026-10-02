# E2-23 — Informe de implementación y UAT

## Estado y alcance

- Rama: `feat/e2-23-archive-own-group`.
- HEAD base de implementación, auditoría y UAT: `18cfacfc1109254a16b593893e69119a9693395d`.
- Caso: CU-014, archivo terminal de un Grupo propio mediante `activo → archivado`.
- Este informe no constituye cierre formal, deploy ni autorización para integrar. E2-14 y Etapa 2 continúan abiertas; E3 permanece deshabilitada.
- La ficha E2-23, su addendum, los Documentos 1–5 y los cierres históricos permanecen intactos.

## Implementación y auditoría adversarial

La implementación incorpora preparación Owner-scoped, confirmación transaccional, token de contexto, idempotencia durable y recovery privado. El schema activo v1 y el archivado v2 son formas cerradas. La transición modifica exclusivamente `estado`, `schemaVersion` y `archivedAt` en la raíz y crea un único receipt privado en el mismo commit. No implementa desarchivo, transferencia, cascadas ni liberación del límite provisional de creación.

La auditoría comprobó autorización y no enumeración antes de preparación y recovery, precondiciones autoritativas, coordinaciones en curso, serialización con escritores contrapuestos, bloqueo de mutaciones sobre v2, preservación de consultas históricas y tratamiento canónico de v2 en Rules, HTTP y triggers. También verificó compatibilidad con E2-20 y E2-22A.

Se corrigieron cuatro defectos:

1. El teardown Emulator E2-23 eliminaba por prefijo y dejaba receipts con ID derivado y guards con hash. El aislamiento ahora registra y elimina todos los artefactos por `groupId`.
2. La pérdida de acceso detectada desde Membresía propia, Solicitudes pendientes o historia podía conservar otras secciones Owner-scoped. Todas propagan ahora un callback único que retira el detalle completo y navega a Grupos.
3. Respuestas tardías durante navegación entre Grupos podían repoblar el contexto anterior. Las cargas y la confirmación usan generaciones y descartan resultados obsoletos.
4. Un Grupo archivado todavía ofrecía crear/abrir Temporada desde el historial. La historia archivada quedó estrictamente read-only.

No surgieron decisiones funcionales nuevas.

## Gates técnicos y procedencia de la evidencia

Ejecutados durante la auditoría sobre este working tree:

- unitarias Functions: `350/350`;
- TypeScript frontend: aprobado;
- Emulator focal E2-23: `7/7`;
- Emulator integral canónico final de revisión: `224/224`, sin skips, en 297,7 s;
- lint baseline: aprobado;
- sintaxis Functions: `314/314` archivos;
- build Next.js de producción: aprobado;
- `git diff --check`: aprobado, con avisos no bloqueantes LF/CRLF.

La corrida diagnóstica previa a corregir el teardown terminó `218/224` y reprodujo contaminación concreta de E2-20 mediante `groupNameUpdateReceipts` y de E2-03 mediante `activeMembershipGuards`. Después de corregir la causa, la corrida integral quedó verde. En la revisión final, una primera invocación no llegó a ejecutar casos porque la Firebase CLI global solicitó Firestore Emulator v1.21.0 y el caché local sólo contenía v1.22.0; el runner, correctamente aislado de red, abortó el bootstrap. Se instaló el binario oficial v1.21.0 mediante `firebase setup:emulators:firestore` y se repitió una única vez por esa causa determinada, obteniendo `224/224`. Esta incidencia fue de preparación local del gate y no se utilizó para reclasificar ningún fallo histórico.

La evidencia heredada informaba `220/224` por agotamiento de reintentos transaccionales en una carrera E2-22A y `222/224` por un artefacto residual observado desde E2-03. Las repeticiones aisladas heredadas no se consideraron sustituto del gate integral. La causa histórica exacta del agotamiento de reintentos E2-22A **no quedó determinada** y no se reclasifica como infraestructura. E2-22A aprobó tanto en la corrida diagnóstica actual como en la integral final, sin aumentar reintentos, debilitar assertions ni omitir suites.

## Entorno UAT local

- Proyecto sintético aislado: `demo-sportexa-e2-23-uat`.
- Frontend: `http://127.0.0.1:3000`.
- Emulator UI: `http://127.0.0.1:4000`.
- Auth: `127.0.0.1:9099`.
- Firestore: `127.0.0.1:8080`.
- Functions: `127.0.0.1:5001`.
- El frontend se inició con variables de proceso que fuerzan el project ID demo y Functions local; `.env.local` no fue modificado.

La Firebase CLI realizó únicamente consultas públicas de versión y descarga del binario local de Firestore. La CLI confirmó que el project ID `demo-*` impide acceder a servicios no emulados. No hubo lectura, escritura ni deploy sobre datos de Firebase remotos.

Los datos sintéticos se preparan mediante un helper temporal de Admin SDK obligado a `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` y al project ID demo. La creación e inspección de fixtures no se atribuyen a interacción UAT humana. Cualquier cambio de `ownerId` utilizado para stale o pérdida de acceso es una intervención de prueba: E2-23 no implementa transferencia canónica.

## UAT humana guiada

Estado final: **APROBADA CON CORRECCIÓN Y RETEST**.

No se atribuirá como UAT visual ninguna llamada programática, inspección de Firestore, prueba automatizada o inferencia desde el código. Los resultados se registrarán por escenario después de recibir la observación humana.

| Escenario | Estado | Evidencia humana |
| --- | --- | --- |
| Acción Owner y preparación autoritativa | `OK` | El Owner abrió `Grupo UAT elegible`, vio la acción y la preparación terminó en elegible. |
| Mensajes para los cuatro bloqueos | `OK` | Temporada abierta, Membresía activa, Solicitud pendiente y coordinación en curso mostraron la orientación esperada y no habilitaron confirmación. |
| Cancelar, Escape, foco y trap Tab/Shift+Tab | `OK` | Cancelar y Escape cerraron, devolvieron foco al disparador y Tab/Shift+Tab permanecieron dentro del diálogo. |
| Confirmación sin cascadas ni desarchivo | `OK` | El diálogo elegible describió consulta posterior, ausencia de desarchivo y que no cierra Temporadas, finaliza Membresías ni decide Solicitudes. |
| Doble activación / single-flight | `OK` | Doble activación rápida mostró una única operación en curso y una única confirmación. |
| Archivo, recarga, lista propia y dashboard | `OK` | `Grupo UAT con historia` persistió archivado tras F5, apareció como Archivado en Mis Grupos y desapareció de la superficie operativa. |
| Detalle e historia read-only | `OK` | La Temporada cerrada siguió visible; no quedaron acciones de nombre, archivo, apertura de Temporada, Membresía, cargo/roster ni Solicitudes. |
| Privacidad y no enumeración visible | `OK` | El Outsider no vio detalle del Grupo archivado ni del ID inexistente; ambos resultados fueron indistinguibles y su listado mostró únicamente el Grupo propio. |
| Dos sesiones y stale por rename | `OK TRAS CORRECCIÓN` | El primer intento reveló bloqueo permanente en `Archivando…`. Tras la corrección, stale mostró el mensaje esperado, adoptó el nombre nuevo sin F5, mantuvo el Grupo activo y exigió una segunda confirmación para archivarlo. |
| Pérdida de ownership y retiro integral | `OK` | Tras una intervención técnica de fixture entre preparación y confirmación, el intento fue rechazado, cerró el diálogo, retiró todas las secciones Owner-scoped sin flash y navegó a Grupos. |
| Navegación con respuestas tardías | `OK` | Con throttling real del navegador, A→B durante carga y durante confirmación terminó establemente en B, sin contenido, estado ni mensajes tardíos de A. |
| Móvil 360 px y zoom 200% | `OK` | Diálogo, teclado, detalle archivado e historia fueron legibles y operables; no hubo overflow bloqueante. |
| Límite provisional tras archivar | `OK` | El Outsider archivó su único Grupo, comprobó persistencia tras recarga y la creación posterior fue rechazada con “Por el momento podés administrar un único Grupo propio.”; no apareció otro Grupo. |
| Retry con pérdida controlada de respuesta | `NO EJECUTADO` | Sólo se ejecutará si puede distinguirse verificablemente una pérdida posterior al commit de un fallo previo al envío. |
| Anuncios con lector de pantalla real | `NO EJECUTADO` | No hay tecnología asistiva confirmada en esta sesión. |

La persona UAT confirmó todos los escenarios marcados `OK`. El lector de pantalla quedó `NO EJECUTADO` porque no se utilizó tecnología asistiva real. El retry por pérdida de respuesta posterior al commit quedó `NO EJECUTADO`: el único corte controlado por navegación canceló antes del envío efectivo, como confirmó la persistencia, y no se lo presenta como recovery.

## Inspección persistente

Estado final: **APROBADA**, excepto los dos escenarios expresamente `NO EJECUTADO` que requieren una condición controlada o tecnología asistiva real.

La comparación conservará snapshots antes/después de raíz, Temporadas, Membresías, Períodos, Solicitudes y coordinaciones. Verificará que sólo cambien `estado`, `schemaVersion` y `archivedAt`; que no aparezca `archivedBy` ni metadata adicional; que exista un receipt por transición; y que cancelación, bloqueos, stale y errores produzcan cero escrituras. Un retry sólo se clasificará si la pérdida posterior al commit fue controlada y demostrable.

Después del primer bloque humano, la inspección local confirmó que todos los Grupos continuaban activos v1, había cero `groupArchiveReceipts` y las raíces de Temporada, Membresía, Solicitud y coordinación conservaban exactamente los fixtures iniciales. Por tanto, preparación, bloqueos, Cancelar y Escape produjeron cero escrituras.

Después del archivo humano de `e2-23-uat-history`, la raíz conservó exactamente `nombre`, `deporte`, `ownerId` y `createdAt`; cambió a `estado: archivado`, `schemaVersion: 2` y agregó únicamente `archivedAt: 2026-10-02T15:26:34.657Z`. No apareció `archivedBy`, `updatedAt` ni metadata adicional. Se observó un único receipt cerrado `ARCHIVE_GROUP`, con el mismo `archivedAt`, y la Temporada cerrada conservó todos sus campos y valores. No existían Membresías, Solicitudes ni coordinaciones asociadas y no se crearon por efecto del archivo.

## Defectos, correcciones y retests UAT

La primera ejecución humana del stale entre dos sesiones detectó un defecto frontend. Después de que la sesión A renombró el Grupo, la confirmación preparada en la sesión B recibió `STALE_ARCHIVE`; el backend respondió en aproximadamente 69 ms y la repreparación posterior terminó en aproximadamente 59 ms, pero el diálogo permaneció indefinidamente en `Archivando…`. La inspección confirmó Grupo activo con el nombre nuevo y cero archive receipts: el intento stale respetó el contrato persistente.

La causa fue el guard de generación del `finally`: repreparar incrementaba la generación y, por diseño, invalidaba el bloque que debía liberar `inFlight` y `sending`. Además, la UI descartaba el mensaje stale y no adoptaba el Grupo vigente devuelto por la nueva preparación. Se corrigió el ciclo para mantener single-flight durante la repreparación, liberar el envío al terminar, conservar el mensaje de contexto cambiado y actualizar el Grupo activo mostrado. No cambió el contrato backend ni la decisión funcional.

Gates posteriores a la corrección: unidad focal E2-23 `6/6` y TypeScript aprobados. El retest humano quedó aprobado. La inspección posterior mostró `Grupo UAT stale renombrado 2` archivado v2 y exactamente un archive receipt; el intento stale previo creó cero archive receipts y sólo la segunda confirmación aplicó la transición.

El lint posterior señaló una actualización de estado síncrona dentro del efecto de cambio de Grupo. Se difirió al microtask protegido por la misma generación, preservando el retiro de estado anterior y el descarte de respuestas tardías sin agregar deuda. Gates finales de la corrección UAT: unidad focal E2-23 `6/6`, TypeScript, lint baseline y build de producción aprobados; `git diff --check` se ejecutó después de retirar el helper temporal.

Para pérdida de ownership se modificó `ownerId` exclusivamente mediante Admin SDK contra Firestore Emulator; no se presenta como transferencia canónica. La confirmación preparada por el Owner anterior produjo cero archive receipts y dejó el Grupo activo v1. Después de capturar la evidencia se restauró técnicamente el `ownerId` original.

En navegación tardía, la inspección separada mostró que la confirmación de `e2-23-uat-navigation-a` no alcanzó el commit: la raíz continuó activa v1 y hubo cero archive receipts. Se clasifica como navegación/cancelación antes del envío efectivo, no como pérdida de respuesta posterior al commit ni como recovery.

## Límites de verificación

- No se usará Firebase remoto ni se hará deploy.
- No se simularán observaciones humanas.
- No se declararán anuncios hablados sin lector de pantalla real.
- No se presentará una desconexión genérica como prueba de recovery posterior al commit.
- E2-23 no aporta transferencia canónica; toda mutación de ownership del fixture se rotulará como intervención técnica y se restaurará cuando corresponda.
- Este documento no cierra E2-23, E2-14 ni Etapa 2 y no habilita E3.

## Resultado

La UAT manual local E2-23 queda aprobada con la corrección y el retest documentados. Esta clasificación no constituye cierre formal, integración, publicación ni deploy.
