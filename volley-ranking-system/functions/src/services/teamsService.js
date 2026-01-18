// services/teamsService.js

const admin = require("firebase-admin");
const db = admin.firestore();

/* =========================
   UTILIDADES
========================= */

function shuffle(array) {
  return array
    .map((v) => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.v);
}

/* =========================
   GENERAR / REHACER EQUIPOS
========================= */

async function generarEquipos(matchId, groupId) {
  const matchRef = db.collection("matches").doc(matchId);
  const teamsRef = db.collection("teams").doc(matchId); // 1 teams por match

  await db.runTransaction(async (tx) => {
    /* =========================
       MATCH
    ========================= */

    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) throw new Error("Match no existe");

    const match = matchSnap.data();
    const now = new Date();

    if (match.horaInicio.toDate() <= now) {
      throw new Error(
        "El match ya comenzó, no se pueden generar ni rehacer equipos"
      );
    }

    const { cantidadEquipos, posicionesObjetivo } = match;

    if (
      !cantidadEquipos ||
      typeof posicionesObjetivo !== "object"
    ) {
      throw new Error("Configuración del match incompleta");
    }

    /* =========================
       TITULARES
    ========================= */

    const participationsSnap = await tx.get(
      db.collection("participations")
        .where("matchId", "==", matchId)
        .where("estado", "==", "titular")
    );

    const titulares = participationsSnap.docs.map((d) => d.data());

    /* =========================
       AGRUPAR POR POSICIÓN
    ========================= */

    const jugadoresPorPosicion = {};

    for (const p of titulares) {
      if (!p.posicionAsignada) continue;

      if (!jugadoresPorPosicion[p.posicionAsignada]) {
        jugadoresPorPosicion[p.posicionAsignada] = [];
      }

      jugadoresPorPosicion[p.posicionAsignada].push({
        userId: p.userId,
        posicion: p.posicionAsignada,
      });
    }

    // Shuffle por posición
    for (const pos in jugadoresPorPosicion) {
      jugadoresPorPosicion[pos] = shuffle(
        jugadoresPorPosicion[pos]
      );
    }

    /* =========================
       ARMAR EQUIPOS
    ========================= */

    const equipos = Array.from({ length: cantidadEquipos }).map(
      (_, i) => ({
        nombre: `Equipo ${i + 1}`,
        jugadores: [],
      })
    );

    for (const pos in posicionesObjetivo) {
      const totalNecesarios = posicionesObjetivo[pos];
      const porEquipo = Math.floor(
        totalNecesarios / cantidadEquipos
      );

      const disponibles = jugadoresPorPosicion[pos] || [];
      let index = 0;

      for (let ronda = 0; ronda < porEquipo; ronda++) {
        for (let e = 0; e < cantidadEquipos; e++) {
          if (disponibles[index]) {
            equipos[e].jugadores.push(disponibles[index]);
            index++;
          }
        }
      }
    }

    /* =========================
       GUARDAR TEAMS
    ========================= */

    tx.set(teamsRef, {
      matchId,
      groupId,
      createdAt:
        admin.firestore.FieldValue.serverTimestamp(),
      equipos,
    });
  });
}

/* =========================
   REHACER EQUIPOS (ADMIN)
========================= */

async function rehacerEquipos(matchId, groupId) {
  return generarEquipos(matchId, groupId);
}

module.exports = {
  generarEquipos,
  rehacerEquipos,
};
