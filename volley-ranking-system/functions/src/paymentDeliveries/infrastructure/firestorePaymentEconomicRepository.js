"use strict";
function createFirestorePaymentEconomicRepository({ db }) { if (!db) throw new TypeError("db is required"); const payments = db.collection("payments"); return Object.freeze({ payments, paymentRef: (paymentId) => payments.doc(paymentId), applicationRef: (paymentId, applicationId) => payments.doc(paymentId).collection("deliveryApplications").doc(applicationId) }); }
module.exports = { createFirestorePaymentEconomicRepository };
