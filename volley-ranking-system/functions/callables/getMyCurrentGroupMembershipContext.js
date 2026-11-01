"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateGetMembershipPayload } = require("../src/memberships/application/membershipContract");
const { createMembershipCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createMembershipCallableHandler({
  operationName: "current-membership-context-get",
  operation: (identity, input) => service.getMyCurrentGroupMembershipContext(identity, input),
  validatePayload: validateGetMembershipPayload,
}));
