# E3-08 — Informe parcial de implementación de gates A/B

## Estado y alcance

- **Incremento:** E3-08 — consulta de movimientos de ingresos registrados.
- **Decisión:** D5-053 histórico para A; D01–D04=A sin cambios; B adoptada por `D5-054`.
- **Estado de este informe:** implementación técnica local de B completada y gates focales locales
  ejecutados; evidencia reutilizable para revisión y UAT humana.
- **Base:** rama `feat/e3-08-registered-income-movements`, commit
  `ed28dd164b156e0ec6374dcc94eecb117dbe44a4`.
- **Resultado:** Gate A aprobado técnicamente en Emulator; Gate B medido localmente; cambio B
  adoptado documentalmente por D5-054.
- **Estado documental de partida:** `LISTO PARA IMPLEMENTAR — REQUIERE AUTORIZACIÓN SEPARADA`.
- **No significa:** publicación, deploy, aprobación humana/productiva, presupuesto operativo aprobado,
  cierre de E3-08 o cierre de Etapa 3.

La autorización posterior permitió completar localmente callable, wiring, índices declarativos y
frontend de B. No se modificaron dependencias, writers económicos, Rules, persistencia, cache,
proyecciones o snapshots durables, y nada fue publicado o desplegado.

## Entorno aislado

| Elemento | Valor observado |
|---|---|
| Proyecto | `demo-sportexa-e3-08-gates` |
| Firestore Emulator | `127.0.0.1:38080` |
| WebSocket Emulator | `127.0.0.1:38150` |
| Hub / logging | `127.0.0.1:34400` / `127.0.0.1:34500` |
| `firebase-admin` | `11.11.1` |
| `@google-cloud/firestore` | `6.8.0` |
| Node efectivo del test | `v20.20.0` |
| Datos | sintéticos, efímeros y sin import/export |

El runner generó su configuración en un directorio temporal, inició sólo Firestore y eliminó el
workspace al finalizar. No utilizó la sesión UAT, proyectos remotos ni credenciales remotas.

## Código mínimo incorporado

1. `registeredIncomeMovement.js`: forma canónica de hechos, validación de raíces v1/v2, orden total,
   totales, digest y cursor ligado a scope/corte/conteo/ancla.
2. `firestoreRegisteredIncomeMovementReader.js`: autorización por request, transacción
   `{ readOnly: true }`, tres streams acotados, reconstrucción completa, presentación por audiencia
   y continuación bajo el mismo corte.
3. `registeredIncomeMovementsGatesE3.test.js`: fixtures, concurrencia, fronteras, mediciones de
   gates y medición focal no contractual de respuesta única.
4. `run-e3-08-gates.js`: ejecución focal en proyecto demo y puertos exclusivos.

El reader no se registró en `index.js`, no se envolvió en callable y no posee frontend.

## Gate A — API y consistencia

### Método

La primera lectura de Grupo fijó el `readTime` de una transacción read-only real. Dentro de esa
misma transacción se ejecutaron las queries informada, administrativa y de reversión. Cada
continuación abrió otra transacción read-only, reautorizó y reconstruyó el conjunto completo con el
corte original transportado por cursor.

Se distinguieron tres clases de evidencia:

- **fixtures previos al corte:** ingresos v1/v2, ingreso administrativo y reversión previa;
- **operaciones realmente solapadas:** dos escrituras Firestore externas se confirmaron después de
  leer Grupo y antes de continuar las queries de la transacción;
- **fixtures exactos de frontera:** una confirmación y una reversión se persistieron con timestamp
  exactamente igual al corte ya obtenido.

El hook de prueba sólo coordinó el momento de las escrituras externas. No inyectó resultados en la
transacción ni se lo presenta como garantía de concurrencia. Los timestamps iguales son fixtures
persistidos posteriores al corte; no demuestran que un commit del servidor haya ocurrido
físicamente en el mismo instante que el `readTime`.

### Resultados

| Comprobación | Resultado |
|---|---|
| `runTransaction(..., { readOnly: true })` con dependencias instaladas | aprobó |
| rango funcional | 93 días civiles rechazados con `RANGE_TOO_WIDE`; máximo preservado en 92 |
| snapshots observados en el request inicial | 7 muestras, 1 único `readTime`, 0 faltantes |
| retries del callback read-only | 0 |
| streams | informado v1, informado v2, administrativo y reversión reconstruidos coherentemente |
| corte exclusivo | hechos con `eventAt == cutoff` y posteriores quedaron fuera |
| reversión posterior | conservó el ingreso original y `receiptStateAtCutoff: APPLIED` |
| reversión previa | produjo hecho separado y estado `REVERSED` al corte |
| primera vista | 5 hechos, totales del manifiesto completo y 3 páginas de tamaño 2 |
| continuación | mismo corte, digest y totales; sin omisiones ni duplicados |
| cursor | conteo y ancla exactos verificados; ancla falsa rechazó sin filas |
| divergencia | backfill anterior al corte cambió el manifiesto y produjo `MOVEMENT_VIEW_CHANGED` sin filas |

El digest observado en la última ejecución focal fue
`ee47579eb291a894fd77d9e4fc9ace88ba86774c7177b6bdbab9e9e40cafd04a`. Es evidencia efímera del
fixture, no un valor contractual.

### Alcance de la evidencia

Gate A demuestra que las versiones instaladas y el Firestore Emulator aceptan la transacción
read-only y exponen un `readTime` común para las lecturas observadas. No demuestra comportamiento
productivo, facturación, índices desplegados ni un snapshot durable entre requests. La consistencia
multipágina proviene de reconstrucción, digest, conteo y ancla; no del timestamp por sí solo.

## Gate B — costo y viabilidad local

### Representatividad de fixtures

Las raíces utilizaron formas v1/v2 reales, campos de contexto, lifecycle, actores, fechas, totales y
líneas completas. La distribución de líneas fue de 1, 3 y 20 líneas; no se reemplazaron las raíces
por documentos mínimos artificiales.

El dataset máximo aceptado tuvo:

- 800 raíces y 1.000 hechos: 720 ingresos informados —360 v1 y 360 v2—, 80 administrativos y
  200 reversiones;
- 640 raíces de una línea, 120 de tres líneas y 40 de veinte líneas;
- tamaño serializado aproximado por raíz entre 880 y 6.849 bytes, promedio 1.370 bytes.

La distribución es deliberadamente sesgada hacia ingresos informados. Una raíz revertida aporta un
ingreso y una reversión como hechos separados.

### Primera página (`pageSize=20`)

| Hechos | Resultados de movimiento | Auth/contexto | Presentación | Filas | Duración local | Cursor | Respuesta |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 2 | 0 | 0 | 179,718 ms | 0 B | 382 B |
| 20 | 20 | 2 | 20 | 20 | 408,085 ms | 0 B | 7.687 B |
| 50 | 50 | 2 | 20 | 20 | 391,905 ms | 861 B | 8.605 B |
| 999 | 999 | 2 | 20 | 20 | 512,521 ms | 868 B | 8.635 B |
| 1.000 | 1.000 | 2 | 20 | 20 | 438,241 ms | 872 B | 8.679 B |
| 1.001 | 1.001 | 2 | 0 | 0 | 195,181 ms | 0 B | 0 B |

En 1.001 se obtuvo `MOVEMENT_LIMIT_EXCEEDED`, sin filas ni totales. La detección terminó exactamente
en 1.001 resultados de hechos; no cargó un conjunto ilimitado. Cada request usó tres query snapshots,
un intento transaccional y cero retries observados.

### Recorrido completo de 1.000 hechos

| Medida | `pageSize=20` | `pageSize=50` |
|---|---:|---:|
| requests | 50 | 20 |
| filas emitidas | 1.000 | 1.000 |
| resultados de movimiento acumulados | 50.000 | 20.000 |
| resultados auth/contexto | 100 | 40 |
| resultados de presentación | 1.000 | 1.000 |
| retries observados | 0 | 0 |
| primera página | 455,130 ms | 914,246 ms |
| continuación representativa | 466,846 ms | 881,694 ms |
| duración acumulada | 22.138,382 ms | 16.484,021 ms |
| request mínimo / máximo | 372,284 / 547,989 ms | 742,665 / 914,246 ms |
| cursor máximo | 873 B | 873 B |
| respuesta máxima | 8.754 B | 19.924 B |
| RSS máxima observada | 183.480.320 B | 180.441.088 B |
| heap usado máximo observado | 114.076.984 B | 109.542.456 B |
| `readTime` común en todos los requests | sí | sí |

Totales, digest y orden permanecieron iguales entre páginas. Los 1.000 identificadores esperados se
emitieron exactamente una vez, sin omisiones ni duplicados.

### Qué se midió y qué no

- **Resultados de movimiento** son documentos retornados por las tres queries y contados por el
  harness. No equivalen a lecturas facturadas verificadas.
- **Auth/contexto** y **presentación** se informan por separado. El caso medido usa Owner; un camino
  Tesorería posee más lecturas de autorización y deberá medirse al implementar el contrato público.
- Firestore Emulator no expuso facturación: queda **no observada**.
- Memoria es una muestra del proceso antes/después de cada request, no un pico obtenido con profiler.
- Duraciones pertenecen a una única estación local y una única corrida final; no son SLO, percentil
  productivo ni presupuesto aprobado.
- El Emulator ejecutó las queries, pero no acredita aceptación de índices en producción. No se
  modificó `firestore.indexes.json`.

## Comparación arquitectónica focal posterior a gates A/B

> **Registro histórico previo a la implementación de B.** Esta sección conserva la evidencia y el
> razonamiento disponibles al adoptar D5-054. Sus pendientes de callable/navegador quedaron
> ejecutados después y se informan, sin reescribir estas mediciones, en “Implementación técnica
> local de B — 2026-10-21”.

Esta sección conserva los resultados anteriores y compara dos mecanismos. **A** permanece como
historia normativa de D5-053 y evidencia técnica válida. **B** fue aprobada expresamente y D5-054 la
adopta como único contrato futuro, sustituyendo A sólo en entrega, paginación y autorización.

### Alternativas comparadas

**A — reconstrucción completa por página.** Cada request backend reautoriza, reconstruye hasta
1.000 hechos bajo el corte original, recalcula totales/digest y entrega 20–50 filas. El cursor liga
scope, corte, digest, conteo y ancla. La protección entre páginas proviene de reconstruir y comparar,
no de conservar un snapshot histórico.

**B — respuesta backend única y paginación visual, aprobada.** Un único request read-only autoriza,
reconstruye hasta 1.001 hechos, rechaza exceso y, si acepta el conjunto, presenta y devuelve hasta
1.000 movimientos mínimos con totales exactos. El frontend conserva el array sólo en memoria y
muestra 20/50 filas; no pide continuaciones ni recalcula economía.

La medición B reutilizó el mismo manifiesto canónico, dataset sesgado y raíces representativas del
Gate B. No creó callable, frontend, persistencia, cache ni proyección. Para presentación deduplicó
Personas **sólo dentro del request**: 1.000 hechos referían a 64 Personas. Esto es una optimización
efímera compatible con B, no cache compartida; con 1.000 sujetos distintos podría requerir hasta 1.000
resultados de presentación.

### Medición focal de B

Una única corrida aislada produjo:

| Medida observada | Owner | Tesorería |
|---|---:|---:|
| respuesta JSON sin compresión | 384.397 B (375,4 KiB) | 332.400 B (324,6 KiB) |
| ítem serializado mínimo / máximo | 380 / 388 B | 328 / 336 B |
| ítem serializado promedio | 383 B | 331 B |
| serialización backend | 1,563 ms | 1,268 ms |
| transferencia HTTP loopback, mediana de 5 | 3,439 ms | 3,640 ms |
| transferencia loopback, mínimo / máximo | 2,903 / 5,635 ms | 2,447 / 4,225 ms |
| parseo JSON en Node | 2,374 ms | 2,674 ms |
| incremento de heap durante parseo | 792.984 B | 682.952 B |

La transacción read-only completa tomó 1.307,574 ms: 403,305 ms correspondieron a queries más
normalización/digest y 858,970 ms a las 64 presentaciones secuenciales. Construir ambos arrays DTO
tomó 2,300 ms. Se observaron 1.000 resultados de movimiento —720 informed, 80 administrativos y
200 reversiones—, 2 resultados de autorización/contexto y 64 de presentación deduplicada. Hubo un
intento transaccional.

Estos tamaños son máximos **observados en el fixture representativo de 1.000 hechos**, no límites
formales de protocolo ni máximos para textos arbitrarios. La transferencia fue HTTP sin compresión
en loopback dentro de la misma estación: no mide callable, TLS, red real, serialización de plataforma
o latencia productiva. Los incrementos de memoria corresponden al parseo en Node con GC expuesto;
no son medición de heap de navegador, React ni DOM. Resultados retornados tampoco equivalen a
lecturas facturadas verificadas.

### Costo comparado

| Operación con 1.000 hechos | A, `pageSize=20` | A, `pageSize=50` | B, respuesta única aprobada |
|---|---:|---:|---:|
| apertura | 1 request; 1.000 resultados de movimiento; 20 presentaciones | 1 request; 1.000 resultados de movimiento; 50 presentaciones | 1 request; 1.000 resultados de movimiento; todas las presentaciones necesarias |
| recorrido visual completo | 50 requests; 50.000 resultados de movimiento; 100 auth/contexto; 1.000 presentaciones | 20 requests; 20.000 resultados de movimiento; 40 auth/contexto; 1.000 presentaciones | sin nuevos requests; el costo backend ya ocurrió en apertura |
| refresh | repite costo de una primera página y crea una vista nueva | repite costo de una primera página y crea una vista nueva | repite la respuesta completa y crea una vista nueva |

Para B, el fixture observado añadió 2 resultados de auth/contexto y 64 de presentación a los 1.000
resultados de movimiento. Su cota de presentación depende de sujetos distintos y podría llegar a
1.000. Para A, las cifras conservan la instrumentación ya medida, que presentó cada fila emitida.
Ninguna columna afirma lecturas facturadas.

A reduce payload y exposición inicial, pero paga reconstrucción y autorización repetidas durante el
recorrido. B paga construcción, presentación, memoria y transferencia completas al abrir/refrescar,
pero elimina 19 o 49 reconstrucciones y la divergencia entre páginas. Si el usuario nunca avanza de
la primera página, A hace menos presentación y transferencia; si recorre una fracción importante,
B evita el costo acumulado dominante observado en A.

### Consistencia, exceso y refresh en B

Filas, totales, digest y `readCutoffExclusive` se construirían dentro de una sola transacción
read-only. No habría continuidad entre snapshots ni necesidad de acreditar coincidencia entre
páginas backend: la paginación visual sería un `slice` del array ya recibido. Confirmaciones o
reversiones con `eventAt >= readCutoffExclusive` quedarían fuera y entrarían sólo en un refresh
exitoso, que reemplazaría la vista completa bajo un corte nuevo.

La detección conservaría el presupuesto decreciente de 1.001 entre streams. El hecho 1.001 debe
producir `MOVEMENT_LIMIT_EXCEEDED` **antes** de presentación y serialización, sin items ni totales.
Esto reutiliza la evidencia del Gate B; no se repitió el caso 1.001.

### Autorización, pérdida de acceso y privacidad

En B se autoriza al inicio de cada apertura, refresh o cambio de rango. Owner conserva acceso a Grupo activo o
archivado; `GROUP_TREASURY` efectivo conserva sólo Grupo activo y la consulta read-only. Una pérdida
de acceso impide toda consulta o refresh posterior. La UI debería descartar su copia en memoria
cuando conoce logout, cambio de Cuenta/Grupo, revocación o error de autorización. La detección usa
los mecanismos existentes de sesión/contexto y rechazos de nuevas consultas: no se agregan listeners
o sondeos y no se promete detección instantánea.

Esa limpieza no revoca información ya entregada: ni A ni B pueden recuperar bytes que el navegador
ya recibió, y el usuario podría haberlos copiado o conservado. A limita la entrega progresiva porque
reautoriza cada página; B entrega hasta 1.000 filas tras una única autorización válida, por lo que
aumenta el volumen expuesto antes de una revocación posterior. Impedir nuevas consultas y retirar
datos de la UI no equivale a borrar datos previamente transferidos.

Cada request se liga al contexto y generación activos; una respuesta tardía de otra Cuenta, Grupo,
rango o generación se descarta para no repoblar una vista limpiada. Los datos no se escriben en
`localStorage`, `sessionStorage`, IndexedDB ni cache persistente.

La minimización no cambia: Owner recibe `receiptId` opaco y sujeto presentable; Tesorería omite
`receiptId`, actores, motivos, líneas, aplicaciones, avisos, hashes, paths, grants y acciones. La
diferencia de 51.997 B observada entre audiencias provino principalmente de omitir `receiptId`.

### Memoria y render frontend

Los incrementos de heap Node observados —aproximadamente 0,76 MiB Owner y 0,65 MiB Tesorería— no
justifican por sí solos backend paginado, pero tampoco acreditan memoria de navegador. B requiere
mantener hasta 1.000 DTO mínimos para paginación local. La UI debe renderizar sólo la página visible
de 20 o 50 filas y no crear 1.000 nodos de fila; cambiar de página sería local. Virtualización más
compleja no aparece necesaria para 20/50 nodos visibles, aunque rendimiento y accesibilidad reales
quedan pendientes de prueba frontend.

### Cambio B aprobado y continuidad pendiente

B queda aprobado con estas consecuencias contractuales:

1. retirar `pageSize` y `cursor` del input backend, y `nextCursor` de la respuesta;
2. conservar `readCutoffExclusive`, `manifestDigest`, totales exactos y hasta 1.000 `items`;
3. retirar `CURSOR_SCOPE_MISMATCH`, `MOVEMENT_VIEW_CHANGED`, ancla y conteo como mecanismos públicos
   de continuación; pueden conservarse internamente sólo si otra razón futura lo decide;
4. reemplazar “reautorización por página” por autorización en cada apertura/refresh y documentar la
   mayor entrega inicial ante revocación posterior;
5. hacer `pageSize` —20/50— estado exclusivamente visual, reiniciado al cambiar rango o refrescar;
6. actualizar estados UX: no habría error de continuación divergente; refresh exitoso reemplaza el
   conjunto completo y refresh denegado limpia la vista activa;
7. ficha, DEC, addendum y Documento 5 quedan armonizados por D5-054, que sustituye A sólo en
   entrega/paginación/autorización;
8. conservar como gates el transporte callable real y heap/render de navegador, sin inferirlos de
   loopback o parseo Node.

La aprobación no autoriza implementación completa ni aprueba presupuesto operativo.

## Fallos y correctivos

El primer arranque de Gate A se detuvo antes de ejecutar el test porque la instrumentación intentó
importar `firebase-admin/package.json`, subpath no exportado por el paquete. Se corrigió el
recolector para resolver el paquete instalado y leer su metadata desde filesystem. No cambió la
dependencia ni el mecanismo bajo prueba. Las ejecuciones posteriores de Gate A y Gate B aprobaron.

No se observaron fallos de API, pérdidas, duplicados, mezcla de páginas o retries. No se introdujo
un correctivo arquitectónico.

## Diagnóstico de viabilidad

**Corrección técnica local:** demostrada para el mecanismo probado. Gate A no obliga a cambiar
dependencias y la reconstrucción exacta respeta D01–D04=A.

**Evaluación operativa:** no aprobada. A es acotada, pero relee 50.000 o 20.000 resultados de
movimiento al recorrer 1.000 filas. B reduce ese recorrido a una reconstrucción de 1.000 resultados,
a costa de construir, presentar y transferir todo al abrir y de ampliar la exposición inicial. La
respuesta representativa observada quedó por debajo de 0,4 MiB, pero no se verificaron transporte
público, compresión, navegador ni presupuesto productivo.

**Decisión arquitectónica registrada:** B está aprobada porque simplifica la garantía —una
transacción produce filas, presentación y totales— y elimina el multiplicador de reconstrucción de
A sin persistencia adicional. D5-053 conserva A como antecedente técnicamente correcto y D5-054
adopta B. El informe no autoriza implementación, cache,
proyección, snapshots durables, cambios de writers/dependencias, límites distintos o menor exactitud.

## Ejecuciones focales

```text
E3_08_GATE=A node test/run-e3-08-gates.js
E3_08_GATE=B node test/run-e3-08-gates.js
E3_08_GATE=C node test/run-e3-08-gates.js
```

Las tres ejecuciones focales finalizaron con código 0 usando Firestore Emulator aislado. La tercera
saltó A/B y sólo midió la comparación B; no repitió sus recorridos. No se ejecutaron suites
integrales, Auth/UAT, Firebase remoto o deploy.

## Archivos del incremento parcial

- `volley-ranking-system/functions/src/registeredIncomeMovements/domain/registeredIncomeMovement.js`
- `volley-ranking-system/functions/src/registeredIncomeMovements/infrastructure/firestoreRegisteredIncomeMovementReader.js`
- `volley-ranking-system/functions/test/emulator/registeredIncomeMovementsGatesE3.test.js`
- `volley-ranking-system/functions/test/run-e3-08-gates.js`
- `docs/implementacion/etapa-3/E3-08-informe-implementacion.md`

D5-044, D5-045, Auth/UAT aislada, baseline y gate económico legacy permanecen sin cambios. B está
aprobada documentalmente; E3-08 no está implementado integralmente, aprobado para producción o
cerrado, y Etapa 3 continúa abierta.

## Implementación técnica local de B — 2026-10-21

### Resultado y contrato efectivo

Se implementó localmente `listGroupRegisteredIncomeMovements` con entrada cerrada
`{ groupId, from?, to? }`. Si no hay fechas usa el mes civil actual completo de
`America/Argentina/Buenos_Aires`; si se informan, deben venir juntas y cubrir como máximo 92 días
inclusivos. El backend no admite `pageSize` o `cursor` y no devuelve `nextCursor`.

Cada apertura, refresh o cambio de rango ejecuta una transacción read-only que:

1. autoriza nuevamente Owner o `GROUP_TREASURY` efectivo;
2. fija `readCutoffExclusive` desde el `readTime` del primer snapshot dentro de esa transacción;
3. consulta con frontera exclusiva y presupuesto decreciente los streams informed v1/v2,
   administrativos v2 y reversiones;
4. rechaza el hecho 1.001 antes de presentar o serializar movimientos;
5. construye un manifiesto ordenado, sin duplicados, con digest y totales exactos;
6. deduplica Personas sólo dentro del request y produce el DTO correspondiente a la audiencia.

El ingreso original se conserva cuando una reversión posterior ya existe al corte. Las reversiones
son hechos negativos registrales y no devoluciones. Líneas y aplicaciones no se agregan; deuda,
condonación, corrección y anulación quedan fuera. Tesorería omite `receiptId`, actores, motivos,
líneas y referencias internas.

El frontend integra una sección discreta en Economía para Owner y Tesorería. Conserva la respuesta
únicamente en estado React, muestra corte y rango, y pagina visualmente 20/50 filas mediante `slice`.
No recalcula totales. Un token `{contextKey, generation}` descarta toda respuesta tardía, incluso
del mismo Grupo con otro rango o refresh. Logout, cambio/desmontaje de Grupo y rechazo de acceso
invalidan el token y limpian filas. No se añadieron listeners ni sondeos: la revocación se conoce al
resolver el contexto existente o al intentar otra consulta; no recupera bytes ya entregados.

### Gates focales ejecutados

#### Firestore y transporte callable local

El runner aislado usó el proyecto demo `demo-sportexa-e3-08-gates`, Firestore `38080`, Auth `39099`
y Functions `35001`. No importó datos, no usó la sesión UAT y no accedió a Firebase remoto.

- La transacción read-only mantuvo un `readTime` común observado en snapshots de autorización,
  streams y presentación, con cero retries en la corrida focal.
- Dos escrituras Firestore reales se confirmaron después de fijar el corte y antes de las queries;
  no ingresaron en la respuesta. Los fixtures exactamente iguales al corte también quedaron fuera.
- El conjunto de frontera devolvió cinco hechos, sin omisiones ni duplicados, y conservó el ingreso
  original con `receiptStateAtCutoff` correcto ante reversiones anteriores/posteriores.
- La matriz 0/20/50/999/1.000/1.001 aprobó con mezclas v1/v2, administrativas, reversiones y
  distribución sesgada. El caso 1.000 devolvió una respuesta y 1.000 resultados de movimiento; el
  caso 1.001 consumió como máximo 1.001 resultados de movimiento y entregó cero filas/totales.
- El callable real aceptó tokens del Auth Emulator para Owner y Tesorería. En la corrida final,
  Owner recibió 1.000 filas en 346.122 B y 2.517,264 ms; Tesorería, 298.125 B y 361,711 ms. Tras
  añadir el hecho 1.001, Owner respondió en 247,359 ms y Tesorería en 350,551 ms; ambos recibieron
  sólo `MOVEMENT_LIMIT_EXCEEDED` (124 B), sin `result`.
- Se comprobó además rechazo del input legacy `pageSize`, denegación de Tesorería revocada y lectura
  histórica vacía del Owner en Grupo archivado.

Estas duraciones incluyen arranque/calentamiento local desigual y no son SLO. Los documentos
retornados por Emulator no equivalen a lecturas facturadas verificadas.

#### Navegador real

Chrome Headless 152 ejecutó el componente productivo sobre una copia temporal del frontend y un
endpoint HTTP sintético local; no reemplaza el gate callable anterior. El DTO contenía 1.000 filas.

| Evidencia de navegador | Resultado observado |
|---|---:|
| filas DOM con `pageSize=20` | 20 |
| filas DOM con `pageSize=50` | 50 |
| requests al cambiar página visual | 0 |
| requests HTTP totales del escenario | 4 (apertura, refresh y dos rangos concurrentes) |
| duraciones Resource Timing | 1.887,4 / 121,6 / 1.001,9 / 251,1 ms |
| `performance.memory.usedJSHeapSize` tras recepción inicial | 85.711.323 B |
| heap CDP al final, después de limpieza | 19.499.048 B usados / 35.000.320 B asignados |

También aprobaron: parseo del DTO en navegador, navegación 20/50 sin red, render exclusivo de la
página visible, refresh que sustituye el conjunto, descarte del rango lento tras uno más nuevo,
limpieza de sesión, foco de teclado conservado en la navegación y feedback `aria-live` enfocables.
Las cifras de heap abarcan Next en modo desarrollo, React, Firebase y el harness; son observaciones
locales, no memoria incremental aislada ni presupuesto productivo.

### Fallos y correctivos de esta fase

1. La primera ejecución rápida fue bloqueada antes de correr por permisos `EPERM` del usuario
   sandbox al resolver rutas. Se repitió con autorización local, sin cambiar código o dependencias.
2. El primer runner de navegador encontró un directorio `node_modules` temporal ya creado; se
   corrigió para reemplazarlo por un junction a las dependencias instaladas.
3. `--dump-dom` no finalizó de forma confiable con Next dev en Windows. Se sustituyó por control CDP
   usando `ws` ya instalado con Firebase CLI, sin agregar dependencias.
4. El primer recorrido CDP agotó timeout porque el fixture recreaba `onAccessLost` y forzaba un
   bucle de efectos. El callback productivo ya era estable; se corrigió exclusivamente el fixture y
   la repetición aprobó.
5. La revisión final encontró que el prototipo usaba `VALIDATION_FAILED` donde ficha, DEC y addendum
   exigen `INVALID_DATE_RANGE`; se alinearon contrato, mapper, UI y pruebas, y se repitieron las
   pruebas focales de contrato y transporte.

### Archivos de implementación y verificación

- backend: dominio, contrato, reader, mapper callable, módulo, callable exportado e índices
  declarativos de `paymentDeliveries`;
- frontend: tipos, servicio callable, gate generacional, sección de movimientos e integración en
  Economía;
- pruebas: contrato unitario, helper visual, Firestore/concurrencia/límites, transporte callable y
  browser fixture/runner;
- este informe único, que conserva la evidencia histórica A y la comparación que motivó D5-054.

### Verificación proporcional

- contrato E3-08 focal: 2/2 pruebas aprobadas;
- helpers de paginación visual y protección generacional: 2/2 aprobadas;
- suite unitaria de Functions: 400/400 aprobadas, sin ejecutar suites Emulator ajenas;
- gate focal Firestore/callable final: 2/2 aprobadas y 2 mediciones históricas omitidas
  intencionalmente para no repetir la matriz ya acreditada;
- frontend: `tsc --noEmit --incremental false`, lint contra baseline y build de producción aprobados;
  lint conservó 36 errores y 9 warnings conocidos y detectó 9 hallazgos menos que el baseline;
- `firestore.indexes.json` parseó correctamente y `git diff --check` no informó defectos.

El build sólo informó la advertencia preexistente de antigüedad de `caniuse-lite`. No se ejecutaron
deploy, Firebase remoto ni suites integrales redundantes.

### Rollback técnico

El rollback no requiere migración de datos: retirar la exportación del callable y su wiring, la
sección frontend y su servicio/tipos, los tres índices añadidos o ampliados y los tests E3-08 nuevos;
restaurar dominio/reader al estado anterior. No hay writers, documentos, cache o proyecciones E3-08
que revertir. Si la evaluación operativa futura resulta inviable, debe detenerse publicación/deploy
y volver a decisión arquitectónica; no relajar exactitud o límites silenciosamente.

### Guía humana previa a la UAT final y pendientes

1. Como Owner, abrir Economía, consultar un rango pequeño y verificar etiquetas, corte, totales y
   que cambiar entre 20/50 o avanzar página no muestra una nueva carga.
2. Como Tesorería vigente, verificar la misma consulta sin acciones ni referencias Owner; revocar
   acceso y confirmar que un refresh posterior limpia la vista y niega la nueva consulta.
3. Confirmar navegación por teclado, foco tras consulta/refresh y comprensión de vacío, exceso y
   error, sin ejecutar carreras ni cargar 1.000 hechos manualmente.

Esta guía breve fue anterior a la guía final identificada al pie del informe. Quedaban pendientes la
confirmación humana y la evaluación operativa productiva. No existe presupuesto productivo aprobado
ni evidencia de facturación, red o carga productiva. No se hizo deploy. D5-044,
D5-045 no solucionado, Auth/UAT aislada, baseline y gate económico legacy permanecen sin cambios.
E3-08 y Etapa 3 no se declaran cerrados.

## Correctivo focal del bloqueo UAT inicial — 2026-10-21

### Estado y evidencia fallida conservada

La primera ejecución UAT quedó registrada como **BLOQUEADA — REQUIERE RE-UAT**. Al abrir Economía, la consulta
mostró «Los datos económicos son incompatibles; no se mostró información parcial». La petición
observada fue:

```json
{
  "groupId": "aZtHtorSXUSzclbvmdFQ",
  "from": "2026-10-01",
  "to": "2026-10-31"
}
```

El callable respondió HTTP 400, categoría `failed-precondition`, mensaje `Invalid group context` y
`details.reason = DATA_INCOMPATIBLE`. La inspección minimizada y exclusivamente de lectura del
Emulator UAT `demo-sportexa-e2-04` reprodujo el mismo motivo en una transacción: un resultado de
Grupo, cero queries de movimientos, cero resultados de Recepción y cero lecturas de presentación.

### Causa y clasificación

El Grupo consultado era una forma histórica válida activa `schemaVersion: 1`, sin campo
`ownershipRevision`. El reader E3-08 reconocía v1 entre sus versiones permitidas, pero luego exigía
incondicionalmente una revisión positiva. Esa composición contradictoria fallaba en `validateGroup`
antes de autorizar por Cuenta y antes de consultar los tres streams.

La colección `paymentDeliveries` UAT estaba vacía. Por ello no participaron en el fallo hidratación
v1/v2, total/líneas, timestamps, origen, lifecycle de Recepción, reversión ni presentación. El Grupo
estaba activo y el actor era su Owner; tampoco fue un rechazo de autorización.

Se clasifica como **defecto del reader E3-08 ante una forma histórica válida no soportada**, no como
dato inválido ni defecto de writer. La capacidad canónica de Grupo y los stores económicos vigentes
ya establecen que v1 activo y v2 archivado sin `ownershipRevision` representan revisión efectiva 1;
la evolución persistida a v3/v4 sólo corresponde a operaciones autorizadas que aseguran contexto.

### Correctivo aplicado

`validateGroup` ahora deriva revisión efectiva 1 exclusivamente para formas cerradas v1/v2 que no
poseen el campo. Conserva fallo cerrado para combinaciones híbridas v1/v2 que sí traigan
`ownershipRevision`, para v3/v4 sin entero positivo y para cualquier estado/versión incompatible.
La consulta sigue siendo read-only: no migra ni repara el Grupo. Tesorería continúa pasando por su
capability completa, por lo que esta compatibilidad Owner no crea ni revive grants.

No se omitieron movimientos, no se relajó ningún invariante económico y no se devolvieron totales
parciales. No se requiere reparación de datos ni decisión normativa adicional.

### Verificación focal

- Fixture Emulator aislado con Grupo activo v1 sin revisión: aprobó como Owner, devolvió cero filas y
  totales exactos cero; una relectura confirmó que el Grupo continuó v1 y sin el campo.
- Gate focal relevante: 3 pruebas aprobadas, incluidas la regresión UAT, concurrencia/corte y callable
  Owner/Tesorería; las 2 mediciones B históricas se omitieron intencionalmente.
- Lectura posterior del mismo Grupo UAT: una transacción, dos resultados de autorización, tres queries
  vacías, corte/readTime común, cero presentación y respuesta coherente; el Grupo permaneció intacto.
- `reportAllChanges`/`startTime` no existe en el código fuente del repositorio y el fallo backend se
  reprodujo sin ese script. No hay evidencia de relación causal y no se amplió la investigación a
  instrumentación o extensiones ajenas.

### Re-UAT mínima

Conservar la misma sesión y el mismo Grupo: recargar o volver a abrir **Economía** y consultar el
rango inicial de octubre de 2026. El resultado esperado para el estado inspeccionado es vista vacía,
totales exactos en cero y corte de actualización visible, sin el mensaje de incompatibilidad.
Esta expectativa técnica no constituye aprobación humana hasta recibir el resultado de la re-UAT.

## UAT final — guía `E3-08-UAT-FINAL-6R` — 2026-10-21

La identificación `E3-08-UAT-FINAL-6R` corresponde exclusivamente a la última guía de seis
recorridos, posterior al correctivo de compatibilidad del Grupo histórico. No sustituye ni renumera
las guías previas conservadas en este informe.

La confirmación humana recibida aprobó los seis recorridos siguientes:

1. vista vacía con tres totales en cero y corte visible;
2. ingreso contabilizado una vez por Recepción, sin duplicación por líneas;
3. ingreso y reversión visibles, con compensación correcta dentro del rango;
4. fechas registral y efectiva diferenciadas, y rechazo de rango superior a 92 días;
5. consulta Tesorería sin acciones económicas ni información privada;
6. limpieza al cambiar de Grupo o cerrar sesión.

Esta confirmación resuelve el bloqueo humano inicial para esos seis recorridos. No se atribuye UAT
humana a volumen de 1.000/1.001 hechos, paginación con conjuntos numerosos, carreras, memoria,
protección contra respuestas tardías, fronteras de corte, privacidad negativa ni costo. Esos puntos
conservan exclusivamente la evidencia automatizada, estática o de medición local ya registrada.

El contraste focal con ficha y addendum no encontró un criterio indispensable sin evidencia: la UAT
confirma presentación y recorridos humanos; los contratos, límites, exactitud, autorización negativa,
concurrencia, streams v1/v2, respuesta completa, paginación local, render visible, descarte tardío y
callable máximo permanecen acreditados por los gates y pruebas separados. La evaluación operativa
productiva y un presupuesto continúan pendientes y no bloquean la integración local/versionada.

No hubo reparación del Grupo UAT: la compatibilidad lectora v1/v2 resolvió el caso sin escritura de
datos. D5-044, D5-045 no solucionado, Auth/UAT aislada, baseline y gate económico legacy permanecen
sin cambios. E3-08 y Etapa 3 no se declaran cerrados.
