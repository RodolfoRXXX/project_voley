# E3-06 — Cierre de corrección del principal exigible

Fecha de cierre documental: 2026-10-19

Etapa: 3 — Economía

Incremento: E3-06

Estado: **CERRADO**

## Fuentes y trazabilidad

Este cierre aplica la estructura vigente de Documento 5 y se contrastó focalmente con:

- [Documento 5 — Plan de Implementación y Transición Técnica](<../../transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md>), en particular §§5.5, 5.8, 5.10–5.12 y 7.5, y D5-044, D5-045 y D5-051;
- [Ficha E3-06](./E3-06-ficha-correccion-principal-exigible.md), incluidas E3-06-D01–D11 y sus criterios de aceptación;
- [Addendum E3-06 a Documentos 2, 3 y 4](../../arquitectura/Documento-2-3-4-addendum-E3-06-correccion-principal-exigible.md);
- [DEC-E3-06 / D5-051](./DEC-E3-06-correccion-principal-exigible.md);
- [Informe único de implementación E3-06](./E3-06-informe-implementacion.md), que conserva contratos, archivos, comandos, resultados, mediciones, fallos, correctivos y alcance de cada confirmación humana;
- [Cierre E3-05](./E3-05-cierre.md), como antecedente de terminalidad, coordinación de avisos y compatibilidad económica.

Trazabilidad Git verificada:

| Hito | Commit | Relación |
| --- | --- | --- |
| Base de implementación | `24a67a35c9afad155fe6dfdae02d1b4dcab006dc` | `dev` antes de E3-06 |
| Implementación, pruebas e informe E3-06 | `5e7b9d4fe7549a9f7e3f61ba855016874f1a91a7` | feature publicada |
| Integración en `dev` | `df3d580f21c9c13b6c71ccd8da66200ed430d647` | merge `--no-ff`, padres base y feature |

El commit funcional contiene 24 archivos, 564 inserciones y 57 eliminaciones. Antes de este cierre se comprobó que el árbol del merge era idéntico al de la feature, ambas ramas coincidían con sus referencias remotas `0/0`, y árbol, índice y stashes estaban limpios.

## Alcance efectivamente implementado

E3-06 incorpora la corrección individual Owner-only del principal exigible de un Pago `ACTIVE` en estado `PENDING | PARTIAL | SETTLED`. El nuevo principal debe ser positivo, distinto del vigente y no inferior al ingreso neto confirmado. `amountMinor`, snapshots, referencias, identidad, clave económica, generación y outcomes originales permanecen inmutables; el principal vigente y cada corrección append-only pertenecen a Pago.

Confirmación, registro administrativo y reversión usan la ecuación común basada en el principal vigente. La reversión conserva las correcciones. Una anulación posterior elegible extingue el principal vigente, conserva historia de correcciones y anulación, mantiene `VOIDED` terminal y no libera la clave. Ningún flujo reescribe aplicaciones o snapshots históricos ni crea Recepción, ingreso, condonación, crédito o devolución.

Pago, historia, guard y receipt se escriben atómicamente. Autorización, prearchivo, revisión, economía y avisos se revalidan en transacción. Un aviso `REPORTED` relacionado bloquea sin decidirlo mediante consulta completa y coordinación con guard; una lectura incompleta falla cerrada. Recovery reconoce el resultado original aun después de ingresos, reversiones, otra corrección o anulación legítimos posteriores.

La UI reutiliza el detalle canónico de obligación en Economía, Mis obligaciones y, para el Owner, desde cada línea de una recepción en Historia de pagos, incluso si la obligación está saldada. Acción, historia y advertencia de reaparición de deuda permanecen separadas de la reversión de ingreso. El error por aviso pendiente se anuncia y enfoca dentro del modal activo, conserva los valores y bloquea el reenvío hasta recargar/revalidar. No se agregaron rutas paralelas, preview ni sección permanente de correcciones.

## Correspondencia entre criterios y evidencia

| Criterio de aceptación | Evidencia identificable | Evaluación |
| --- | --- | --- |
| Pago conserva autoridad, identidad y evidencia original | Lectores/escritores v1–v4, pruebas de generación/unicidad y revisión del diff integrado | Satisfecho |
| Principal válido y saldo nunca negativo | Casos de aumento/disminución, parcial→saldada, saldada→parcial y rechazos de cero, igual e inferior al neto | Satisfecho |
| Saldo, estado y resumen usan principal vigente | Pruebas de confirmación, registro, reversión y readers; UAT de saldo tras aumentar una saldada | Satisfecho |
| Aplicaciones, Recepciones y reversión permanecen íntegras | Regresión E3-03/E3-04, historia preservada y reversión posterior focal | Satisfecho |
| Aviso pendiente y stale no producen automatismos | Gate de 25 avisos, coordinación con guard, stale focal y UAT del bloqueo visible | Satisfecho dentro de límites declarados |
| Atomicidad, revisión, guard, receipt, idempotencia y recovery | Emulator focal, abortos inyectados, pérdida de respuesta y recovery tras operaciones posteriores | Satisfecho; límites declarados |
| Autorización, prearchivo y privacidad por audiencia | Casos Owner, sujeto, Tesorería, archivo y Rules deny-all | Satisfecho |
| Historia consultable sin fabricar ingreso | Primera página 20, tamaños 1–50, continuación y DTOs por audiencia | Satisfecho |
| `VOIDED` terminal y clave ocupada | Anulación v4 sin aplicaciones, historia preservada, saldo cero y regresión de generación | Satisfecho |
| Compatibilidad cerrada sin backfill | Hidratación v1–v4, rechazo de formas incoherentes y promoción sólo al escribir | Satisfecho |
| Exclusiones y preservaciones comprobables | Diff, informe, Rules e inventario sin condonación, Caja, permisos nuevos ni retiro legacy | Satisfecho |
| Pruebas focales y UAT con evidencia identificable | Resultados automatizados y confirmaciones humanas delimitadas en el informe | Satisfecho |

No se identificó un criterio obligatorio sin evidencia suficiente para el cierre. La evidencia humana no sustituye las pruebas de concurrencia o recovery ni se extiende a escenarios no ejecutados por personas.

## Evidencia automatizada y límites

El informe único conserva el detalle ejecutable. La evidencia vigente incluye:

- unitarias Functions `393/393`;
- Emulator focal E3-01–E3-06 `51/51` y writer E3-06 aislado `6/6`;
- regresión unitaria posterior a los correctivos UI `3/3`;
- typecheck, lint baseline, lint focal y build con 22/22 páginas;
- Functions syntax, JSON de índices, Rules deny-all y `git diff --check`;
- compatibilidad v1–v4, privacidad, autorización, prearchivo, idempotencia, recovery, generación original y anulación posterior.

Se distinguen expresamente:

- **operaciones realmente solapadas:** dos correcciones concurrentes coordinadas por la revisión económica; esta evidencia es independiente del aborto inyectado;
- **órdenes secuenciales:** cruces con ingreso, reversión, aviso, otra corrección ya confirmada, anulación y archivo que fijaron deliberadamente qué operación confirmó primero y verificaron la relectura posterior;
- **abortos inyectados:** demuestran `PENDING_RECOVERY` y ausencia de efectos parciales, pero no acreditan detección automática de conflictos ni retry automático de Firestore;
- **paginación concurrente:** con 21 correcciones, primera página de 20 y una nueva corrección antes de continuar, el cursor anterior se invalida como `CONCURRENT_MODIFICATION`; tras recargar, las 22 se recorren 20+2 sin omisiones. No se clasifica la actualización legítima como corrupción.

La consulta de avisos se probó con 25 documentos y el relacionado en posición 25. Esto acredita ausencia de truncamiento implícito a 20 en ese volumen sintético, no capacidad ilimitada. Las 51 entradas focales demoraron aproximadamente 58,1 s y el writer aislado 8,5 s en Emulator local. Son mediciones de una máquina y datos sintéticos; no se extrapolan a producción, costo, latencia, throughput o contención sostenida.

No se repitieron suites ni Emulator para este cierre documental. Desde el merge funcional no hubo cambios de código, Rules, índices, configuración o dependencias.

## Fallos observados y correctivos

El informe conserva los fallos originales y sus resultados posteriores:

1. La unitaria inicial quedó `392/393` por una ruta frontend incorrecta en la prueba; corregida la ruta, quedó `393/393`.
2. Emulator detectó que la promoción v1→v4 no materializaba los tres acumuladores económicos; el writer se corrigió y quedó verde.
3. La primera cobertura de archivo obtuvo `48/51` por evolución/restauración incorrecta del fixture de Grupo; corregido el fixture, el focal quedó `51/51` y el writer `6/6`.
4. Intentos dentro del sandbox fallaron antes de ejecutar Node por `EPERM`; se repitieron localmente y se separó el fallo ambiental del funcional.
5. Firebase CLI no pudo consultar información remota no esencial y advirtió sobre su SDK; no se cambiaron dependencias ni se accedió a Firebase remoto.
6. La continuación tras una nueva corrección devolvía indebidamente `INCOMPATIBLE_STATE`; el cursor incorporó conteo total y cabeza observada y ahora invalida como `CONCURRENT_MODIFICATION`, manteniendo ancla y detección de inconsistencias reales.
7. Una obligación saldada no era descubrible desde Historia de pagos; se reutilizó el detalle canónico por línea de recepción.
8. El error por aviso pendiente quedaba detrás del modal superior; se movió al modal activo con anuncio, foco, conservación de datos y bloqueo hasta revalidar.

Todos los correctivos cuentan con verificación posterior identificable. No se oculta ni reclasifica como preexistente ningún fallo funcional observado.

## Evidencia humana y límites

La UAT confirma, con el alcance exacto registrado en el informe: recorridos iniciales 1 y 2; reducción del principal hasta el ingreso neto con estado saldado; rechazo sin modificación de importes inválidos; bloqueo económico por aviso pendiente; y recorridos 6 y 7.

Las dos confirmaciones finales son:

1. desde Historia de pagos se abrió una obligación saldada, se aumentó su principal, apareció la advertencia y reapareció la deuda con saldo correcto;
2. con aviso pendiente, el error apareció dentro del modal de corrección, conservó los datos y bloqueó el reenvío hasta recargar/revalidar.

No se atribuye cobertura humana a carreras, operaciones solapadas, abortos, pérdida de respuesta, recovery, paginación concurrente, volumen, rendimiento ni otros escenarios no ejecutados humanamente. Esos casos conservan sólo la evidencia automatizada indicada.

## Compatibilidad, privacidad y rollback

Pago v1–v3 se interpreta con principal vigente igual al original; una primera corrección promueve a v4 sin backfill. v4 activa conserva principal original, principal vigente e historia; v4 anulada exige que `voidedAmountMinor` extinga el principal vigente, ingresos cero y saldo cero. Formas parciales o ecuaciones incoherentes fallan cerradas.

Owner recibe historia completa, actor y explicación. El sujeto recibe sólo su proyección minimizada sin actor ni explicación. Tesorería conserva economía mínima y última fecha, sin historia completa, categoría, actor, explicación, principal original ni acción. Otros grants no adquieren capacidad por analogía; Firestore continúa deny-all.

El rollback compatible consiste en revertir explícitamente el merge `df3d580f21c9c13b6c71ccd8da66200ed430d647`, sin reescribir historia Git ni borrar datos. Puede retirarse la exposición UI y los callables, pero deben conservarse lectores v4, la ecuación con principal vigente, la anulación v4, receipts, guards e historia mientras existan Pagos corregidos. Una corrección real no se revierte mediante rollback de código. No hubo deploy ni datos remotos que revertir.

## Riesgos, gates y exclusiones preservados

- D5-044 mantiene sus superficies y condiciones de retiro; no se adelanta.
- D5-045 permanece como riesgo residual aceptado y **no solucionado**; este cierre no infiere causa ni resolución.
- Auth/UAT continúa aislada y no aporta configuración o credenciales productivas.
- El baseline de lint conserva 36 errores y 9 warnings conocidos, con 9 hallazgos resueltos y sin deuda nueva atribuida a E3-06.
- El gate de retiro económico legacy permanece pendiente; E3-06 no sustituye autoridades de participaciones, equipos o inscripciones.
- Permanecen fuera: condonación, Caja, devolución, crédito, saldo a favor, interés, recargo, pasarela, permisos nuevos, corrección por lote, restablecimiento/reemplazo de `VOIDED` y anulación con aplicaciones históricas.
- No hubo Firebase remoto, deploy, migración masiva, backfill ni modificación normativa.

## Evaluación de cierre

La implementación coincide con la ficha, el addendum y DEC-E3-06/D5-051. Pago conserva autoridad y evidencia original; la ecuación común, atomicidad, guard, avisos, stale, idempotencia, recovery, compatibilidad, privacidad, paginación y anulación posterior tienen evidencia concreta. Los fallos y correctivos están trazados, las mediciones declaran sus límites y la UAT humana se registra sin extrapolaciones.

No queda un criterio de aceptación conocido sin satisfacer. Los riesgos residuales y exclusiones preservados no se reinterpretan como resueltos ni autorizan producción. Este cierre aplica sólo a E3-06: no cierra Etapa 3, no define E3-07 y no autoriza su implementación.

## Veredicto

**E3-06 CERRADO — E3-07 HABILITADO ÚNICAMENTE PARA DEFINICIÓN**

La habilitación permite solamente preparar una definición futura bajo decisión y autorización propias. No crea rama siguiente, no adopta anticipadamente alcance funcional y no autoriza código, pruebas, Firebase remoto ni deploy.
