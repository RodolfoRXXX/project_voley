//const admin = require("firebase-admin");
//admin.initializeApp();

// Exportar triggers directamente
exports.onUserCreate = require("./src/triggers/onUserCreate");
exports.onParticipationCreate = require("./src/triggers/onParticipationCreate");
exports.onParticipationUpdate = require("./src/triggers/onParticipationUpdate");
exports.onMatchDeadline = require("./src/triggers/onMatchDeadline");
exports.onMatchStart = require("./src/triggers/onMatchStart");
exports.onMatchClose = require("./src/triggers/onMatchClose");
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
exports.getValidPositions = require("./callables/getValidPositions");
exports.generarEquipos = require("./callables/generarEquipos");
