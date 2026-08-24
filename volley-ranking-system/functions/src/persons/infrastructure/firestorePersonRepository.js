"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { hydratePerson } = require("../domain/person");

function createFirestorePersonRepository({ db }) {
  if (!db) throw new TypeError("db is required");
  return {
    newId() {
      return db.collection("personas").doc().id;
    },
    async getById(personId, transaction = null) {
      const reference = db.collection("personas").doc(personId);
      const snapshot = transaction ? await transaction.get(reference) : await reference.get();
      return snapshot.exists ? hydratePerson(snapshot.id, snapshot.data()) : null;
    },
    createInitial(transaction, person) {
      transaction.create(db.collection("personas").doc(person.personId), {
        nombre: person.nombre,
        apellido: person.apellido,
        emailContacto: person.emailContacto,
        createdAt: FieldValue.serverTimestamp(),
      });
    },
  };
}

module.exports = { createFirestorePersonRepository };
