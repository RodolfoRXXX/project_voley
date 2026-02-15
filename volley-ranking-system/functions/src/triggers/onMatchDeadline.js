
// -------------------
// TRIGGER QUE GESTIONA EL CIERRE POR DEADLINE
// -------------------

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const nodemailer = require("nodemailer");

const db = admin.firestore();

module.exports = functions
  .runWith({
    secrets: ["GMAIL_USER", "GMAIL_PASS"],
  })
  .pubsub
  .schedule("every 30 minutes")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async () => {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      console.error("Faltan secrets GMAIL_USER/GMAIL_PASS");
      return null;
    }

    const now = admin.firestore.Timestamp.now();

    const matchesSnap = await db
      .collection("matches")
      .where("estado", "in", ["abierto", "verificando"])
      .where("nextDeadlineAt", "<=", now)
      .get();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      console.log("GMAIL USER:", gmailUser);

    if (matchesSnap.empty) {
      console.log("No hay matches para actualizar");
      return null;
    }

    for (const doc of matchesSnap.docs) {
      const matchRef = doc.ref;

      let shouldSendMail = false;
      let nextStage;
      let adminId;
      let groupId;

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
          groupId = match.groupId;

          const horaMs = match.horaInicio.toDate().getTime();

          let hoursBefore;
          if (nextStage === 2) hoursBefore = 2;
          if (nextStage === 3) hoursBefore = 1;

          const nextDeadline = admin.firestore.Timestamp.fromMillis(
            horaMs - hoursBefore * 60 * 60 * 1000
          );

          const updates = {
            deadlineStage: nextStage,
            nextDeadlineAt: nextDeadline,
          };

          if (match.estado === "abierto") {
            updates.estado = "verificando";
          }

          tx.update(matchRef, updates);

          shouldSendMail = true;
        });

        // -------- DESPUÉS DEL COMMIT --------

        if (shouldSendMail && adminId) {
          const userSnap = await db
            .collection("users")
            .doc(adminId)
            .get();

          const groupSnap = await db
            .collection("groups")
            .doc(groupId)
            .get();

          const groupName = groupSnap.exists
            ? groupSnap.data().nombre || "tu grupo"
            : "tu grupo";

          // --------------------------------------------------------------------------------------------

          // ESTO HAY QUE ACTUALIZARLO CON EL DOMINIO DEL SITIO
          const matchUrl = `https://tudominio.com/matches/${doc.id}`;

          // --------------------------------------------------------------------------------------------

          if (userSnap.exists) {
            const adminUser = userSnap.data()

            if (adminUser.email) {
              await transporter.sendMail({
                from: `"Volley Ranking" <${gmailUser}>`,
                to: adminUser.email,
                subject: `⏰ Deadline ${nextStage} – Partido en ${groupName}`,
                text: `Se alcanzó el Deadline ${nextStage} del partido en ${groupName}. Revisalo aquí: ${matchUrl}`,
                html: `
                <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
                  <div style="max-width:600px; margin:0 auto; background:white; border-radius:10px; padding:30px;">
                    
                    <h2 style="color:#1e3a8a; margin-bottom:10px;">
                      ⏰ Deadline ${nextStage} alcanzado
                    </h2>

                    <p style="font-size:16px; color:#333;">
                      El partido del grupo 
                      <strong>${groupName}</strong> 
                      alcanzó el <strong>Deadline ${nextStage}</strong>.
                    </p>

                    <p style="font-size:15px; color:#555;">
                      Es importante que revises el estado del match y tomes acción si es necesario.
                    </p>

                    <div style="text-align:center; margin:30px 0;">
                      <a href="${matchUrl}" 
                        style="
                          background:#2563eb;
                          color:white;
                          padding:12px 24px;
                          text-decoration:none;
                          border-radius:6px;
                          font-weight:bold;
                          display:inline-block;
                        ">
                        Ver partido
                      </a>
                    </div>

                    <hr style="border:none; border-top:1px solid #eee; margin:30px 0;" />

                    <p style="font-size:12px; color:#888; text-align:center;">
                      Este es un mensaje automático de Volley Ranking.
                    </p>

                  </div>
                </div>
                `,
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
