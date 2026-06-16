require("./src/events/bootstrap");

//const admin = require("firebase-admin");
//admin.initializeApp();

const envFlag = (name, defaultValue = true) => {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return String(raw).toLowerCase() === "true";
};

const ENABLE_ON_MATCH_DEADLINE = envFlag("ENABLE_ON_MATCH_DEADLINE", true);
const ENABLE_ON_MATCH_START = envFlag("ENABLE_ON_MATCH_START", true);
const ENABLE_ON_PENDING_ALERTS_MAINTENANCE = envFlag("ENABLE_ON_PENDING_ALERTS_MAINTENANCE", true);

// Exportar triggers directamente
exports.onUserCreate = require("./src/triggers/onUserCreate");
exports.onParticipationCreate = require("./src/triggers/onParticipationCreate");
exports.onParticipationUpdate = require("./src/triggers/onParticipationUpdate");
if (ENABLE_ON_MATCH_DEADLINE) {
  exports.onMatchDeadline = require("./src/triggers/onMatchDeadline");
}
if (ENABLE_ON_MATCH_START) {
  exports.onMatchStart = require("./src/triggers/onMatchStart");
}
exports.onMatchClose = require("./src/triggers/onMatchClose");
exports.onUserPendingAlertsSync = require("./src/triggers/onUserPendingAlertsSync");
exports.onGroupPendingAlertsSync = require("./src/triggers/onGroupPendingAlertsSync");
exports.onTournamentPendingAlertsSync = require("./src/triggers/onTournamentPendingAlertsSync");
exports.onTournamentRegistrationPendingAlertsSync = require("./src/triggers/onTournamentRegistrationPendingAlertsSync");
exports.onTournamentMatchPendingAlertsSync = require("./src/triggers/onTournamentMatchPendingAlertsSync");
exports.onTournamentTeamPendingAlertsSync = require("./src/triggers/onTournamentTeamPendingAlertsSync");
if (ENABLE_ON_PENDING_ALERTS_MAINTENANCE) {
  exports.onPendingAlertsMaintenance = require("./src/triggers/onPendingAlertsMaintenance");
}
exports.completeOnboarding = require("./callables/completeOnboarding");
exports.getFormaciones = require("./callables/getFormaciones");
exports.createMatch = require("./callables/createMatch");
exports.editMatch = require("./callables/editMatch");
exports.editGroup = require("./callables/editGroup");
exports.toggleGroupActivo = require("./callables/toggleGroupActivo");
exports.joinMatch = require("./callables/joinMatch");
exports.leaveMatch = require("./callables/leaveMatch");
exports.updatePagoEstado = require("./callables/updatePagoEstado");
exports.eliminarJugador = require("./callables/eliminarJugador");
exports.reincorporarJugador = require("./callables/reincorporarJugador");
exports.cerrarMatch = require("./callables/cerrarMatch");
exports.reabrirMatch = require("./callables/reabrirMatch");
exports.eliminarMatch = require("./callables/eliminarMatch");
exports.updatePreferredPositions = require("./callables/updatePreferredPositions");
exports.updateUserRole = require("./callables/updateUserRole");
exports.getValidPositions = require("./callables/getValidPositions");
exports.generarEquipos = require("./callables/generarEquipos");
exports.addGroupAdmin = require("./callables/addGroupAdmin");
exports.removeGroupAdmin = require("./callables/removeGroupAdmin");
exports.reorderGroupAdmins = require("./callables/reorderGroupAdmins");
exports.transferGroupOwnership = require("./callables/transferGroupOwnership");
exports.createTournament = require("./callables/createTournament");
exports.requestTournamentRegistration = require("./callables/requestTournamentRegistration");
exports.reviewTournamentRegistration = require("./callables/reviewTournamentRegistration");
exports.updateTournamentRegistrationPayment = require("./callables/updateTournamentRegistrationPayment");
exports.openTournamentRegistrations = require("./callables/openTournamentRegistrations");
exports.confirmFixture = require("./callables/confirmFixture");
exports.previewFixture = require("./callables/previewFixture");
exports.previewGroups = require("./callables/previewGroups");
exports.closeTournamentRegistrations = require("./callables/closeTournamentRegistrations");
exports.startTournament = require("./callables/startTournament");
exports.finalizeTournament = require("./callables/finalizeTournament");
exports.cancelTournament = require("./callables/cancelTournament");
exports.confirmGroups = require("./callables/confirmGroups");
exports.addTournamentAdmin = require("./callables/addTournamentAdmin");
exports.removeTournamentAdmin = require("./callables/removeTournamentAdmin");
exports.editTournament = require("./callables/editTournament");
exports.recordMatchResult = require("./callables/recordMatchResult");
exports.advancePhase = require("./callables/advancePhase");

exports.api = require("./src/httpApi");
