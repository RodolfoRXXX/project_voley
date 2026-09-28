"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateListMyGroupMembershipHistoryPayload } = require("../src/memberships/application/membershipContract");
const { createMembershipCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createMembershipCallableHandler({
  operationName: "own-group-membership-history-list",
  operation: (identity, input) => service.listMyGroupMembershipHistory(identity, input),
  validatePayload: validateListMyGroupMembershipHistoryPayload,
}));
