// rankingService.js
// Implementación REAL y FINAL de ranking por grupo

const { db } = require("../firebase");
const { FACTORES_POSICION } = require("../config/factorPosicion");

/* ===========================
   Utils
=========================== */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* ===========================
   Puntaje (PURO)
=========================== */

function calcularPuntaje({
  estadoCompromiso,
  partidosJugadosGrupo,
  partidosTotalesGrupo,
  posicion,
}) {

  const factorPosicion = FACTORES_POSICION[posicion] || 0;

  let factorRotacion = 1;
  if (partidosTotalesGrupo > 0) {
    factorRotacion =
      1 - partidosJugadosGrupo / partidosTotalesGrupo;
    factorRotacion = clamp(factorRotacion, 0, 1);
  }

  const puntaje =
    factorPosicion * 3 +
    estadoCompromiso * 2 +
    factorRotacion * 2;

  return Number(puntaje.toFixed(2));
}

/* =========================
   Ranking completo
=========================== */

async function recalcularRanking(matchId) {
  console.log("📥 recalcularRanking llamado con:", matchId);

  /* =========================
     MATCH
  ========================= */

  const matchRef = db.collection("matches").doc(matchId);
  const matchSnap = await matchRef.get();

  console.log(
    "🧪 match existe? ",
    matchSnap.exists,
    "| path:",
    `matches/${matchId}`
  );

  if (!matchSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "El partido ya no existe"
    );
  }

  const match = matchSnap.data();

  if (match.estado !== "abierto") {
    console.log("⏸️ Match cerrado, no se recalcula ranking");
    return;
  }

  /* =========================
     GROUP
  ========================= */

  const groupSnap = await db
    .collection("groups")
    .doc(match.groupId)
    .get();

  const partidosTotalesGrupo = groupSnap.exists
    ? groupSnap.data().partidosTotales
    : 0;

  console.log("📊 partidosTotalesGrupo:", partidosTotalesGrupo);

  /* =========================
     CUPOS
  ========================= */

  const cupos = { ...match.posicionesObjetivo };

  /* =========================
     PARTICIPATIONS
  ========================= */

  const participationsSnap = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("estado", "!=", "eliminado")
    .get();

  console.log(
    "👥 participations encontradas:",
    participationsSnap.size
  );

  const titulares = [];
  const suplentes = [];

  /* =========================
     PROCESO DE RANKING
  ========================= */

  for (const doc of participationsSnap.docs) {
    const participation = { id: doc.id, ...doc.data() };

    // USER
    const userSnap = await db
      .collection("users")
      .doc(participation.userId)
      .get();

    if (!userSnap.exists) continue;

    const user = userSnap.data();

    // GROUP STATS
    const statsSnap = await db
      .collection("groupStats")
      .doc(`${match.groupId}_${participation.userId}`)
      .get();

    const partidosJugadosGrupo = statsSnap.exists
      ? statsSnap.data().partidosJugados
      : 0;

    let asignado = false;

    /* =========================
       INTENTO TITULAR
    ========================= */

    for (const posicion of user.posicionesPreferidas) {
      if (cupos[posicion] > 0) {

        const puntaje = calcularPuntaje({
          estadoCompromiso: user.estadoCompromiso,
          partidosJugadosGrupo,
          partidosTotalesGrupo,
          posicion
        });

        titulares.push({
          participationId: participation.id,
          posicionAsignada: posicion,
          puntaje,
          partidosJugados: partidosJugadosGrupo
        });

        cupos[posicion]--;
        asignado = true;
        break;
      }
    }

    /* =========================
       SUPLENTE
    ========================= */

    if (!asignado) {
      const posicionFallback = user.posicionesPreferidas[0];

      const puntaje = calcularPuntaje({
        estadoCompromiso: user.estadoCompromiso,
        partidosJugadosGrupo,
        partidosTotalesGrupo,
        posicionFallback
      });

      suplentes.push({
        participationId: participation.id,
        puntaje,
        partidosJugados: partidosJugadosGrupo
      });
    }
  }

  /* =========================
     ORDENAR
  ========================= */

  titulares.sort((a, b) => {
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return a.partidosJugados - b.partidosJugados;
  });

  suplentes.sort((a, b) => {
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return a.partidosJugados - b.partidosJugados;
  });

  /* =========================
     PERSISTIR
  ========================= */

  const batch = db.batch();

  titulares.forEach((p, index) => {
    batch.update(
      db.collection("participations").doc(p.participationId),
      {
        estado: "titular",
        posicionAsignada: p.posicionAsignada,
        rankingTitular: index + 1,
        rankingSuplente: null,
        puntaje: p.puntaje
      }
    );
  });

  suplentes.forEach((p, index) => {
    batch.update(
      db.collection("participations").doc(p.participationId),
      {
        estado: "suplente",
        posicionAsignada: null,
        rankingSuplente: index + 1,
        rankingTitular: null,
        puntaje: p.puntaje
      }
    );
  });

  await batch.commit();

  console.log(`🔁 Ranking recalculado para match ${matchId}`);
}

module.exports = {
  calcularPuntaje,
  recalcularRanking,
};