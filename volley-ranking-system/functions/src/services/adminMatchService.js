// services/adminMatchService.js

const admin = require("firebase-admin");
const db = admin.firestore();
const { recalcularRanking } = require("./rankingService");

/* =========================
   CREAR MATCH
========================= */

async function crearMatch({
  matchId,
  groupId,
  adminId,
  horaInicio,
  cantidadEquipos,
  formacion,
  posicionesBase, // ej: { central:2, armador:1, opuesto:1, punta:2 }
  cantidadSuplentes,
}) {
  const posicionesObjetivo = {};

  // multiplicar por cantidadEquipos
  for (const pos in posicionesBase) {
    posicionesObjetivo[pos] =
      posicionesBase[pos] * cantidadEquipos;
  }

  await db.collection("matches").doc(matchId).set({
    groupId,
    adminId,
    estado: "abierto",
    horaInicio,
    cantidadEquipos,
    formacion,
    posicionesObjetivo,
    cantidadSuplentes,
    deadlineProcesado: false,
    lock: false,
    rankingCerrado: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/* =========================
   EDITAR MATCH
========================= */

async function actualizarMatch(matchId, cambios) {
  const ref = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Match no existe");

    const match = snap.data();

    if (match.estado !== "abierto") {
      throw new Error("Match no editable");
    }

    tx.update(ref, {
      ...cambios,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // 🔁 recalcular ranking SIEMPRE
  await recalcularRanking(matchId);
}

/* =========================
   REABRIR MATCH (antes de horaInicio)
========================= */

async function reabrirMatch(matchId) {
  const ref = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const match = snap.data();
    const now = admin.firestore.Timestamp.now();

    if (now.toMillis() >= match.horaInicio.toMillis()) {
      throw new Error("No se puede reabrir");
    }

    tx.update(ref, {
      estado: "abierto",
      deadlineProcesado: false,
    });
  });
}

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
  const ref = db.collection("participations").doc(participationId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const p = snap.data();

    if (p.estado === "eliminado") return;

    tx.update(ref, {
      estado: "eliminado",
    });
  });

  // 🔁 el reemplazo lo dispara onParticipationUpdate
}

/* =========================
   CIERRE MANUAL (opcional)
========================= */

async function cerrarMatch(matchId) {
  const matchRef = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) throw new Error("Match no existe");

    const match = matchSnap.data();

    if (match.estado !== "pagos_pendientes") {
      throw new Error("Match no está listo para cerrar");
    }

    const participationsSnap = await tx.get(
      db.collection("participations")
        .where("matchId", "==", matchId)
        .where("estado", "==", "titular")
    );

    const pendientes = participationsSnap.docs.filter((d) => {
      const p = d.data();
      return (
        p.pagoEstado !== "confirmado" &&
        p.pagoEstado !== "pospuesto"
      );
    });

    if (pendientes.length > 0) {
      throw new Error("Aún hay pagos pendientes");
    }

    tx.update(matchRef, {
      estado: "cerrado",
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

module.exports = {
  crearMatch,
  actualizarMatch,
  reabrirMatch,
  confirmarPago,
  marcarPagoPospuesto,
  eliminarJugador,
  cerrarMatch,
};
