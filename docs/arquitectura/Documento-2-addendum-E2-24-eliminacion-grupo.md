# Addendum funcional a Documento 2 — E2-24 / eliminación de Grupo

## Estado y autoridad

- **Fecha:** 2026-10-02.
- **Estado:** aprobado funcionalmente por decisión expresa del usuario; preparado para versionar.
- **Caso alcanzado:** CU-015 — Eliminar un Grupo.
- **Documento complementado:** Documento 2 — Modelo Funcional y Casos de Uso, revisión AUD-C04.
- **Precedencia:** prospectiva y limitada a CU-015.

Este addendum concreta reglas que Documento 2 dejó abiertas al disponer que la eliminación física
sólo puede realizarse cuando el dominio lo permita y que un Grupo con actividad o historia debe
archivarse o inactivarse. No reescribe Documento 2 ni cierres históricos, no altera CU-014 y no
modifica los Documentos 1, 1.5, 3, 4 o 5. Ante una contradicción futura sobre CU-015, prevalece este
addendum dentro de su alcance.

No implementa código, schema, Rules, índices, UI o deploy; no cierra E2-14 o Etapa 2 y no habilita E3.

## 1. Decisión funcional incorporada

> CU-015 elimina físicamente la raíz de un Grupo canónico v1 activo únicamente cuando el Grupo no
> posee Temporadas, Membresías, Solicitudes ni otras referencias funcionales de ningún estado. La
> mera alta mínima, la creación o el rename del Grupo y la existencia de receipts u otros artefactos
> técnicos válidos no descalifican por sí solos.
>
> Un Grupo archivado no es eliminable. Su identidad, información e historia continúan preservadas
> conforme a CU-014 y al addendum E2-23.
>
> Sólo el Owner vigente puede preparar y confirmar la eliminación. Rol global, app admin,
> integrante, Membresía, cargo, permiso no implementado, array legacy, Plan, Suscripción o
> conocimiento del ID no autorizan.
>
> Toda Solicitud existente bloquea la eliminación, incluso si está cancelada, rechazada o aprobada.
> Crear o renombrar un Grupo sin otras referencias funcionales no impide eliminarlo. No se utiliza la
> expresión abierta «cambios administrativos» para incorporar bloqueos adicionales.
>
> Una eliminación válida libera el cupo provisional de E2-01 para una nueva creación mediante una
> nueva intención. No autoriza Grupos simultáneos adicionales ni define una política comercial final.
>
> Después de eliminar, el Grupo queda ausente de consultas, listados, detalle, dashboard,
> descubrimiento e ingreso. No existe representación Owner-visible del Grupo eliminado. Sólo el
> mismo actor, clave y request de un efecto confirmado pueden recuperar un resultado técnico mínimo,
> sin nombre, Owner, referencias funcionales ni estado actual del Grupo.
>
> La evidencia privada de eliminación preserva los outcomes técnicos confirmados. Los retries
> históricos de creación y rename distinguen el efecto que fue confirmado de la eliminación
> posterior; no recrean, restauran ni presentan el Grupo eliminado como vigente. Crear otro Grupo
> exige una intención y clave nuevas.
>
> La eliminación realiza borrado físico de la raíz y conserva únicamente la evidencia técnica
> privada mínima necesaria para idempotencia, recovery y correlación de outcomes confirmados.

## 2. Elegibilidad cerrada

La eliminación requiere simultáneamente:

1. actor autenticado con Cuenta canónica compatible;
2. Grupo canónico schema v1 en estado `activo`;
3. actor igual al Owner vigente de la raíz;
4. cero Temporadas del Grupo, abiertas o cerradas;
5. cero Membresías del Grupo, activas o finalizadas;
6. cero Períodos de Vigencia y cero lineage de Membresía que dependan del Grupo;
7. cero Solicitudes del Grupo, pendientes, canceladas, rechazadas o aprobadas;
8. cero referencias funcionales directas o transitivas de cualquier estado;
9. cero operaciones en curso capaces de crear una referencia funcional;
10. integridad y correlación de todos los artefactos técnicos existentes.

La prueba de elegibilidad es autoritativa y se repite al confirmar. Cero Membresías activas, cero
Solicitudes pendientes o una Temporada cerrada nunca equivalen a cero historia.

## 3. Matriz normativa de referencias

| Evidencia | Clasificación | Consecuencia |
| --- | --- | --- |
| Temporada abierta o cerrada | Referencia funcional e histórica | Bloquea |
| Membresía activa o finalizada | Referencia funcional e histórica | Bloquea |
| Período de Vigencia o lineage | Lifecycle propio de Membresía | Bloquea |
| Solicitud de cualquier estado | Raíz funcional y, si terminal, resultado durable | Bloquea |
| Partido, participación, equipo, entrenamiento, torneo/inscripción, pago, estadística, Actividad u otro registro funcional | Referencia propia del concepto responsable | Bloquea |
| Operación o coordinación capaz de crear una referencia | Trabajo en curso | Bloquea hasta concluir por su contrato propio |
| Alta mínima y raíz sin referencias | Identidad mínima | No bloquea |
| Rename confirmado | Estado propio sin timeline funcional de nombres aprobado | No bloquea por sí solo |
| Guard o receipt técnico válido y correlacionado | Idempotencia, unicidad o recovery | No bloquea por sí solo; se preserva o transforma de manera consistente |
| Artefacto técnico correlacionado con evidencia válida de eliminación | Evidencia técnica posterior | No es corrupción ni Grupo vigente |
| Raíz/referencia/artefacto incompatible o huérfano sin correlación válida | Corrupción | Falla cerrado; no se repara ni elimina |
| Grupo archivado | Identidad e historia preservadas | No elegible |
| Grupo legacy/no canónico | Fuera del Agregado canónico E2 | No elegible por CU-015 |

Una proyección, alerta o notificación derivada no sustituye la fuente original. Debe comprobarse su
correlación; no se borra para fabricar elegibilidad.

## 4. Actor, privacidad y no enumeración

- La autorización se deriva exclusivamente de `ownerId` vigente dentro de la unidad confirmatoria.
- El Owner no necesita Persona o Membresía propia.
- Grupo inexistente y Grupo ajeno convergen públicamente.
- Los bloqueos se informan por categoría sin sujetos, IDs, cantidades o estados privados.
- Receipts, hashes, guards, intents, coordinaciones y detalles de corrupción son backend-only.
- La evidencia de eliminación autentica únicamente al actor del efecto confirmado cuando presenta la
  misma key y el mismo request. No concede autorización general sobre un recurso ausente ni permite
  consultar por `groupId` si existió o fue eliminado.
- Una intención nueva sobre un ID eliminado obtiene la misma respuesta pública que un recurso no
  accesible.

## 5. Efecto y frontera entre Agregados

El único efecto funcional es eliminar físicamente la raíz Grupo elegible. En la misma confirmación se
libera el control provisional de creación y se persiste la evidencia técnica mínima correlacionada.

CU-015 no:

- cierra o elimina Temporadas;
- finaliza o elimina Membresías o Períodos;
- corta lineage;
- cancela, rechaza, aprueba o elimina Solicitudes;
- consume coordinaciones de otros casos;
- elimina o modifica Partidos, Torneos, Pagos, Entrenamientos, Actividad u otros Agregados;
- borra receipts para alcanzar elegibilidad;
- migra o repara documentos legacy o incompatibles.

Las consultas interagregado sólo determinan elegibilidad. No transfieren ownership ni amplían la
unidad de consistencia de Grupo.

## 6. Cupo provisional y nueva creación

La eliminación confirmada libera el control provisional de un Grupo propio de E2-01. El Usuario puede
crear luego otro Grupo mediante una intención y clave nuevas. La liberación no autoriza dos Grupos
propios simultáneos y no representa Plan, Suscripción ni capacidad comercial definitiva.

La evidencia histórica de la creación eliminada se conserva de forma que:

- retry de la creación anterior devuelve efecto confirmado seguido de eliminación, no un Grupo
  vigente;
- si ya existe un Grupo nuevo, el retry anterior no lo modifica, elimina, reemplaza ni devuelve;
- reutilizar la clave de creación anterior para otro payload produce conflicto;
- una creación nueva requiere una clave no utilizada y vuelve a aplicar el límite vigente.

## 7. Idempotencia y recovery

| Escenario | Resultado normativo |
| --- | --- |
| Mismo actor/key/request de delete confirmado | Recupera el mismo `deletedAt`; cero escrituras |
| Misma key de delete con payload distinto | Conflicto de idempotencia; cero escrituras |
| Otra key sobre el ID ya eliminado | No accesible; no revela eliminación; cero escrituras |
| Retry de creación del Grupo eliminado | Efecto de alta confirmado + eliminación posterior; sin Grupo actual |
| Retry de esa creación cuando ya existe otro Grupo | Mismo resultado histórico; el Grupo nuevo no se lee ni devuelve como resultado de la intención vieja |
| Retry de rename confirmado antes de eliminar | Efecto de rename confirmado + eliminación posterior; sin nombre ni Grupo actual |
| Retry de operación nunca confirmada sobre el ID eliminado | No accesible; no se crea receipt retroactivo |
| Nueva creación posterior | Requiere intención/key nuevas y respeta el único cupo provisional |

La retención de evidencia técnica es indefinida mientras no exista una ventana máxima de retry
aprobada. Esa retención deriva de la garantía de D07-A; TTL, cleanup o una caducidad futura requieren
otra decisión funcional y no forman parte de E2-24.

## 8. Concurrencia

- Delete y operaciones que pueden crear referencias se serializan mediante la raíz Grupo.
- Delete y nueva creación del mismo Owner también serializan mediante el control de creación vigente.
- Si una referencia confirma primero, la relectura de delete la detecta y bloquea.
- Si delete confirma primero, la operación contrapuesta no encuentra Grupo activo y no crea la
  referencia.
- La liberación del cupo, el borrado de la raíz y la evidencia mínima forman una única postcondición
  atómica.
- No se agrega un lock, guard o coordinación si los puntos existentes bastan; cualquier mecanismo
  adicional deberá justificarse por una carrera concreta.

## 9. Frontend y resultado observable

La superficie Owner realiza preparación autoritativa antes de confirmar, explica que la operación es
física e irreversible y que no ejecuta cascadas, muestra blockers minimizados y exige confirmación
destructiva inequívoca. Debe soportar stale, single-flight, retry y pérdida de acceso.

Después del éxito se retiran detalle y acciones Owner-scoped y se navega a una superficie segura. El
Grupo no aparece en activos, archivados, historia de Grupo, dashboard, catálogo o ingreso. Si una
historia propia de otro concepto existiera, habría bloqueado la eliminación.

## 10. No efectos y continuidad documental

Este addendum no:

- cambia CU-014 ni vuelve eliminable un Grupo archivado;
- agrega historia funcional de nombres;
- autoriza borrado en cascada, cleanup o TTL;
- implementa transferencia o permisos delegados;
- cambia la política comercial definitiva;
- cierra otros pendientes de Etapa 2;
- cierra E2-14 o Etapa 2;
- habilita E3.

Los cierres E2-01, E2-20 y E2-23 permanecen históricos. Sus contratos deben adaptarse
prospectivamente para reconocer la eliminación posterior sin reescribir la evidencia de lo que
confirmaron.

## 11. Trazabilidad

| Fuente | Relación preservada |
| --- | --- |
| [Documento 1](./Documento-1-Arquitectura-del-Producto-y-Modelo-de-Dominio-6.5.pdf) y [Documento 1.5](./Documento-1.5-Modelo-Conceptual-del-Dominio-AUD-C03.pdf) | Grupo es comunidad independiente; identidad, pertenencia e historia conservan responsables propios |
| [Documento 2 AUD-C04](./Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf), PF-02, RF-16 y CU-014/CU-015 | Prohibición de borrar con actividad/historia y separación entre archivo y eliminación |
| [Documento 3 AUD-C05](./Documento-3-Arquitectura-Funcional-y-Dise-o-Tecnico-AUD-C05.pdf) y [Documento 4 AUD-C05](./Documento-4-Dise-o-de-la-Arquitectura-de-Software-AUD-C05.pdf) | Límites de Agregados; eliminación física sólo cuando el negocio la permite |
| [Addendum E2-23](./Documento-2-addendum-E2-23-archivo-grupo.md) | Archivado conserva identidad/historia y no es eliminable por inferencia |
| [E2-01](../implementacion/etapa-2/E2-01-cierre.md), [E2-20](../implementacion/etapa-2/E2-20-cierre.md) y [E2-23](../implementacion/etapa-2/E2-23-cierre.md) | Alta, rename y archivo conservan outcomes; adaptación sólo prospectiva |
| [DEC-E2-21/D5-041](../implementacion/etapa-2/DEC-E2-21-propuesta-ajuste-documento-5.md) | El diferimiento de CU-013 no alcanza CU-015 ni habilita E3 |

Las decisiones D01-A, D02-A, D03-A, D04-a/b/c, D05-A, D06-A, D07-A y D08-A fueron aprobadas
expresamente para esta consolidación y se materializan en las secciones 1–9.

## 12. Resultado

`ADDENDUM E2-24 APROBADO PARA VERSIONAR — ELIMINACIÓN FÍSICA SÓLO DE GRUPO ACTIVO SIN REFERENCIAS`
