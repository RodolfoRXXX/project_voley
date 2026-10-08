# DEC-E3-02 — Delegación mínima de Tesorería y consulta económica

## Estado

- **Decisión:** `ADOPTADA POR EL USUARIO`.
- **Fecha de preparación:** 2026-10-08.
- **Base:** `dev` en `31a59fb4e648822dcc1722d5306bacb8d95c9e8c`.
- **Ficha:** [E3-02](./E3-02-ficha-delegacion-tesoreria-consulta-economica.md).
- **Normativa asociada:** [addendum E3-02](../../arquitectura/Documento-2-3-4-addendum-E3-02-tesoreria-consulta.md).
- **Decisión de Documento 5:** D5-047.

Esta decisión adopta el corte funcional y normativo E3-02. Su formalización local no autoriza
implementación, configuración, pruebas, deploy ni integración productiva.

## 1. Contexto

DEC-E2-25/D5-043 difirió CU-034–CU-038 hasta la primera capacidad real delegable. E3-01 creó las
consultas económicas Owner/propias y DEC-E3-01/D5-046 ubicó a E3-02 como delegación mínima de
Tesorería. El cargo descriptivo continúa sin efecto autorizante.

La primera necesidad real es permitir que integrantes seleccionados consulten economía del Grupo,
sin registrar o validar dinero y sin crear un sistema general de roles.

## 2. Decisión adoptada

Adoptar `GROUP_TREASURY` como capacidad fija, privada, contextual y exclusivamente read-only.

El Owner vigente de un Grupo activo puede concederla o revocarla individualmente a cero o varias
Cuentas cuya Persona posea Membresía activa e íntegra del Grupo en la Temporada exacta abierta. La
activación vigente se acredita por capacidad pública de Membresía mediante Período real para formas
period-aware o ancla legacy compatible derivada de fechas autoritativas. Conceder a una forma legacy
compatible no materializa Períodos, no migra y no repara. Debe existir un único vínculo canónico
Cuenta–Persona.

La capacidad permite consultar conceptos, ocurrencias y obligaciones E3-01 de todo el Grupo,
incluida historia de exintegrantes y presentación mínima autorizada. Excluye roster, candidatos,
mutaciones y datos técnicos.

Finalización invalida; reactivación no revive; renovación no hereda; cambio de Owner invalida; A → B
→ A no revive; archivo impide acceso delegado. Toda nueva autoridad requiere otra concesión.

## 3. D5-043 y casos de uso

La decisión satisface la condición de reapertura de D5-043 para la primera capacidad real
delegable:

- CU-036 y CU-037 reciben cobertura focal;
- CU-038 recibe cobertura parcial por permiso fijo sin configuración runtime;
- CU-034 y CU-035 permanecen sin implementación;
- no se declaran resueltos todos los CU-034–CU-038.

No se requiere un perfil configurable. La identidad estable es la capacidad fija y cada concesión
durable. Una futura capacidad no se incorpora por analogía.

## 4. Dependencia técnica mínima

El Grupo actual sólo conserva `ownerId`; no posee un ancla que distinga A → B → A. Antes de
implementar E3-02, Grupo deberá exponer una revisión de ownership positiva y monotónica:

- materialización inicial idempotente, sin cambiar Owner;
- lectura por capacidad pública;
- preservación exacta por todos los writers canónicos existentes de Grupo;
- renombre, archivo y ediciones ordinarias no borran, reinician ni incrementan la revisión;
- futura transferencia, si alguna vez se define, cambia Owner e incrementa revisión atómicamente;
- sin historial general ni implementación de transferencia en E3-02.

Cada grant fija la revisión y cada consulta/página la compara. Contextos incompatibles fallan
cerrado. Esta tarea no implementa la evolución. Solamente una futura transferencia canónica puede
incrementarla junto con `ownerId`.

## 5. Efecto del cierre de Temporada

E2-15 exige cero Membresías activas y prohíbe que `closeSeason` las finalice en cascada. Por tanto,
la finalización previa ya vuelve ineficaz la concesión. E3-02 no promete una Temporada cerrada con
Membresía activa canónica y no crea consulta histórica para ex-tesoreros.

## 6. Persistencia y autorización

La concesión es fuente de verdad separada de cargo, Membresía y Pago. Grant, slot y receipt forman la
unidad confirmatoria de cada comando. Una nueva concesión sustituye el puntero de un slot ineficaz,
pero crea otro grant y conserva historia.

Los readers E3-01 se reutilizan con autorización contextual. Cada operación y página revalida
Cuenta–Persona, Grupo activo, Owner/revisión, Membresía/vigencia y Temporada abierta. Firestore
permanece deny-all para cliente.

## 7. Registro en Documento 5

Documento 5 registra esta decisión como D5-047, sin modificar D5-043–D5-046.

### 7.1 Párrafo de continuidad en Etapa 3

> E3-02 incorpora la primera capacidad real delegable mediante `GROUP_TREASURY`, fija y
> exclusivamente de lectura. El Owner vigente concede y revoca individualmente a integrantes con
> Cuenta–Persona única, Membresía activa e íntegra, activación vigente acreditada por Período real
> period-aware o ancla legacy de fechas autoritativas, y Temporada exacta abierta. La capacidad consulta
> conceptos, ocurrencias y obligaciones E3-01 de todo el Grupo, incluida historia de exintegrantes,
> y excluye roster, candidatos, mutaciones y datos técnicos. Finalización, renovación, cambio de
> ownership y archivo impiden herencia o continuidad; reactivación y retorno al Owner original no
> reviven concesiones. Las futuras escrituras requieren decisión y capacidad propias.

### 7.2 Fila registrada

| ID | Decisión | Estado | Alcance | Consecuencia |
| --- | --- | --- | --- | --- |
| `D5-047` | E3-02 adopta `GROUP_TREASURY` read-only y el addendum consolidado; satisface D5-043 sólo para esta capacidad delegable | `APROBADA` | Etapa 3 / E3-02 / CU-036–038 parcial | La ficha queda lista para implementar con autorización separada; CU-034–035 y cobertura restante continúan pendientes |

### 7.3 Actualización de la decisión abierta sobre roles

La formulación general “Diseño concreto de roles...” queda acotada así:

> `GROUP_TREASURY` queda definido para E3-02 sin RBAC general. Perfiles configurables, creación y
> edición de roles y cualquier capacidad adicional permanecen abiertos hasta una necesidad real y
> no se infieren de esta decisión.

## 8. No efectos

Esta decisión no:

- autoriza implementación, Rules, índices, pruebas, Emulator, deploy o Git de escritura;
- crea RBAC general ni resuelve todos los CU-034–CU-038;
- implementa transferencia de ownership;
- registra/valida dinero o habilita E3-03;
- habilita liquidación prearchivo;
- altera D5-044, D5-045, Auth/UAT o E2-14;
- cierra Etapa 3.

## Resultado

`DECISIÓN ADOPTADA — D5-047 — E3-02 FORMALIZADA — IMPLEMENTACIÓN NO AUTORIZADA`
