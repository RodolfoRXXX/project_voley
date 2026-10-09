"use strict";
const { db } = require("../../firebase");
const { createFirestoreTreasuryStore } = require("./firestoreTreasuryStore");
module.exports = createFirestoreTreasuryStore({ db });
