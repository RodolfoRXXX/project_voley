"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const {
  AccountAlreadyExistsError,
} = require("../application/accountErrors");

function isAlreadyExistsError(error) {
  return error?.code === 6
    || error?.code === "6"
    || error?.code === "already-exists"
    || error?.code === "ALREADY_EXISTS";
}

function createFirestoreUserRepository({ db }) {
  if (!db) throw new TypeError("db is required");

  return {
    async create(userId, user) {
      try {
        await db.collection("users").doc(userId).create({
          nombre: user.nombre,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        if (isAlreadyExistsError(error)) {
          throw new AccountAlreadyExistsError({ cause: error });
        }
        throw error;
      }
    },

    async getById(userId) {
      const snapshot = await db.collection("users").doc(userId).get();
      return snapshot.exists ? snapshot.data() : null;
    },
  };
}

module.exports = {
  createFirestoreUserRepository,
  isAlreadyExistsError,
};
