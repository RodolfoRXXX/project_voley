# IUX-07 — Informe de implementación y cierre de Inicio público y sidebar del MVP

## Estado y baseline

- Fecha de cierre: 16 de noviembre de 2026.
- Rama: `feat/iux-07-inicio-publico-sidebar-mvp`.
- Base: `dev@827379abfb10bab21141ef1f13e7bdfa822424bc`.
- Ficha documental: `7d9311e4df65f418931fd03771a083693f299dd9`.
- Implementación y pruebas: `18985c3865e872cb58b8862a1aebebeb30c229e9`.
- BUILD_ID aprobado en UAT: `MNZQG2uQHntRJuO3jLCF1`.
- BUILD_ID de la reconstrucción final de cierre: `UliVvIKyxlJ6EBVueJEE-`.
- Estado: **CERRADO — UAT HUMANA GENERAL APROBADA — SIN DESPLIEGUE NI CAMBIOS DE DATOS UAT**.

## Resultado implementado

El Inicio público presenta SPORTEXA como herramienta para crear, organizar y participar en grupos
deportivos. Conserva el acceso existente con Google y, con sesión iniciada, ofrece `Ir a Mis grupos`
hacia `/dashboard/groups`. Se retiraron `Torneos vigentes`, `Próximos partidos`, su estado local,
imports, skeletons y componentes exclusivos; los servicios y rutas de Torneos permanecen intactos.

La fuente compartida de navegación conserva `Inicio`, `Mis grupos`, `Explorar grupos`,
`Mis obligaciones` y `Mi perfil > Ficha personal`. Dejó de ofrecer `Grupos`, `Torneos`,
`Mi perfil > Mis torneos` y `Mi gestión > Torneos`; como `Mi gestión` no conserva otros hijos, no se
renderiza. Sidebar de escritorio y drawer móvil consumen el mismo inventario. El menú de cuenta de
Navbar mantiene únicamente sus acciones vigentes sin incorporar accesos equivalentes a Torneos.

`Explorar grupos` conserva la ruta canónica `/dashboard/groups/explore`, el matcher continúa
priorizando el destino más específico y el drawer se cierra al navegar. Las URL `/groups`,
`/tournaments`, `/profile/tournaments` y `/admin/tournaments`, junto con su código, datos y permisos,
quedan disponibles para retomar la etapa de Torneos después del MVP. El dashboard autenticado y sus
Pendientes no fueron modificados.

## Evidencia técnica final

| Gate | Resultado |
| --- | --- |
| TypeScript | PASS — `tsc --noEmit --incremental false` |
| ESLint focal | PASS — aplicación, navegación, fixture y runner IUX-07 |
| Navegador 1440×900 | PASS — Inicio, CTA autenticado, sidebar y menú de cuenta admin, sin enlaces de Torneos ni overflow |
| Navegador 360×800 | PASS — drawer admin, ruta canónica de Explorar, cierre al navegar y `scrollWidth=360` |
| Navegador 390×844 | PASS — drawer admin, ruta canónica de Explorar, cierre al navegar y `scrollWidth=390` |
| Build de producción | PASS — Next.js 16.1.3; reconstrucción final `UliVvIKyxlJ6EBVueJEE-` |
| Rutas preservadas | PASS — build conserva rutas públicas, personales y administrativas de Torneos |
| Búsqueda estática | PASS — sin destinos ni etiquetas de Torneos en las superficies de navegación IUX-07 |
| `git diff --check` | PASS |

Evidencia individual automatizada de escritorio:

```json
{"passed":true,"assertions":{"agreedTitle":true,"agreedCopy":true,"authenticatedCta":true,"retiredHomeBlocks":true,"noTournamentLinks":true,"noHorizontalOverflow":true,"desktopSidebarVisible":true,"desktopInventory":true,"adminAccountButton":true,"adminAccountMenu":true},"viewport":{"width":1440,"height":900,"scrollWidth":1440}}
```

Evidencia individual automatizada móvil, ejecutada tanto a 360×800 como a 390×844:

```json
{"passed":true,"assertions":{"agreedTitle":true,"agreedCopy":true,"authenticatedCta":true,"retiredHomeBlocks":true,"noTournamentLinks":true,"noHorizontalOverflow":true,"mobileAdminInventory":true,"canonicalExploreRoute":true,"mobileMenuClosed":true}}
```

## Aprobación humana y alcance acreditado

El usuario confirmó el 16 de noviembre de 2026 la **aprobación general de la UAT de IUX-07** y
autorizó cierre, versionado, integración en `dev` y push normal. El BUILD_ID conocido de esa UAT es
`MNZQG2uQHntRJuO3jLCF1`.

La aprobación fue comunicada como conformidad general del incremento, sin una enumeración separada
de observaciones humanas por escenario. Por esa razón, este cierre no atribuye a la UAT humana
comprobaciones individuales no informadas. Los checks detallados de copy, CTA con sesión sintética,
inventario administrador, ausencia de enlaces de Torneos, overflow, ruta de Explorar y cierre del
drawer corresponden a la evidencia automatizada reproducible precedente. La reconstrucción final
`UliVvIKyxlJ6EBVueJEE-` valida las mismas fuentes de aplicación después de la aprobación; no se
declara como un segundo recorrido humano.

## Datos, configuración y publicación

- No se ejecutaron seeds, backfills, migraciones, limpieza ni escrituras sobre datos UAT.
- `.env*`, `.next`, logs Firebase/Firestore/PubSub y exportaciones UAT permanecieron ignorados y
  fuera de los commits.
- No se modificaron Rules, índices, Functions, permisos ni contratos de Torneos.
- El cierre autoriza integración y push de Git; no autoriza ni ejecuta despliegue.
- No quedan decisiones funcionales pendientes dentro del alcance IUX-07.

## Declaración final

- Estado final: **CERRADO**.
- Criterios incumplidos: ninguno dentro del alcance.
- Deuda aceptada: ninguna nueva; los gates productivos IUX-02/E3 y pendientes anteriores no cambian.
- Responsable de aprobación: usuario/product owner.
- Fecha de cierre: 16 de noviembre de 2026.
