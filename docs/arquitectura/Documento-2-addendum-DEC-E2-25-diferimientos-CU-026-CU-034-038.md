# Documento 2 — Addendum DEC-E2-25: diferimientos de CU-026 y CU-034–CU-038

## Estado

- **Estado:** `APROBADO POR EL USUARIO`.
- **Fecha de registro:** 2026-10-06.
- **Base documental:** `dev` en `e3105f227cdd2d4e0dd34b3ea3ce40e69f93c012`.
- **Alcance:** CU-026 — Editar una Membresía; CU-034–CU-038 — Gestión de Roles.
- **Decisión de roadmap asociada:**
  [DEC-E2-25](../implementacion/etapa-2/DEC-E2-25-diferimientos-funcionales-y-gate-etapa-2.md).

Este addendum complementa prospectivamente el Documento 2. No reescribe sus casos de uso ni la
evidencia histórica de E2-14 o E2-22A. Registra qué partes permanecen reconocidas pero diferidas,
qué límites conserva la implementación actual y bajo qué condiciones deben reabrirse.

## 1. CU-026 — atributos restantes de Membresía

### 1.1 Cobertura vigente

El cargo descriptivo implementado y cerrado por E2-22A permanece como cobertura parcial aprobada
de CU-026. Es información privada de la relación Persona–Grupo, puede asignarse, reemplazarse o
quitarse en las superficies Owner aprobadas y no concede autorización, ownership, elegibilidad,
rol deportivo ni permisos.

### 1.2 Diferimiento aprobado

Se difieren `posición`, `dorsal` y `observaciones` hasta que exista una utilidad concreta de la
plataforma que justifique cada atributo. El diferimiento:

- no cancela CU-026;
- no declara CU-026 completamente implementado;
- no transforma el cargo en cobertura de los demás atributos;
- no aprueba una categoría abierta de «otros» o «demás atributos propios»;
- no autoriza contratos, campos, catálogos, valores, UI, Rules, migraciones ni persistencia;
- no permite inferir que toda observación sobre una Persona pertenezca a Membresía.

La mención normativa de atributos de Membresía conserva su función de ownership conceptual. No
obliga a materializar información sin finalidad aprobada ni permite adelantar datos de Partido,
Entrenamiento, Seguimiento Deportivo, Persona u otro concepto.

### 1.3 Condición de reapertura

Antes de implementar una utilidad que necesite `posición`, `dorsal` u `observaciones`, deberá
definirse y aprobarse, para el atributo concreto:

1. finalidad y utilidad observable;
2. ownership y frontera respecto de otros conceptos;
3. actor que lo crea, consulta, modifica o quita;
4. valores, opcionalidad, normalización y validaciones;
5. privacidad y superficies autorizadas;
6. relación con Temporada, estado y lifecycle de Membresía;
7. conservación, reemplazo o no herencia al finalizar, reactivar y renovar;
8. contratos, errores, criterios de aceptación y pruebas proporcionales.

La reapertura de un atributo no aprueba automáticamente los demás. Cualquier atributo adicional no
enumerado requiere la misma decisión expresa y no puede incorporarse bajo una categoría abierta.

## 2. CU-034–CU-038 — roles y permisos

### 2.1 Diferimiento aprobado

Se difiere la implementación de crear, editar, asignar y revocar roles y de configurar permisos
hasta que exista el primer módulo con capacidades reales que deban delegarse.

Mientras el diferimiento permanezca vigente:

- continúa la autorización contextual de los flujos ya implementados;
- el cargo descriptivo permanece sin efecto autorizante;
- cargo, rol deportivo y perfil de permisos son conceptos separados;
- no existen perfiles, identificadores, capacidades, asignaciones o revocaciones canónicas
  anticipadas;
- no se crean roles vacíos, flags especulativos ni equivalencias por nombre;
- no se promete convertir automáticamente cargos actuales en permisos futuros.

El diferimiento no elimina CU-034–CU-038 del inventario funcional ni los cuenta como implementados.

### 2.2 Condición de reapertura

Antes de implementar la primera capacidad delegable deberán definirse y aprobarse conjuntamente:

1. los casos de uso de CU-034–CU-038 que resulten aplicables;
2. los perfiles y sus identificadores estables, si efectivamente se requieren;
3. las capacidades reales que puede conceder cada perfil;
4. actor, flujo y precondiciones de asignación;
5. revocación y efecto sobre operaciones en curso;
6. alcance contextual por Grupo, recurso o módulo;
7. visibilidad y privacidad de perfiles y asignaciones;
8. revalidación backend en cada operación delegada;
9. concurrencia, idempotencia, historial mínimo y pruebas;
10. transición explícita desde el estado sin perfiles, sin inferir permisos desde cargos.

Cada módulo conserva sus propias reglas de dominio. Un perfil de permisos no puede convertir una
operación inválida en válida ni sustituir ownership, Membresía, Temporada o habilitación comercial.

## 3. Relación con reglas y casos vigentes

| Fuente | Efecto conservado |
| --- | --- |
| Documento 1 y Documento 1.5 | Los atributos, roles y permisos contextuales pertenecen a la relación Persona–Grupo; ownership conceptual no equivale a implementación inmediata |
| Documento 2 RF-04 y CU-026 | Cargo conserva cobertura parcial; posición, dorsal y observaciones siguen reconocidos pero diferidos |
| Documento 2 PF-02 y CU-034–CU-038 | Los casos siguen vigentes; su implementación espera una capacidad real delegable |
| Documento 2 RF-12 | Autorización funcional y habilitación comercial permanecen separadas |
| AUD-C05 | El ciclo de vida y los Períodos de Vigencia de Membresía no cambian por estos diferimientos |
| E2-22A | Cargo continúa descriptivo, privado y sin herencia automática en renovación |
| Corrección E2-14/CU-030 | No se introduce un setter genérico de estado ni nuevos estados |

## 4. No efectos

Este addendum no:

- implementa posición, dorsal, observaciones, roles o permisos;
- agota CU-026 ni cancela CU-034–CU-038;
- aprueba atributos adicionales de Membresía;
- modifica código, contratos, Rules, índices, schemas o comportamiento;
- retira compatibilidad residual;
- cierra E2-14 o Etapa 2;
- habilita E3;
- modifica o integra Auth/UAT.

## 5. Resultado

`DIFERIMIENTOS FUNCIONALES APROBADOS — CASOS RECONOCIDOS Y SIN COBERTURA COMPLETA`
