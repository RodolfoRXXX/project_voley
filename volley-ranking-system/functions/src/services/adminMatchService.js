// functions/src/services/adminMatchService.js

const { initializeApp, getApps } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const { recalcularRanking } = require("./rankingService");

function calcularDeadline(horaInicio, stage = 1) {
  const horas = stage === 1 ? 3 : stage === 2 ? 2 : 1;

  return Timestamp.fromMillis(
    horaInicio.toMillis() - horas * 60 * 60 * 1000
  );
}

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
  posicionesBase,
  cantidadSuplentes,
}) {
  const posicionesObjetivo = {};

  for (const pos in posicionesBase) {
    posicionesObjetivo[pos] =
      posicionesBase[pos] * cantidadEquipos;
  }

  // 🕒 DEADLINE INICIAL
  const deadlineStage = 1;
  const nextDeadlineAt = calcularDeadline(horaInicio, deadlineStage);

  await db.collection("matches").doc(matchId).set({
    groupId,
    adminId,

    estado: "abierto",

    horaInicio,
    cantidadEquipos,
    formacion,
    posicionesObjetivo,
    cantidadSuplentes,

    // ⏱️ DEADLINES
    deadlineStage,
    nextDeadlineAt,

    // 🔒 LOCK
    lock: false,

    createdAt: FieldValue.serverTimestamp(),
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
      ...cambios
    });
  });

  // 🔁 recalcular ranking SIEMPRE
  await recalcularRanking(matchId);
}

/* =========================
   PAGOS
========================= */

async function actualizarPago(participationId, estado) {
  if (!["confirmado", "pendiente", "pospuesto"].includes(estado)) {
    throw new Error("Estado de pago inválido");
  }

  await db
    .collection("participations")
    .doc(participationId)
    .update({
      pagoEstado: estado,
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
   REINCORPORAR JUGADOR
========================= */

async function reincorporarJugador(participationId) {
  const ref = db.collection("participations").doc(participationId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const p = snap.data();
    if (p.estado !== "eliminado") return;

    tx.update(ref, {
      estado: "pendiente",
      posicionAsignada: null,
      rankingTitular: null,
      rankingSuplente: null,
      puntaje: 0,
    });
  });

  // 🔁 ranking se recalcula desde el trigger
}

/* =========================
   REABRIR MATCH
   (solo desde "verificando" y antes de horaInicio)
========================= */

async function reabrirMatch(matchId) {
  const ref = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const match = snap.data();
    const now = Timestamp.now();

    // ⛔ No reabrir si ya empezó el partido
    if (!match.horaInicio || now.toMillis() >= match.horaInicio.toMillis()) {
      throw new Error("No se puede reabrir después del inicio");
    }

    // ⛔ Solo desde verificando
    if (match.estado !== "verificando") {
      throw new Error("El match no está en estado verificando");
    }

    // 🔁 Avanzar etapa de deadline (máx 3)
    const currentStage = match.deadlineStage ?? 1;
    const nextStage = Math.min(currentStage + 1, 3);

    tx.update(ref, {
      estado: "abierto",
      deadlineStage: nextStage,
      nextDeadlineAt: calcularDeadline(match.horaInicio, nextStage),
      lock: false,
    });
  });
}

/* =========================
   CIERRE MANUAL / FINAL
========================= */

async function cerrarMatch(matchId, adminId) {
  const matchRef = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      throw new Error("Match no existe");
    }

    const match = matchSnap.data();

    // ⛔ Solo desde verificando
    if (match.estado !== "verificando") {
      throw new Error("Match no está en estado verificando");
    }

    /* =========================
       VALIDAR PAGOS
    ========================= */

    const participationsSnap = await tx.get(
      db.collection("participations")
        .where("matchId", "==", matchId)
        .where("estado", "==", "titular")
    );

    const hayPendientes = participationsSnap.docs.some((d) => {
      const p = d.data();
      return (
        p.pagoEstado !== "confirmado" &&
        p.pagoEstado !== "pospuesto"
      );
    });

    if (hayPendientes) {
      throw new Error("Aún hay pagos pendientes");
    }

    /* =========================
       CIERRE DEFINITIVO
    ========================= */

    tx.update(matchRef, {
      estado: "cerrado",
      lock: true,
      nextDeadlineAt: null,
    });
  });
}

module.exports = {
  crearMatch,
  actualizarMatch,
  reabrirMatch,
  actualizarPago,
  eliminarJugador,
  cerrarMatch,
  reincorporarJugador,
};
