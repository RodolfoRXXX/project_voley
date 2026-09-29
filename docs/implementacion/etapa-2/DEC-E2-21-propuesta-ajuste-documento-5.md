# DEC-E2-21-PLAN — Decisión adoptada sobre el criterio de salida de Etapa 2

## Estado

- **Estado:** `ADOPTADA POR EL USUARIO`.
- **Decisión ya adoptada:** CU-013 se difiere sin atributos ni implementación.
- **Opción elegida:** alternativa 1; CU-013 diferido no bloquea el futuro cierre una vez satisfechos
  los demás gates.
- **Documento afectado:** [Documento 5](../../transicion/Documento%205%20-%20Plan%20de%20Implementación%20y%20Transición%20Técnica-borrador.md).
- **Modificación de Documento 5:** D5-041 y sus referencias acotadas deben integrarse separadamente.

La alternativa 1 fue aprobada expresamente. La alternativa 2 se conserva como antecedente descartado.
La decisión no cierra E2-14 o Etapa 2 ni habilita E3: deben completarse los demás gates, repetirse
E2-14 y aprobarse posteriormente el cierre consolidado.

## 1. Referencias afectadas

| Referencia | Texto o situación vigente | Por qué debe tratarse |
| --- | --- | --- |
| Documento 5 §7.4, líneas 2093–2102 de la base | Estado `HABILITADA PARA DEFINICIÓN`; la salida sólo expresa fronteras de Agregados | No dice cómo tratar un caso inventariado pero diferido por falta de necesidad |
| Documento 5 §7.4.2, fila E2-09, línea 2131 | “Editar, configurar, archivar o eliminar conforme a reglas aprobadas y ownership contextual” | La fila agrupa capacidades preliminares; DEC-E2-21 ahora difiere sólo “configurar” |
| Documento 5 §7.4.2, líneas 2135–2137 | El mapa determina secuencia/límites y exige subdividir E2-09 si excede un corte verificable | Debe aclararse que diferir no cuenta como implementar ni impide separar los demás cortes |
| Documento 5 §8, registro D5-001–D5-040 | No existe decisión sobre deuda funcional diferida como gate | Hace falta una decisión de roadmap auditable |
| E2-14 §5, líneas 124 y 130–133 | CU-012–015 pendientes; no hay decisión aprobada que retire o reasigne casos | Debe reflejar DEC-E2-21 sin falsear cobertura |
| E2-14 §9, E2-F03 | CU-012–015 forman un único hallazgo alto y bloqueante | Debe desagregarse CU-013 diferido de CU-014/CU-015 pendientes y CU-012 parcial |
| E2-14 §13, líneas 306–309 | Exige incrementos separados CU-012–CU-015 y repetir E2-14 | Debe reemplazarse la expectativa de implementar CU-013 por el tratamiento elegido en el gate |
| E2-20 §21, líneas 601–605 | Presupone que E2-21 aprobará catálogos que E2-22 podría consumir | Es evidencia histórica integrada; no se reescribe. DEC-E2-21 y su addendum registran prospectivamente que esos catálogos no existen |

No se afectan las fronteras de Documentos 1–4, CU-014/CU-015, los gates restantes de E2-14 ni la
regla de que E3 sólo puede habilitarse mediante cierre consolidado expreso.

## 2. Texto vigente común

### 2.1 Salida de Etapa 2 — Documento 5 §7.4

```text
- Salida: Grupo no contiene Membresías ni Solicitudes; Temporada es Agregado independiente
    en Módulo Grupos.
```

### 2.2 Administración de Grupo — Documento 5 §7.4.2

```text
| E2-09 — Administración del Grupo | Editar, configurar, archivar o eliminar conforme a reglas aprobadas y ownership contextual | Grupo |
```

### 2.3 Hallazgo consolidado — E2-14 §9

```text
| E2-F03 | CU-012–015 sin reemplazo canónico | Documento 2 y administración de Grupo de Documento 5 | Grupo no puede editarse, configurarse, archivarse o eliminarse | Alto | Etapa 2 | Entregar contratos canónicos separados y retirar tombstones cuando corresponda | Sí |
```

## 3. Alternativa 1 aprobada — Permitir cierre con CU-013 diferido y deuda visible

### Regla

CU-013 deja de ser condición de implementación para el cierre de Etapa 2 mientras permanezca vigente
DEC-E2-21. El gate se satisface mediante la decisión explícita de diferimiento y la deuda visible, no
mediante una ficción de cobertura. Todos los demás gates deben completarse y E2-14 debe repetirse.

### Texto aprobado para Documento 5 §7.4

Agregar al criterio de salida vigente:

```text
- Excepción aprobada de salida: CU-013 puede permanecer diferido, visible y sin implementación bajo
    DEC-E2-21/D5-041, exclusivamente después de satisfacer los demás gates de Etapa 2 y repetir
    E2-14. Esta excepción no cubre otros casos pendientes ni habilita E3 por sí sola.
```

### Texto aprobado para Documento 5 §7.4.2

Reemplazar sólo la fila preliminar E2-09 por:

```text
| E2-09 — Administración del Grupo | Separar edición, configuración, archivo y eliminación en cortes verificables; CU-013 queda diferido por DEC-E2-21/D5-041 sin contarse como implementado | Grupo |
```

Agregar después del párrafo de subdivisión:

```text
DEC-E2-21 difiere CU-013 por ausencia de una necesidad funcional concreta. El caso permanece
reconocido y sin cobertura implementada; sólo puede reabrirse cuando se aprueben necesidad,
ownership de Grupo, actor, valores, validaciones, estados, privacidad y efecto observable. D5-041
retira exclusivamente este caso como bloqueo futuro una vez cumplidos los restantes criterios; no
afecta CU-014/CU-015, no cierra E2-14 o Etapa 2 y no habilita E3. E2-22/CU-026 puede avanzar sólo a
definición independiente y no puede presuponer catálogos o permisos provenientes de CU-013.
```

### Entrada aprobada en el registro de decisiones

```text
| D5-041 | CU-013 puede satisfacer su gate mediante diferimiento funcional explícito, deuda visible y condición verificable de reapertura; no cuenta como implementado | APROBADA | Etapa 2 / CU-013 | Sólo después de completar los demás gates y repetir E2-14 puede evaluarse el cierre; E3 no se habilita automáticamente |
```

### Ajuste derivado aprobado para E2-14

Sustituir E2-F03 por cuatro clasificaciones trazables:

```text
CU-012 — cobertura mínima parcial por E2-20; no se presume edición adicional.
CU-013 — diferido por DEC-E2-21; reconocido, sin implementación y no bloqueante bajo D5-041.
CU-014 — pendiente de E2-23 y bloqueante mientras no se cierre o reasigne.
CU-015 — pendiente de E2-24 y bloqueante mientras no se cierre o reasigne.
```

La futura reevaluación de E2-14 debe mantener los demás hallazgos y verificar la condición de
reapertura; no puede marcar CU-013 como “cubierto completamente”.

### Costo y riesgo

- **Costo:** documental bajo; actualización coordinada de Documento 5, E2-14 y trazabilidad posterior
  a E2-20, sin reescribir ese documento histórico.
- **Riesgo:** medio de gobernanza si la deuda desaparece de los gates futuros.
- **Control:** entrada D5-041, addendum de Documento 2, trigger verificable y auditoría E2-14 repetida.

## 4. Alternativa 2 descartada — Mantener CU-013 como condición de salida

### Regla

DEC-E2-21 difiere la implementación actual, pero CU-013 continúa bloqueando el cierre de Etapa 2. La
etapa permanece abierta hasta que una necesidad permita reabrir, definir e implementar CU-013, o
hasta que otra decisión de roadmap reemplace expresamente este criterio.

### Texto propuesto para Documento 5 §7.4

Reemplazar el texto de salida por:

```text
- Salida: Grupo no contiene Membresías ni Solicitudes; Temporada es Agregado independiente
    en Módulo Grupos; CU-012, CU-013, CU-014 y CU-015 cuentan con contratos canónicos implementados
    y verificados. Un diferimiento funcional preserva el caso, pero no satisface este gate.
```

### Texto propuesto para Documento 5 §7.4.2

Conservar la fila E2-09 y agregar después del párrafo de subdivisión:

```text
DEC-E2-21 difiere temporalmente CU-013 sin eliminarlo del criterio de salida. Etapa 2 permanece
abierta hasta que el caso cumpla su condición de reapertura, se defina e implemente, o una decisión
posterior de roadmap cambie expresamente el gate. E3 permanece deshabilitada.
```

### Nueva entrada propuesta en el registro de decisiones

```text
| D5-041 | CU-013 diferido continúa como condición de salida de Etapa 2 y debe reabrirse, definirse e implementarse antes del cierre | DESCARTADA POR ELECCIÓN DE LA ALTERNATIVA 1 | Etapa 2 / CU-013 | Esta consecuencia no fue adoptada |
```

### Ajuste derivado propuesto para E2-14

Desagregar E2-F03 igual que en la alternativa 1, pero clasificar CU-013 como `diferido y bloqueante`.
La secuencia debe registrar una espera sin fecha hasta que aparezca la necesidad verificable; no debe
inventarse un campo sólo para liberar el gate.

### Costo y riesgo

- **Costo:** inicialmente documental bajo, pero duración indeterminada de Etapa 2.
- **Riesgo:** alto de bloqueo administrativo: la condición de reapertura depende deliberadamente de
  una necesidad que hoy no existe.
- **Control:** no relajar el gate y aceptar explícitamente que E3 seguirá deshabilitada.

## 5. Comparación y fundamento

| Criterio | Alternativa 1 | Alternativa 2 |
| --- | --- | --- |
| Honestidad sobre cobertura | Diferido, nunca implementado | Diferido, nunca implementado |
| Respuesta a ausencia de necesidad | No fuerza producto especulativo | Mantiene la etapa abierta sin trabajo responsable disponible |
| Deuda visible | Addendum + DEC + D5-041 + E2-14 | DEC + E2-14 bloqueante |
| Efecto inmediato | Ningún cierre automático | Ningún cierre automático |
| Riesgo principal | Olvido futuro del trigger | Bloqueo indefinido o presión para inventar un atributo |

Se adopta **Alternativa 1**. Es el menor cambio coherente con la decisión funcional: permite que
el cierre futuro mida necesidades y fronteras reales, conserva CU-013 y hace auditable la deuda. La
alternativa 2 es consistente, pero transforma la ausencia deliberada de una necesidad en un bloqueo
sin acción implementable y puede incentivar una configuración artificial.

Con la alternativa 1, Etapa 2 sólo podrá cerrarse tras completar los demás hallazgos
bloqueantes, integrar los cambios normativos, repetir E2-14 y aprobar el cierre consolidado. E3 no
quedaría habilitada por DEC-E2-21 ni por D5-041 aisladamente.

## 6. Registro de la decisión

El usuario aprobó expresamente:

```text
DEC-E2-21-PLAN: ELIJO 1 — CU-013 DIFERIDO NO BLOQUEA EL CIERRE DE ETAPA 2 UNA VEZ CUMPLIDOS LOS DEMÁS GATES
```

No queda pendiente la elección del criterio para CU-013. Permanecen pendientes los detalles de una
eventual reapertura, todos los demás gates, la repetición final de E2-14 y una decisión posterior de
cierre y habilitación de E3.
