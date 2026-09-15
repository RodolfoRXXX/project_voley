"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateListActiveGroupMembersForOwnedGroupPayload } = require("../src/memberships/application/membershipContract");
const { createOwnerActiveRosterCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createOwnerActiveRosterCallableHandler({
  operation: (identity, input) => service.listActiveGroupMembersForOwnedGroup(identity, input),
  validatePayload: validateListActiveGroupMembersForOwnedGroupPayload,
}));
