# Documento 5 - Plan de Implementación y Transición Técnica

**SPORTEXA**

*Borrador consolidado - ejecución actualizada al cierre de Etapa 1 - 25 de agosto de 2026*

> Fuente Markdown operativa recuperada del PDF consolidado. Incorpora la ejecución posterior de las Etapas 0 y 1. El PDF de FASE 2 permanece como antecedente histórico hasta una publicación documental posterior.

El presente archivo Markdown es la fuente editable, versionada y canónica del Documento 5. Toda
modificación futura deberá realizarse sobre esta fuente y cualquier PDF posterior deberá generarse a
partir de ella.


# Estado del documento

Este borrador conserva el contenido aprobado hasta la FASE 2 del Documento 5 y actualiza su estado
operativo con la evidencia consolidada hasta el cierre de la Etapa 1.
Incluye:
- Capítulo 1 - Propósito y alcance;
- Capítulo 2 - Estado inicial y activos reutilizables;
- Capítulo 3 - Estado objetivo normativo y fuentes de verdad;
- Capítulo 4 - Principios de transición;
- Capítulo 5 - Gobierno, trazabilidad y criterios comunes;
- Ficha de Incremento Implementable;
- Capítulo 6 - Etapa 0;
- roadmap revisado y mapa consolidado de etapas;
- línea transversal de encapsulación;
- registro de decisiones aprobadas;
- decisiones abiertas no bloqueantes;
- cierre consolidado de la Etapa 0;
- detalle operativo y cierre consolidado de la Etapa 1;
- mapa implementable preliminar de la Etapa 2;
- roadmap general de las Etapas 3 a 9.

Estado operativo del plan:

- `ETAPA 0 CERRADA`;
- `ETAPA 1 CERRADA`;
- `ETAPA 2 HABILITADA PARA DEFINICIÓN`;
- Etapas 3 a 9 conservadas a nivel de roadmap.

El detalle de cada incremento permanece en su Ficha de Incremento Implementable, informe y cierre.
Documento 5 registra resultados y decisiones de nivel etapa sin convertirse en un historial duplicado
de commits o implementaciones.
Los Documentos 1, 1.5, 2, 3 y 4 permanecen congelados y constituyen la fuente normativa superior.
El informe de auditoría técnica constituye evidencia sobre el repositorio actual, pero no modifica la
arquitectura aprobada.


# 1. Propósito y alcance

## 1.1 Objetivo

El Documento 5 - Plan de Implementación y Transición Técnica de SPORTEXA establece la estrategia
mediante la cual el sistema actualmente implementado evolucionará hacia la arquitectura normativa
aprobada.
Su propósito consiste en transformar:
- la arquitectura de producto y dominio;
- el modelo conceptual;
- los procesos funcionales y casos de uso;
- la arquitectura funcional y técnica;
- el diseño de la arquitectura de software;
- el estado real del repositorio;
- sus activos reutilizables;
- sus contradicciones y brechas;
en una secuencia de implementación progresiva, verificable y recuperable.
El Documento 5 determina:
- qué componentes actuales pueden conservarse;
- cuáles requieren adaptación, encapsulación, reemplazo o retiro;
- en qué orden podrán realizarse los cambios;
- qué dependencias deben satisfacerse;
- qué actividades pueden avanzar en paralelo;
- qué condiciones deben cumplirse antes de iniciar cada incremento;
- qué evidencias permiten considerarlo finalizado;
- cuándo puede retirarse una estructura anterior;
- cómo impedir la coexistencia de fuentes de verdad incompatibles;
- qué capacidades nuevas podrán incorporarse una vez satisfechas sus dependencias.
El Documento 5 constituye un plan de transición técnica. No redefine el dominio ni sustituye los
documentos arquitectónicos aprobados.


## 1.2 Relación con los Documentos 1-4

Los Documentos 1, 1.5, 2, 3 y 4 constituyen la fuente normativa congelada de SPORTEXA.
Su jerarquía dentro de este plan es la siguiente:
  1. arquitectura del producto y decisiones de dominio;
  2. modelo conceptual;
  3. comportamiento funcional y casos de uso;
  4. arquitectura funcional y responsabilidades técnicas;
  5. diseño de software, contratos, persistencia, seguridad y pruebas;
  6. decisiones de transición contenidas en el presente documento;
  7. decisiones físicas de implementación.
El Documento 5 deberá aplicar las decisiones aprobadas en los Documentos 1-4 y no podrá:
- redefinir Entidades;
- crear nuevos Agregados;
- modificar Aggregate Roots;
- alterar ownership;
- cambiar límites de Bounded Contexts;
- reinterpretar procesos funcionales;
- utilizar una necesidad técnica para modificar una decisión del dominio.
Cuando una necesidad de implementación no pueda resolverse sin alterar la arquitectura
congelada, deberá registrarse como una propuesta arquitectónica separada. No podrá incorporarse
silenciosamente como parte de la transición.


## 1.3 Relación con la auditoría técnica

El informe de auditoría técnica describe el estado del repositorio correspondiente a la línea base
auditada.
Su función dentro del Documento 5 consiste en aportar evidencia sobre:
- tecnologías utilizadas;
- estructura del frontend y backend;
- persistencia existente;
- contratos implícitos;
- flujos actualmente implementados;
- activos reutilizables;
- contradicciones con la arquitectura objetivo;
- riesgos de seguridad;
- estado de pruebas y calidad;
- componentes que deberán adaptarse o retirarse.
La auditoría no modifica la arquitectura normativa.
La ausencia de una capacidad en el repositorio no constituye por sí misma una contradicción. Las
capacidades no implementadas deberán tratarse como alcance futuro y priorizarse según valor de
producto y dependencias arquitectónicas.
La auditoría tampoco demuestra por sí sola la configuración efectivamente desplegada ni el
contenido actual de los proyectos Firebase. Esas condiciones deberán verificarse durante la Etapa 0.


## 1.4 Estado operativo adoptado

SPORTEXA no posee actualmente usuarios activos ni información relevante que deba conservarse.
En consecuencia:
- no será necesario mantener la plataforma disponible durante la transición;
- podrá utilizarse una ventana completa de mantenimiento;
- no se requiere migración en vivo;
- no se requiere compatibilidad multiversión para usuarios activos;
- no se requiere doble escritura entre el modelo anterior y el nuevo;
- Firestore podrá reinicializarse después de verificar el ambiente y obtener autorización explícita;


- las cuentas de Firebase Authentication podrán descartarse si una verificación separada confirma
    que tampoco deben conservarse.
Esta simplificación se aplica a la migración física de los datos actuales.
No elimina la obligación de corregir:
- ownership incorrecto;
- fuentes de verdad duplicadas;
- dependencias directas;
- autorización global;
- límites de Agregados;
- unidades transaccionales compartidas;
- reglas distribuidas entre UI, aplicación e infraestructura.


## 1.5 Alcance

El Documento 5 comprende:
- estabilización inicial;
- contención de riesgos de seguridad;
- verificación del proyecto y ambiente;
- preparación de una reinicialización controlada;
- separación de Usuario y Persona;
- sustitución del rol global por autorización contextual;
- implementación de Grupo, Membresía, Solicitud y Temporada conforme a sus límites;
- implementación de Pago como fuente de verdad independiente;
- separación de Partido y Torneo en CU-075;
- alineación de Estadísticas, Rendimiento y Actividad;
- recuperabilidad de procesos funcionalmente obligatorios;
- encapsulación progresiva de accesos a persistencia;
- retiro de estructuras anteriores por flujo;
- incorporación priorizada de Comercial;
- incorporación posterior de Entrenamiento y Seguimiento Deportivo;
- incorporación posterior de Club;
- estrategia de pruebas, observabilidad, checkpoints y cierre.


## 1.6 Exclusiones

El Documento 5 no deberá:
- rediseñar el dominio;
- repetir íntegramente los Documentos 1-4;
- definir cada clase o función futura;
- fijar prematuramente nombres de colecciones;
- definir DTO concretos antes de necesitar sus contratos;
- seleccionar nuevas tecnologías sin una necesidad comprobada;
- imponer microservicios;
- imponer mensajería distribuida;
- exigir despliegue sin interrupciones;
- diseñar coexistencia productiva prolongada;
- conservar datos sin valor por precaución abstracta;
- convertir el roadmap en un backlog exhaustivo;
- determinar precios o contenido comercial definitivo;
- exigir cobertura total o lint en cero para iniciar la transición;
- ejecutar modificaciones técnicas o acciones destructivas.


## 1.7 Transición estructural y capacidades nuevas

El plan distingue dos clases de trabajo.

### Transición estructural


Corrige contradicciones ya presentes en la implementación:


- Usuario mezclado con Persona, roles y Rendimiento;
- Membresía y Solicitud embebidas en Grupo;
- Pago embebido o duplicado;
- resultado de Partido y estado de Torneo compartiendo transacción;
- acceso directo a Firestore;
- reglas funcionales distribuidas;
- información derivada alojada o utilizada incorrectamente;
- procesos sin recuperación suficiente.

### Capacidades nuevas


Incorpora funcionalidad aprobada pero todavía ausente, según esta prioridad de producto:
  1. Dominio Comercial;
  2. Entrenamiento y Seguimiento Deportivo;
  3. Club.
Una capacidad nueva no podrá utilizarse para postergar una contradicción estructural de la que
dependa. Tampoco será necesario cerrar toda la transición deportiva antes de comenzar Comercial
cuando sus dependencias mínimas ya se encuentren satisfechas.


## 1.8 Criterio de éxito

La transición se considerará exitosa cuando, para el alcance implementado:
- cada estado original posea una única fuente de verdad;
- los Agregados conserven sus límites y Aggregate Roots;
- ningún módulo modifique directamente información perteneciente a otro;
- la UI no escriba directamente la persistencia de los flujos migrados;
- autorización funcional, habilitación comercial y validez de dominio permanezcan separadas;
- las proyecciones derivadas no sustituyan fuentes originales;
- los procesos obligatorios dispongan de recuperación acorde con su riesgo;
- las estructuras anteriores no conserven lectores o escritores necesarios;
- la deuda restante se encuentre identificada y aceptada;
- existan pruebas y evidencias suficientes para detectar regresiones;
- el sistema pueda habilitarse nuevamente sobre una base coherente con la arquitectura
    aprobada.


# 2. Estado inicial y activos reutilizables

## 2.1 Propósito

Este capítulo establece el estado técnico desde el cual comienza la transición de SPORTEXA.
Su función consiste en:
- identificar las capacidades actualmente implementadas;
- distinguir activos reutilizables de estructuras contradictorias;
- registrar las fuentes de verdad existentes;
- delimitar los riesgos que deben corregirse;
- establecer qué elementos pueden conservarse, adaptarse, reemplazarse o retirarse;
- impedir que la implementación futura parta de supuestos no verificados.
La descripción del estado inicial se basa en el informe de auditoría técnica del repositorio. Dicha
auditoría constituye evidencia técnica, pero no modifica las decisiones normativas de los Documentos
1-4.


## 2.2 Línea base auditada

La auditoría técnica examinó la rama dev en el commit:
b005564cca6ebc4743f52e5723bad879201fc08b


La línea base contenía:
- frontend Next.js y React;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Functions;
- reglas e índices Firestore;
- emuladores de Authentication, Firestore, Functions y Emulator UI;
- flujos de Grupos;
- partidos sociales;
- Torneos;
- inscripciones;
- fixture;
- fases;
- standings;
- ranking;
- generación de equipos;
- alertas;
- correo;
- notificaciones push;
- callables utilizados como contratos implícitos.
La auditoría no verificó:
- contenido real de los proyectos Firebase;
- correspondencia entre reglas versionadas y reglas desplegadas;
- contenido de archivos de entorno;
- comportamiento completo contra emuladores;
- información administrada fuera del repositorio.
Posteriormente se confirmó como decisión de producto que:
- no existen usuarios activos;
- no existe información relevante que deba conservarse;
- no existen fuentes externas autoritativas;
- Firestore puede reinicializarse;
- las cuentas de Firebase Authentication pueden descartarse si una verificación separada
    confirma que tampoco deben conservarse.
Estas decisiones simplifican la transición física de datos, pero no alteran la evaluación arquitectónica
del código.


## 2.3 Organización técnica actual

### Frontend


El frontend utiliza Next.js, React, TypeScript, Tailwind CSS y Firebase Web SDK.
Sus responsabilidades actuales incluyen:
- presentación;
- navegación;
- autenticación;
- composición de vistas;
- consultas a Firestore;
- invocación de Functions;
- algunas mutaciones directas;
- parte de la autorización visual;
- cálculos y decisiones operativas localizadas en servicios o componentes.
Esta organización contiene activos reutilizables, pero no materializa todavía de manera consistente
la separación entre Presentación, Aplicación, Dominio e Infraestructura.

### Backend


El backend utiliza Firebase Functions y Firebase Admin SDK.


Contiene:
- callables;
- controladores HTTP;
- triggers;
- procesos programados;
- servicios operativos;
- acceso a Firestore;
- notificaciones;
- correo;
- push;
- procesamiento de Torneos;
- ranking;
- generación de equipos;
- cierres y alertas.
Los servicios backend concentran lógica útil, pero combinan en distintos grados coordinación de
casos de uso, reglas funcionales, acceso a persistencia, transformación de datos y efectos de
infraestructura.
La transición deberá separar estas responsabilidades por incremento, sin reestructurar todo el
backend como condición previa.


## 2.4 Capacidades actualmente implementadas


| Área | Estado inicial | Evaluación |
|---|---|---|
| Autenticación | Login con Firebase Authentication | Reutilizable |
| Alta de Usuario | Trigger crea documento users | Adaptable |
| Onboarding | Registra rol global y datos deportivos | Contradictorio |
| Grupos | Creación, edición, integrantes, administradores y solicitudes | Parcialmente reutilizable |
| Partidos sociales | Convocatoria, ranking, pagos, equipos, reemplazos y cierre | Parcialmente reutilizable |
| Torneos | Formatos, fases, inscripciones, fixture, standings, avance y podio | Activo reutilizable de alto valor |
| Resultado de torneo | Administrado dentro de Torneos junto con consecuencias competitivas | Contradictorio |
| Pago deportivo | Campos embebidos en participaciones, inscripciones y equipos | Contradictorio |
| Estadísticas | groupStats, standings y contadores | Reutilizables como proyecciones |
| Rendimiento | Ranking y compromiso mezclados con Usuario y participación | Parcial/contradictorio |
| Historial | Composición de fuentes operativas desde el frontend | Reutilizable como comportamiento |
| Actividad | Vistas y alertas, sin modelo histórico explícito | Parcial |
| Notificaciones | Correo y Web Push | Reutilizable |
| Eventos | EventEmitter en memoria | Reutilizable sólo para efectos tolerantes a pérdida |
| Temporada | No implementada | Capacidad pendiente en Organización |
| Persona | No implementada independientemente | Brecha estructural |
| Membresía | Representada mediante arrays de Grupo | Contradictorio |
| Solicitud | Embebida en Grupo | Contradictorio |
| Entrenamiento | No implementado | Capacidad futura |
| Observación Técnica | No implementada | Capacidad futura |
| Comercial | Plan y Suscripción no implementados | Capacidad futura |
| Club | No implementado | Capacidad futura |


## 2.5 Fuentes de verdad actuales

La siguiente tabla describe la autoridad técnica existente antes de la transición. No implica
aprobación normativa.

| Información | Fuente actual | Problema |
|---|---|---|
| Identidad digital | Firebase Auth y users | Se mezcla con Persona, rol y Rendimiento |
| Datos deportivos personales | users | Ownership incorrecto |
| Rol general | users.roles | Autoridad global incompatible |
| Grupo | groups | Incluye relaciones ajenas |
| Pertenencia y administración grupal | arrays en groups | Membresía no existe como Agregado |
| Solicitud de ingreso | arrays en groups | Solicitud no posee fuente independiente |
| Partido social | matches | Reutilizable, pero incompleto frente al modelo objetivo |
| Participación | participations | Mezcla participación, ranking y Pago |
| Pago de partido | campos de participations | Pago embebido |
| Torneo | tournaments y estructuras auxiliares | Núcleo reutilizable |
| Resultado de Partido de Torneo | tournamentMatches bajo Torneos | Partido no conserva una fuente original independiente |
| Estado competitivo | Torneo, fases y standings | Válido si permanece separado del resultado original |
| Pago de torneo | inscripciones y equipos | Duplicado y sin identidad propia |
| Estadísticas | groupStats, standings y contadores | Válidas como derivación, no como autoridad |
| Alertas | pendingAlerts | Proyección reutilizable |
| Suscripción comercial | No existe | Capacidad pendiente |


Una misma estructura física puede contener información perteneciente a responsabilidades distintas.
Esto constituye una condición del legado y no una autorización para conservar esas fronteras.


## 2.6 Contradicciones estructurales confirmadas

La transición deberá corregir las siguientes contradicciones:
 1. Usuario mezcla identidad digital, Persona, autorización global y Rendimiento.
 2. La autopromoción permite que un usuario autenticado se conceda administración.
 3. Las reglas permiten lectura pública excesiva.
 4. Membresía y Solicitud están embebidas en Grupo.
 5. Pago está embebido o duplicado en otras estructuras.
 6. Torneo modifica el resultado original de Partido y su propio estado competitivo dentro de una
    misma transacción.
 7. La UI y servicios acceden directamente a Firestore en flujos que requieren coordinación de
    aplicación.
 8. Existen reglas operativas duplicadas entre frontend y backend.
 9. No existe una suite automatizada suficiente.
10. El lint no proporciona actualmente una línea base limpia.
11. Algunos procesos programados no poseen recuperación suficiente.
12. La información derivada puede confundirse con estado original por su ubicación o utilización.
La ausencia de Temporada, Comercial, Entrenamiento, Seguimiento Deportivo o Club no constituye
una contradicción del legado. Representa funcionalidad aún no implementada.


## 2.7 Riesgos críticos de seguridad

Los siguientes riesgos bloquean el inicio de la Etapa 1:
- autopromoción a administrador;
- lectura pública excesiva de información personal, económica u operativa.
Para cerrar la Etapa 0, las correcciones deberán estar:
- implementadas;
- versionadas;
- revisadas;
- verificadas mediante emuladores o pruebas equivalentes;
- acompañadas por evidencia reproducible.
No será suficiente diseñar el parche, redactar reglas futuras, registrar una decisión o dejar la
corrección como tarea posterior.
El despliegue sobre un proyecto remoto podrá coordinarse con la futura habilitación de la plataforma,
pero el código y las pruebas deberán estar finalizados antes de iniciar la Etapa 1.


## 2.8 Estado de calidad y pruebas

La línea base auditada presenta:
- ausencia de archivos de prueba;
- script de pruebas backend sin implementación real;
- typecheck exitoso con limitaciones;
- sintaxis backend válida;
- lint con errores y advertencias;
- ausencia de CI versionado;
- emuladores configurados pero no utilizados como suite automatizada.
La Etapa 0 deberá convertir los emuladores en una red de seguridad mínima.
No se exige cobertura total, lint en cero, CI completo ni reescritura del código para volverlo testeable.
Sí se exige:
- pruebas de los riesgos críticos;
- caracterización de los primeros flujos que serán modificados;
- baseline que permita detectar errores nuevos;
- ejecución reproducible.


## 2.9 Activos reutilizables


Activo                 Valor                                                  Condición de reutilización

Next.js y React         Navegación, layouts, páginas y componentes existentes Adaptar el flujo afectado a contratos de aplicación
Firebase Authentication Autenticación técnica                                 Separar Usuario de Persona y retirar autoridad global
Firestore               Persistencia compatible con la arquitectura           Diseñar cada estructura física según el incremento
Firebase Functions      Backend operativo y desplegable                       Separar coordinación, dominio e infraestructura progresivamente
Emuladores              Entorno seguro local                                  Incorporarlos a pruebas reproducibles
Callables               Contratos públicos implícitos                         Formalizar entrada, salida, errores y autorización
Flujos de Grupo         Comportamiento conocido                               Sustituir arrays por Membresía y Solicitud
Partido social          Convocatoria, cierre, equipos y participación         Separar Pago, Rendimiento y Temporada
Núcleo de Torneos       Fases, fixture, standings y avance                    Separar Partido, Pago y autorización
Generador de equipos Algoritmo funcional existente                            Mantener Equipo como concepto subordinado
Ranking y reemplazos Comportamiento deportivo utilizado                       Tratar resultados como derivados
Standings               Proyección competitiva útil                           Mantener reconstruibilidad desde resultados
Alertas                 Proyección para dashboard                             No convertirlas en fuente operativa
Correo y push           Integraciones técnicas existentes                     Agregar recuperabilidad sólo cuando sea necesaria
Historial compuesto     Comportamiento de consulta                            Mantener fuentes originales en módulos propietarios
Reglas e índices        Punto de partida técnico                              Sustituir política pública y rol global


La reutilización deberá evaluarse por componente y caso de uso. No se conservará código
únicamente porque ya exista.


## 2.10 Componentes a intervenir


Clasificación Componentes

Conservar    Stack Next.js/Firebase, navegación, emuladores y activos de presentación útiles
Encapsular   Accesos directos a Firestore, callables implícitos y servicios con dependencias físicas
Adaptar      Autenticación, Grupos, partidos, Torneos, ranking, equipos, alertas y notificaciones
Reemplazar   Autopromoción, autorización global, reglas públicas y transacción compartida de CU-075
Retirar      Arrays sustituidos, campos de Pago embebidos, autoridad deportiva en users, documentación obsoleta y residuos sin consumidor
Incorporar   Persona, Membresía, Solicitud, Temporada, Pago, Suscripción y capacidades futuras priorizadas


## 2.11 Estado de los datos

La transición adopta como hecho aprobado que los datos actuales carecen de valor que justifique
una migración.
Por lo tanto:
- no se diseñará un backfill general;
- no se reconciliarán pagos históricos;
- no se reconstruirán Membresías históricas;
- no se inventarán Temporadas;
- no se conservará compatibilidad productiva;
- no se utilizará doble escritura.
Antes de descartar cualquier dato deberán ejecutarse las salvaguardas de la Etapa 0.
La decisión sobre Firestore no incluye automáticamente Firebase Authentication.


## 2.12 Readiness inicial

El sistema se encuentra:
- listo para ejecutar una Etapa 0 controlada;
- no listo para iniciar la Etapa 1;
- no listo para habilitarse públicamente;
- no listo para operar con las reglas de seguridad actuales;
- técnicamente apto para evolución incremental;
- suficientemente documentado para preparar incrementos implementables.
La Etapa 1 sólo podrá comenzar cuando la salida consolidada de la Etapa 0 se encuentre verificada,
incluyendo la implementación y prueba efectiva de las correcciones de seguridad.


# 3. Estado objetivo normativo y fuentes de verdad

## 3.1 Propósito

Este capítulo identifica las condiciones normativas que deberá satisfacer la implementación objetivo.
No describe colecciones Firestore definitivas, campos persistentes completos, DTO concretos, índices,
nombres de carpetas, clases ni componentes visuales.
Esas decisiones se tomarán mediante la Ficha de Incremento Implementable cuando el caso de uso
correspondiente esté próximo a programarse.


## 3.2 Autoridad normativa

El estado objetivo se encuentra determinado por los Documentos 1-4.
El Documento 5 no podrá reinterpretar:
- significado de las Entidades;
- ownership;
- Agregados;
- Aggregate Roots;
- Bounded Contexts;
- módulos propietarios;
- casos de uso;
- reglas funcionales aprobadas;
- separación entre dominios.
Cuando un caso de uso no posea suficiente definición funcional para programarse, la implementación
deberá detenerse únicamente en ese punto e identificar la decisión faltante. No deberá completar el
vacío inventando una regla fundamental.


## 3.3 Principios estructurales del estado objetivo

La implementación deberá preservar:
 1. El Grupo como unidad operativa principal.
 2. Usuario como identidad digital.
 3. Persona como identidad deportiva permanente.
 4. Membresía como relación Persona-Grupo.
 5. Temporada como Agregado independiente dentro del Módulo Grupos.
 6. Pago deportivo separado de cualquier cobro comercial.
 7. Partido como propietario del resultado deportivo original.
 8. Torneo como propietario de su estado competitivo.
 9. Entrenamiento independiente de Partido.
10. Observación Técnica independiente de Persona, Membresía y Entrenamiento.
11. Suscripción como relación comercial entre Usuario y Plan.
12. Información derivada separada de las fuentes originales.
13. Autorización funcional separada de habilitación comercial y validez de dominio.
14. Una unidad de consistencia por instancia de Agregado.
15. Contratos públicos para la colaboración entre módulos.
16. Dominio independiente de la infraestructura.


## 3.4 Inventario normativo de Agregados

El inventario de Agregados se encuentra cerrado.

| Agregado | Aggregate Root | Responsabilidad principal |
|---|---|---|
| Usuario | Usuario | Identidad digital y configuración de cuenta |
| Persona | Persona | Identidad deportiva permanente |
| Membresía | Membresía | Relación Persona-Grupo |
| Grupo | Grupo | Unidad organizativa deportiva |
| Temporada | Temporada | Ciclo operativo temporal de un Grupo |
| Club | Club | Organización superior que agrupa Grupos |
| Torneo | Torneo | Organización y estado competitivo |
| Partido | Partido | Encuentro y resultado deportivo original |
| Entrenamiento | Entrenamiento | Sesión deportiva y datos originales |
| Observación Técnica | Observación Técnica | Observación individual sobre una Persona |
| Pago | Pago | Operación económica deportiva |
| Solicitud | Solicitud | Proceso que requiere aprobación |
| Suscripción | Suscripción | Relación comercial Usuario-Plan |


Cada instancia posee identidad, Aggregate Root homónimo, invariantes propias, ciclo de vida cuando
corresponda y unidad de consistencia independiente.
La pertenencia al mismo módulo o Bounded Context no implica una transacción común.


## 3.5 Conceptos que no son Agregados

No constituyen Agregados:
- Plan;
- Equipo;
- Fixture;
- Movimiento;
- Caja;
- Estadística;
- Actividad;
- Seguimiento Deportivo.
Por lo tanto, no deberán recibir Aggregate Root ni Repositorio de Agregado por conveniencia técnica.
Esto no impide que posean estructuras internas, almacenamiento técnico, modelos de lectura,
servicios de consulta, proyecciones, componentes de aplicación o contratos públicos.

## 3.6 Fuentes de verdad objetivo


| Estado o información | Fuente de verdad objetivo | Referencias externas posibles | No debe convertirse en autoridad |
|---|---|---|---|
| Identidad digital | Usuario | Persona vinculada, Suscripción | Persona, Membresía o Plan |
| Identidad deportiva | Persona | Usuario vinculado | Usuario o Membresía |
| Pertenencia Persona-Grupo | Membresía | Persona, Grupo, Temporada | arrays en Grupo |
| Grupo | Grupo | Club y Temporada activa cuando corresponda | Membresía o Suscripción |
| Ciclo operativo | Temporada | Grupo | Grupo como contenedor transaccional |
| Organización superior | Club | Grupos asociados | Grupo como estado interno de Club |
| Torneo | Torneo | Grupo organizador, Equipos y Partidos referenciados | Partido o Suscripción |
| Resultado deportivo original | Partido | Torneo cuando corresponda | Torneo, standings o Estadísticas |
| Estado competitivo | Torneo | Resultados confirmados de Partidos | Partido |
| Sesión de práctica | Entrenamiento | Grupo, Temporada y Membresías | Partido |
| Observación individual | Observación Técnica | Persona, Membresía y origen deportivo | Persona, Membresía o Entrenamiento |
| Operación económica deportiva | Pago | Grupo, Membresía, Equipo u obligación | Participación o inscripción |
| Solicitud | Solicitud | Persona, Grupo, Torneo u otros contextos | arrays dentro del recurso solicitado |
| Relación comercial | Suscripción | Usuario y Plan | Usuario o recurso deportivo |
| Definición comercial | Plan | Catálogo comercial | Suscripción como contenedor del Plan |
| Estadísticas | Fuentes originales de módulos propietarios | Partidos, Entrenamientos, Torneos y Membresías | Proyección materializada |
| Rendimiento | Información derivada de fuentes deportivas | Persona y Membresías como contexto | Usuario |
| Actividad | Hechos relevantes producidos por propietarios | Agregados productores | Registro histórico |
| Standings | Resultados confirmados y reglas de Torneo | Partido y Torneo | Standings materializado |
| Alertas | Estado operativo que las origina | Usuarios y recursos | Alerta persistida |


## 3.7 Una fuente original y múltiples representaciones

La arquitectura permite conservar proyecciones, índices, vistas, resúmenes, contadores, standings,
estadísticas materializadas, registros de Actividad y datos preparados para presentación.
Estas representaciones no deberán:
- sustituir la fuente original;
- modificar el Agregado propietario;
- participar obligatoriamente en su transacción;
- impedir que la operación original finalice;
- asumir ownership;
- convertirse en una copia autoritativa alternativa.
Cuando una representación sea derivada, la Ficha de Incremento deberá identificar fuente original,
mecanismo de generación, posibilidad de reconstrucción, tolerancia a desactualización y respuesta
ante fallo.


## 3.8 Agregado y persistencia física

El Agregado determina:
- ownership;
- invariantes;
- operaciones válidas;
- Aggregate Root;
- unidad de consistencia;
- frontera transaccional.
No determina automáticamente:
- nombre de colección;
- cantidad de documentos;
- denormalizaciones;
- índices;
- forma de DTO;
- modelos de lectura;
- consultas necesarias;
- estructura del frontend.
La persistencia física deberá diseñarse considerando conjuntamente:
- Agregado;
- casos de uso;
- contratos;
- consultas;
- autorización;
- reglas Firestore;
- proyecciones;
- concurrencia;
- límites técnicos;
- necesidad de lectura eficiente.
Una colección Firestore no equivale automáticamente a un Agregado. Un Agregado tampoco exige
necesariamente una única colección o un único documento físico.
La infraestructura deberá permitir reconstruir y persistir el Aggregate Root sin debilitar sus límites.


## 3.9 Servicios de Aplicación

Cada caso de uso modificador deberá poseer un responsable de Aplicación identificable.
El Servicio de Aplicación deberá:
  1. recibir y validar el contrato de entrada;
  2. identificar al actor;
  3. verificar autorización funcional;
  4. verificar habilitación comercial cuando corresponda;


 5. consultar referencias externas mediante contratos públicos;
 6. recuperar el Aggregate Root propietario;
 7. invocar su comportamiento;
 8. persistirlo mediante su Repositorio;
 9. coordinar efectos posteriores;
10. producir una respuesta adecuada para Presentación.
No deberá:
- implementar invariantes del Agregado;
- acceder directamente a Repositorios de otros módulos;
- convertir varias referencias en una unidad de consistencia común;
- modificar modelos internos ajenos;
- confundir autorización con Plan;
- utilizar Firestore como lenguaje del contrato público.


## 3.10 Contratos públicos

Los módulos colaborarán mediante contratos que expongan únicamente la información o capacidad
necesaria.
Los contratos no deberán exponer Aggregate Roots ajenos, documentos Firestore, colecciones,
snapshots, consultas propias de Firebase, estructuras internas completas, permisos derivados del
Plan ni mecanismos de almacenamiento.
Los contratos deberán definir entrada, salida, errores, compatibilidad, información mínima y
semántica funcional.


## 3.11 Autorización y visibilidad

El estado objetivo aplicará privado por defecto.

### Visitante


Sólo podrá acceder a recursos publicados explícitamente conforme a sus reglas funcionales.

### Usuario autenticado


Podrá acceder a:
- su identidad;
- su Plan y Suscripción;
- sus capacidades comerciales;
- información pública;
- recursos para los que posea autorización contextual.

### Owner, administrador e integrante


Su acceso dependerá de:
- ownership;
- Membresía;
- rol;
- cargo;
- permisos contextuales;
- reglas del recurso.
La autenticación no concede acceso general. El Plan no concede permisos internos.


## 3.12 Habilitación comercial

El Dominio Comercial podrá determinar capacidades disponibles, límites, cantidad de recursos
permitidos, funciones incluidas y condición comercial de una operación.
No podrá:


- administrar Grupos;
- modificar Torneos;
- inactivar recursos deportivos directamente;
- otorgar administración sobre recursos ajenos;
- reemplazar Membresía;
- decidir invariantes deportivas.
Cuando una condición comercial exija modificar un recurso deportivo, la operación deberá ejecutarse
mediante el módulo deportivo propietario.


## 3.13 Frontend objetivo

El frontend forma parte de cada incremento.
Deberá:
- presentar las acciones disponibles;
- capturar datos de entrada;
- mostrar estados y errores;
- invocar contratos de Aplicación;
- reflejar la diferencia entre rechazo de autorización, límite comercial y regla de dominio;
- evitar escrituras directas sobre persistencia en los flujos migrados;
- no duplicar reglas del dominio;
- no inferir permisos únicamente desde datos controlados por el cliente.
El Documento 5 no exige rediseñar toda la interfaz.
Cada Ficha de Incremento deberá determinar qué pantallas, acciones, estados y feedback cambian
en el mismo incremento que modifica el backend.


## 3.14 Estado objetivo y diseño físico diferido

El estado objetivo se considera normativamente definido aunque no se hayan decidido todavía todos
los campos Firestore.
No deberán diseñarse anticipadamente todas las colecciones porque:
- los casos de uso poseen necesidades de lectura diferentes;
- la seguridad condiciona la forma de exposición;
- los contratos determinan datos intercambiados;
- las proyecciones pueden requerir almacenamiento separado;
- Firestore favorece decisiones físicas que deben evaluarse con consultas concretas.
La definición física se realizará incremento por incremento mediante la Ficha de Incremento
Implementable.


## 3.15 Verificación del estado objetivo

Un incremento se considerará alineado cuando pueda demostrarse que:
- modifica únicamente los Agregados autorizados;
- aplica las invariantes aprobadas;
- utiliza contratos públicos;
- no expone persistencia interna;
- mantiene una única fuente de verdad;
- aplica autorización contextual;
- separa habilitación comercial;
- incluye frontend y feedback;
- posee pruebas suficientes;
- retira estructuras anteriores sustituidas;
- produce evidencia reproducible.


# 4. Principios de transición

## 4.1 Implementación incremental

La transición deberá realizarse mediante incrementos funcionales verificables.
Cada incremento deberá:
- corresponder a una fuente de verdad o caso de uso identificable;
- declarar sus dependencias;
- preservar los límites normativos;
- incorporar pruebas suficientes;
- producir evidencia de cierre;
- retirar o desactivar las estructuras sustituidas cuando ya no sean necesarias.
La implementación incremental no implica mantener indefinidamente el modelo anterior y el nuevo
en producción.


## 4.2 Una fuente de verdad por estado original

Cada estado original del dominio deberá poseer una única fuente de verdad.
En particular:
- Usuario administra identidad digital;
- Persona administra identidad deportiva;
- Membresía administra la relación Persona-Grupo;
- Pago administra la información económica deportiva original;
- Partido administra el resultado deportivo original;
- Torneo administra su estado competitivo;
- Entrenamiento administra la información original de la sesión;
- Observación Técnica administra la observación técnica individual;
- Suscripción administra la relación comercial del Usuario.
Las representaciones derivadas, históricas, estadísticas o de lectura no deberán convertirse en
autoridades alternativas.


## 4.3 Reinicialización controlada de Firestore

Firestore podrá reinicializarse debido a la inexistencia de información relevante que deba
conservarse.
La posibilidad de reinicialización no constituye autorización automática para borrar datos.
Antes de cualquier eliminación deberán cumplirse las salvaguardas definidas en la Etapa 0.
La reinicialización deberá ejecutarse únicamente durante una intervención técnica autorizada.


## 4.4 Ausencia de migración en vivo

El plan no requiere una migración en vivo.
No será obligatorio diseñar:
- doble lectura;
- doble escritura;
- sincronización bidireccional;
- compatibilidad multiversión prolongada;
- despliegues sin interrupciones;
- coexistencia productiva indefinida.
Estos mecanismos sólo podrán incorporarse posteriormente si aparece una necesidad concreta y
demostrada.


## 4.5 Ventana de mantenimiento

La transición podrá utilizar una ventana completa de mantenimiento antes de habilitar nuevamente
la plataforma.
Durante esa ventana podrán coordinarse como una unidad compatible frontend, Firebase Functions,
reglas Firestore, índices necesarios, configuración y estructura inicial de persistencia.
La existencia de una ventana de mantenimiento no autoriza una reescritura big bang. El desarrollo
y la verificación continuarán realizándose incrementalmente.


## 4.6 Respaldo y acciones destructivas

Toda operación destructiva deberá:
- resolver objetivos mediante identificadores explícitos;
- evitar destinos inferidos o comandos amplios;
- diferenciar emuladores y proyectos remotos;
- registrar el estado previo;
- decidir expresamente si corresponde un respaldo;
- obtener aprobación inmediatamente antes de ejecutar;
- registrar el resultado;
- comprobar el alcance posterior.
El rollback del código y la recuperación de datos son mecanismos diferentes.


## 4.7 Evolución por caso de uso y fuente de verdad

La transición se organizará por caso de uso y fuente de verdad, no por refactorizaciones horizontales
abstractas.
Por ejemplo:
- al migrar Usuario se encapsularán sus operaciones;
- al migrar Membresía se adaptarán los consumidores de pertenencia;
- al crear Pago se retirarán campos económicos embebidos;
- al corregir CU-075 se retirará la transacción Partido-Torneo compartida;
- al estabilizar una fuente original se adaptarán sus proyecciones derivadas.


## 4.8 Encapsulación progresiva

Los contratos, Servicios de Aplicación, Repositorios y adaptadores se incorporarán junto con los flujos
que los necesiten.
La encapsulación no deberá convertirse en una etapa global separada, una capa genérica para
cualquier colección, un repositorio universal, una abstracción sin consumidor real ni una excusa para
reestructurar todo el repositorio antes de entregar un flujo verificable.
Cuando un flujo sea migrado, su Presentación deberá dejar de modificar directamente la persistencia.


## 4.9 Pruebas antes de modificar ownership

Ningún cambio de ownership o fuente de verdad deberá realizarse sin pruebas mínimas del
comportamiento que debe conservarse y del comportamiento objetivo.
Las pruebas de caracterización no deberán legitimar autopromoción, exposición indebida, ownership
contradictorio, transacciones globales prohibidas ni datos derivados actuando como autoridad.
La cobertura requerida dependerá del riesgo. No se exigirá cobertura total antes de comenzar.


## 4.10 Retiro junto con cada migración

Toda migración deberá definir el retiro de la estructura anterior como parte del mismo incremento.
Una estructura podrá retirarse cuando:
- no tenga escritores necesarios;


- no tenga lectores necesarios;
- su reemplazo esté verificado;
- las reglas y contratos nuevos estén activos;
- las pruebas correspondientes aprueben;
- no represente una fuente de verdad vigente.
Podrá existir una revisión final de residuos, pero no una etapa posterior destinada a realizar toda la
encapsulación o todos los retiros acumulados.


## 4.11 Compatibilidad limitada a necesidades reales

La compatibilidad entre versiones se incorporará únicamente cuando sea necesaria para mantener
operativo el desarrollo incremental, coordinar frontend, Functions y reglas, conservar activos durante
la sustitución de un flujo o habilitar rollback de código dentro de un incremento.
No se mantendrá compatibilidad indefinida con modelos sin usuarios activos ni datos relevantes.


## 4.12 Prohibición de migración big bang

La posibilidad de reinicializar Firestore no autoriza reemplazar todo el sistema en una sola operación.
Deberán mantenerse incrementos pequeños, pruebas por flujo, commits recuperables, puntos de
integración explícitos, criterios de entrada y salida, retiro controlado y verificación antes de continuar.
La reinicialización simplifica la persistencia inicial, no la complejidad lógica del dominio.


## 4.13 Anti-sobreingeniería

Antes de introducir una abstracción, etapa, servicio o mecanismo técnico deberá comprobarse que:
  1. reduce un riesgo identificado;
  2. protege una fuente de verdad;
  3. permite verificar un incremento;
  4. evita una contradicción de ownership;
  5. resuelve una dependencia real;
  6. es necesaria antes de implementar.
No deberán introducirse por anticipación microservicios, Sagas, Process Managers, mensajería
distribuida, Event Sourcing, repositorios genéricos, sincronización bidireccional, infraestructura de
escala no demostrada ni nuevos Agregados o Bounded Contexts.


## 4.14 Separación entre autorización y habilitación comercial

SPORTEXA deberá preservar:
     autorización funcional != habilitación comercial != validez de dominio.
La autorización funcional determina si el actor puede solicitar una operación sobre un recurso
concreto.
La habilitación comercial determina si la Suscripción permite la capacidad o alcance solicitado.
La validez de dominio determina si la operación respeta las invariantes y estado del recurso.
Los planes superiores podrán habilitar mayores capacidades o límites comerciales relacionados con la
creación y utilización de recursos. La autorización para administrar cada recurso deportivo continuará
determinada por ownership, Membresía y permisos contextuales.
Ningún Plan podrá convertir a un Usuario en administrador de un Grupo ajeno, sustituir Membresía,
otorgar roles deportivos, conceder permisos contextuales ni modificar directamente recursos
deportivos.


# 5. Gobierno, trazabilidad y criterios comunes de los incrementos

## 5.1 Propósito

Este capítulo define cómo se aprueba, implementa, verifica y cierra cada incremento del plan.
Su objetivo es evitar:
- programar casos de uso ambiguos;
- diseñar persistencia sin considerar consultas y seguridad;
- modificar backend sin adaptar frontend;
- introducir reglas funcionales durante la codificación;
- cerrar trabajo sin retirar la estructura anterior;
- acumular refactorizaciones horizontales;
- declarar completada una etapa sin evidencia.


## 5.2 Unidad de planificación

La unidad normal de planificación será un caso de uso, un conjunto pequeño de casos relacionados
o una corrección técnica acotada necesaria para habilitarlos.
No deberá agruparse en un mismo incremento una cantidad de casos que impida identificar la fuente
de verdad, probar sus efectos, establecer rollback, verificar el frontend, retirar la estructura anterior
o comprender su unidad de consistencia.


## 5.3 Jerarquía de decisiones

Cada incremento respetará esta jerarquía:
  1. Documentos 1-4;
  2. decisiones aprobadas del Documento 5;
  3. caso de uso y reglas funcionales aplicables;
  4. Ficha de Incremento Implementable;
  5. decisiones técnicas locales;
  6. preferencias de implementación.
Una decisión de nivel inferior no podrá contradecir una superior.


## 5.4 Roles conceptuales


| Rol conceptual | Responsabilidad |
|---|---|
| Responsable de producto | Resolver comportamiento funcional y prioridades |
| Responsable arquitectónico | Verificar ownership, límites, contratos y trazabilidad |
| Responsable técnico | Diseñar e implementar el incremento |
| Responsable de seguridad | Revisar autorización, reglas y exposición |
| Responsable de pruebas | Definir y verificar evidencias |
| Responsable operativo | Verificar ambientes, despliegue y recuperación |


Una misma persona podrá ejercer varios roles. La separación expresa responsabilidades, no una
exigencia de equipo.


## 5.5 Estados de un incremento

Cada incremento atravesará:
### 1. Propuesto: alcance inicial identificado.

### 2. En definición: ficha incompleta.

### 3. Bloqueado funcionalmente: falta una decisión del producto o dominio.

### 4. Listo para implementar: ficha completa y revisada.

### 5. En implementación: cambios en curso.

### 6. Implementado: código completo, pendiente de verificación final.

### 7. Verificado: pruebas y evidencias aprobadas.

### 8. Cerrado: estructuras anteriores retiradas y trazabilidad actualizada.


No deberá iniciarse programación sustantiva mientras la ficha permanezca En definición o Bloqueada
funcionalmente.


## 5.6 Criterios comunes de entrada

Antes de implementar un incremento deberá existir:
- identificación de casos de uso;
- comportamiento funcional suficiente;
- fuente de verdad objetivo;
- Agregado propietario;
- actores y autorización;
- dependencias satisfechas;
- contratos necesarios;
- diseño físico mínimo;
- estrategia de frontend;
- plan de pruebas;
- checkpoint;
- criterio de rollback;
- estructura anterior a retirar;
- evidencia esperada.
Los campos no aplicables deberán marcarse como NO APLICA con justificación. No deberán dejarse
vacíos.


## 5.7 Tratamiento de decisiones faltantes

Una decisión será bloqueante cuando su ausencia impida determinar quién puede ejecutar el caso
de uso, cuándo resulta válido, qué estado modifica, qué Agregado es responsable, qué ocurre ante
un error relevante, qué resultado debe observar el usuario o qué postcondición debe garantizarse.
No serán bloqueantes, salvo que afecten directamente el comportamiento, los nombres de
colecciones, organización de carpetas, nombres internos de clases, herramienta de validación,
índice concreto, diseño visual fino, optimización prematura o mecanismo físico entre alternativas
equivalentes.
Cuando falte una regla funcional, la ficha deberá:
  1. describir el punto exacto;
  2. enumerar alternativas reales;
  3. explicar el efecto de cada alternativa;
  4. solicitar decisión;
  5. impedir que el programador invente la respuesta.


## 5.8 Criterios comunes de salida

Un incremento sólo podrá cerrarse cuando:
- el comportamiento funcional esté implementado;
- frontend, Functions y reglas sean compatibles;
- las pruebas exigidas aprueben;
- la fuente de verdad sea única;
- no existan escritores anteriores necesarios;
- no existan lectores anteriores necesarios;
- la estructura sustituida haya sido retirada o justificada;
- el rollback o checkpoint haya sido comprobado;
- la evidencia se encuentre registrada;
- la matriz de trazabilidad haya sido actualizada.


## 5.9 Gate obligatorio de seguridad de Etapa 0

La Etapa 0 sólo podrá cerrarse cuando las correcciones de TECH-GAP-01 y TECH-GAP-02 estén:
- implementadas en código;


- incluidas en control de versiones;
- verificadas mediante emuladores o pruebas equivalentes;
- acompañadas por casos positivos y negativos;
- revisadas contra la política de visibilidad aprobada;
- reproducibles desde la línea base documentada.
El despliegue remoto podrá quedar pendiente hasta la futura habilitación de la plataforma.
La Etapa 1 no podrá comenzar si las correcciones permanecen únicamente diseñadas, documentadas,
propuestas, pendientes de codificación o pendientes de pruebas.


## 5.10 Trazabilidad mínima


| Elemento | Pregunta de trazabilidad |
|---|---|
| Documento normativo | ¿Qué decisión de los Documentos 1-4 implementa? |
| Caso de uso | ¿Qué comportamiento funcional entrega? |
| Actor | ¿Quién lo inicia o recibe su resultado? |
| Servicio de Aplicación | ¿Quién coordina la operación? |
| Agregado | ¿Qué fuente original modifica? |
| Contrato | ¿Cómo colaboran los módulos? |
| Persistencia | ¿Cómo se representa físicamente? |
| Seguridad | ¿Quién puede acceder o modificar? |
| Frontend | ¿Cómo se solicita y comunica el resultado? |
| Pruebas | ¿Cómo se demuestra el comportamiento? |
| Retiro | ¿Qué parte del modelo anterior deja de utilizarse? |
| Evidencia | ¿Qué demuestra que el incremento está cerrado? |


## 5.11 Evidencias aceptables

Las evidencias podrán incluir pruebas automatizadas, resultados de emuladores, capturas o registros
de flujos, matrices de reglas, typecheck, lint comparado con baseline, logs controlados, evidencia
de ausencia de lectores o escritores, diff versionado, revisión de contratos, prueba de rollback y
verificación visual del frontend.
La evidencia deberá corresponder al criterio que pretende demostrar. Un typecheck exitoso no
demuestra una regla de autorización, y una captura de pantalla no demuestra una invariante de
dominio.


## 5.12 Checkpoints y rollback

Cada incremento deberá comenzar desde un commit conocido.
Antes de integrar cambios deberá existir:
- rama o checkpoint identificable;
- estado de pruebas inicial;
- alcance del cambio;
- forma de volver al checkpoint;
- tratamiento de datos creados durante pruebas;
- distinción entre rollback de código y recuperación de datos.
Debido a la inexistencia de usuarios activos, el rollback no requerirá mantener dos modelos
productivos funcionando simultáneamente.


## 5.13 Paralelización

Dos incrementos podrán avanzar en paralelo cuando:
- no modifiquen la misma fuente de verdad;
- sus contratos sean estables;
- sus dependencias obligatorias estén satisfechas;
- posean pruebas independientes;
- tengan un punto de integración definido;
- no generen doble autoridad temporal.
La numeración de etapas no deberá utilizarse para imponer una cascada rígida.


## 5.14 Control de alcance

Durante la preparación de un incremento no deberán agregarse tareas sin comprobar que reducen
un riesgo real, son necesarias para el caso de uso, protegen una fuente de verdad, permiten verificar
progreso, evitan una contradicción o son necesarias antes de programar.
Las optimizaciones, limpiezas o abstracciones no necesarias deberán registrarse como deuda o
trabajo posterior.


## 5.15 Gobierno de cambios normativos

Si durante la implementación se detecta una contradicción real en los Documentos 1-4:
- se detendrá únicamente el incremento afectado;
- se documentará el conflicto;
- no se modificará silenciosamente el modelo;
- se abrirá una decisión arquitectónica separada;
- el resto de los incrementos no afectados podrá continuar.
Una decisión de UI, Firestore o estructura de carpetas no constituye por sí misma una modificación
arquitectónica.


## 5.16 Ficha de Incremento Implementable

La ficha deberá completarse antes de programar cada caso de uso o conjunto pequeño de casos
relacionados.

### Estado de la ficha


- Estado: Propuesto / En definición / Bloqueado funcionalmente / Listo para implementar / En
    implementación / Implementado / Verificado / Cerrado
- Responsable:
- Fecha:
- Rama o checkpoint de partida:
- Etapa del roadmap:

### 1. Identificación


- ID del incremento:
- Nombre:
- Casos de uso incluidos:
- Casos de uso expresamente excluidos:
- Documentos y secciones normativas relacionadas:
- Brechas técnicas atendidas:

### 2. Objetivo funcional


Describir problema resuelto, resultado esperado, valor para el actor y razón por la cual estos casos
se agrupan. No describir todavía la solución física.

### 3. Actores


| Actor | Participación | Contexto | Resultado esperado |
|---|---|---|---|


Distinguir actor principal, actores secundarios, Sistema y servicios externos cuando correspondan.


### 4. Precondiciones


Enumerar:
- identidad necesaria;
- estado previo del recurso;
- relaciones contextuales;
- autorización;
- habilitación comercial cuando corresponda;
- datos mínimos requeridos;
- dependencias con otros módulos.
Si una precondición no se encuentra aprobada, registrar decisión faltante, alternativas, impacto y
condición que bloquea la implementación.

### 5. Flujo principal


Describir paso a paso:
 1. acción del actor;
 2. validaciones previas;
 3. autorización funcional;
 4. habilitación comercial cuando corresponda;
 5. recuperación de referencias;
 6. modificación del Agregado;
 7. persistencia;
 8. efectos posteriores;
 9. respuesta;
10. actualización del frontend.
El flujo no deberá expresar detalles internos de Firestore salvo cuando sean necesarios para
comprender una restricción técnica.

### 6. Flujos alternativos y errores


| Condición | Respuesta funcional | Estado resultante | Feedback al actor | ¿Permite reintento? |
|---|---|---|---|---|


Incluir cuando corresponda actor no autenticado, actor no autorizado, capacidad comercial no
habilitada, recurso inexistente, estado incompatible, validación fallida, conflicto de concurrencia,
dependencia no disponible, persistencia fallida, efecto posterior pendiente y reintento idempotente.

### 7. Postcondiciones y criterios de aceptación


### Postcondiciones

- estado original modificado;
- estados que permanecen sin cambios;
- información derivada pendiente o actualizada;
- eventos o efectos producidos;
- estructuras anteriores que dejan de ser autoridad.

Criterios de aceptación Utilizar condiciones observables y verificables en formato Dado / Cuando
/ Entonces. No aceptar expresiones imprecisas como “funciona correctamente”.

### 8. Frontend


### Pantallas afectadas

- pantalla nueva;
- pantalla modificada;
- pantalla retirada;
- rutas implicadas.


### Acciones

- botones;
- formularios;
- confirmaciones;
- acciones disponibles según estado y autorización.

### Estados visuales

- inicial;
- cargando;
- éxito;
- vacío;
- error;
- no autorizado;
- límite comercial;
- operación pendiente;
- recuperación o reintento.

Feedback Definir mensajes necesarios, diferencias entre errores, actualización optimista o
confirmada, navegación posterior, accesibilidad mínima y comportamiento responsive cuando
corresponda.
El frontend deberá implementarse dentro del mismo incremento. No deberá postergarse como fase
posterior al backend.

### 9. Servicio de Aplicación responsable


- Módulo propietario:
- Servicio de Aplicación:
- Operación coordinada:
- Autorizaciones aplicadas:
- Habilitación comercial:
- Contratos consumidos:
- Repositorio utilizado:
- Respuesta producida:
Verificar que el Servicio de Aplicación coordine y no implemente invariantes propias del Agregado.

### 10. Agregados y reglas


| Agregado | Tipo de participación | Operación sobre Aggregate Root | Invariantes aplicadas | ¿Se modifica? |
|---|---|---|---|---|


Para cada referencia externa indicar por qué permanece fuera del Agregado. No ampliar Agregados
para simplificar consultas o transacciones.

### 11. Consultas y contratos públicos


| Proveedor | Consumidor | Capacidad pública | Información mínima | Errores |
|---|---|---|---|---|


Distinguir contrato modificador, contrato de consulta, modelo de lectura y evento cuando
corresponda. Ningún contrato deberá exponer documentos Firestore ni Aggregate Roots ajenos.

### 12. DTO de entrada y salida

### DTO de entrada


| Campo | Tipo | Obligatorio | Validación | Origen |
|---|---|---|---|---|


### DTO de salida


| Campo | Tipo | Semántica | Consumidor |
|---|---|---|---|


### Errores contractuales


| Código o categoría | Significado | Respuesta del frontend |
|---|---|---|


Los DTO deberán responder al caso de uso, no reproducir automáticamente documentos persistentes.

### 13. Diseño físico Firestore

### 13.1 Colecciones y documentos


| Colección o ruta | Finalidad | Autoridad o proyección | Escritores | Lectores |
|---|---|---|---|---|


### 13.2 Campos


| Campo | Tipo | Obligatorio | Propietario conceptual | Original/derivado | Regla |
|---|---|---|---|---|---|


### 13.3 Referencias


| Referencia | Destino | Motivo | Validación | ¿Forma parte del Agregado? |
|---|---|---|---|---|


### 13.4 Datos originales

Identificar dato, propietario, escritor autorizado, momento de confirmación y criterio de
consistencia.

### 13.5 Proyecciones o datos derivados

Identificar fuente original, finalidad, mecanismo de actualización, tolerancia a desactualización,
posibilidad de reconstrucción y comportamiento ante fallo.

### 13.6 Índices


| Consulta | Campos | Orden | Índice necesario | Justificación |
|---|---|---|---|---|


### Reglas de diseño físico

- Los campos Firestore no se deducen automáticamente de los Agregados.
- El Agregado determina ownership, invariantes y unidad de consistencia.
- Firestore se diseña también a partir de casos de uso, consultas, contratos, seguridad y
    proyecciones.
- No deberán diseñarse colecciones que no sean necesarias para el incremento.
- Una colección no crea un Agregado.
- Una denormalización no crea una fuente de verdad adicional.


### 14. Seguridad y autorización


| Operación | Visitante | Usuario | Owner | Administrador | Integrante | Sistema |
|---|---|---|---|---|---|---|


Documentar autenticación, autorización funcional, habilitación comercial, validez de dominio,
publicación explícita, campos privados, reglas Firestore, validación backend y protección ante datos
controlados por el cliente.
Incluir pruebas positivas y negativas.

### 15. Repositorios y adaptadores


| Componente | Capa | Contrato | Implementación | Agregado o consulta |
|---|---|---|---|---|


Comprobar un Repositorio por Agregado cuando corresponda, ausencia de Repositorio genérico,
ausencia de acceso a Repositorios internos ajenos, aislamiento de Firebase y diferenciación entre
modelos de lectura y Repositorios de Agregado.

### 16. Transacción y unidad de consistencia


- Aggregate Root modificado:
- Límite transaccional:
- Datos confirmados conjuntamente:
- Validaciones externas previas:
- Concurrencia:
- Idempotencia:
- Operaciones posteriores separadas:
Si intervienen varios Agregados, especificar orden, unidades de trabajo independientes, estado ante
fallo parcial, recuperación y por qué no se crea una transacción global.

### 17. Eventos y efectos posteriores


Completar sólo cuando corresponda.

| Hecho o efecto | Productor | Consumidor | Obligatorio | Recuperable | Idempotente |
|---|---|---|---|---|---|


Si no se requieren eventos, indicar NO APLICA. No introducir eventos por uniformidad ni para sustituir
una llamada directa suficiente.

### 18. Plan de pruebas


| Nivel | Casos mínimos | Herramienta o entorno | Evidencia |
|---|---|---|---|
| Dominio | Invariantes y transiciones | | |
| Aplicación | Coordinación y errores | | |
| Contrato | Entrada, salida y compatibilidad | | |
| Integración | Repositorio, adaptadores y módulos | | |
| Reglas | Permitidos y denegados | Emuladores o equivalente | |
| Frontend | Acciones, estados y feedback | | |
| Arquitectura | Límites y dependencias | | |
| Recuperación | Fallos, reintentos y rollback | | |


### 19. Componentes actuales reutilizados


| Componente | Reutilización | Adaptación requerida | Riesgo |
|---|---|---|---|


No confundir reutilización con conservación sin cambios.

### 20. Estructuras anteriores retiradas


| Estructura | Lectores anteriores | Escritores anteriores | Reemplazo | Evidencia de retiro |
|---|---|---|---|---|


Si una estructura permanece temporalmente, justificar, indicar autoridad, prohibir nuevos escritores
cuando corresponda y establecer condición concreta de retiro.

### 21. Checkpoint y rollback


- Commit inicial:
- Rama:
- Estado de pruebas inicial:
- Checkpoint intermedio:
- Rollback de código:
- Tratamiento de datos de prueba:
- Condición para interrumpir:
- Condición para reanudar:
No utilizar doble escritura como rollback predeterminado.

### 22. Evidencia de cierre


El incremento deberá adjuntar:
- commits;
- pruebas aprobadas;
- resultado de emuladores;
- baseline de calidad;
- contratos finales;
- reglas verificadas;
- evidencia del frontend;
- evidencia de retiro;
- matriz de trazabilidad actualizada;
- deuda aceptada;
- resultado del rollback o procedimiento verificado.

### Declaración final

- Estado final: Verificado / Cerrado
- Criterios incumplidos:
- Deuda aceptada:
- Responsable de aprobación:
- Fecha de cierre:


## 5.17 Uso de la Ficha de Incremento Implementable

La ficha funciona como puente entre arquitectura y código.
El procedimiento será:
  1. seleccionar un caso de uso o grupo pequeño relacionado;
  2. completar comportamiento, actores, precondiciones, flujos y postcondiciones;
  3. detectar decisiones funcionales faltantes;
  4. identificar Agregado, fuente de verdad y contratos;
  5. diseñar el incremento completo: backend, Firestore, reglas, frontend y pruebas;


 6. revisar la ficha;
  7. marcarla como Listo para implementar;

 8. programar únicamente el alcance aprobado;
 9. adjuntar evidencias;
10. retirar la estructura sustituida;
11. cerrar el incremento.
La ficha no exige que todo quede decidido en los Documentos 1-4. Obliga a decidir lo necesario justo
antes de implementar, sin confundir decisiones físicas con decisiones del dominio.


## 5.18 Política de actualización del Documento 5

Documento 5 se actualizará al cerrar una etapa o cuando cambie una decisión de nivel plan que afecte
alcance, dependencias, secuencia, criterios de entrada o salida, ownership o asignación de brechas.

La actualización por cierre de etapa deberá registrar únicamente:

- estado de la etapa;
- incrementos cerrados mediante referencia resumida;
- matriz consolidada de criterios de salida;
- brechas tratadas y residuos asignados;
- decisiones de roadmap o dependencias que hayan cambiado;
- siguiente etapa o incremento habilitado.

No se incorporarán por cada commit ni se duplicarán DTO, contratos completos, inventarios de archivos,
resultados detallados de pruebas, pasos de UAT o diffs de implementación. Esa evidencia permanecerá en
las Fichas de Incremento Implementable, informes y cierres correspondientes.

Una actualización extraordinaria entre cierres sólo procederá cuando exista una modificación real del
plan. Las correcciones internas que no alteren el roadmap continuarán registrándose exclusivamente en
el incremento propietario.


# 6. Etapa 0 - Estabilización, conocimiento y red de seguridad

## 6.1 Propósito

La Etapa 0 establece las condiciones mínimas para modificar SPORTEXA sin ampliar vulnerabilidades,
operar sobre el ambiente equivocado, perder activos reutilizables o avanzar sin capacidad de
detectar regresiones.
No tiene como propósito implementar toda la arquitectura objetivo.
La Etapa 0 deberá producir:
- una línea base reproducible;
- contención efectiva de los riesgos críticos de seguridad;
- confirmación del proyecto y los ambientes;
- verificación de que los datos pueden descartarse;
- decisión sobre respaldo;
- preparación de una reinicialización segura;
- pruebas mínimas de caracterización;
- baseline de calidad;
- reglas operativas para la implementación incremental.


## 6.2 Alcance

La Etapa 0 comprende repositorio, frontend, Firebase Functions, Firebase Authentication, Firestore,
reglas, emuladores, configuración por ambiente, comandos de verificación, pruebas mínimas y
preparación de operaciones destructivas.
No comprende ejecución de la reinicialización, eliminación de cuentas, despliegue remoto obligatorio
de reglas, migración de dominio, implementación de capacidades nuevas, limpieza completa del lint,
cobertura total ni reorganización general del repositorio.


## 6.3 0.A - Línea base reproducible

### Objetivo


Establecer un estado técnico conocido desde el cual puedan compararse todos los incrementos
posteriores.

### Actividades


- registrar rama y commit inicial;
- registrar versiones de Node.js, npm y dependencias relevantes;
- documentar instalación y ejecución;
- comprobar frontend, Functions y emuladores;
- identificar configuración por ambiente;
- registrar comandos de typecheck, lint y sintaxis;
- identificar scripts de migración, backfill, seed o limpieza;
- impedir que scripts destructivos se ejecuten por defecto;
- registrar limitaciones de cada verificación;
- evitar lectura o exposición innecesaria de secretos.


### Entregables


- ficha de línea base;
- guía de instalación y ejecución;
- matriz de ambientes;
- inventario de comandos;
- inventario de scripts sensibles;
- registro de resultados técnicos iniciales.

### Criterios de salida


- el sistema puede ejecutarse de manera reproducible o sus bloqueos están documentados;
- los emuladores necesarios pueden iniciarse;
- los comandos técnicos poseen resultados esperados;
- el estado Git inicial es conocido;
- ningún secreto fue incorporado a documentación o pruebas;
- los scripts destructivos están identificados.


## 6.4 0.B - Contención de seguridad

### Objetivo


Contener TECH-GAP-01 y TECH-GAP-02 antes de habilitar nuevamente la plataforma y antes de iniciar
la Etapa 1.

### Política mínima de visibilidad


- privado por defecto;
- publicación explícita para recursos públicos;
- acceso contextual para información deportiva restringida;
- acceso del Usuario a su propia identidad y relación comercial;
- ausencia de permisos derivados exclusivamente del Plan.

### Actividades


- comparar reglas versionadas con reglas desplegadas;
- localizar todos los caminos de autopromoción;
- retirar updateUserRole como mecanismo disponible para el cliente;
- impedir que onboarding acepte o determine administración global;
- identificar consumidores del rol global;
- definir reglas mínimas para Visitante, Usuario, Owner, administrador e integrante;
- implementar las correcciones en el repositorio;
- agregar pruebas positivas y negativas mediante emuladores o equivalentes;
- verificar accesos mediante SDK directo y Functions;
- versionar código y pruebas;
- preparar despliegue remoto y rollback;
- registrar permisos finos que permanezcan abiertos.

### Criterios de salida


- ningún cliente puede autoconcederse administración;
- la autenticación no concede acceso general;
- correo, pagos, observaciones técnicas, permisos e información interna quedan privados por
    defecto;
- la información pública requiere una condición explícita de publicación;
- los accesos deportivos dependen de ownership, Membresía o permisos contextuales;
- las correcciones están implementadas y versionadas;
- las reglas poseen pruebas reproducibles;
- los casos positivos y negativos aprueban en emuladores o pruebas equivalentes.
El despliegue remoto podrá coordinarse con la futura habilitación de la plataforma. La implementación,
versionado y verificación local no podrán diferirse más allá de la Etapa 0.


## 6.5 0.C - Verificación y descarte controlado de datos

### Objetivo


Confirmar que datos y cuentas existentes pueden descartarse y preparar una eventual limpieza sin
afectar el ambiente equivocado.

### Alcance del perfilado


El análisis se limitará a:
- identificar proyectos y ambientes;
- distinguir emuladores de proyectos remotos;
- verificar ausencia de usuarios activos;
- verificar ausencia de información relevante;
- registrar colecciones y estructuras existentes como evidencia;
- identificar cuentas de Firebase Authentication;
- decidir si corresponde un export preventivo;
- preparar el alcance exacto de la reinicialización.
No se realizará reconciliación de pagos, mapeo detallado de users, migración de Membresías,
reconstrucción de Temporadas, backfill, clasificación exhaustiva de variantes sin valor, doble
escritura ni conservación de compatibilidad legada.

### Salvaguardas obligatorias


Antes de cualquier eliminación deberán completarse, en orden:
 1. resolver el identificador exacto del proyecto Firebase;
 2. distinguir inequívocamente emuladores, desarrollo y cualquier proyecto remoto;
 3. confirmar que no existen usuarios activos;
 4. confirmar que Firestore no contiene información relevante;
 5. decidir expresamente si se realizará un export preventivo;
 6. verificar el alcance exacto de la eliminación;
 7. obtener aprobación explícita inmediatamente antes de ejecutar;
 8. registrar el resultado de la operación;
 9. verificar que no se afectaron ambientes ajenos;
10. evaluar Firebase Authentication de forma independiente.
La aprobación documental de la estrategia no equivale a la aprobación ejecutiva de la eliminación.

### Firestore y Authentication


Firestore y Firebase Authentication constituyen recursos distintos.
Por lo tanto:
- confirmar el descarte de Firestore no autoriza eliminar cuentas;
- confirmar el descarte de cuentas no autoriza borrar Firestore;
- cada operación deberá tener alcance, verificación y aprobación propios;
- un respaldo de Firestore no constituye un respaldo de Authentication;
- deberán registrarse por separado los resultados de cada limpieza.

### Entregables


- inventario de proyectos y ambientes;
- evidencia de ausencia de usuarios activos;
- resumen de colecciones;
- decisión de respaldo;
- inventario de cuentas de Authentication;
- checklist destructivo;
- procedimiento de reinicialización;
- procedimiento de verificación posterior.


### Criterios de salida


- el ambiente objetivo está inequívocamente identificado;
- la ausencia de datos relevantes fue verificada nuevamente;
- las cuentas de Authentication fueron evaluadas separadamente;
- el respaldo fue realizado o descartado mediante decisión explícita;
- la reinicialización puede ejecutarse con alcance controlado;
- todavía no se eliminó ningún dato como parte de la redacción documental.


## 6.6 0.D - Pruebas de caracterización

### Objetivo


Conservar el comportamiento útil de los activos reutilizables y detectar regresiones durante la
transición.

### Flujos prioritarios


- autenticación;
- onboarding;
- Grupos;
- partidos sociales;
- Torneos;
- inscripciones;
- fixture;
- resultados;
- pagos;
- reglas Firestore.

### Actividades


- preparar datos sintéticos para emuladores;
- identificar entradas, resultados y efectos relevantes;
- clasificar comportamientos como correctos, tolerados o contradictorios;
- crear pruebas mínimas de callables;
- crear pruebas de reglas;
- caracterizar el núcleo de Torneos;
- evitar assertions que congelen defectos de seguridad u ownership;
- definir cobertura mínima antes de cada incremento.

### Criterios de salida


- los flujos que serán modificados primero poseen protección mínima;
- existen casos positivos y negativos de autorización;
- las pruebas se ejecutan sin escribir sobre proyectos remotos;
- los defectos conocidos están diferenciados del comportamiento que debe conservarse;
- no se exige cobertura total.


## 6.7 0.E - Baseline de calidad

### Objetivo


Crear una señal que permita detectar nueva deuda o regresiones sin convertir la limpieza histórica
en requisito absoluto.

### Actividades


- registrar el estado actual de lint;
- clasificar errores funcionales, de tipado, históricos y editoriales;
- verificar typecheck desde un estado controlado;
- mantener comprobación de sintaxis del backend;
- establecer política de no incrementar deuda;


- exigir mayor limpieza sobre archivos modificados cuando sea razonable;
- registrar excepciones temporales;
- evaluar un pipeline mínimo sin convertirlo en condición previa desproporcionada.

### Criterios de salida


- los resultados actuales son reproducibles;
- los errores nuevos pueden distinguirse de los anteriores;
- las fallas funcionales no quedan ocultas como deuda editorial;
- no se exige lint en cero;
- no se exige CI completo para iniciar la Etapa 1.


## 6.8 0.F - Decisiones operativas de transición

### Objetivo


Establecer las reglas comunes de ejecución de todos los incrementos posteriores.

### Decisiones operativas


Cada incremento deberá declarar:
- caso de uso afectado;
- fuente de verdad resultante;
- Agregado propietario;
- contratos públicos involucrados;
- accesos directos que serán retirados;
- pruebas exigidas;
- criterio de compatibilidad temporal;
- checkpoint de código;
- criterio de rollback;
- criterio de retiro;
- evidencia de cierre.
La estrategia predeterminada será:
- utilizar emuladores;
- desarrollar incrementalmente;
- coordinar frontend, Functions y reglas;
- reinicializar datos cuando esté autorizado;
- evitar doble escritura;
- mantener una sola fuente de verdad;
- retirar estructuras sustituidas junto con cada flujo;
- conservar checkpoints recuperables.

### Criterios de salida


- existe una plantilla común para los incrementos;
- la primera transición posee entrada, salida y verificaciones definidas;
- las acciones destructivas están separadas del desarrollo ordinario;
- no se diseñó coexistencia compleja sin necesidad;
- las decisiones físicas abiertas están correctamente diferidas.


## 6.9 Salida consolidada de la Etapa 0

La Etapa 0 se considerará finalizada cuando:
- el entorno sea reproducible;
- los riesgos críticos TECH-GAP-01 y TECH-GAP-02 estén corregidos en código;
- las correcciones de seguridad estén versionadas;
- sus pruebas positivas y negativas aprueben en emuladores o equivalentes;
- el proyecto Firebase objetivo esté identificado;
- la ausencia de usuarios activos y datos relevantes haya sido confirmada;


- Firestore y Authentication hayan sido evaluados separadamente;
- exista una decisión sobre respaldo;
- cualquier reinicialización tenga procedimiento y aprobación separados;
- existan pruebas mínimas de caracterización;
- exista baseline de calidad;
- la primera transición posea criterios de entrada, salida y evidencia;
- no se haya introducido una migración productiva innecesaria.
La Etapa 0 no exige desplegar remotamente las correcciones de seguridad antes de su cierre, ejecutar
la limpieza, implementar Usuario o Persona, corregir todo el lint, alcanzar cobertura total, reorganizar
todo el repositorio, implementar CI completo, diseñar todas las colecciones futuras, cerrar todos los
permisos finos ni incorporar capacidades nuevas.
La Etapa 1 no podrá comenzar mientras las correcciones de seguridad permanezcan únicamente
diseñadas o pendientes de verificación.


# 7. Roadmap revisado y mapa consolidado de etapas

Las etapas representan conjuntos de trabajo con dependencias verificables. Su numeración ordena
el plan, pero no obliga a ejecutarlas en una cascada rígida ni a publicarlas como releases separados.

## 7.1 Mapa general

| Etapa | Núcleo | Estado | Dependencia obligatoria principal | Resultado verificable |
|---|---|---|---|---|
| 0 | Estabilización y red de seguridad | `CERRADA` | Arquitectura congelada y repositorio auditado | Seguridad implementada y probada, entorno reproducible y reinicialización preparada |
| 1 | Usuario, Persona y autorización | `CERRADA` | Cierre de Etapa 0 | Identidad separada y autorización contextual inicial |
| 2 | Grupo, Membresía, Solicitud y Temporada | `HABILITADA PARA DEFINICIÓN` | Persona y actor identificables | Fuentes de verdad organizativas separadas |
| 3 | Pago deportivo | `ROADMAP` | Referencias estables a recursos y participantes | Pago independiente y campos embebidos retirados |
| 4 | Partido-Torneo y CU-075 | `ROADMAP` | Modelo de Partido, contratos y pruebas | Resultado original y estado competitivo separados |
| 5 | Estadísticas, Rendimiento, Actividad y recuperación | `ROADMAP` | Cada fuente original correspondiente | Proyecciones reconstruibles y procesos recuperables |
| 6 | Comercial | `ROADMAP` | Usuario estable y consultas deportivas públicas | Capacidades y límites sin otorgar permisos deportivos |
| 7 | Entrenamiento y Seguimiento Deportivo | `ROADMAP` | Grupo, Temporada, Persona y Membresía | Entrenamiento y Observación Técnica separados |
| 8 | Club | `ROADMAP` | Grupo, autorización y habilitación cuando aplique | Club agrupa sin absorber Grupos |
| 9 | Cierre de transición | `ROADMAP` | Etapas incluidas en el alcance | Ausencia de doble autoridad y readiness operativo |


## 7.2 Etapa 0 - Estabilización, seguridad y preparación

- Estado: `CERRADA`.
- Cierre consolidado: `docs/implementacion/etapa-0/E0-10-cierre-consolidado-etapa-0.md`.
- Objetivo: establecer línea base, corregir seguridad, confirmar ambientes y preparar
    reinicialización.
- Fuentes afectadas: fuentes técnicas actuales; no se crea dominio nuevo.
- Dependencias: repositorio, acceso a configuración y distinción entre emuladores y proyectos
    remotos.
- Activos: emuladores, configuración Firebase, frontend, Functions, reglas, callables y auditoría.
- Brechas: TECH-GAP-01, 02, 11, 12 y preparación frente a 14.
- Entrada: proyecto y repositorio identificados.
- Salida: seguridad implementada, versionada y probada; datos verificados; baseline disponible.
- Evidencia: commits, pruebas, resultados de emuladores, matriz de reglas y checklist
    destructivo.

El cierre consolidado verificó TECH-GAP-01 y TECH-GAP-02 corregidos, pruebas positivas y negativas,
baseline de calidad, emuladores reproducibles, proyecto remoto reinicializado y barrera `deny-all`.
El desarrollo posterior continúa exclusivamente mediante emuladores y datos sintéticos; el cierre no
autoriza restaurar reglas remotas ni desplegar.


## 7.3 Etapa 1 - Usuario, Persona y autorización contextual

- Estado: `CERRADA`.
- Objetivo: separar identidad digital, identidad deportiva y autorización.
- Fuente de verdad: Usuario, Persona y vinculación Usuario-Persona.
- Dependencias: cierre de Etapa 0 y política mínima de visibilidad.
- Activos: Firebase Authentication, trigger de alta, onboarding, perfil y navegación protegida.
- Brechas: TECH-GAP-03 y partes de 07, 08 y 09.
- Salida: Usuario no es autoridad deportiva ni global; Persona posee responsabilidad propia;
    primeros consumidores usan autorización contextual.

### 7.3.1 Incrementos cerrados

| Incremento | Resultado consolidado | Evidencia de detalle |
|---|---|---|
| E1-01 — Cuenta digital de Usuario | Cuenta mínima e idempotente; alta sin rol, posición, permisos deportivos ni rendimiento; autorización `self-account` | `docs/implementacion/etapa-1/E1-01-ficha-cuenta-usuario.md`, `E1-01-informe-implementacion.md` y `E1-01-cierre.md` |
| E1-02 — Alta de Persona propia y vinculación inicial | Persona como fuente independiente; vínculo inicial atómico `Usuario.personaId`; autorización `self-person` | `docs/implementacion/etapa-1/E1-02-ficha.md`, `E1-02-informe-implementacion.md` y `E1-02-cierre.md` |
| E1-03 — Retiro del consumo global legado de `matches` en dashboard | Retiro del lector global no autorizable de partidos sin abrir reglas ni crear una consulta sustituta | `docs/implementacion/etapa-1/E1-03-ficha.md`, `E1-03-informe-implementacion.md` y `E1-03-cierre.md` |

Los informes y cierres anteriores conservan contratos, persistencia, pruebas, UAT, rollback y detalle
de commits. La tabla sólo registra su efecto sobre el plan.

### 7.3.2 Matriz consolidada de salida

| Criterio de Documento 5 | Evidencia consolidada | Resultado |
|---|---|---|
| Etapa 0 cerrada y política mínima de visibilidad disponible | E0-10 y reglas locales verificadas | Cumplido |
| Identidad digital separada | Usuario mínimo creado y consultado por contratos propios | Cumplido |
| Identidad deportiva separada | Persona posee modelo, persistencia y contratos propios | Cumplido |
| Vinculación Usuario-Persona | Vínculo inicial atómico, sin absorber Persona dentro de Usuario | Cumplido |
| Usuario no constituye nueva autoridad deportiva o global | Alta y esquema nuevos sin rol, posiciones, permisos, compromiso o rendimiento | Cumplido |
| Autorización contextual inicial | `self-account` y `self-person` derivan actor y objetivo del contexto autenticado; el cliente no selecciona recursos ajenos | Cumplido |
| Frontend, Functions y reglas compatibles | Flujos de Cuenta y Persona utilizan callables; escrituras cliente denegadas; dashboard sin lector global de `matches` | Cumplido |
| Fuente de verdad única en estructuras migradas | Un materializador de Usuario, un escritor backend de Persona y ausencia de doble escritura | Cumplido |
| Lectores y escritores sustituidos retirados o justificados | Autoridades de onboarding retiradas; consumidores deportivos restantes inventariados y asignados por flujo | Cumplido |
| Pruebas, checkpoint, rollback, evidencia y trazabilidad | Gates, emuladores, UAT, cierres y commits identificados en E1-01, E1-02 y E1-03 | Cumplido |

La autorización `self-account` y `self-person` constituye la autorización contextual inicial exigida:
limita cada operación al recurso propio, deriva actor y objetivo de una identidad autenticada confiable
y no utiliza rol global ni habilitación comercial. No sustituye la autorización futura basada en
ownership, Membresía, rol y permisos de Grupo.

### 7.3.3 Brechas tratadas y residuos asignados

| Brecha o residuo | Tratamiento en Etapa 1 | Etapa responsable del residuo |
|---|---|---|
| TECH-GAP-03 — Usuario mezclado con Persona, rol y deporte | Usuario mínimo y Persona independiente; escritores deportivos retirados del alta | E2 para atributos contextuales de Membresía; E4-E5 para consumidores de Partido y Rendimiento |
| TECH-GAP-07 — datos derivados en Usuario y Grupo | La cuenta nueva no inicializa ni requiere compromiso o rendimiento | E4 para efectos originados en Partido; E5 para Estadísticas y Rendimiento |
| TECH-GAP-08 — acceso directo a Firestore | Cuenta y Persona usan Servicios de Aplicación, Repositorios y adaptadores; E1-03 retira un lector global | Encapsulación por flujo en E2, E3, E4 y E5 |
| TECH-GAP-09 — UI como escritora o coordinadora de invariantes | Cuenta y Persona no escriben Firestore directamente | Grupo en E2, Pago en E3, Partido y Torneo en E4 |
| Roles administrativos globales legados | No participan en `self-account` ni `self-person`; su ausencia falla cerrado | Sustitución por flujo en E2 y E4; verificación final en E9 |
| `memberIds`, `adminIds` y solicitudes embebidas | Fuera del alcance de identidad | E2 |
| Posiciones, cargo y permisos leídos desde Usuario | No forman parte de la cuenta nueva | E2 mediante Membresía |
| `estadoCompromiso`, `partidosTotales` y ranking | No forman parte del esquema nuevo de Usuario | E4-E5 |
| Acceso global a Torneos desde dashboard | No fue ampliado ni declarado correcto por E1-03; las reglas continúan fallando cerrado | E4 |
| `legacyUserService`, `onboarded` y compatibilidades deportivas | Aislados y sin autoridad ante ausencia | Retiro por consumidor en E2, E4 y E5 |

Los residuos anteriores no mantienen una segunda fuente necesaria para Cuenta o Persona. Su retiro
deberá ocurrir en el incremento propietario del flujo, conforme a la regla de encapsulación progresiva.
No justifican una refactorización horizontal ni la extensión artificial de Etapa 1.

### 7.3.4 Cierre y numeración

`ETAPA 1 CERRADA — ETAPA 2 HABILITADA PARA DEFINICIÓN`

No existe un E1-04 técnico. E1-04 — Cierre consolidado documental de Etapa 1 y habilitación de Etapa 2
es una intervención exclusivamente documental, no una cuarta migración funcional. Implementar Grupo, Membresía,
Solicitud o Temporada bajo numeración E1 modificaría incorrectamente el alcance aprobado.


## 7.4 Etapa 2 - Organización, Grupo, Membresía, Solicitud y Temporada

- Estado: `HABILITADA PARA DEFINICIÓN`.
- Objetivo: materializar fronteras organizativas y contextuales.
- Fuentes de verdad: Grupo, Membresía, Solicitud y Temporada.
- Dependencias: Persona y actor identificables; contratos mínimos de identidad.
- Paralelización: Grupo y Temporada dentro del mismo módulo conservando Agregados
    independientes; Solicitud puede avanzar junto con Membresía.
- Activos: flujos de Grupo, solicitudes y API existente.
- Brechas: TECH-GAP-04 y dependencias de 08 y 09.
- Salida: Grupo no contiene Membresías ni Solicitudes; Temporada es Agregado independiente
    en Módulo Grupos.

### 7.4.1 Decisiones de corte preliminares

- Crear Grupo y establecer su único Owner forman un mismo corte vertical porque ownership pertenece
    al Agregado Grupo y debe quedar válido desde su creación.
- El Owner es el Usuario propietario del recurso. Los documentos congelados no exigen crearle una
    Membresía automática.
- Membresía requiere referencias válidas a Persona, Grupo y Temporada abierta. Por ello, Temporada
    inicial precede a la primera creación de Membresía.
- Grupo, Temporada, Membresía y Solicitud conservan Agregados y unidades de consistencia separados.
- Aprobar una Solicitud puede coordinar una operación independiente de creación de Membresía, pero no
    crea una transacción o Aggregate Root común.
- La habilitación comercial de CU-011 deberá declararse `NO APLICA` de manera temporal o consultarse
    mediante un contrato real cuando Comercial exista; nunca se representará mediante ownership o
    roles deportivos.

### 7.4.2 Mapa implementable preliminar

| Incremento preliminar | Corte vertical | Fuente o unidad de consistencia principal |
|---|---|---|
| E2-01 — Creación de Grupo mínimo y ownership contextual | Crear Grupo, asignar Owner en la misma operación, consultar el Grupo propio y retirar el escritor directo equivalente de UI | Grupo |
| E2-02 — Temporada inicial abierta | Crear y consultar la Temporada vigente validando el Grupo y el Owner mediante capacidad pública | Temporada |
| E2-03 — Creación inicial de Membresía | Crear Membresía para Persona, Grupo y Temporada abierta; garantizar unicidad activa sin incorporar referencias externas al Agregado | Membresía y regla de contexto de Membresías |
| E2-04 — Consulta contextual de Grupo y Membresías | Atender grupos actuales e historial mediante modelos de lectura sin exponer documentos Firestore ni arrays internos | Consultas de Grupo y Membresía |
| E2-05 — Administración del ciclo de Membresía | Editar, finalizar y reactivar con autorización contextual y Temporada abierta cuando corresponda | Membresía |
| E2-06 — Renovación de Membresía | Crear una nueva Membresía para nueva Temporada y preservar trazabilidad con la anterior | Nueva Membresía |
| E2-07 — Solicitud de ingreso a Grupo | Crear una Solicitud independiente para CU-031 | Solicitud |
| E2-08 — Resolución de Solicitud | Aprobar o rechazar; coordinar Membresía mediante operación separada, idempotente y recuperable | Solicitud; Membresía como efecto coordinado |
| E2-09 — Administración del Grupo | Editar, configurar, archivar o eliminar conforme a reglas aprobadas y ownership contextual | Grupo |
| E2-10 — Administración e historial de Temporadas | Editar, cerrar y consultar temporadas anteriores sin modificar Grupo en la misma unidad | Temporada |
| E2-11 — Retiro de arrays y cierre consolidado | Adaptar consumidores, retirar `memberIds`, `adminIds` y solicitudes embebidas, verificar ausencia de doble autoridad | Integración y retiro por flujo |

El mapa anterior determina secuencia y límites, pero no reemplaza las Fichas de Incremento
Implementable. E2-05, E2-09 o E2-10 deberán subdividirse si sus reglas concretas exceden un cambio
funcional verificable y recuperable.

El siguiente incremento funcional es:

`E2-01 — Creación de Grupo mínimo y ownership contextual`.


## 7.5 Etapa 3 - Pago deportivo independiente

- Objetivo: establecer Pago como única fuente económica deportiva.
- Fuente de verdad: Pago.
- Dependencias: identificadores estables y comprensión de referencias de Grupo, Persona y
    participación.
- Paralelización: puede diseñarse durante Etapa 2 e implementarse por flujo en partidos y
    torneos.
- Activos: flujos actuales de cobro, estados y vistas.
- Brechas: TECH-GAP-06 y parte de 09.
- Salida: participaciones, equipos e inscripciones dejan de ser fuentes económicas.


## 7.6 Etapa 4 - Partido, Torneo y CU-075

- Objetivo: separar resultado original y consecuencias competitivas.
- Fuentes de verdad: Partido para resultado; Torneo para estado competitivo.
- Dependencias: modelo de Partido, contratos, pruebas e idempotencia.
- Paralelización: puede avanzar mientras continúan Pago u Organización si sus contratos son
    estables.
- Activos: núcleo de Torneos, fixture, fases, standings y tipos TournamentMatch.
- Brechas: TECH-GAP-05 y partes de 10 y 14.
- Salida: no existe transacción ni Repositorio compartido; fallos intermedios son detectables y
    recuperables.


## 7.7 Etapa 5 - Estadísticas, Rendimiento, Actividad y recuperación

- Objetivo: separar información derivada e histórica y recuperar procesos obligatorios.
- Fuentes: proyecciones estadísticas, rendimiento, actividad, alertas y estados técnicos.
- Dependencias: fuente original estabilizada para cada proyección.
- Paralelización: puede avanzar fuente por fuente.
- Activos: groupStats, standings, ranking, alertas, historial, cron, correo y push.
- Brechas: TECH-GAP-07, 10, 13 cuando exista evidencia y 14.
- Salida: ninguna proyección actúa como autoridad; procesos obligatorios pueden detectarse,
    reintentarse o repararse.


## 7.8 Etapa 6 - Dominio Comercial

- Objetivo: implementar Plan, Suscripción, capacidades y límites preservando separación
    Deportivo-Comercial.
- Fuente de verdad: Suscripción; Plan como definición comercial.
- Dependencias: Usuario estabilizado, referencia pública de identidad y contratos de consulta
    sobre recursos limitables.
- Paralelización: puede comenzar aunque continúen correcciones deportivas no relacionadas.
- Activos: autenticación, frontend, callables y operaciones actuales de creación.
- Capacidades: consulta, cambio, renovación y cancelación de Plan/Suscripción.
- Salida: Plan no otorga permisos; Comercial no modifica recursos deportivos.


## 7.9 Etapa 7 - Entrenamiento y Seguimiento Deportivo

- Objetivo: incorporar sesiones y observaciones técnicas individuales.
- Fuentes de verdad: Entrenamiento y Observación Técnica.
- Dependencias: Grupo, Temporada, Persona y Membresía disponibles por capacidades públicas.
- Activos: UI, Firebase, notificaciones y patrones de convocatoria reutilizables sin convertir
    Entrenamiento en Partido.
- Capacidades: CU-048 a CU-053 y CU-091.
- Salida: Entrenamiento y Observación Técnica conservan Agregados, Repositorios y transacciones
    independientes.


## 7.10 Etapa 8 - Club

- Objetivo: incorporar Club sin absorber autonomía de Grupos.
- Fuente de verdad: Club.
- Dependencias: Grupo estable, autorización contextual y capacidad comercial cuando
    corresponda.
- Activos: gestión de Grupos, navegación administrativa y contratos de identidad.
- Capacidades: CU-092 a CU-096.
- Salida: Club agrupa Grupos sin incorporarlos a su Agregado ni modificar su estado interno.


## 7.11 Etapa 9 - Cierre de transición

- Objetivo: verificar que el alcance implementado no dependa del modelo anterior.
- Dependencias: cierre de etapas seleccionadas y puntos de integración.
- Brechas: TECH-GAP-15, 16, 17 y 20 cuando corresponda.
- Salida: ausencia de doble autoridad, residuos retirados o justificados, deuda aceptada y
    operación verificada.
- Evidencia: auditoría final, trazabilidad, inventario de deuda y pruebas completas del alcance.


## 7.12 Dependencias obligatorias y parciales


| Relación | Tipo | Regla |
|---|---|---|
| Etapa 0 -> todas | Obligatoria | Ninguna transición comienza sin red de seguridad mínima |
| Usuario -> Persona vinculada | Obligatoria para vinculación | Persona puede existir sin Usuario |
| Persona -> Membresía | Obligatoria | Membresía referencia Persona |
| Grupo -> Temporada | Obligatoria como referencia | No comparten Agregado |
| Persona y Grupo -> Membresía | Obligatoria | Permanecen fuera del Agregado Membresía |
| Membresía -> Pago | Parcial | Pago puede referenciarla, pero no pertenece a ella |
| Pago -> CU-075 | No obligatoria | CU-075 puede corregirse antes del cierre total de Pago |
| Partido -> Torneo en CU-075 | Obligatoria | Torneos usa capacidad pública de Partidos |
| Fuentes originales -> Estadísticas | Obligatoria | Estadísticas no precede la estabilización de su fuente |
| Usuario -> Comercial | Obligatoria | Suscripción referencia Usuario |
| Recursos deportivos consultables -> Comercial | Obligatoria para límites | Comercial consulta información mínima |
| Grupo, Temporada y Membresía -> Entrenamiento | Obligatoria | Son referencias externas |
| Persona -> Observación Técnica | Obligatoria | Es el sujeto de la observación |
| Entrenamiento -> Observación Técnica | Opcional | Sólo como origen cuando corresponda |
| Grupo -> Club | Obligatoria | Club agrupa Grupos sin absorberlos |


## 7.13 Línea transversal obligatoria

En todas las etapas se aplicarán dentro del flujo afectado:
- contratos públicos;
- Servicios de Aplicación;
- Repositorios por Agregado;
- adaptadores de infraestructura;
- retiro de acceso directo desde UI;
- pruebas de dominio, aplicación, contrato, integración y arquitectura según corresponda;
- autorización y reglas Firestore;
- observabilidad;
- checkpoints recuperables;
- retiro de estructuras anteriores;
- trazabilidad.
Esta línea no constituye una etapa independiente ni autoriza una refactorización horizontal de todo
el repositorio.


## 7.14 Regla de paralelización

Dos trabajos podrán avanzar en paralelo cuando:
- no compitan por la misma fuente de verdad;
- sus contratos mínimos estén definidos;
- no dependan de estructuras inestables del otro;
- posean pruebas independientes;
- su integración disponga de un punto explícito;
- no introduzcan ownership compartido.
La paralelización no deberá utilizarse para ocultar dependencias todavía no resueltas.

# 8. Registro de decisiones aprobadas


| ID | Decisión normativa | Estado | Momento de aplicación | Consecuencia |
|---|---|---|---|---|
| D5-001 | Documento 5 es un plan de transición, no una reescritura arquitectónica | APROBADA | Todo el documento | Docs. 1-4 conservan autoridad |
| D5-002 | Se separan estabilización, correcciones estructurales y capacidades nuevas | APROBADA | Roadmap | Las ausencias no se tratan como defectos legados |
| D5-003 | La implementación avanza por fuente de verdad y caso de uso | APROBADA | Etapas 1-8 | Cada incremento declara ownership y evidencia |
| D5-004 | La encapsulación se realiza progresivamente por flujo | APROBADA | Todas las etapas | No existe una gran refactorización horizontal |
| D5-005 | No se exige lint en cero para cerrar Etapa 0 | APROBADA | 0.E | Se utiliza baseline y no regresión |
| D5-006 | No se exige cobertura total para comenzar | APROBADA | 0.D y posteriores | Cobertura según riesgo |
| D5-007 | Cada incremento posee entrada, salida y verificación | APROBADA | Todas las etapas | No se cierra trabajo sólo por completar código |
| D5-008 | Se admite una ventana completa de mantenimiento | APROBADA | Transición física | No se exige despliegue sin interrupción |
| D5-009 | No se requiere compatibilidad con usuarios activos | APROBADA | Transición física | Se elimina compatibilidad productiva compleja |
| D5-010 | No habrá doble escritura salvo necesidad excepcional demostrada | APROBADA | Migraciones | Una sola fuente de verdad por estado original |
| D5-011 | Firestore puede reinicializarse tras verificación y autorización | APROBADA | 0.C y ejecución posterior | No se requieren backfills históricos |
| D5-012 | La eliminación de datos no se ejecuta desde el trabajo documental | APROBADA | 0.C | Requiere intervención y aprobación separadas |
| D5-013 | Temporada queda íntegramente dentro de Organización | APROBADA | Etapa 2 | No reaparece como capacidad futura |
| D5-014 | Las etapas expresan dependencias y no releases obligatorias | APROBADA | Roadmap | Permite paralelización controlada |
| D5-015 | Firebase y Next.js permanecen como tecnologías válidas | APROBADA | Todas las etapas | No se exige sustitución tecnológica |
| D5-016 | Comercial es la primera capacidad nueva priorizada | APROBADA | Etapa 6 | Puede comenzar al cumplir dependencias mínimas |
| D5-017 | Entrenamiento y Seguimiento son segunda prioridad | APROBADA | Etapa 7 | Se preservan Agregados y transacciones separados |
| D5-018 | Club es la tercera prioridad | APROBADA | Etapa 8 | Se implementa después de prioridades anteriores |
| D5-019 | Plan determina capacidades y límites, no permisos deportivos | APROBADA | Etapa 6 y seguridad | Comercial no sustituye ownership ni Membresía |
| D5-020 | Documentos 1-4 permanecen congelados | APROBADA | Todo el plan | Documento 5 sólo implementa sus decisiones |
| D5-021 | No existen usuarios activos ni datos relevantes que conservar | APROBADA | 0.C | Se simplifica la transición física |
| D5-022 | Firestore y Authentication se limpian mediante decisiones separadas | APROBADA | 0.C | Una aprobación no alcanza ambos recursos |
| D5-023 | No existen fuentes externas autoritativas | APROBADA | Todo el plan | No se diseña reconciliación externa |
| D5-024 | Visibilidad privada por defecto y pública sólo por publicación explícita | APROBADA | Seguridad y consultas | Se eliminan lecturas públicas generales |
| D5-025 | La autenticación no concede acceso operativo general | APROBADA | 0.B, 1 y posteriores | Todo acceso privado requiere autorización contextual |
| D5-026 | Roles deportivos derivan del contexto, no del Plan | APROBADA | Etapas 1, 2 y 6 | Se retira rol global como autoridad futura |
| D5-027 | Organización, Pago y Partido-Torneo pueden avanzar parcialmente en paralelo | APROBADA | Etapas 2-4 | Se elimina cascada rígida |
| D5-028 | La ausencia de datos simplifica la migración física, no la corrección del código | APROBADA | Transición estructural | Ownership, contratos y UoW siguen siendo obligatorios |
| D5-029 | Authentication puede descartarse si su verificación separada lo permite | APROBADA | Ejecución posterior de 0.C | Requiere confirmación final independiente |
| D5-030 | El retiro forma parte de cada migración | APROBADA | Etapas 1-8 | Se evita acumular una refactorización final |
| D5-031 | Las correcciones de seguridad deben estar implementadas, versionadas y probadas para cerrar Etapa 0 | APROBADA | 0.B y gate de Etapa 1 | Un diseño de parche no es evidencia suficiente |
| D5-032 | El despliegue remoto de seguridad puede coordinarse con la futura habilitación | APROBADA | Salida de Etapa 0 | Código y pruebas locales son obligatorios; despliegue remoto puede diferirse |
| D5-033 | Los campos Firestore no se deducen automáticamente de Agregados | APROBADA | Cada Ficha de Incremento | Persistencia se diseña con casos de uso, consultas y seguridad |
| D5-034 | El frontend forma parte del mismo incremento | APROBADA | Cada Ficha de Incremento | No se posterga hasta terminar el backend |
| D5-035 | Una regla funcional faltante debe señalarse antes de programar | APROBADA | Gobierno de incrementos | No se inventan reglas fundamentales |
| D5-036 | Documento 5 se actualiza por cierre de etapa o cambio real de plan | APROBADA | Gobierno documental | Fichas, informes y cierres conservan el detalle de implementación |
| D5-037 | Etapas 0 y 1 se encuentran cerradas | APROBADA | Cierre consolidado | Etapa 2 queda habilitada para definición |
| D5-038 | No existe un incremento técnico E1-04 | APROBADA | Cierre de Etapa 1 | La revisión consolidada es documental y no amplía Etapa 1 |
| D5-039 | El siguiente incremento funcional es E2-01 — Creación de Grupo mínimo y ownership contextual | APROBADA | Entrada de Etapa 2 | Grupo y Owner se establecen en un mismo corte vertical |
| D5-040 | La condición de Owner no crea automáticamente una Membresía | APROBADA | Etapa 2 | Membresía requiere Persona, Grupo y Temporada abierta |


# 9. Decisiones abiertas no bloqueantes


| Decisión abierta | Momento de resolución |
|---|---|
| DTO concretos y versionado de contratos | Al implementar cada contrato |
| Nombres y estructura física de colecciones | Al diseñar cada adaptador Firestore |
| Índices Firestore | Cuando las consultas concretas estén definidas |
| Organización interna de carpetas | Durante implementación modular |
| Mecanismo físico de CU-075 | Etapa 4 |
| Registro técnico de idempotencia | Etapa 4 |
| Estrategia exacta de reintentos | Etapas 4 y 5 |
| Herramienta final de observabilidad | Etapa 5 o cierre |
| Paginación y optimización N+1 | Cuando volumen o mediciones lo justifiquen |
| Contenido, límites y precios definitivos de Planes | Etapa 6 |
| Política fina de visibilidad por recurso | Etapa correspondiente, respetando privado por defecto |
| Roles y permisos específicos | Etapas 2, 7 y 8 |
| Diseño físico de Repositorios | Junto con cada Agregado |
| Retención histórica futura | Cuando exista necesidad operativa o legal |
| Alcance del export preventivo | Antes de reinicialización |
| Inclusión de cuentas Authentication en limpieza | Verificación final de 0.C |
| Composición de etapas en releases | Antes de cada ciclo de entrega |
| Cobertura mínima exacta por incremento | Al aprobar su criterio de entrada |


## 9.1 Decisiones históricamente bloqueantes para la ejecución de Etapa 0

Las siguientes decisiones bloquearon actividades concretas durante la Etapa 0 y fueron resueltas por
sus incrementos de preparación, contención y reinicialización:

| Decisión | Resolución |
|---|---|
| Identificador exacto de cada proyecto Firebase y función | Resuelta en E0-07 y cierre E0-10 |
| Correspondencia entre reglas versionadas y desplegadas | Resuelta en E0-07B, E0-09B y E0-09C |
| Decisión sobre export preventivo | Resuelta antes de E0-09D |
| Confirmación separada sobre cuentas Authentication | Resuelta antes de E0-09D |
| Mapeo mínimo de recursos con publicación explícita | Resuelto mediante política privada por defecto y pruebas |
| Selección del primer incremento de caracterización | Resuelta en E0-05 |
| Rama y commit de línea base ejecutiva | Resuelta en E0-01 |


No permanece una decisión de Etapa 0 abierta que bloquee Etapa 2.


# 10. Validación de consistencia

Se confirma que el Documento 5 consolidado:
- respeta los Documentos 1-4;
- no modifica los 13 Agregados normativos;
- no crea nuevas Entidades, Aggregate Roots ni Bounded Contexts;
- mantiene Temporada exclusivamente dentro de Organización y Módulo Grupos;
- no presenta Temporada como capacidad futura;
- mantiene Grupo y Temporada como Agregados independientes;
- establece que Plan no otorga permisos deportivos;
- mantiene autorización, habilitación comercial y validez de dominio separadas;
- ubica Comercial antes que Entrenamiento/Seguimiento y Club;
- conserva Entrenamiento y Observación Técnica como Agregados independientes;
- impide que Club absorba Grupos;
- mantiene Partido como fuente del resultado original;
- mantiene Torneo como fuente del estado competitivo;
- separa Pago deportivo de Suscripción;
- simplifica Etapa 0 sin conservar migración histórica innecesaria;
- evalúa Firestore y Authentication por separado;
- exige implementación, versionado y pruebas de seguridad antes de Etapa 1;
- representa encapsulación como línea transversal;
- incorpora retiro dentro de cada migración;
- permite paralelización controlada;
- mantiene Firebase y Next.js como tecnologías válidas;
- no introduce microservicios, mensajería, Sagas, doble escritura ni nuevas tecnologías;
- no exige lint en cero, cobertura total ni CI completo;
- no convierte la reinicialización en reescritura big bang;
- incorpora frontend, persistencia y pruebas dentro de cada incremento;
- difiere decisiones físicas hasta que el incremento correspondiente esté próximo a implementarse.


# 11. Secuencia recomendada para la ejecución técnica de Etapa 0

Esta secuencia se conserva como registro del plan ejecutado. Etapa 0 fue cerrada por E0-10; las formas
verbales prospectivas de este capítulo describen la planificación original y no reabren actividades.

La ejecución técnica fue organizada mediante incrementos pequeños:
## 11.1 E0-01 - Línea base reproducible

- registrar commit;
- verificar instalación;
- iniciar emuladores;
- ejecutar typecheck, lint y sintaxis;
- documentar resultados.
## 11.2 E0-02 - Infraestructura mínima de pruebas

- incorporar mecanismo de pruebas;
- preparar datos sintéticos;
- comprobar que ninguna prueba utilice proyectos remotos.
## 11.3 E0-03 - Contención de autopromoción

- retirar el camino de autopromoción;
- adaptar onboarding;
- incorporar pruebas positivas y negativas;
- versionar la corrección.
## 11.4 E0-04 - Política mínima de lectura

- reemplazar lecturas públicas generales;
- aplicar privado por defecto;
- permitir sólo publicación explícita;
- probar reglas mediante emuladores;
- versionar la corrección.
## 11.5 E0-05 - Caracterización de activos prioritarios

- autenticación;
- Grupos;
- partidos;
- Torneos;
- fixture;
- resultado;
- pagos.
## 11.6 E0-06 - Baseline de calidad

- clasificar lint;
- establecer no regresión;
- registrar verificaciones obligatorias.
## 11.7 E0-07 - Verificación remota de sólo lectura

- identificar proyecto;
- comprobar reglas y datos;
- confirmar ausencia de usuarios activos;
- evaluar Authentication por separado.
## 11.8 E0-08 - Preparación destructiva

- decidir export;
- preparar checklist;
- delimitar Firestore y Authentication;
- no ejecutar hasta una autorización específica posterior.
El cierre de Etapa 0 exige que E0-03 y E0-04 estén implementados, versionados y probados. No exige
todavía desplegarlos remotamente ni ejecutar E0-08.
La ejecución deberá comenzar por E0-01 y no deberá modificar funcionalidad ni datos durante ese
primer incremento.


# 12. Estado de redacción posterior

Etapa 0 y Etapa 1 se encuentran cerradas. El siguiente trabajo autorizado es preparar la Ficha de
Incremento Implementable de:

`E2-01 — Creación de Grupo mínimo y ownership contextual`.

La ficha deberá confirmar CU-011, actor y objetivo, ownership inicial, contrato de identidad, ausencia
temporal o evaluación real de habilitación comercial, fuente de verdad Grupo, Servicio de Aplicación,
Repositorio, diseño físico mínimo, consulta del Grupo propio, reglas, frontend, pruebas, rollback y
retiro del escritor directo legado.

No se diseñarán anticipadamente todas las colecciones de Etapa 2 ni el detalle completo de las Etapas
3 a 9. Cada decisión física continuará adoptándose en el incremento que la necesite.
