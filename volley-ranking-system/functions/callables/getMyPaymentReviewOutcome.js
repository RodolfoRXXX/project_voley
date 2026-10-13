"use strict";
const functions = require("firebase-functions/v1"); const service = require("../src/paymentDeliveries/infrastructure/paymentDeliveryModule"); const { validateAdminGet } = require("../src/paymentDeliveries/application/paymentDeliveryContract"); const { createPaymentDeliveryCallable } = require("../src/paymentDeliveries/infrastructure/paymentDeliveryCallable");
module.exports = functions.https.onCall(createPaymentDeliveryCallable({ operation: service.getReviewOutcome, validate: validateAdminGet }));
