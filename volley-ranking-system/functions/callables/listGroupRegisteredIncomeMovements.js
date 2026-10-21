"use strict";

const functions = require("firebase-functions/v1");
const service = require("../src/registeredIncomeMovements/infrastructure/registeredIncomeMovementModule");
const { validateRegisteredIncomeMovementQuery } = require("../src/registeredIncomeMovements/application/registeredIncomeMovementContract");
const { createRegisteredIncomeMovementCallable } = require("../src/registeredIncomeMovements/infrastructure/registeredIncomeMovementCallable");

module.exports = functions.https.onCall(createRegisteredIncomeMovementCallable({
  operation: service.list,
  validate: validateRegisteredIncomeMovementQuery,
}));
