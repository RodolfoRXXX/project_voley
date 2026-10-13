"use strict";
function createFirestorePaymentDeliveryRepository({ db }) { if (!db) throw new TypeError("db is required"); return Object.freeze({ deliveries: db.collection("paymentDeliveries"), commandReceipts: db.collection("paymentDeliveryCommandReceipts"), reversals: db.collection("paymentDeliveryReversals") }); }
module.exports = { createFirestorePaymentDeliveryRepository };
