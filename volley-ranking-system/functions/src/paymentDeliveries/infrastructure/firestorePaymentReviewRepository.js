"use strict";
function createFirestorePaymentReviewRepository({ db }) { if (!db) throw new TypeError("db is required"); return Object.freeze({ grants: db.collection("groupCapabilityGrants"), slots: db.collection("groupCapabilityGrantSlots"), commandReceipts: db.collection("groupCapabilityCommandReceipts") }); }
module.exports = { createFirestorePaymentReviewRepository };
