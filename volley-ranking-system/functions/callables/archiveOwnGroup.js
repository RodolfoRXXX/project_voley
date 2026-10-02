"use strict";
const functions = require("firebase-functions/v1");
const groupService = require("../src/groups/infrastructure/groupModule");
const { validateArchiveOwnGroupPayload } = require("../src/groups/application/groupContract");
const { createGroupCallableHandler } = require("../src/groups/infrastructure/groupCallable");
module.exports = functions.https.onCall(createGroupCallableHandler({ operation: groupService.archiveOwnGroup, validatePayload: validateArchiveOwnGroupPayload }));
