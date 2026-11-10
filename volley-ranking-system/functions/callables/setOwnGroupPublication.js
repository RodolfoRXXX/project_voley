"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/groups/infrastructure/groupDiscoveryModule");
const { validateSetOwnGroupPublicationPayload } = require("../src/groups/application/groupDiscoveryContract");
const { createGroupCallableHandler } = require("../src/groups/infrastructure/groupCallable");
module.exports = functions.https.onCall(createGroupCallableHandler({ operation: service.setOwnGroupPublication, validatePayload: validateSetOwnGroupPublicationPayload }));
