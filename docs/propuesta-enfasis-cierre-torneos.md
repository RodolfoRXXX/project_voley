# Propuesta UX/UI: énfasis de ganadores y cierre de torneo

Fecha: 2026-03-30.

## Objetivo

Lograr que la experiencia tenga **dos modos visuales claros**:

1. **Torneo activo**: foco en progreso (estadísticas vivas, próximos partidos, estado de fases).
2. **Torneo finalizado**: foco en cierre (campeón/podio, mensaje de finalización, resultados consolidados).

La idea es que cualquier usuario entienda en 3 segundos:
- si el torneo sigue en juego o terminó;
- quién salió 1°, 2° y 3° (si aplica);
- dónde ver tabla y resultados completos.

---

## Principio de diseño: “Modo Activo” vs “Modo Finalizado”

### Modo Activo (status = activo)
- Hero superior con badge “En juego” (color vivo: azul/naranja).
- KPIs de seguimiento: partidos jugados/pendientes, fase actual, próximos encuentros.
- Bloque principal = próximos partidos + estado por fase.
- Tabla de posiciones visible, pero con foco en movimiento (flechas de subida/bajada opcional).
- Mensaje contextual: “La clasificación puede cambiar”.

### Modo Finalizado (status = finalizado)
- Hero superior cambia a “Torneo finalizado” con fecha de cierre.
- Podio ocupa el primer bloque visual (1°, 2°, 3° si existe).
- Sello visual de cierre: “Finalizado oficialmente”.
- Luego de podio: tabla final congelada + historial completo de resultados.
- Mensaje contextual: “Resultados definitivos”.

---

## Qué mostrar en cada vista (hay varias vistas de torneos)

## 1) Listado público de torneos (`/tournaments`)

### Activo
- Card con estado “En juego”.
- Resumen: fase actual + próximo partido relevante.
- CTA: “Seguir torneo”.

### Finalizado
- Card con estado “Finalizado”.
- Mini-podio inline (1° y 2°; 3° si existe y hay espacio).
- CTA: “Ver resultados finales”.
- Visual diferenciador: borde/insignia dorada suave para torneos cerrados con campeón definido.

**Impacto:** ya desde el listado se entiende qué torneos están vivos y cuáles son históricos.

---

## 2) Detalle público de torneo (`/tournaments/[tournamentId]`)

### Activo
Orden recomendado de bloques:
1. Hero “En juego” + fase actual.
2. Próximos partidos (muy visible).
3. Tabla/standings actual.
4. Resultados recientes.

### Finalizado
Orden recomendado de bloques:
1. **Hero de cierre**: “Torneo finalizado”.
2. **Podio destacado** (1°, 2°, 3° si aplica).
3. “Partido final” (resultado principal de cierre).
4. Tabla final completa (marcada como definitiva).
5. Todos los partidos con resultados (timeline o acordeón por fase).

#### Nota sobre 3er puesto
- Si existe partido por 3er puesto → mostrar 3° oficial.
- Si no existe ese partido:
  - mostrar 1° y 2° oficiales,
  - y para 3° usar etiqueta “semifinalista” (evitar ambigüedad).

---

## 3) Panel admin de torneo (`/admin/tournaments/[tournamentId]`)

### Activo
- Mantener herramientas operativas visibles (carga de resultados, avance de fase, fixture).
- Añadir un widget “Camino al título” con candidatos top (opcional).

### Finalizado
- El panel debe pasar de “operación” a “resumen ejecutivo”:
  - encabezado con estado final y fecha,
  - podio definitivo arriba,
  - acciones de edición minimizadas/colapsadas,
  - bloque de exportación/compartir resultados.

**Importante:** evitar que la UI finalizada parezca editable como si siguiera en curso.

---

## 4) Vistas del usuario en perfil (mis torneos / detalle de inscripción)

### Activo
- Mostrar progreso del equipo del usuario (posición actual, próximos partidos).

### Finalizado
- Mostrar “posición final del equipo” + podio general del torneo.
- Si el equipo quedó en podio, destacar con badge especial (oro/plata/bronce).

---

## Componentes visuales sugeridos (reutilizables)

1. **TournamentStatusHero**
   - Variante `active` y `finalized`.
   - Cambia color, iconografía y mensaje principal.

2. **TournamentPodiumCard** (extendido)
   - Tamaños jerárquicos (1° más grande).
   - Avatar/logo + nombre equipo + métrica clave (puntos, sets o récord).

3. **FinalSealBanner**
   - Franja visible tipo “Resultado definitivo”.

4. **ResultsTimeline**
   - Partidos agrupados por fase/jornada con marcador final.

5. **StandingsTableFinal**
   - Tabla bloqueada visualmente (“Final”).
   - Sin elementos de proyección, solo resultados finales.

---

## Jerarquía visual recomendada (para que sea atractivo y claro)

- **Prioridad 1:** estado del torneo (activo/finalizado).
- **Prioridad 2:** podio (si finalizado) o próximos partidos (si activo).
- **Prioridad 3:** tabla y resultados completos.

Regla simple:
- Si está activo → “¿Qué viene ahora?”.
- Si terminó → “¿Quién ganó y cómo terminó?”.

---

## Microcopy sugerido (texto que ayuda muchísimo)

### Activo
- “Torneo en juego”
- “Fase actual: Semifinales”
- “Clasificación provisional”

### Finalizado
- “Torneo finalizado”
- “Resultados definitivos”
- “Campeón del torneo”
- “Podio oficial”

---

## Accesibilidad y comprensión rápida

- No depender solo de color: usar iconos + texto (`En juego`, `Finalizado`).
- En mobile, podio en tarjetas verticales (1°, 2°, 3°) para legibilidad.
- Mantener consistencia de etiquetas en todas las vistas.

---

## Implementación por etapas (sin romper flujo actual)

### Etapa 1 (rápida, alto impacto)
- Cambiar orden de bloques según estado.
- Hero distinto para activo/finalizado.
- Podio arriba en finalizados.

### Etapa 2
- Mejorar cards de listado con mini-podio.
- Añadir sello de “resultado definitivo”.

### Etapa 3
- Sharing/social: imagen resumen del podio para compartir.
- Badges en perfil para equipos en podio.

---

## Métricas para validar que funcionó

- Aumento de clics en “Ver resultados finales” en torneos finalizados.
- Menor tiempo para identificar campeón (test de usabilidad).
- Mayor retención post-torneo (usuarios que vuelven a ver resultados).
- Mayor tasa de compartidos del podio.

---

## Resumen final

Para que se entienda y sea atractivo:
- **Activo = progreso vivo** (próximos partidos y estado competitivo).
- **Finalizado = narrativa de cierre** (podio + campeón + resultados definitivos).

El cambio clave no es solo agregar un podio, sino **reordenar la historia visual** de cada vista según el estado del torneo.
