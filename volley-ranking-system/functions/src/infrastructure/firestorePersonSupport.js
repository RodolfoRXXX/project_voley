"use strict";

const {
  ConcurrentModificationError,
  PersonPersistenceError,
  PersonServiceUnavailableError,
  SelfPersonBootstrapError,
} = require("../application/selfPersonBootstrapErrors");

function mapPersonPersistenceError(error) {
  if (error instanceof SelfPersonBootstrapError) return error;
  const code = String(error?.code || "").toUpperCase();
  if (code === "10" || code === "ABORTED") return new ConcurrentModificationError({ cause: error });
  if (code === "14" || code === "UNAVAILABLE") return new PersonServiceUnavailableError({ cause: error });
  return new PersonPersistenceError({ cause: error });
}

module.exports = { mapPersonPersistenceError };
