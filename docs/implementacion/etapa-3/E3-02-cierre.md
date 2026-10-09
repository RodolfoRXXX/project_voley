# E3-02 — Cierre formal de delegación de consulta económica

## Estado

- Incremento: `E3-02`.
- Estado documental: `CERRADO`.
- Alcance cerrado: concesión y revocación individual de `GROUP_TREASURY`, consulta delegada
  exclusivamente de lectura sobre la economía E3-01 y lifecycle sin herencia ni revival.
- Commit de implementación y correctivos:
  `7a664c1347a28c4aea8252ee90769b16b76f4d26`.
- Merge no fast-forward de implementación en `dev`:
  `079aa17702ecc1f526ef4eb6b896534a176b571c`.
- Fecha de cierre documental: 2026-10-09.
- Deploy: no realizado ni autorizado.
- Firebase remoto y datos productivos: no accedidos ni modificados.

Este cierre aplica exclusivamente a E3-02. No cierra Etapa 3, no satisface su gate de retiro
económico legacy y no autoriza implementar E3-03. Sólo habilita E3-03 para definición, con decisión y
autorización separadas.

## Fuentes y trazabilidad

El cierre se contrastó exclusivamente con:

- la [ficha E3-02](./E3-02-ficha-delegacion-tesoreria-consulta-economica.md), incluidos sus criterios
  de aceptación y pruebas requeridas;
- el [addendum E3-02 a Documentos 2, 3 y 4](../../arquitectura/Documento-2-3-4-addendum-E3-02-tesoreria-consulta.md);
- [DEC-E3-02 / D5-047](./DEC-E3-02-tesoreria-consulta.md);
- el [informe único de implementación y UAT](./E3-02-informe-implementacion.md);
- Documento 5, §§5.5, 5.8, 5.10–5.12, 7.5 y D5-047;
- el commit funcional y su merge identificados en Estado;
- la plantilla documental vigente de [cierre E3-01](./E3-01-cierre.md).

La definición y sus decisiones precedieron al código. El commit funcional contiene 45 archivos y el
merge lo incorpora como segundo padre sobre el checkpoint aprobado. Antes de este cierre se comprobó
que el árbol integrado era idéntico al de la feature verificada y que `dev` coincidía con
`origin/dev`.

## Alcance efectivamente implementado

E3-02 entrega una capacidad fija, privada y contextual:

- el Owner vigente concede y revoca `GROUP_TREASURY` individualmente;
- un Grupo admite cero o varios tesoreros y un solo grant efectivo por Cuenta/contexto;
- el destinatario se deriva de una Membresía elegible y exige vínculo Cuenta–Persona único;
- la vigencia usa Período real period-aware o ancla legacy compatible, sin crear, migrar ni reparar
  Membresías;
- grant, slot y receipt registran historia, unicidad e idempotencia sin revival;
- el tesorero reutiliza los readers E3-01 de conceptos, cobros específicos y obligaciones;
- cada consulta y página revalida Cuenta–Persona, Grupo, ownership, Membresía, vigencia y Temporada;
- finalización, reactivación, renovación, cambio de ownership y archivo invalidan o impiden herencia;
- el frontend separa cargo descriptivo, administración Owner y navegación delegada de sólo consulta;
- Rules conserva deny-all para grants, slots, receipts y economía desde el cliente.

Como correctivo de presentación, **Mis obligaciones** compone en backend el nombre canónico del Grupo
mediante una capacidad pública mínima, conserva obligaciones de Grupos archivados y no expone
`groupId` como sustituto.

## `ownershipRevision`

Grupo admite formas activas y archivadas con `ownershipRevision` positiva. Una forma activa legacy
compatible se inicializa idempotentemente en revisión 1. Renombre, archivo y writers canónicos
ordinarios preservan la revisión; no la reinician ni incrementan.

Cada grant fija Owner y revisión, y las consultas los revalidan. El fixture técnico A → B → A acredita
que una revisión diferente no revive grants anteriores. E3-02 no implementó transferencia de
ownership, historial general ni UI de transferencia; sólo una futura operación canónica, definida por
otro incremento, podría cambiar `ownerId` e incrementar la revisión atómicamente.

## Exclusiones preservadas

Este cierre no incorpora:

- perfiles configurables, RBAC general, CRUD de roles o arreglos de permisos;
- otras capacidades delegadas ni ampliación implícita de `GROUP_TREASURY`;
- roster, candidatos MONTHLY o datos técnicos para el tesorero;
- creación o mutación de conceptos, cobros específicos u obligaciones por el tesorero;
- avisos, ingresos, entrega o validación de dinero, rechazo, corrección, condonación, reversión,
  devolución, Caja, balance o liquidación prearchivo;
- acceso delegado a Grupo archivado o historia económica para ex-tesoreros;
- transferencia de ownership;
- integración Auth real, migración, backfill, Firebase remoto o deploy;
- retiro de catálogos o tombstones D5-044.

CU-036 y CU-037 reciben cobertura focal. CU-038 sólo recibe cobertura parcial mediante la capacidad
fija; CU-034, CU-035, perfiles configurables y permisos restantes continúan diferidos.

## Correspondencia entre criterios y evidencia

| Criterio de aceptación de la ficha | Evidencia vigente | Evaluación |
| --- | --- | --- |
| 1. Paquete normativo previo | Ficha, addendum y DEC-E3-02/D5-047 aprobados antes del commit funcional. | Satisfecho. |
| 2. Decisiones E3-02-D01–D04 | La ficha registra cantidad de tesoreros, vínculo único, lifecycle y alcance consultable. | Satisfecho. |
| 3. Owner y destinatario válidos | Callables/store prueban Owner vigente, vínculo único y Membresía legacy/period-aware elegible; los casos inválidos fallan cerrado. | Satisfecho. |
| 4. Capacidad exclusivamente de consulta | Readers E3-01 son la única superficie delegada; mutaciones, candidatos y roster permanecen denegados. | Satisfecho. |
| 5. Cargo independiente | Autorización no consulta cargo; UAT-04 confirmó cargo descriptivo independiente y múltiples tesoreros. | Satisfecho. |
| 6. Lifecycle sin herencia/revival | Emulator cubre finalización, reactivación, renovación, archivo, cierre y fixture A → B → A. | Satisfecho. |
| 7. Revalidación por request/página | Store y pruebas focales acreditan revalidación y pérdida de autorización entre páginas; el cursor no autoriza. | Satisfecho. |
| 8. Historia, revocación e idempotencia | Grants, slots y receipts prueban retry, conflicto, carrera, revocación durable y nueva concesión con otro `grantId`. | Satisfecho. |
| 9. Reutilización E3-01 | Se reutilizan queries y DTOs económicos; no existe colección ni reader económico paralelo. | Satisfecho. |
| 10. Rules y privacidad negativa | Rules deny-all y pruebas con actor no autorizado, anónimo y datos técnicos acreditan ausencia de acceso directo. | Satisfecho. |
| 11. UAT de feedback y controles | UAT confirmó lectura delegada sin escritura, revocación, múltiples tesoreros/cargo y presentación; el actor nunca autorizado conserva evidencia sólo automatizada. | Satisfecho. |
| 12. Alcance parcial declarado | El informe y este cierre mantienen CU-034/CU-035 y cobertura restante diferidos; no cierran Etapa 3. | Satisfecho. |

## Evidencia automatizada

El detalle reproducible permanece en el informe. La evidencia aprobada incluye:

- sintaxis Functions inicial `363/363` y, tras la composición de Grupo, `364/364`;
- suite unitaria consolidada de implementación `371/371`;
- unitarias focales del correctivo UAT-01 `4/4`;
- Emulator focal E3-02 con Auth, Firestore y Functions locales `20/20`;
- unitarias focales de presentación/arquitectura `8/8`;
- Emulator focal de obligaciones propias `12/12`, con dos Grupos y uno archivado;
- typecheck, lint baseline y build Next.js aprobados;
- `git diff --check` aprobado;
- recorrido HTTP real de callables con clientes Auth sintéticos;
- idempotencia, carreras de slots, pérdida de autorización entre páginas, privacidad negativa,
  lifecycle, legacy/period-aware, A → B → A y regresión focal E3-01.

El caso Owner sin Persona fue acreditado exclusivamente de forma automatizada: lista, concede y
revoca por Cuenta y ownership, antes y después de crear Persona. No se le atribuye ejecución humana.

No se repitieron suites ni Emulator para este cierre documental porque no hubo cambios funcionales
posteriores al commit verificado.

## Evidencia humana y correctivo UAT-01

UAT-01 se bloqueó inicialmente con dos mensajes sucesivos. La consulta Owner exigía indebidamente
Persona y luego trataba como inaccesible un Grupo legacy sin `ownershipRevision`. El correctivo separó
la autorización Owner por Cuenta del contexto delegado Cuenta–Persona e inicializó la revisión de
forma idempotente. La re-UAT confirmó que el Owner actual concede y revoca; no se extiende esa
confirmación humana al caso Owner sin Persona.

La evidencia humana registrada además confirma:

- UAT-02: consulta delegada sin controles de escritura;
- UAT-03: pérdida de acceso después de revocar. El integrante nunca autorizado tiene evidencia
  automatizada, no humana;
- UAT-04: múltiples tesoreros y cargo independiente de permisos;
- UAT-05 a UAT-08: recorridos confirmados según el informe;
- aprobación visual de **“Ver cobros específicos”**;
- nombre correcto del Grupo en **Mis obligaciones**.

La conservación del nombre para Grupo archivado, la ausencia de `groupId` y la privacidad de otro
integrante permanecen demostradas automáticamente, sin atribuir observación humana adicional.

## Fuente de verdad, retiro y deuda aceptada

La concesión durable es la única fuente de autorización `GROUP_TREASURY`; cargo, Membresía, Pago y
roles globales no conceden esa capacidad. E3-02 no sustituyó una capacidad delegada anterior, por lo
que no existían lectores o writers previos de Tesorería que retirar. El retiro económico legacy es un
gate de Etapa 3 y permanece pendiente; este cierre no lo adelanta ni lo satisface.

D5-045 continúa como riesgo residual no resuelto. Su no reproducción durante los gates E3-02 no
determina causa, no elimina el riesgo y no autoriza producción. Tampoco se reabre E2-14 por rutina.

## Checkpoint, rollback y dependencias

El checkpoint anterior a la implementación es
`5b9b90d928b07652106c865131fe5f103e1342df`. La implementación y su integración están identificadas
por los commits consignados en Estado.

No hubo deploy, migración ni modificación remota de datos. El rollback disponible es revertir el merge
`079aa17702ecc1f526ef4eb6b896534a176b571c` —o el commit funcional antes de integrar— y reconstruir
artefactos locales. No se propone doble escritura, borrado de grants, alteración de tombstones ni
reparación de Membresías como rollback.

Dependencias satisfechas: E3-01 y sus readers/DTOs, Grupo con `ownershipRevision`, capacidades
públicas mínimas de Grupo, Cuenta/Persona y Membresía, Temporada abierta y Firebase Emulator local.
Dependencias preservadas para continuidad: cualquier capacidad de escritura o perfil configurable
requiere definición normativa propia; E3-03 no hereda autorización por analogía.

## Continuidad

E3-03 queda habilitado únicamente para definición. Su alcance deberá decidirse y autorizarse de forma
separada, sin ampliar `GROUP_TREASURY`, sin asumir validación de dinero y sin incorporar permisos
restantes por inferencia.

Etapa 3 permanece abierta. Conserva el gate de retiro de autoridad económica legacy en
participaciones, equipos e inscripciones, además de las deudas y exclusiones registradas.

## Veredicto

`E3-02 CERRADO — E3-03 HABILITADO ÚNICAMENTE PARA DEFINICIÓN`
