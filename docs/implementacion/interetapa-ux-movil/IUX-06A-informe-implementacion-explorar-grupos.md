# IUX-06A — Informe de implementación y cierre local de Explorar grupos

- Fecha de verificación: 2026-11-10.
- Base documental: `ee86c377bfe29c907bfc15dae27a201fbf7d5967`.
- Commit de implementación: `115ee7f306b1a46e8de55fda6e6700430d13f4e0`.
- Rama: `feat/iux-06a-explorar-grupos`.
- Alcance: sólo IUX-06A; IUX-06B, C1, C2 y D permanecen fuera.
- Estado: cierre técnico local validado; sin push, merge ni despliegue.

## Resultado implementado

El catálogo admite los códigos estables `voleibol`, `futbol`, `basquet`, `handball`, `hockey`,
`rugby`, `tenis`, `padel` y `otro`. `otro` no agrega texto libre ni comportamiento. Los Grupos v1
conservan compatibilidad como `voleibol`.

La publicación usa la colección técnica privada `groupExplorationPublications`. Su ausencia
significa `invite_only`: Grupos nuevos y existentes empiezan “Solo por invitación” sin migración.
Sólo el Owner vigente de un Grupo activo puede publicar o quitar la publicación desde el menú de
tres puntos. Archivar o eliminar quita la proyección en la misma transacción.

`listExploreGroups` revalida el Grupo y la Membresía activa. Devuelve el mínimo necesario
—identificador, nombre, deporte y estado de la Solicitud propia—, excluye Grupos inactivos,
administrados o integrados por la cuenta y no expone solicitudes de terceros. El estado propio sale
del guard/solicitud canónicos por página; si no puede acreditarse no se interpreta como ausencia. La
UI muestra “Solicitud pendiente” sin una llamada por tarjeta. La colección técnica permanece
deny-all para clientes; no se modificaron Rules ni índices.

El flujo canónico acepta el origen cerrado `EXPLORE`. Vista previa y creación comprueban la
publicación; la creación la revalida dentro de su transacción y conserva la protección frente a
duplicados. El enlace compartido continúa funcionando y despublicar no modifica Solicitudes ni sus
guards. Una cuenta sin Persona puede explorar, pero recibe `PERSON_REQUIRED`, la acción queda
deshabilitada y se ofrece `/profile/person`, también desde el enlace compartido.

## Ajustes incorporados después de UAT

- `Explorar grupos` usa la navegación compartida en sidebar y móvil, con igual destino y estado
  activo.
- La tarjeta refleja `ownRequestStatus: pending` desde el estado canónico propio, comunica “Tu
  solicitud de ingreso está pendiente” y ofrece “Ver solicitud” hacia el detalle canónico. Allí la
  cuenta puede cancelar; volver o recargar Explorar reconsulta el estado y, si las reglas lo
  permiten, vuelve a ofrecer “Solicitar ingreso”. No se incorporan llamadas por tarjeta.
- El detalle administrado e integrado comparte la presentación de pestañas, foco, adaptación móvil
  y rutas/permisos por rol, incluido Owner que también integra el Grupo.
- Economía del Grupo integra visualmente Deudas, Pagos informados e Historial en la caja del panel
  activo. Es sólo presentación: conserva contenido, permisos, deep-links, historial y pestaña activa.
  Conceptos y la reorganización de contenidos siguen en IUX-06D.

Solicitudes pendientes de Mis grupos, cancelación e historial siguen en IUX-06B. No se implementó
alcance de IUX-06C1, C2 o D.

## Evidencia automatizada

La prueba focal usa el proyecto sintético `demo-sportexa-e0-02` con Auth, Firestore y Functions
Emulator. Crea identidades descartables y limpia sus fixtures; no altera datos UAT existentes.

| Escenario | Evidencia | Resultado |
| --- | --- | --- |
| Publicar, descubrir y solicitar con cuentas distintas | callable Owner, catálogo y Solicitud `EXPLORE` | PASS |
| Solicitud propia pendiente | catálogo cambia de `none` a `pending`; sin consulta por tarjeta | PASS |
| Detalle y cancelación propia | abre el estado autoritativo, cancela y el catálogo vuelve a `none` incluso al recargar | PASS |
| Explorar sin Persona | catálogo visible y preview `PERSON_REQUIRED` | PASS |
| Despublicar | sale del catálogo; enlace y Solicitud pendiente continúan | PASS |
| Tarjeta obsoleta | nueva Solicitud devuelve `GROUP_NOT_AVAILABLE` | PASS |
| Cuenta ajena | mutación devuelve `GROUP_NOT_ACCESSIBLE` | PASS |
| Exclusiones | Owner e integrante activo no reciben el Grupo | PASS |
| Privacidad | DTO mínimo propio; proyección inaccesible al cliente | PASS |
| “Otro” e histórico | alta/lectura de `otro`, privado inicial y Grupo v1 compatible | PASS |

Comando focal reproducible:

```powershell
$env:IUX_06A_FOCAL='1'
npm --prefix volley-ranking-system/functions run test:infra:emulators
Remove-Item Env:IUX_06A_FOCAL
```

| Gate final | Resultado |
| --- | --- |
| Unitarias focales de navegación/presentación | PASS — 24/24 |
| Unitarias completas | PASS — 459/459 |
| Emulator focal / completo | PASS — 1/1 y 8/8 tandas |
| TypeScript | PASS |
| Functions syntax | PASS — 509/509 archivos |
| Lint baseline | PASS — 31 errores conocidos, 8 warnings, 11 resueltos; sin regresiones |
| Build Next.js | PASS; incluye `/dashboard/groups/explore` |
| `git diff --check` | PASS |

### Revalidación del hallazgo UAT: acceso a la Solicitud pendiente

El ajuste posterior al cierre local quedó validado con 13/13 pruebas unitarias focales y 1/1 prueba
de Emulator IUX-06A. El recorrido sintético ejecutó `enviar → listar pending → abrir el detalle
propio → cancelar → listar none → recargar/listar none → volver a solicitar`, conservando la
publicación. TypeScript, lint focal, sintaxis del archivo backend, build Next.js y
`git diff --check` también finalizaron en PASS. La tarjeta no recibe `requestId`, no consulta por
fila y no expone datos de terceros: “Ver solicitud” abre la ruta canónica, que resuelve la Solicitud
propia en backend. La cancelación revalida titularidad y estado en transacción y distingue si una
carrera ya la dejó aprobada, rechazada o cancelada.

## Evidencia humana y UAT pendiente

El usuario confirmó visualmente el 2026-11-10 el último ajuste de Economía del Grupo: pestañas
integradas a la caja y selección distinguible. Esto no amplía IUX-06D ni acredita un cambio
funcional en Economía.

El usuario aceptó además el último recorrido de Explorar: el aviso “Tu solicitud de ingreso está
pendiente” comunica el estado, “Ver solicitud” abre la Solicitud propia y la acción canónica permite
cancelarla. Esta aceptación humana se registra por separado de la evidencia automatizada anterior.

Sidebar y pestañas del detalle cuentan con pruebas focales, análisis estático, Emulator y build,
pero no con reconfirmación humana posterior. Queda pendiente en navegador autenticado de escritorio
y Android:

1. Confirmar `Explorar grupos` en sidebar y su estado activo.
2. Recorrer pestañas como Owner, integrante y Owner-integrante; revisar foco, Atrás/Adelante,
   rutas, etiquetas y permisos.
3. A 360 y 390 px, comprobar ausencia de desborde horizontal y doble scroll.
4. Repetir publicar, descubrir, despublicar, enlace, cuenta sin Persona, exclusiones y
   Grupo “Otro” para acreditar la presentación completa, no sólo los contratos.

No queda un fallo funcional conocido que impida el cierre técnico local. No hubo verificación
remota ni despliegue. No se modificaron configuración, índices, Rules, datos UAT persistentes ni
alcance IUX-06B/C1/C2/D.
