# Ajustes necesarios para que cada tipo de torneo respete las reglas definidas

Este documento describe, por tipo de torneo, qué cambios habría que realizar en **backend** y **frontend** para que el sistema se comporte de acuerdo con las reglas funcionales esperadas.

El objetivo es que sirva como guía de implementación y seguimiento a medida que se vayan resolviendo los desvíos detectados en la lógica actual.

---

## 1. Torneo de Liga (todos contra todos / round robin)

> Estado actualizado: **implementado** en backend + frontend.
> Se genera todo el fixture desde el inicio con metadata por vuelta/jornada, la tabla queda como fuente de verdad del campeón y la UI de liga ya no muestra grupos.

### Reglas funcionales objetivo
- No debe haber grupos.
- Todos los equipos juegan contra todos.
- La cantidad de enfrentamientos entre cada par de equipos debe depender de la cantidad de rondas configuradas.
- Los partidos deben organizarse por **fechas** o **jornadas**, no como una lista plana de cruces.
- Cuando termina una ronda completa, si hay otra ronda configurada, debe organizarse la siguiente.
- Cuando terminan todas las rondas, el campeón debe definirse por tabla de posiciones.

### Backend: qué modificar

#### 1.1. Hacer que la configuración `rounds` impacte realmente en el fixture
**Estado:** ✅ realizado.

Hoy el torneo de liga guarda `rounds`, pero la generación del fixture no replica los cruces según ese valor.

**Cambio necesario:**
- Modificar el generador de fixture de liga para que:
  - con `rounds = 1` cada equipo juegue una vez contra cada rival;
  - con `rounds = 2` juegue ida y vuelta;
  - con `rounds = N` repita el calendario completo N veces.
- El algoritmo debería generar una estructura del tipo:
  - `matchday` / `fecha`
  - `roundCycle` / `vuelta`
  - `matches[]`

#### 1.2. Separar el concepto de “ronda de liga” del concepto de “partido individual”
**Estado:** ✅ realizado.

Hoy el campo `round` termina funcionando como un contador de partidos. En una liga debería representar una **fecha**.

**Cambio necesario:**
- Redefinir el esquema de `tournamentMatches` para almacenar algo como:
  - `matchdayNumber`
  - `roundCycle`
  - `sequence`
- Alternativamente, conservar `round`, pero haciendo que sea la jornada y no el ordinal del partido.
- El generador de fixture debe construir fechas balanceadas (por ejemplo, algoritmo circle method para round robin).

#### 1.3. Permitir avance interno por jornadas sin cambiar de fase
**Estado:** ✅ realizado con generación completa del calendario.

Tu regla funcional habla de terminar una ronda y organizar la próxima. En liga eso no implica cambiar de fase, sino completar la misma fase `round_robin`.

**Cambio necesario:**
- Agregar control de progreso dentro de la fase:
  - cuántas jornadas tiene la vuelta actual;
  - cuántas vueltas faltan;
  - si ya se generó todo el fixture o se genera por bloques.
- Definir si el sistema va a:
  - generar **todo el fixture de una vez**, o
  - generar la siguiente vuelta recién cuando termina la anterior.

**Recomendación técnica:**
- Generar todo el fixture desde el inicio, pero con metadata clara (`matchdayNumber`, `roundCycle`) para simplificar consultas, visualización y carga de resultados.

**Resolución aplicada:**
- El sistema genera el calendario completo al confirmar fixture.
- La fase guarda metadata de fixture generado (`generationMode`, `totalRounds`, `totalMatchdays`).
- La UI calcula progreso por jornadas completadas sin cambiar de fase.

#### 1.4. Mantener la tabla de posiciones como fuente de verdad para el campeón
**Estado:** ✅ realizado.

La lógica de standings ya existe, pero debe quedar formalmente asociada al cierre de toda la fase de liga.

**Cambio necesario:**
- Al completar todos los partidos de la fase `round_robin`, marcar la fase como completada.
- Si no existe una fase siguiente, cerrar el torneo y definir campeón según el primer puesto de standings.
- Si existiera una etapa posterior en un futuro, dejar el cálculo preparado para reutilización.

#### 1.5. Revisar tie-breakers de liga
**Estado:** ✅ realizado.

Si el campeón se define por puntos, hace falta que el orden de la tabla responda exactamente al reglamento esperado.

**Cambio necesario:**
- Formalizar en backend el orden de desempate, por ejemplo:
  1. puntos
  2. diferencia de sets
  3. diferencia de puntos
  4. resultado entre sí
- Si se desea usar reglas configurables, mover esto a una estructura parametrizable en fase o torneo.

### Frontend: qué modificar

#### 1.6. Eliminar cualquier referencia visual a grupos en Liga
**Estado:** ✅ realizado.

Aunque técnicamente la fase ya no usa `group_stage`, la UI todavía arrastra el concepto de grupos.

**Cambio necesario:**
- Ocultar por completo el bloque “Cantidad de grupos” para formato `liga`.
- Ocultar cualquier preview que diga “1 grupo”.
- Mostrar una preview específica de liga, por ejemplo:
  - cantidad de equipos;
  - cantidad de vueltas;
  - cantidad estimada de partidos;
  - cantidad de fechas.

#### 1.7. Mostrar jornadas/fechas de forma explícita
**Estado:** ✅ realizado.

El usuario de una liga necesita leer el fixture por fecha, no por lista general.

**Cambio necesario:**
- Agrupar el fixture visualmente por:
  - vuelta 1 / vuelta 2 / vuelta 3;
  - fecha 1 / fecha 2 / fecha 3.
- En el detalle admin y público, reemplazar el render actual por agrupación por jornadas.

#### 1.8. Mostrar la tabla de posiciones como elemento central
**Estado:** ✅ realizado.

En una liga, la tabla no es secundaria: es el corazón del torneo.

**Cambio necesario:**
- Dar prioridad visual a standings en la fase de liga.
- Agregar indicadores como:
  - líder actual;
  - partidos jugados / pendientes;
  - jornadas completadas.

---

## 2. Torneo de Eliminación Directa (knockout)

> Estado actualizado: **implementado parcialmente con cuadro completo, avance automático y validación estricta de cupos** en backend + frontend.
> Política vigente: **sin byes automáticos**. Para confirmar fixture se exige completar exactamente el tamaño de cuadro definido por `startFrom`.

### Reglas funcionales objetivo
- No debe haber grupos.
- No debe haber fase de liga previa.
- El torneo se juega por cruces eliminatorios.
- El que pierde queda eliminado.
- El cuadro debe avanzar automáticamente hasta la final.
- El campeón surge de ganar todos los partidos necesarios.

### Backend: qué modificar

#### 2.1. Convertir `startFrom` en una configuración operativa real
**Estado:** ✅ realizado.

`startFrom` ahora determina el tamaño del cuadro y se persiste también como `bracketSize` en la fase knockout.

**Resolución aplicada:**
- `final` → 2 equipos
- `semi` → 4 equipos
- `cuartos` → 8 equipos
- `octavos` → 16 equipos
- La validación del fixture ahora exige que la cantidad de equipos aceptados o clasificados coincida exactamente con ese tamaño.
- Se definió política explícita de byes: **no permitidos**.

#### 2.2. Generar un bracket completo, no solo la primera ronda
**Estado:** ✅ realizado.

El generador knockout dejó de crear solo cruces iniciales y ahora arma la llave completa hasta la final.

**Resolución aplicada:**
- Se crean todos los partidos de la llave al confirmar fixture.
- Cada partido puede incluir metadata de dependencia:
  - `roundLabel`
  - `bracketIndex`
  - `sourceHomeMatchId`
  - `sourceAwayMatchId`
  - `sourceHomeSlot`
  - `sourceAwaySlot`
- Los cruces futuros quedan visibles aunque todavía no tengan equipos definidos.

#### 2.3. Implementar avance automático de ganadores
**Estado:** ✅ realizado.

Al registrar resultados de un partido knockout, el sistema ahora propaga automáticamente al ganador al siguiente cruce correspondiente.

**Resolución aplicada:**
- El ganador se copia al slot dependiente (`home` o `away`) del próximo partido.
- El partido siguiente queda actualizado sin regenerar fixture.
- La fase guarda `currentRoundLabel` para reflejar qué instancia está en juego.
- Cuando se completa la final y no hay una fase posterior, el torneo se cierra y el campeón sale del resultado de la final, no de standings.

#### 2.4. Manejar byes si el bracket no está completo
**Estado:** ✅ resuelto con política explícita.

**Política adoptada:**
- **No se permiten byes automáticos.**
- Si faltan equipos para completar el cuadro, se bloquea la generación/confirmación del fixture.

**Pendiente futuro opcional:**
- Si en algún momento se quisiera soportar byes, habría que extender el generador para seeds vacíos y auto-avance. Hoy esa variante no está habilitada.

#### 2.5. Ajustar standings o métricas para knockout
**Estado:** ✅ ajustado parcialmente.

La tabla se conserva para estadísticas mínimas, pero ya no actúa como fuente de verdad del avance.

**Resolución aplicada:**
- La UI de eliminación presenta el bracket como eje principal.
- Los standings quedan como apoyo estadístico mínimo.
- El cierre del torneo se decide por la final del bracket.

### Frontend: qué modificar

#### 2.6. Ocultar cualquier configuración de grupos o liga
**Estado:** ✅ realizado para formato `eliminacion`.

**Resolución aplicada:**
- En formato `eliminacion` solo se muestra:
  - `startFrom`
  - tamaño requerido del cuadro
  - política de byes
- La UI de grupos/liga queda reservada para `liga` o `mixto`.

#### 2.7. Mostrar el cuadro como bracket real
**Estado:** ✅ realizado.

**Resolución aplicada:**
- La vista knockout ahora se renderiza como bracket por columnas/instancias.
- Se muestran bloques para `octavos`, `cuartos`, `semi` y `final` según corresponda.
- Los cruces futuros aparecen aunque todavía tengan equipos por definir.

#### 2.8. Mostrar el avance de clasificados
**Estado:** ✅ realizado.

**Resolución aplicada:**
- Después de cargar un resultado, el siguiente cruce se actualiza automáticamente.
- La UI resalta ganador/avance en el card del partido y muestra cuando un cruce sigue esperando clasificados.

#### 2.9. Ajustar validaciones del formulario
**Estado:** ✅ realizado.

**Resolución aplicada:**
- El frontend valida el tamaño de cuadro esperado según `startFrom`.
- Para `final`, se admite el caso de negocio de 2 equipos.
- Para `semi`, `cuartos` u `octavos`, se exige exactamente 4, 8 o 16 equipos cuando el formato es `eliminacion`.
- En `mixto`, la UI informa cuántos clasificados necesita luego el playoff.

### Próximos pasos sugeridos
- Verificar que los torneos mixtos existentes queden configurados con una cantidad de clasificados compatible con el `startFrom` elegido.
- Evaluar si vale la pena agregar soporte real de byes en una iteración posterior.
- Si se quiere enriquecer la lectura pública, sumar una vista de campeón/subcampeón/semifinalistas basada en el bracket ya persistido.

---

## 3. Torneo Mixto (liga/grupos + playoffs)

### Reglas funcionales objetivo
- Primera fase: todos contra todos dentro de grupos o dentro del formato definido.
- Segunda fase: playoff eliminatorio.
- Debe poder configurarse:
  - cantidad de grupos;
  - cantidad de rondas;
  - tamaño del playoff;
  - criterio de clasificación de los mejores equipos.
- Deben clasificar los mejores de cada grupo según la estructura elegida.

### Backend: qué modificar

#### 3.1. Hacer que la fase de grupos respete `rounds`
**Estado:** ✅ realizado al reutilizar el generador round robin corregido.

Hoy el mixto guarda `rounds`, pero la fase de grupos se genera como una sola vuelta.

**Cambio necesario:**
- Reutilizar la lógica corregida de liga/round robin para cada grupo.
- Cada grupo debe poder jugar:
  - una sola vuelta;
  - ida y vuelta;
  - múltiples vueltas si así se define.

**Verificación de vigencia:** ya no hace falta seguir modificando este punto tal como figuraba, porque la fase `group_stage` ahora usa la misma generación de fixture con `roundCycle` y `matchdayNumber`.

#### 3.2. Volver configurable la clasificación a playoffs
**Estado:** ✅ implementado en la configuración principal del torneo mixto y persistido también en `tournamentAdvancementRules`.

**Qué quedó operativo:**
- El mixto ya permite definir `qualifyPerGroup`, `wildcardsCount`, `seedingCriteria`, `crossGroupSeeding` y `bracketMatchup`.
- La configuración se valida contra el tamaño del playoff antes de crear o editar el torneo.
- El `group_stage` persiste estos datos en `config` para que queden visibles en la fase.

#### 3.3. Hacer que `tournamentAdvancementRules` sea realmente la fuente de verdad
**Estado:** ✅ implementado con fallback defensivo a la estructura del torneo.

**Qué hace ahora `advancePhase`:**
- lee `tournamentAdvancementRules/{tournamentId}_group_stage_knockout`;
- combina esas reglas con la configuración persistida en fase/torneo;
- calcula clasificados automáticos y wildcards;
- ordena seeds y arma el bracket completo del playoff.

#### 3.4. Calcular clasificación de acuerdo al tamaño del playoff
**Estado:** ✅ implementado en backend y frontend.

**Qué quedó resuelto:**
- Se calcula `bracketSize` desde `startFrom`.
- Se valida que `groupCount * qualifyPerGroup + wildcardsCount === bracketSize`.
- Si la cuenta no cierra, la UI advierte y el backend rechaza la creación/edición.

**Ejemplos:**
- 2 grupos + semifinales → clasifican 2 por grupo = 4.
- 4 grupos + cuartos → puede clasificar 1° y 2° de cada grupo = 8.
- 6 grupos + octavos → puede requerir mejores terceros o un esquema especial.

#### 3.5. Generar playoff completo desde la fase mixta
**Estado:** ✅ implementado.

**Qué hace ahora el avance:**
- publica la lista de clasificados;
- asigna `seed`/`bracketSeed`;
- genera el cuadro completo con el motor de knockout ya existente;
- deja el playoff confirmado y listo para carga de resultados.

#### 3.6. Formalizar el seed de clasificación
**Estado:** 🟡 parcialmente implementado.

**Implementado ahora:**
- criterios de seed por `points`, `group_position`, `setsDiff`, `pointsDiff`;
- desempates con `setsDiff`, `pointsDiff`, `head2head`;
- patrón `1A_vs_2B`;
- patrón `standard_seeded` para ranking global.

**Pendiente para cerrar del todo:**
- exponer más variantes de cruce complejas (por ejemplo sorteo real o reglas especiales para mejores terceros en formatos no estándar);
- documentar explícitamente qué combinaciones son compatibles con cada tamaño de cuadro.

#### 3.7. Separar claramente fase de grupos y fase eliminatoria en métricas y estado
**Estado:** 🟡 parcialmente implementado.

**Implementado ahora:**
- `confirmGroups` deja flags de grupos confirmados;
- al cerrar grupos se persisten `standingsClosed` y `qualifiedTeamsPublished`;
- la fase knockout guarda `qualifiedTeams` y metadata del bracket generado;
- el panel admin ya muestra bloques separados de grupos y playoffs.

**Pendiente:**
- unificar estos hitos también en métricas/vistas públicas para que no dependan solo del panel admin;
- evaluar subestados más formales a nivel torneo/fase.

### Frontend: qué modificar

#### 3.8. Mantener la configuración de grupos, pero hacerla coherente con playoffs
**Estado:** ✅ implementado.

**Qué muestra ahora la UI admin:**
- cantidad de grupos;
- rondas;
- clasifican por grupo;
- wildcards;
- inicio de playoff;
- cantidad de clasificados esperados / requeridos;
- advertencia inmediata si la cuenta no cierra.

**Ejemplo:**
- “Con 3 grupos y playoff desde cuartos necesitás 8 clasificados; definí cómo completar las plazas restantes”.

#### 3.9. Mostrar una preview real de clasificación
**Estado:** ✅ implementado en alta/edición.

**La preview ahora informa:**
- equipos por grupo;
- clasificados por grupo;
- wildcards;
- ronda de inicio del playoff;
- criterio de seed;
- total esperado vs total requerido.

#### 3.10. Mostrar dos bloques visuales separados
**Estado:** ✅ implementado en el panel admin del torneo.

**Qué se ve ahora:**
1. bloque de fase de grupos con grupos, standings, clasificados y fixture;
2. bloque de playoffs con seeds clasificados y bracket.

#### 3.11. Publicar clasificados al terminar grupos
**Estado:** ✅ implementado.

**Qué queda publicado:**
- `qualifiedTeamsPublished` en la fase de grupos;
- `qualifiedTeams` en la fase knockout;
- marcas de `qualified`, `qualificationType` y `seed` en standings.

---

## 4. Cambios transversales recomendados

Además de lo específico por formato, hay cambios transversales que convendría planificar.

### 4.1. Revisar el modelo de `tournamentMatches`
Hoy el modelo sirve para listar partidos, pero queda corto para representar correctamente:
- jornadas de liga;
- fases con múltiples vueltas;
- brackets eliminatorios con dependencias.

**Sugerencia técnica:**
Agregar campos opcionales orientados al formato:
- `matchdayNumber`
- `roundCycle`
- `roundLabel`
- `bracketIndex`
- `sourceHomeMatchId`
- `sourceAwayMatchId`
- `nextMatchId`
- `slotOrder`

### 4.2. Normalizar semánticamente el campo `round`
El mismo campo hoy intenta representar cosas distintas según la fase.

**Cambio necesario:**
- Definir una convención explícita por formato, o
- dividir el significado en campos distintos.

### 4.3. Crear validadores de consistencia por formato
Antes de confirmar fixture o grupos, el sistema debería validar que la estructura del torneo sea consistente con el reglamento elegido.

**Casos a validar:**
- Liga no puede tener grupos.
- Eliminación no puede tener standings como criterio de campeón.
- Mixto debe tener relación válida entre grupos, clasificados y tamaño del playoff.

### 4.4. Mejorar la trazabilidad del estado competitivo
Conviene que el torneo y cada fase puedan reflejar en qué paso exacto están.

**Sugerencia:**
Agregar estados o subestados como:
- groups_pending
- groups_confirmed
- fixture_pending
- fixture_confirmed
- standings_in_progress
- qualified_published
- bracket_ready

Esto puede ser en backend, en flags auxiliares o como view model de frontend.

---

## 5. Orden recomendado de implementación

### Etapa 1 — Liga
- corregir rounds reales;
- introducir fechas/jornadas;
- limpiar UI de grupos en liga.

### Etapa 2 — Knockout
- implementar bracket completo;
- avance automático de ganadores;
- soporte de `startFrom` real.

### Etapa 3 — Mixto
- ✅ conectar clasificación configurable;
- ✅ usar `tournamentAdvancementRules` como fuente de verdad;
- ✅ generar playoff completo desde los clasificados;
- 🟡 completar variantes avanzadas de seeding/cruces y extender la separación visual a más vistas.

### Etapa 4 — UX y validaciones
- mejorar previews;
- mostrar métricas correctas por formato;
- reforzar validaciones de consistencia antes de confirmar configuración.

---

## 6. Resultado esperado al finalizar estos cambios

Cuando estas modificaciones estén implementadas:

- **Liga** va a funcionar como un verdadero todos-contra-todos con jornadas y campeón por tabla.
- **Eliminación directa** va a funcionar como un bracket real hasta la final.
- **Mixto** ya permite grupos + clasificación configurable + playoff real, respetando la estructura elegida por el administrador en el flujo admin actual.
- Como siguiente paso, falta terminar de homogeneizar estas reglas y estados en todas las vistas/métricas y ampliar variantes avanzadas de cruce.
