# Addendum a Documentos 2, 3 y 4 — E3-10 / retiro de economía legacy de Torneos

## Estado

- **Naturaleza:** complemento normativo focal adoptado.
- **Decisiones incorporadas:** `E3-10-D01=A`, `D02=A`, `D03=A`, `D04=A`, `D05=A`.
- **Estado documental:** `ADOPTADO POR D5-057`.
- **Implementación:** no autorizada.
- **Documento 5:** continuidad, decisión y referencias E3-10 integradas por `D5-057`.
- **Base comprobada:** `dev` en `7d8b0aed951f6ad0004d8c8c08a5c6dc4fbb3a07`.
- **Paquete:** [ficha E3-10](../implementacion/etapa-3/E3-10-ficha-retiro-economia-legacy-torneos.md)
  y [DEC-E3-10](../implementacion/etapa-3/DEC-E3-10-retiro-economia-legacy-torneos.md).

Este addendum complementa sólo los extremos efectivamente afectados:

- Documento 2, por el comportamiento funcional de Torneos, inscripciones y equipos;
- Documento 3, por el límite de autoridad entre Torneo y Pago y las colaboraciones inexistentes;
- Documento 4, por contratos, persistencia, Rules, triggers, reconciliación y evidencia técnica.

Documentos 1/1.5 no cambian: E3-10 no crea ni redefine Agregados, Entidades, Value Objects o eventos de
dominio. Documento 5 permanece intacto. Este addendum no autoriza código, pruebas, Emulator, Rules,
configuración, dependencias, Firebase remoto, deploy o rollout.

## 1. Complemento funcional para Documento 2

### 1.1 Resultado funcional

Torneos, inscripciones y equipos dejan de ofrecer gestión económica legacy. Crear o editar un
Torneo, solicitar/revisar una inscripción, completar roster, aceptar/rechazar un equipo, cerrar
inscripciones y continuar el recorrido competitivo no crea ni administra una obligación económica.

Se retiran de la experiencia:

- precio o pago por jugador;
- total esperado, importe pagado y saldo pendiente;
- estados `pendiente | parcial | pagado` cuando describen pago;
- confirmación o carga incremental de pago;
- badges, contadores, mensajes, readiness y acciones decididos por economía;
- alertas de pago pendiente o parcial.

La ausencia de funcionalidad no significa “gratis”, “pagado”, “sin deuda” o “condonado”. Una futura
función económica de Torneos requerirá una nueva decisión funcional; E3-10 no deja placeholder o
asociación parcial con Pago.

### 1.2 Recorrido deportivo preservado

Continúan, bajo sus contratos existentes:

- identidad, descripción, deporte, formato y fechas del Torneo;
- administración y lifecycle de Torneo e inscripciones;
- mínimos/máximos de equipos y jugadores;
- solicitud de inscripción y estados deportivos `pendiente | aceptado | rechazado`;
- nombre, roster e identidad subordinada del equipo;
- aceptación, rechazo, cupo y `acceptedTeamsCount`;
- fases, grupos, fixture, partidos, reglas de sets/puntos, resultados, standings, avance y podio;
- alertas de aceptación, rechazo y roster incompleto.

El pago deja de bloquear visualmente la aceptación. E3-10 no agrega por compensación un gate
deportivo nuevo ni corrige la divergencia preexistente entre validaciones UI/backend salvo retirar
la condición económica.

### 1.3 Presentación e incompatibilidad visible

Los clientes nuevos omiten campos económicos. Un cliente antiguo que los envíe a un callable mixto
recibe rechazo completo y no obtiene una operación deportiva parcial. El callable exclusivamente
económico conserva una señal estable de capacidad retirada.

No se garantiza compatibilidad funcional con pantallas antiguas que esperaban registrar pago. La
incertidumbre externa se resuelve antes del rollout con evidencia disponible, sin presumir ausencia
ni exigir búsqueda indefinida.

## 2. Complemento de autoridad y módulos para Documento 3

### 2.1 Autoridades posteriores al retiro

| Concepto | Autoridad |
| --- | --- |
| Torneo, fases y estado competitivo | Torneo y sus contratos deportivos vigentes |
| inscripción y decisión deportiva | contratos deportivos de inscripción/Torneo |
| equipo y roster del Torneo | equipo subordinado y contratos deportivos vigentes |
| obligación, saldo, ingreso y estado económico canónico | Pago/Recepción sólo cuando existen por casos E3 autorizados |
| campos económicos históricos de Torneo/inscripción/equipo | ninguna; datos legacy inertes |
| alerta económica histórica resuelta | proyección histórica sin autoridad operativa |

Torneo, inscripción y equipo dejan de administrar economía. Pago no adopta automáticamente datos,
identidades o responsabilidad desde esas estructuras.

### 2.2 Colaboraciones inexistentes

E3-10 no crea:

- capability o servicio Torneo → Pago o Pago → Torneo;
- referencia Inscripción/Equipo–Pago;
- obligación, concepto, ocurrencia, Entrega, Recepción, aplicación, ingreso o Movimiento;
- evento de deuda, cobro, pago o condonación;
- repositorio o unidad de consistencia compartida;
- doble escritura, sincronización o proyección económica;
- vínculo nuevo con Persona, Membresía o Temporada.

Aceptar un equipo, editar roster o cambiar lifecycle no consulta Pago. Operar un Pago existente no
modifica Torneo, inscripción o equipo.

### 2.3 Historia y fuentes

Los valores legacy no se convierten en hechos de dominio o integración. Readers deportivos toleran
presencia o ausencia, pero no exponen ni ramifican decisiones a partir de economía histórica.

Una operación deportiva puede modificar roster, estado, conteos, relaciones y timestamps bajo su
contrato. Esa mutación no concede permiso para cambiar los campos económicos históricos, cuya
proyección antes/después debe permanecer idéntica.

## 3. Complemento de diseño de software para Documento 4

### 3.1 Persistencia compatible

Campos económicos retirados:

| Colección | Campos |
| --- | --- |
| `tournaments` | `paymentForPlayer`, `settings.paymentPerPlayer` |
| `tournamentRegistrations` | `paymentForPlayer`, `expectedAmount`, `paidAmount`, `pendingAmount`, `paymentStatus`, `paymentDate`, `paymentVerifiedBy`, `paymentVerifiedAt` |
| `tournamentTeams` | `paymentForPlayer`, `expectedAmount`, `paidAmount`, `pendingAmount`, `paymentStatus`, `paymentDate`, `paymentVerifiedBy`, `paymentVerifiedAt` |

Reglas:

- no hay migración, delete, backfill, normalización o copia a Pago;
- documentos nuevos omiten todos los campos;
- documentos históricos conservan presencia/ausencia, `null`, cero y valores legacy;
- editar configuración deportiva usa paths puntuales y no reconstruye o borra
  `settings.paymentPerPlayer`;
- hydrators y DTO deportivos dejan de proyectar economía;
- no se agregan índices o queries dependientes de esos campos.

### 3.2 Writers y Firestore Rules

| Superficie | Contrato posterior |
| --- | --- |
| `createTournament` | crea configuración deportiva sin precio |
| `editTournament` | edita sólo campos deportivos autorizados; preserva economía histórica |
| `requestTournamentRegistration` | crea inscripción sin economía |
| `reviewTournamentRegistration` | acepta/rechaza y crea/rechaza equipo sin economía |
| writer frontend de roster | escribe sólo `playerIds`, `teamMembersCount`, `updatedAt` |
| `updateTournamentRegistrationPayment` | tombstone sin éxito ni efectos |

Rules de `tournamentRegistrations` y `tournamentTeams` conservan el perímetro de administración de
Grupo y permiten sólo `playerIds`, `teamMembersCount` y `updatedAt`. Create/delete permanece cerrado.
Agregar, modificar o eliminar un campo económico histórico desde cliente debe fallar.

### 3.3 Contrato exacto de callables mixtos

Campos retirados y orden canónico:

```text
createTournament: paymentForPlayer, settings.paymentPerPlayer
editTournament: paymentForPlayer, settings.paymentPerPlayer
reviewTournamentRegistration: paymentStatus, paidAmountInput
```

Ausencia permite continuar. Presencia propia con `null`, cero, `undefined` interno o cualquier otro
valor/tipo rechaza el request completo. Para la ruta anidada sólo cuenta la presencia de la clave
`paymentPerPlayer` dentro de `settings`. Varios campos se devuelven sin duplicados y en el orden
anterior.

```text
Firebase code = failed-precondition
message = "La gestión económica de Torneos fue retirada"
details = {
  code: "TOURNAMENT_ECONOMY_RETIRED",
  fields: [<rutas presentes en orden canónico>]
}
```

Precedencia:

1. `createTournament`: Auth → autorización global → presencia económica → validación deportiva →
   escritura.
2. `editTournament`: Auth → envelope/ID → existencia/autorización de Torneo → presencia económica →
   validación deportiva/lifecycle → escritura.
3. `reviewTournamentRegistration`: Auth → autorización global → localizadores → existencia y
   autorización de Torneo → presencia económica → validación deportiva restante → mutación/eventos.

No comienza una transacción de escritura ni se emite un evento antes del rechazo económico. Los
requests nuevos que omiten los campos continúan normalmente.

### 3.4 Tombstone exacto

`updateTournamentRegistrationPayment` conserva el export y evalúa:

```text
1. Cuenta autenticada
2. autorización global administrativa
3. registrationId string no vacío
4. source ausente o registration | team
5. existencia del registro y Torneo
6. autorización administrativa sobre el Torneo
7. rechazo terminal
```

`paidAmountToAdd` no se valida ni interpreta después del retiro.

```text
Firebase code = failed-precondition
message = "La gestión económica de inscripciones de Torneo fue retirada"
details = { code: "TOURNAMENT_REGISTRATION_PAYMENT_RETIRED" }
```

El tombstone no devuelve éxito, no lee importes, no escribe, no publica eventos y no activa alertas.
Errores anteriores conservan precedencia. D5-044 no se modifica ni fundamenta este contrato.

### 3.5 Triggers compartidos

Los triggers sobre `tournaments`, `tournamentRegistrations` y `tournamentTeams` continúan porque
sostienen proyecciones deportivas. Se retiran exclusivamente:

- lectura de `paymentStatus` y `pendingAmount`;
- decisión de alerta por pago;
- creación/reactivación de `group_tournament_team_payment_pending`;
- metadata y logging económicos que sólo sirven a ese kind.

Se preservan sincronización, resolución y mensajes de alertas deportivas. No se retira un trigger
completo por compartir una rama económica.

### 3.6 Reconciliación idempotente de alertas

El mecanismo de rollout filtra exactamente `kind == group_tournament_team_payment_pending` y estado
activo. Sólo cambia `status` a `resolved` y `updatedAt`; preserva contenido restante. Una alerta ya
resuelta y una repetición son no-op.

Debe comprobarse que no cambian los kinds:

- `group_accepted_in_tournament`;
- `group_rejected_from_tournament`;
- `group_tournament_team_missing_players`;
- cualquier otro kind no económico.

El reconciliador procesa lotes en orden estable y registra conteos y el último cursor completado en
un manifiesto operativo. Puede reanudar desde ese cursor o reiniciar desde el comienzo sin duplicar
efectos. Ante un fallo detiene nuevos lotes, conserva el manifiesto y no revierte lotes confirmados.
Su diseño y pruebas con datos sintéticos pertenecen a implementación local; inspección y mutación de
datos remotos sólo al rollout autorizado.

### 3.7 Concurrencia, atomicidad y recovery

- un callable mixto con economía falla antes de escribir deporte;
- un request puramente deportivo conserva transacciones y coordinación existentes;
- el tombstone es repetible: siempre error y cero efectos para actor autorizado;
- el reconciliador es reejecutable y no transforma alertas deportivas;
- no se incorpora intent, receipt o recovery económico nuevo.

## 4. Evidencia normativamente exigida

Estas pruebas se definen; no se crean ni ejecutan en este paquete.

### 4.1 Cierre técnico local integrado

1. búsqueda estructural demuestra cero readers/writers económicos productivos, salvo tombstone y
   fixtures/aserciones negativas identificadas;
2. cada callable mixto cubre ausencia, `null`, cero, otros valores, múltiples campos, orden estable y
   precedencias de Auth/autorización;
3. no hay efectos parciales ante rechazo económico;
4. nuevas raíces deportivas omiten economía;
5. Rules permiten roster y rechazan agregar, modificar o eliminar economía;
6. aceptación/rechazo y `acceptedTeamsCount` conservan comportamiento deportivo focal;
7. triggers no producen economía y conservan alertas deportivas;
8. reconciliador local es idempotente, preserva contenido y no toca kinds deportivos;
9. UI afectada no presenta economía ni equivalencias “gratis/pagado”;
10. la proyección de campos económicos de cada documento histórico es idéntica antes/después, aunque
    roster, estado o timestamps deportivos cambien legítimamente;
11. snapshots de raíces de Pago demuestran cero creación, modificación o eliminación;
12. typecheck, build, lint contra baseline y suites focales aprueban;
13. regresión deportiva se limita a creación/edición/apertura, solicitud/roster, aceptación/rechazo,
    conteo/cierre de inscripciones, alertas deportivas y vistas afectadas.

No se exige acceso remoto, inventario remoto, reconciliación real o decisión operativa final sobre
clientes externos para comenzar o completar esta evidencia local.

### 4.2 UAT previa a habilitación

UAT humana debe confirmar:

- alta/edición de Torneo sin precio;
- inscripción y roster sin importes/estados económicos;
- aceptación/rechazo deportivo conservado;
- ausencia de UI, mensajes, contadores y alertas económicas;
- ausencia de equivalencia “sin economía = gratis/pagado”;
- continuidad de las rutas deportivas focales.

La UAT no queda aprobada por pruebas automatizadas ni por ausencia de navegación.

### 4.3 Rollout y operación remota

Con autorización separada:

1. identificar ambiente/versiones;
2. inspeccionar alertas económicas activas;
3. resolver compatibilidad externa con evidencia disponible mediante aviso, compatibilidad adicional
   acotada o aceptación de riesgo;
4. desplegar frontend, Functions y Rules coordinados;
5. verificar tombstone remoto;
6. ejecutar/verificar reconciliación;
7. comprobar ausencia de nueva economía y preservación histórica;
8. ejecutar smoke/UAT aprobada;
9. registrar rollback sin reactivar economía.

No se exige una búsqueda externa indefinida. La ausencia de consumidores internos no prueba ausencia
externa.

## 5. Separación propia de cierre y producción

E3-10 distingue por decisión propia:

- **cierre técnico local integrado**, satisfecho sólo por §4.1; y
- **habilitación productiva**, que exige adicionalmente §4.2 y §4.3.

Esta separación no deriva de D5-056 y no la extiende. D5-056 continúa exclusiva de E3-09. Cerrar el
alcance local de E3-10 no autoriza usuarios, no acredita retiro remoto y no convierte UAT o rollout
en opcionales.

## 6. Preservaciones, exclusiones y gate residual

- Pago, Recepción y capacidades E3 anteriores no cambian.
- No se crea asociación retrospectiva ni nueva autoridad deportiva.
- Documentos 1/1.5 permanecen sin modificación. Documento 5 recibe sólo continuidad, decisión y
  referencias E3-10 mediante `D5-057`.
- D5-044 se preserva y D5-056 no se amplía.
- No se crea proyección pública ni se adelanta E4.
- No se revalida integralmente Torneos.
- UAT y rollout pendientes de E3-09 continúan sin cambios.
- Este addendum no cierra el gate económico completo ni Etapa 3.

## 7. Integración documental

Ficha, DEC y este addendum fueron revisados conjuntamente sin contradicciones sustantivas y quedan
adoptados por `D5-057`. La integración deja el incremento listo para solicitar una autorización
separada de implementación; no autoriza código, pruebas, Emulator, acceso remoto o rollout.

## Resultado

**ADDENDUM E3-10 ADOPTADO POR D5-057 — LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA**
