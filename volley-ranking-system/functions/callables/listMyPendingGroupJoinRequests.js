"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/groupJoinRequests/infrastructure/groupJoinRequestModule");
const { validateListMyGroupJoinRequestsPayload } = require("../src/groupJoinRequests/application/groupJoinRequestContract");
const { handler } = require("../src/groupJoinRequests/infrastructure/groupJoinRequestCallable");
module.exports = functions.https.onCall(handler({ operation: service.listMyPendingGroupJoinRequests, operationName: "list-mine", validatePayload: validateListMyGroupJoinRequestsPayload }));
