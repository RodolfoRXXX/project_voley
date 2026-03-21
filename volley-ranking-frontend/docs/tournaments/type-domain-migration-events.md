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



### 8. Enriquecimiento de vistas públicas y de perfil sobre helpers consolidados

Se profundizó el paso 3 sin mover la responsabilidad de fetch fuera de `src/services/tournaments/tournamentQueries.ts`.

Cambios aplicados:

- Se agregaron métricas derivadas reutilizables (`TournamentProgressMetrics`) para cupos, ocupación, partidos completados, filas de standings, clasificados y equipos agrupados.
- Se agregó `TournamentPhaseSnapshot` para exponer a UI el estado mínimo de la fase actual sin replicar composición en cada página.
- `getPublicTournamentListView()`, `getPublicTournamentDetailView()` y `getProfileTournamentListView()` ahora devuelven esas métricas ya resueltas desde servicios.
- `getPublicTournamentDetailView()` además expone `topStanding` para destacar líder actual sin recalcularlo en la página.

Decisión: mantener estas derivaciones en la capa de queries porque siguen siendo lectura + normalización de shape, y así evitamos que las páginas vuelvan a inspeccionar `matches`, `standings` o `teams` para construir KPIs.

### 9. Extracción de presentación repetida para cards y resúmenes

Se extrajo presentación compartida a componentes de `src/components/tournaments/`:

- `TournamentSummaryCard.tsx` para cards/listados con estado, fase, barra de ocupación y métricas clave.
- `TournamentPhaseOverview.tsx` para el bloque de resumen competitivo del detalle público.

Decisión: la UI comparte layout y copy, pero no recibe responsabilidades de fetch. Los componentes sólo consumen view-models ya compuestos por servicios.

### 10. Páginas alineadas al nuevo nivel de detalle

Se actualizaron:

- `app/(public)/tournaments/page.tsx`
- `app/(public)/tournaments/[tournamentId]/page.tsx`
- `app/(protected)/profile/tournaments/page.tsx`

Resultado:

- el listado público muestra progreso de cupos, estado de fase y métricas competitivas resumidas;
- el detalle público agrega un overview de fase y destaca el líder si existe standings;
- el listado de perfil reutiliza la misma card enriquecida, conservando el badge de estado de inscripción/equipo.

### 11. Refactor del admin de torneos por shell de fase

Se dividió la experiencia de admin entre edición del torneo y operación de la fase actual.

Cambios aplicados:

- `TournamentAdminPanel` pasó a orquestar estado y fetch, delegando la presentación en subcomponentes de `src/components/tournaments/admin/`.
- Se agregó `TournamentPhaseShell` para encapsular contexto de fase actual + timeline de fases.
- Se extrajeron bloques específicos de operación (`groups`, `fixture`, `standings`) a piezas de UI reutilizables.
- La página admin del torneo separó explícitamente `TournamentEditForm` de `TournamentDetailsCard`, evitando mezclar edición general con acciones operativas de fase.
- Se aprovechó el shape ya disponible para mostrar standings de la fase actual y timeline completo sin agregar contratos nuevos de backend.

Decisión: mantener el fetch en el panel/page actual y no introducir un nuevo view-model admin todavía. Con el estado actual, la prioridad fue cortar responsabilidades de render, no rediseñar todavía el flujo de datos.

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

**Completado en esta iteración.**

El admin quedó separado entre edición general del torneo y operación de fase actual, con timeline y standings incorporados sobre los datos ya disponibles.

### Revisión del paso 5 original

**Sigue siendo válido.**

La separación estructural entre social matches y tournament matches continúa siendo una deuda independiente y posterior.

## Próximos pasos sugeridos

### Paso 3 — enriquecer vistas públicas y de perfil sobre helpers ya consolidados

**Estado:** completado en esta iteración.

Se resolvió el enriquecimiento visual apoyándose en métricas y snapshots compuestos desde servicios, y se extrajo la presentación repetida en componentes compartidos.

**Siguiente prompt recomendado:**

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

### Paso 4 — refactor admin por fase

**Estado:** completado en esta iteración.

Resultado:

- el admin ahora tiene shell de fase actual, timeline de fases y bloque de standings;
- `TournamentAdminPanel` dejó de concentrar toda la UI;
- la página separa edición de torneo vs operación competitiva.

### Paso 5 — separación estructural social vs tournament matches

**Objetivo:** consolidar la convención de dominio a nivel de carpetas, naming y componentes.

**Prompt sugerido:**

```text
Sigamos con el paso 5. Quiero cerrar la separación entre social matches y tournament matches.
Objetivos:
- revisar carpetas e imports que todavía mezclen ambos dominios
- crear o mover componentes específicos de TournamentMatch donde siga habiendo ambigüedad
- reforzar por naming que Match = social y TournamentMatch = torneo
- documentar decisiones y convenciones finales en docs/tournaments/type-domain-migration-events.md
Al final corré checks, commit y dejá si queda deuda residual.
```


### 12. Cierre de separación estructural Match vs TournamentMatch

Se completó una pasada específica para eliminar ambigüedad residual entre el dominio social y el dominio de torneos.

Cambios aplicados:

- Se extrajo `src/components/tournaments/admin/TournamentMatchSections.tsx` para encapsular la presentación y el agrupado de `TournamentMatch` dentro del dominio de torneos.
- `src/components/tournaments/admin/TournamentAdminPhaseSections.tsx` quedó enfocado sólo en bloques neutrales de fase (`groups` y `standings`), sin mezclar rendering específico de partidos.
- `TournamentAdminPanel` dejó de usar nombres genéricos para estado local de fixture y ahora usa `previewTournamentMatches` / `confirmedTournamentMatches`.
- Se reemplazó el componente ambiguo `TournamentMatchList` por `TournamentMatchSummaryList`, dejando explícito que renderiza partidos de torneo y no partidos sociales.
- El dashboard público pasó a consumir `Match` desde `src/types/match.ts` en lugar de redefinir un type inline, reforzando que `Match` pertenece al dominio social.

Decisión:

- Dentro de `src/components/tournaments/**`, cualquier componente o helper que opere sobre partidos debe incluir `TournamentMatch` en el nombre cuando la intención no sea obvia por contexto inmediato.
- Se preserva `getTournamentMatches()` como nombre de query porque su namespace ya lo vuelve inequívoco; la convención se endurece sobre todo en nombres de componentes, estados locales y helpers de presentación.

### 13. Convenciones finales de naming

Convenciones vigentes después del paso 5:

- `Match` = partido social/comunitario (`src/types/match.ts`).
- `TournamentMatch` = partido de torneo (`src/types/tournaments/tournamentMatch.ts`).
- En carpetas sociales se permite `MatchCard`, `MatchHeader`, `MatchActions`, etc.
- En carpetas de torneos se prefiere `TournamentMatch*` para componentes de UI, helpers y estado derivado cuando el nombre pueda salir del contexto local.
- Variables locales tipo `matches` sólo se toleran si el scope ya está completamente encapsulado dentro de services de torneos; en UI/orquestación se prioriza `tournamentMatches`.

### 14. Deuda residual y concordancia frontend/backend

Estado actual frente al formato nuevo de torneo:

- **Alineado** para creación/edición del torneo, preview/confirmación de grupos y preview/confirmación de fixture.
- **Alineado** para lectura del formato nuevo basado en `phases`, `currentPhaseId`, `currentPhaseType` y `tournamentMatches.result`.
- **Pendiente en frontend** exponer una operación de carga de resultados de `TournamentMatch` que invoque la callable `recordMatchResult` del backend.
- **Pendiente en frontend** una UI explícita para transición de fase asistida por resultados (aunque el backend ya avanza/finaliza durante `recordMatchResult` según la fase siguiente disponible).

Decisión final de este bloque:

- No inventar una mutación frontend nueva hasta diseñar la experiencia operativa de carga de resultados.
- Tomar como fuente de verdad para cambio de fase la callable de backend que registra resultados y recalcula standings/avance.

## Próximos pasos operativos sugeridos

### Cargar resultados de partidos

Para quedar totalmente en concordancia con backend, el frontend debería agregar:

1. una mutation `recordTournamentMatchResult()` en `src/services/tournaments/tournamentMutations.ts` que envuelva la callable `recordMatchResult`;
2. un formulario/admin action para editar `result.homeSets`, `result.awaySets`, `result.homePoints`, `result.awayPoints` y opcionalmente `result.winnerId`;
3. refresco posterior de `tournamentMatches`, `standings`, `tournamentPhases` y `tournament` para reflejar avance automático.

Payload mínimo esperado por backend para cada partido:

- `matchId`
- `result.homeSets`
- `result.awaySets`
- `result.homePoints[]`
- `result.awayPoints[]`
- `result.winnerId` (opcional, backend lo infiere si falta)

### Cambio de fase

Con el backend actual, el cambio de fase no debería ser una acción manual separada si el flujo normal es:

1. confirmar grupos (si aplica);
2. confirmar fixture de la fase actual;
3. cargar resultados de todos los `TournamentMatch` pendientes de esa fase;
4. dejar que backend recalculé standings y:
   - genere la siguiente fase si existe;
   - actualice `currentPhaseId` y `currentPhaseType`;
   - o marque el torneo como `finalizado` si ya no hay fase siguiente.

Si negocio necesita override manual, eso sería un paso nuevo y explícito, no parte de este cierre de naming/dominio.

### 15. Carga operativa de resultados desde admin

Se cerró el primer tramo pendiente de concordancia frontend/backend para resultados de `TournamentMatch`.

#### Cambios implementados

- Se agregó `recordTournamentMatchResult()` en `src/services/tournaments/tournamentMutations.ts` como wrapper tipado de la callable `recordMatchResult`.
- `TournamentAdminPanel` ahora expone una UI operativa dentro de `Fixture confirmado` para cada partido del torneo, con edición de:
  - `homeSets`
  - `awaySets`
  - `homePoints[]`
  - `awayPoints[]`
  - `winnerId` opcional con modo `Inferir por sets`
- Se extrajo `src/components/tournaments/admin/MatchResultModal.tsx` para concentrar la operación de carga/edición de resultados en un modal específico y evitar saturar cada card del fixture.
- Después de guardar un resultado se refrescan explícitamente:
  - `tournament`
  - `tournamentPhases`
  - `tournamentMatches`
  - `standings`
- `TournamentMatchSummaryList` pasó a aceptar un bloque opcional de detalle por partido para reutilizar el render del fixture sin mezclar lógica social y lógica de operación admin.
- La configuración `rules.setsToWin` / `settings.setsToWin` quedó documentada en UI como **sets máximos por partido**: al cargar resultados se valida que `homeSets + awaySets` sea igual o menor a ese valor.

#### Decisiones de implementación

- La carga de resultados sigue viviendo en el bloque de `Fixture confirmado`, pero la edición concreta se abrió en un modal para mantener la lista limpia y reducir errores de operación.
- Se soporta edición de resultados ya cargados para permitir correcciones operativas sin abrir una mutación adicional.
- `winnerId` sigue siendo opcional en frontend; si el usuario deja `Inferir por sets`, el backend mantiene la fuente de verdad para resolver el ganador.
- La entrada de puntos por set se resuelve como texto separado por comas para no sobrediseñar todavía una grilla dinámica por cantidad de sets.
- El modal muestra ayuda explícita sobre:
  - cómo completar sets;
  - que los puntos por set deben coincidir en cantidad entre local y visitante;
  - cómo se infiere el ganador;
  - y un preview del ganador antes de guardar.

#### Estado resultante

- **Alineado** el frontend con backend para registrar resultados de `TournamentMatch` vía callable.
- **Alineado** el refresco post-submit para reflejar avance automático de fase/finalización del torneo.
- **Alineado** el flujo admin con una UI más simple: botón `Cargar resultado` / `Editar resultado` en cada partido y modal contextual con validaciones básicas.
- **Pendiente** mejorar la experiencia visual de transición de fase con feedback más explícito cuando el backend genera una nueva fase o finaliza el torneo.
- **Pendiente** decidir si los puntos por set deben pasar de CSV libre a inputs por set generados dinámicamente según la cantidad final de sets cargados.

#### Próximos pasos sugeridos

1. Mostrar feedback contextual post-submit cuando `recordMatchResult` complete una fase (por ejemplo: “fase completada”, “siguiente fase generada”, “torneo finalizado”).
2. Resaltar en el timeline y en el shell admin cuando cambie `currentPhaseId/currentPhaseType` después de cargar el último resultado pendiente.
3. Evaluar una UI más estructurada para puntos por set (inputs por set) si operación necesita validaciones más estrictas que la entrada por CSV.
4. Definir si hace falta bloquear edición de resultados ya confirmados o auditar cambios con historial visible para admins.
5. Revisar si conviene renombrar técnicamente `setsToWin` en backend/frontend para que el nombre del campo también refleje que hoy representa sets máximos del partido y no “sets para ganar”.



### 16. Definición funcional pendiente antes de seguir con código

Se revisó el estado actual del módulo de torneos y, antes de seguir implementando cambios de UI/flujo, se acordó dejar documentados los pendientes funcionales y de producto que definen cómo debería evolucionar la experiencia.

#### Pendientes operativos del módulo de torneos

Estos puntos se consideran abiertos aunque ya exista base técnica parcial en backend/frontend:

1. **Permisos finos por torneo**
   - revisar que todas las operaciones sensibles validen no sólo `admin` global sino también pertenencia a `adminIds` del torneo;
   - confirmar especialmente la carga de resultados y cualquier transición de fase.
2. **Cierre real del torneo**
   - definir y luego implementar `finalizeTournament` como cierre explícito;
   - persistir `podiumTeamIds` y criterio de podio por formato (`liga`, `eliminacion`, `mixto`).
3. **Avance de fase basado en reglas configurables**
   - dejar de depender de criterios hardcodeados (por ejemplo clasificar siempre top 2);
   - usar `tournamentAdvancementRules`, `qualifyPerGroup`, criterios de seeding y desempates reales.
4. **Operación completa de eliminación directa**
   - definir cómo se construyen semifinal/final/tercer puesto o rondas sucesivas dentro del cuadro;
   - aclarar si cada ronda es una fase o si la fase `knockout` genera internamente nuevas llaves.
5. **Programación operativa del fixture**
   - definir edición de `scheduledDate`, `location` y orden operativo de partidos;
   - incorporar si la agenda es sólo informativa o también parte del control de avance.
6. **Cierre del flujo de inscripción del equipo**
   - definir cuándo queda congelado el roster;
   - calcular monto esperado con roster confirmado y no sólo con edición manual posterior;
   - evitar depender de escrituras directas desde cliente para datos críticos de roster/pago.
7. **Gestión completa de admins del torneo**
   - sumar quitar admin, restricciones sobre owner y reglas para no dejar torneos sin responsable.
8. **Cobertura de testing**
   - sumar casos de creación, inscripción, aceptación/rechazo, fixture, standings, resultados, avance y permisos.

#### Revisión funcional: card de “Mis torneos”

Situación observada:

- La card hoy prioriza **estado del torneo** + **fase actual** + métricas generales de ocupación/avance competitivo.
- Para el caso de “Mis torneos”, eso resulta útil pero insuficiente porque el usuario también necesita saber el **estado operativo de su equipo/inscripción**.

Decisión de producto propuesta:

- Mantener la misma base visual de card compartida para no duplicar diseño.
- En la variante de perfil (`Mis torneos`) agregar una capa específica de **estado de mi equipo** o **estado de mi inscripción**.
- Esa información no debería ocupar el lugar principal del estado del torneo, sino convivir con él en un bloque adicional y claramente separado.

#### Información recomendada para mostrar en la card de “Mis torneos”

Se propone que cada card de perfil muestre, además del estado del torneo:

1. **Estado de la inscripción/equipo**
   - `Pendiente`, `Aceptado`, `Rechazado`, `Equipo confirmado`, etc.
2. **Estado de elegibilidad para quedar listo**
   - `Listo para inscribirse`;
   - `Faltan jugadores`;
   - `Pago pendiente`;
   - `Pago parcial`;
   - `Listo pero pendiente de aprobación admin`.
3. **Resumen corto de roster**
   - `Jugadores cargados: X / mínimo Y`.
4. **Resumen corto de pago**
   - `Pago: pendiente / parcial / completo`.
   - opcionalmente: `$pagado / $esperado`.
5. **Próxima acción sugerida**
   - `Completá jugadores`;
   - `Registrar pago`;
   - `Esperando revisión del torneo`;
   - `Ver detalle del equipo`.

#### Estados derivados sugeridos para la card de perfil

Para evitar mostrar demasiados datos crudos, conviene derivar un estado resumen por equipo/inscripción:

- **No listo**: no cumple mínimo de jugadores.
- **Listo con pago pendiente**: cumple roster pero falta pago.
- **Listo para revisión**: cumple roster + pago y espera aceptación.
- **Aceptado / activo en torneo**: ya existe `tournamentTeam` aceptado.
- **Observado / rechazado**: quedó rechazado o necesita corrección.

La recomendación es que este estado derivado sea el mensaje dominante del bloque “mi equipo”, y que debajo se apoye con 1 o 2 datos objetivos (jugadores y pago).

#### Reutilización de cards entre secciones

Sí: la base del bloque está **reutilizada**.

Decisión registrada:

- La presentación compartida de cards/listados vive en `TournamentSummaryCard`.
- Esa card se usa como base tanto para listado público como para listado de perfil.
- La evolución recomendada no es duplicar la card, sino agregarle una **variante o slot específico de contexto** para perfil/admin cuando haga falta mostrar información del equipo propio.

Criterio sugerido:

- **Público**: foco en torneo, fase, cupos, progreso competitivo.
- **Perfil**: foco en torneo + estado de mi inscripción/equipo.
- **Admin**: si se reutiliza en el futuro, foco en operación y alertas pendientes.

#### Revisión funcional: admin de torneo “liga”

Observación reportada:

- En torneos `liga`, no se visualiza claramente ni grupo ni fixture; en algunos casos aparece sólo el título del bloque de fixture y el contenido queda vacío.

Hipótesis funcional a validar antes de programar:

1. Si el formato es `liga` con **un único grupo implícito**, la UI no debería intentar vender la idea de “grupos” como concepto principal.
2. Si sólo existe un grupo, la experiencia debería renombrar/contextualizar:
   - en vez de “Organización de grupos”, mostrar algo como `Participantes de la liga` o `Equipos confirmados`;
   - en vez de esconder el fixture, mostrar directamente el calendario/round robin de esa liga.
3. Si el fixture está vacío, el estado vacío debería explicarlo explícitamente:
   - `Todavía no se generó el fixture de la liga`;
   - `Confirmá equipos para generar las fechas`;
   - `Esta fase no usa grupos múltiples`.

Decisión sugerida:

- Diseñar una variante explícita para `round_robin`/liga donde:
  - no se fuerce la semántica de grupos múltiples;
  - el fixture se muestre como eje principal de la fase;
  - el estado vacío sea descriptivo y accionable.

#### Revisión funcional: carga de resultados mediante modal

Se considera mejor mover la carga de resultados a un **modal operativo** por partido.

Objetivos del modal:

- reducir ruido en el bloque de fixture confirmado;
- mejorar foco del operador;
- permitir copy más claro sobre local/visitante y sets/puntos.

Información mínima recomendada dentro del modal:

1. **Encabezado del partido**
   - nombre del torneo;
   - fase y ronda;
   - etiqueta visible de `Local` y `Visitante`.
2. **Descripción corta del cruce**
   - `Local: Equipo A`;
   - `Visitante: Equipo B`.
3. **Campos de sets con naming explícito**
   - `Sets ganados por Equipo A (local)`;
   - `Sets ganados por Equipo B (visitante)`.
4. **Campos de puntos por set con naming explícito**
   - `Puntos por set de Equipo A`;
   - `Puntos por set de Equipo B`.
5. **Ganador opcional**
   - mantener opción de inferencia automática, pero con labels por nombre real de equipo.
6. **Resumen/validación previa al submit**
   - indicar si el ganador se inferirá por sets;
   - remarcar si faltan datos o hay empate inválido en sets.

Decisión sugerida:

- Dejar la ficha resumida del partido en el fixture.
- Mover la edición/carga de resultados al modal disparado por CTA (`Cargar resultado` / `Editar resultado`).
- Aprovechar el modal para reforzar identidad de local/visitante y reducir errores de carga.

#### Revisión funcional: status bars por etapa

Situación actual:

- Las barras muestran principalmente porcentaje de equipos inscriptos/cupos cubiertos.
- Eso sirve para inscripción, pero no representa bien el avance de otras etapas.

Decisión de producto sugerida:

- Mantener una barra general sólo donde el indicador sea realmente significativo.
- Para las etapas competitivas, usar una métrica propia de la etapa actual.

Parámetros sugeridos por etapa:

1. **Inscripción / registration**
   - `% de cupos cubiertos`;
   - `equipos aceptados / máximo`.
2. **Armado de grupos**
   - `% de equipos asignados a grupos`;
   - `grupos confirmados / grupos esperados`.
3. **Fixture confirmado**
   - `% de partidos generados/programados`;
   - `partidos confirmados / partidos esperados`.
4. **Fase en juego (liga o grupos)**
   - `% de partidos completados`.
5. **Knockout / eliminación**
   - `% de cruces resueltos`;
   - o `equipos clasificados a la siguiente ronda / equipos en competencia`.
6. **Finalizado**
   - barra completa o reemplazo por estado de cierre + podio.

Criterio general:

- La barra debe responder a la pregunta: **“qué significa progreso en esta fase concreta”**.
- Si no hay una barra clara, conviene reemplazarla por KPIs puntuales en lugar de forzar un porcentaje ambiguo.

#### Revisión funcional: detalle del torneo por eliminación

Observación:

- En eliminación directa, mostrar “puntos” puede no ser el KPI más útil si la fase no se resuelve por tabla.

Decisión sugerida:

- En torneos/fases de eliminación, cambiar el foco del detalle competitivo:
  - mostrar cruces, ganadores y clasificados;
  - destacar qué equipos avanzan de ronda;
  - usar puntos sólo si existe una estadística secundaria relevante, no como eje principal.

Información recomendada para detalle de eliminación:

1. **Bracket o lista de cruces por ronda**.
2. **Estado de cada cruce** (`pendiente`, `en juego`, `completado`).
3. **Equipo clasificado / ganador del cruce**.
4. **Próxima ronda o próximo rival**, si ya está definido.
5. **Camino al título** o resumen de avance cuando el cuadro sea corto.

#### Próximos pasos definidos para la siguiente iteración de diseño/implementación

Antes de escribir código nuevo, la próxima iteración debería resolver este orden:

1. **Definir view-model de card de perfil**
   - qué estados derivados del equipo se mostrarán;
   - qué datos mínimos aparecen siempre;
   - qué CTA principal tendrá cada estado.
2. **Definir estrategia de reutilización de `TournamentSummaryCard`**
   - confirmar si se resuelve con `variant`, `slot`, `footer` o sub-bloque contextual.
3. **Diseñar experiencia específica de admin para `liga`**
   - variante sin grupos múltiples;
   - estado vacío claro para fixture;
   - prioridad visual del round robin.
4. **Diseñar modal de carga de resultados**
   - contenido, copy, validaciones y CTA;
   - cómo queda la tarjeta resumida del partido después de mover la edición fuera del bloque expandido.
5. **Redefinir progress/status bars por fase**
   - tabla de KPIs por `registration`, `group_stage`, `round_robin`, `knockout`, `final`.
6. **Definir detalle competitivo para eliminación**
   - qué reemplaza a la lectura basada en puntos;
   - cómo mostrar clasificados/ganadores de cada cruce.
7. **Recién después** pasar a implementación de UI + ajuste de queries/view-models.

#### Resultado esperado de esta definición previa

Si se sigue este orden, la próxima etapa de código debería poder avanzar con menos retrabajo porque ya quedarían definidos:

- el mensaje principal de las cards de perfil;
- qué partes de UI se reutilizan entre público y perfil;
- cómo se representa una liga con un solo grupo implícito;
- cómo se opera la carga de resultados sin saturar el panel admin;
- qué significa “progreso” en cada fase del torneo;
- cómo se cuenta el avance competitivo en eliminación directa.


### 17. Paso 1 implementado: view-model de estado del usuario en “Mis torneos”

Fecha: 2026-03-20

Se implementó `getUserTournamentState(params)` en `src/services/tournaments/tournamentViewModels.ts` para derivar un resumen de estado del usuario a partir de `tournament`, `registration` y `team`.

Cambios registrados:

- `getProfileTournamentListView()` ahora agrega `userState` a cada fila del listado de perfil.
- La composición cruza `registration` y `team` por `tournamentId::groupId` para no perder el contexto del usuario cuando la vista deduplica una inscripción aceptada frente a su equipo final.
- `TournamentSummaryCard` suma `variant="profile"` y renderiza un bloque específico con badge de estado, jugadores, pago y próxima acción.

Estados derivados implementados en esta iteración:

- `NOT_READY`: faltan jugadores para llegar al mínimo requerido.
- `READY_PENDING_PAYMENT`: el roster ya está listo, pero el pago sigue pendiente o parcial.
- `UNDER_REVIEW`: roster y pago completos, a la espera de revisión.
- `ACCEPTED`: el equipo ya fue aceptado / confirmado en el torneo.

Resultado esperado:

- el usuario entra a “Mis torneos” y entiende rápido si ya está adentro, qué le falta y cuál es la próxima acción sugerida.
