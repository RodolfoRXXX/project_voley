"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const contract = require("../../src/administrativePersonLinks/application/administrativePersonLinkContract");
const projection = require("../../src/administrativePersonLinks/infrastructure/administrativePersonLinkCandidateProjection");

test("IUX-11B limita páginas y valida comandos cerrados", () => {
  assert.deepEqual(contract.validateList({}), { bucket: "PENDING", pageSize: 10, cursor: undefined });
  assert.deepEqual(contract.validateList({ bucket: "REJECTED", pageSize: 1 }), { bucket: "REJECTED", pageSize: 1, cursor: undefined });
  assert.throws(() => contract.validateList({ pageSize: 11 }));
  assert.throws(() => contract.validateRecognize({ candidateRef: "x" }));
});

test("IUX-11B revisa sólo cambios efectivos de correo y conserva revisión nominal", () => {
  assert.equal(projection.initialEmailRevision(null), 0);
  assert.equal(projection.initialEmailRevision("A@Example.Invalid"), 1);
  assert.equal(projection.nextEmailRevision("A@Example.Invalid", "a@example.invalid", 4), 4);
  assert.equal(projection.nextEmailRevision("a@example.invalid", "b@example.invalid", 4), 5);
  assert.equal(projection.nextEmailRevision("a@example.invalid", null, 4), 5);
  assert.equal(projection.nextEmailRevision(null, "a@example.invalid", 4), 5);
});

test("IUX-11B presenta la participación más reciente", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/administrativePersonLinks/infrastructure/administrativePersonLinkModule.js"), "utf8");
  assert.match(source, /where\("personId", "==", current\.reference\.personId\)\.orderBy\("fechaIngreso", "desc"\)\.limit\(1\)/);
});
