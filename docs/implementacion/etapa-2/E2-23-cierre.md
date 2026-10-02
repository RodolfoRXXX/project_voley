# E2-23 — Cierre formal del archivo de Grupo

## Estado

- Incremento: `E2-23`.
- Caso de uso: `CU-014 — Archivar un Grupo`.
- Estado documental: `CERRADO`.
- Implementación: `b7a88d29fca0e24b934e37a77d0266584f7a13dd`.
- Merge no fast-forward de implementación en `dev`: `88f7146bdd0e78f7d9583eec844378bf638a6759`.
- Padres del merge: `18cfacfc1109254a16b593893e69119a9693395d` y `b7a88d29fca0e24b934e37a77d0266584f7a13dd`.
- Deploy: no realizado.
- Firebase remoto: no accedido.

## Fuentes y trazabilidad

Este cierre se contrastó con:

- [`E2-23-ficha-archivo-grupo.md`](./E2-23-ficha-archivo-grupo.md), definición contractual, inventario técnico y criterios de terminado;
- [`Documento-2-addendum-E2-23-archivo-grupo.md`](../../arquitectura/Documento-2-addendum-E2-23-archivo-grupo.md), decisión funcional prospectiva de CU-014;
- [`E2-23-informe-implementacion.md`](./E2-23-informe-implementacion.md), auditoría, implementación, gates, UAT e inspección persistente;
- [`Documento 5 - Plan de Implementación y Transición Técnica-borrador.md`](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md), especialmente §§3, 5, 7.4 y D5-024/025/030/033–035/041;
- los cierres [`E2-20-cierre.md`](./E2-20-cierre.md) y [`E2-22A-cierre.md`](./E2-22A-cierre.md), como antecedentes de compatibilidad y estructura documental;
- el historial Git de la definición, la implementación y su integración.

La ficha fue definida por `e10414c1130cd1631cca6aa90ef65c237bf06fce` y su objeto integrado es `e53e2c060fc9f48406fbc5c30ba50df3352e908a`. El addendum fue aprobado por `ec9ed47a3e6e1d8c1b9e4ac281f50ce9d3796efb` y su objeto integrado es `34315df039a17f1f8cba40e66875743ae9a6d0aa`. El objeto integrado del informe es `283e1a6cefabb4ebda4b1ff6b2cf5be347cbe6ce`.

El commit técnico tiene como padre único `18cfacfc1109254a16b593893e69119a9693395d`. El merge lo incorpora como segundo padre sobre esa misma base. La definición precede al código y la integración conserva el inventario aprobado de 35 archivos modificados y 8 nuevos.

## Alcance funcional cerrado

E2-23 cierra CU-014 exclusivamente para la transición terminal `activo → archivado` iniciada por el Owner vigente. Incluye preparación autoritativa, confirmación transaccional, token de contexto, idempotencia durable, recovery privado, listado y detalle Owner read-only, historia autorizada y retiro de las superficies operativas.

El Grupo archivado conserva identidad, nombre, deporte, Owner, fecha de creación e historia. Desaparece del dashboard operativo, descubrimiento y flujos de ingreso, pero continúa en el listado propio como archivado. Todas las mutaciones operativas quedan bloqueadas; sólo se admite recuperar la misma intención confirmada.

Quedan expresamente fuera:

- `CU-015`, eliminación de Grupo;
- desarchivo o reactivación;
- transferencia de ownership;
- liberación de cupo o política comercial definitiva;
- atributos todavía pendientes de `CU-026`;
- cascadas sobre Temporadas, Membresías, Períodos, Solicitudes o coordinaciones;
- migración, backfill, reparación global, TTL, eventos obligatorios o deploy.

E2-23 no implementa ni satisface esas capacidades y no las habilita implícitamente.

## Persistencia, compatibilidad y privacidad

La raíz activa conserva el schema cerrado v1 y la archivada utiliza el schema cerrado v2. La transición modifica exclusivamente `estado`, `schemaVersion` y `archivedAt`; preserva los demás campos del Grupo y crea un único `groupArchiveReceipt` privado en el mismo commit. No persiste `archivedBy`, metadata adicional ni snapshots de otros Agregados.

La elegibilidad exige cero Temporadas abiertas, Membresías activas, Solicitudes pendientes y coordinaciones capaces de activar una Membresía. Esas condiciones se releen autoritativamente y sólo bloquean: el archivo no las resuelve ni produce efectos indirectos. Los escritores contrapuestos serializan mediante la raíz Grupo.

La implementación mantiene compatibilidad con E2-20 y E2-22A: rename y las operaciones de Temporada, Membresía, cargo y Solicitud exigen Grupo activo; las consultas históricas autorizadas admiten el Grupo archivado sin adquirir acciones nuevas ni ampliar cargo u otros datos privados. HTTP, triggers y Rules reconocen v2 como schema canónico y nunca lo hacen pasar por legacy. `groupArchiveReceipts` permanece deny-all.

Preparación y recovery reautorizan al Owner antes de revelar estado privado. Grupo inexistente y Grupo ajeno convergen públicamente. La pérdida de ownership retira el detalle Owner-scoped completo y navega a Grupos.

## Auditoría, correcciones y retests

La auditoría adversarial corrigió cuatro defectos antes de la integración:

1. el teardown focal podía dejar receipts y guards derivados fuera de su limpieza;
2. una pérdida de acceso detectada desde secciones internas podía conservar parte del detalle Owner-scoped;
3. respuestas tardías al navegar entre Grupos podían repoblar una vista anterior;
4. la historia de un Grupo archivado todavía ofrecía abrir Temporada.

La UAT detectó además que un stale causado por rename dejaba el diálogo indefinidamente en `Archivando…`. La repreparación incrementaba la generación y el `finally` anterior ya no liberaba `inFlight` ni `sending`; también se descartaban el mensaje stale y el Grupo vigente. La corrección mantuvo single-flight durante la repreparación, liberó ambos estados al terminar, conservó el mensaje, refrescó autoritativamente el Grupo y exigió reconfirmación. El retest humano verificó stale desbloqueado, nombre actualizado sin recarga, Grupo aún activo antes de reconfirmar, segunda confirmación exitosa y persistencia final.

Después de ese retest, lint señaló una actualización de estado síncrona dentro del efecto de cambio de Grupo. El diff integrado reemplaza únicamente esa limpieza inmediata por `queueMicrotask`, capturando la generación actual y comprobando `current === generation.current` antes de limpiar. Las respuestas de carga conservan el mismo control y el cleanup incrementa la generación sólo si aún corresponde. Por ello una limpieza vieja no puede alcanzar el Grupo nuevo y el estado anterior se retira antes de aceptar una respuesta vigente.

La prueba de regresión integrada exige `generation.current` en la página, el descarte de respuestas obsoletas, la preparación autoritativa, `onPrepared(result.group)`, la repreparación con mensaje stale y la liberación explícita de `inFlight`/`sending`. TypeScript, lint, build, unitarias, Emulator integral y el focal post-merge aprobaron con ese código. Esto respalda equivalencia funcional respecto del retest ya realizado, pero no se atribuye un segundo retest humano inexistente.

## Evidencia automatizada

### Gates finales previos al versionado técnico

- lint baseline: aprobado;
- TypeScript: aprobado;
- sintaxis Functions: `314/314`;
- unitarias completas: `350/350`;
- Emulator integral completo, secuencial y aislado: `224/224`, sin skips;
- build de producción: aprobado;
- `git diff --check`: aprobado.

La primera invocación final del Emulator no llegó a ejecutar pruebas: la Firebase CLI solicitó Firestore Emulator v1.21.0 y el caché local sólo contenía v1.22.0. Se instaló el binario oficial mediante `firebase setup:emulators:firestore` y se realizó una única repetición explicada, que obtuvo `224/224`. Ese bootstrap local no se presenta como corrida fallida del producto.

La evidencia histórica anterior incluía un agotamiento de reintentos transaccionales en una carrera E2-22A. Su causa exacta **no quedó determinada** y no se reclasifica como infraestructura por haber aprobado corridas posteriores.

### Verificación posterior al merge técnico

- TypeScript: aprobado;
- unitarias completas: `350/350`;
- Emulator focal E2-23: `7/7`.

No se vuelven a ejecutar suites para este cierre porque la única intervención es este documento.

## UAT humana

La UAT humana quedó aprobada con corrección y retest del stale. Verificó acción y preparación Owner, mensajes de los cuatro bloqueos, Cancelar/Escape, foco y tabulación, confirmación sin cascadas, single-flight, archivo y recarga, listado propio, exclusión del dashboard, historia read-only, ausencia de acciones operativas, privacidad y no enumeración, stale entre sesiones, pérdida de ownership, navegación A→B con respuestas tardías, móvil de 360 px, zoom 200% y conservación del límite provisional de creación.

- Lector de pantalla real: `NO EJECUTADO`.
- Pérdida controlada de respuesta posterior al commit: `NO EJECUTADO`.

La navegación cancelada observada no alcanzó el commit y no se presenta como recovery. Teclado, foco, `aria-live`, inspección y pruebas automatizadas no sustituyen una comprobación con tecnología asistiva real.

## Inspección persistente

La inspección antes y después confirmó:

- preparación, bloqueos, Cancelar, Escape, stale y pérdida de ownership sin escrituras de archivo;
- modificación exclusiva de `estado`, `schemaVersion` y `archivedAt` en la raíz archivada;
- ausencia de `archivedBy`, `updatedAt` y metadata adicional;
- exactamente un receipt cerrado por transición confirmada;
- cero cascadas sobre Temporadas, Membresías, Períodos, Solicitudes y coordinaciones;
- historia y Temporada cerrada preservadas;
- el intento stale sin receipt y sólo la reconfirmación como transición aplicada.

No se inspeccionó un retry humano posterior a una pérdida controlada de respuesta después del commit, porque ese escenario quedó `NO EJECUTADO`.

## Evaluación de cierre y límites

La evidencia satisface la definición de terminado de la ficha y los criterios comunes del Documento 5: comportamiento, frontend, Functions y Rules son compatibles; existe una única fuente de verdad; no quedan escritores o lectores anteriores necesarios para CU-014; los consumidores fueron adaptados; los gates, UAT e inspección están registrados; y la trazabilidad identifica commits, objetos y límites.

Los dos escenarios `NO EJECUTADO` no constituyen requisitos específicos obligatorios de cierre. Permanecen como límites de verificación honestamente declarados: no se infiere un anuncio hablado ni se fabrica una pérdida posterior al commit. No se detectó otro criterio obligatorio incumplido.

No hubo deploy ni acceso a datos Firebase remotos. Al integrar la implementación, `dev` y `origin/dev` quedaron alineados, el árbol y el índice limpios, y Auth/UAT preservada en su rama aislada.

## Estado del plan

- E2-23 cierra CU-014 dentro del alcance aprobado.
- CU-015 continúa pendiente.
- E2-14 y Etapa 2 permanecen abiertas.
- E3 permanece deshabilitada.
- E2-24 puede considerarse el siguiente candidato para definición, sin quedar aprobado ni iniciado por este cierre.
- El Documento 5 no se modifica: conforme a D5-036 y §5.18, conserva resultados de nivel etapa y el detalle queda en ficha, informe y cierre.

## Veredicto

`E2-23 CERRADO — CU-015 PENDIENTE — E2-14 Y ETAPA 2 ABIERTAS`
