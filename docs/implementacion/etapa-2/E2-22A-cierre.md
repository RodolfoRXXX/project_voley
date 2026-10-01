# E2-22A — Cierre formal del cargo descriptivo de Membresía

## Estado

- Incremento: `E2-22A`.
- Caso de uso: `CU-026 — Editar una Membresía`, cubierto parcialmente sólo para cargo descriptivo.
- Estado documental: `CERRADO`.
- Implementación: `ccfeff2320bebdcb5f7ae9fc726e46b1139a2aaa`.
- Merge no fast-forward de implementación en `dev`: `48735fb295bddd33fb66476f273e1133ae0a806f`.
- Padres del merge: `5af9604235ee8556d551b37f49f8b01f340933ae` y `ccfeff2320bebdcb5f7ae9fc726e46b1139a2aaa`.
- Deploy: no realizado.
- Firebase remoto: no accedido.

## Fuentes y trazabilidad

Este cierre se contrastó con:

- [`E2-22-ficha-edicion-atributos-membresia.md`](./E2-22-ficha-edicion-atributos-membresia.md), ficha implementable E2-22A;
- [`Documento-2-addendum-E2-22A-cargo-descriptivo-membresia.md`](../../arquitectura/Documento-2-addendum-E2-22A-cargo-descriptivo-membresia.md), decisión funcional aprobada;
- [`E2-22A-informe-implementacion.md`](./E2-22A-informe-implementacion.md), auditoría, implementación, gates, UAT e inspección persistente;
- [`Documento 5 - Plan de Implementación y Transición Técnica-borrador.md`](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md), especialmente §§3.6, 3.10–3.13, 5.14–5.17, 7.4, 9 y D5-024/025/026/033/034/035/041;
- los cierres E2-18, E2-19 y E2-20 como estructura documental vigente;
- el historial Git de la definición, la implementación y su integración.

Los objetos Git integrados son `335f33884ddfd8d4eea356451dce4085cb2b31e7` para la ficha, `551c79c1fa4b19bda0aa82ab8f0f6b5c3b0cd7e1` para el addendum y `fd3c9d1df596c6b6f0780f6557922becd0855b90` para el informe. El commit técnico tiene como padre único `5af9604235ee8556d551b37f49f8b01f340933ae`; el merge lo incorpora como segundo padre sobre la misma base.

## Objetivo y alcance cerrado

E2-22A permite que el Owner vigente asigne, reemplace o quite un único cargo opcional de una Membresía activa de su Grupo mientras su Temporada exacta permanezca abierta. El valor se normaliza, admite de 1 a 80 puntos de código y se remueve mediante `null`, persistiendo ausencia física.

El cargo es exclusivamente descriptivo. No concede ownership, rol, permiso, elegibilidad ni capacidad legacy; no existe catálogo, valor por defecto, perfil asociado ni inferencia por igualdad textual. La operación no edita identidad, referencias, estado, fechas, Períodos de Vigencia, lineage ni otros Agregados.

Este alcance constituye cobertura parcial de CU-026. No declara agotado ese caso de uso ni convierte los candidatos B–D de la división original en incrementos obligatorios.

## Autorización, privacidad y contratos

Preparación, confirmación y recovery exigen autenticación, Cuenta compatible, ownership vigente, pertenencia exacta de la raíz al Grupo, schema compatible y reautorización contextual. La confirmación exige además Membresía activa y Temporada abierta. Administradores, integrantes, roles globales, Plan, arrays legacy, el propio cargo o conocer IDs no autorizan.

El cargo sólo se expone al Owner vigente en el roster administrativo y el detalle mínimo de edición. No aparece en consultas propias generales, historial, Solicitudes, DTO de integrante ni superficies públicas. La pérdida de ownership retira el detalle Owner-scoped completo y navega fuera del Grupo, sin enumerar objetivos ajenos.

Los contratos específicos son `getMembershipCargoForOwnedGroup` y `updateMembershipCargoForOwnedGroup`. La edición usa token opaco ligado al contexto editable, transacción, single-flight e idempotency key estable. `NO_CHANGES` no escribe, no crea receipt y no consume la clave; `UPDATED` persiste el efecto y un receipt cerrado. Los receipts se retienen indefinidamente: E2-22A no define TTL, expiración ni borrado.

Recovery reautoriza el estado actual antes de leer o devolver datos privados, recupera el efecto histórico confirmado sin reescribir y lo distingue del estado actual. Una finalización, cierre, transferencia, reactivación u otra edición posterior no restaura valores anteriores ni convierte el receipt en historial funcional.

## Schemas y ciclo de vida

Los schemas v1–v4 continúan legibles y cerrados. v5 representa la familia sin lineage con cargo opcional, incluida la variante legacy activa sin metadata temporal y las variantes period-aware exactas. v6 representa la familia con lineage y cargo opcional. Campos extra, `cargo: null` persistido, valores no canónicos y combinaciones temporales inválidas fallan cerrados.

Editar una raíz v1 activa la lleva a v5 legacy sin fabricar Períodos; v3 activa pasa a v5 period-aware; v4 activa pasa a v6; v5/v6 conservan su variante. La edición nunca crea, elimina ni reescribe Períodos, `latestPeriodId`, `periodCount`, `previousMembershipId` o metadata histórica.

Las altas ordinarias nuevas nacen v5 period-aware sin cargo. Finalizar conserva el último cargo de la misma raíz; la adaptación de una v5 legacy materializa el primer Período exclusivamente como parte de la finalización. Reactivar la misma raíz conserva cargo y lineage existente y agrega sólo el Período propio de CU-030. Renovar crea una raíz v6 nueva con lineage y sin cargo, aunque la predecesora lo tenga.

## Auditoría, correcciones y UAT

La auditoría adversarial corrigió schemas cerrados, retry con intención fija, aislamiento del contexto de Grupo, foco y mensajes públicos. Durante UAT se detectó que una pérdida de ownership descubierta desde cargo retiraba roster y diálogo, pero dejaba visible el resto del detalle Owner-scoped y duplicaba errores. La corrección propagó `GROUP_NOT_ACCESSIBLE` al callback estable de la página, limpió el Grupo completo y navegó a `/dashboard/groups`; el retest manual confirmó retiro integral, desaparición del Grupo y cero escrituras.

La UAT funcional aprobó asignar, reemplazar y quitar; persistencia y ausencia física; precarga, normalización, contador, límites y no-op; teclado y retorno de foco; single-flight; aislamiento entre Grupos; privacidad; stale; pérdida de ownership corregida; finalización, reactivación, renovación; Temporada cerrada; móvil y zoom. La inspección persistente confirmó raíces, Períodos, lineage, guards y receipts esperados.

Después de la UAT sólo se actualizaron dos pruebas arquitectónicas desfasadas para exigir el callback compartido y su compatibilidad con E2-20/E2-12. No cambió comportamiento visible y no fue necesario repetir UAT.

## Evidencia automatizada

La evidencia anterior, conservada en el informe, incluye unitarias `344/344`, focales E2-22A `7/7`, Emulator focal y gates frontend aprobados después de auditoría y de la corrección UAT.

### Gate integral final previo al versionado técnico

- lint baseline: aprobado (`36` errores y `9` warnings conocidos; `9` hallazgos resueltos respecto del baseline);
- TypeScript: aprobado;
- sintaxis Functions: `308/308`;
- unitarias: `344/344`;
- Emulator completo, secuencial y aislado: `217/217`;
- build de producción y `git diff --check`: aprobados.

### Verificación posterior al merge técnico

- TypeScript: aprobado;
- unitarias: `344/344`;
- Emulator focal E2-22A: `7/7`.

No se ejecutan suites para este cierre porque su único cambio es documental.

## Límites de verificación

- **Retry de error recuperable espontáneo: `NO EJECUTADO`.** No ocurrió una pérdida de respuesta durante UAT y no se fabricó. Idempotencia, respuesta perdida y recovery sí están cubiertos por pruebas automatizadas y Emulator, pero no se atribuyen como observación manual.
- **Anuncios con lector de pantalla real: `NO EJECUTADO`.** Se comprobaron teclado, foco, orden de tabulación y estados accesibles, pero no se infiere un anuncio hablado desde `aria-live` ni se declara accesibilidad integral.

Estos límites no bloquean el cierre. La ficha y Documento 5 requieren frontend integrado, accesibilidad mínima, pruebas proporcionales y evidencia honestamente clasificada; no establecen que un error recuperable deba ocurrir espontáneamente ni que una sesión con lector de pantalla real sea un gate específico de E2-22A. Ambos quedan registrados como límites y riesgos residuales, no como resultados aprobados.

## Exclusiones y pendientes

Este cierre no:

- declara agotado CU-026;
- aprueba ni implementa dorsal, posición, observaciones, rol deportivo, perfiles o permisos;
- convierte B–D en una división obligatoria;
- concede capacidades mediante el texto del cargo;
- crea timeline o snapshots históricos del cargo;
- modifica ficha, addendum, Documento 5 ni otros documentos normativos;
- realiza migración, backfill, reparación global, deploy o acceso a Firebase remoto;
- integra Auth/UAT, cierra E2-14 o Etapa 2, ni habilita E3.

Permanecen pendientes las decisiones funcionales independientes sobre dorsal, posición, observaciones y roles/perfiles/permisos. La siguiente decisión de planificación consiste en seleccionar y definir explícitamente el próximo incremento pendiente de Etapa 2 y luego repetir los gates aplicables de E2-14; este cierre no selecciona, aprueba ni inicia ese trabajo.

## Veredicto

E2-22A satisface su ficha, el addendum aprobado, la auditoría, los gates técnicos, la UAT funcional con retest y la inspección persistente. El alcance queda cerrado exclusivamente para el cargo descriptivo y CU-026 conserva cobertura parcial.

`E2-22A CERRADO — CU-026 CON COBERTURA PARCIAL — E2-14 Y ETAPA 2 ABIERTAS`
