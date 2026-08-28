"use strict";

function createFirestoreFixtureRegistry(db) {
  if (!db) throw new TypeError("Fixture registry requires Firestore");
  const references = new Map();

  function register(reference) {
    if (!reference || typeof reference.path !== "string") {
      throw new TypeError("Fixture registry requires a document reference");
    }
    references.set(reference.path, reference);
    return reference;
  }

  return Object.freeze({
    register,

    async set(reference, data) {
      register(reference);
      await reference.set(data);
    },

    async registerQuery(query) {
      const snapshot = await query.get();
      for (const document of snapshot.docs) register(document.ref);
      return snapshot.size;
    },

    async cleanup() {
      const pending = [...references.values()];
      for (let offset = 0; offset < pending.length; offset += 400) {
        const batch = db.batch();
        for (const reference of pending.slice(offset, offset + 400)) {
          batch.delete(reference);
        }
        await batch.commit();
      }
      references.clear();
    },

    paths() {
      return [...references.keys()].sort();
    },
  });
}

module.exports = { createFirestoreFixtureRegistry };
