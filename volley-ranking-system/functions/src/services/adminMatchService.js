// services/adminMatchService.js

const admin = require("firebase-admin");
const db = admin.firestore();

/* =========================
   PAGOS
========================= */

async function confirmarPago(participationId) {
  await db
    .collection("participations")
    .doc(participationId)
    .update({
      pagoEstado: "confirmado",
    });
}

async function marcarPagoPospuesto(participationId) {
  await db
    .collection("participations")
    .doc(participationId)
    .update({
      pagoEstado: "pospuesto",
    });
}

/* =========================
   ELIMINAR JUGADOR
========================= */

async function eliminarJugador(participationId) {
  await db
    .collection("participations")
    .doc(participationId)
    .update({
      estado: "eliminado",
    });
}

/* =========================
   CIERRE MANUAL (opcional)
========================= */

async function cerrarMatch(matchId) {
  const matchRef = db.collection("matches").doc(matchId);

  const participationsSnap = await db
    .collection("participations")
    .where("matchId", "==", matchId)
    .where("estado", "==", "titular")
    .get();

  const pendientes = participationsSnap.docs.filter((d) => {
    const p = d.data();
    return p.pagoEstado !== "confirmado" && p.pagoEstado !== "pospuesto";
  });

  if (pendientes.length > 0) {
    throw new Error("Aún hay pagos pendientes");
  }

  await matchRef.update({
    estado: "cerrado",
  });
}

module.exports = {
  confirmarPago,
  marcarPagoPospuesto,
  eliminarJugador,
  cerrarMatch,
};
