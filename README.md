🏐 Project Voley

Sistema de gestión inteligente de partidos y grupos de vóley.

🧠 1. Visión General del Sistema

El sistema está dividido en:

Modelo de datos (qué existe)

Eventos del sistema (qué puede pasar)

Responsabilidades (qué hace el sistema vs qué hace el admin)

Roadmap técnico

🏗 2. Modelo del Sistema
👤 USER

Entidad única del sistema.

user {
  role: "player" | "admin"
  posicionesPreferidas: ["central", "punta", "opuesto"]
}

✔ No guarda matches
✔ No guarda ranking
✔ No guarda pagos

El usuario es identidad + preferencias.

🏐 GROUP

Representa un torneo recurrente.

group {
  nombre
  descripcion
  creadoPor
  activo: boolean
  partidosTotales: number
  visibility: "public" | "private"
  joinApproval: boolean
  memberIds: string[]
  adminIds: string[]
  pendingRequestIds: string[]
}
Visibilidad

Public

Visible en listado general

Puede requerir aprobación (joinApproval)

Private

Solo visible para integrantes

Admin agrega directamente

Usuario recibe mail de aviso

📄 Detalle del Grupo
Public View (informativo)

Info del grupo

Admins

Partidos creados

Integrantes

Protected View (requiere pertenecer)

Editar info (solo owner gestiona admins)

Crear matches

Aceptar integrantes

Agregar nuevos integrantes

📅 MATCH

Evento puntual dentro de un grupo.

match {
  groupId
  creadoPor
  estado: "abierto" | "verificando" | "cerrado" | "jugado" | "cancelado"
  horaInicio: Timestamp
  posicionesObjetivo: {
    central: 2,
    armador: 1,
    punta: 2
  }
  deadlineProcesado: boolean
  visibility: "group_only" | "public"
}

✔ No guarda jugadores
✔ No calcula ranking
✔ No maneja pagos

🧾 PARTICIPATION (Entidad Clave)

Representa un jugador en un match.

participation {
  userId
  matchId

  estado: "pendiente" | "titular" | "suplente" | "eliminado"

  posicionAsignada: "central" | null

  puntaje: number

  rankingTitular: number | null
  rankingSuplente: number | null

  estadoPago: "pendiente" | "pospuesto" | "confirmado"
}

📌 Todo ocurre acá
📌 El ranking siempre se reconstruye desde cero

👥 TEAM

Se genera después del cierre.

team {
  matchId
  jugadores: [userId]
}

Puede rehacerse sin tocar participations.

🔄 3. Eventos del Sistema (Orden Real)
🟢 1. Login / Onboarding

Login Google

Si no existe user:

rol

posicionesPreferidas (ordenadas)

Resultado → user creado

🟢 2. Admin crea Group

Estado inicial:

activo = true

partidosTotales = 0

🟢 3. Admin crea Match

Estado inicial:

estado: "abierto"
deadlineProcesado: false
🟢 4. Player se une al Match

Proceso:

Crear participation (pendiente)

Calcular puntaje

Ejecutar:

recalcularRanking(matchId)

⚠ Regla clave:

El ranking SIEMPRE se recalcula desde cero.

🟢 5. Admin modifica Match (abierto)

Puede:

eliminar jugadores

forzar recálculo

Cada cambio → recalcularRanking()

🟡 6. Deadline Automático (cron)

Condición:

horaInicio - 3hs

Acciones:

estado → verificando

deadlineProcesado → true

No toca ranking.

🟡 7. Gestión de Pagos (admin)

Admin define por titular:

confirmado

pospuesto

eliminado

Si elimina:

sistema busca reemplazo

nuevo titular → estadoPago = pospuesto

🔴 7.5 Condición de Cierre

Se puede cerrar SOLO si:

✔ no hay pagos pendientes
✔ no hay decisiones abiertas

🔒 8. Cierre del Match

Estado → cerrado

Se habilita:

generar equipos

rehacer equipos

🏁 9. Inicio del Partido

Cuando llega horaInicio:

group.partidosTotales += 1
🔐 4. Máquina de Estados del Match
🟢 ABIERTO

Jugadores:

unirse

desunirse

Admin:

editar

eliminar jugadores

cerrar manualmente

Transición:
→ verificando

🟡 VERIFICANDO

Solo admin puede:

eliminar jugadores

revisar pagos

cerrar

reabrir

Jugadores:
❌ no pueden unirse/desunirse

Condición cierre:

estadoPago === confirmado || pospuesto
🔒 CERRADO

Lista definitiva.

Se pueden generar equipos.

Transición automática:
→ jugado

🏁 JUGADO

El partido ocurrió.

Sistema:

incrementa compromiso

incrementa partidosTotales

Estado final.

❌ CANCELADO

No se juega.
No se suma nada.
Estado final.

🤖 5. Responsabilidades
Sistema Automático

ranking

reemplazos

deadlines

validaciones

incrementos automáticos

Admin

elimina jugadores

decide pagos

cierra match

genera equipos

⚠ El sistema nunca decide pagos
⚠ El admin nunca ordena rankings

🛣 6. Roadmap Técnico
Fase 1 — Núcleo

recalcularRanking()

calcularPuntaje()

seed estable

Fase 2 — Admin

eliminarTitularYReemplazar()

reglas de acceso

Fase 3 — Cron

deadline automático

verificador de pagos

Fase 4 — Post Partido

generarTeams()

sumar partidosTotales

🏠 7. Flujo Principal del Usuario

Home → Login Google

Si nuevo → onboarding

Puede unirse a matches

Admin crea groups

Groups crean matches

Sistema organiza ranking automáticamente

Admin gestiona pagos y cierre

Sistema suma historial

🔐 Secrets Firebase (Correo)

Este proyecto usa Firebase Secrets + process.env

NO usar:

firebase functions:config:set

Usar:

firebase functions:secrets:set GMAIL_USER
firebase functions:secrets:set GMAIL_PASS
firebase deploy --only functions

Verificar:

firebase functions:secrets:access GMAIL_USER
firebase functions:secrets:access GMAIL_PASS