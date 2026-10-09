"use strict";
const functions = require("firebase-functions/v1"); const service = require("../src/treasury/infrastructure/treasuryModule");
const { validateList } = require("../src/treasury/application/treasuryContract"); const { createTreasuryCallable } = require("../src/treasury/infrastructure/treasuryCallable");
module.exports = functions.https.onCall(createTreasuryCallable({ operation: service.listForOwner, validate: validateList }));
