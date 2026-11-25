# IUX-11A.1 — Informe de implementación local

- **Fecha:** 25 de noviembre de 2026.
- **Rama:** `feat/iux-11a-fichas-administrativas`.
- **Estado:** `CERRADO; IUX-11A E IUX-11A.1 CON UAT HUMANA APROBADA`.
- **Decisión:** D5-084.
- **Build UAT:** `gdZvN1YTNPMteaRxngA6N`.
- **URL UAT:** `http://localhost:3100`.
- **Definición versionada:** `5f01f6116ca6fab655aa44a053563cb75e7cfdfd`.
- **Implementación y pruebas:** `67030348fbcc37d937a131dc60d87221e93a3dee`.
- **Aprobación humana:** confirmada el 25 de noviembre de 2026 para ambos cortes y sus ajustes finales.

## Alcance implementado

1. Alta administrativa desde un modal accesible con foco inicial, trampa de foco, `Escape`, retorno al disparador, datos conservados ante error, intención estable ante respuesta incierta y single-flight.
2. `Editar ficha` sólo cuando el DTO del padrón devuelve custodia `EDITABLE`, con `personId`, revisión y correo vigentes acreditados por backend.
3. Caja integrada y pestañas URL-driven `members`, `non-members` e `invitations`. `joinRequestId` e `invitationId` seleccionan y localizan su panel; recarga y Atrás/Adelante derivan nuevamente la vista desde la URL.
4. No integrantes Owner-only, página máxima 20 y cursor firmado ligado a actor/Grupo. El lector excluye Membresías activas y conserva finalizadas o ausencia de historia.
5. Reincorporación por preview firmado y confirmación idempotente sobre el writer canónico: `CREATE`, `REACTIVATE` o `RENEW`. Contador, padrón, búsqueda, períodos, guards y tareas se actualizan por ese writer.
6. Invitaciones Owner-only, pendientes antes de terminales, páginas de cinco, deep-link a detalle y cancelación de pendientes. Lectura y cancelación histórica funcionan para el Owner vigente de un Grupo archivado; crear y aceptar continúan prohibidos.

## Ajustes UAT incorporados

1. La reincorporación reemplaza el diálogo nativo por un `alertdialog` accesible. Muestra integrante y nombre de la Temporada acreditado por backend, enfoca `Cancelar`, contiene el foco, admite `Escape`, retorna al disparador y conserva preview e idempotency key frente a un error reintentable. Durante el envío ambas acciones quedan deshabilitadas y el single-flight impide confirmaciones duplicadas.
2. La confirmación vuelve a acreditar Owner, custodia, revisión y Temporada abierta. Si la Temporada se cerró o cambió desde el preview, responde `CONTEXT_CHANGED`; el writer canónico conserva su revalidación de Membresía y estrategia.
3. `Reincorporar`, `Editar ficha`, `Editar cargo`, finalización y pestañas comparten cursor, hover, foco visible y estados deshabilitados, sin cambiar selección URL-driven ni semántica ARIA.
4. El alta se presenta como **Crear integrante** tanto en el acceso general como en el resultado válido sin coincidencias. Búsqueda inicial, carga, error y cero resultados permanecen como estados distintos.
5. El modal de alta explica el alcance actual del correo opcional: no envía invitación ni vincula una Cuenta. Conserva foco inicial, `Escape`, retorno de foco, datos ante error e intención estable.
6. Se actualizaron las descripciones de Integrantes, No integrantes e Invitaciones con los textos aprobados.

La búsqueda de Cuentas sin Persona no fue implementada ni se modificó su contrato.

## Validación técnica

- TypeScript: OK.
- ESLint focal de los archivos A.1: OK. Lint baseline de cierre: OK, con `30` errores y `8` warnings conocidos y `12` hallazgos resueltos respecto del baseline.
- Sintaxis Functions: `556/556` archivos OK.
- Unitarias focales IUX-10/IUX-11A.1: `5/5` OK.
- Emulator IUX-11A/A.1: `1/1` OK; cubre alta, retry, corrección, paginación, custodia por fila, `CREATE`, `REACTIVATE`, `RENEW`, recuperación sin duplicados, contador, padrón, búsqueda, economía preservada y rechazo de confirmación cuando la Temporada abierta cambió después del preview.
- Emulator Invitaciones IUX-10: `1/1` OK; incluye lectura y cancelación con Grupo archivado.
- Suite unitaria general de cierre: `492/493`; permanece el único fallo preexistente de `iux06aPresentation.test.js:41`. Se reprodujo aisladamente (`2/3`): la aserción exige `gridTemplateColumns`, marcador retirado por la composición vigente de Economía/IUX-06D. No pertenece a IUX-11A/A.1 ni cambia su aceptación.
- Build Next.js: OK.
- `git diff --check`: OK.

## Revisión responsive

Revisión estructural completada para escritorio, 390 px y 360 px:

- las pestañas permanecen en la misma caja y usan desplazamiento horizontal contenido en anchos estrechos;
- filas y acciones pasan de columna a fila desde `sm`, sin imponer anchos mínimos de escritorio;
- modal usa margen exterior de 16 px, ancho máximo y scroll vertical del overlay;
- nombres y correos permiten corte seguro; todos los controles mantienen altura mínima de 44 px;
- No integrantes e Invitaciones conservan controles y estados dentro del panel, sin un segundo scroller vertical.

La presentación y los recorridos de escritorio, 390 px y 360 px recibieron aprobación humana sobre el BUILD_ID registrado.

## Evidencia de UAT aprobada

1. Abrir un Grupo activo como Owner y entrar en **Integrantes**. Confirmar caja única y navegación entre las tres pestañas; usar Atrás/Adelante y recargar cada URL.
2. Ir a **Agregar integrantes → Crear integrante**. Verificar foco en Nombre, recorrido de foco, `Escape`, retorno al botón y ausencia de doble envío. Confirmar los textos de alcance del correo. Forzar un error transitorio, comprobar que los campos se conservan y reintentar.
3. Ejecutar una búsqueda válida sin resultados. Confirmar el mensaje aprobado y abrir **Crear integrante** desde ese estado; cerrar el modal y verificar el retorno de foco a ese disparador. Repetir desde el acceso general sin buscar.
4. Expandir una fila administrativa activa: debe aparecer **Editar ficha**. En una Persona no administrativa no debe aparecer. Corregir nombre/correo y verificar padrón y búsqueda actualizados.
5. Finalizar una Membresía administrativa y abrir **No integrantes**. Verificar la fila, editarla y recorrer más de una página si hay datos suficientes.
6. Abrir **Reincorporar**. Confirmar nombre y Temporada, foco inicial en **Cancelar**, `Escape`, trampa y retorno de foco. Confirmar el texto de conservación histórica; probar carga, doble activación y un error recuperable. Reincorporar fichas `CREATE`, `REACTIVATE` y `RENEW` sin duplicados.
7. Abrir **Invitaciones** con más de cinco registros. Confirmar pendientes primero, terminales después, paginación y cancelación.
8. Archivar el Grupo. Confirmar que No integrantes permite lectura/corrección sin reincorporar y que Invitaciones permite lectura histórica y cancelación de pendientes, sin alta ni aceptación.
9. Repetir los recorridos en escritorio, 390 px y 360 px, incluyendo teclado, foco visible, hover, disabled y ausencia de overflow horizontal no intencional.

## Exclusiones y preservación

- Sin despliegue ni modificación de datos UAT.
- `visuals/`, configuración local, secretos, builds y exportaciones permanecen fuera de Git.
- Vinculación IUX-11B, fusión IUX-11C, correo externo IUX-11D y búsqueda de Cuentas sin Persona permanecen pendientes y fuera de A/A.1.
