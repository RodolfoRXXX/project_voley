# E2-11 — Cierre

## Objetivo y alcance cerrado

Se cerró la consulta canónica de integrantes activos del Grupo para su Owner vigente. Es una capacidad exclusivamente de lectura: no crea, finaliza, reactiva, suspende ni modifica Membresías, Personas, Grupo o Temporada. Owner es el único actor autorizado; una Membresía, un rol global, un claim o un array legacy no confieren acceso al roster.

La fuente de verdad de cada fila es una Membresía `activa` del Grupo y de la Temporada abierta resuelta en backend. La Cuenta y `groups/{groupId}.ownerId` se releen en cada página; Grupo ajeno o inexistente responde `GROUP_NOT_ACCESSIBLE`. Owner sin Membresía no aparece por el solo ownership. Temporada ausente produce `NO_OPEN_SEASON`; contexto, guard o cardinalidad incompatibles fallan cerrados.

La lectura admite activas v1 y v3 sin migración. Para cada fila incluida valida unicidad Persona–Grupo, active guard correlacionado y Períodos de Vigencia coherentes: ninguno inesperado en v1 y un único período abierto válido en v3. Finalizadas e históricas quedan fuera. Personas se componen en backend mediante una capacidad mínima: disponible entrega nombre y apellido; ausente o incompatible mantiene la fila con `person.status: "UNAVAILABLE"` y la UI muestra “Identidad no disponible”. No hay fallback a `users`, Auth, UID ni email para completar la identidad del integrante.

## Contrato y superficie

La callable autenticada `listActiveGroupMembersForOwnedGroup({ groupId, pageSize?, cursor? })` acepta entrada cerrada, default 20 y rango 1–20. Entrega `scope`, `items` y `nextCursor`. Cada item sólo contiene `membershipId`, `joinedAt`, `isOwner` y `person`. `membershipId` es una referencia opaca y estable de fila; no se muestra ni autoriza comandos presentes o futuros. UID, email, `personId`, `seasonId`, guards, Períodos, schemas y timestamps técnicos permanecen privados.

El orden es `fechaIngreso ASC, documentId ASC`. La query filtra `groupId`, `seasonId` y `estado == activa`; el índice compuesto `memberships: groupId ASC, seasonId ASC, estado ASC, fechaIngreso ASC` fue confirmado para esa query en Emulator. `limit(pageSize + 1)` obtiene lookahead sin componer Persona para la fila extra. El cursor se ancla en la última fila entregada, liga actor, Grupo, Temporada, contrato y orden, y no da autoridad. El caso 20/21 con empates y el cambio de Temporada entre páginas fueron cubiertos por Emulator.

`/dashboard/groups/[groupId]` incorpora la sección informativa `Integrantes`, con carga, vacío, estado sin Temporada, retry, cargar más, avisos y foco accesible. No incluye controles de baja, selección, edición, expulsión o suspensión. El frontend sólo llama a la callable. Las reglas Firestore existentes conservan deny-all sobre Membresías, Personas, Temporadas, guards y Períodos; no fue necesario cambiar `firestore.rules`. La callable hace cero escrituras y no emite efectos colaterales.

## Validación y UAT

Gates previamente aprobados y registrados sin repetición: unitarias `271/271`; Emulator E2-11 `8/8`; Emulator Suite completa `157/157`; mantenimiento/reglas `7/7`; sintaxis Functions `263/263`; lint baseline, typecheck, build de `21/21` páginas, `git diff --check`, UTF-8, whitespace y EOF aprobados.

El usuario confirmó manualmente UAT-01 a UAT-10 y UAT-12. UAT-11 quedó `NO RECORRIBLE MANUALMENTE — CUBIERTA POR EMULATOR E2-11`. Las fixtures Emulator ya ejecutadas demostraron Persona ausente e incompatible, conservación de ambas Membresías, `UNAVAILABLE`, DTO cerrado, presentación “Identidad no disponible” y conteos sensibles iguales antes/después. La presentación de integrantes sólo lee Personas; no tiene fallback a `users`, Auth, UID o email. No se creó ni corrompió Persona para repetir UAT-11. La tabla definitiva y la distinción entre confirmación manual, inspección estática y Emulator constan en el informe de implementación. No quedó snapshot UAT persistente recuperable ni se inventaron IDs de esa sesión.

## Exclusiones, deuda y veredicto

Se preservaron ficha E2-11, AUD-C05, Documento 5, arquitectura, cierres E2-01 a E2-10, Auth/UAT aislada, endpoints y componentes legacy con consumidores, arrays históricos y E2-12 sin iniciar. No hubo deploy ni acceso a Firebase remoto. El índice configurado deberá acompañar un despliegue futuro autorizado. La baja administrativa Owner-scoped, con revalidación completa de actor, Cuenta, Grupo, Temporada, Membresía, guards y Períodos, sigue como deuda futura independiente; el roster no es su autorización.

**E2-11 CERRADO**.
