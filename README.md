# project_voley

🧠 VISIÓN GENERAL DEL SISTEMA (ordenado)

Voy a dividir el sistema en:

Modelo mental (qué existe)

Estados y eventos (qué puede pasar)

Responsabilidades del sistema vs admin

Roadmap de implementación (en qué orden codificar)

Después, en el próximo mensaje, recién ahí empezamos a mapear tu código actual contra esto y ver qué ajustar.

1️⃣ MODELO DEL SISTEMA (entidades claras)
👤 USER

Existe una sola vez en el sistema.

Campos clave:

user {
  role: "player" | "admin"
  posicionesPreferidas: ["central", "punta", "opuesto"]
}


🔹 El user no sabe de matches
🔹 El user no tiene ranking
🔹 El user no tiene pagos

🏐 GROUP

Es el “torneo recurrente”.

group {
  nombre
  descripcion
  creadoPor
  activo: true | false
  partidosTotales
}


📌 El group acumula historia
📌 partidosTotales se incrementa automáticamente (Evento 8)

// ----- ACTUALIZACION -----

// GROUP
- Los grupos ahora tienen integrantes
- El grupo cuando se genera puede ser público o privado
     - Público: se ve en el listado de grupos general
     - Privado: NO se ve en el listado de grupo general salvo que seas integrante

    joinApproval: true/false - Indica si el grupo necesita confirmación de un admin para aceptar a un integrante nuevo
               - Público: true: confirmción de un admin / false: un integrante se une directamente
               - Privado: el admin te agrega directamente y al integrante le llega el mail de aviso del grupo al que fue agregado

- Detalle de grupo
  - (Public) - Solo informativo(no permite modificaciones)
    - Información del grupo
      - Player: Ve los admins del grupo
      - Admin: Ve los admins del grupo y hay un botón que le permite ser admin del grupo(pero debe esperar confirmación del owner)
    - Partidos creados
    - Integrantes
  
  - (protected) - Aqui se pueden hacer cambios
    - Información del grupo
      - Admin: Solo el owner puede editar el listado de admins
      - Partidos creados - permite crear más
      - Integrantes - permite aceptar integrantes o agregar nuevos

// MATCH
- Un match puede ser:
    - group_only: solo los integrantes del grupo pueden verlo y unirse
    - public: cualquiera, sea integrante o no del grupo puede unirse


📅 MATCH

Es un evento puntual.

match {
  groupId
  creadoPor
  estado: "abierto" | "verificando" | "jugado" | "cerrado" | "cancelado"
  horaInicio: Timestamp
  posicionesObjetivo: {
    central: 2,
    armador: 1,
    punta: 2
  }
  deadlineProcesado: boolean
}


⚠️ El match no guarda jugadores
⚠️ El match no calcula ranking
⚠️ El match no sabe de pagos individuales

🧾 PARTICIPATION (pieza clave)

👉 Este documento representa a un jugador en un match

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


📌 Todo lo importante pasa acá
📌 El ranking es SOLO un orden, no una lógica

👥 TEAM (post cierre)
team {
  matchId
  jugadores: [userId]
}


Se genera después del cierre
Puede rehacerse sin tocar participations

2️⃣ EVENTOS DEL SISTEMA (orden cronológico real)
🟢 EVENTO 1 — Login / Onboarding
Flujo:

Login Google

Si user existe → entra

Si no existe → onboarding:

rol

posicionesPreferidas (ordenadas)

✔️ Resultado: user creado

🟢 EVENTO 2 — Admin crea group

Estado inicial: activo

partidosTotales = 0

🟢 EVENTO 3 — Admin crea match

Estado inicial:

estado: "abierto"
deadlineProcesado: false

🟢 EVENTO 4 — Player se une a match

👉 Este evento dispara TODO el ranking

Pasos claros:

Crear participation (estado: pendiente)

Calcular puntaje

Ejecutar:

recalcularRanking(matchId)


📌 Regla clave

El ranking SIEMPRE se recalcula desde cero
No se “ajusta”, se reconstruye

🟢 EVENTO 5 — Cambios manuales del admin (match abierto)

El admin puede:

eliminar jugadores

forzar recálculo

Cada eliminación:

→ recalcularRanking(matchId)


📌 El sistema:

sube suplentes automáticamente

respeta orden y posicionesPreferidas

🟡 EVENTO 6 — Deadline automático (cron)

Condición:

horaInicio - 3hs


Acciones:

estado → verificando

deadlineProcesado → true

NO toca ranking

🟡 EVENTO 7 — Gestión de pagos (admin)

Admin decide por cada titular:

confirmado

pospuesto

eliminado

Si elimina:

→ sistema busca reemplazo
→ estadoPago del reemplazo = pospuesto


📌 El match NO se cierra solo

🔴 EVENTO 7.5 — Condición de cierre

El sistema permite cerrar SOLO si:

no hay estadoPago = pendiente

no hay decisiones abiertas

🔴 EVENTO 8 — Cierre del match
estado: "jugado"


Admin puede:

generar teams (random)

rehacerlos

🔵 EVENTO 9 — Inicio del partido (horaInicio)

Automático:

group.partidosTotales += 1

3️⃣ RESPONSABILIDADES (esto es clave)
🤖 SISTEMA AUTOMÁTICO

ranking

reemplazos

deadlines

incrementos automáticos

validaciones

👨‍💼 ADMIN

elimina jugadores

decide pagos

cierra match

genera equipos

❗ El sistema nunca decide pagos
❗ El admin nunca ordena rankings

4️⃣ ROADMAP DE CÓDIGO (orden correcto)

Para no romper nada, el orden ideal es:

🔹 FASE 1 — Núcleo

recalcularRanking(matchId) ✔️ (ya casi listo)

calcularPuntaje()

seed estable

🔹 FASE 2 — Admin

eliminarTitularYReemplazar()

reglas de acceso admin

🔹 FASE 3 — Cron

deadline automático

verificador de pagos

🔹 FASE 4 — Post partido

generarTeams()

sumar partidosTotales



Lineamientos principales

1) el home contiene el boton de iniciar sesion con google, si el usuario ya tiene cuenta entonces ingresó y puede anotarse a los matches, si no está registrado, salta una venta onboarding que pregunta el rol que desea(player|admin) y las tres posiciones preferidas por orden de importancia(central|armador|opuesto|punta|libero) y luego de registrarse le permite unirse a los matches.

2) un admin crea groups que muestra el estado activo del mismo, quien lo creo, su descripcion, el nombre, ademas de q se guarda en la variable partidosTotales la cantidad de partidos jugados de ese grupo. Desde un group se pueden crear matches, estos matches dicen quien lo creo, su estado(abierto|verificando| cerrado | jugado|cancelado), a que group pertenecen, su horaInicio(de esta informacion se saca la fecha y la hora de inicio), un array con las posicionesObjetivo, que son las posiciones de jugadores necesarias y que cantidad, el deadlineProcesado(true|false) que indica si ya paso el deadline o no.

3) cuando un jugador se une a un match, el sistema crea un documento en la coleccion participations con su estado(pendiente|titular|suplente), el matchId, el puntaje(que ya vimos como lo calcula), la posicionAsignada(el sistema la asigna de acuerdo a las opciones preferidas del jugador, si la primera opción es central, busca en el listado de titulares si hay lugares libres para central, si hay entonces lo ubica en el ranking de acuerdo a su puntaje, si no hay, busca en la segunda opción o en la tercera, en el caso de que las tres posiciones preferidas del jugador esten completas en el ranking de titulares, se lo coloca como suplente en una posicion de ranking de suplentes q depende de su puntaje), y el ranking, ya sea este titular o suplente. Despues hay otras variables como pagoEstado(pendiente|pospuesto|confirmado, q esta informacion la define el admin.

4) el sistema va armando la lista de titulares y suplentes de acuerdo al puntaje que obtuvieron y eso se ve por su posición en el ranking de titulares o de suplentes. Cuando un jugador se elimina del listado o el admin lo elimina, entonces el sistema automaticamente debería buscar en los suplentes un reemplazo para esa posición(si la hubiera, caso contrario la deja vacía), la forma en que deberia buscarla es en la lista de suplentes es recorriendo el array de posicionesPreferidas de cada suplente hasta que encuentre uno q tenga esa posicion como elegida, claro q el listado de suplentes se recorre desde aquellos que esta mas arriba en el ranking hasta los de mas abajo.

5) el admin tiene el poder para (sobre un match abierto) eliminar jugadores y cuando elimina a alguno, el sistema automaticamente sube a un suplente de acuerdo a la logica ya mencionada.

6) Cuando se alcance el deadline y se cierre el match, el admin tiene la libertad de generar equipos con el listado, estos equipos se forman al azar con una funcion y puede rehacerlos las veces que quiera. los teams se crean en la coleccion teams.

7) el match se cierra cuando se pasa del deadline y cuando la condicion de pago de todos en el listado es de pago confirmado o pago pospuesto.

8) cuando se alcance la fecha y hora de la variable horaInicio entonces el sistema suma +1 a la variable del group "partidosTotales".



1️⃣ LÓGICA FINAL DEL CIERRE DE MATCH (VERSIÓN CONSOLIDADA)
🧩 Estados reales del match

El estado del match sí necesita más de 3 valores, y está bien así:

abierto
verificando
cerrado
jugado
cancelado


verificando NO es solo visual, tiene reglas propias.

🔓 Estado: ABIERTO
Qué se puede

Jugadores:

unirse

desunirse

Admin:

editar match

eliminar jugadores

cerrar match (manual)

eliminar match

Cómo se sale

📅 Automáticamente por deadline (3h / 2h / 1h)

👑 Manualmente si el admin intenta cerrar

➡️ En ambos casos:

estado → verificando

🔎 Estado: VERIFICANDO
Cómo se entra

Deadline alcanzado (automático)

Admin intenta cerrar match manualmente

Qué se puede

👑 Solo admin:

eliminar jugadores

revisar pagos

cerrar match (si pagos OK)

volver a abrir el match

eliminar el match

Qué NO se puede

❌ jugadores:

unirse

desunirse

❌ edición del match

Eliminación en verificando

Admin elimina un titular

El sistema:

busca suplente válido

recalcula puntaje

recalcula ranking

promueve suplente a titular

✔️ exactamente como ya tenés hoy

Condición para cerrar

✔️ TODOS los jugadores deben tener:

pagoEstado === confirmado || pospuesto


Si no se cumple:

❌ no se puede cerrar

se muestra el motivo

🔒 Estado: CERRADO
Qué implica

Lista definitiva de jugadores

No hay modificaciones

Se habilita:

Armar equipos

Transición automática

⏰ Cuando llega horaInicio:

cerrado → jugado

🏁 Estado: JUGADO
Qué pasa

El match ocurrió

El sistema:

suma +1 a:

users.estadoCompromiso

groups.partidosTotales

No hay más acciones

❌ Estado: cancelado
Qué implica

El partido no se juega

No se borra el match

No se recalcula nada

No se suma compromiso

Estado final

Para verificar los secrets guardados de las credenciales de google para el correo

## Nota sobre deprecación de `functions.config()` (marzo 2026)

Si ves este error al usar Firebase CLI:

`DEPRECATION NOTICE: Action required before March 2026`

no corresponde a este proyecto (ya usa `secrets` + `process.env` para correo),
sino a comandos legacy como `firebase functions:config:*`.

En este repo **no usar** `functions:config:set/get/unset`.
Si querés actualizar la contraseña de Gmail, este comando legacy va a fallar:

```bash
firebase functions:config:set gmail.pass="TU_APP_PASSWORD"
```

Debés actualizar el secret con:

```bash
firebase functions:secrets:set GMAIL_PASS
firebase deploy --only functions
```

Para setear usuario + contraseña desde cero:

```bash
firebase functions:secrets:set GMAIL_USER
firebase functions:secrets:set GMAIL_PASS
firebase deploy --only functions
```

Verificación rápida:

```bash
firebase functions:secrets:access GMAIL_USER
firebase functions:secrets:access GMAIL_PASS
```
