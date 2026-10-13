"use strict";
const { db } = require("../../firebase");
const { createFirestorePaymentDeliveryStore } = require("./firestorePaymentDeliveryStore");
module.exports = createFirestorePaymentDeliveryStore({ db });
