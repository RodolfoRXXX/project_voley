# Addendum funcional a Documento 2 — E2-23 / archivo de Grupo

## Estado y autoridad

- **Contenido funcional:** `APROBADO POR EL USUARIO`.
- **Estado del artefacto:** `APROBADO PARA VERSIONAR`.
- **Fecha:** 2026-10-01.
- **Documento base:** [Documento 2 — Modelo Funcional y Casos de Uso](./Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf).
- **Caso concretado:** CU-014 — Archivar un Grupo.
- **Ficha implementable:** [E2-23](../implementacion/etapa-2/E2-23-ficha-archivo-grupo.md).

Este addendum completa prospectivamente el detalle funcional ausente de CU-014. No edita ni
reemplaza el PDF base, no reescribe cierres históricos y no modifica los Documentos 1, 1.5, 3, 4 o
5. Sus decisiones autorizan definición documental; no autorizan implementación, deploy, cierre de
E2-14 o Etapa 2, habilitación de E3 ni cambios comerciales adicionales.

## 1. Decisión funcional incorporada

> **CU-014 / E2-23 — Archivar un Grupo.**
>
> Sólo el Owner vigente puede archivar un Grupo. La única transición aprobada en E2-23 es de
> `activo` a `archivado`. No existe desarchivo en este caso; una eventual reactivación requerirá una
> decisión funcional y un incremento futuros.
>
> El archivo sólo puede confirmarse cuando el Grupo no posea Temporadas abiertas, Membresías
> activas ni sus guards abiertos, Solicitudes pendientes o coordinaciones en curso capaces de crear,
> reactivar o renovar Membresías. Cada situación debe resolverse previamente mediante los contratos
> propios ya existentes. Archivar no cierra Temporadas, no finaliza Membresías, no cancela ni decide
> Solicitudes y no consume coordinaciones.
>
> El Grupo archivado conserva identidad, nombre, deporte, Owner, fecha de creación, información e
> historia. Persiste la fecha autoritativa de archivo. El actor no forma parte de la raíz y se conserva
> únicamente en el receipt técnico privado necesario para idempotencia y recovery.
>
> El Owner vigente puede consultar el Grupo archivado y su información conservada en modo read-only,
> incluidas Temporadas cerradas y datos históricos o resultados terminales ya disponibles mediante
> contratos autorizados. Las consultas históricas propias continúan componiendo el contexto mínimo
> del Grupo. El archivo no amplía campos, actores ni visibilidad de esos contratos.
>
> Un Grupo archivado queda oculto del descubrimiento, preview de ingreso y superficies operativas.
> No admite edición de nombre, operaciones de Temporada, mutaciones de Membresía o Solicitud ni otra
> mutación operativa. Sólo se permite retry/recovery de la misma intención de archivo confirmada.
>
> No se implementa ni habilita transferencia de un Grupo archivado. Archivar no libera el límite
> provisional vigente para crear otro Grupo y esta regla no constituye una política comercial
> definitiva. CU-015 — Eliminar un Grupo permanece independiente.

## 2. Transición y precondiciones

### 2.1 Transición aprobada

```text
activo -> archivado
```

- `archivado` expresa fin del ciclo operativo del Grupo en E2-23.
- No equivale a eliminación, ausencia, Temporada cerrada ni un booleano legacy.
- No existe `archivado -> activo` en E2-23.
- Un retry idéntico no es otra transición: recupera el hecho ya confirmado.

### 2.2 Elegibilidad

La confirmación exige:

1. Owner vigente autenticado y contexto de Cuenta compatible;
2. Grupo activo y compatible;
3. cero Temporadas abiertas;
4. cero Membresías activas y cero active guards;
5. cero Solicitudes pendientes y cero pending guards;
6. cero coordinaciones en curso capaces de activar Membresía;
7. integridad de las referencias y controles consultados.

Las precondiciones son bloqueos, no instrucciones de cascada. La interfaz debe explicar la operación
existente que el Owner debe completar y permitir que luego vuelva a intentar el archivo. Una
inconsistencia o corrupción falla cerrada y no se corrige desde CU-014.

## 3. Actor, autorización y privacidad

La autoridad deriva exclusivamente del ownership vigente del Grupo. No autorizan:

- Administrador o integrante del Grupo;
- Membresía, Persona, cargo, rol, permiso no implementado o array legacy;
- rol global o app admin;
- Plan, Suscripción o condición comercial;
- haber sido Owner anteriormente;
- conocer el ID del Grupo.

Grupo inexistente y Grupo ajeno deben converger públicamente. El estado archivado sólo se revela
después de acreditar ownership o a través de una consulta histórica propia ya autorizada y
minimizada. El actor del archivo, receipts, hashes, guards y coordinaciones son privados.

## 4. Información conservada y visibilidad

### 4.1 Permitido

- detalle read-only y listado de archivados para el Owner vigente;
- consulta Owner de Temporadas cerradas mediante los contratos históricos existentes;
- historia propia de Membresías que ya compone nombre de Grupo y contexto mínimo;
- resultados terminales de Solicitud que el contrato existente ya autorice;
- fecha autoritativa de archivo en el detalle Owner del Grupo.

### 4.2 Prohibido

- descubrimiento público o autenticado general;
- preview/candidatura de ingreso;
- nuevas operaciones o acciones rápidas;
- ampliación de la historia con cargo, actor, Owner, receipt, schema, IDs o datos privados;
- convertir la preservación histórica en permiso para mutar.

El archivo no cambia el estado de una Membresía ni la clasificación histórica propia derivada de
ella. Tampoco crea una API general de auditoría o Actividad.

## 5. Frontera entre Agregados

1. La transición y su fecha pertenecen al Aggregate Root Grupo.
2. Temporada, Membresía y Solicitud se consultan sólo para elegibilidad e integridad.
3. Ninguna consulta transfiere ownership ni incorpora esos Agregados a Grupo.
4. Resolver una precondición requiere el contrato del Agregado responsable.
5. No existe transacción funcional que archive Grupo y modifique otro Aggregate Root.
6. Un eventual evento `GrupoArchivado` describe un hecho; no ordena cierres, finalizaciones,
   cancelaciones, rechazos, eliminación ni cambios comerciales.

## 6. Relación con casos y decisiones vigentes

| Fuente/caso | Efecto preservado |
| --- | --- |
| CU-012 / E2-20 | Editar nombre continúa separado y sólo sobre Grupo activo |
| CU-013 / DEC-E2-21 / D5-041 | Configuración continúa diferida; no condiciona ni absorbe archivo |
| CU-015 | Eliminación conserva definición e incremento propios |
| CU-018 / E2-15 | Temporada debe cerrarse previamente; archivo no ejecuta el cierre |
| CU-027–CU-030 | Lifecycle de Membresía debe resolverse previamente por sus contratos |
| CU-031–CU-033 | Solicitud pendiente debe decidirse/cancelarse previamente; archivo no lo hace |
| CU-026 / E2-22A | Cargo sigue privado, descriptivo y fuera de las nuevas superficies históricas |
| RF-23–RF-25 | Comercial puede detectar una incompatibilidad, pero no archiva; el límite provisional no se redefine como política final |

## 7. Persistencia funcional aprobada

La raíz archivada conserva todos los campos propios anteriores y agrega únicamente:

- `estado: "archivado"`;
- `archivedAt`, timestamp autoritativo del archivo;
- la versión de schema necesaria para representar inequívocamente esa forma.

No se agrega `archivedBy`. El actor existe sólo en un receipt técnico privado. El receipt no es
historia pública ni fuente del estado y sólo puede contener lo estrictamente necesario para
idempotencia y recovery.

No se autoriza motivo, descripción, configuración, snapshot de relaciones, listas embebidas,
metadata genérica, migración, backfill o reparación.

## 8. Retry, recovery y archivo previo

- La misma intención confirmada recupera el mismo efecto sin volver a escribir.
- Una intención distinta sobre un Grupo ya archivado no crea otro hecho ni otro receipt.
- Un contexto preparado que quedó obsoleto debe volver a leerse y confirmarse de nuevo.
- Un bloqueo funcional no consume la intención ni produce escritura.
- Corrupción o incompatibilidad falla cerrada y no se presenta como bloqueo resoluble.
- Recovery reautoriza al Owner vigente antes de devolver datos privados y distingue el efecto
  histórico confirmado del estado actual.

## 9. No efectos

Este addendum no:

- implementa código, schema físico, índices, Rules, UI o deploy;
- aprueba desarchivo;
- implementa transferencia;
- libera cupo ni define una política comercial definitiva;
- elimina Grupo, historia, referencias o receipts;
- cierra, finaliza, cancela, rechaza, aprueba o repara otros Agregados;
- amplía cargo, roles, permisos o visibilidad histórica;
- cierra CU-014 sin implementación y evidencia;
- cierra E2-14 o Etapa 2;
- habilita E3;
- integra Auth/UAT.

## 10. Precedencia prospectiva y reapertura

Para CU-014, este addendum concreta prospectivamente las formulaciones generales de PF-02 y RF-16,
RF-23, RF-24 y RF-25. No altera su significado para otros recursos deportivos.

La decisión debe reabrirse antes de incorporar:

- desarchivo o reactivación;
- archivo por Administrador, Sistema o causa comercial automática;
- archivo con actividad abierta/pendiente;
- mutaciones permitidas después del archivo;
- transferencia de archivados;
- liberación de cupo o política comercial definitiva;
- eliminación o retención distinta de historia/receipts;
- nuevos datos públicos o privados del hecho.

## 11. Resultado

`ADDENDUM E2-23 APROBADO PARA VERSIONAR — ARCHIVO SIN CASCADAS Y CON HISTORIA PRESERVADA`
