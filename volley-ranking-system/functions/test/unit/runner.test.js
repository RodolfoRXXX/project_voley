"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

test("el runner nativo de Node 20 ejecuta pruebas CommonJS", () => {
  assert.equal(2 + 2, 4);
  assert.equal(SYNTHETIC_DATA.firestore.payload.kind, "synthetic");
  assert.match(SYNTHETIC_DATA.auth.email, /@example\.invalid$/);
});
