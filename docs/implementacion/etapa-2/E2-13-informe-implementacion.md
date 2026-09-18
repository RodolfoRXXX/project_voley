# E2-13 — Informe final de implementación

Estado: implementación, UAT y gates aprobados; incremento integrado técnicamente en `dev`.

## Alcance y veredicto

E2-13 retiró la autoridad organizativa legacy basada en documentos `groups`, arrays embebidos y `users.roles`, sin migrar, reparar ni borrar datos históricos. El repositorio canónico E2 permanece como único writer de Grupo v1 por Admin SDK. Temporada, Membresía, Solicitud, roster, salida propia y finalización administrativa conservan sus contratos canónicos.

La implementación quedó versionada en `417955275d6fdd6696094fdbd7b7d4417631bdee` e integrada mediante merge no fast-forward `ef9f9674806383b2d283e2a69c54bb27bd0384e9`.

## Inventario definitivo

El inventario técnico incluyó 52 rutas: 35 modificadas, 12 eliminadas y 5 nuevas. Sumado este informe, el estado previo al versionado comprendía 53 rutas físicas.

- Implementación productiva/backend: tombstones, retiro de productores, handlers, servicio writer, backfill organizativo y scripts npm huérfanos.
- Frontend y navegación: redirecciones, aviso accesible, retiro de UI legacy, navegación UAT-01 y filtro de alertas.
- Rules/configuración: denegación total de escrituras cliente sobre `groups` y retiro de scripts operativos inválidos.
- Pruebas, fixtures y runners: cobertura E2-13, navegación, políticas mínimas, arquitectura y aislamiento E2-03.
- Eliminación intencional: ocho BFF, tres componentes exclusivamente legacy y `adminGroupService.js`.
- Documentación operativa: `README.md`, inseparable del retiro técnico porque eliminó instrucciones y el modelo operativo legacy ya inválidos.
- Documentación de cierre: este informe y `E2-13-cierre.md`, aislados en un commit documental posterior.

No se incorporaron archivos accidentales, secretos, logs, datos de Emulator, temporales, artefactos de build, dependencias ni lockfiles. Quedaron fuera la ficha E2-13, Documentos 1–5, AUD-C05, documentación normativa ajena y Auth/UAT.

## Capacidades retiradas y conservadas

Se retiraron ocho capacidades HTTP de administración, expuestas como tombstones `410` JSON estables antes de autenticación o datos: solicitud de administración; aprobación y rechazo de solicitud; alta y baja de administrador; alta y baja de miembro; y búsqueda de miembros.

Los seis callables `addGroupAdmin`, `removeGroupAdmin`, `reorderGroupAdmins`, `transferGroupOwnership`, `editGroup` y `toggleGroupActivo` permanecen exportados como tombstones puros `failed-precondition`, razón `LEGACY_GROUP_CAPABILITY_RETIRED`, sin acceso a Admin SDK, base de datos ni servicios legacy.

Se eliminaron las ocho BFF equivalentes, writers, UI, productores de alertas, backfill organizativo y scripts huérfanos. Las rutas administrativas y de perfil redirigen una vez a `/dashboard/groups?notice=legacy-group-capability-retired`; el destino presenta aviso neutro con `role="status"`. UAT-01 corrigió “Mis grupos” como navegación raíz y el cálculo de ruta activa más específica en Navbar y Sidebar.

Los GET públicos conservados son anónimos y sanitizados: sólo proyectan datos mínimos de grupos legacy públicos/activos, excluyen arrays, ownership, pertenencia, permisos, conteos derivados y Grupo v1, y no ofrecen ingreso canónico. Push deriva el UID del token sin leer `users`.

Se conservan exactamente cuatro consumidores frontend E4: `getUserManagedGroups`, `getGroupById`, `getUserRelatedGroups` y el detalle de Partido legacy. También se preservan los writers y lectores deportivos backend aprobados de Partido/Torneo. No queda writer organizativo legacy alcanzable.

## UAT final

| UAT | Clasificación final |
| --- | --- |
| UAT-01 | Aprobada manualmente después de la corrección de navegación. |
| UAT-02 | Aprobada manualmente. |
| UAT-03 | Aprobada manualmente. |
| UAT-04 | Aprobada manualmente. |
| UAT-05 | Parcialmente manual; detalle legacy cubierto por automatización. |
| UAT-06 | Aprobada manualmente. |
| UAT-07 | No recorrible manualmente; cubierta por Rules y Emulator E2-13. |
| UAT-08 | No recorrible manualmente; cubierta por pruebas e inspección. |

No se fabricaron grupos legacy, roles globales ni alertas para completar recorridos inseguros.

## Gates finales

| Gate | Resultado |
| --- | --- |
| E2-03 focal | `18/18` |
| Emulator focal E2-13 | `7/7` |
| Emulator Suite completa fresca | `168/168` |
| Arquitectura E2-13 y navegación UAT-01 | `9/9` |
| Mantenimiento | `7/7` |
| Sintaxis del runner y fixture corregido | exit 0 |
| `git diff --check` | exit 0 |

La corrida anterior `163/168` no es el resultado final. La prueba diagnóstica de contención de E2-03 escribía `createdAt` sobre el guard real del Owner. Cuando una transacción resultaba exitosa contaminaba el esquema v3 del guard; cuatro pruebas posteriores fallaban con `INCOMPATIBLE_STATE` y el quinto fallo era la agregación del bloque padre.

La corrección quedó limitada a `membershipE2.test.js`: ahora utiliza un guard diagnóstico sintético registrado para teardown y comprueba por igualdad profunda que el guard real permanezca intacto. No se modificó código productivo, no se relajaron aserciones y la Suite completa fresca aprobó `168/168`.

Los intentos afectados por `EPERM` al resolver `C:\Users\Rodolfo` dentro del sandbox se repitieron válidamente fuera de esa restricción. Los emuladores usaron loopback y el proyecto demo; el intento no fatal del CLI de obtener MOTD/config remota fue bloqueado. No hubo acceso efectivo a Firebase remoto.

## Límites y deuda conservada

No hubo migraciones ni modificaciones de datos históricos, deploy ni acceso Firebase remoto. Auth/UAT permanece aislada en `chore/preserve-auth-emulator-uat-changes`, commit `fc7135e358902a17372d44f20df50883603520ce`.

La deuda E4 se conserva explícitamente: cuatro consumidores frontend legacy allowlisted, compatibilidad de lecturas y reglas deportivas para Partido/Torneo, y los writers deportivos backend aprobados. Su retiro o migración corresponde a Etapa 4.

E3 no fue iniciada. Documento 5 y AUD-C05 no fueron actualizados. E2-13 no declara cerrada toda la Etapa 2: el paso posterior es una auditoría consolidada de Etapa 2 para comprobar cobertura, deuda y habilitación de E3.
