// triggers/onParticipationCreate.js

const functions = require("firebase-functions");
const { recalcularRanking } = require("../services/rankingService");

module.exports = functions.firestore
  .document("participations/{id}")
  .onCreate(async (snap) => {
    const participation = snap.data();

    console.log(
      "🆕 Participation creada:",
      participation.userId,
      "match:",
      participation.matchId
    );

    if (!participation.matchId) return null;

    await recalcularRanking(participation.matchId);

    return null;
  });
