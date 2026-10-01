"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateUpdateMembershipCargoForOwnedGroupPayload } = require("../src/memberships/application/membershipContract");
const { createMembershipCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createMembershipCallableHandler({
  operation: (identity, input) => service.updateMembershipCargoForOwnedGroup(identity, input),
  operationName: "membership-cargo-update",
  validatePayload: validateUpdateMembershipCargoForOwnedGroupPayload,
}));
