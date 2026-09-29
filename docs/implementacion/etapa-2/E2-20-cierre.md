# E2-20 — Cierre formal de la edición mínima del nombre del Grupo

## Estado

- Incremento: `E2-20`.
- Caso de uso: `CU-012 — Editar Grupo`.
- Estado documental: `CERRADO`.
- Alcance cerrado: edición exclusiva de `groups/{groupId}.nombre` por el Owner actual.
- Implementación: `5ecb25b56692d36db34942cb74f6b872700719d3`.
- Merge no fast-forward en `dev`: `e7ad90832205321a58453d72f45b30f932d9d389`.
- Padres del merge: `74695773f4f179573cea413446cf372b7fbf2945` y `5ecb25b56692d36db34942cb74f6b872700719d3`.
- Deploy: no realizado.
- Firebase remoto: no accedido.

## Fuentes y trazabilidad

Este cierre se contrastó con:

- [`E2-20-ficha-edicion-minima-grupo.md`](./E2-20-ficha-edicion-minima-grupo.md), definición contractual y criterio de terminado de E2-20;
- [`E2-20-informe-implementacion.md`](./E2-20-informe-implementacion.md), inventario, decisiones, correcciones y evidencia de implementación;
- [`Documento 5 - Plan de Implementación y Transición Técnica-borrador.md`](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md), criterios comunes de evidencia y cierre;
- los cierres precedentes [`E2-17-cierre.md`](./E2-17-cierre.md), [`E2-18-cierre.md`](./E2-18-cierre.md) y [`E2-19-cierre.md`](./E2-19-cierre.md), como patrón documental vigente;
- el historial Git de la ficha, el commit de implementación y su merge en `dev`.

La ficha está integrada con objeto Git `e7f75ed574ca9271dcbd58a72f4eed6ef3d859f1` y el informe con objeto Git `1bda8cb0d77a57e430bc4bd2b84fa1f506bd27f6`. El commit de implementación tiene como padre único `74695773f4f179573cea413446cf372b7fbf2945`; el merge incorpora ese commit como segundo padre y conserva la base como primer padre.

## Alcance cerrado

E2-20 cierra solamente la edición mínima del nombre del Grupo. La mutación autorizada reemplaza `groups/{groupId}.nombre` y no modifica identidad, Owner, deporte, estado, miembros, roles, cargos, permisos, competencias, migraciones ni otros agregados.

El flujo cubierto comprende:

- lectura Owner-scoped del Grupo propio sin enumerar inexistencia frente a pertenencia ajena;
- normalización y validación contractual del nombre;
- edición desde la interfaz integrada en el detalle del Grupo;
- escritura transaccional exclusiva del campo `nombre`;
- resultado explícito, recuperación idempotente y actualización de la vista con el estado vigente.

## Garantías verificadas

La evidencia integrada sostiene las siguientes garantías:

- **Autorización contextual:** la transacción vuelve a comprobar que el Grupo existe y que el actor autenticado continúa siendo su Owner. Grupo inexistente y Grupo ajeno convergen en `GROUP_NOT_ACCESSIBLE`.
- **Token de edición:** el token opaco liga versión contractual, `groupId`, Owner vigente y nombre canónico; un token vencido se rechaza antes de considerar un no-op.
- **Idempotencia:** la clave es obligatoria para una mutación real y queda ligada al efecto solicitado; su reutilización incompatible se rechaza.
- **Concurrencia:** ante dos escrituras con el mismo token, sólo una puede aplicar el cambio y la otra observa conflicto por token vencido.
- **`UPDATED`:** representa una mutación aplicada, con receipt durable y respuesta que distingue el efecto histórico del estado actual.
- **`NO_CHANGES`:** no escribe el Grupo, no crea receipt y no consume la clave idempotente.
- **Recovery:** una repetición exacta puede recuperar el resultado durable, pero antes reautoriza al Owner actual; `appliedEffect` preserva el efecto histórico y `currentGroup`/`currentEditToken` informan el estado vigente.
- **Superficie de escritura:** el adaptador transaccional limita la actualización del Grupo a `nombre`; Rules mantienen al cliente sin capacidad de escritura directa.

## Correcciones incorporadas durante la revisión

La auditoría adversarial detectó y la implementación corrigió dos defectos antes del gate integral final:

1. `getOwnGroup` distinguía entre Grupo inexistente y Grupo ajeno. Se unificó la salida pública en `GROUP_NOT_ACCESSIBLE` para evitar enumeración.
2. Ante pérdida de ownership, el diálogo podía conservar transitoriamente datos Owner-scoped durante la navegación. Se incorporó su retiro inmediato del estado visible.

El primer intento del gate integral detectó además siete fallos de regresión (`203/210` en Emulator): una expectativa histórica de E2-01 seguía esperando el error anterior y el adaptador de Membresía sólo traducía `NOT_AUTHORIZED`. Se actualizaron esa expectativa y el mapeo del adaptador para conservar el contrato público de Membresía. Estas correcciones quedaron incluidas en el commit de implementación.

No se registraron cambios en el comportamiento de la interfaz por esas dos correcciones del gate integral. Conforme al informe, no se repitió la UAT.

## Evidencia automatizada

La secuencia de ejecución se conserva para no mezclar resultados obtenidos en momentos distintos:

### Antes de las correcciones de auditoría

- unitarias: `337/337` aprobadas;
- Emulator Suite: `210/210` aprobadas;
- sintaxis: `303/303` aprobadas;
- TypeScript: aprobado;
- build de producción: aprobado;
- lint baseline: aprobado.

### Después de las correcciones de auditoría

- unitarias focales: `24/24` aprobadas;
- Emulator focal E2-20: `11/11` aprobadas;
- TypeScript: aprobado;
- lint baseline: aprobado;
- sintaxis: aprobada;
- `git diff --check`: aprobado.

### Gate integral final previo al merge

Luego del intento inicial `203/210` y de corregir la expectativa E2-01 y el adaptador de Membresía:

- unitarias: `337/337` aprobadas;
- Emulator Suite aislada: `210/210` aprobadas;
- sintaxis: `303/303` aprobadas;
- TypeScript: aprobado;
- build de producción: aprobado;
- lint baseline: aprobado, con el baseline conocido informado (`36` errores y `9` warnings; `9` incidencias resueltas);
- `git diff --check`: aprobado.

### Verificación posterior al merge

- TypeScript: aprobado;
- unitarias: `337/337` aprobadas;
- Emulator focal E2-20: `11/11` aprobadas.

No se ejecutan nuevamente suites de código para este cierre porque el único cambio es este documento.

## Evidencia funcional y accesibilidad

La UAT original registró diez escenarios funcionales como `OK`. El anuncio con lector de pantalla quedó clasificado como `NO EJECUTADO`.

Después de la UAT y de las correcciones surgidas del gate integral, el usuario confirmó únicamente que la comprobación funcional solicitada sobre la versión integrada **funciona**. No constan pasos, capturas ni resultados individuales adicionales, por lo que este cierre no los atribuye ni reclasifica la UAT original.

**El anuncio con lector de pantalla no fue ejecutado.** Las comprobaciones registradas de foco y teclado, junto con la inspección y las pruebas automatizadas, no demuestran accesibilidad integral ni permiten declarar aprobado ese anuncio mediante tecnología asistiva.

Esta evidencia pendiente no bloquea el cierre de E2-20: la ficha y el Documento 5 exigen accesibilidad mínima, evidencia clasificada honestamente y trazabilidad, pero no establecen la ejecución con un lector de pantalla real como condición específica obligatoria para este incremento. Se conserva, por tanto, como límite de verificación y riesgo residual, no como resultado aprobado.

## Exclusiones y riesgos residuales

Permanecen fuera de E2-20:

- `CU-013`, `CU-014`, `CU-015` y `CU-026`;
- descripción y configuración del Grupo, roles, cargos, permisos, transferencia de ownership, deporte y estado;
- historial funcional del nombre, notificaciones y actividad;
- migración, backfill, reparación masiva y escrituras directas desde cliente;
- adaptación o sincronización de semánticas legacy de E4;
- deploy, acceso a Firebase remoto y UAT de Auth/Emulator.

Se aceptan los riesgos residuales ya documentados: no existe historial funcional de nombres; las vistas históricas muestran el nombre actual; los receipts tienen retención indefinida hasta una política futura; los ciclos de vida de ownership, archivado y borrado se resuelven en incrementos posteriores; y una corrección de nombre requiere una nueva edición autorizada, no rollback semántico automático. A esto se suma el límite de verificación del anuncio con lector de pantalla descrito arriba.

## Estado del plan y efecto del cierre

- E2-14 continúa abierta y no se modifica.
- Etapa 2 continúa abierta.
- E3 permanece deshabilitada.
- La rama `chore/preserve-auth-emulator-uat-changes` permanece aislada y no forma parte de este cierre.
- E2-21 no se inicia ni se implementa mediante este documento.

El cierre formal de E2-20 habilita únicamente la **definición** de E2-21, de acuerdo con la secuencia del plan. No autoriza implementación, deploy ni ampliación del alcance.

## Veredicto

`E2-20 CERRADO — E2-21 HABILITADO PARA DEFINICIÓN`
