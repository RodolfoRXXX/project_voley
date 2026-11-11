# IUX-06C1 — Informe de implementación y UAT

## Corte

- Rama local: `feat/iux-06c1-integrantes`.
- Base verificada: `e1fbb05354daef2361fc9eefe72173c6a2f6ec99` (`dev` y `origin/dev`).
- Estado de entrega: cierre técnico local preparado para versionado en esta rama; sin despliegue productivo.
- Alcance diferido: el total exacto y la búsqueda corresponden a IUX-06C2.

## Resultado funcional

- «Tu membresía» quedó integrada como primera fila del padrón y contraída inicialmente, tanto con membresía activa como sin ella.
- La fila usa un botón nativo: abre y cierra con clic, Enter o Espacio; expone `aria-expanded`, muestra un chevron acorde al estado y conserva foco visible.
- El Owner se presenta una sola vez y el resto del padrón conserva paginación, orden y deduplicación al cargar páginas adicionales.
- El estado sin Persona enlaza a la misma ficha personal con el texto «Crear mi ficha personal».
- El mensaje final sin ficha es «Seguís administrando el grupo. Para sumarte como integrante, necesitás crear tu ficha personal.».
- El mensaje final elegible, cuando ya existe ficha y Temporada abierta, es «Ya podés sumarte como integrante y seguir administrando el grupo.».
- El estado sin temporada conserva la precondición y el acceso para crear y abrir una temporada, sin el texto retirado del padrón.
- El detalle activo muestra `ACTIVA` en verde e «Integrante desde», sin caja verde ni ID de temporada; conserva cargo y acciones canónicas.
- Las acciones se apilan cuando no hay ancho suficiente.

## Hallazgo de aprobación en «Solicitudes pendientes»

### Causa

La aprobación no fallaba. Mientras el Owner aprobaba, la lectura puntual iniciada por el enlace profundo (`getPendingGroupJoinRequestForOwnedGroup`) podía seguir en vuelo. El comando persistía correctamente la decisión y la membresía; después, esa lectura anterior respondía `REQUEST_NOT_PENDING` y publicaba el mensaje genérico «La solicitud ya fue resuelta, no existe o no tenés acceso.». Por lo tanto, el mensaje provenía de una lectura posterior tardía, no de la acción de aprobación.

### Corrección

- Al confirmar una decisión, la solicitud se marca terminal, se retira localmente de Pendientes y se descarta cualquier respuesta tardía asociada.
- Una aprobación confirmada emite `group-membership-changed`; el padrón vuelve a leerse desde su fuente canónica y muestra al nuevo integrante.
- Ante `REQUEST_NOT_PENDING`, resolución concurrente o resultado incierto, se consulta el resultado autoritativo y se presenta `APPROVED`, `REJECTED`, `CANCELLED`, `PENDING` o `APPROVAL_IN_PROGRESS` según corresponda.
- La limpieza visual nunca reenvía el comando de aprobación.

### Prueba con dos cuentas sobre los datos UAT preservados

- Grupo: `NFlj3fzgs7r0NID2HNe8` («Grupo UAT B posterior»).
- Solicitud: `5ZH047RkNQaPD0n8byhf`.
- Cuenta Owner: `rIfAT6ty1BCTanAJermVz4n09HKl` (Dario Biedra).
- Cuenta solicitante: `ZAAKJjC5PXpgsC4lFyLSt1tNNeut` (Juan Pelota).
- La intención consumida por el comando registró `outcome=APPROVED`; su respuesta canónica corresponde a `decision.requestId=5ZH047RkNQaPD0n8byhf`, `decision.estado=aprobada` y `decision.membership.id=9nBFe8GnMWCO90CNo6lR` (decisión persistida el `2026-11-11T12:44:38.661Z`).
- El resultado autoritativo consultado como Owner respondió HTTP 200 con `APPROVED` y la membresía `9nBFe8GnMWCO90CNo6lR`.
- El documento de solicitud persistió `estado=aprobada`; la intención quedó `consumed`, con `outcome=APPROVED`. La membresía quedó activa en la temporada `fJaIdTRoNI4kRjhdYMrT`.
- La lista de pendientes del Owner respondió vacía y el lector canónico del padrón incluyó a Juan junto con el Owner.
- El lector canónico consultado como solicitante devolvió la membresía activa del mismo grupo con `viewerIsOwner=false`.
- No se repitió la aprobación, no se resembraron datos y no se reiniciaron los emuladores.

## Clasificación de la evidencia UAT

### Comprobaciones humanas realizadas

- La UAT informada por el usuario detectó que la fila Owner debía iniciar contraída, el mensaje residual posterior a aprobar, el texto general sin Temporada, la etiqueta «Crear mi Persona» y la presentación excesiva del detalle activo.
- La misma revisión permitió fijar los dos textos finales de los estados sin ficha y elegible.
- Estas observaciones acreditan los recorridos y defectos vistos antes de la corrección; no se reinterpretan como una ejecución humana completa posterior al último build.

### Comprobaciones técnicas realizadas

- Se inspeccionaron el comando canónico, la intención consumida, la Solicitud persistida y la Membresía creada.
- Se autenticaron las dos cuentas UAT existentes contra Auth Emulator y se ejecutaron sólo lectores canónicos: resultado autoritativo del Owner, Pendientes, padrón Owner y Membresías actuales del solicitante.
- Se verificaron por prueba estructural el orden Owner, contracción inicial, asociación de mensajes a `person-required`/`eligible`, accesibilidad del botón, deduplicación entre páginas y descarte de la lectura tardía.

### Comprobaciones humanas pendientes

- Aprobar una Solicitud humana nueva después de la corrección y confirmar visualmente, sin recarga, su retiro de Pendientes, el alta en el padrón y la ausencia de error residual.
- Repetir de punta a punta Owner con Membresía activa, Owner sin Membresía, Owner sin Persona y consulta como integrante.
- Completar revisión visual en escritorio y Android 360/390 px, incluida navegación real por teclado externo/tecnología asistiva cuando corresponda.

## Comparación del lote 6 de Emulator

- Corrida histórica del corte: 40/42, con dos fallos en `administrativeReceiptConcurrencyE3.test.js` (caso principal «E3-04 evidencia focal de coordinación, recovery e historia v1/v2») y `dashboardTaskProjectionIux02a.test.js` (suite de proyección IUX-02A). Ambos están fuera del código modificado por C1.
- Repetición canónica completa en la rama: lote 6, 42/42; gate total, 8/8 lotes aprobados.
- Comparación aislada: exportación exacta de `e1fbb05354daef2361fc9eefe72173c6a2f6ec99`, mismo lote 6 y mismas dependencias, 42/42.
- Conclusión: los dos fallos históricos no se reprodujeron ni en la rama ni en la base. No existe evidencia para clasificarlos como fallos preexistentes confirmados ni como regresión de IUX-06C1; se registran como intermitencias históricas no reproducibles. Una primera corrida base inválida por montaje incompleto (`firebase` ausente en el frontend temporal) fue descartada y repetida correctamente.

## Validación

- Pruebas focales de padrón/aprobación: 44/44 aprobadas.
- Gate Emulator canónico: 8/8 lotes; lote 6 42/42.
- Lote 6 sobre base aislada: 42/42.
- TypeScript: `npm run typecheck`, aprobado.
- Lint: `npm run lint:baseline`, aprobado sin deuda nueva; 11 hallazgos resueltos respecto del baseline.
- Build de producción: `npm run build`, aprobado.
- Integridad del diff: `git diff --check`, aprobado. Git sólo informó la conversión futura LF/CRLF de un archivo, sin errores de whitespace.

## UAT LAN

- `BUILD_ID`: `B1cepTQSDoi7i8H2oWAQ4`.
- Escritorio local: `http://127.0.0.1:3000`.
- Android/LAN principal: `http://192.168.44.184:3000`.
- Interfaz LAN alternativa disponible: `http://192.168.2.172:3000`.
- La raíz y el manifiesto del build respondieron HTTP 200.
- Se reemplazó solamente el proceso Next del puerto 3000. Functions (5001), Firestore (8080), Auth (9099) y Emulator UI (4000) permanecieron activos con los datos UAT existentes.

### Revisión en escritorio

1. Abrir la URL local e ingresar como Owner.
2. Ir al grupo UAT y abrir «Integrantes»; confirmar que el Owner aparece primero y contraído.
3. Abrir y cerrar la fila con clic, Enter y Espacio; verificar chevron y foco visible.
4. Expandir el Owner activo y verificar `ACTIVA`, «Integrante desde», cargo y acciones, sin caja verde ni ID de temporada.
5. Revisar los escenarios Owner sin membresía y Owner sin Persona; confirmar la precondición de temporada y «Crear mi ficha personal».
6. Aprobar una solicitud pendiente nueva con una segunda cuenta; confirmar que desaparece de Pendientes, que el padrón incorpora al usuario y que no queda el error residual.
7. Cargar páginas adicionales y comprobar que el Owner no se duplica.

### Revisión en Android

1. Conectar el dispositivo a la misma red y abrir la URL LAN principal; si esa interfaz no es alcanzable, usar la alternativa.
2. Repetir los escenarios anteriores con toque y navegación por teclado externo cuando esté disponible.
3. Verificar que las acciones se apilan sin desborde y que las filas, textos y botones conservan ancho táctil y foco visible.
