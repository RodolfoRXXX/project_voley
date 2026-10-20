# E3-07 — Cierre de condonación y reversión de condonación de deuda válida

Fecha de cierre documental: 2026-10-20

Etapa: 3 — Economía

Incremento: E3-07

Estado: **CERRADO**

## Fuentes y trazabilidad

Este cierre aplica la estructura vigente de Documento 5 y se contrastó focalmente con:

- [Documento 5 — Plan de Implementación y Transición Técnica](<../../transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md>), en particular §§5.16–5.18, 7.5 y D5-044, D5-045 y D5-052;
- [Ficha E3-07](./E3-07-ficha-condonacion-deuda-valida.md), incluidas D01–D11, R01, R02=A y sus criterios de aceptación;
- [Addendum E3-07 a Documentos 2, 3 y 4](../../arquitectura/Documento-2-3-4-addendum-E3-07-condonacion-deuda-valida.md);
- [DEC-E3-07 / D5-052](./DEC-E3-07-condonacion-deuda-valida.md);
- [Informe único de implementación E3-07](./E3-07-informe-implementacion.md), que conserva contratos, archivos, resultados exactos, mediciones, fallos, correctivos y límites de cada confirmación humana;
- [Cierre E3-06](./E3-06-cierre.md), como antecedente de composición económica, corrección del principal, avisos y compatibilidad.

Trazabilidad Git verificada:

| Hito | Commit | Relación |
| --- | --- | --- |
| Base de implementación | `64270f1605b24f62c89b06926652953d34db756c` | `dev` antes de E3-07 |
| Implementación, pruebas e informe E3-07 | `7d915f29c8cef3be533fcd74cc8cdbf59e9eec28` | feature publicada |
| Integración en `dev` | `0fec906041e82f15f6e2fd2f5dcff675eaffc465` | merge `--no-ff`, con árbol idéntico a la feature |

El commit funcional contiene 28 archivos, 730 inserciones y 80 eliminaciones. Antes de crear este cierre se comprobó que `dev` y la feature coincidían con sus referencias remotas `0/0`, que el árbol integrado era idéntico al de la feature y que árbol, índice y stashes estaban limpios.

## Alcance efectivamente implementado

E3-07 incorpora condonación individual `PARTIAL | TOTAL`, Owner-only, sobre saldo positivo de un Pago `ACTIVE`, y reversión completa, única y trazable de un hecho individual de condonación registrado por error. Ambos hechos son no monetarios, pertenecen a Pago y se conservan en historia append-only; no crean otro Agregado, Ingreso, Recepción, devolución o Caja.

`TOTAL` conserva el importe, saldo y revisión confirmados y no absorbe cambios posteriores. Una reversión reduce la condonación vigente y aumenta el saldo exactamente por el importe completo revertido. Si la obligación estaba saldada, deriva `PENDING` cuando no queda ingreso neto ni otra condonación vigente, o `PARTIAL` cuando queda algún componente positivo; nunca permanece `SETTLED`.

La ecuación implementada conserva principal vigente, ingreso neto, condonación bruta, condonación revertida, condonación vigente y saldo. Revertir un ingreso conserva la condonación y puede reabrir deuda. Corregir el principal exige el piso `ingreso neto + condonación vigente`. Cualquier historia de condonación bloquea la anulación, incluso si todos sus hechos fueron revertidos.

Los comandos revalidan Owner, Pago, revisión económica, revisión de historia, lifecycle, prearchivo, guard y avisos dentro de la unidad transaccional. Todo aviso `REPORTED` relacionado bloquea condonar y revertir mediante consulta completa y fail-closed, sin confirmar, rechazar o resolver el aviso. Pago, evento, guard y receipt se coordinan sin efectos parciales.

Las formas v1–v4 siguen siendo legibles sin backfill. La primera condonación promueve la raíz a v5 de forma completa; writers de ingresos, reversiones de ingreso, corrección y anulación preservan la nueva composición. Formas parciales o ecuaciones incompatibles fallan cerradas.

La UI reutiliza los detalles y listados existentes. Owner dispone de acción e historia con categoría, explicación y actor presentado como rol; el sujeto o exintegrante recibe categoría presentable y efecto sin nota, código interno o actor; Tesorería recibe composición económica mínima y no historia interna. La vista `Saldadas` mantiene descubrible una obligación totalmente condonada aunque no posea Recepciones.

## Correspondencia entre criterios y evidencia

| Criterio de aceptación | Evidencia identificable | Evaluación |
| --- | --- | --- |
| Pago conserva autoridad única y ecuación exacta | Schema v5, composición común en readers/writers y regresión económica E3-01/E3-03–E3-07 | Satisfecho |
| Condonación parcial, total y sucesiva, con importe fijo | Casos focales de cero, exceso, igualdad, sucesivas y `TOTAL` ligado a saldo/revisión | Satisfecho |
| Reversión append-only, completa, única e idempotente | Historia original más compensación, doble reversión rechazada y recovery por receipt | Satisfecho |
| Toda reversión aumenta saldo y nunca conserva `SETTLED` | Casos hacia `PENDING` y `PARTIAL`, con ecuación exacta del importe revertido | Satisfecho |
| Ingreso, reversión, corrección y anulación preservan D05, D06 y D11 | Regresión focal de writers y cruces secuenciales registrados en el informe | Satisfecho |
| Avisos bloquean ambos comandos sin decidirlos | Fixture de 25 avisos con coincidencia en posición 25, bloqueo de ambas operaciones y no mutación | Satisfecho dentro del volumen medido |
| Autorización, lifecycle y prearchivo | Casos Owner/actor ajeno, exintegrante, Temporada cerrada y Grupo archivado prearchivo | Satisfecho |
| Privacidad por audiencia y Rules deny-all | DTOs Owner/sujeto/Tesorería, denegaciones y Rules de `waiverEvents` | Satisfecho |
| Compatibilidad sin backfill ni doble escritura | Hidratación v1–v4, promoción completa v5 y rechazo de formas incoherentes | Satisfecho |
| Concurrencia, stale, idempotencia y recovery | Operaciones solapadas, órdenes secuenciales, conflicto de key/hash, pérdida de respuesta y recuperación posterior | Satisfecho con límites declarados |
| Historia y cursores coherentes | Primera página, continuación, tamaños 1/50 e invalidación por evento nuevo como cambio concurrente | Satisfecho |
| Frontend integrado, accesible y descubrible | Typecheck/build, pruebas focales y UAT de modales, estados, foco, historia y `Saldadas` | Satisfecho |
| Rollback y exclusiones preservados | Procedimiento del informe, diff integrado y ausencia de Caja, devolución, crédito o permiso de condonación delegado | Satisfecho |
| Evidencia técnica y humana separadas | Resultados y confirmaciones delimitados en el informe único | Satisfecho |

No se identificó un criterio obligatorio sin evidencia suficiente para el cierre. Las confirmaciones humanas no sustituyen las pruebas de invariantes, autorización negativa, concurrencia, paginación o recovery.

## Evidencia automatizada y límites

El informe único conserva el detalle ejecutable. La evidencia vigente incluye:

- unitarias Functions `396/396`;
- unitaria E3-07 posterior al ajuste final del modal `3/3`;
- regresión económica focal E3-01/E3-03–E3-07 `59/59`;
- focal E3-07 posterior a autorización y Rules `8/8`;
- Functions syntax `437/437` archivos JavaScript;
- typecheck frontend, build con `22/22` páginas, índices JSON y `git diff --check`;
- unitarias focales posteriores a UAT `12/12` y Emulator focal de Tesorería `22/22`;
- correctivo causal de historia de Tesorería: reproducción previa `7/8`, con el fallo esperado `TreasuryDataIncompatibleError`, y resultado posterior `8/8`; unidad posterior `5/5` y sintaxis del store correcta.

La evidencia distingue expresamente:

- **operaciones realmente solapadas:** comandos coordinados por raíz, revisión y guard; sólo una intención aplica cuando compiten sobre el mismo estado;
- **órdenes secuenciales:** condonación, ingreso, reversión de ingreso, corrección, segunda condonación, reversión de condonación, aviso, anulación y archivo con orden conocido y relectura posterior;
- **abortos inyectados:** demuestran `PENDING_RECOVERY`, conservación de intención y ausencia de efectos parciales, pero no se presentan como detección automática de conflictos ni como retry automático de Firestore;
- **paginación concurrente:** un evento nuevo entre páginas invalida el cursor como cambio concurrente y exige recargar; no se clasifica la actualización legítima como corrupción.

La comprobación completa de avisos se midió con 25 entregas `REPORTED` de la misma Membresía y la referencia al Pago en la posición 25. El subtest —preparación, dos bloqueos, no mutación y limpieza incluidos— demoró `541.0644 ms` en Emulator local. Es evidencia sintética de ese volumen, no benchmark aislado ni proyección de latencia, costo, capacidad o contención productiva. No se introdujo truncamiento, límite funcional o proyección no aprobada.

El baseline de lint conservó 36 errores y 9 warnings conocidos, con 9 hallazgos resueltos respecto del baseline. No se declara lint global limpio ni se atribuye a E3-07 deuda adicional conocida.

No se repitieron suites ni Emulator para este cierre documental. Desde la integración funcional no hubo cambios de código, Rules, índices, configuración o dependencias.

## Fallos observados y correctivos

El informe conserva los fallos originales y sus resultados posteriores:

1. La primera ejecución focal E3-07 obtuvo `6` pass y `2` fail porque el fixture de paginación restaba acumulativamente el saldo esperado después de cada par condonación/reversión. El writer rechazó correctamente con `PAYMENT_ECONOMY_STALE`; corregida sólo la expectativa, quedó `8/8`.
2. El recovery incierto bloqueaba Escape y cancelar, pero no protegía explícitamente el cierre contenedor ni liberaba el flag después de recuperar. Se añadió el guard de cierre/navegación y la limpieza del estado; typecheck, lint baseline y build quedaron verdes después.
3. Node bajo el sandbox restringido falló con `EPERM` antes de ejecutar. Los comandos se repitieron localmente con autorización, sin Firebase remoto ni cambios externos, y finalizaron correctamente.
4. UAT-02 reveló ambigüedad entre `PARTIAL` por el saldo completo y `TOTAL`. La UI muestra el importe canónico no editable para `TOTAL`; un `PARTIAL` exactamente igual al saldo se anuncia y normaliza antes del envío, sin cambiar el contrato backend ni recalcular una intención enviada o incierta.
5. La historia Owner de Tesorería consultaba la colección compartida de grants sólo por `groupId`. Un grant válido `GROUP_PAYMENT_NOTICE_REVIEW` se intentaba hidratar como `GROUP_TREASURY` y producía `DATA_INCOMPATIBLE`. La lectura diagnóstica comprobó dos grants válidos y ninguna forma inválida; no hubo migración ni reparación de datos. El reader ahora filtra por `capabilityId == GROUP_TREASURY` y valida la misma capacidad en el documento ancla del cursor. La reproducción causal pasó de `7/8` a `8/8`.
6. El selector para conceder `GROUP_DIRECT_PAYMENT_RECORD` reutilizaba una búsqueda contractual de deudores. Se reemplazó en esa superficie por el roster Owner de integrantes elegibles, sin exigir obligación; el registro de una Recepción conserva la exigencia de obligaciones aplicables y sus vacíos explícitos.

La reproducción previa con dos tesoreros distintos y Owner sin Persona permanece como evidencia válida de multiplicidad, pero no se usa como explicación del incidente de historia. El correctivo no omite silenciosamente grants de Tesorería incompatibles, no devuelve historia parcial y no debilita autorización, privacidad, unicidad o lifecycle.

Las advertencias no fatales del Firebase CLI sobre consulta remota de configuración/MOTD y versión del SDK, y la antigüedad de `caniuse-lite`, no se corrigieron mediante dependencias fuera de alcance.

## Evidencia humana y alcance real

La UAT humana registrada confirma:

- `UAT-01` y `UAT-03`–`UAT-08` dentro de los recorridos definidos en la ficha y delimitados en el informe;
- `UAT-02`: el Owner condonó el saldo remanente mediante `TOTAL`;
- el ajuste posterior del modal de condonación en la interacción observada;
- la aparición de un integrante sin obligación en el selector de destinatarios de `GROUP_DIRECT_PAYMENT_RECORD`, sin inferir ejecución del grant o registro de una Recepción;
- la re-UAT final de Tesorería: el Owner volvió a abrir **Acceso a Tesorería** en el Grupo existente y la historia cargó sin errores.

La confirmación final de Tesorería no acredita nuevas concesiones, concurrencia, carreras ni recovery técnico. `UAT-09` y `UAT-10` no constan como ejecutadas humanamente. Tampoco se atribuye evidencia humana a invariantes, Rules, privacidad negativa, stale, idempotencia, abortos, pérdida de respuesta, paginación concurrente, volumen o rendimiento; esos escenarios conservan únicamente la evidencia automatizada identificada.

## Compatibilidad, privacidad, lifecycle y rollback

Pago v1–v4 interpreta condonación como cero sin escritura ni backfill. La primera condonación crea una forma v5 completa con principal vigente, acumulados de ingreso y condonación, saldo, estado, revisión económica, conteo, revisión y cabeza de historia. Una forma parcial o una ecuación inconsistente falla cerrada. Recepciones informadas y administrativas preservan v5 al aplicar o revertir ingresos.

El catálogo aprobado no posee `OTHER`. La explicación interna es NFC, obligatoria, de 1–240 code points y máximo 480 bytes UTF-8, sin controles C0/C1 ni marcas bidi. Owner recibe información interna; sujeto/exintegrante recibe la categoría presentable y una reversión genérica; Tesorería recibe sólo composición. `WAIVER_NOT_AUTHORIZED_AS_RECORDED` documenta un error y no crea aprobadores, roles o permisos.

Exintegrante y Temporada cerrada no bloquean los comandos. En Grupo archivado sólo procede Owner sobre un Pago íntegramente prearchivo. La operación no revive Membresía, Temporada, grants, generación o contexto deportivo. Toda historia de condonación impide que el Pago evolucione a `VOIDED`.

El rollback compatible consiste en revertir explícitamente el merge funcional `0fec906041e82f15f6e2fd2f5dcff675eaffc465`, sin reescribir historia Git ni borrar datos. Después de existir una condonación real pueden retirarse acciones de escritura, pero deben conservarse readers v5, ecuación, privacidad, Rules deny-all, receipts, guards e historia append-only. Una condonación o reversión real no se deshace mediante rollback de código. No hubo deploy ni datos remotos que revertir.

## Riesgos, gates y exclusiones preservados

- D5-044 conserva sus superficies, destinos y condiciones de retiro; no se adelanta.
- D5-045 permanece como riesgo residual aceptado y **no solucionado**; este cierre no infiere su causa ni resolución.
- Auth/UAT continúa aislada y no se incorpora como configuración, credencial o evidencia productiva.
- El baseline de lint conocido permanece explícito.
- El gate de retiro económico legacy continúa pendiente; E3-07 no sustituye autoridad económica embebida por fuera de su corte ni autoriza su retiro.
- Caja, devolución real, crédito, saldo a favor, interés, recargo, pasarela, restablecimiento/reemplazo de `VOIDED` y nuevas fuentes económicas permanecen fuera.
- La delegación de condonación permanece como solicitud pendiente de definición separada. No se implementó un cuarto permiso, no se amplió ninguna capability existente y este cierre no anticipa una aprobación.
- No hubo Firebase remoto, deploy, integración Auth/UAT, migración masiva ni backfill.

## Evaluación de cierre

La implementación coincide con la ficha, el addendum y DEC-E3-07/D5-052. Condonación, reversión, composición económica, compatibilidad, privacidad, lifecycle, avisos, guard, stale, idempotencia, recovery, historia, cursores, frontend y rollback poseen evidencia identificable. Los fallos originales y sus correctivos están preservados, las mediciones declaran sus límites y la evidencia humana no se extrapola a escenarios técnicos no ejecutados por personas.

No queda un criterio de aceptación conocido sin satisfacer. Los riesgos residuales y solicitudes futuras no se reinterpretan como resueltos ni autorizan producción. Este documento cierra únicamente E3-07: no cierra Etapa 3, no crea una rama siguiente, no define E3-08 y no autoriza su implementación.

## Veredicto

**E3-07 CERRADO — E3-08 HABILITADO ÚNICAMENTE PARA DEFINICIÓN**

La habilitación permite solamente preparar una definición futura bajo decisión y autorización propias. No adopta anticipadamente alcance funcional, permisos o normativa para E3-08 y no autoriza código, pruebas, Firebase remoto ni deploy.
