// Trigger: player se anota

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { calcularPuntaje } = require("../services/rankingService");

const db = admin.firestore();

module.exports = functions.firestore
  .document("participations/{id}")
  .onCreate(async (snap) => {
    const participation = snap.data();

    const userSnap = await db
      .collection("users")
      .doc(participation.userId)
      .get();

    const user = userSnap.data();

    const statsSnap = await db
      .collection("groupStats")
      .doc("global")
      .get();

    const partidosTotales = statsSnap.data().partidosTotales || 0;

    // acá luego va el cálculo completo + asignación titular/suplente
    const puntaje = calcularPuntaje(
      user,
      partidosTotales,
      user.posicionesPreferidas[0]
    );

    await snap.ref.update({
      puntajeCalculado: puntaje
    });
  });
