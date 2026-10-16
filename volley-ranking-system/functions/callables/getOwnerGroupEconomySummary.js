"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/payments/infrastructure/paymentModule");
const { validateOwnerGroupEconomySummary } = require("../src/payments/application/paymentContract");
const { createPaymentCallable } = require("../src/payments/infrastructure/paymentCallable");

module.exports = functions.https.onCall(createPaymentCallable({ operation: service.getOwnerGroupEconomySummary, validate: validateOwnerGroupEconomySummary }));
