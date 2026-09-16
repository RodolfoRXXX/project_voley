"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validatePrepareActiveGroupMemberFinalizationPayload } = require("../src/memberships/application/membershipContract");
const { createAdministrativeFinalizationCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");

module.exports = functions.https.onCall(createAdministrativeFinalizationCallableHandler({
  operation: service.prepareActiveGroupMemberFinalizationForOwnedGroup,
  operationName: "administrative-finalization-prepare",
  validatePayload: validatePrepareActiveGroupMemberFinalizationPayload,
}));
