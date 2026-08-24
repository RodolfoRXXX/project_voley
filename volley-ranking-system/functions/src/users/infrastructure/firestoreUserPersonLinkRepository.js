"use strict";

const { hydrateUserForPersonLink } = require("../domain/user");

function createFirestoreUserPersonLinkRepository({ db }) {
  if (!db) throw new TypeError("db is required");
  return {
    async getById(userId, transaction = null) {
      const reference = db.collection("users").doc(userId);
      const snapshot = transaction ? await transaction.get(reference) : await reference.get();
      return snapshot.exists ? hydrateUserForPersonLink(snapshot.data()) : null;
    },
    setInitialPersonLink(transaction, userId, user) {
      transaction.update(db.collection("users").doc(userId), { personaId: user.personaId });
    },
  };
}

module.exports = { createFirestoreUserPersonLinkRepository };
