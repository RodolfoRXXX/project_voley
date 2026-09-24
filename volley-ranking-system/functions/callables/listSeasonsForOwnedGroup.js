"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/groups/infrastructure/seasonModule");
const { validateListSeasonsForOwnedGroupPayload } = require("../src/groups/application/seasonContract");
const { createSeasonCallableHandler } = require("../src/groups/infrastructure/seasonCallable");

module.exports = functions.https.onCall(createSeasonCallableHandler({
  operation: service.listSeasonsForOwnedGroup,
  validatePayload: validateListSeasonsForOwnedGroupPayload,
}));
