# IUX-11B — Informe de implementación local

- **Fecha:** 26 de noviembre de 2026.
- **Base verificada:** `dev@c6619d6752d2a2396b162b6be2d569f966619f08`, igual a `origin/dev` al iniciar.
- **Rama:** `feat/iux-11b-vinculacion-fichas`.
- **Definición versionada:** `f05ee57` (`docs(iux-11): cerrar definición de vinculación de fichas`).
- **Build UAT:** `FR-tYzB5t0m4TKc_fpDKo`.
- **Build técnico posterior al ajuste de recuperación:** `BFvRmjKpGzzLGkgRh8rMf`.
- **Estado:** cierre funcional aprobado; revisión visual diferida por decisión del usuario.

La UAT funcional fue aprobada por el usuario el 26 de noviembre de 2026 sobre `FR-tYzB5t0m4TKc_fpDKo` en el proyecto sintético `demo-sportexa-iux11b-uat`. Esa aprobación acredita el recorrido funcional, no una revisión visual exhaustiva. Después de la UAT se reforzaron, con evidencia automatizada, la conservación de la clave idempotente en reintentos y la selección explícita de la participación más reciente; el build técnico resultante no sustituye ni amplía la aprobación humana informada.

## Alcance implementado

1. `Mi perfil → Ficha personal` lista páginas de hasta diez candidaturas acreditadas por el correo primario verificado que Firebase Auth/Admin SDK devuelve para la Cuenta. La interfaz no consulta el índice sensible directamente.
2. La revisión muestra nombre y apellido, correo enmascarado, Grupo de procedencia y última participación. `Ahora no` sólo cierra el detalle; `Esta ficha no es mía` persiste el rechazo por Cuenta–Persona; `Reconsiderar` es explícito.
3. Corregir, agregar o quitar correo incrementa `emailRevision` y actualiza o retira inmediatamente la proyección. Volver al correo anterior no borra el rechazo estable.
4. Sin Persona propia, reconocer adopta en una única transacción: revalida correo, preview, revisión, custodia y exclusividad; asigna una sola Persona principal, revoca custodia administrativa, retira directorio/candidatura y conserva la localización desactivada.
5. Con Persona propia, registra `RECOGNIZED_PENDING_MERGE` sin cambiar custodia, permisos ni Persona principal. La pantalla explica que IUX-11C habilitará la fusión en otro corte.
6. `ensureMyPerson` y adopción coordinan sobre `users/{uid}.personaId` dentro de transacciones. Dos adopciones o un alta propia concurrente no dejan dos fichas principales ni efectos parciales.
7. Cada comando usa receipt determinista e idempotency key ligada al payload. Un retry exacto recupera el resultado y `operationRef` permite consultar una respuesta perdida.

## Autoridad, privacidad y configuración

- El correo acreditado proviene sólo de Firebase Auth/Admin SDK; `users.email` no habilita candidaturas.
- La búsqueda usa HMAC del correo normalizado. Candidaturas, decisiones, receipts, credenciales y límites quedan `deny-all` para clientes en Firestore Rules.
- `ENABLE_IUX11B_LINKING` controla creación/actualización de proyecciones y acceso al módulo. Los secretos HMAC y de firma se inyectan por entorno. Configuración local y secretos no se versionan.
- App Check no se incorpora en este corte porque el proyecto no aplica aún `enforceAppCheck` a sus callables v1. Es un gate transversal de habilitación productiva, no una precondición de la UAT local.
- B simple no necesita outbox: asignación, custodia, decisión, receipt y retiro de proyecciones caben en el mismo commit. La consolidación y reproyección multi-Persona pertenecen a IUX-11C.
- No se agrega TTL automático. La retención vigente de decisiones y receipts permite reconsideración, auditoría e idempotencia; una política de eliminación productiva requiere una decisión transversal posterior.

## Presupuesto medido y límites

| Operación | Medición máxima instrumentada | Presupuesto |
|---|---:|---:|
| Listado, página llena con lookahead | 1 Auth + 24 Firestore | 1 + 24 |
| Listado, página sintética de una ficha | 1 Auth + 5 Firestore | 1 + 24 |
| Detalle con temporada | 1 Auth + 9 Firestore | 1 + 9 |
| Rechazar/reconsiderar | 1 Auth + 5 Firestore | 1 + 12 |
| Reconocimiento pendiente de fusión | 1 Auth + 10 Firestore | 1 + 12 |
| Adopción simple | 1 Auth + hasta 12 Firestore | 1 + 12 |
| Recuperación de receipt | 1 Auth + 1 Firestore | 1 + 12 |

`Actualizar` reinicia cursor y consume una llamada completa. Cada página siguiente consume nuevamente Auth, dos documentos de rate limit, candidaturas y decisiones; no hay prefetch, polling ni refresh por foco. Límites persistidos: listado `30/cuenta/minuto` y ráfaga `10/cuenta/10 segundos`; detalle y decisiones `12/cuenta/minuto`; adopción nueva `6/cuenta/minuto`. El exceso devuelve `RESOURCE_EXHAUSTED` sin mutar dominio.

## Datos y backfill local

El backfill canónico versionado está restringido por código a Firestore Emulator y proyectos `demo-*`:

1. preparar externamente un fixture sintético aislado;
2. ejecutar `npm run iux-11b:backfill:inspect` y conservar el manifest fuera de Git;
3. ejecutar `npm run iux-11b:backfill:emulator` para aplicar sólo en el proyecto aislado;
4. repetir inspección y pruebas.

El seed portable exige simultáneamente Auth Emulator y Firestore Emulator sobre loopback, y un `--project demo-*` explícito consistente con toda configuración Firebase presente. No posee fallback remoto. Usa IDs reservados con prefijo `iux11b-uat-`, fecha fija y escrituras deterministas, por lo que una ejecución interrumpida puede repetirse. Crea o reemplaza exactamente 3 usuarios Auth, 3 documentos `users`, 3 Personas, 1 Grupo archivado, 1 Temporada cerrada, 2 custodias `UNLINKED` pre-backfill y 2 Membresías finalizadas. No borra colecciones ni documentos ajenos, pero reemplaza por diseño cualquier documento que ya use esos IDs reservados.

Secuencia portable, siempre sobre un proyecto demo nuevo y nunca sobre la UAT activa:

1. definir `FIREBASE_AUTH_EMULATOR_HOST` y `FIRESTORE_EMULATOR_HOST` con hosts loopback y cargar las variables ficticias de `.env.iux11b.local.example` en el proceso de Functions Emulator;
2. ejecutar `npm run iux-11b:uat:seed -- --project demo-<nombre-aislado>`;
3. ejecutar `npm run iux-11b:backfill:inspect` y revisar el manifest;
4. ejecutar `npm run iux-11b:backfill:emulator` y repetir la inspección.

Las credenciales y los registros producidos siguen siendo sintéticos; no se exportan ni se reutilizan en servicios remotos. El backfill recorre sólo custodias `UNLINKED`, omite fichas sin correo, conserva revisiones existentes y actualiza cada Persona en un batch independiente. No existe ruta habilitada para backfill remoto.

## Verificación automatizada

- TypeScript: OK.
- ESLint focal: OK. Lint baseline: OK con los `30` errores y `8` warnings conocidos; `12` hallazgos menos que el baseline.
- Sintaxis Functions: `571/571` OK.
- Unitarias focales IUX-11B: `6/6` OK.
- Guardas portables del seed UAT: `3/3` OK, sin inicializar Firebase ni escribir datos.
- Emulator IUX-11B: `1/1` OK. Cubre correo no verificado/distinto, rechazo persistente y reconsideración, Grupo archivado, Temporada cerrada, Membresía finalizada, adopción, retry/recuperación, dos aceptaciones, carrera con `ensureMyPerson`, corrección concurrente de correo, pendiente de fusión, rate limit e historia/obligaciones propias posteriores.
- Regresión Emulator IUX-11A/A.1: `1/1` OK.
- Suite unitaria general tras incorporar las guardas del seed: `501/502`; permanece el único fallo preexistente de `iux06aPresentation.test.js:41`, que exige `gridTemplateColumns` aunque la página vigente de Economía ya no contiene ese marcador. La reproducción aislada queda `2/3`, y la misma expectativa está presente en `dev@c6619d6`.
- Build Next.js técnico `BFvRmjKpGzzLGkgRh8rMf`: OK.
- `git diff --check`: OK.

## Evidencia UAT

Proyecto sintético aislado: `demo-sportexa-iux11b-uat`.

La comprobación extremo a extremo posterior al seed y backfill devolvió una candidatura por cada Cuenta y `5/24` lecturas Firestore medidas/presupuestadas en ambos listados.

La UAT usó dos Cuentas sintéticas locales: una sin Persona propia y otra con Persona previa. Correos, credenciales, nombres, IDs y procedimiento de seed permanecen fuera de Git. El recorrido acreditado fue:

1. Con la Cuenta sin Persona, revisar datos, probar `Ahora no`, rechazar, abrir `Descartadas`, reconsiderar y adoptar. Confirmar luego ficha, historia y obligaciones propias; la localización permanece desactivada.
2. Con la Cuenta que ya posee Persona, reconocer la ficha y confirmar el texto de fusión futura, la Persona principal sin cambios y la ficha en `Pendientes de fusión`.
3. Usar `Actualizar` y paginación para comprobar que no hay actualización automática. Repetir una acción tras simular respuesta perdida para verificar recuperación idempotente.

## Aprobación y exclusiones

La aprobación humana es funcional y corresponde al build UAT registrado. Los ajustes visuales quedaron expresamente diferidos. Las pruebas automatizadas acreditan invariantes y regresiones, pero no se reinterpretan como aprobación visual.

IUX-11C, correo externo y habilitación productiva siguen fuera de alcance. No hubo despliegue ni backfill remoto. `visuals/`, configuración local, secretos, datos sintéticos, builds, logs, manifests y exportaciones permanecen fuera de Git; los datos UAT existentes se conservan.
