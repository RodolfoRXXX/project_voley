"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/memberships/infrastructure/membershipModule");
const { validateCreateMembershipPayload } = require("../src/memberships/application/membershipContract");
const { createMembershipCallableHandler } = require("../src/memberships/infrastructure/membershipCallable");
module.exports = functions.https.onCall(createMembershipCallableHandler({ operation: service.createMyMembershipForOwnedGroup, validatePayload: validateCreateMembershipPayload }));
