# Tournament type/domain migration events

Fecha: 2026-03-19

## Objetivo del bloque

Cerrar `src/types/tournaments/` como única fuente de verdad para el dominio de torneos y dejar explícita la diferencia entre:

- `Match`: partido social/comunitario.
- `TournamentMatch`: partido de torneo.

## Eventos aplicados

### 1. Source of truth unificado

Se agregó `src/types/tournaments/index.ts` como barrel oficial del dominio de torneos.

Esto permite importar desde un único namespace:

```ts
import type { Tournament, TournamentMatch, TournamentStanding } from "@/types/tournaments";
```

### 2. Eliminación de aliases legacy

Se eliminaron los wrappers legacy:

- `src/types/tournament.ts`
- `src/types/tournamentMatch.ts`
- `src/types/tournamentStanding.ts`

Con esto evitamos mantener dos puntos de entrada para el mismo dominio.

### 3. Imports alineados al namespace definitivo

Los componentes, páginas y servicios de torneos ahora importan desde `@/types/tournaments`.

### 4. Convención explícita Match vs TournamentMatch

Se documentó en código que:

- `src/types/match.ts` define el modelo social/comunitario.
- `src/types/tournaments/tournamentMatch.ts` define el modelo de torneo.

## Impacto esperado

- Menos imports ambiguos.
- Menos riesgo de arrastrar shapes legacy.
- Mejor autocompletado.
- Base más clara para separar social matches de tournament matches.

## Riesgos o puntos a validar después

- Verificar que no existan imports externos al frontend apuntando a los archivos legacy eliminados.
- En siguientes bloques conviene revisar naming de carpetas y componentes para reforzar la separación social vs torneo.

## Próximos pasos sugeridos

### Paso 2 — consolidar queries y mutations

**Objetivo:** cerrar la capa de servicios de torneos y mover composición de datos fuera de las páginas.

**Prompt sugerido:**

```text
Sigamos con el paso 2. Quiero consolidar src/services/tournaments/tournamentQueries.ts y tournamentMutations.ts.
Objetivos:
- detectar lógica de composición repetida en páginas de torneos
- crear funciones agregadas/view-model helpers para público, perfil y admin
- mantener compatibilidad con el backend actual
- documentar decisiones en el mismo md de migración
Al final corré checks, commit y dejá próximos prompts.
```

### Paso 3 — migrar listado público y perfil a servicios

**Objetivo:** dejar de resolver armado de datos directamente en las páginas consumidoras.

**Prompt sugerido:**

```text
Sigamos con el paso 3. Quiero migrar app/(public)/tournaments/page.tsx y app/(protected)/profile/tournaments/page.tsx para que consuman la capa de servicios consolidada.
Objetivos:
- reducir lógica de fetch/composición en las páginas
- mostrar mejor fase actual o progreso del torneo cuando ya esté disponible en servicios
- documentar eventos y decisiones en docs/tournaments/type-domain-migration-events.md
Al final corré checks, commit y dejá el próximo prompt recomendado.
```

### Paso 4 — refactor admin por fase

**Objetivo:** separar edición general del torneo de la operación de la fase actual.

**Prompt sugerido:**

```text
Sigamos con el paso 4. Quiero refactorizar el admin de torneos en subcomponentes por fase.
Objetivos:
- dividir TournamentAdminPanel
- crear un shell por fase actual
- separar editar torneo de operar la fase
- incorporar standings y timeline de fases si los datos ya están listos
- documentar eventos y decisiones en docs/tournaments/type-domain-migration-events.md
Al final corré checks, commit y dejá próximos prompts.
```

### Paso 5 — separación estructural social vs tournament matches

**Objetivo:** consolidar la convención de dominio a nivel de carpetas, naming y componentes.

**Prompt sugerido:**

```text
Sigamos con el paso 5. Quiero cerrar la separación entre social matches y tournament matches.
Objetivos:
- revisar carpetas e imports
- crear o mover componentes específicos de TournamentMatch
- reforzar por naming que Match = social y TournamentMatch = torneo
- documentar decisiones y convenciones finales en docs/tournaments/type-domain-migration-events.md
Al final corré checks, commit y dejá si queda deuda residual.
```
