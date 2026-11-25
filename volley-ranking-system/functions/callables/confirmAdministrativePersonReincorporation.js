"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/administrativePersons/infrastructure/administrativePersonModule");
const { handler } = require("../src/administrativePersons/infrastructure/administrativePersonCallable");
const { validateConfirmAdministrativeReincorporationPayload } = require("../src/administrativePersons/application/administrativePersonContract");
module.exports = functions.https.onCall(handler(service.confirmReincorporation, validateConfirmAdministrativeReincorporationPayload));
