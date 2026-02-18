
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

    // Solo reaccionar si cambia el estado de pago
    if (before.pagoEstado === after.pagoEstado) return null;

    const matchId = after.matchId;
    if (!matchId) return null;

    const matchRef = db.collection("matches").doc(matchId);

    try {
      await db.runTransaction(async (tx) => {
        const matchSnap = await tx.get(matchRef);
        if (!matchSnap.exists) return;

        const match = matchSnap.data();

        // 🔒 Ya cerrado/bloqueado → no tocar
        if (match.lock === true) return;

        // Solo se puede cerrar desde "verificando"
        if (match.estado !== "verificando") return;

        // Traer TODAS las participations del match
        const participationsSnap = await tx.get(
          db
            .collection("participations")
            .where("matchId", "==", matchId)
        );

        const participations = participationsSnap.docs.map(d => d.data());

        // Separar titulares y suplentes
        const titulares = participations.filter(
          p => p.estado === "titular"
        );

        const suplentes = participations.filter(
          p => p.estado === "suplente"
        );

        // 1️⃣ Validar pagos de titulares
        const hayPagosPendientes = titulares.some(p =>
          p.pagoEstado !== "confirmado" &&
          p.pagoEstado !== "pospuesto"
        );

        if (hayPagosPendientes) return;

        // 2️⃣ Validar cupos completos

        // Titulares esperados (según posicionesObjetivo)
        const titularesEsperados = Object.values(
          match.posicionesObjetivo || {}
        ).reduce((acc, n) => acc + n, 0);

        // Suplentes esperados
        const suplentesEsperados = match.cantidadSuplentes ?? 0;

        if (
          titulares.length < titularesEsperados
        ) {
          console.log(
            `⛔ Match ${matchId} NO se cierra: faltan jugadores`
          );
          return;
        }

        // ✅ CIERRE REAL (pagos OK + cupos completos)
        tx.update(matchRef, {
          estado: "cerrado",
          lock: false,
        });

        console.log(`✅ Match ${matchId} cerrado automáticamente`);
      });
    } catch (err) {
      console.error(
        `🔥 Error cerrando match ${matchId}`,
        err
      );
    }

    return null;
  });
