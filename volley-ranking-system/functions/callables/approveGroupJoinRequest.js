"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/groupJoinRequests/infrastructure/groupJoinRequestModule");
const { validateGroupJoinRequestDecisionPayload } = require("../src/groupJoinRequests/application/groupJoinRequestContract");
const { handler } = require("../src/groupJoinRequests/infrastructure/groupJoinRequestCallable");
module.exports = functions.https.onCall(handler({ operation: service.approveGroupJoinRequest, operationName: "approve", validatePayload: validateGroupJoinRequestDecisionPayload }));
