# E2-22A — Informe de implementación

## Estado y alcance

- Rama: `feat/e2-22a-membership-descriptive-position`.
- HEAD base de implementación y UAT: `5af9604235ee8556d551b37f49f8b01f340933ae`.
- Alcance: cargo descriptivo opcional de Membresía, exclusivo de superficies Owner aprobadas.
- El informe acompaña el versionado e integración; no crea cierre formal ni deploy.
- La ficha E2-22 y su addendum E2-22A permanecieron intactos.

## Implementación y auditoría

La implementación incorpora schemas cerrados v5/v6, normalización NFC y whitespace, límite de 80 puntos de código, remoción mediante `null` con ausencia física, DTO Owner mínimo, token de edición, transacción, receipt cerrado e idempotencia. Las altas ordinarias producen v5; la renovación intertemporada produce una raíz v6 nueva sin cargo. Finalización y reactivación conservan el cargo de la raíz, mientras que consultas propias, historia, Solicitudes y superficies no Owner no lo exponen.

La auditoría adversarial previa corrigió schemas cerrados, retry con intención fija, aislamiento del contexto de Grupo, foco y mensajes públicos. Su conclusión fue `E2-22A LISTO PARA UAT MANUAL`.

Durante la UAT se detectó un defecto funcional adicional: si la pérdida de ownership era descubierta por el comando de cargo, el componente retiraba roster y diálogo pero dejaba montado el resto del detalle Owner-scoped y mostraba dos errores. `ActiveGroupMembersSection` ahora propaga `GROUP_NOT_ACCESSIBLE` a un callback único y estable de la página. La página limpia el Grupo completo y navega a `/dashboard/groups`. El retest manual confirmó el retiro integral.

## Evidencia automatizada

Resultados heredados posteriores a la auditoría:

- unitarias completas: `344/344`;
- focales E2-22A: `7/7`;
- Emulator focal: aprobado;
- TypeScript, lint baseline, build y diff: aprobados.

Gates ejecutados después de la corrección surgida en UAT:

- unidad focal E2-22A: `7/7`;
- TypeScript: aprobado;
- lint baseline: aprobado, `36` errores y `9` warnings conocidos, con `9` hallazgos resueltos respecto del baseline;
- build de producción: aprobado, exit `0`;
- `git diff --check`: aprobado; sólo avisos de conversión LF/CRLF.

Gate integral final previo al versionado:

- lint baseline: aprobado, `36` errores y `9` warnings conocidos, con `9` hallazgos resueltos respecto del baseline;
- TypeScript: aprobado;
- sintaxis Functions: `308/308`;
- unitarias: `344/344`;
- Emulator completo, secuencial y sobre proyecto sintético aislado: `217/217`;
- build de producción y `git diff --check`: aprobados.

La primera corrida integral detectó dos pruebas de arquitectura desactualizadas por el callback compartido introducido durante la corrección UAT: E2-20 todavía exigía la forma inline anterior y E2-12 no contemplaba el corte inmediato ante `GROUP_NOT_ACCESSIBLE`. Se actualizaron para exigir el callback estable, la limpieza integral y su uso compartido por edición de nombre, roster, finalización y cargo. No cambió comportamiento visible; la repetición completa quedó verde.

## UAT manual local

### Entorno

- Proyecto sintético: `demo-sportexa-e2-22a-uat`.
- Frontend: `http://127.0.0.1:3000`.
- Emulator UI: `http://127.0.0.1:4000`.
- Auth, Firestore y Functions de la aplicación: loopback `9099`, `8080` y `5001`.
- Owner: `owner.e222a.uat@example.test`.
- Integrante: `member.e222a.uat@example.test`.
- Owner alternativo: `next-owner.e222a.uat@example.test`.
- Grupos: `e2-22a-uat-group-a` y `e2-22a-uat-group-b`.

La preparación utilizó un helper temporal de Admin SDK obligado al project ID `demo-*` y hosts Emulator. No se relajaron Rules ni se modificaron datos locales ajenos. Se detectaron y corrigieron durante la preparación tres defectos del fixture: IDs no canónicos de active guards, cronología inválida de una Temporada histórica y una raíz v5 finalizada sin metadata/período ni lifecycle correlacionado. Estos incidentes no se atribuyen al producto; cada escenario afectado se repitió satisfactoriamente.

La aplicación utilizó exclusivamente Auth, Firestore y Functions Emulator. Al iniciar la CLI sin el proxy bloqueante del runner, Firebase CLI realizó una consulta auxiliar de configuración pública/MOTD y materializó sus credenciales locales para el proceso de Functions. El proyecto `demo-*` impidió acceso a servicios no emulados y no hubo lectura, escritura, deploy ni operación sobre un proyecto Firebase remoto. Esta desviación ambiental se consigna y no se presenta como aislamiento de red absoluto.

### Matriz observada

| Escenario | Resultado | Evidencia |
| --- | --- | --- |
| Acceso Owner, dos Grupos y aislamiento de contexto | `OK` | Roster correcto en cada Grupo; ningún dato o diálogo del contexto anterior durante navegación rápida. |
| Reemplazo, normalización y recarga | `OK` | `  Coordinador   técnico  ` mostró `19/80`, persistió como `Coordinador técnico` y reapareció tras recarga. |
| Doble activación | `OK` | Bloqueo inmediato en `Guardando…`; una sola escritura para esa decisión. |
| No-op, Cancelar y Escape | `OK` | Sin cambio ni receipt; retorno de foco al disparador. |
| Enter, Tab, Shift+Tab y foco | `OK` | Enter confirmó; trap recorrió sólo controles del diálogo; foco inicial y de retorno correctos. |
| Límites y validación | `OK` | Vacío y `81/80` fueron rechazados en el campo sin cerrar el diálogo. |
| Quitar cargo | `OK` | UI mostró `Sin cargo`; recarga estable; campo físicamente ausente. |
| Asignar desde ausencia | `OK` | `Enlace del equipo` confirmado mediante Enter y persistido tras recarga. |
| Finalización y reactivación | `OK` | Misma raíz; cargo conservado; períodos 1 cerrado y 2 abierto tras reactivación. |
| Renovación | `OK` | Nueva raíz v6 con lineage a la predecesora y ausencia física de cargo; la predecesora conservó su cargo histórico. |
| Privacidad no Owner | `OK` | Mara no vio `Enlace del equipo`, `Capitán histórico`, roster ni diálogo Owner-scoped. |
| Stale entre dos pestañas | `OK` | Valor obsoleto no se aplicó ni produjo receipt; ambas pestañas convergieron al valor autoritativo. |
| Pérdida de ownership, primera ejecución | `FALLÓ` | Se retiraron cargo/roster, pero quedó visible el resto del detalle Owner-scoped y hubo mensajes duplicados. |
| Pérdida de ownership, retest corregido | `OK` | Se retiró todo el detalle, navegó a `/dashboard/groups`, el Grupo desapareció y hubo cero escritura. |
| Temporada cerrada | `OK` | Finalizaciones y cierre mediante operaciones normales; tras recarga no hubo roster ni controles de edición. |
| Móvil 360 px y zoom 200% | `OK` | Reflow, scroll, campo, contador, botones y teclado utilizables; sin corte horizontal. |
| Retry de error recuperable espontáneo | `NO EJECUTADO` | No ocurrió un error recuperable espontáneo; no se fabricó pérdida de respuesta. |
| Anuncios con lector de pantalla | `NO EJECUTADO` | No se usó tecnología asistiva; no se infiere anuncio hablado desde `aria-live`. |

### Inspección persistente

- La secuencia asignar/reemplazar/quitar produjo un receipt por cada decisión confirmada.
- No-op, Cancelar, Escape, validaciones, stale y pérdida de ownership produjeron cero receipts.
- La remoción dejó ausencia física de `cargo`.
- El cargo final de la raíz A fue `Responsable de cancha` y se conservó tras reactivación, nueva finalización y cierre de Temporada.
- La renovación B creó una raíz distinta v6, `previousMembershipId` correcto, un período abierto y ningún campo `cargo`.
- La raíz predecesora B conservó `Capitán histórico` como estado histórico, sin copiarlo a la sucesora.
- La finalización final dejó los active guards de A ausentes y lifecycle guards finalizados correlacionados.

Durante la preparación de stale se confirmaron tres decisiones humanas (`Responsable de cancha`, `Responsable de canchas`, `Responsable de cancha`), por lo que el total final fue de seis receipts. El intento stale `No debe sobrescribir` y los dos intentos sin ownership no aparecen entre ellos.

## Clasificación y límites

- UAT manual: interacción visible, navegación, edición, teclado/foco, single-flight, stale, privacidad, lifecycle normal, ownership, cierre y responsive.
- Inspección persistente: forma de raíces, ausencia física, períodos, lineage, guards y cardinalidad de receipts.
- Automatización/Emulator: carreras deterministas, pérdida de respuesta, corrupción, manipulación de tokens, Rules, atomicidad y recovery técnico.
- No ejecutado manualmente: lector de pantalla real y retry recuperable espontáneo.

No se simularon UAT de corrupción, carreras transaccionales, pérdida de respuesta ni manipulación de tokens.

## Estado documental

La UAT manual queda aprobada con la corrección y el retest indicados. Este informe no constituye cierre formal ni deploy.
