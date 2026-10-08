"use strict";

const { hydratePerson } = require("../domain/person");

function createPaymentPersonPresentationCapability({ db }) {
  if (!db) throw new TypeError("db is required");
  return Object.freeze({ async get(unitOfWork, personId) { try { const snapshot = await unitOfWork.get(db.collection("personas").doc(personId)); if (!snapshot.exists) return Object.freeze({ status: "UNAVAILABLE" }); const person = hydratePerson(snapshot.id, snapshot.data()); return Object.freeze({ status: "AVAILABLE", firstName: person.nombre, lastName: person.apellido }); } catch (_) { return Object.freeze({ status: "UNAVAILABLE" }); } } });
}

module.exports = { createPaymentPersonPresentationCapability };
