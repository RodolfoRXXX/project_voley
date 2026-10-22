# DEC-E3-10 — Retiro de economía legacy de Torneos sin reemplazo

## Estado

- **Decisiones funcionales aprobadas:** `E3-10-D01=A`, `D02=A`, `D03=A`, `D04=A`, `D05=A`.
- **Aprobación funcional:** recibida por instrucción expresa el 2026-10-22.
- **Estado documental:** `ADOPTADA POR D5-057`.
- **Estado del incremento:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **Documento 5:** continuidad, decisión y referencias E3-10 integradas por `D5-057`.
- **Base comprobada:** rama `dev`, HEAD `7d8b0aed951f6ad0004d8c8c08a5c6dc4fbb3a07`, limpia
  antes de crear el paquete.

Paquete relacionado: [ficha E3-10](./E3-10-ficha-retiro-economia-legacy-torneos.md) y
[addendum a Documentos 2/3/4](../../arquitectura/Documento-2-3-4-addendum-E3-10-retiro-economia-legacy-torneos.md).

Esta DEC registra las decisiones funcionales aprobadas y queda adoptada por `D5-057` luego de la
revisión conjunta del paquete. Código, pruebas, Emulator, Rules y demás implementación local
requieren autorización separada. Reconciliación real, acceso remoto, deploy y rollout requieren una
autorización productiva posterior.

## 1. Contexto y problema

La economía legacy de Torneos posee autoridad distribuida en:

- `tournaments.paymentForPlayer` y `tournaments.settings.paymentPerPlayer`;
- importe, saldo, estado y verificación de pago en `tournamentRegistrations` y `tournamentTeams`;
- writers backend, un writer frontend directo y Firestore Rules;
- UI administrativa y de Grupo;
- view-models de readiness y gates visuales de aceptación;
- alertas persistidas `group_tournament_team_payment_pending`;
- el callable público `updateTournamentRegistrationPayment`.

El backend no exige pago para aceptar una inscripción, aunque la UI sí lo usa como gate. Los campos
legacy no son Pago canónico ni prueban obligación, ingreso, saldo o recepción. Construir ahora una
relación Torneo/Inscripción/Equipo–Pago o migrar esos valores inventaría semántica no aprobada.

## 2. Resultado aprobado

Se retira toda autoridad y funcionalidad económica legacy de Torneos, inscripciones y equipos sin
reemplazo vinculado a Pago.

Consecuencias obligatorias:

1. Torneo, inscripción y equipo quedan exclusivamente deportivos dentro de este corte.
2. Nuevos documentos no contienen los campos económicos inventariados por la ficha.
3. Ningún reader, writer, UI, Rule, trigger, alerta o gate productivo decide economía desde ellos.
4. No se crean Pago, concepto, ocurrencia, obligación, Entrega, Recepción, aplicación, ingreso,
   Movimiento, saldo ni asociación retroactiva.
5. Los campos históricos permanecen físicamente intactos e inertes.
6. No se presenta la ausencia de economía como “gratis”, “pagado”, “sin deuda” o equivalente.
7. No se rediseñan Torneo, inscripción, equipo, fixture, resultados o standings.

## 3. Decisiones aprobadas

### 3.1 E3-10-D01=A — Tombstone económico estable

`updateTournamentRegistrationPayment` conserva temporalmente su export como tombstone.

Orden exacto:

1. Cuenta autenticada;
2. autorización global administrativa vigente del callable;
3. `registrationId` string no vacío y `source` ausente o `registration | team`;
4. existencia del registro y Torneo y autorización administrativa vigente sobre el Torneo;
5. rechazo terminal.

`paidAmountToAdd` ya no se valida ni interpreta. Ausente, `null`, cero o cualquier otro valor recibe
el mismo error después de superar los pasos anteriores.

Respuesta terminal exacta:

```text
Firebase code: failed-precondition
message: La gestión económica de inscripciones de Torneo fue retirada
details.code: TOURNAMENT_REGISTRATION_PAYMENT_RETIRED
```

El tombstone nunca devuelve éxito, no lee importes para decidir, no escribe recursos ni publica
eventos. Errores de autenticación, localización o autorización conservan precedencia. Una futura
desexportación requiere decisión separada.

D5-044 no incluye ni protege este callable y no se modifica. La conservación se decide dentro de
E3-10 por compatibilidad externa incierta.

### 3.2 E3-10-D02=A — Rechazo atómico en callables mixtos

Campos retirados:

| Callable | Rutas de input retiradas, en orden canónico |
| --- | --- |
| `createTournament` | `paymentForPlayer`, `settings.paymentPerPlayer` |
| `editTournament` | `paymentForPlayer`, `settings.paymentPerPlayer` |
| `reviewTournamentRegistration` | `paymentStatus`, `paidAmountInput` |

Regla por presencia propia:

- ausente: continúa el recorrido deportivo;
- presente con `null`, cero, `undefined` interno o cualquier tipo/valor: rechazo;
- `settings.paymentPerPlayer` cuenta sólo cuando la clave anidada está presente;
- varios campos se informan sin duplicados en el orden canónico de la tabla.

Respuesta exacta:

```text
Firebase code: failed-precondition
message: La gestión económica de Torneos fue retirada
details.code: TOURNAMENT_ECONOMY_RETIRED
details.fields: [<rutas económicas presentes en orden canónico>]
```

No se ejecuta parcialmente la parte deportiva. La detección ocurre después de autenticación y
autorización y antes de toda transacción, escritura o evento.

Precedencia por callable:

1. `createTournament`: autenticación → autorización global → presencia económica → validación
   deportiva → escritura.
2. `editTournament`: autenticación → envelope/`tournamentId` → existencia y autorización sobre
   Torneo → presencia económica → validación deportiva/lifecycle → escritura.
3. `reviewTournamentRegistration`: autenticación → autorización global → localizadores
   `registrationId`/`source` → existencia y autorización sobre Torneo → presencia económica →
   validación deportiva restante → mutación/eventos deportivos.

`requestTournamentRegistration` no recibe economía. Continúa como callable deportivo y deja de
crear campos económicos.

### 3.3 E3-10-D03=A — Retiro y reconciliación de alertas económicas

Los triggers dejan de crear o reactivar `group_tournament_team_payment_pending`. Conservan sus ramas
de aceptación, rechazo y jugadores faltantes.

Durante un rollout autorizado, una reconciliación idempotente:

1. selecciona sólo el kind económico exacto en estado activo;
2. actualiza únicamente `status = resolved` y `updatedAt`;
3. preserva todo contenido histórico restante;
4. hace no-op sobre resueltas y al repetirse;
5. no toca kinds deportivos;
6. registra candidatas, resueltas, ya resueltas, omitidas y fallidas;
7. procesa lotes en orden estable y registra el último cursor completado en un manifiesto operativo;
8. puede reanudar desde ese cursor o reiniciar sin duplicar efectos;
9. ante un fallo detiene nuevos lotes, conserva el manifiesto y no revierte los ya confirmados;
10. verifica ausencia posterior de alertas económicas activas y no cambio de alertas deportivas.

El reconciliador se diseña y prueba localmente con datos sintéticos. Inspeccionar datos remotos y
ejecutarlo pertenecen al rollout y no bloquean el comienzo de implementación local.

### 3.4 E3-10-D04=A — Cierre local propio y habilitación productiva

E3-10 adopta una separación propia entre:

1. **cierre técnico local integrado:** requiere código versionado, Rules, pruebas locales, Emulator,
   regresión focal, evidencia de arquitectura y preservación histórica local; y
2. **habilitación productiva:** requiere además UAT aprobada, rollout autorizado, reconciliación
   ejecutada/verificada y resolución operativa de compatibilidad externa.

Esta decisión no adopta, reutiliza ni extiende D5-056. D5-056 permanece exclusivo de E3-09. El
cierre local de E3-10 no autoriza exposición a usuarios ni acredita retiro remoto.

### 3.5 E3-10-D05=A — Compatibilidad externa bajo evidencia disponible

Se conserva el tombstone y se documenta que clientes antiguos de callables mixtos se vuelven
incompatibles si envían campos retirados. No se presume ausencia de consumidores externos ni se
exige una búsqueda indefinida o exhaustiva imposible.

Antes del rollout debe registrarse, con evidencia disponible, una decisión operativa explícita entre:

- aviso;
- compatibilidad adicional acotada que no restaure economía; o
- aceptación del riesgo residual.

Esa resolución, cualquier inspección remota y una ventana de observación eventual son gates de
rollout, no de acceso a la implementación local.

## 4. Persistencia, Rules y writers

### 4.1 Historia

No hay delete, backfill, normalización, reescritura o migración a Pago. Para cada documento histórico
se compara antes/después la proyección exacta de campos económicos definida en la ficha, preservando
diferencias entre ausente, `null`, cero y otros valores legacy.

No se exige igualdad del documento completo. Operaciones deportivas pueden modificar legítimamente
roster, `teamMembersCount`, estado, `acceptedTeamsCount`, relaciones deportivas, actores deportivos y
timestamps autorizados. Los campos económicos históricos no cambian.

### 4.2 Nuevos writers

- crear/editar Torneo no valida ni escribe precio;
- editar configuración deportiva anidada no reconstruye ni borra el alias histórico económico;
- solicitar inscripción y crear equipo omiten todos los campos económicos;
- review acepta/rechaza sin cálculos o copias económicas;
- editar roster escribe sólo `playerIds`, `teamMembersCount` y `updatedAt`.

### 4.3 Rules

El allowlist cliente de `tournamentRegistrations` y `tournamentTeams` queda limitado a
`playerIds`, `teamMembersCount` y `updatedAt`, conservando autenticación, existencia de Grupo y
administración del Grupo. Los campos económicos existentes quedan inmutables desde cliente: no
pueden agregarse, modificarse ni eliminarse. Create/delete continúa cerrado.

## 5. Reglas deportivas preservadas y regresión acotada

Se conservan identidad y administración de Torneo, formatos, fechas, cupos, roster, lifecycle,
aceptación/rechazo, fases, fixture, resultados, standings, avance y podio. E3-10 no agrega gates de
suplentes, elegibilidad, Persona, Membresía, Temporada o ranking.

La regresión deportiva exigida se limita a:

- crear/editar Torneo y abrir inscripciones;
- solicitar inscripción y editar roster bajo Rules;
- aceptar/rechazar inscripción, crear/rechazar equipo y actualizar `acceptedTeamsCount`;
- cerrar inscripciones como dependencia inmediata del conteo aceptado;
- alertas de aceptación, rechazo y jugadores faltantes;
- lista/detalle administrativo y perfil afectados.

No se revalida integralmente fixture, resultados, standings, avance, podio o finalización salvo que el
diff futuro toque código compartido o demuestre una dependencia nueva.

## 6. Evidencia técnica para cierre local

Sin crearla o ejecutarla en este paquete, una implementación futura debe demostrar:

1. cero readers/writers económicos productivos, salvo tombstone y fixtures/aserciones negativas;
2. matriz completa de presencia ausente/`null`/cero/otros valores y precedencia para callables mixtos;
3. request y aceptación generan inscripción/equipo sin economía;
4. Rules permiten roster y rechazan agregar, cambiar o borrar economía;
5. tombstone conserva precedencias, error exacto y cero efectos;
6. triggers no crean/reactivan alertas económicas y conservan las deportivas;
7. reconciliador idempotente funciona localmente con datos sintéticos y no toca alertas deportivas;
8. UI afectada no presenta economía ni equivalencias “gratis/pagado”;
9. comparación campo-a-campo conserva economía histórica mientras permite cambios deportivos
   legítimos;
10. snapshots de raíces E3 de Pago prueban cero creación, modificación o eliminación;
11. typecheck, build, lint contra baseline y suites focales aplicables aprueban;
12. regresión deportiva permanece en el perímetro de §5 salvo impacto nuevo demostrado.

El comienzo de implementación local no exige acceso Firebase remoto, inventario remoto de alertas,
ejecución real de reconciliación ni decisión operativa final sobre clientes externos.

## 7. Gates de rollout y habilitación productiva

Un rollout futuro, con autorización propia, debe:

1. identificar ambiente y versiones objetivo;
2. inspeccionar de forma acotada las alertas económicas activas;
3. registrar la resolución operativa de compatibilidad externa bajo D05;
4. desplegar coordinadamente frontend, Functions y Rules;
5. comprobar el tombstone remoto;
6. ejecutar y verificar la reconciliación;
7. confirmar ausencia de nuevos campos/alertas económicos y preservación histórica;
8. ejecutar smoke y UAT humana aprobada;
9. verificar que las acciones deportivas afectadas continúan;
10. registrar rollback que no reactive economía legacy.

No se habilita el recorrido a usuarios antes de UAT y rollout verificados, incluso si el alcance
técnico local ya fue cerrado.

## 8. Exclusiones y gates residuales

- Pago y Recepción no cambian.
- No se crea relación Torneo/Inscripción/Equipo–Pago.
- Documento 5 recibe sólo continuidad, decisión y referencias E3-10 mediante `D5-057`.
- No se modifica D5-044 ni se extiende D5-056.
- No se crea proyección pública de Torneos ni se adelanta E4.
- No se corrigen gaps deportivos ajenos al retiro.
- UAT y rollout de E3-09 permanecen pendientes.
- E3-10 no cierra el gate económico completo ni Etapa 3.

## Resultado

**DEC-E3-10 ADOPTADA POR D5-057 — LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA**
