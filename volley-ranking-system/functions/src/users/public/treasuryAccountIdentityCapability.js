"use strict";

function validId(value) { return typeof value === "string" && Boolean(value.trim()) && value === value.trim() && !value.includes("/"); }
function accountCompatible(snapshot) {
  const data = snapshot.data();
  return snapshot.exists && validId(snapshot.id) && typeof data?.email === "string" && Boolean(data.email.trim());
}
function compatible(snapshot) {
  return accountCompatible(snapshot) && validId(snapshot.data()?.personaId);
}

function createTreasuryAccountIdentityCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  return Object.freeze({
    async getCanonicalAccount({ unitOfWork, accountId }) {
      const snapshot = await unitOfWork.get(db.collection("users").doc(accountId));
      if (!snapshot.exists) return Object.freeze({ status: "MISSING" });
      if (!accountCompatible(snapshot)) return Object.freeze({ status: "INCOMPATIBLE" });
      return Object.freeze({ status: "READY", accountId });
    },
    async getOwnCanonicalPerson({ unitOfWork, accountId }) {
      const snapshot = await unitOfWork.get(db.collection("users").doc(accountId));
      if (!snapshot.exists || !Object.hasOwn(snapshot.data() || {}, "personaId")) return Object.freeze({ status: "MISSING" });
      if (!compatible(snapshot)) return Object.freeze({ status: "INCOMPATIBLE" });
      return Object.freeze({ status: "READY", accountId, personId: snapshot.data().personaId });
    },
    async resolveUniqueAccountForPerson({ unitOfWork, personId }) {
      const snapshot = await unitOfWork.get(db.collection("users").where("personaId", "==", personId).limit(2));
      if (snapshot.empty) return Object.freeze({ status: "MISSING" });
      if (snapshot.size !== 1) return Object.freeze({ status: "AMBIGUOUS" });
      if (!compatible(snapshot.docs[0]) || snapshot.docs[0].data().personaId !== personId) return Object.freeze({ status: "INCOMPATIBLE" });
      return Object.freeze({ status: "READY", accountId: snapshot.docs[0].id, personId });
    },
  });
}

module.exports = { createTreasuryAccountIdentityCapability };
