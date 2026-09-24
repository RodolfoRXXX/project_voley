"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/groups/infrastructure/seasonModule");
const { validateUpdateSeasonPayload } = require("../src/groups/application/seasonContract");
const { createSeasonCallableHandler } = require("../src/groups/infrastructure/seasonCallable");
module.exports = functions.https.onCall(createSeasonCallableHandler({ operation: service.updateSeason, validatePayload: validateUpdateSeasonPayload }));
