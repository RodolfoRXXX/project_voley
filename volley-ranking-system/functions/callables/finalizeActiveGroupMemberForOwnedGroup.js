"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateFinalizeActiveGroupMemberPayload } = require("../src/memberships/application/membershipContract");
const { createAdministrativeFinalizationCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createAdministrativeFinalizationCallableHandler({
  operation: service.finalizeActiveGroupMemberForOwnedGroup,
  operationName: "administrative-finalization",
  validatePayload: validateFinalizeActiveGroupMemberPayload,
}));
