// -------------------
// GENERACION DE EQUIPOS - Service
// -------------------

const admin = require("firebase-admin");
const functions = require("firebase-functions/v1");

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
  const teamsRef = db.collection("teams").doc(matchId); // 1 team por match

  await db.runTransaction(async (tx) => {
    /* =========================
       MATCH
    ========================= */

    const matchSnap = await tx.get(matchRef);

    if (!matchSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "El match no existe"
      );
    }

    const match = matchSnap.data();
    const now = new Date();

    if (match.estado !== "cerrado") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El match debe estar cerrado para generar equipos"
      );
    }

    if (match.horaInicio?.toDate && match.horaInicio.toDate() <= now) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El match ya comenzó"
      );
    }

    const { cantidadEquipos, posicionesObjetivo } = match;

    if (!cantidadEquipos || !posicionesObjetivo) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Configuración del match incompleta"
      );
    }

    /* =========================
       TITULARES
    ========================= */

    const participationsSnap = await tx.get(
      db.collection("participations")
        .where("matchId", "==", matchId)
        .where("estado", "==", "titular")
    );

    const titulares = participationsSnap.docs.map((d) =>
      d.data()
    );

    /* =========================
       AGRUPAR POR POSICIÓN
    ========================= */

    const jugadoresPorPosicion = {};

    for (const p of titulares) {
      if (!p.posicionAsignada) continue;

      if (!jugadoresPorPosicion[p.posicionAsignada]) {
        jugadoresPorPosicion[p.posicionAsignada] = [];
      }

      jugadoresPorPosicion[p.posicionAsignada].push(p.userId);
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

    const equipos = Array.from(
      { length: cantidadEquipos },
      (_, i) => ({
        nombre: `Equipo ${String.fromCharCode(65 + i)}`, // A, B, C
        jugadores: [],
      })
    );

    for (const pos in posicionesObjetivo) {
      const total = posicionesObjetivo[pos];
      const porEquipo = Math.floor(total / cantidadEquipos);
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
       GUARDAR
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

module.exports = {
  generarEquipos,
};
