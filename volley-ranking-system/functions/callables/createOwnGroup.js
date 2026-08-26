"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/groups/infrastructure/groupModule");
const { validateCreateGroupPayload } = require("../src/groups/application/groupContract");
const { createGroupCallableHandler } = require("../src/groups/infrastructure/groupCallable");
module.exports = functions.https.onCall(createGroupCallableHandler({ operation: service.createOwnGroup, validatePayload: validateCreateGroupPayload }));
