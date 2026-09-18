const functions = require("firebase-functions/v1");
const {
  syncAcceptedTournamentAlertsForGroup,
  syncPendingRegistrationAlertsForGroup,
} = require("../services/tournamentPendingAlertsService");

module.exports = functions.firestore
  .document("groups/{groupId}")
  .onWrite(async (change, context) => {
    const beforeGroup = change.before.exists ? change.before.data() : null;
    const afterGroup = change.after.exists ? change.after.data() : null;
    if (beforeGroup?.schemaVersion === 1 || afterGroup?.schemaVersion === 1) return null;
    const groupId = context.params.groupId;

    await Promise.all([
      syncAcceptedTournamentAlertsForGroup(groupId, beforeGroup, afterGroup),
      syncPendingRegistrationAlertsForGroup(groupId, beforeGroup, afterGroup),
    ]);

    return null;
  });
