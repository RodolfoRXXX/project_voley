"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateGetMembershipPayload } = require("../src/memberships/application/membershipContract");
const { createMembershipCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createMembershipCallableHandler({
  operationName: "owner-active-roster-total-reconcile",
  operation: (identity, input) => service.reconcileActiveGroupMemberTotalForOwnedGroup(identity, input),
  validatePayload: validateGetMembershipPayload,
}));
