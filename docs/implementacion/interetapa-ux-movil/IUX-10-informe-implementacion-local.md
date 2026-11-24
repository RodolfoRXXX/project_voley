# IUX-10 — Informe de implementación local y UAT

Estado: cierre técnico y UAT aprobados; implementación versionada, integración y push autorizados; sin despliegue.

La ampliación post-UAT adoptada por D5-081 quedó implementada y validada. El usuario aprobó el BUILD_ID `y4yCbXKTQaTuXSSZFByXH`. La implementación y pruebas se versionaron en `89b4b252415d2782c7bfabb2d9c0277174180af7`; `visuals/`, configuración local, secretos, capturas, builds y exportaciones UAT permanecen fuera. No hubo despliegue.

## Implementación

- Preferencia opt-in en Ficha personal, inicialmente desactivada. La proyección de directorio se crea o retira transaccionalmente y nunca tiene acceso directo desde clientes.
- Directorio Owner-only por prefijo normalizado de nombre o apellido (mínimo 3, página máxima 10), cursor contextual con vencimiento de 10 minutos y `candidateRef` opaco.
- Invitación ligada a la Temporada original, administrada por el Owner vigente, con envío, cancelación, aceptación y declinación idempotentes.
- Exclusión física con solicitudes existentes mediante `pendingGroupJoinRequestGuards/{hash(groupId,personId)}`. Solicitud v1 e invitación v2 compiten por el mismo documento.
- Aceptación en tres fases. La fase central reutiliza `createGroupJoinRequestMembershipCapability`, único escritor canónico de alta/reactivación/renovación, incluido contador, padrón y outbox.
- Una aceptación coordinada bloquea el cierre; una invitación meramente pendiente no lo bloquea. Al detectar la Temporada original cerrada, se materializa `expired` y se libera el guard en una transacción recuperable.
- Las Rules mantienen todas las nuevas raíces en deny-all. Los índices quedan versionados para construcción remota posterior.
- Antes de desplegar Functions debe configurarse el secreto compartido `IUX10_CURSOR_SECRET`; el fallback aleatorio sirve sólo para ejecución local de una instancia y no garantiza continuidad entre instancias.
- El buscador incorpora una X accesible. Tanto la X como el borrado manual invalidan la generación en curso, limpian resultados, errores y cursor, vuelven a la ayuda inicial por debajo de tres caracteres y conservan el foco.
- Inicio consulta `N20_N31_N42_V2`: compone la proyección V1 canónica, sin modificarla, con las invitaciones pendientes revalidadas para la Cuenta destinataria. Los consumidores contextuales continúan solicitando V1 y los cursores quedan ligados a cobertura y generación.
- Mis grupos conserva Grupos actuales como contenido principal y agrega la fila contraída **Solicitudes e invitaciones**, con indicador no numérico, estados y paginaciones independientes, y vacío sólo después de completar ambas consultas.
- Los deep-links de solicitud e invitación abren el bloque, revalidan el recurso canónico, recorren su paginación si hace falta y enfocan el elemento exacto. La entrada normal no mueve el foco.
- Historial se publica en **Mi perfil → Historial de grupos** mediante `listMyGroupMembershipHistory`, de a cinco filas desplegables. Cuando existen varios períodos, las fechas se identifican como inicio/fin del último período y se advierte que no representan continuidad.

## Presupuesto del directorio

Página completa de 10 fichas, lookahead y estados variados: **95 lecturas lógicas** en el peor caso aprobado. La medición fija 4 de contexto, 11 de directorio, 20 active/admission guards y hasta 60 de validación de referencias/Membresía. El rate limiter agrega tres lecturas técnicas (Cuenta-minuto/burst y Grupo-minuto), informadas por separado: 98 lecturas lógicas totales del intento limitado. Como ya advierte la ficha, estas cifras no equivalen por sí solas a facturación ni latencia observada.

## UAT con dos cuentas y datos sintéticos

Usar un proyecto Emulator aislado y borrar exclusivamente sus datos sintéticos al terminar.

1. Cuenta A: crear Grupo sintético activo y Temporada abierta. No crear Persona para A. Confirmar que Integrantes → Agregar integrantes abre, busca y permite invitar.
2. Cuenta B: crear Persona sintética con correo de contacto. Confirmar que “Permitir que me encuentren” nace apagado y explica que administradores verán nombre, apellido y correo.
3. Activar la preferencia en B. En móvil (360 px), buscar desde A por tres letras con mayúsculas/tildes distintas. Verificar foco estable, paginación y los cuatro estados.
4. En A, invitar. En B, abrir Mis grupos → Invitaciones recibidas y declinar. Repetir con una invitación nueva y aceptar. Confirmar una sola Membresía, contador +1, padrón visible y evento outbox.
5. Repetir Aceptar simulando pérdida de respuesta. Debe recuperar la misma Membresía sin duplicar contador, padrón ni outbox.
6. Crear simultáneamente solicitud e invitación para el mismo Grupo/Persona. Sólo una debe adquirir el guard; la otra devuelve estado pendiente compatible.
7. Correr Aceptar en paralelo con Cancelar y luego con Declinar. Sólo un terminal gana; una respuesta tardía debe reflejar el terminal autoritativo.
8. Cerrar la Temporada original antes de aceptar. B ve invitación expirada; después de abrir otra Temporada, una nueva invitación o solicitud puede adquirir el guard.
9. Transferir ownership antes de cancelar y antes de aceptar. El Owner nuevo gestiona; el anterior pierde autorización. Cambiar de Cuenta durante una respuesta demorada y comprobar que la UI descarta/revalida el resultado.
10. Retirar en B el consentimiento y confirmar desaparición inmediata de búsquedas nuevas. Una invitación ya emitida sigue resolviéndose por su identidad interna.
11. Sembrar una solicitud v1 previa a IUX-10 y comprobar “Ver solicitud de ingreso” y exclusión de invitación.
12. Ensayar defensivamente una Persona sin correo: no puede activar localización y no aparece en el directorio.

## Validación local ejecutada

- IUX-10 focal y caracterización D5-081: 12/12 pruebas unitarias; cubre V1/V2, N42, guard compartido, composición de Mis grupos, navegación y destino de Historial.
- IUX-10 focal en Emulator: 1/1 escenario integral; además de opt-in, búsqueda, concurrencia y alta canónica, acredita aparición de N42 y desaparición tras aceptar, cancelar, declinar y expirar.
- Suite Emulator aislada: 8/8 lotes completados sin fallos, con proyectos `demo-*` y limpieza del runner.
- TypeScript: `tsc --noEmit --incremental false` OK.
- Build Next.js: OK; incluye `/dashboard/groups/[groupId]/members/add`.
- Lint contra baseline: OK, sin regresiones. El lint crudo conserva 30 errores y 8 warnings preexistentes fuera del alcance.
- Suite unitaria general: 490/491; el único fallo es la caracterización preexistente IUX-06A sobre `gridTemplateColumns` en Economía. En `dev@2d5a4b4` la prueba ya exige ese marcador y la página base ya carece de él; IUX-10 no modifica Economía.
- `git diff --check`: OK.

## Entorno local servido

- BUILD_ID servido tras los ajustes UAT del 24/11/2026: `y4yCbXKTQaTuXSSZFByXH`.
- Escritorio: `http://127.0.0.1:3000`.
- LAN: `http://192.168.2.172:3000`.
- Next.js escucha en `0.0.0.0:3000`; página y build manifest respondieron HTTP 200 por loopback y la entrada LAN respondió HTTP 200.
- Functions UAT ya estaba activa con el snapshot `demo-iux01-uat-checkpoint-live-20261118-094827` y recargó las definiciones desde source, incluida `listMyDashboardTasks`; no fue necesario reiniciarla.

## Preparación local de cobertura V2

Antes de reconciliar se exportó el checkpoint no destructivo `demo-iux01-uat-before-iux10-v2-20261118-152552`. Luego se ejecutó el operador canónico `iux-02a:backfill:emulator` contra `demo-iux01-uat`: procesó 2 Grupos y 2 usuarios, con `dirtyScopes=0`, `degradedScopes=0`, `failedEvents=0` y `processingEvents=0`. El estado resultante se preservó además en `demo-iux01-uat-after-iux10-v2-20261118-152718`; ninguna exportación anterior fue sobrescrita.

La implementación V2 es una composición de lectura: reutiliza la generación `live-v1` acreditada y agrega N42 desde la fuente canónica de invitaciones con revalidación en cada consulta. Por eso no materializa una segunda copia de N20/N31 ni necesitó una reconstrucción destructiva de datos UAT. La generación pública se liga como `live-v2.<generación-v1>`; V1 sigue disponible sin cambios. La única reconstrucción derivada ejecutada fue el backfill/reconciliación canónico anterior.

## Corrección UAT — navegación de Historial de grupos

La duplicación observada en escritorio y móvil provenía de dos entradas idénticas declaradas consecutivamente en `accountNavigationItems`; no era un problema de CSS ni de los renderers. Se retiró únicamente la declaración repetida. Sidebar y drawer siguen consumiendo `visibleAccountNavigationItems` y resolviendo el activo mediante `getActiveNavigationHref`.

El submenú **Mi perfil** queda fijado en este orden: **Resumen**, **Ficha personal**, **Historial de grupos**, **Mis obligaciones**. Una caracterización focal comprueba una sola etiqueta y un solo `href` de Historial, el orden exacto, el uso de la fuente compartida en ambos renderers y un único activo para la ruta canónica con o sin query string. Resultado focal de navegación: `9/9`; lint baseline, TypeScript y build Next.js aprobados.

## Ajustes UAT — invitaciones, Integrantes e Historial (24/11/2026)

- El límite anterior de Invitaciones enviadas era **10**: contrato con default/máximo 10 y UI solicitando `pageSize: 10`. El contrato Owner queda limitado a cinco y la UI solicita páginas de cinco.
- El backend pagina en dos fases firmadas: primero `pending` y luego los estados terminales; cada fase ordena por `createdAt DESC, __name__ DESC`. El cursor liga Owner, Grupo, tamaño y versión de orden. Un cambio de estado entre páginas puede hacer reaparecer un ID bajo su estado nuevo; la presentación fusiona por `invitationId`, reemplaza el DTO anterior y reconstruye el orden. **Actualizar** invalida la continuación y relee desde el inicio.
- Los estados visibles se centralizan como **Pendiente**, **Aceptada**, **Rechazada**, **Cancelada** y **Vencida**. También se centralizaron estados de candidatos y se ampliaron los mensajes en español para errores contractuales/técnicos sin exponer `reason` crudo.
- La fila Owner usa el mismo control `+`/`−` que las demás filas, conserva estado inicial contraído, `aria-expanded`, botón nativo y activación por teclado.
- Ficha personal ya no incluye un acceso interno a Historial. El submenú Mi perfil conserva la entrada canónica.
- Historial usa `GroupPageShell`, `backHref="/profile/info"`, ancho exterior, título, descripción y espaciado compartidos; el contenido conserva `max-w-2xl` y protecciones de ancho móvil.

Validación: focales `10/10`; Emulator sintético aislado `1/1` con 13 invitaciones, páginas `5/5/4`, estados mezclados, transición pendiente→aceptada entre páginas, deduplicación y refresh; lint baseline, TypeScript, sintaxis Functions `546/546`, build y `git diff --check` aprobados. Suite general `490/491`: el único fallo sigue siendo la caracterización previa IUX-06A de Economía, fuera de IUX-10. Las comprobaciones responsive se fijaron para 360/390 px mediante `min-w-0`, quiebres de texto, controles envolventes y ausencia de scroller horizontal propio; la aceptación visual final continúa en UAT manual.

## Pendiente operacional

- Construir remotamente los índices versionados.
- Desplegar Functions, Rules, índices y frontend sólo después de revisión y aprobación.

## Ampliación post-UAT implementada — D5-081

### Decisiones incorporadas

- X accesible y reset completo del buscador con foco estable y descarte por generación.
- Invitación recibida como tarea destinataria `IUX-N42`, con Grupo, Temporada y destino canónico para responder.
- Mis grupos conserva Grupos actuales y reúne Invitaciones/Solicitudes en un bloque compacto contraído, con indicador no numérico y coberturas independientes.
- Historial se traslada a **Mi perfil → Historial de grupos**, primera página 5 y `Cargar más` mediante el lector canónico.

### Evidencia y contratos afectados

- `dashboardTaskModel.js`, `dashboardTaskCursor.js`, `dashboardTaskQueryContract.js`, `firestoreDashboardTaskQueryV2.js`, `listMyDashboardTasks.js` y los DTO frontend incorporan `N20_N31_N42_V2`, N42 y cursores V2 sin ampliar silenciosamente V1.
- `groupInvitationModule.js` pagina invitaciones, presenta Grupo/Temporada y materializa expiración liberando el guard. Los terminales canónicos hacen que N42 desaparezca de la composición en la siguiente lectura.
- `PendingTasksSection.tsx` consume V2; los consumidores contextuales conservan el valor por defecto V1.
- `RequestsAndInvitationsSection.tsx`, `OwnGroupMembershipHistoryView.tsx` y las rutas de Mis grupos/Mi perfil implementan composición, deep-links, paginaciones y compatibilidad de enlaces anteriores.
- `listMyGroupMembershipHistory` ya filtra `estado=finalizada`, pagina 1–20 y ordena por egreso/ID. Para raíces con varios Períodos, valida primero/último pero devuelve las fechas del último Período y `validityPeriodCount`; la nueva UI debe nombrarlo como último período y no continuidad.
- `getMyGroupInvitation` permite resolver el deep-link sin recorrer páginas. `getMyCurrentGroupJoinRequest(groupId)` permite localizar una Solicitud propia y verificar el `requestId` recibido.
- `listMyPendingGroupInvitations` pagina con cursor y entrega la presentación de Grupo/Temporada requerida; los localizadores canónicos resuelven deep-links sin barrer páginas.

### Matriz de UAT cubierta y evidencia

- cambio de Cuenta durante respuestas demoradas y autorización N42 con sesiones reales;
- caracterización visual de contadores, cursores y foco con datos UAT variados;
- buscador con X/borrado manual, menos de tres caracteres, foco y respuestas fuera de orden;
- Mis grupos con las cuatro combinaciones vacío/resultado/error de ambas consultas, paginación independiente y deep-links;
- historial con una Membresía simple, reactivada con interrupción y renovada, cinco + `Cargar más`, redirecciones y descarte tardío;
- UAT con dos Cuentas en 360×800, 390×844, escritorio, teclado, zoom 200 % y lector de pantalla.

No queda una decisión funcional nueva ni una brecha de dominio conocida. La UAT humana del build indicado fue aprobada; la lista precedente conserva la matriz que se contrastó y no debe reinterpretarse como habilitación productiva.

## Cierre D5-082

### Evidencia paginada de 13 Invitaciones

El Emulator aislado creó `iux-10-page-invitation-00`…`12`. Página 1: `12,11,10,09,08` pendientes. Luego `12` cambió a aceptada. Página 2: `07` pendiente, `12` aceptada, `06,05,04` terminales. Página 3: `03,02,01,00`. El transporte produjo `5/5/4` y 14 apariciones porque el registro `12` cruzó de bloque; la fusión estable por `invitationId` produjo 13 IDs únicos y reemplazó su estado por aceptada. La acción **Actualizar** invalidó cursores y reconstruyó el listado.

### Contrato V2 final

La implementación usa composición de lectura, no una proyección física V2. Recorre V1 y las Invitaciones pendientes en páginas fuente de 10, con máximo 100 páginas por fuente, revalida autorización y combina bajo `live-v2.<generation-v1>`. El cursor firmado liga Cuenta, coverage, generación, filtro global y ancla; V1 y V2 no intercambian cursores. Totales y contadores se calculan sobre la unión revalidada. La continuación es live, no snapshot, por lo que la UI deduplica y una recarga reconstruye.

Una página N42 completa presupone hasta 43 lecturas lógicas aproximadas —2 identidad, 11 consulta/lookahead y hasta 30 de Grupo/Temporada/guard— además del costo V1. El límite de 100 páginas es un fusible técnico, no un presupuesto productivo. Se eligió esta variante porque elimina segunda autoridad, outbox N42, backfill y reconciliación de copia, y hace que aceptar/declinar/cancelar/expirar desaparezcan en la próxima lectura. El backfill UAT previo reconcilió sólo V1: 2 Grupos, 2 usuarios, cero dirty/degraded/failed/processing; no hubo reconstrucción V2.

### Resultado de cierre y pendientes

- Automatizado: focales `12/12`; Emulator sintético aislado `1/1`; TypeScript OK; lint baseline OK con 30 errores/8 warnings conocidos y 12 hallazgos resueltos; build Next OK, 24 páginas; `git diff --check` OK; suite general `490/491` con el único fallo base IUX-06A documentado.
- Humano: UAT funcional/visual aprobada para `y4yCbXKTQaTuXSSZFByXH`, con recorridos de dos Cuentas, escritorio/móvil, navegación, estados y paginación.
- Operacional: faltan secretos estables `IUX10_CURSOR_SECRET` y `DASHBOARD_TASK_CURSOR_SECRET`, construcción/verificación remota de índices, medición productiva V2 y habilitación/rollback coordinados de Functions, Rules, índices y frontend. No hubo despliegue; datos y exportaciones UAT se preservan.
