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

### Reglas funcionales objetivo
- No debe haber grupos.
- No debe haber fase de liga previa.
- El torneo se juega por cruces eliminatorios.
- El que pierde queda eliminado.
- El cuadro debe avanzar automáticamente hasta la final.
- El campeón surge de ganar todos los partidos necesarios.

### Backend: qué modificar

#### 2.1. Convertir `startFrom` en una configuración operativa real
Hoy `startFrom` existe, pero no determina realmente la estructura del cuadro.

**Cambio necesario:**
- Mapear `startFrom` a tamaño de bracket:
  - `final` → 2 equipos
  - `semi` → 4 equipos
  - `cuartos` → 8 equipos
  - `octavos` → 16 equipos
- Validar que la cantidad de equipos clasificados/aceptados sea compatible con ese tamaño.
- Definir política cuando falten equipos:
  - no permitir confirmar fixture, o
  - permitir byes automáticos.

#### 2.2. Generar un bracket completo, no solo la primera ronda
Hoy el sistema arma cruces iniciales, pero no una estructura completa hasta la final.

**Cambio necesario:**
- Reescribir el generador de knockout para que cree:
  - todos los partidos del bracket desde el inicio, o
  - al menos una estructura de nodos con dependencias entre partidos.
- Cada partido debe poder conocer:
  - de qué partido anterior sale el local;
  - de qué partido anterior sale el visitante;
  - en qué instancia está (`QF`, `SF`, `F`, etc.).

**Modelo sugerido:**
- Agregar a `tournamentMatches` campos como:
  - `roundLabel` (`octavos`, `cuartos`, `semi`, `final`)
  - `bracketIndex`
  - `sourceHomeMatchId`
  - `sourceAwayMatchId`
  - `sourceHomeSlot`
  - `sourceAwaySlot`

#### 2.3. Implementar avance automático de ganadores
El comportamiento clave del knockout es que los ganadores avancen y los perdedores queden eliminados.

**Cambio necesario:**
- Al registrar el resultado de un partido knockout:
  - identificar el ganador;
  - ubicarlo en el siguiente cruce correspondiente;
  - marcar al perdedor como eliminado.
- Cuando todos los partidos de una instancia estén completos, activar la siguiente.
- Cuando se complete la final, cerrar torneo y definir campeón.

#### 2.4. Manejar byes si el bracket no está completo
Si el cuadro está pensado para 8 pero hay 6 equipos, el sistema necesita una política consistente.

**Cambio necesario:**
- Definir explícitamente si se permiten byes.
- Si se permiten:
  - crear seeds vacíos;
  - avanzar automáticamente los equipos beneficiados.
- Si no se permiten:
  - bloquear la confirmación del fixture hasta completar el tamaño requerido.

#### 2.5. Ajustar standings o métricas para knockout
En eliminación directa, la tabla no cumple el mismo rol que en liga.

**Cambio necesario:**
- Evaluar si `tournamentStandings` debe seguir existiendo para knockout o si conviene complementarlo con un resumen de bracket.
- Si se conserva standings, usarlo para métricas mínimas, no como criterio principal de progreso.

### Frontend: qué modificar

#### 2.6. Ocultar cualquier configuración de grupos o liga

**Cambio necesario:**
- En formato `eliminacion`, mostrar únicamente:
  - tamaño del cuadro / `startFrom`;
  - cantidad de equipos requerida;
  - política de byes si aplica.
- No mostrar ninguna UI relacionada con grupos o rondas de liga.

#### 2.7. Mostrar el cuadro como bracket real
Hoy el render actual sirve para listar partidos, pero no para representar un playoff real.

**Cambio necesario:**
- Reemplazar la vista de knockout por una UI tipo bracket.
- Mostrar columnas o bloques por instancia:
  - octavos
  - cuartos
  - semifinal
  - final
- Mostrar cruces futuros aunque todavía no tengan equipos definidos.

#### 2.8. Mostrar el avance de clasificados

**Cambio necesario:**
- Después de cada resultado, la UI debe reflejar automáticamente:
  - quién avanzó;
  - quién quedó eliminado;
  - cuál es el próximo cruce.

#### 2.9. Ajustar validaciones del formulario

**Cambio necesario:**
- Validar desde frontend que el tamaño del cuadro elegido tenga sentido con la cantidad mínima/máxima de equipos.
- Si se elige `final`, permitir 2 equipos si ese caso de negocio es válido.
- Si se elige `semi`, exigir o sugerir 4 equipos, etc.

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
Hoy la lógica está fija en “clasifican los 2 mejores de cada grupo”.

**Cambio necesario:**
- Reemplazar la lógica hardcodeada por lectura de configuración real.
- Definir en fase o en `tournamentAdvancementRules` campos como:
  - `qualifyPerGroup`
  - `wildcardsCount`
  - `qualifyBestThirds`
  - `seedingCriteria`
  - `crossGroupSeeding`

#### 3.3. Hacer que `tournamentAdvancementRules` sea realmente la fuente de verdad
El sistema ya crea ese documento, pero no lo usa efectivamente para avanzar fases.

**Cambio necesario:**
- En `advancePhase`, leer `tournamentAdvancementRules` antes de clasificar equipos.
- Usar esas reglas para:
  - cuántos equipos avanzan;
  - desde qué posiciones de cada grupo;
  - cómo se ordenan los clasificados;
  - cómo se arman los cruces.

#### 3.4. Calcular clasificación de acuerdo al tamaño del playoff
Si el playoff empieza en cuartos, deben clasificar 8 equipos; si empieza en semis, 4; etc.

**Cambio necesario:**
- Cruzar `startFrom` o `bracketSize` con:
  - cantidad de grupos;
  - posiciones que clasifican;
  - posibles wildcards.
- Validar que la configuración cierre matemáticamente.

**Ejemplos:**
- 2 grupos + semifinales → clasifican 2 por grupo = 4.
- 4 grupos + cuartos → puede clasificar 1° y 2° de cada grupo = 8.
- 6 grupos + octavos → puede requerir mejores terceros o un esquema especial.

#### 3.5. Generar playoff completo desde la fase mixta
Una vez clasificados los equipos, el sistema debe construir el cuadro eliminatorio completo.

**Cambio necesario:**
- Reutilizar el nuevo motor de knockout completo.
- El avance desde grupos debe producir:
  - lista de clasificados;
  - seed de cada uno;
  - bracket completo.

#### 3.6. Formalizar el seed de clasificación
En mixto no alcanza con “top 2 por grupo”; hace falta saber cómo se cruzan.

**Cambio necesario:**
- Definir criterios de orden de clasificados:
  - posición en grupo;
  - puntos;
  - diferencia de sets;
  - diferencia de puntos;
  - head-to-head.
- Definir patrón de cruce:
  - `1A vs 2B`
  - `1B vs 2A`
  - ranking global
  - sorteo

#### 3.7. Separar claramente fase de grupos y fase eliminatoria en métricas y estado

**Cambio necesario:**
- La fase de grupos debe cerrar formalmente antes de abrir playoffs.
- Debe haber trazabilidad clara de:
  - grupos confirmados;
  - fixture de grupos confirmado;
  - standings cerrados;
  - clasificados publicados;
  - bracket generado.

### Frontend: qué modificar

#### 3.8. Mantener la configuración de grupos, pero hacerla coherente con playoffs

**Cambio necesario:**
- El formulario debe mostrar:
  - cantidad de grupos;
  - rondas por grupo;
  - inicio de playoff (`semi`, `cuartos`, `octavos`);
  - cantidad de clasificados esperados.
- La UI debería advertir si la configuración no cierra.

**Ejemplo:**
- “Con 3 grupos y playoff desde cuartos necesitás 8 clasificados; definí cómo completar las plazas restantes”.

#### 3.9. Mostrar una preview real de clasificación

**Cambio necesario:**
- En la vista previa del torneo mixto, informar:
  - cuántos equipos van por grupo;
  - cuántos clasifican por grupo;
  - si existen wildcards;
  - desde qué instancia arranca el playoff.

#### 3.10. Mostrar dos bloques visuales separados

**Cambio necesario:**
- En el detalle del torneo mixto, dividir claramente:
  1. fase de grupos
  2. playoffs
- La parte de grupos debe mostrar standings por grupo.
- La parte de playoffs debe mostrar bracket.

#### 3.11. Publicar clasificados al terminar grupos

**Cambio necesario:**
- Antes de mostrar el bracket, la UI debería tener una instancia de “equipos clasificados”.
- Eso ayuda a validar que el pasaje de fase fue correcto antes del armado del cuadro.

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
- conectar clasificación configurable;
- usar `tournamentAdvancementRules` como fuente de verdad;
- generar playoff completo desde los clasificados.

### Etapa 4 — UX y validaciones
- mejorar previews;
- mostrar métricas correctas por formato;
- reforzar validaciones de consistencia antes de confirmar configuración.

---

## 6. Resultado esperado al finalizar estos cambios

Cuando estas modificaciones estén implementadas:

- **Liga** va a funcionar como un verdadero todos-contra-todos con jornadas y campeón por tabla.
- **Eliminación directa** va a funcionar como un bracket real hasta la final.
- **Mixto** va a permitir grupos + clasificación configurable + playoff real, respetando la estructura elegida por el administrador.
