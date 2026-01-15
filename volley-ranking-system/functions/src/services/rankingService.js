// Implementación REAL de calcularPuntaje() y recalcularRaning()

const admin = require("firebase-admin");
const { FACTORES_POSICION } = require("../config/positions");

const db = admin.firestore();

/* ===========================
   Utils
=========================== */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* ===========================
   Puntaje
=========================== */

function calcularPuntaje(player, partidosTotalesSistema, posicion) {
  const factorPosicion = FACTORES_POSICION[posicion] || 0;

  const compromiso = player.estadoCompromiso || 0;
  const jugados = player.partidosJugados || 0;

  let factorRotacion = 1;
  if (partidosTotalesSistema > 0) {
    factorRotacion = 1 - jugados / partidosTotalesSistema;
    factorRotacion = clamp(factorRotacion, 0, 1);
  }

  const puntaje =
    factorPosicion * 3 +
    compromiso * 2 +
    factorRotacion * 2;

  return Number(puntaje.toFixed(2));
}

/* ===========================
   Ranking completo
=========================== */

async function recalcularRanking(matchId) {
  const matchSnap = await db.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) return;

  const match = matchSnap.data();
  const posicionesObjetivo = match.posicionesObjetivo;

  const cupos = { ...posicionesObjetivo };

  const participationsSnap = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("estado", "!=", "eliminado")
    .get();

  const participations = participationsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const statsSnap = await db
    .collection("groupStats")
    .doc("global")
    .get();

  const partidosTotales = statsSnap.data()?.partidosTotales || 0;

  const titulares = [];
  const suplentes = [];

  for (const p of participations) {
    const userSnap = await db.collection("users").doc(p.userId).get();
    const user = userSnap.data();

    let asignado = false;

    for (const posicion of user.posicionesPreferidas) {
      if (cupos[posicion] > 0) {
        const puntaje = calcularPuntaje(
          user,
          partidosTotales,
          posicion
        );

        titulares.push({
          id: p.id,
          posicionAsignada: posicion,
          puntaje,
          partidosJugados: user.partidosJugados || 0,
        });

        cupos[posicion]--;
        asignado = true;
        break;
      }
    }

    if (!asignado) {
      const puntaje = calcularPuntaje(
        user,
        partidosTotales,
        user.posicionesPreferidas[0]
      );

      suplentes.push({
        id: p.id,
        puntaje,
        partidosJugados: user.partidosJugados || 0,
      });
    }
  }

  titulares.sort((a, b) => {
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return a.partidosJugados - b.partidosJugados;
  });

  suplentes.sort((a, b) => {
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return a.partidosJugados - b.partidosJugados;
  });

  const batch = db.batch();

  titulares.forEach((p, index) => {
    batch.update(
      db.collection("participations").doc(p.id),
      {
        estado: "titular",
        posicionAsignada: p.posicionAsignada,
        rankingTitular: index + 1,
        rankingSuplente: null,
      }
    );
  });

  suplentes.forEach((p, index) => {
    batch.update(
      db.collection("participations").doc(p.id),
      {
        estado: "suplente",
        posicionAsignada: null,
        rankingSuplente: index + 1,
        rankingTitular: null,
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
