# E3-04 — Cierre formal de recepción administrativa y economía contextual

## Estado

- Incremento: `E3-04`.
- Estado documental: `CERRADO`.
- Alcance cerrado: recepción administrativa multiobligación, coordinación con avisos E3-03,
  capacidad independiente `GROUP_DIRECT_PAYMENT_RECORD`, historia compatible y reorganización
  contextual aprobada de Grupo, Economía y Temporadas.
- Commit de implementación y correctivos:
  `3801e26d42e04979905b73b83dd88ed737c8dfc9`.
- Merge no fast-forward de implementación en `dev`:
  `14ca13e9801a1a370e0bf937d0ae61c3e67d07c8`.
- Fecha de cierre documental: 2026-10-16.
- Deploy: no realizado ni autorizado.
- Firebase remoto y datos productivos: no accedidos ni modificados.

Este cierre aplica exclusivamente a E3-04. No cierra Etapa 3, no satisface el gate de retiro de
autoridad económica legacy y no autoriza implementar E3-05. Sólo habilita E3-05 para definición,
sin adoptar anticipadamente finalidad, alcance, contratos, riesgos ni criterios.

## Fuentes y trazabilidad

El cierre se contrastó focalmente con:

- la [ficha E3-04](./E3-04-ficha-registro-administrativo-pago.md), incluidas E3-04-D01–D06,
  E3-04-R01–R04, contratos, presupuesto y criterios de aceptación;
- el [addendum E3-04 a Documentos 1, 1.5, 2, 3 y 4](../../arquitectura/Documento-1-1.5-2-3-4-addendum-E3-04-registro-administrativo-pago.md);
- [DEC-E3-04 / D5-049](./DEC-E3-04-registro-administrativo-pago.md);
- el [informe único de implementación y UAT](./E3-04-informe-implementacion.md), que conserva el
  inventario, contratos, persistencia, mediciones, pruebas, incidencias, correctivos y alcance de
  cada confirmación humana;
- Documento 5, §§5.5, 5.8, 5.10–5.12 y 7.5, junto con D5-044–D5-049;
- los cierres [E3-01](./E3-01-cierre.md), [E3-02](./E3-02-cierre.md) y
  [E3-03](./E3-03-cierre.md);
- el commit funcional y su merge identificados en Estado.

La definición normativa precedió al código. El commit funcional contiene 86 archivos y 3.731
inserciones/292 bajas. El merge incorpora la feature como segundo padre sobre
`54c5bb64ad2ca03e1c5989f637496a6cea4a4e2e`. Antes de este cierre se comprobó que el árbol del merge
era idéntico al de la feature, que feature y `dev` coincidían con sus referencias remotas y que
árbol, índice y stashes estaban limpios.

## Alcance efectivamente implementado

E3-04 incorpora el recorrido vertical aprobado:

- Recepción compatible con orígenes cerrados `INFORMED | ADMINISTRATIVE`, sin backfill de raíces
  E3-03 v1 y sin alterar sus IDs, queries ni semántica previa;
- registro Owner o delegado de 1–20 Pagos del mismo Grupo, Temporada y Membresía, con selección
  total/parcial, fecha civil, importe explícito, snapshots y total derivado;
- preview y registro con revisión completa de hasta 20 avisos `REPORTED` de la Membresía;
- clasificación explícita entre recepción distinta, aviso confirmable por E3-03, corrección
  administrativa o incertidumbre, sin respuestas preseleccionadas;
- resolución administrativa sólo ante diferencias reales de fecha o importe/distribución,
  conservando declaración y vínculo del aviso sin aplicación ni ingreso propios;
- raíz, aplicaciones, receipts, guard y cambios de avisos/Pagos en una transacción todo-o-nada;
- reversión completa, motivada, idempotente y Owner-only, que restaura economía pero no reabre
  avisos ni representa devolución real de dinero;
- historia combinada v1/v2 y `INFORMED | ADMINISTRATIVE`, detalle Owner/propio, outcome delegado y
  cursores compuestos sin omisiones ni duplicación;
- `GROUP_DIRECT_PAYMENT_RECORD` con grant, slot, receipt, lifecycle y reautorización propios;
- Rules deny-all e índices requeridos por candidatos, obligaciones e historia;
- frontend Owner/delegado/propio, detalle de obligación y recepción, estados en español, recovery,
  confirmaciones de descarte y presentación sin IDs técnicos.

Pago conserva obligación, aplicaciones, movimientos, saldo, estado y `economicRevision`; no existe
otro saldo autoritativo ni cálculo económico cliente.

## Reorganización contextual aprobada

El mismo corte consolida la presentación sin ampliar permisos ni reglas económicas:

- navegación personal con **Inicio**, **Mis grupos** y **Mis obligaciones**;
- layout compartido persistente por Grupo con nombre, selector validado y navegación contextual;
- destinos canónicos de Resumen, Integrantes, Temporadas y Economía, con compatibilidad para rutas
  económicas anteriores;
- ancla de Integrantes reparada sobre una sección desplazable real;
- Temporadas en ruta dedicada, conservando lifecycle, paginación y operaciones existentes; el
  Resumen muestra sólo su tarjeta compacta;
- Economía dedicada con Deudas, Pagos informados e Historial, mostrando sólo pestañas y acciones
  autorizadas;
- resumen económico Owner-only exacto para saldo pendiente, cantidad de obligaciones abiertas y
  avisos pendientes, sin sumar páginas frontend ni tratar avisos como ingresos;
- encabezado compartido con nombre, badge de estado y menú Owner existente, sin duplicación por
  subvista;
- **Mis obligaciones** con estado vacío legítimo, tratamiento específico de Cuenta sin Persona e
  historia propia combinada sin duplicar una Entrega confirmada como otro pago.

El layout y el selector son presentación, no autoridad. Cada reader y operación revalida el scope;
la pertenencia no concede administración ni una capability implica otra.

## Exclusiones preservadas

Este cierre no incorpora intereses, pasarela, Caja, condonación, ajuste del exigible, devolución
real, adjuntos, roles configurables, RBAC general, nuevas capabilities por analogía, migración
general, backfill, reparación silenciosa ni agregación económica persistida. Tampoco modifica flujos
de Torneos/partidos, normativa, catálogos o tombstones, ni integra Auth/UAT real.

No retira autoridad económica legacy, no adelanta D5-044, no declara resuelto D5-045, no reabre
E2-14, no realiza Firebase remoto o deploy y no cierra Etapa 3.

## Correspondencia entre criterios y evidencia

| Criterio del corte | Evidencia vigente | Evaluación |
| --- | --- | --- |
| Recepción administrativa no suplanta Pago | Raíz administrativa conserva hecho/trazabilidad; aplicaciones y saldos se escriben exclusivamente en Pago. | Satisfecho. |
| Scope único y atomicidad | Contratos y Emulator cubren 1–20 líneas de una Membresía y todo-o-nada ante stale. | Satisfecho. |
| Aviso correcto no se duplica | UAT-03 y regresión derivan a confirmación E3-03 sin raíz administrativa ni segundo ingreso. | Satisfecho. |
| Corrección conserva declaración | UAT-04 y regresión verifican vínculo terminal, `correctedFields` exactos y un solo efecto económico. | Satisfecho. |
| Recepción distinta es trazable | `relatedNoticeDecisions` persiste `DISTINCT_REAL_RECEIPT`; recovery, reversión y privacidad tienen cobertura focal. | Satisfecho. |
| Incertidumbre bloquea | Contrato/UI conservan `UNDETERMINED` como **No estoy seguro**, sin registrar. No se atribuye UAT humana específica. | Satisfecho automáticamente; UAT humana no ejecutada. |
| Límite de candidatos | Casos 0/20/21 y guard prueban que 21 bloquea E3-04 sin limitar comandos E3-03. | Satisfecho automáticamente; UAT-05 no confirmada. |
| Idempotencia y recovery | Receipts/hash estable recuperan outcome e importes originales después de movimientos legítimos; persistencia parcial falla cerrada. | Satisfecho. |
| Reautorización y lifecycle | Casos de revocación, archivo y cambio de contexto niegan retry delegado sin efectos parciales. | Satisfecho. |
| Capacidades independientes | Owner, Tesorería, revisor y registrante conservan superficies separadas; Rules impide acceso cliente paralelo. | Satisfecho. |
| Privacidad | DTOs propios/delegados omiten actor, UID, email, grants, notas internas e IDs técnicos; Tesorería ve sólo identidad mínima. | Satisfecho. |
| Compatibilidad v1/v2 | Historia de dos streams, empates por ID, cursores independientes y raíz previa sin `relatedNoticeDecisions` permanecen legibles. | Satisfecho. |
| Paginación completa | 55 obligaciones en páginas 20/20/15, filtro físico de pendientes/parciales y selección entre páginas sin omisiones. | Satisfecho. |
| Detalle económico | Callable real cubre cero movimientos, parcial, saldada y reversión; orden físico compatible y reautorización por página. | Satisfecho. |
| Presentación monetaria | `$45.000,00` produce 4.500.000 minor; parciales aceptan separadores válidos y rechazan precisión/exceso. | Satisfecho y confirmado en UAT-01. |
| Navegación y resumen | Typecheck/build/regresión focal y confirmación humana del recorrido probado cubren layout, rutas, tarjeta y encabezado. | Satisfecho con límites humanos declarados. |
| Cuenta sin pertenencias | Callable focal separa Persona vacía, Cuenta sin Persona y exintegrante; el error humano observado quedó corregido. | Satisfecho; sólo el error observado fue confirmado humanamente. |

No se identificó un criterio obligatorio del corte sin evidencia suficiente para el cierre local.
Las ausencias de confirmación humana detalladas abajo no se reinterpretan como aprobaciones ni como
evidencia productiva.

## Evidencia automatizada y mediciones

El informe único conserva comandos y resultados completos. La evidencia aprobada incluye:

- Functions syntax hasta `422/422`, suites unitarias y focales de contrato/dinero/arquitectura;
- Emulator local con Auth y datos sintéticos para registro, relaciones, paginación, resumen,
  detalle, privacidad, compatibilidad, recovery y coordinación;
- caso focal de coordinación/recovery/historia `7/7`;
- paginación de 55 obligaciones, historia v1/v2 y detalle HTTP/callable real;
- correctivo de **Mis obligaciones** `1/1` para Persona sin Membresías, Cuenta sin Persona y
  exintegrante con obligación histórica;
- frontend typecheck, lint baseline y builds aprobados en los cortes aplicables;
- parse de índices, Rules deny-all y `git diff --check` aprobados.

No se repitieron suites para este cierre documental. La evidencia previa es aplicable porque desde
el commit funcional integrado no hubo cambios de código, Rules, índices, configuración o
dependencias.

### Presupuesto máximo medido

Para `N=20` Pagos y `M=20` avisos, Emulator observó **63 escrituras**:

`20 Pago + 20 aplicación + 20 avisos + raíz + receipt + guard`.

El commit Owner máximo observó 66 documentos/resultados leídos; preview Owner máximo, 45 lecturas y
una escritura sólo al inicializar guard. La serialización representativa midió:

- raíz administrativa máxima: **9.064 bytes**;
- write-set completo: **32.096 bytes**;
- autorización delegada representativa más guard: **1.311 bytes**.

Estas cifras son mediciones locales/documentales, no encoding protobuf exacto ni evidencia de
latencia, costo, throughput, contención sostenida o rendimiento productivo.

## Solapamiento, aborto inyectado y límites de prueba

Las pruebas secuenciales fijan explícitamente el orden de commit y no se presentan como
concurrencia real. Los cruces de registro con confirmación/rechazo E3-03, revocación, archivo y
reversión usan una barrera determinista: el primer intento se aborta **por el harness** con
`maxAttempts=1`, se completa la operación competidora y se ejecuta un retry explícito que vuelve a
autorizar y releer economía.

Esto demuestra invariantes bajo retry y reautorización, pero no acredita detección automática de
conflictos ni retry automático de Firestore. No se ejecutaron matrices de estabilidad, contención
sostenida, sleeps como garantía de orden, Firebase remoto o pruebas productivas.

## Evidencia humana y límites

La evidencia humana vigente confirma UAT-01, UAT-02, UAT-03, UAT-04 y UAT-06–UAT-10 con el alcance
registrado en el informe. UAT-03 confirma que un aviso correcto se resuelve por E3-03 sin recepción
administrativa duplicada; UAT-04 confirma corrección real con declaración preservada y un solo
ingreso. También se confirmó **Ver detalle** para Owner y Tesorería, el error observado de **Mis
obligaciones**, y navegación contextual, resumen económico y encabezado dentro del recorrido
efectivamente probado.

UAT-05 permanece **sin confirmación humana**. La evidencia automatizada del exceso de 20 no acredita
el recorrido **No estoy seguro**: son condiciones distintas. Tampoco se atribuyen pruebas humanas
específicas de móvil, recovery incierto, todos los perfiles, Cuenta sin Persona, Persona sin
Membresías, exintegrante histórico, carreras, Owner sin Persona, volumen o rendimiento. Estos
escenarios conservan únicamente la evidencia automatizada que les corresponde o permanecen no
ejecutados humanamente.

La combinación de contratos cerrados, pruebas focales en los límites, evidencia de coordinación,
mediciones y UAT disponible es suficiente para cerrar localmente el alcance delimitado de E3-04; no
autoriza producción ni transforma escenarios no ejecutados en aprobaciones.

## Compatibilidad, capacidades y privacidad

Pago v1 se normaliza como pendiente íntegro y sólo evoluciona al escribir economía; raíces E3-03 v1
siguen siendo `INFORMED` implícitas. Nuevas raíces/aplicaciones v2 tipan origen sin migración ni
backfill. La historia mezcla streams físicos y una raíz previa sin trazabilidad de clasificación
continúa legible, pero su ausencia nunca se inventa como `DISTINCT_REAL_RECEIPT`.

`GROUP_TREASURY` conserva consulta económica; `GROUP_PAYMENT_NOTICE_REVIEW`, bandeja y decisiones
de terceros; `GROUP_DIRECT_PAYMENT_RECORD`, registro directo y lecturas mínimas. Ninguna capability
implica otra. Sólo Owner administra accesos, ve historia general y revierte. El delegado no opera
sobre sí mismo ni en archivo. Los readers y comandos revalidan Cuenta, Persona cuando corresponde,
Membresía/ancla, grant/slot, ownership revision y Grupo.

## Riesgos, limitaciones y gates preservados

- El resumen económico exacto tiene costo lineal en obligaciones abiertas y avisos pendientes del
  Grupo. No se creó una proyección editable ni otro saldo autoritativo.
- La consulta propia presenta conceptos y vencimientos, pero no dispone de una etiqueta separada y
  exacta de período/cobro; ampliarla exige una decisión y contrato futuros.
- El baseline de lint conserva **36 errores y 9 warnings conocidos**, con 9 hallazgos resueltos y
  sin deuda nueva atribuida a E3-04.
- D5-045 permanece como riesgo residual **no resuelto**, de causa histórica desconocida. Su no
  reproducción no elimina el riesgo ni autoriza producción.
- D5-044 conserva catálogos, rutas y callables/tombstones hasta sus etapas y decisiones de retiro.
- El gate económico legacy de Etapa 3 sigue pendiente: participaciones, equipos e inscripciones no
  se retiran como autoridades por este cierre.
- Auth/UAT continúa aislada; índices y Rules están versionados pero no desplegados.
- No se midieron datos, costos, latencia, volumen o contención productivos.

## Checkpoint y rollback compatible

El checkpoint anterior a la implementación fue
`54c5bb64ad2ca03e1c5989f637496a6cea4a4e2e`. Implementación e integración están identificadas por
los commits consignados en Estado.

El rollback de código/documentación consiste en revertir explícitamente el merge
`14ca13e9801a1a370e0bf937d0ae61c3e67d07c8`, sin reescribir historia. No debe borrar raíces,
aplicaciones, receipts, guard, decisiones o movimientos existentes. Antes de retirar readers o
writers debe conservarse lectura tolerante de v1/v2 y de raíces previas sin
`relatedNoticeDecisions`; una futura reversión sobre datos reales requiere plan de compatibilidad y
la política económica vigente.

Ese rollback es distinto de revertir una Recepción: la reversión de dominio es Owner-only,
motivada, conserva raíz/aplicaciones/trazabilidad y corrige saldos; no devuelve dinero. Como no hubo
deploy ni datos remotos en este corte, no existe rollback productivo ejecutado.

## Evaluación de cierre

La implementación coincide con DEC-E3-04/D5-049 y el addendum; Pago conserva autoridad económica;
la recepción administrativa y la resolución de avisos evitan doble ingreso; atomicidad, guard,
idempotencia, recovery, compatibilidad, privacidad y capacidades tienen evidencia concreta; los
correctivos y la reorganización aprobada están trazados; mediciones y pruebas declaran sus límites;
y el rollback preserva datos existentes.

UAT-05 y los escenarios humanos no ejecutados permanecen explícitos, pero no constituyen un bloqueo
del cierre local porque los invariantes obligatorios correspondientes tienen evidencia automatizada
focal y no se exige fabricar volumen o concurrencia manual. No se detectó otro criterio obligatorio
sin cubrir.

Este veredicto no cierra Etapa 3, no resuelve D5-045, no satisface el gate económico legacy, no
adelanta D5-044, no autoriza producción ni permite implementar E3-05.

## Veredicto

`E3-04 CERRADO — E3-05 HABILITADO ÚNICAMENTE PARA DEFINICIÓN`

La habilitación sólo permite preparar una definición futura con decisión y autorización propias. No
adopta alcance anticipado, no crea una rama de E3-05 y no autoriza su implementación.
