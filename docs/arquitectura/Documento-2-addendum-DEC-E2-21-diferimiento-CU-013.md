# Addendum funcional a Documento 2 — DEC-E2-21 / diferimiento de CU-013

## Estado y autoridad

- **Contenido funcional:** `ADOPTADO POR EL USUARIO` mediante DEC-E2-21.
- **Estado del artefacto:** `APROBADO`.
- **Documento base:** [Documento 2 — Modelo Funcional y Casos de Uso](./Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf).
- **Decisión trazable:** [DEC-E2-21](../implementacion/etapa-2/DEC-E2-21-propuesta-decision-funcional.md).
- **Caso afectado:** CU-013 — Configurar el Grupo.

Este addendum registra el diferimiento sin editar ni reemplazar el PDF base. No elimina CU-013 ni
modifica el límite del Agregado Grupo. El criterio de salida se resolvió separadamente mediante
DEC-E2-21-PLAN/D5-041: CU-013 diferido no bloquea el cierre una vez satisfechos los demás gates y no
se cuenta como implementado.

## 1. Texto funcional incorporable

> **CU-013 — Configurar el Grupo: diferido por decisión funcional.**
>
> CU-013 permanece reconocido en el catálogo de casos de uso y no posee cobertura implementada. Se
> difiere porque no existe actualmente una necesidad funcional concreta que permita definir de forma
> responsable un atributo propio de Grupo, su actor, valores, validaciones, estados, privacidad y
> efecto observable. El diferimiento no equivale a implementación, cierre ni eliminación del caso.
>
> Mientras rija esta decisión no se incorporan campos configurables, comandos, consultas, interfaz,
> schema, migraciones ni defaults de configuración. Tampoco se reclasifican como configuración el
> nombre, descripción, deporte, Owner, estado, Temporada, atributos o permisos de Membresía,
> Solicitudes, catálogo público, Plan o capacidades de otros Agregados.
>
> CU-013 sólo podrá reabrirse cuando una decisión funcional aprobada identifique una necesidad
> verificable, demuestre que el dato o regla pertenece a Grupo y defina atributo/regla exactos, actor,
> valores y default si corresponde, validaciones, estados permitidos, privacidad, efecto observable y
> criterios de aceptación. Antes de asignarlo a Grupo deberá revisarse si pertenece a Temporada,
> Membresía, Solicitud, Club, catálogo público, Plan/Suscripción u otro Agregado.

## 2. Relación con la norma existente

| Referencia del Documento 2 | Tratamiento |
| --- | --- |
| Actores 3 y 4 | Se conserva que el Owner tiene capacidad general de configuración; no se deriva un comando sin objeto definido ni se delega a Administrador sin permiso fino aprobado. |
| RF-04 | Se conserva Membresía como propietaria de estado, rol, cargo, permisos, posición y dorsal de la relación Persona–Grupo. |
| RF-12 | Se conserva Grupo como recurso administrado por su Owner; el diferimiento no amplía campos editables. |
| Documento 2.3 / PF-02, CU-012–CU-015 | CU-013 continúa separado de edición, archivo y eliminación; CU-012, CU-014 y CU-015 no se absorben ni se alteran. |
| CU-034–CU-038 | Roles y permisos mantienen sus casos propios; no se convierten en configuración genérica. |

## 3. Frontera de Grupo preservada

La decisión no cambia las fronteras de Documentos 1, 1.5, 3 o 4:

- Grupo continúa siendo un Agregado autónomo y posible propietario de invariantes organizativas
  propias;
- Temporada, Membresía y Solicitud siguen siendo Agregados separados;
- Club, catálogo público y Plan/Suscripción no ingresan a Grupo;
- reconocer que una configuración futura podría pertenecer a Grupo no autoriza ningún atributo hoy.

## 4. Efectos y no efectos

### Efectos adoptados

- CU-013 queda visible como diferido y sin implementación.
- Toda reapertura exige la condición verificable de §1.
- Las necesidades futuras deben superar una revisión explícita de ownership.

### No efectos

- No cambia schema v1, persistencia, API, UI, autorización, Rules ni tests.
- No se declara CU-013 cubierto.
- No se cierra E2-14 o Etapa 2; sólo se retira CU-013 como bloqueo futuro una vez satisfechos los
  demás gates y repetida la evaluación final.
- No se habilita E3.
- No se aprueba por anticipado una acción o atributo futuro.

## 5. Trazabilidad de integración

Al integrar este addendum deberán enlazarse, sin reescribir evidencia histórica:

1. DEC-E2-21 como decisión adoptada;
2. la ficha E2-21 en estado diferido;
3. la reclasificación futura de E2-F03 en E2-14;
4. D5-041 como decisión separada de Documento 5 que permite satisfacer el gate de CU-013 mediante
   diferimiento explícito, deuda visible y condición de reapertura.

`ADDENDUM DEC-E2-21 APROBADO — CU-013 DIFERIDO, RECONOCIDO Y SIN COBERTURA IMPLEMENTADA`
