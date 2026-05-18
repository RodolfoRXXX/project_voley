// Callable que dispara la unión al match

const functions = require("firebase-functions/v1");
const { admin, db } = require("../src/firebase");
const { isGroupMember } = require("../src/services/groupAdminsService");

function assertMatchJoinable(match) {
  if (match.estado !== "abierto") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "El partido no está abierto para inscripciones"
    );
  }

  if (!match.horaInicio || typeof match.horaInicio.toMillis !== "function") {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "El partido no tiene una hora de inicio válida"
    );
  }

  if (match.horaInicio.toMillis() <= Date.now()) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "El partido ya comenzó o ya finalizó el período de inscripción"
    );
  }

  if (match.lock === true) {
    throw new functions.https.HttpsError(
      "aborted",
      "El ranking del partido se está actualizando. Intentá nuevamente en unos segundos"
    );
  }
}

module.exports = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "No autenticado"
    );
  }

  const matchId = typeof data?.matchId === "string" ? data.matchId.trim() : "";
  const userId = context.auth.uid;

  if (!matchId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "matchId requerido"
    );
  }

  const matchRef = db.collection("matches").doc(matchId);
  const participationRef = db.collection("participations").doc(`${matchId}_${userId}`);

  await db.runTransaction(async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) {
      throw new functions.https.HttpsError("not-found", "El partido no existe");
    }

    const match = matchSnap.data();
    assertMatchJoinable(match);

    if ((match.visibility || "group_only") === "group_only") {
      const groupId = typeof match.groupId === "string" ? match.groupId.trim() : "";
      if (!groupId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "El partido no está asociado a un grupo válido"
        );
      }

      const groupSnap = await tx.get(db.collection("groups").doc(groupId));

      if (!groupSnap.exists) {
        throw new functions.https.HttpsError("not-found", "El grupo no existe");
      }

      const group = groupSnap.data();
      const userSnap = await tx.get(db.collection("users").doc(userId));
      const isSystemAdmin = userSnap.exists && userSnap.data()?.roles === "admin";

      if (!isSystemAdmin && !isGroupMember(group, userId)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Este partido es solo para miembros del grupo"
        );
      }
    }

    const deterministicParticipationSnap = await tx.get(participationRef);
    if (deterministicParticipationSnap.exists) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El usuario ya está anotado"
      );
    }

    const existingSnap = await tx.get(
      db
        .collection("participations")
        .where("matchId", "==", matchId)
        .where("userId", "==", userId)
        .limit(1)
    );

    if (!existingSnap.empty) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "El usuario ya está anotado"
      );
    }

    tx.create(participationRef, {
      matchId,
      userId,
      estado: "pendiente",
      posicionAsignada: null,
      rankingTitular: null,
      rankingSuplente: null,
      puntaje: 0,
      pagoEstado: "pendiente",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, participationId: participationRef.id };
});
