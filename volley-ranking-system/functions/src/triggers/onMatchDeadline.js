
// -------------------
// TRIGGER QUE GESTIONA EL CIERRE POR DEADLINE
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const nodemailer = require("nodemailer");
const { defineSecret } = require("firebase-functions/params");

const db = admin.firestore();

const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");


module.exports = functions.pubsub
  .schedule("every 30 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(
    {
      secrets: [gmailUser, gmailPass],
    },
    async () => {
    const now = admin.firestore.Timestamp.now();

    const matchesSnap = await db
      .collection("matches")
      .where("estado", "in", ["abierto", "verificado"])
      .where("nextDeadlineAt", "<=", now)
      .get();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser.value(),
          pass: gmailPass.value(),
        },
      });

      console.log("GMAIL USER:", gmailUser.value());

    if (matchesSnap.empty) {
      console.log("No hay matches para actualizar");
      return null;
    }

    for (const doc of matchesSnap.docs) {
      const matchRef = doc.ref;

      let shouldSendMail = false;
      let nextStage;
      let adminId;

      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(matchRef);
          if (!snap.exists) return;

          const match = snap.data();
          if (match.lock === true) return;

          const stage = match.deadlineStage ?? 1;
          if (stage >= 3) return;
          if (!match.horaInicio) return;

          nextStage = stage + 1;
          adminId = match.adminId;

          const horaMs = match.horaInicio.toDate().getTime();

          let hoursBefore;
          if (nextStage === 2) hoursBefore = 2;
          if (nextStage === 3) hoursBefore = 1;

          const nextDeadline = admin.firestore.Timestamp.fromMillis(
            horaMs - hoursBefore * 60 * 60 * 1000
          );

          tx.update(matchRef, {
            deadlineStage: nextStage,
            nextDeadlineAt: nextDeadline,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          shouldSendMail = true;
        });

        // -------- DESPUÉS DEL COMMIT --------

        if (shouldSendMail && adminId) {
          const userSnap = await db
            .collection("users")
            .doc(adminId)
            .get();

          if (userSnap.exists) {
            const adminUser = userSnap.data();

            if (adminUser.email) {
              await transporter.sendMail({
                from: gmailUser,
                to: adminUser.email,
                subject: "⚠️ Deadline alcanzado",
                text: `El match ${doc.id} alcanzó el deadline stage ${nextStage}.`,
              });

              console.log(
                `📧 Mail enviado a ${adminUser.email}`
              );
            }
          }
        }

        console.log(`⏰ Match ${doc.id} → stage ${nextStage}`);
      } catch (err) {
        console.error(
          `Error procesando match ${doc.id}`,
          err
        );
      }
    }

    return null;
  });
