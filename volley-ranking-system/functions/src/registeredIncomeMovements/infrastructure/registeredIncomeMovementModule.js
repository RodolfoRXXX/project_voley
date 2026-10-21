"use strict";

const { db } = require("../../firebase");
const { createFirestoreRegisteredIncomeMovementReader } = require("./firestoreRegisteredIncomeMovementReader");

module.exports = createFirestoreRegisteredIncomeMovementReader({ db });
