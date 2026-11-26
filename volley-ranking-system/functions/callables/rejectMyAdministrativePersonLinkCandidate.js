"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/administrativePersonLinks/infrastructure/administrativePersonLinkModule");
const { handler } = require("../src/administrativePersonLinks/infrastructure/administrativePersonLinkCallable");
const { validateReject } = require("../src/administrativePersonLinks/application/administrativePersonLinkContract");
module.exports = functions.https.onCall(handler(service.reject, validateReject));
