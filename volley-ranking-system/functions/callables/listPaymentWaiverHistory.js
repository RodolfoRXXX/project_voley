"use strict";
const functions = require("firebase-functions/v1");
const service = require("../src/payments/infrastructure/paymentModule");
const { createPaymentCallable } = require("../src/payments/infrastructure/paymentCallable");
const { validateListPaymentWaiverHistory } = require("../src/payments/application/paymentContract");
module.exports = functions.https.onCall(createPaymentCallable({ operation: service.listPaymentWaiverHistory, validate: validateListPaymentWaiverHistory }));
