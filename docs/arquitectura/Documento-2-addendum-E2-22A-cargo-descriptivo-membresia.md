# Addendum funcional a Documento 2 — E2-22A / cargo descriptivo de Membresía

## Estado y autoridad

- **Contenido funcional:** `APROBADO POR EL USUARIO`.
- **Estado del artefacto:** `APROBADO PARA VERSIONAR`.
- **Fecha:** 2026-09-30.
- **Documento base:** [Documento 2 — Modelo Funcional y Casos de Uso](./Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf).
- **Caso concretado:** CU-026 — Editar una Membresía, limitado al cargo descriptivo.
- **Ficha implementable:** [E2-22A](../implementacion/etapa-2/E2-22-ficha-edicion-atributos-membresia.md).

Este addendum completa el detalle funcional ausente de CU-026 sin editar ni reemplazar el PDF base.
No modifica los límites de los Agregados, no incorpora permisos y no declara cubiertos dorsal,
posición, observaciones, rol deportivo ni el resto de CU-026.

## 1. Decisión funcional incorporada

> **CU-026 / E2-22A — Editar el cargo descriptivo de una Membresía.**
>
> El Owner vigente de un Grupo puede asignar, reemplazar o quitar un único cargo descriptivo a una
> Membresía activa de ese Grupo mientras la Temporada referenciada por la Membresía permanezca
> abierta.
>
> El cargo es opcional. Cuando posee valor es texto normalizado de 1 a 80 caracteres. Su ausencia
> significa que la Membresía no tiene un cargo descriptivo asignado. La remoción no finaliza ni
> reactiva la Membresía, no altera sus Períodos de Vigencia y no modifica Persona, Grupo o Temporada.
>
> El cargo es información privada de administración. Sólo el Owner vigente puede consultarlo en el
> detalle y roster administrativo y ejecutar su edición. No se publica ni se incorpora a consultas de
> integrantes, consultas propias generales o historial público/propio existentes.
>
> La finalización conserva el último cargo de la misma Membresía. La reactivación de esa misma
> Membresía también lo conserva. La renovación para otra Temporada crea una nueva Membresía sin
> cargo; no existe herencia, copia ni inferencia automática desde la predecesora.
>
> El texto del cargo no concede ownership, rol, permiso, elegibilidad ni capacidad alguna. Nunca
> puede utilizarse como credencial ni compararse para autorizar una operación.

## 2. Cargo descriptivo y perfiles de permisos

Cargo descriptivo y perfil de permisos son conceptos distintos:

- el **cargo descriptivo** es un texto visible que comunica la función organizativa de una persona en
  el contexto de una Membresía;
- un futuro **perfil de permisos** tendrá identidad estable propia, capacidades explícitas y reglas de
  asignación/revocación definidas por los casos de uso de roles y permisos que correspondan;
- dos Membresías con el mismo texto de cargo no adquieren por ello el mismo perfil ni las mismas
  capacidades;
- cambiar o quitar el cargo no asigna, modifica ni revoca permisos;
- asignar o revocar un perfil futuro no deberá depender de comparar el nombre visible del cargo.

Los identificadores de perfiles y sus asignaciones persistentes se incorporarán únicamente cuando
exista el primer módulo con capacidades reales que deban delegarse y los casos de uso propios hayan
definido catálogo, capacidades, actores, asignación, revocación, privacidad e invariantes.

Hasta entonces quedan expresamente prohibidos:

- `profileId`, `permissionProfileId` o identificadores equivalentes en Membresía;
- perfiles vacíos o catálogos anticipados;
- arrays, mapas o flags de permisos sin consumidor funcional aprobado;
- asociaciones cargo–perfil por igualdad, normalización o convención textual;
- activación automática de capacidades futuras a partir del cargo;
- reutilización de roles globales, `adminIds`, `admins` o constantes legacy como autoridad.

Esta decisión conserva la separación de Documento 1: el cargo describe y los permisos autorizan.
CU-034–CU-038 mantienen sus casos de uso propios.

## 3. Reglas y límites

1. La identidad de Membresía y sus referencias a Persona, Grupo y Temporada son inmutables.
2. CU-026 no edita `estado`, fechas, Períodos de Vigencia ni lineage.
3. Sólo una Membresía `activa` es destinataria de la edición.
4. La Temporada exacta referenciada debe estar `abierta` al confirmar.
5. Una Membresía finalizada no puede editarse, aun si su Temporada todavía estuviera abierta.
6. Una Temporada cerrada impide la edición aun ante un token o intento preparado previamente.
7. La finalización posterior preserva el último cargo; no crea un snapshot por edición.
8. La reactivación preserva el cargo porque conserva la identidad de la misma raíz.
9. La renovación crea otra raíz sin cargo, cualquiera sea el cargo de la predecesora.
10. No existe timeline, auditoría funcional ni historial de cambios de cargo aprobado.
11. El Owner no necesita una Membresía propia ni una Persona propia para administrar el cargo de un
    tercero; su autoridad deriva exclusivamente del ownership vigente del Grupo.
12. Administradores, integrantes, roles globales y conocimiento de IDs no autorizan esta operación.
13. La habilitación comercial no aplica mientras no exista una regla aprobada que la exija.

## 4. Significado de ausencia y normalización

- La ausencia funcional se solicita de forma explícita y significa “sin cargo descriptivo”.
- Una cadena vacía o compuesta sólo por espacios no equivale a remoción: es entrada inválida.
- Cuando existe valor, se normaliza de manera determinista antes de comparar y persistir.
- La representación física concreta de la ausencia y el algoritmo técnico de normalización se cierran
  en la ficha implementable, respetando el rango funcional de 1–80 caracteres.
- No existe catálogo de cargos, valor por defecto ni lista cerrada.

## 5. Visibilidad e historia

El cargo puede exponerse únicamente en contratos Owner-scoped de detalle y roster administrativo.
No se agrega automáticamente a:

- DTO propio de Membresía;
- “Grupos que integrás”;
- historial propio de grupos y Membresías;
- Solicitudes de ingreso o sus resultados;
- vistas o APIs públicas;
- Persona, perfil de Usuario, Partido, Entrenamiento, Torneo o Pago.

La raíz finalizada conserva el último valor como dato final preservado de esa relación. Esto no
demuestra qué cargo tuvo en cada instante ni autoriza a presentar snapshots históricos inexistentes.

## 6. Relación con decisiones vigentes

| Fuente | Efecto preservado |
| --- | --- |
| Documento 1, Membresía y Modelo de administración | Cargo pertenece a Membresía y es descriptivo; permisos son independientes |
| Documento 1.5 §§2.9–2.10 | Cargo es contextual a la relación Persona–Grupo, no al Usuario global |
| Documento 2 RF-04 | Editar cargo modifica Membresía y ningún otro Agregado |
| Documento 2 RF-17–RF-20 | Temporada cerrada bloquea modificaciones |
| Documento 2 CU-027/028/029/030 | Finalización, reactivación, renovación y estado conservan operaciones propias |
| Documento 2 CU-034–038 | Roles y permisos no se absorben en E2-22A |
| AUD-C05 | Los Períodos de Vigencia permanecen bajo la misma raíz y no cambian por editar cargo |
| DEC-E2-21/D5-041 | Cargo no es configuración de Grupo y no depende de CU-013 |
| Corrección E2-14/CU-030 | No se introduce un setter genérico de estado |

## 7. No efectos

Este addendum no:

- implementa código ni autoriza deploy;
- define perfiles de permisos, sus IDs o asignaciones;
- crea catálogo de cargos;
- habilita administradores delegados;
- aprueba rol deportivo, dorsal, posición u observaciones;
- agota CU-026;
- modifica el criterio de salida de Etapa 2;
- cierra E2-14 o Etapa 2;
- habilita E3;
- integra la rama Auth/UAT.

## 8. Resultado

`ADDENDUM E2-22A APROBADO PARA VERSIONAR — CARGO DESCRIPTIVO SIN EFECTO AUTORIZANTE`
