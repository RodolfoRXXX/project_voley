// schedulers/onMatchDeadline.js
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

const db = admin.firestore();

exports.onMatchDeadline = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const matchesSnap = await db
      .collection("matches")
      .where("estado", "==", "abierto")
      .where("nextDeadlineAt", "<=", now)
      .get();

    for (const doc of matchesSnap.docs) {
      const match = doc.data();
      const matchRef = doc.ref;

      // 🔒 no tocar si está bloqueado
      if (match.lock === true) continue;

      const stage = match.deadlineStage ?? 1;

      // 🛑 si ya agotó los deadlines
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
    }

    return null;
  });
