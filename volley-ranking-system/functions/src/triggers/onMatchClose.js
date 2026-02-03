
// -------------------
// TRIGGER QUE GESTIONA EL CIERRE AUTOMATICO DEL MATCH
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.firestore
  .document("participations/{id}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.pagoEstado === after.pagoEstado) return null;

    const matchId = after.matchId;
    if (!matchId) return null;

    const matchRef = db.collection("matches").doc(matchId);

    try {
      await db.runTransaction(async (tx) => {
        const matchSnap = await tx.get(matchRef);
        if (!matchSnap.exists) return;

        const match = matchSnap.data();

        // 🔒 ya bloqueado → no tocar
        if (match.lock === true) return;

        if (match.estado !== "verificando") return;

        const participationsSnap = await tx.get(
          db
            .collection("participations")
            .where("matchId", "==", matchId)
            .where("estado", "==", "titular")
        );

        const hayPendientes = participationsSnap.docs.some((doc) => {
          const p = doc.data();
          return (
            p.pagoEstado !== "confirmado" &&
            p.pagoEstado !== "pospuesto"
          );
        });

        if (hayPendientes) return;

        // ✅ CIERRE REAL
        tx.update(matchRef, {
          estado: "cerrado",
          lock: true,
        });

        console.log(`✅ Match ${matchId} cerrado correctamente`);
      });
    } catch (err) {
      console.error(
        `🔥 Error cerrando match ${matchId}`,
        err
      );
    }

    return null;
  });

