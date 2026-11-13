# IUX-06D — Informe de implementación de Economía del Grupo

## Estado y baseline

- Fecha técnica: 13 de noviembre de 2026.
- Rama local: `feat/iux-06d-economia-grupo`.
- Base verificada: `dev` y `origin/dev` en `953984bacaffff618f85b8074e6fada2506ce511` después de `fetch --prune`.
- BUILD_ID aprobado y servido: `NlxWGcw83yQphYlrWDiE2`.
- Estado: **cerrado y versionado localmente; UAT humana aprobada; sin push, deploy ni cambios de
  datos UAT**.

## Resultado

Economía conserva el panel y presenta cuatro destinos integrados:

1. **Deudas**: obligaciones pendientes, saldadas y anuladas. Conserva detalle, registro permitido y
   las restricciones de Grupo archivado de los comandos existentes.
2. **Pagos informados**: avisos pendientes y, sólo para Owner, el bloque independiente **Avisos
   resueltos**, con carga, error, retry y cursor propios. Incluye estados `CONFIRMED`, `REJECTED` y
   `RESOLVED_BY_ADMINISTRATIVE_RECEIPT`.
3. **Historial**: recepciones/ingresos registrados y movimientos de ingreso. `GROUP_TREASURY`
   conserva sólo consulta; la historia y reversión de recepciones continúa Owner-only. Historia de
   pagos inicia contraída en cada entrada y recarga.
4. **Conceptos**, sólo para Owner: listado y controles existentes de alta, renombrado, importe,
   desactivación, cobros específicos y generación autorizada.

Se agregó `listOwnerResolvedPaymentDeliveries`, un lector backend paginado, cerrado y Owner-only.
El detalle Owner existente admite ahora todos los estados canónicos. Un aviso resuelto por registro
administrativo muestra el `administrativeReceiptId`; el registro histórico explica que se trata de
un único ingreso y que los avisos relacionados no generan pagos adicionales.

La URL mantiene `tab` y `deliveryId`. Las pestañas se implementan con enlaces reales, por lo que
recarga, Atrás/Adelante y navegación por teclado conservan el estado del historial del navegador.
Las cuentas delegadas reciben sólo las pestañas derivadas de `GROUP_TREASURY`,
`GROUP_PAYMENT_NOTICE_REVIEW` y `GROUP_DIRECT_PAYMENT_RECORD`; ninguna etiqueta concede autoridad.

## Evidencia ejecutada

| Gate | Resultado |
| --- | --- |
| Unitarias focales `paymentDeliveryE3.test.js` | PASS — 10/10 |
| Emulator E3-03/IUX-06D | PASS — 11/11; paginación Owner-only, rechazo a delegado, confirmación y reversión |
| Emulator registro administrativo relacionado | PASS — 1/1; aviso terminal referencia la recepción y existe una sola aplicación económica |
| Navegador IUX-06D 390×844 | PASS — orden de pestañas, `scrollWidth=390`, Atrás, Adelante y recarga |
| Navegador Historial E3-08 | PASS — 1.000 movimientos, páginas 20/50, refresh, descarte de respuesta tardía y limpieza al perder sesión |
| TypeScript | PASS |
| Sintaxis Functions | PASS — 524/524 archivos |
| Lint baseline | PASS — 31 errores y 8 warnings conocidos; 11 hallazgos resueltos respecto del baseline |
| Build de producción | PASS — Next.js 16.1.3, BUILD_ID `K71FbwzUCbjZfw44hcuM2` |
| Build servido en LAN | PASS — HTTP 200 en `http://192.168.2.172:3000`; HTML referencia el BUILD_ID final |
| `git diff --check` | PASS |

Evidencia de navegador IUX-06D:

```json
{"passed":true,"assertions":{"integratedOrder":true,"noHorizontalOverflow":true,"backRestoresTab":true,"forwardRestoresTab":true,"reloadKeepsTab":true},"viewport":{"width":390,"scrollWidth":390}}
```

Evidencia de Historial: 1.000 DTOs, 20/50 filas visibles, tres requests de transporte,
`lateResponseDiscarded=true`, `signedOutClearsView=true` y feedback accesible presente.

## UAT de escritorio

1. Abrir `http://192.168.2.172:3000`, iniciar sesión como Owner y entrar al Grupo UAT sin recrear
   datos.
2. En Economía comprobar `Conceptos | Deudas | Pagos informados | Historial`.
3. En Conceptos crear o usar el concepto UAT previsto; renombrar y desactivar sólo el dato destinado
   a esa prueba. Confirmar que Deudas no muestra el listado de conceptos.
4. Con la cuenta sujeto, informar un pago. Volver como Owner, abrir Pagos informados, revisar y
   confirmar o rechazar. Comprobar que sale de pendientes y aparece en Avisos resueltos.
5. Preparar otro aviso y resolverlo durante un registro administrativo que corrija importe/desglose
   o fecha. Verificar el `administrativeReceiptId` en el aviso y un único ingreso en Historial.
6. Revertir un ingreso UAT autorizado. Confirmar que Historial conserva ingreso y reversión, y que el
   aviso no vuelve a pendientes.
7. Cambiar entre las cuatro pestañas, usar Atrás y Adelante, recargar en cada destino y abrir un
   `deliveryId` vigente.
8. Ingresar con cuentas delegadas individuales y combinadas: Tesorería ve Deudas/Historial de
   lectura; Revisión ve pendientes sin Avisos resueltos; Registro directo ve sólo su acción
   autorizada. Probar además revocación con pestaña abierta.

## UAT Android

1. Con el teléfono en la misma LAN, abrir `http://192.168.2.172:3000` en Chrome Android y repetir el
   recorrido anterior sin borrar datos ni almacenamiento del Emulator/UAT.
2. Verificar 360×800 o 390×844, zoom del sistema y rotación: pestañas legibles, un solo scroll
   horizontal como máximo dentro de tablas y ningún overflow de página.
3. Probar Atrás/Adelante del navegador, recarga en Pagos informados e Historial, foco visible con
   teclado externo si está disponible y anuncio de estados con TalkBack.
4. Registrar capturas del aviso pendiente, aviso resuelto, recepción administrativa relacionada,
   ingreso revertido y matriz delegada. La aprobación humana debe quedar explícita; la evidencia
   automatizada no la sustituye.

## Datos y entrega

Los Emulator focales usaron proyectos demo y workspaces temporales eliminados al finalizar. No se
ejecutaron seed, backfill, escrituras remotas ni limpieza de Auth/Firestore UAT. Los cambios quedan
locales y sin versionar para revisión.

## Ajustes UAT del 13/11/2026

- Mi participación presenta la salida en una tarjeta blanca y mantiene la confirmación dentro de la
  tarjeta. Cancelar o pulsar Escape restaura el estado inicial y el foco del disparador.
- Economía del grupo y Temporada usan encabezado de sección y ya no muestran “Volver al resumen”.
- El acceso Owner se abre desde un botón de ícono de 44×44 px con nombre accesible. Las pestañas
  quedaron en el orden Deudas, Pagos informados, Historial y Conceptos, sin cambiar sus IDs ni URL.
- Crear concepto abre el formulario existente como diálogo; Escape, Cancelar y cierre devuelven el
  foco. Un error de validación o guardado conserva diálogo y borrador.
- Se retiraron los textos indicados de Deudas y Pagos informados y se actualizó la explicación de
  Avisos resueltos sin alterar el resultado canónico mostrado.

Validación de la corrección:

| Control | Resultado |
| --- | --- |
| Pruebas focales Node | PASS — 23/23 |
| TypeScript | PASS |
| ESLint focal | PASS |
| ESLint global | 31 errores y 8 warnings preexistentes fuera de IUX-06D |
| Chrome 390×844 | PASS — orden, overflow, salida, foco, Atrás/Adelante y recarga |
| Chrome 1440×900 | PASS — orden, overflow, salida, foco, Atrás/Adelante y recarga |
| Build de producción | PASS — BUILD_ID `pRv-_q1dXLes9Fd31HAI6` |
| `git diff --check` | PASS |

Para UAT manual, repetir en escritorio y Android los pasos anteriores y agregar: abrir Conceptos,
activar “Crear concepto” con teclado, cerrar con Escape y comprobar que el foco vuelve al botón;
reabrir, provocar un error de validación/guardado y comprobar que el borrador permanece. En Mi
participación, abrir Salir del grupo, cancelar y repetir con Escape antes de ejecutar una salida UAT
autorizada. Los datos UAT no fueron sembrados, limpiados ni modificados durante esta corrección.

## Aprobación UAT y cierre

El usuario aprobó la UAT del build `NlxWGcw83yQphYlrWDiE2`. La comprobación humana cubrió la
reorganización de Economía del grupo en `Deudas | Pagos informados | Historial | Conceptos`, la
separación de avisos pendientes y resueltos, la distinción entre aviso e ingreso administrativo, los
permisos Owner/delegados y los ajustes visuales finales: fila discreta y adaptable para salir del
Grupo, encabezados uniformes, entrada a Integrantes mostrando su encabezado sin salto automático y
Historia de pagos contraída al entrar, volver y recargar.

La automatización cubrió contratos y autorización del lector Owner-only paginado, estados canónicos,
relación aviso–registro administrativo sin segundo pago, reversión, matriz de capabilities, pestañas
y deep-links, Atrás/Adelante/recarga, Escape y restauración de foco, apertura/cierre de Historia de
pagos, ausencia de overflow a 390×844 y presentación a 1440×900. Pasaron 28/28 regresiones focales,
TypeScript, ESLint focal, build y `git diff --check`. El lint global conserva su baseline ajeno al
corte: 31 errores y 8 warnings preexistentes. No se ejecutaron seeds, limpieza, exportaciones ni
escrituras de mantenimiento sobre UAT.

Commit local de implementación y pruebas: `becd2d9`.
