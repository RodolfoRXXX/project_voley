# E0-02 — Infraestructura mínima de pruebas

**Proyecto:** SPORTEXA  
**Fecha:** 16 de agosto de 2026  
**Estado:** **BLOQUEADO EN PREFLIGHT DE SECRETOS**

## 1. Alcance de esta ejecución

La ejecución se detuvo en el preflight obligatorio de secretos, antes de seleccionar o incorporar un runner, modificar scripts, iniciar emuladores o ejecutar pruebas.

No se modificaron reglas Firestore, lógica funcional, dependencias, configuración Firebase ni código de producción. No se ejecutaron migraciones, seeds, backfills, despliegues o accesos a Firebase remoto.

## 2. Precondición de repositorio

| Verificación | Resultado |
| --- | --- |
| Rama | `chore/etapa-0-estabilizacion` |
| Commit inicial | `95fc218fbcfd1dc246d3306c1e020f2183742008` |
| Tracking | `origin/chore/etapa-0-estabilizacion` |
| Estado inicial | Limpio |
| E0-01 versionado | Sí; `docs/implementacion/etapa-0/E0-01-linea-base-reproducible.md` pertenece al commit actual |
| Rama específica de Etapa 0 | Sí |
| Cambios locales ajenos | Ninguno detectado |

La precondición de repositorio se consideró satisfecha.

## 3. Resultado del preflight de secretos

Archivo afectado:

`volley-ranking-system/functions/.secret.local`

El archivo está versionado. Se inspeccionó mediante clasificación local que no imprimió valores ni fragmentos.

| Variable | Resultado seguro de clasificación |
| --- | --- |
| `PUSH_VAPID_PUBLIC_KEY` | Posible material real con formato compatible con clave VAPID/base64url |
| `PUSH_VAPID_PRIVATE_KEY` | Posible credencial real con formato compatible con clave VAPID/base64url |
| `PUSH_VAPID_SUBJECT` | Identificador operativo no ficticio |

No se registraron longitudes, hashes, valores ni fragmentos. La clasificación no puede probar por sí sola que las claves estén activas, pero sí impide tratarlas como datos ficticios.

## 4. Motivo del bloqueo

La consigna de E0-02 exige detener la intervención antes de ejecutar pruebas que puedan cargar el archivo cuando existan indicios de credenciales reales.

Iniciar Functions Emulator desde el árbol actual podría cargar `.secret.local`. Continuar habría incumplido el preflight y habría ampliado innecesariamente la exposición del material versionado.

Por esa razón no se seleccionó ni implementó todavía un mecanismo de pruebas y no se ejecutaron typecheck, lint, build ni emuladores como parte de E0-02. El baseline de E0-01 permanece como última evidencia técnica válida.

## 5. Acciones necesarias antes de reanudar E0-02

Estas acciones requieren decisión y autorización explícitas; no fueron ejecutadas:

1. Tratar `PUSH_VAPID_PRIVATE_KEY` como comprometida por haber sido versionada.
2. Rotar el par VAPID en el sistema que lo utiliza y actualizar el almacenamiento autorizado de secretos.
3. Verificar qué ambientes, Functions o clientes consumen el par actual antes de invalidarlo.
4. Retirar `.secret.local` del índice de Git y agregar una regla de ignore apropiada.
5. Incorporar, si se necesita documentación local, una plantilla sin valores reales, por ejemplo `.secret.local.example`.
6. Evaluar y autorizar por separado la purga del archivo en el historial Git y en copias remotas. Retirarlo del último commit no elimina exposiciones históricas.
7. Auditar accesos al repositorio y cualquier distribución adicional del archivo.
8. Confirmar que el árbol de trabajo ya no contiene credenciales reales antes de repetir el preflight.

La clave pública y el subject no equivalen por sí solos a una clave privada, pero deben actualizarse de forma coordinada con la rotación del par y evitar exposición innecesaria de identificadores operativos.

## 6. Infraestructura y comandos

No se agregaron archivos de infraestructura, scripts npm, fixtures ni pruebas. No existe todavía un comando E0-02 aprobado.

La selección del mecanismo mínimo compatible con CommonJS, Node 20, Auth Emulator, Firestore Emulator y reglas Firestore queda pendiente hasta superar el gate de secretos. No corresponde decidirla parcialmente mientras la ejecución está bloqueada.

## 7. Evidencia de aislamiento

La evidencia negativa de esta ejecución es el fallo cerrado del proceso de preflight:

- se verificó el archivo antes de iniciar Firebase;
- se detectaron indicios sin imprimir valores;
- no se inició Firebase CLI ni Emulator Suite;
- no se accedió a recursos Firebase remotos;
- no se cargaron datos reales ni sintéticos;
- no se ejecutaron pruebas.

Esta evidencia demuestra que el procedimiento humano de preflight falló de forma cerrada. Todavía no satisface el criterio de salida que exige una guarda automatizada y una prueba negativa reproducible.

## 8. Criterios de salida

| Criterio E0-02 | Estado |
| --- | --- |
| Comando claro y repetible | No implementado |
| Uso exclusivo de emuladores | No verificado en E0-02 |
| Project ID obligatorio `demo-*` | No implementado |
| Configuración insegura falla antes de Firebase | Preflight manual cumplido; guarda automatizada pendiente |
| Datos sintéticos | No implementados |
| Smoke test del runner | No implementado |
| Comprobación negativa automatizada | No implementada |
| Reglas y lógica funcional sin cambios | Cumplido |
| Cambios y dependencias documentados | Cumplido para el bloqueo |
| Sin regresiones respecto de E0-01 | No evaluado; no se ejecutaron verificaciones posteriores al gate |

## 9. Veredicto

**BLOQUEADO.**

E0-02 no puede cerrarse. El bloqueo concreto es la presencia versionada de posible material VAPID real en `volley-ranking-system/functions/.secret.local`.

## 10. Recomendación siguiente — no ejecutada

El siguiente paso no es E0-03. Primero se requiere una intervención de seguridad autorizada para retirar y rotar el posible secreto, decidir el tratamiento del historial y repetir el preflight. Una vez superado ese gate, debe reanudarse E0-02 desde la selección del mecanismo mínimo de pruebas.
