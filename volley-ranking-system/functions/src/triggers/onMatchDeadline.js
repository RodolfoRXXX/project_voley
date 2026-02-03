
// -------------------
// TRIGGER QUE GESTIONA EL DEADLINE
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

exports.onMatchDeadline = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    let matchesSnap;
    try {
      matchesSnap = await db
        .collection("matches")
        .where("estado", "==", "abierto")
        .where("nextDeadlineAt", "<=", now)
        .get();
    } catch (err) {
      console.error("❌ Error consultando matches", err);
      return null; // aborta el run entero
    }

    for (const doc of matchesSnap.docs) {
      const matchRef = doc.ref;

      try {
        const match = doc.data();

        if (match.lock === true) continue;

        const stage = match.deadlineStage ?? 1;
        if (stage > 3) continue;

        await db.runTransaction(async (tx) => {
          const snap = await tx.get(matchRef);
          if (!snap.exists) return;

          const fresh = snap.data();
          if (fresh.estado !== "abierto") return;
          if (fresh.lock === true) return;

          tx.update(matchRef, {
            estado: "verificando",
          });
        });

        console.log(
          `⏰ Match ${doc.id} → verificando (stage ${stage})`
        );
      } catch (err) {
        console.error(
          `🔥 Error procesando match ${doc.id}`,
          err
        );
        // NO throw → sigue con los demás
      }
    }

    return null;
  });
