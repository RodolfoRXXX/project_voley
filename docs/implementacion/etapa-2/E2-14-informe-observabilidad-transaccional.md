# E2-14 — Informe de observabilidad transaccional

## 1. Alcance y estado

- **Fecha:** 2026-10-06.
- **Base:** `7565ad93674c2139655ca918c91317f6f09e8fda`.
- **Rama:** `fix/e2-14-transaction-observability`.
- **Objetivo:** conservar evidencia técnica sanitizada de los fallos transaccionales de edición de cargo y finalización administrativa antes de su conversión a `DEPENDENCY_UNAVAILABLE`.
- **Límite:** la causa del incidente histórico permanece desconocida. Esta corrección cubre una carencia de observabilidad; no cambia ni acredita la resolución de la concurrencia.

Se preservan sin reescritura `E2-14-informe-auditoria-final-etapa-2.md` y
`E2-14-diagnostico-concurrencia-cargo-finalizacion.md`.

## 2. Plan de validación fijado antes de ejecutar

La matriz queda cerrada en este orden:

1. prueba focal unitaria `membershipTransactionObservability.test.js`;
2. suite unitaria Functions completa;
3. comprobación de sintaxis Functions;
4. tres ejecuciones focales E2-22A, secuenciales y con Emulator nuevo en cada una;
5. una Emulator Suite integral, secuencial y aislada;
6. `git diff --check` y controles documentales/finales.

No se agregarán intentos para obtener verde. Si una prueba ejecutada falla, la matriz se detendrá y
los pasos posteriores quedarán `NO EJECUTADOS`. Un fallo de arranque anterior a las pruebas se
registrará separadamente y sólo podrá sustituirse con justificación concreta.

## 3. Diseño implementado

Se agregó `membershipTransactionObservability.js`, un helper local a la infraestructura de Membresía
que crea una correlación UUID por ejecución confirmatoria y emite el evento estructurado
`membership.transaction-technical-error`. El evento contiene exclusivamente:

- `operation`: `membership-cargo-update` o `administrative-finalization`;
- `phase`: `transaction`, `recovery` o `mapping`;
- `technicalCode`: primer número/string seguro de la cadena causal acotada, o `null` si está ausente o no supera la allowlist;
- `errorType`: `CODED_ERROR`, `UNCODED_ERROR` o `NON_ERROR_THROWN`;
- `durationMs`: tiempo desde el inicio de la confirmación;
- `correlationId`: UUID opaco interno, no incorporado a respuesta ni persistencia.

Los stores de cargo y finalización crean una observación por llamada a `confirm`. El primer error
técnico que habilita el recovery se registra como `transaction`; un error técnico del segundo
`execute` se registra como `recovery` con la misma correlación. Un error técnico que no habilita
recovery se registra una vez como `mapping`, antes de convertirlo en
`MembershipDependencyUnavailableError`. El registro ocurre después de que `runTransaction` terminó,
no dentro de su callback, por lo que los retries internos del SDK no duplican eventos.

El helper no recibe args funcionales. No registra payload, cargo, nombres, emails, UID, IDs, paths,
tokens, claves, hashes, error completo, mensaje ni stack. Los `MembershipError` funcionales esperados
no generan alertas técnicas. Todo fallo al crear la correlación, medir o invocar el logger queda
contenido y no altera la operación.

No cambiaron retries, deadlines, timeouts, autorización, transacciones, escrituras, receipts,
contratos, DTO ni mapping público.

## 4. Resultados

La primera invocación del paso 1 no llegó a cargar el archivo de pruebas: Node terminó con `EPERM`
durante `lstat C:/Users/Rodolfo` dentro del sandbox. TAP informó un fallo de carga, no se ejecutó ningún
caso y no se iniciaron emuladores. Se autoriza una única sustitución con el mismo comando fuera de ese
aislamiento; no cuenta como repetición de una prueba ejecutada ni como intento para obtener verde.

La sustitución focal ejecutó `6/6` pruebas, sin fallos, exit `0`. Son inyecciones controladas y no una
reproducción del incidente histórico. La suite unitaria Functions completa aprobó `361/361`, exit `0`.
La sintaxis Functions aprobó `322/322`, exit `0`.

Las tres focales E2-22A aprobaron `7/7`, exit `0`, en todos los casos. En la carrera observada:

| Focal | Finalización | Edición de cargo | Subtest concurrente |
| ---: | ---: | ---: | ---: |
| 1 | 2156 ms | 3166 ms | 3546 ms |
| 2 | 2159 ms | 3729 ms | 4105 ms |
| 3 | 2154 ms | 3599 ms | 3984 ms |

No se emitieron eventos técnicos del nuevo logger en esas carreras. La integral permanece pendiente.

La Emulator Suite integral única aprobó `232/232`, exit `0`, en `345139 ms`. Se ejecutó con
`--test-concurrency=1`, workspace/configuración temporales, proyecto `demo-sportexa-e0-02`, datos
sintéticos, loopback y proxies externos bloqueados. Los emuladores se apagaron al terminar.

### Matriz consolidada

| Orden | Gate | Resultado |
| ---: | --- | --- |
| 1a | focal observabilidad dentro del sandbox | no inició pruebas: `EPERM` en `lstat`; sustitución justificada |
| 1b | focal observabilidad efectiva | `6/6`, exit `0` |
| 2 | unitarias Functions completas | `361/361`, exit `0` |
| 3 | sintaxis Functions | `322/322`, exit `0` |
| 4.1 | Emulator focal E2-22A | `7/7`, exit `0` |
| 4.2 | Emulator focal E2-22A | `7/7`, exit `0` |
| 4.3 | Emulator focal E2-22A | `7/7`, exit `0` |
| 5 | Emulator integral | `232/232`, exit `0` |
| 6 | focal observabilidad tras revisión preintegración | `6/6`, exit `0`; única revalidación del ajuste acotado |

Resultado: **sin reproducción en la matriz ejecutada**. No se afirma estabilidad estadística,
ausencia definitiva del fallo ni corrección de concurrencia. Los eventos verificados por unit tests
son inyecciones técnicas controladas, no evidencia de que el incidente histórico haya usado esos
códigos.

### Cobertura específica de observabilidad

Las pruebas controladas demuestran:

1. preservación de `10`, `14`, `ABORTED` y código ausente como `null`;
2. correlación idéntica entre los eventos `transaction` y `recovery` de una ejecución;
3. ausencia de cargo, email, UID, IDs, token, hash, mensaje y objetos de error en el evento;
4. contrato público inalterado: `unavailable` y reason `DEPENDENCY_UNAVAILABLE`;
5. causa original conservada en `error.cause`, recovery exitoso inalterado y fallo del logger inocuo;
6. cero alertas técnicas para un `MembershipError` funcional esperado.

La revisión previa a integración detectó que la primera versión sólo inspeccionaba `error.code`
directo, aunque los clasificadores de recovery también admiten códigos envueltos. Se corrigió el
helper para recorrer hasta seis causas con corte de ciclos y se agregó cobertura focal. Esta corrección
no alteró stores, contratos ni recovery; se validó exclusivamente con la prueba afectada, sin repetir
la matriz general.

## 5. Documento 5 y riesgo residual

Documento 5 §5.8 exige que las pruebas requeridas aprueben y que la evidencia quede registrada para
cerrar un incremento. §5.11 acepta pruebas automatizadas, resultados de emuladores y logs controlados,
pero exige que cada evidencia corresponda al criterio demostrado. Documento 5 no formula como gate
independiente identificar la causa histórica de todo incidente no reproducido. Sí exige pruebas y
evidencia suficientes, deuda restante identificada y aceptada (§3.7 y §5.8). Por ello la eventual
evaluación del riesgo residual debe ser expresa y posterior; esta intervención no elimina el gate rojo
registrado por la auditoría ni decide la aceptación del riesgo.

## 6. UAT y límites

No se ejecutó UAT: el cambio es backend y no altera contrato ni interfaz. Auth/UAT permaneció aislada
en `fc7135e358902a17372d44f20df50883603520ce`. No hubo deploy, acceso Firebase remoto, cambios de
Rules, índices, frontend, normativa o cierres.

La matriz no produjo un fallo técnico real, por lo que no existe un log causal de producción o
Emulator para el incidente histórico. La validación prueba la forma y seguridad del logging mediante
inyección y que el camino real continúa aprobando; no prueba qué código ocurrió en la auditoría roja.

## 7. Estado final y siguiente paso

### Inventario de cambios

- `membershipTransactionObservability.js`: helper estructurado y tolerante a fallos;
- `firestoreMembershipCargoStore.js`: observación técnica alrededor de confirmación/recovery/mapping;
- `firestoreMembershipAdministrativeFinalizationStore.js`: misma cobertura para finalización;
- `membershipTransactionObservability.test.js`: seis pruebas de inyección controlada;
- este informe.

Los dos informes anteriores permanecen sin modificaciones y sin seguimiento. No se modificaron
Rules, índices, frontend, contratos, normativa ni cierres. No se hizo stage, commit, push o merge.

El siguiente paso recomendado es revisar esta rama y, si se aprueba, integrarla mediante una
intervención separada. Recién sobre el SHA integrado corresponde repetir formalmente E2-14. Si el
fallo reaparece, el código técnico capturado deberá analizarse junto con fase, duración y correlación,
sin atribuir causalidad sólo por semejanza histórica. Si no reaparece, el responsable del gate deberá
evaluar expresamente el riesgo residual conforme a Documento 5; este informe no reemplaza esa
decisión ni el dictamen rojo previo.

### Validación documental y estado Git

- UTF-8 válido sin BOM y newline final: aprobado;
- whitespace final y fences: aprobado;
- revisión de campos del evento: sólo aparecen operación, fase, código técnico sanitizado, tipo
  cerrado, duración y correlación;
- `git diff --check`, incluido control equivalente sobre archivos sin seguimiento: aprobado;
- puertos Emulator verificados al finalizar: sin listeners propios;
- rama `fix/e2-14-transaction-observability`, sin upstream;
- HEAD inalterado en `7565ad93674c2139655ca918c91317f6f09e8fda`;
- índice vacío, sin stashes;
- dos archivos tracked modificados y tres archivos nuevos de esta intervención;
- los dos informes recibidos continúan sin seguimiento y preservados;
- Auth/UAT continúa aislada en `fc7135e358902a17372d44f20df50883603520ce`.

`OBSERVABILIDAD IMPLEMENTADA Y VALIDADA — SIN REPRODUCCIÓN EN LA MATRIZ — CAUSA HISTÓRICA DESCONOCIDA`
