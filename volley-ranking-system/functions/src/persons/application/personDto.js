"use strict";

function toMyPersonDto(person) {
  return Object.freeze({
    personId: person.personId,
    firstName: person.nombre,
    lastName: person.apellido,
    contactEmail: person.emailContacto,
  });
}

module.exports = { toMyPersonDto };
