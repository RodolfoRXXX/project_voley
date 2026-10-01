"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateGetMembershipCargoForOwnedGroupPayload } = require("../src/memberships/application/membershipContract");
const { createMembershipCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createMembershipCallableHandler({
  operation: (identity, input) => service.getMembershipCargoForOwnedGroup(identity, input),
  operationName: "membership-cargo-get",
  validatePayload: validateGetMembershipCargoForOwnedGroupPayload,
}));
