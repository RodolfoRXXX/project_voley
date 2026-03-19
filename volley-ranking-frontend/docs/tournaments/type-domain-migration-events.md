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

### 5. Consolidación de services para composición de vistas

Se mantuvo la compatibilidad con el backend actual, pero se movió la composición repetida de páginas a la capa `src/services/tournaments/`.

Helpers agregados en `tournamentQueries.ts`:

- `getPublicTournamentListView()` para listado público.
- `getPublicTournamentDetailView()` para detalle público con fase actual, equipos, standings y cantidad de partidos.
- `getProfileTournamentListView()` para el listado de perfil resolviendo deduplicación entre `registration` y `team`.
- `getProfileTournamentDetailView()` para el detalle de perfil filtrado por grupos habilitados del usuario.
- `getAdminTournamentRegistrationsView()` para normalizar el merge entre `tournamentRegistrations` y `tournamentTeams` en admin.

Decisión: los helpers viven en la misma capa de queries porque hoy sólo orquestan lecturas y normalización de shape, sin introducir un nuevo contrato con backend.

### 6. Consolidación mínima de mutations derivadas

Se extrajo `buildTournamentEntryPaymentSummary()` en `tournamentMutations.ts` para centralizar el cálculo derivado de:

- `expectedAmount`
- `pendingAmount`
- `paymentStatus`

Decisión: no se tocó el contrato de escritura hacia Firestore ni las callable functions existentes; sólo se evitó recalcular la misma lógica desde componentes.

### 7. Páginas consumidoras alineadas al servicio consolidado

En este paso ya quedaron usando helpers agregados:

- `app/(public)/tournaments/page.tsx`
- `app/(public)/tournaments/[tournamentId]/page.tsx`
- `app/(protected)/profile/tournaments/page.tsx`
- `app/(protected)/profile/tournaments/[tournamentId]/page.tsx`
- `app/(admin)/admin/tournaments/[tournamentId]/page.tsx` (para el bloque de inscripciones/equipos)
- `components/tournaments/TournamentEntryDetail.tsx` (para cálculo derivado de pagos)

Con esto el paso originalmente planteado como “migrar listado público y perfil a servicios” quedó parcialmente absorbido por esta iteración.

## Impacto esperado

- Menos imports ambiguos.
- Menos riesgo de arrastrar shapes legacy.
- Mejor autocompletado.
- Base más clara para separar social matches de tournament matches.
- Menos composición repetida en páginas y componentes.
- Mejor punto de entrada para evolucionar view-models sin tocar backend.

## Riesgos o puntos a validar después

- Verificar que no existan imports externos al frontend apuntando a los archivos legacy eliminados.
- Revisar si conviene mover los view-model helpers a un archivo dedicado (`tournamentViewModels.ts`) cuando crezca la capa.
- Confirmar en QA que las consultas agregadas no empeoran tiempos de carga en torneos con muchas fases/equipos.

## Validación de próximos pasos sugeridos

### Estado del paso 2

**Alineado y actualizado.**

El objetivo principal del paso 2 quedó cumplido en esta iteración:

- se detectó composición repetida en público, perfil y admin;
- se crearon helpers agregados/view-models;
- se mantuvo compatibilidad con backend y callable functions actuales;
- se documentaron decisiones en este mismo archivo.

### Revisión del paso 3 original

**Necesita ajuste.**

El paso 3 decía “migrar listado público y perfil a servicios”, pero eso ya quedó cubierto acá. Lo actualizado para el siguiente bloque debería enfocarse en profundizar la UI sobre los helpers ya creados, no en mover fetch/composición básica.

### Revisión del paso 4 original

**Sigue siendo válido.**

Después de consolidar lecturas, el siguiente foco lógico sigue siendo separar `TournamentAdminPanel` por fase y aprovechar mejor el estado ya disponible.

### Revisión del paso 5 original

**Sigue siendo válido.**

La separación estructural entre social matches y tournament matches continúa siendo una deuda independiente y posterior.

## Próximos pasos sugeridos

### Paso 3 — enriquecer vistas públicas y de perfil sobre helpers ya consolidados

**Objetivo:** aprovechar la nueva capa de servicios para mejorar presentación y evitar lógica residual en UI.

**Prompt sugerido:**

```text
Sigamos con el paso 3. Quiero enriquecer app/(public)/tournaments/page.tsx, app/(public)/tournaments/[tournamentId]/page.tsx y app/(protected)/profile/tournaments/page.tsx sobre la capa consolidada.
Objetivos:
- mostrar mejor fase actual, progreso o métricas disponibles desde los helpers
- extraer presentación repetida si aparecen cards/resúmenes compartidos
- mantener la lógica de fetch/composición en servicios
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
