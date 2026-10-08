"use strict";

const { db } = require("../../firebase");
const { createFirestorePaymentStore } = require("./firestorePaymentStore");

module.exports = createFirestorePaymentStore({ db });
