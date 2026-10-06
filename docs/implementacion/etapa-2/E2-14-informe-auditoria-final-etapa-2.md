# E2-14 — Informe de auditoría final de Etapa 2

## 1. Estado y dictamen

- **Fecha:** 2026-10-06.
- **Tipo:** repetición final técnica, funcional y documental de E2-14.
- **Rama auditada:** `dev`.
- **SHA auditado:** `7565ad93674c2139655ca918c91317f6f09e8fda`.
- **Dictamen:** `E2-14 FINAL BLOQUEADA — GATE EMULATOR COMPLETO NO APROBADO`.
- **Etapa 2:** abierta; no apta todavía para cierre formal.
- **Etapa 3:** deshabilitada.

La matriz normativa y la inspección integrada no identifican un bloqueo funcional o documental nuevo.
Sin embargo, la Emulator Suite completa exigida por el gate final terminó con un fallo. Una repetición
focal justificada aprobó el escenario afectado, pero no reemplaza ni convierte en verde la corrida
completa. En consecuencia, no corresponde emitir aprobación completa.

Este informe no modifica normativa, cierres históricos, código, pruebas, Rules, índices ni contratos;
no cierra formalmente Etapa 2 y no habilita E3.

## 2. Preflight y base efectiva

| Comprobación | Resultado |
| --- | --- |
| Rama | `dev` |
| `HEAD` | `7565ad93674c2139655ca918c91317f6f09e8fda` |
| Upstream | `origin/dev` |
| Referencia local `origin/dev` | `7565ad93674c2139655ca918c91317f6f09e8fda` |
| Divergencia inicial | `+0/-0` |
| Remoto consultado sin fetch | `git ls-remote --heads origin dev` devolvió el mismo SHA |
| Árbol e índice iniciales | limpios |
| Stashes | ninguno |
| Auth/UAT | rama `chore/preserve-auth-emulator-uat-changes` en `fc7135e358902a17372d44f20df50883603520ce`, aislada y no integrada |
| Informe final previo | no existía |

La comparación remota fue actualizada mediante `ls-remote`, operación de lectura que no movió la
referencia local ni cambió la base auditada. No se ejecutó `fetch`, checkout, stage, commit, push,
merge, stash, reset o clean.

## 3. Fuentes y método

Se contrastaron:

- Documento 5 vigente, incluidos criterios comunes de salida, Etapa 2 y D5-041–D5-044;
- [E2-14 original](./E2-14-informe-auditoria-consolidada-etapa-2.md),
  [correctivo CU-030](./E2-14-correccion-resolucion-CU-030.md) y
  [reevaluación post E2-24](./E2-14-reevaluacion-pendientes-post-E2-24.md);
- DEC-E2-21, DEC-E2-25, sus addenda y el
  [roadmap de compatibilidad](./E2-14-propuesta-retiro-compatibilidad-residual.md);
- fichas, informes y cierres de E2-01–E2-24 según su naturaleza;
- Documentos 1, 1.5 y 2, y las secciones aplicables de Documentos 3 y 4 AUD-C05;
- Functions, frontend, Rules, índices, exports, consumidores y pruebas integrados.

Las pruebas automatizadas frescas se separan de la evidencia histórica, la inspección estática y la
UAT previamente registrada. Un resultado focal verde no se usa para ocultar una corrida completa
roja.

## 4. Matriz de hallazgos originales

| Hallazgo | Fuente | Evidencia actual | Límite o deuda conservada | Clasificación | Efecto |
| --- | --- | --- | --- | --- | --- |
| E2-F01 — CU-017–019 | Documento 2; E2-14 original | E2-15 cierre, E2-16 historia y E2-17 edición; gates unitarios y Emulator salvo el fallo ajeno descrito en §7 | Edición limitada a nombre; cierre terminal; historia sin snapshot multipágina | Resuelto | No bloquea |
| E2-F02 — CU-029 | Documento 2; E2-14 original | E2-18 crea una raíz nueva por Temporada y conserva lineage | No es reactivación ni copia cargo | Resuelto | No bloquea |
| E2-F03A — CU-012 | Documento 2; E2-20 | Edición mínima de nombre mediante `updateOwnGroupName` | No cubre deporte, Owner, estado ni atributos inexistentes | Parcial suficiente por decisión aprobada | No bloquea por sí solo |
| E2-F03B — CU-013 | DEC-E2-21; addendum; D5-041 | Deuda visible y condición verificable de reapertura | No implementado; excepción no extensible | Diferido por decisión aprobada | No bloquea si pasan los demás gates |
| E2-F03C — CU-014 | Documento 2; E2-23 | Archivo `activo → archivado`, read-only, sin cascadas | Sin desarchivo | Resuelto | No bloquea |
| E2-F03D — CU-015 | Documento 2; E2-24 | Eliminación física de v1 elegible, referencias verificadas, receipt privado y recuperación A/B | v2 archivado no eliminable; sin cascadas | Resuelto | No bloquea |
| E2-F04 — CU-026 cargo | Documento 2; addendum y cierre E2-22A | Cargo privado, descriptivo, editable por Owner y sin efecto autorizante | Cobertura sólo de cargo | Resuelto parcialmente | No bloquea aisladamente |
| E2-F04 — CU-026 posición/dorsal/observaciones | DEC-E2-25; addendum; D5-042 | Condiciones de reapertura por atributo | No implementados; CU-026 no está completo; no existe categoría abierta | Diferidos por decisión aprobada | No bloquean si pasan los demás gates |
| E2-F04 — CU-030 | Correctivo E2-14; E2-05/09/10/12/18 | Estados `{activa, finalizada}` agotados por operaciones específicas; renovación crea otra raíz | Prohibido setter genérico; reabrir ante nuevo estado, actor o transición aprobados | Resuelto por composición | No bloquea |
| E2-F05 — CU-010 | Documento 2; E2-19 | Historia propia paginada por raíces de Membresía y Temporada | Sin snapshot multipágina; N+1 acotado | Resuelto | No bloquea |
| CU-034–CU-038 | Documento 2 PF-02; DEC-E2-25; D5-043 | No hay perfiles ni asignaciones canónicas; autorización vigente sigue contextual | Casos reconocidos, no implementados; cargo no concede permisos | Diferidos por decisión aprobada | No bloquean si pasan los demás gates |
| E2-E4-01 | E2-13; roadmap vigente | Allowlist E4 sin autoridad sobre schemas canónicos; catálogo y consumidores comprobados permanecen | Documentos legacy pueden conservar deuda de privacidad | Diferido y asignado a E4 | No bloquea E2 |
| E2-E4-02 | E2-13; Documento 5 | Readers, Rules y writers deportivos de Partido/Torneo permanecen acotados | Migración de autorización/elegibilidad futura | Asignado a E4 | No bloquea E2 |
| E2-COMP-01 | D5-044 | Seis callable y ocho rutas HTTP tombstone conservados; dos GET públicos y sus consumidores presentes | Retiro no autorizado; consumidores externos desconocidos | Roadmap aprobado | No bloquea por falta de asignación |
| E2-AUTH-01 | Reevaluación post E2-24 | Rama aislada preservada en `fc7135e...` | No usada como evidencia de esta auditoría | Preservado, no integrado | No bloquea mientras permanezca aislado |
| E2-LINT-01 | Baseline de calidad | `36` errores y `9` warnings conocidos; `9` hallazgos resueltos frente al baseline | Riesgos hooks siguen explícitos | Deuda conocida sin regresión | No bloquea |
| TECH-GAP-04 | Documento 5; E2-13; D5-042/043 | Aggregate Roots separados y ciclos E2 cubiertos; arrays fuera de autoridad E2 | Arrays deportivos E4 y diferimientos visibles | Cubierto para E2 | No bloquea funcionalmente |
| TECH-GAP-08/09 | Documento 5 | Flujos E2 canónicos usan backend/callables; acceso directo sólo en superficies E4 asignadas | Encapsulación continúa por flujo | Parcial asignado | No bloquea E2 |
| TECH-GAP-13 | Lectores E2-04/E2-19 | Paginación y cotas comprobadas | Optimización futura sólo con medición | Deuda aceptada | No bloquea |
| E2-INTENT-01 | Cierres de incrementos | Intents y receipts durables sostienen idempotencia y recovery | Política de retención futura | Deuda aceptada | No bloquea |
| E2-DEPLOY-01 | Todos los cierres locales | No se accedió a Firebase remoto ni se desplegó | No prueba estado remoto/productivo | Fuera del gate local | No bloquea cierre documental local; sí una habilitación productiva |

## 5. Matriz de criterios de salida

| Criterio de Documento 5 | Evidencia fresca o vigente | Estado | Efecto |
| --- | --- | --- | --- |
| Comportamiento funcional implementado | Cierres E2-01–E2-24 y decisiones D5-041–D5-043 | Cumplido bajo excepciones aprobadas | No bloquea |
| Frontend, Functions y Rules compatibles | Inspección integrada; typecheck, build, sintaxis y Rules/mantenimiento frescos | Cumplido salvo que el fallo Emulator revele una regresión aún no determinada | Condicionado por gate Emulator |
| Pruebas exigidas aprobadas | Unitarias `355/355`; mantenimiento `7/7`; Emulator completa `230/232` | **Incumplido** | **Bloquea** |
| Fuente de verdad única | Grupo, Temporada, Membresía y Solicitud separados; backend escritor canónico | Cumplido | No bloquea |
| Sin escritores anteriores necesarios | Writers organizativos retirados; tombstones rechazan sin efectos | Cumplido | No bloquea |
| Sin lectores anteriores necesarios | Organización canónica no depende de readers legacy; E4 conserva sólo superficies justificadas | Cumplido con deuda E4 | No bloquea E2 |
| Estructura sustituida retirada o justificada | Arrays fuera de autoridad E2; E4/E9 asignados por D5-044 | Cumplido por retiro o asignación | No bloquea E2 |
| Rollback/checkpoint comprobado | Evidencia registrada por incremento; no se repitieron rollbacks destructivos | Cumplido documentalmente | No bloquea |
| Evidencia registrada | Fichas, informes, cierres, UAT y este informe | Cumplido | No bloquea |
| Matriz de trazabilidad actualizada | §§4–5 de este informe | Cumplido para la auditoría | No cierra por sí sola la etapa |
| Grupo sin Membresías/Solicitudes embebidas y Temporada independiente | Código, arquitectura y pruebas integradas | Cumplido con compatibilidad E4 acotada | No bloquea |
| D5-041 — CU-013 | Diferimiento y reapertura visibles | Cumplido como diferimiento | No bloquea |
| D5-042 — CU-026 restante | Cargo parcial; tres atributos diferidos por separado | Cumplido como diferimiento | No bloquea |
| D5-043 — CU-034–038 | Sin perfiles especulativos; cargo no autoriza | Cumplido como diferimiento | No bloquea |
| D5-044 — compatibilidad | Catálogo E4 y tombstones E9 presentes, conservados y condicionados | Cumplido como roadmap, no como retiro | No bloquea |
| Gate final consolidado | Una suite obligatoria completa terminó roja | **Incumplido** | **Bloquea aprobación y cierre** |

## 6. Inspección funcional y arquitectónica

La inspección y las suites cubren:

- Aggregate Roots y persistencias separados para Grupo, Temporada, Membresía y Solicitud;
- backend/Admin SDK como único escritor de las superficies canónicas;
- ownership y autorización contextual, sin autoridad por cargo o rol global;
- privacidad por defecto, no enumeración, DTO mínimos y Rules deny-all sobre raíces privadas,
  guards, intents, receipts y Períodos de Vigencia;
- lifecycle de Temporada y Membresía, referencias, guards, coordinaciones, concurrencia,
  idempotencia y recovery;
- schemas cerrados y compatibilidad v1–v6 donde corresponde;
- archivo y eliminación de Grupo sin cascadas;
- eliminación A, creación B y aislamiento de retries históricos;
- menú Owner y compatibilidad de los diálogos de E2-20, E2-23 y E2-24;
- ausencia de escritores organizativos legacy necesarios;
- allowlist E4 y exclusión de schemas canónicos presentes y futuros;
- conservación del catálogo y tombstones conforme D5-044.

El build mantiene `/api/groups/public`, `/api/groups/[groupId]/public`, `/groups` y
`/groups/[groupId]`. `functions/index.js` conserva los seis exports tombstone y `httpApi.js` conserva
las rutas de rechazo. Esto prueba conservación, no autorización de retiro.

## 7. Gates frescos y repeticiones

| Orden | Comando | Resultado real |
| ---: | --- | --- |
| 1 | `npm --prefix volley-ranking-system/functions run test:infra:unit` | `355/355`, exit `0` |
| 2 | `npm --prefix volley-ranking-system/functions run test:infra:emulators` | `230/232`, exit `1`; un subtest real falló y la suite padre contabilizó el segundo fallo |
| 3 | `E2_22A_FOCAL=1 npm --prefix volley-ranking-system/functions run test:infra:emulators` | repetición focal justificada: `7/7`, exit `0` |
| 4 | `npm --prefix volley-ranking-system/functions run test:maintenance` | `7/7`, exit `0` |
| 5 | `npm run quality:functions:syntax` | `320/320`, exit `0` |
| 6 | `npm run quality:lint` | baseline aprobado: `36` errores y `9` warnings conocidos; `9` resueltos |
| 7 | `npm run quality:typecheck` | exit `0` |
| 8 | `npm run quality:build` | compilación, TypeScript y generación estática aprobados, exit `0` |
| 9 | `git diff --check` y controles documentales | ejecutados después de crear este informe; resultado en §11 |

Los once puertos declarados por los runners estaban libres antes de la primera suite. Los runners
usaron `demo-sportexa-e0-02`, hosts loopback, secretos sintéticos, proxies externos bloqueados,
configuración/workspace temporales y `--test-concurrency=1`. Las suites Emulator no se solaparon.

El aviso de imposibilidad de obtener MOTD/configuración remota de Firebase CLI fue no fatal y
coherente con el bloqueo de red. No se accedió a servicios ni datos Firebase remotos.

### 7.1 Fallo bloqueante

- **Ubicación:** `volley-ranking-system/functions/test/emulator/membershipCargoE2.test.js:97`, escenario
  «edición y finalización concurrentes serializan y nunca pierden un cargo confirmado».
- **Resultado esperado:** `MEMBERSHIP_FINALIZATION_CONFIRMED`.
- **Resultado observado:** `DEPENDENCY_UNAVAILABLE` después de aproximadamente 10 segundos.
- **Conteo TAP:** el subtest fallido y su suite padre explican `2` fallos; existe un único escenario
  causal observado.
- **Reproducción:** ocurrió en la suite completa secuencial; no se reprodujo en una única corrida
  focal posterior, donde finalización y edición serializaron correctamente.
- **Clasificación:** incidencia de concurrencia/entorno con causa raíz **no determinada**. La evidencia
  no alcanza para afirmar defecto productivo ni para afirmar que el incidente desapareció.
- **Severidad:** alta para el gate de cierre, porque una suite obligatoria completa no aprobó;
  severidad productiva todavía indeterminada.
- **Integridad observada:** no se registró corrupción ni pérdida de cargo; el flujo respondió con un
  error estable de dependencia. Esto no satisface la assertion de serialización esperada.
- **Corrección/investigación propuesta:** reproducir el gate completo desde la misma base, conservar
  logs de transacciones alrededor de edición/finalización, identificar el origen exacto del
  agotamiento y verificar límites transaccionales. No aumentar retries, relajar assertions ni aceptar
  el focal como sustituto. Si se demuestra defecto productivo, corregirlo en una intervención de
  código separada y repetir todos los gates; si se demuestra incidencia del runner/entorno, documentar
  la causa y repetir igualmente la suite completa.

No se realizó una segunda repetición completa porque no existía todavía una causa concreta que la
justificara; repetir hasta obtener verde habría ocultado la incertidumbre.

## 8. Diferimientos y deuda futura aprobada

- CU-013 sigue diferido bajo D5-041, sin implementación y con reapertura condicionada a una necesidad
  funcional concreta.
- CU-026 conserva cargo como cobertura parcial. Posición, dorsal y observaciones siguen diferidos
  bajo D5-042 y deben reabrirse individualmente antes de implementar una utilidad que los necesite.
- CU-034–CU-038 siguen diferidos bajo D5-043 hasta la primera capacidad real delegable. No existen
  perfiles, IDs ni asignaciones especulativas; cargo no concede permisos.
- CU-030 está resuelto por composición de operaciones específicas; no existe ni se autoriza un setter
  genérico de estado.
- D5-044 asigna el catálogo público residual a E4 y los tombstones callable/HTTP a E9. Las superficies
  se conservan. Cada retiro requiere condiciones verificadas y una decisión posterior.
- La ausencia de referencias internas no demuestra ausencia de consumidores externos. Si falta
  evidencia externa, deberá decidirse aviso, compatibilidad versionada o aceptación del riesgo.

## 9. UAT y límites de evidencia

No se repitió UAT completa ni se simuló aprobación humana. Se revisó la evidencia registrada por los
incrementos y se conservan estos límites:

- lector de pantalla real: `NO EJECUTADO` donde fue registrado así;
- pérdida controlada de respuesta post-commit en E2-23/E2-24: `NO EJECUTADO` manualmente; existe
  cobertura automatizada de recovery, que no se reclasifica como UAT humana;
- retry espontáneo recuperable y lector de pantalla de E2-22A: no ejecutados manualmente;
- incidentes históricos de concurrencia y Auth/Functions conservan sus incertidumbres documentadas;
- el fallo fresco de §7.1 agrega incertidumbre de concurrencia hasta determinar su causa;
- una corrida focal verde demuestra no reproducción en ese intento, no eliminación definitiva;
- Emulator local no demuestra índices, Rules o Functions desplegados remotamente.

No se identificó una nueva necesidad de UAT humana que reemplace el bloqueo técnico. Primero debe
resolverse y repetirse el gate automatizado completo.

## 10. Hallazgos consolidados

| ID | Hallazgo | Severidad | Estado |
| --- | --- | --- | --- |
| E2-14-FINAL-01 | Suite Emulator completa `230/232`; escenario concurrente E2-22A recibió `DEPENDENCY_UNAVAILABLE` | Alta para cierre | Bloqueante; causa no determinada |
| E2-14-FINAL-02 | Repetición focal E2-22A `7/7` | Informativa | No levanta E2-14-FINAL-01 |
| E2-14-FINAL-03 | Resto de gates locales aprobados | Informativa | Cumplido |
| E2-14-FINAL-04 | UAT humana no repetida y límites históricos preservados | Informativa | Conforme al alcance |
| E2-14-FINAL-05 | Sin verificación ni despliegue remoto | Informativa | Fuera de alcance; no prueba readiness productivo |

## 11. Validación del informe y estado final

La validación final debe comprobar:

- referencias locales;
- UTF-8 válido sin BOM;
- newline final;
- fences balanceados;
- ausencia de whitespace final;
- `git diff --check`, incluyendo este archivo sin seguimiento;
- árbol con sólo este informe nuevo e índice vacío;
- ausencia de listeners residuales en los puertos iniciados por la tarea.

Los resultados concretos se registran en la devolución de la intervención para no editar este
informe después de su propia validación.

## 12. Trabajo necesario para desbloquear

1. Determinar la causa del timeout transaccional del escenario concurrente E2-22A sin debilitar la
   prueba ni aumentar retries como mecanismo de aprobación.
2. Aplicar una corrección separada sólo si la evidencia demuestra un defecto de producto o runner.
3. Ejecutar nuevamente la Emulator Suite completa, secuencial y aislada, sobre el SHA que se audite.
4. Repetir los gates afectados y actualizar o reemplazar este dictamen mediante una nueva evidencia
   trazable; no sobrescribir silenciosamente este resultado.

## 13. Conclusión

La revisión funcional, normativa y arquitectónica satisface los criterios de Etapa 2 bajo los
diferimientos D5-041–D5-043 y el roadmap D5-044. Todos los gates locales salvo la Emulator Suite
completa aprobaron. Dado que un gate obligatorio terminó rojo y su causa no fue determinada, Etapa 2
no está apta todavía para cierre formal.

`E2-14 FINAL BLOQUEADA — HALLAZGO E2-14-FINAL-01 PENDIENTE — ETAPA 2 ABIERTA — E3 DESHABILITADA`
