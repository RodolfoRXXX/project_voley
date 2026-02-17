
// -------------------
// adminMatchService - gestión de matches
// -------------------

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
  const horasPorStage = {
    0: 3,
    1: 2,
    2: 1,
  };

  const horas = horasPorStage[stage] ?? 1;

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
  const deadlineStage = 0;
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
  let updated = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error("MATCH_NOT_FOUND");
    }

    const match = snap.data();

    if (match.estado !== "abierto") {
      throw new Error("MATCH_NOT_EDITABLE");
    }

    const cambiosReales = {};

    Object.entries(cambios).forEach(([key, nextValue]) => {
      const currentValue = match[key];

      if (
        currentValue &&
        nextValue &&
        typeof currentValue?.toMillis === "function" &&
        typeof nextValue?.toMillis === "function"
      ) {
        if (currentValue.toMillis() !== nextValue.toMillis()) {
          cambiosReales[key] = nextValue;
        }
        return;
      }

      if (
        key === "posicionesObjetivo" &&
        JSON.stringify(currentValue || {}) ===
          JSON.stringify(nextValue || {})
      ) {
        return;
      }

      if (currentValue !== nextValue) {
        cambiosReales[key] = nextValue;
      }
    });

    if (Object.keys(cambiosReales).length === 0) {
      return;
    }

    /* =========================
      Recalcular deadline si cambia horaInicio
    ========================= */

    if (cambiosReales.horaInicio) {
      const stageActual = match.deadlineStage ?? 1;

      cambiosReales.nextDeadlineAt = calcularDeadline(
        cambiosReales.horaInicio,
        stageActual
      );
    }

    tx.update(ref, cambiosReales);
    updated = true;

  });

  if (updated) {
    await recalcularRanking(matchId);
  }

  return updated;
}

/* =========================
   PAGOS
========================= */

async function actualizarPago(participationId, estado) {
  if (!["confirmado", "pendiente", "pospuesto"].includes(estado)) {
    const err = new Error("Estado de pago inválido");
    err.code = "INVALID_PAGO_ESTADO";
    throw err;
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
    if (!snap.exists) {
      const err = new Error("Participation no existe");
      err.code = "PARTICIPATION_NOT_FOUND";
      throw err;
    }

    const p = snap.data();

    if (p.estado === "eliminado") {
      const err = new Error("El jugador ya fue eliminado");
      err.code = "PARTICIPATION_ALREADY_DELETED";
      throw err;
    }

    tx.update(ref, {
      estado: "eliminado",
    });
  });
}

/* =========================
   REINCORPORAR JUGADOR
========================= */

async function reincorporarJugador(participationId) {
  const ref = db.collection("participations").doc(participationId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error("Participation no existe");
      err.code = "PARTICIPATION_NOT_FOUND";
      throw err;
    }

    const p = snap.data();

    if (p.estado !== "eliminado") {
      const err = new Error("El jugador no está eliminado");
      err.code = "PARTICIPATION_NOT_ELIMINATED";
      throw err;
    }

    tx.update(ref, {
      estado: "pendiente",
      posicionAsignada: null,
      rankingTitular: null,
      rankingSuplente: null,
      puntaje: 0,
    });
  });
}

/* =========================
   REABRIR MATCH
   (solo desde "verificando" y antes de horaInicio)
========================= */

async function reabrirMatch(matchId) {
  const ref = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      const err = new Error("El partido no existe");
      err.code = "MATCH_NOT_FOUND";
      throw err;
    }

    const match = snap.data();
    const now = Timestamp.now();

    // ⛔ ya empezó
    if (!match.horaInicio || now.toMillis() >= match.horaInicio.toMillis()) {
      const err = new Error("No se puede reabrir después del inicio");
      err.code = "MATCH_ALREADY_STARTED";
      throw err;
    }

    // ⛔ solo desde verificando
    if (match.estado !== "verificando") {
      const err = new Error("El partido no está en estado verificando");
      err.code = "INVALID_MATCH_STATE";
      throw err;
    }

    // ✅ Solo reabrir, sin tocar deadlines
    tx.update(ref, {
      estado: "abierto",
      lock: false,
    });
  });
}

/* =========================
   CIERRE MANUAL / FINAL
========================= */

async function cerrarMatch(matchId) {
  const matchRef = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists) {
      const err = new Error("El partido no existe");
      err.code = "MATCH_NOT_FOUND";
      throw err;
    }

    const match = snap.data();

    /* =========================
       PASO 1 → ABIERTO → VERIFICANDO
    ========================= */
    if (match.estado === "abierto") {
      tx.update(matchRef, {
        estado: "verificando",
        lock: false,
      });
      return;
    }

    /* =========================
       PASO 2 → VERIFICANDO → CERRADO
    ========================= */
    if (match.estado !== "verificando") {
      const err = new Error(
        "El partido no se puede cerrar desde el estado actual"
      );
      err.code = "INVALID_MATCH_STATE";
      throw err;
    }

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
      const err = new Error(
        "Aún hay pagos pendientes en titulares"
      );
      err.code = "PENDING_PAYMENTS";
      throw err;
    }

    tx.update(matchRef, {
      estado: "cerrado",
      lock: true
    });
  });
}

/* =========================
   CANCELAR MATCH
   (soft delete)
========================= */

async function eliminarMatch(matchId) {
  const ref = db.collection("matches").doc(matchId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      const err = new Error("El partido no existe");
      err.code = "MATCH_NOT_FOUND";
      throw err;
    }

    const match = snap.data();

    if (match.estado === "jugado") {
      const err = new Error(
        "No se puede eliminar un partido ya jugado"
      );
      err.code = "MATCH_ALREADY_PLAYED";
      throw err;
    }

    if (match.estado === "cancelado") {
      return;
    }

    tx.update(ref, {
      estado: "cancelado",
      lock: true,
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
  eliminarMatch,
};
