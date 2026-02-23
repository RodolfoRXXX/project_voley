# Resumen comercial de la aplicación `project_voley`

## ¿Qué es?

`project_voley` es una plataforma para organizar partidos de vóley de forma simple, ordenada y escalable. Está pensada para comunidades, clubes y grupos recurrentes que quieren dejar atrás WhatsApp + planillas y pasar a un sistema con reglas claras.

En una sola herramienta centraliza:

- Registro de jugadores y admins.
- Creación de grupos y partidos.
- Inscripción de jugadores.
- Priorización automática de titulares/suplentes.
- Gestión de estado de pago antes del cierre.
- Armado de equipos para jugar.
- Historial de actividad y compromiso.

---

## ¿Para qué sirve en términos de negocio?

### 1) Orden operativo
Evita improvisaciones de último minuto. Cada partido pasa por estados definidos (abierto, verificando, cerrado, jugado), lo que reduce errores y discusiones.

### 2) Transparencia y confianza
La asignación de titulares/suplentes sigue reglas consistentes según puntaje, compromiso y posiciones preferidas. Esto mejora la percepción de justicia dentro del grupo.

### 3) Ahorro de tiempo para administradores
El admin deja de resolver manualmente cada detalle: el sistema automatiza ranking, reemplazos y deadlines, y el admin se concentra en decisiones finales (pagos y cierre).

### 4) Escalabilidad
Permite gestionar varios grupos y múltiples partidos sin que crezca la complejidad operativa en la misma proporción.

### 5) Experiencia moderna para jugadores
Login con Google, onboarding guiado y vista clara de partidos disponibles, estado de participación e historial personal.

---

## ¿Cómo se usa? (flujo simple)

### Paso 1: ingreso
El usuario entra con Google.

- Si ya tiene cuenta, accede directamente.
- Si es nuevo, completa onboarding (rol y posiciones preferidas).

### Paso 2: administración base (rol admin)
El admin crea un grupo (comunidad/torneo) y luego crea partidos dentro de ese grupo.

### Paso 3: inscripción de jugadores
Los jugadores se anotan en partidos abiertos. El sistema los ubica como titulares o suplentes según reglas automáticas.

### Paso 4: verificación previa
Al llegar al deadline, el partido pasa a verificación para revisar y completar estado de pago.

### Paso 5: cierre y armado
Cuando el partido está listo, el admin lo cierra y puede generar equipos de forma automática (con opción de rehacer).

### Paso 6: post partido
Al jugarse, se actualizan métricas de actividad del grupo y compromiso de usuarios.

---

## Modos de uso

## 1) Modo jugador (`player`)
Ideal para miembros de la comunidad que solo quieren participar en partidos.

Qué puede hacer:

- Registrarse e indicar posiciones preferidas.
- Ver partidos.
- Anotarse/desanotarse mientras el partido esté abierto.
- Consultar su perfil, historial y nivel de compromiso.

Valor percibido:

- Menos fricción para participar.
- Más claridad sobre su lugar en el partido.
- Mejor previsibilidad.

## 2) Modo administrador (`admin`)
Pensado para organizadores, capitanes o coordinadores.

Qué puede hacer:

- Crear/editar grupos.
- Crear/editar partidos.
- Gestionar jugadores (eliminar/reincorporar).
- Revisar y actualizar estado de pagos.
- Cerrar/reabrir partidos según reglas.
- Generar equipos automáticamente.

Valor percibido:

- Menor carga operativa.
- Más control.
- Menos conflictos por falta de reglas.

## 3) Modo operativo automático (sistema)
Es la capa “invisible” que mantiene consistencia.

Qué resuelve automáticamente:

- Cálculo de ranking.
- Promoción de suplentes ante bajas.
- Cambio de estado por deadlines/horarios.
- Actualización de estadísticas.

Valor percibido:

- Operación confiable.
- Menor dependencia de tareas manuales.
- Continuidad aunque cambie el admin.

---

## Características diferenciales

### Onboarding inteligente
Captura rol y preferencias desde el inicio, reduciendo errores de configuración.

### Gestión por estados del partido
Cada etapa tiene reglas claras, lo que profesionaliza la organización.

### Ranking y reemplazos automáticos
No depende del criterio del día: mantiene reglas consistentes en cada partido.

### Gestión de pagos integrada al flujo
El cierre del partido no queda suelto: se valida el estado de pago antes de avanzar.

### Armado de equipos reutilizable
Se pueden generar equipos y rehacerlos rápidamente para resolver la logística del juego.

### Historial y compromiso
Permite construir una cultura de responsabilidad dentro de la comunidad.

### Arquitectura preparada para crecer
Stack moderno (Next.js + Firebase) orientado a velocidad de iteración y escalabilidad.

---

## Casos de uso típicos

- **Club barrial o amateur**: centraliza organización semanal sin depender de mensajes dispersos.
- **Comunidad corporativa**: ordena eventos recurrentes y mejora participación.
- **Escuela/academia deportiva**: separa claramente coordinación (admin) de participación (players).
- **Liga social**: estandariza procesos y reduce fricciones entre jornadas.

---

## Beneficios concretos

- Menos tiempo organizando, más tiempo jugando.
- Reglas claras y trazables.
- Menos discusiones por cupos o reemplazos.
- Mejor experiencia para jugadores nuevos.
- Base sólida para sumar futuras mejoras (membresías, métricas avanzadas, notificaciones, etc.).
