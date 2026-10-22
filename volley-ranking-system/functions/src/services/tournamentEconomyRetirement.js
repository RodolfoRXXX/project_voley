const functions = require("firebase-functions/v1");

const TOURNAMENT_ECONOMY_RETIRED_MESSAGE = "La gestión económica de Torneos fue retirada";
const TOURNAMENT_PAYMENT_RETIRED_MESSAGE = "La gestión económica de inscripciones de Torneo fue retirada";

function hasOwn(value, key) {
  return value !== null
    && typeof value === "object"
    && Object.prototype.hasOwnProperty.call(value, key);
}

function getTournamentEconomicFields(data) {
  const fields = [];
  if (hasOwn(data, "paymentForPlayer")) fields.push("paymentForPlayer");
  if (hasOwn(data, "settings") && hasOwn(data.settings, "paymentPerPlayer")) {
    fields.push("settings.paymentPerPlayer");
  }
  return fields;
}

function getTournamentRegistrationEconomicFields(data) {
  const fields = [];
  if (hasOwn(data, "paymentStatus")) fields.push("paymentStatus");
  if (hasOwn(data, "paidAmountInput")) fields.push("paidAmountInput");
  return fields;
}

function assertNoRetiredTournamentEconomy(fields) {
  if (!fields.length) return;
  throw new functions.https.HttpsError(
    "failed-precondition",
    TOURNAMENT_ECONOMY_RETIRED_MESSAGE,
    {
      code: "TOURNAMENT_ECONOMY_RETIRED",
      fields,
    }
  );
}

function tournamentPaymentRetiredError() {
  return new functions.https.HttpsError(
    "failed-precondition",
    TOURNAMENT_PAYMENT_RETIRED_MESSAGE,
    { code: "TOURNAMENT_REGISTRATION_PAYMENT_RETIRED" }
  );
}

module.exports = {
  TOURNAMENT_ECONOMY_RETIRED_MESSAGE,
  TOURNAMENT_PAYMENT_RETIRED_MESSAGE,
  assertNoRetiredTournamentEconomy,
  getTournamentEconomicFields,
  getTournamentRegistrationEconomicFields,
  tournamentPaymentRetiredError,
};
