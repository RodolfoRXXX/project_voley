# DEC-E2-21 — Decisión funcional adoptada: diferir CU-013

## Estado

- **Decisión:** `ADOPTADA POR EL USUARIO`.
- **Opción elegida:** `C — DIFERIR CU-013`.
- **Fecha de registro:** 2026-09-29.
- **Base:** `dev == origin/dev` en `fc0a9a2f8d2076e915e43e0fcf392be6bc6205f0`.
- **Ficha afectada:** [E2-21-ficha-configuracion-grupo.md](./E2-21-ficha-configuracion-grupo.md).
- **Efecto aprobatorio limitado:** autoriza documentar el diferimiento; no aprueba el cierre de
  E2-14 o Etapa 2, la habilitación de E3, un atributo futuro ni una implementación.

La decisión expresa del usuario es:

> Elijo C: diferir CU-013. No agregaremos campos configurables a Grupo si todavía no existe una
> necesidad funcional concreta. En el futuro, nuevas acciones de la plataforma podrían justificar
> atributos, pero antes deberá comprobarse que sean información propia de Grupo.

## 1. Decisión

CU-013 permanece reconocido en el inventario funcional y queda **diferido, sin cobertura
implementada**. No se crea un sustituto vacío ni se considera cumplido por ausencia de trabajo.

Como consecuencia directa:

- no hay atributos configurables de Grupo aprobados;
- no hay valores, defaults, validaciones ni transiciones de configuración;
- no hay comando, consulta, payload, resultado o error público nuevo;
- no hay pantalla ni control de configuración;
- no hay cambio de schema, migración, backfill, DTO, Rules o persistencia;
- Grupo continúa usando su schema v1 exacto;
- ninguna capacidad de E4, E6 u otra etapa se adelanta dentro de CU-013.

## 2. Motivo y evidencia

### 2.1 Decisiones ya aprobadas

1. [Documento 1](../../arquitectura/Documento-1-Arquitectura-del-Producto-y-Modelo-de-Dominio-6.5.pdf),
   sección **Grupo**, reconoce “configuración” como información propia de Grupo, pero no enumera
   atributos concretos.
2. [Documento 1.5](../../arquitectura/Documento-1.5-Modelo-Conceptual-del-Dominio-AUD-C03.pdf),
   §§2.1, 2.2 y 2.5, establece la autonomía de Grupo frente a Club y el control del Owner sobre la
   configuración; no define valores ni comportamiento.
3. [Documento 2](../../arquitectura/Documento-2-Modelo-Funcional-y-Casos-de-Uso-AUD-C04.pdf),
   actores 3 y 4, RF-04, RF-12 y Documento 2.3/PF-02, distingue CU-013 de CU-012, CU-014 y CU-015 y
   asigna a Membresía sus roles, cargos, permisos, posición y dorsal. CU-013 sólo tiene título y
   actor general, sin flujo detallado.
4. [Documento 3](../../arquitectura/Documento-3-Arquitectura-Funcional-y-Dise-o-Tecnico-AUD-C05.pdf),
   §§6.3, 6.4, 8.5, 8.7 y 9.5–9.7, separa Grupo, Temporada, Membresía y los demás Agregados, además de
   distinguir autorización, habilitación comercial y validez de dominio.
5. [Documento 4](../../arquitectura/Documento-4-Dise-o-de-la-Arquitectura-de-Software-AUD-C05.pdf),
   §§2.4, 4.1–4.5 y 7.2, exige contratos explícitos y mantiene Grupo y Temporada como unidades de
   consistencia independientes.
6. [Documento 5](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md),
   §§5.14–5.17, 7.4 y D5-035, exige un corte acotado y que las reglas faltantes se señalen antes de
   programar.

### 2.2 Evidencia de ejecución

- [E2-01](./E2-01-cierre.md), §§5, 7–10 y 20, cerró un schema v1 mínimo sin configuración.
- [E2-14](./E2-14-informe-auditoria-consolidada-etapa-2.md), §§5, 6.2, 9, 12 y 13, registra CU-013
  dentro del hueco E2-F03 y exige contratos separados para CU-012–CU-015.
- [E2-20](./E2-20-ficha-edicion-minima-grupo.md), §§3–6 y 21–24, y su
  [cierre](./E2-20-cierre.md), §§3, 8 y 9, sólo cubren la edición de `nombre`; no incorporan
  configuración y mantienen `deporte`, Owner y estado fuera de ese comando.
- El schema actual de `functions/src/groups/domain/group.js` es exacto; el Repositorio, DTO y lectores
  no contienen configuración. Esto prueba el estado implementado, pero no completa la norma.

### 2.3 Necesidades observadas que no alcanzan el umbral

- [E2-02](./E2-02-ficha-temporada-apertura.md), §§17 y 21, registra una futura decisión de zona
  horaria, pero el contrato vigente usa fechas civiles y ningún recorrido actual está bloqueado.
- [E0-05](../etapa-0/E0-05-caracterizacion-activos-prioritarios.md), inventario de flujos, y
  [E0-07](../etapa-0/E0-07-verificacion-remota-solo-lectura.md), inventario de `groups`, observan una
  política legacy de ingreso. Esa observación no aprueba conservarla ni define su comportamiento.
- La existencia de CU-013 no demuestra la necesidad de una pantalla vacía de “configuración”.

Zona horaria, pausa de solicitudes, visibilidad, branding, notificaciones, reglas deportivas,
catálogos o preferencias son por tanto hipótesis, no atributos aprobados.

## 3. Condición verificable de reapertura

CU-013 sólo podrá reabrirse cuando una decisión funcional aprobada presente conjuntamente:

1. una necesidad concreta y verificable de usuario o un caso posterior realmente bloqueado;
2. el atributo o regla exactos y la prueba de que pertenecen a Grupo;
3. actor autorizado y fundamento de autorización;
4. valores, default —si corresponde—, obligatoriedad y validaciones;
5. estados de Grupo en que puede consultarse o modificarse;
6. privacidad, lectores autorizados y eventual publicación;
7. efecto observable, criterio de aceptación y consumidores afectados;
8. interacción con lifecycle, concurrencia y compatibilidad sólo si la mutación lo requiere.

La reapertura no implica aprobación automática: primero deberá actualizarse el nivel funcional de
Documento 2 o aprobarse otro addendum trazable; después se revisará si el trabajo cabe en un único
incremento.

## 4. Revisión obligatoria de ownership

Antes de asignar una capacidad futura a CU-013 debe descartarse que el dato pertenezca a:

| Posible propietario | Pregunta obligatoria |
| --- | --- |
| Temporada | ¿Cambia por ciclo competitivo o describe fechas/objetivos de una Temporada? |
| Membresía | ¿Describe la relación Persona–Grupo, rol, cargo, permiso, posición o dorsal? |
| Solicitud | ¿Gobierna el ingreso o el estado de una petición concreta? |
| Club | ¿Es política o identidad institucional compartida por varios Grupos? |
| Catálogo público | ¿Su finalidad primaria es descubrimiento o publicación? |
| Plan/Suscripción | ¿Representa habilitación, límite o derecho comercial? |
| Otro Agregado | ¿Tiene lifecycle, reglas o consistencia propios? |

Sólo si las respuestas anteriores no desplazan la responsabilidad y la invariante se confirma como
propia de Grupo podrá proponerse un atributo de CU-013.

## 5. Consecuencias para E2-14 y E2-22–E2-24

### 5.1 E2-14

E2-F03 debe reclasificarse, cuando se actualice E2-14, sin ocultar deuda:

| Caso | Clasificación posterior a DEC-E2-21 |
| --- | --- |
| CU-012 | cobertura mínima parcial cerrada por E2-20; no se presume edición adicional |
| CU-013 | diferido por decisión funcional; reconocido y sin implementación |
| CU-014 | pendiente de E2-23 |
| CU-015 | pendiente de E2-24 |

Esta decisión no cierra E2-14. DEC-E2-21-PLAN/D5-041 aprobó separadamente que CU-013 diferido no
bloquee el cierre una vez satisfechos los demás gates; E2-14 deberá reevaluar todos sus restantes
hallazgos antes de recomendar cualquier cierre.

### 5.2 E2-22 / CU-026

E2-22 puede **definirse** sin CU-013 porque los atributos de la relación Persona–Grupo pertenecen a
Membresía según Documento 2 RF-04 y Documento 3 §§6.3/8.7. No puede, sin embargo, consumir catálogos
o permisos supuestamente aprobados por E2-21: no existen.

Su definición deberá resolver en su propio caso los campos editables, actor y permiso fino, valores o
catálogos, privacidad, estados y transiciones de Membresía, dependencia de Temporada y efecto sobre
historia. La frase histórica de E2-20 §21 que anticipaba catálogos “aprobados por E2-21” queda
superada prospectivamente por esta decisión; no se reescribe la ficha integrada. Este documento no
inicia E2-22.

### 5.3 E2-23 y E2-24

- E2-23/CU-014 conserva la responsabilidad exclusiva de archivo o inactivación y debe coordinarse con
  E2-20, lectores y operaciones vigentes; no depende de que exista configuración.
- E2-24/CU-015 conserva eliminación, referencias, retención, tombstones e idempotencia; tampoco
  depende de CU-013.
- El orden efectivo debe respetar las dependencias reales de cada ficha y la reevaluación de E2-14,
  no una dependencia ficticia respecto de campos configurables inexistentes.

## 6. Decisión separada de roadmap adoptada

DEC-E2-21-PLAN eligió la alternativa 1, documentada en
[DEC-E2-21-propuesta-ajuste-documento-5.md](./DEC-E2-21-propuesta-ajuste-documento-5.md): CU-013
diferido no bloquea el futuro cierre de Etapa 2 una vez satisfechos los restantes criterios. El caso
permanece visible y sin implementación; esta excepción no se generaliza a otras deudas.

Hasta completar los demás gates y repetir la auditoría:

- E2-14 y Etapa 2 permanecen abiertas;
- E3 permanece deshabilitada;
- CU-013 no se cuenta como implementado;
- la definición independiente de E2-22 no constituye cierre ni habilitación de etapa.

## 7. Contrargumentos considerados

| Contrargumento | Respuesta adoptada |
| --- | --- |
| “Todo producto necesita configuración” | Una categoría genérica no prueba una necesidad ni define una invariante. |
| “El Owner debería poder editar cualquier campo” | Control del recurso no convierte identidad, deporte, estado u otros Agregados en configuración. |
| “El legado ya tenía preferencias” | El legado aporta evidencia, no autoridad normativa ni obligación de conservar semántica desconocida. |
| “Diferir equivale a completar CU-013” | No: el caso permanece visible, reconocido y sin cobertura implementada. |
| “La elección C o D5-041 habilitan E3” | No: faltan los demás gates, la repetición de E2-14 y un cierre expreso posterior. |

## 8. Resultado

`DEC-E2-21 ADOPTADA — CU-013 DIFERIDO, SIN ATRIBUTOS NI IMPLEMENTACIÓN; D5-041 APROBADA SIN CIERRE DE ETAPA`
