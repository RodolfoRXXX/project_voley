"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/groups/infrastructure/groupDiscoveryModule");
const { validateListExploreGroupsPayload } = require("../src/groups/application/groupDiscoveryContract");
const { createGroupCallableHandler } = require("../src/groups/infrastructure/groupCallable");
module.exports = functions.https.onCall(createGroupCallableHandler({ operation: service.listExploreGroups, validatePayload: validateListExploreGroupsPayload }));
