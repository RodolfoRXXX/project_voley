# E3-10 — Informe de implementación local del retiro de economía legacy de Torneos

**Estado:** IMPLEMENTACIÓN LOCAL COMPLETADA — PENDIENTE DE REVISIÓN, UAT Y ROLLOUT AUTORIZADO

**Base normativa:** D5-057, DEC-E3-10, addendum E3-10 a Documentos 2/3/4 y ficha E3-10

**Rama local:** `feat/e3-10-retire-tournament-payment-legacy`

**Base:** `aba2fb9ddefd4223a6af4685ca1f3bdf736a7e33`

Este informe registra evidencia técnica local. No acredita aceptación humana, despliegue, reconciliación remota, retiro efectivo en producción, cierre de E3-10, cierre del gate económico residual ni cierre de Etapa 3.

## 1. Resultado implementado

Se retiró la autoridad y funcionalidad económica legacy de las superficies productivas de Torneos, inscripciones y equipos, sin vincularlas con Pago, sin generar economía retroactiva y sin modificar las reglas deportivas más allá de las rutas afectadas.

- La UI, los modelos de presentación, adapters, tipos, cálculos, readers, writers y gates activos ya no presentan ni operan `paymentForPlayer`, `settings.paymentPerPlayer`, `paymentStatus`, `paidAmountInput`, `paidAmount`, `expectedAmount` ni `pendingAmount` en los recorridos alcanzados.
- Los documentos nuevos de torneo, inscripción y equipo omiten los campos económicos retirados.
- Las ediciones deportivas de torneo actualizan granularmente claves deportivas de `settings`; no reemplazan el mapa y preservan `settings.paymentPerPlayer` histórico.
- Las ediciones de roster escriben exclusivamente `playerIds`, `teamMembersCount` y `updatedAt`. Rules admite ese subconjunto deportivo y rechaza alteraciones económicas.
- La revisión de inscripciones preserva campos económicos históricos y crea el equipo aceptado sin economía.
- Los triggers compartidos conservan sus ramas deportivas y dejaron de crear, reactivar, resolver o consumir alertas económicas legacy.
- Las alertas económicas históricas se excluyen de las superficies activas, sin ocultar ni alterar alertas deportivas.

## 2. Contratos y precedencias

### 2.1 Callables mixtos

`createTournament`, la edición de torneo y `reviewTournamentRegistration` rechazan el request completo cuando detectan la presencia de un campo económico retirado, incluso si su valor es `undefined`, `null`, cero, cadena vacía, `false` o un valor válido históricamente. No se ejecuta parcialmente ningún efecto deportivo.

Los campos se informan en orden canónico estable:

- Torneo: `paymentForPlayer`, `settings.paymentPerPlayer`.
- Revisión de inscripción: `paymentStatus`, `paidAmountInput`.

El error contractual es `failed-precondition`, mensaje `La gestión económica de Torneos fue retirada`, `details.code = TOURNAMENT_ECONOMY_RETIRED` y `details.fields` con los campos presentes.

La precedencia aplicada es: autenticación, autorización global cuando corresponde, resolución/autorización del recurso en operaciones ligadas a uno existente, detección económica y luego validaciones deportivas restantes. Por ello un actor no autorizado no obtiene el diagnóstico económico y un request económico autorizado no alcanza writers deportivos.

### 2.2 Tombstone

`updateTournamentRegistrationPayment` permanece exportado por compatibilidad. Ejecuta autenticación, autorización y resolución mínima de inscripción/torneo; después termina siempre con `failed-precondition`, mensaje `La gestión económica de inscripciones de Torneo fue retirada` y `details.code = TOURNAMENT_REGISTRATION_PAYMENT_RETIRED`.

El tombstone no interpreta el monto, no abre transacciones y no realiza escrituras ni efectos laterales. Se preserva así el endpoint sin simular éxito para clientes antiguos.

## 3. Preservación histórica y ausencia de nueva economía

La comprobación antes/después cubrió los campos económicos legacy del torneo —incluidos los anidados en `settings`—, la inscripción y el equipo. Las operaciones deportivas pudieron modificar legítimamente roster, estado y timestamps, pero no crearon, modificaron ni eliminaron economía histórica.

Además se tomaron snapshots de las raíces económicas E3 y de sus subcolecciones pertinentes antes y después de los recorridos focales. No hubo creaciones, modificaciones ni eliminaciones. Esta evidencia usa exclusivamente datos sintéticos en un proyecto Emulator `demo-*`; no inspecciona ni caracteriza datos remotos.

## 4. Reconciliación operativa de alertas

Se agregó una herramienta separada y no exportada por Functions: `src/scripts/reconcileTournamentPaymentAlerts.js`, respaldada por `tournamentPaymentAlertReconciliationService.js`.

Propiedades verificadas:

- selección obligatoria y explícita de entorno y proyecto;
- modo `inspect` sin escrituras y modo `apply` separado;
- procesamiento por lotes, cursor persistido en manifest local y reanudación;
- transición exclusiva de alertas económicas activas a `resolved`;
- alertas económicas ya resueltas como no-op;
- alertas deportivas intactas;
- repetición idempotente;
- registro de progreso y fallo reanudable;
- exigencia de `FIRESTORE_EMULATOR_HOST` para Emulator y confirmación adicional para un apply de producción.

La herramienta no está conectada al arranque, callables, triggers ni frontend. No fue ejecutada contra Firebase remoto.

Comando operativo disponible:

```text
npm --prefix volley-ranking-system/functions run e3-10:alerts:reconcile -- --environment=<emulator|production> --project=<project-id> --mode=<inspect|apply> --manifest=<ruta> [--batch-size=<1..400>] [--max-batches=<n>] [--confirm-rollout]
```

`--confirm-rollout` sólo habilita técnicamente el modo solicitado; no sustituye la autorización de rollout.

## 5. Inventario de cambios

### Frontend

- formularios de alta/edición y detalle administrativo de torneo;
- tarjetas, listas y detalle de inscripción/equipo;
- modal de revisión de inscripción;
- adapters, mutations, view models y tipos de Torneos;
- filtrado de alertas económicas históricas fuera del dashboard activo.

### Backend y seguridad

- callables de alta, edición/revisión y tombstone;
- servicios de torneo, inscripción y alertas pendientes;
- detector contractual central de economía retirada;
- Firestore Rules para actualizaciones deportivas granulares de roster;
- reconciliador y CLI operativa separados.

### Evidencia automatizada

- caracterización deportiva acotada actualizada;
- unitarias de presencia, errores, arquitectura, Rules y preservación granular;
- suite Emulator focal de contratos, autorización, atomicidad, historia, snapshots económicos y reconciliación;
- runner focal `E3_10_FOCAL=1`, sin alterar el recorrido UAT existente.

## 6. Verificación local

| Verificación | Resultado local |
|---|---|
| Preflight de rama/base/árbol/índice/stashes/upstream | Conforme antes de implementar |
| Sintaxis Functions | PASS — 453/453 archivos JavaScript |
| TypeScript | PASS |
| Unitarias Functions | PASS — 409/409 |
| Emulator demo aislado | PASS inicial — 16/16; PASS focal de cierre de faltantes — 19/19 |
| Unitaria focal de cierre de faltantes | PASS — 5/5 |
| Rules y configuración afectada | PASS mediante Emulator demo aislado |
| Regresión deportiva acotada | PASS: inscripción, aceptación/equipo, roster, cierre, fixture, inicio y resultado alcanzados |
| Lint baseline | PASS — 31 errores y 9 warnings conocidos; 10 hallazgos resueltos respecto del baseline |
| Build frontend | PASS — compilación, TypeScript y 22 páginas estáticas |
| `git diff --check` | Debe registrarse en el checkpoint final tras incorporar este informe |

El build emitió únicamente el aviso informativo de que la base local de Browserslist tiene nueve meses; no produjo un fallo ni requirió cambiar dependencias.

### Correspondencia final entre criterios y evidencia existente

La revisión inicial contrastó los requisitos de la ficha §13.1 y del addendum §4.1 con la evidencia existente. La autorización posterior completó exclusivamente los seis faltantes mediante la prueba unitaria focal y `tournamentEconomyRetirementE3.test.js`, reutilizando `priorityAssetCharacterization.test.js`, el Emulator demo aislado y los fixtures sintéticos existentes.

| Criterio técnico | Evidencia existente | Estado de evidencia |
|---|---|---|
| 1. Cero readers/writers económicos productivos fuera de excepciones | La unitaria `E3-10 retira economía de fuentes productivas salvo detectores contractuales` recorre frontend y Functions y mantiene una allowlist explícita. | Cubierto. |
| 2. Callables mixtos: ausencia, toda presencia, orden y precedencias | La unitaria prueba por campo presencia propia con `undefined`, `null`, cero y otros valores, múltiples campos, orden canónico y ausencia. Emulator recorre por callable cada campo serializable con `null`, cero y otros valores, múltiples campos y orden; además comprueba no autenticado/no autorizado antes del retiro en alta, edición y review. | Cubierto. |
| 3. Rechazo económico sin efectos deportivos parciales | Emulator compara cantidad/documentos antes/después en alta, edición y review para toda la matriz y confirma que review rechazado no crea equipo. | Cubierto. |
| 4. Documentos deportivos nuevos omiten economía | Emulator comprueba torneo, inscripción y equipo nuevos mediante proyección económica vacía. | Cubierto. |
| 5. Rules permiten roster y rechazan agregar/modificar/eliminar economía | Emulator permite roster y, para cada campo de `ECONOMIC_FIELDS`, rechaza alta, modificación y eliminación tanto en `tournamentRegistrations` como en `tournamentTeams`; la unitaria confirma allowlists granulares. | Cubierto. |
| 6. Aceptación/rechazo y `acceptedTeamsCount` conservan deporte sin economía | Emulator cubre aceptación, creación del equipo sin economía, rechazo de una inscripción pendiente, invariancia de `acceptedTeamsCount` en ese rechazo y cierre posterior con equipos aceptados. | Cubierto. |
| 7. Tombstone: Auth, autorización, error exacto y cero efectos | Emulator cubre no autenticado, no autorizado, actor autorizado y monto omitido/`null`/cero/otros; compara el documento antes/después. La unitaria verifica que no hay writer/transacción. | Cubierto. |
| 8. Triggers conservan deporte y no crean/reactivan economía | Emulator ejecuta el trigger de equipo mediante una mutación deportiva, observa actualización de la alerta de roster, preserva exactamente una alerta económica histórica `resolved` y comprueba alertas deportivas activas de aceptación y rechazo. | Cubierto. |
| 9. Reconciliador idempotente, reanudable y aislado | Además de la cobertura del servicio, Emulator ejecuta el CLI real en `inspect` y `apply`, persiste manifest, corta con `max-batches`, reanuda, repite sin nuevas resoluciones y recupera un cursor inválido inyectado conservando `failed: 1`; las alertas deportivas permanecen idénticas. | Cubierto. |
| 10. UI sin economía ni equivalencias “gratis/pagado” | La búsqueda estática sobre alta/edición/lista/detalle/modal/ayuda no encontró `gratis`, `pagado`, `precio`, `importe`, `costo` ni identificadores económicos; typecheck y build aprobaron. | Cubierto como evidencia estática; observación visual reservada a UAT. |
| 11. Economía histórica idéntica antes/después de deporte legítimo | Emulator compara proyección del torneo, inscripción y equipo, incluido `settings.paymentPerPlayer`, mientras cambian descripción/configuración o roster. El equipo se siembra con todos los campos legacy antes de editarlo mediante Rules. | Cubierto. |
| 12. Snapshots de raíces económicas E3 sin cambios | Emulator toma snapshots de raíces y subcolecciones económicas antes/después y exige igualdad exacta. | Cubierto. |
| 13. Gates generales y regresión deportiva focal | Se preservan los gates generales verdes. La evidencia focal adicional aprueba 5/5 unitarias y 19/19 casos Emulator, y ejercita alta, edición, apertura, solicitud, roster, aceptación, rechazo, conteo, alertas, cierre, fixture y resultado. | Cubierto sin ampliar al resto de Torneos. |

### Cierre de los seis faltantes técnicos de evidencia

La autorización específica se usó sólo para completar evidencia focal, sin cambiar contratos ni comportamiento productivo:

1. matriz completa y precedencias de callables: cubierta;
2. Rules sobre inscripción/equipo y alta/modificación/eliminación de cada campo: cubierta;
3. rechazo, `acceptedTeamsCount` y alertas de aceptación/rechazo: cubierto;
4. trigger deportivo sin reactivación económica: cubierto;
5. roster de equipo con historia económica preservada campo a campo: cubierto;
6. CLI real con manifest, interrupción/reanudación, repetición y fallo inyectado recuperable: cubierto.

**Faltantes técnicos locales obligatorios sin evidencia después de esta ejecución:** ninguno identificado contra la ficha §13.1 y el addendum §4.1.

Esta conclusión se limita a evidencia técnica local. No declara el checkpoint formalmente cerrado, no sustituye UAT y no habilita producción.

### Terminología contractual de campos retirados

- **Propiedad omitida:** el request es deportivo respecto de E3-10 y puede continuar hacia sus validaciones y efectos deportivos normales. No equivale a enviar `null` ni a declarar el torneo “gratis”.
- **Propiedad presente:** si el objeto posee la propiedad retirada, se rechaza el request completo aunque su valor sea `undefined`, `null`, cero, cadena vacía, `false` u otro valor.
- En transporte callable, una propiedad con `undefined` normalmente no sobrevive la serialización. Su semántica se verifica en la prueba unitaria mediante propiedad propia; la omisión real y los valores serializables se verifican en Emulator.

La evidencia ya existente distingue ambos casos: los helpers devuelven lista vacía para `{}` y `settings: {}`, detectan todos los valores cuando la propiedad existe, y los recorridos Emulator sin campos completan alta, edición y review. No se repitieron pruebas para esta revisión.

### Fallos encontrados y correctivos

- Una aserción unitaria inicial buscaba referencias legacy con un alcance excesivo e incluía los detectores contractuales permitidos. Se restringió a autoridades productivas; la suite final pasó completa.
- La primera ejecución Emulator no incluía la lista `admins` requerida por la autorización real del fixture. Se corrigió sólo el dato sintético; la segunda ejecución aislada pasó 16/16.
- Durante el cierre de faltantes, la primera corrida focal falló porque una aserción antigua exigía cero documentos de alerta económica mientras el nuevo fixture había sembrado deliberadamente una alerta histórica `resolved`. Se corrigió la aserción para exigir cero alertas económicas activas y preservación de las históricas; las corridas posteriores pasaron 19/19.
- El caso CLI de error usa deliberadamente un manifest con cursor incompleto. Ese único proceso termina con código 1 por inyección controlada, persiste `failed: 1` y `lastError`, y luego reanuda con éxito al reparar el cursor. No se observó ningún fallo espontáneo del CLI.

No fue necesario aplicar correctivos productivos.

No se identificó una contradicción funcional entre implementación y D5-057/DEC/addendum/ficha.

## 7. Límites y asuntos que permanecen abiertos

- La prueba fue local y sintética. No hubo acceso a Firebase remoto, deploy, inspección real ni reconciliación real.
- No se determinó la población de clientes externos antiguos. El tombstone cubre compatibilidad del callable dedicado; los callables mixtos son deliberadamente incompatibles cuando esos clientes envían campos retirados.
- No se realizó UAT ni aceptación humana.
- No se amplió la regresión a una revalidación integral de Torneos.
- Permanecen sin cambios los pendientes de E3-09, D5-044, D5-045 y Auth/UAT aislada.
- Etapa 3 y su gate económico residual permanecen abiertos.

## 8. Rollback

Antes de rollout, el rollback consiste en descartar o revertir coordinadamente este conjunto local de frontend, Functions y Rules; no requiere migración de datos porque la implementación no reescribe economía histórica.

Después de un rollout, cualquier rollback debe mantener alineados frontend, Functions y Rules. Rehabilitar writers económicos o conectar Torneos con Pago queda fuera de alcance y requeriría una decisión normativa nueva. Si la reconciliación ya cambió alertas a `resolved`, no debe deshacerse masivamente: el manifest y la evidencia del lote deben revisarse, y toda restauración puntual necesita autorización específica para evitar reactivar alertas deportivas o recrear autoridad económica.

## 9. Guía breve de UAT pendiente

**Estado:** NO EJECUTADA — NO APROBADA — DIFERIDA HASTA HABILITAR EL RECORRIDO.

El usuario no pudo ejecutar la UAT porque los controles de creación y gestión de Torneos no están disponibles en el frontend actual. La existencia de rutas y componentes en el código no demuestra accesibilidad real desde la interfaz: la afirmación anterior de que los recorridos estaban disponibles y conectados queda corregida. E3-10 no investiga ni reconstruye la navegación necesaria para habilitarlos.

La URL base prevista para una futura UAT local autorizada continúa siendo `http://localhost:3000`, sujeta al ambiente que se designe. Los pasos siguientes se conservan como guion de aceptación, pero actualmente son **NO EJECUTABLES/DIFERIDOS** desde la interfaz. La UAT humana aprobada sigue siendo requisito previo a la habilitación productiva y permanece separada de la inspección remota, la reconciliación, la compatibilidad de clientes antiguos, el despliegue y la decisión final de rollout.

### Perfiles y datos previos

- **Perfil A — administrador de Torneo:** cuenta autenticada con rol global `admin`, autorizada para crear Torneos y owner/admin del Torneo creado.
- **Perfil B — administrador de Grupos:** cuenta autenticada con rol global `admin`, administradora de dos Grupos distintos, cada uno con integrantes suficientes para el mínimo del Torneo. No debe ser admin del Torneo.
- El Torneo debe permanecer en estado editable; después del alta, Perfil A debe abrir inscripciones mediante la acción deportiva existente.

Se requieren dos Grupos de Perfil B para observar aceptación y rechazo sin reutilizar una misma inscripción.

### Pasos humanos preparados, actualmente no ejecutables

1. **Crear Torneo — Perfil A**

   Abrir `http://localhost:3000/admin/tournaments/new`. Completar únicamente configuración deportiva y crear. Verificar que no existe precio, importe, estado de pago, texto “gratis/pagado” ni control económico.

2. **Editar y abrir inscripciones — Perfil A**

   En la redirección `http://localhost:3000/admin/tournaments/<tournamentId>`, usar **Editar**, cambiar un dato deportivo y guardar. Confirmar nuevamente ausencia de economía y abrir inscripciones con la acción existente.

3. **Solicitar dos inscripciones — Perfil B**

   Abrir `http://localhost:3000/tournaments`, localizar el Torneo y usar **Inscribirme** dos veces, eligiendo un Grupo distinto en cada solicitud. Confirmar que el modal sólo solicita Grupo y nombre del equipo, sin importe ni estado económico.

4. **Editar roster pendiente — Perfil B**

   Abrir `http://localhost:3000/profile/tournaments`, entrar a cada inscripción y verificar la ruta `http://localhost:3000/profile/tournaments/registrations/<registrationId>`. Agregar/quitar jugadores dentro de mínimo/máximo. Confirmar que se muestran sólo integrantes, conteo y alertas deportivas de roster; no importes, badges ni alertas económicas.

5. **Aceptar una y rechazar otra — Perfil A**

   Volver a `http://localhost:3000/admin/tournaments/<tournamentId>`. En **Equipos inscriptos**, abrir **Ver estado**: aceptar la primera solicitud y rechazar la segunda. Confirmar que la decisión usa únicamente estado y reglas deportivas visibles, sin condición o control económico.

6. **Comprobar resultados deportivos — Perfiles A y B**

   Perfil A verifica las pestañas **Aceptados** y **Rechazados**. Perfil B vuelve a `http://localhost:3000/profile/tournaments`; abre el aceptado en `http://localhost:3000/profile/tournaments/teams/<teamId>` y comprueba roster/estado. Revisar dashboard y detalles alcanzados: las alertas deportivas de aceptación, rechazo o jugadores faltantes deben conservarse cuando correspondan; no debe aparecer ninguna alerta, importe, contador, acción o equivalencia económica.

7. **Registrar evidencia humana**

   Anotar URL real, IDs sintéticos, perfiles usados, resultado por paso y capturas de las superficies afectadas. Cualquier ruta ausente, control inaccesible o requisito de datos no disponible deja el paso `NO EJECUTABLE/DIFERIDO`; nunca se presume aprobado.

La aprobación UAT es humana y no puede inferirse de pruebas automatizadas, build, inspección estática o disponibilidad de rutas. Debe ejecutarse en un ambiente autorizado y separado de la sesión Auth/UAT preservada.

## 10. Requisitos de rollout y separación de cierres

La implementación local puede revisarse, versionarse e integrarse sin acceso remoto. La inspección de datos remotos, la reconciliación real y el tratamiento de clientes antiguos son actividades exclusivas del rollout y no requisitos retroactivos para comenzar o evaluar el corte local.

Para habilitación productiva siguen siendo necesarios, con autorización separada:

1. decisión explícita sobre el tratamiento y comunicación a consumidores externos antiguos, sin exigir una búsqueda indefinida;
2. inspección remota en modo sin escrituras y registro del volumen/cursor de alertas alcanzadas;
3. UAT humana aprobada sobre las rutas afectadas;
4. plan coordinado de despliegue de frontend, Functions y Rules, con observabilidad y rollback;
5. ejecución autorizada, por lotes, de la reconciliación real y verificación posterior;
6. decisión de habilitación del recorrido a usuarios.

Conforme a la decisión propia de E3-10, la suficiencia técnica local y la habilitación productiva son checkpoints distintos. Este informe aporta evidencia para revisar el primero, pero no lo declara formalmente cerrado y no extiende la excepción D5-056. UAT, rollout y retiro efectivo desplegado continúan pendientes.
