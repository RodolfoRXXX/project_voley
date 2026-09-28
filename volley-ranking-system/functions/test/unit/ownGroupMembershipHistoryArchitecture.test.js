"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("E2-19 conserva consulta exacta, readOnly, un intento y cero writers/lineage", () => {
  const reader = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreOwnGroupMembershipHistoryReader.js");
  for (const pattern of [/where\("personId", "==", personId\)/, /orderBy\("fechaIngreso", "desc"\)/, /FieldPath\.documentId\(\), "desc"/, /startAfter\(/, /limit\(pageSize \+ 1\)/, /\{ readOnly: true \}/, /metrics\.attempts !== 1/, /lineage: 0/]) assert.match(reader, pattern);
  assert.doesNotMatch(reader, /where\("estado"|previousMembershipId\)|activeMembershipGuards|membershipLifecycleGuards|receipts|intents|matches|tournaments/);
  assert.doesNotMatch(reader, /transaction\.(create|set|update|delete)\(/);
});

test("E2-19 registra callable e índice mínimo exacto sin estado", () => {
  assert.match(read("volley-ranking-system/functions/index.js"), /exports\.listMyGroupMembershipHistory/);
  const indexes = JSON.parse(read("volley-ranking-system/firestore.indexes.json"));
  const wanted = [{ fieldPath: "personId", mode: "ASCENDING" }, { fieldPath: "fechaIngreso", mode: "DESCENDING" }];
  assert.equal(indexes.indexes.filter((index) => index.collectionGroup === "memberships" && index.queryScope === "COLLECTION" && JSON.stringify(index.fields) === JSON.stringify(wanted)).length, 1);
  assert.deepEqual(indexes.fieldOverrides, []);
  assert.match(read("volley-ranking-system/firebase.json"), /firestore\.indexes\.json/);
  assert.match(read("volley-ranking-system/firebase.test.json"), /firestore\.indexes\.json/);
});

test("Rules siguen deny-all para roots, Períodos y guards", () => {
  const rules = read("volley-ranking-system/firestore.rules");
  for (const collection of ["memberships", "activeMembershipGuards", "membershipLifecycleGuards"]) {
    assert.match(rules, new RegExp(`match \/${collection}.*[\\s\\S]{0,180}allow read, write: if false`));
  }
  assert.match(rules, /validityPeriods[\s\S]{0,180}allow read, write: if false/);
});

test("frontend E2-19 es callable-only, accesible y no contiene acciones", () => {
  const ui = read("volley-ranking-frontend/src/components/memberships/OwnGroupMembershipHistorySection.tsx");
  const service = read("volley-ranking-frontend/src/services/membershipsService.ts");
  assert.doesNotMatch(`${ui}\n${service}`, /firebase\/firestore|collection\(|getDoc\(|setDoc\(|updateDoc\(/);
  for (const marker of ["Historial de grupos", "Grupos que integrás", "Todavía no tenés pertenencias registradas", "Cargar más", "Reintentar", "aria-live", "aria-busy", "tabIndex={-1}", "min-h-11", "sm:grid-cols-2", "generation.current", "inFlight.current", "rowKey", "<time", "Origen:", "Alta inicial", "Renovación intertemporada", "Período de vigencia", "Períodos de vigencia"]) assert.match(ui, new RegExp(marker));
  assert.match(ui, /item\.continuity === "RENEWAL" \? "Renovación intertemporada" : "Alta inicial"/);
  assert.match(ui, /item\.validityPeriodCount === 1 \? "Período de vigencia" : "Períodos de vigencia"/);
  assert.doesNotMatch(ui, /·\s*(Renovación|Incorporación inicial)|\{item\.validityPeriodCount\}\s*\{item\.validityPeriodCount === 1 \? "vigencia"/);
  assert.doesNotMatch(ui, />\s*(Finalizar|Reactivar|Renovar|Administrar|Exportar)/i);
});

test("E2-19 no crea repositorio histórico, writer, receipt, intent ni proyección", () => {
  const membershipInfrastructure = fs.readdirSync(path.join(root, "volley-ranking-system/functions/src/memberships/infrastructure"));
  assert.equal(membershipInfrastructure.some((name) => /HistoryRepository|HistoryStore|HistoryWriter/i.test(name)), false);
  const source = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreOwnGroupMembershipHistoryReader.js");
  assert.doesNotMatch(source, /collection\(["'](?:history|projections|receipts|intents)["']\)/i);
});
