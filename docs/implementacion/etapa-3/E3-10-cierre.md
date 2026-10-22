# E3-10 — Cierre técnico local

## Veredicto

**E3-10 CERRADO EN SU ALCANCE TÉCNICO LOCAL — HABILITACIÓN PRODUCTIVA PENDIENTE**

Este cierre aplica exclusivamente al código, Rules, herramienta operativa y evidencia técnica local
versionados e integrados. No acredita UAT, despliegue, inspección o reconciliación remota, retiro
efectivo en producción, habilitación del recorrido a usuarios, cierre del gate económico completo ni
cierre de Etapa 3.

## Fuentes contrastadas

- [Ficha E3-10](./E3-10-ficha-retiro-economia-legacy-torneos.md), especialmente §13.1–§14.
- [DEC-E3-10](./DEC-E3-10-retiro-economia-legacy-torneos.md), especialmente §3.4, §6–§8.
- [Addendum E3-10 a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-10-retiro-economia-legacy-torneos.md),
  especialmente §4.1–§6.
- [Informe de implementación E3-10](./E3-10-informe-implementacion.md).
- [Documento 5 vigente](<../../transicion/Documento 5 - Plan de Implementación y Transición Técnica-borrador.md>),
  decisión `D5-057` y continuidad de Etapa 3.

No se identificó contradicción normativa. La separación entre cierre técnico local y habilitación
productiva es una decisión propia de E3-10 adoptada por `D5-057`; no adopta ni extiende `D5-056`.

## Implementación e integración evaluadas

- implementación E3-10: `ec790e62861e6716c828c152f12532a1b087bdaf`;
- integración `--no-ff` en `dev`: `8b38c5f1db8cdab8bcfb65605212768cef819b3c`;
- árbol común de implementación e integración: `7591ccda1284521ba26d83f6d44b718a226373fe`.

El corte integrado:

- retira UI, cálculos, readers, writers y gates económicos legacy de Torneos, inscripciones y
  equipos en las superficies alcanzadas;
- omite economía en documentos deportivos nuevos y conserva intactos e inertes los campos
  históricos;
- usa actualizaciones deportivas granulares para no reescribir `settings` ni economía histórica;
- alinea frontend y Rules para que roster modifique sólo campos deportivos autorizados;
- conserva los efectos deportivos de triggers compartidos y retira sólo sus ramas económicas;
- conserva `updateTournamentRegistrationPayment` como tombstone autenticado y autorizado, con error
  estable y cero efectos;
- rechaza atómicamente los campos económicos retirados en callables mixtos, sin efectos deportivos
  parciales;
- incorpora un reconciliador operativo separado, idempotente, por lotes y reanudable, sin conectarlo
  a arranque, callables, triggers o frontend;
- no vincula Torneos con Pago, no genera economía retroactiva y no rediseña reglas deportivas.

## Criterios técnicos y evidencia

Los trece criterios locales de ficha §13.1 y addendum §4.1 quedan satisfechos por la evidencia
registrada en el informe:

| Criterio local | Evidencia final |
| --- | --- |
| Ausencia de readers/writers económicos productivos | Búsqueda estructural con allowlist limitada a tombstone, detectores contractuales y fixtures/aserciones históricas. |
| Contratos de callables mixtos | Matriz por callable y campo para ausencia, propiedad presente con `undefined`, `null`, cero y otros valores; orden estable y precedencias de autenticación/autorización. |
| Rechazo sin efectos parciales | Comparaciones antes/después en creación, edición y review; ningún writer deportivo se ejecuta ante rechazo económico. |
| Nuevos documentos sin economía | Torneo, inscripción y equipo nuevos poseen proyección económica vacía. |
| Rules deportivas granulares | Roster permitido; altas, modificaciones y eliminaciones económicas rechazadas por campo en inscripciones y equipos. |
| Aceptación, rechazo y conteo | Equipo aceptado sin economía, rechazo sin alterar `acceptedTeamsCount` y alertas deportivas conservadas. |
| Tombstone | Precedencias, error exacto y ausencia de escrituras/transacciones comprobados. |
| Triggers compartidos | Ejecución deportiva real conserva alertas deportivas y no reactiva una alerta económica histórica resuelta. |
| Reconciliador local | CLI real contra Emulator aislado: inspección sin escrituras, manifest, corte/reanudación, repetición idempotente y recuperación de fallo inyectado; alertas deportivas intactas. |
| UI afectada sin economía | Búsqueda estática, typecheck y build sin controles, importes ni equivalencias “gratis/pagado”; observación humana permanece reservada a UAT. |
| Preservación histórica | Comparación campo a campo en Torneo, inscripción y equipo, incluido `settings.paymentPerPlayer`, mientras cambian legítimamente roster, estado o timestamps deportivos. |
| Raíces económicas E3 invariantes | Snapshots antes/después sin creación, modificación o eliminación en raíces y subcolecciones pertinentes. |
| Gates generales y regresión focal | Sintaxis, typecheck, lint contra baseline, build y pruebas focales aprobados; regresión acotada a rutas y dependencias demostradas. |

Resultados finales registrados:

- sintaxis Functions: `453/453`;
- unitarias Functions: `409/409`;
- evidencia unitaria focal final: `5/5`;
- Emulator focal final con proyecto demo y datos sintéticos: `19/19`;
- typecheck, build, Rules/configuración afectada y lint contra baseline: aprobados;
- regresión deportiva focal: aprobada;
- `git diff --check`: aprobado durante la integración.

No queda un criterio técnico local obligatorio sin evidencia contra ficha §13.1, DEC §6 y addendum
§4.1. No se repiten suites para emitir este cierre porque no se modifica comportamiento ejecutable.

## Fallos originales, correctivos y resultado

- Una aserción unitaria inicial incluía indebidamente los detectores contractuales permitidos. Se
  acotó la búsqueda a autoridades productivas y la suite final aprobó.
- El fixture Emulator inicial carecía de la lista `admins` exigida por la autorización real. Se
  corrigió exclusivamente el dato sintético y la corrida aislada aprobó.
- Al incorporar una alerta económica histórica `resolved`, una aserción antigua exigía cero
  documentos económicos. Se corrigió para exigir cero alertas económicas activas y preservación de
  la historia; las corridas finales aprobaron.
- El camino `failed` del reconciliador se produjo mediante un cursor inválido inyectado de forma
  deliberada. Persistió `failed: 1` y `lastError`, y reanudó correctamente después de reparar el
  cursor. No hubo fallos espontáneos de la CLI.
- Los avisos de Browserslist/lint baseline no bloquearon las verificaciones ni motivaron cambios de
  dependencias.

No fue necesario aplicar un correctivo productivo ni adoptar una decisión funcional nueva.

## Preservación histórica y límites

Los campos económicos históricos de `tournaments`, `tournamentRegistrations` y `tournamentTeams`
permanecen intactos e inertes. No fueron eliminados, normalizados, migrados a Pago ni reinterpretados
como obligación, ingreso, saldo o deuda. Las comparaciones permiten únicamente cambios deportivos
legítimos de roster, estado, relaciones y timestamps.

La evidencia procede del repositorio, pruebas locales, Emulator demo aislado y datos sintéticos. No
caracteriza datos, funciones o consumidores externos reales y no demuestra el estado de ningún
ambiente desplegado.

## UAT diferida

**Estado:** `NO EJECUTADA — NO APROBADA — DIFERIDA HASTA HABILITAR EL RECORRIDO`.

El usuario no pudo ejecutar la UAT porque los controles de creación y gestión de Torneos no están
disponibles en el frontend actual. La existencia de rutas o componentes en el código no equivale a
accesibilidad real desde la interfaz. E3-10 no investigó ni reconstruyó navegación para habilitar el
recorrido.

La UAT de ficha §13.2 y addendum §4.2 continúa siendo obligatoria antes de habilitar el recorrido a
usuarios. Este cierre local no la sustituye ni la presenta como aprobada.

## Pendientes de habilitación productiva

Con autorización separada todavía se requiere:

1. identificar ambiente y versiones objetivo;
2. inspeccionar de forma acotada las alertas económicas activas;
3. decidir el tratamiento operativo de clientes antiguos con la evidencia disponible —aviso,
   compatibilidad adicional acotada sin restaurar economía o aceptación del riesgo—;
4. desplegar coordinadamente frontend, Functions y Rules;
5. verificar el tombstone remoto;
6. ejecutar y verificar la reconciliación real de alertas por lotes;
7. confirmar ausencia de nueva economía y preservación histórica en el ambiente objetivo;
8. ejecutar smoke y UAT humana y obtener su aprobación;
9. verificar continuidad de las acciones deportivas afectadas;
10. registrar y validar el rollback operativo sin reactivar economía legacy.

No se exige una búsqueda externa indefinida, pero tampoco se presume ausencia de consumidores
antiguos. Ninguno de estos pendientes fue ejecutado por este cierre.

## Rollback

Antes de un rollout, el rollback consiste en revertir coordinadamente los commits de implementación
e integración, manteniendo alineados frontend, Functions y Rules. No requiere migrar datos porque el
corte no reescribe economía histórica.

Después de un rollout no corresponde restaurar ciegamente writers económicos ni revertir en masa
alertas reconciliadas. Cualquier corrección debe preservar historia, revisar manifests y evidencia
del lote, y evitar reactivar alertas deportivas o crear Pago retroactivo. Rehabilitar autoridad
económica legacy requeriría una decisión funcional nueva.

## Gates y pendientes preservados

- La UAT y el rollout de E3-10 permanecen pendientes de habilitación productiva.
- La UAT humana y el retiro remoto verificado de `onMatchClose` pendientes de E3-09 no cambian.
- `D5-044` y `D5-045` permanecen vigentes y sin modificación.
- Auth/UAT real permanece aislada y no fue usada por la evidencia automatizada.
- No se declara cerrado el gate económico completo ni Etapa 3.
- No se habilita ni define automáticamente otro incremento.

El siguiente paso es evaluar la salida consolidada de E3 contra todos sus criterios vigentes,
incluidos ausencia de doble autoridad, pendientes productivos, contratos, Rules, observabilidad,
trazabilidad y línea transversal aplicable.
