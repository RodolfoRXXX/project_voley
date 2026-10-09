"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const systemRoot = path.resolve(__dirname, "../..");
test("E3-01 publica sólo callables backend y niega colecciones económicas al cliente", () => {
  const index = fs.readFileSync(path.join(systemRoot, "index.js"), "utf8");
  for (const name of ["createGroupChargeConcept", "renameGroupChargeConcept", "changeGroupChargeConceptDefaultAmount", "deactivateGroupChargeConcept", "listGroupChargeConcepts", "listChargeOccurrences", "createChargeOccurrence", "listOwnerMonthlyMembershipCandidates", "generateMembershipObligations", "listGroupObligations", "listMyObligations"]) assert.match(index, new RegExp(`exports\\.${name}`));
  const rules = fs.readFileSync(path.resolve(systemRoot, "../firestore.rules"), "utf8");
  for (const collection of ["groupChargeConcepts", "groupChargeOccurrences", "payments", "paymentGenerationIntents", "paymentCommandReceipts"]) assert.match(rules, new RegExp(`match /${collection}`));
  assert.match(rules, /match \/payments\/\{paymentId\}[\s\S]*?allow read, write: if false/);
});

test("E3-01 declara exactamente los cuatro índices económicos y Pago bloquea CU-015", () => {
  const indexes = JSON.parse(fs.readFileSync(path.resolve(systemRoot, "../firestore.indexes.json"), "utf8")).indexes;
  const economic = indexes.filter((item) => ["groupChargeConcepts", "groupChargeOccurrences", "payments"].includes(item.collectionGroup));
  assert.equal(economic.length, 4);
  const deletion = fs.readFileSync(path.join(systemRoot, "src/groups/infrastructure/firestoreGroupDeletionStore.js"), "utf8");
  assert.match(deletion, /"payments"/);
});

test("E3-01 no importa superficies económicas legacy", () => {
  const source = fs.readFileSync(path.join(systemRoot, "src/payments/infrastructure/firestorePaymentStore.js"), "utf8");
  for (const forbidden of ["participations", "tournamentRegistrations", "tournamentTeams", "pagoEstado", "updatePagoEstado"]) assert.doesNotMatch(source, new RegExp(forbidden));
  assert.doesNotMatch(source, /memberships\/(?:domain|application|infrastructure)/);
  assert.match(source, /memberships\/public\/membershipObligationEligibilityCapability/);
  assert.match(source, /groups\/public\/groupObligationPresentationCapability/);
  assert.doesNotMatch(source, /groupId:\s*payment\.groupId[\s\S]*?owner:\s*false/);
});

test("E3-01 UI no usa diálogos nativos y separa contexto, excepciones y archivo", () => {
  const ui = fs.readFileSync(path.resolve(systemRoot, "../../volley-ranking-frontend/src/components/payments/OwnerEconomySection.tsx"), "utf8");
  assert.doesNotMatch(ui, /window\.(?:alert|prompt|confirm)\(/);
  for (const evidence of ["role=\"dialog\"", "aria-modal=\"true\"", "clearGenerationContext", "Usar otro importe", "Cobro específico", "Pendiente de pago", "if (readOnly) return"]) assert.equal(ui.includes(evidence), true, evidence);
});

test("E3-02 presenta cobros específicos y Grupo en obligaciones propias", () => {
  const delegated = fs.readFileSync(path.resolve(systemRoot, "../../volley-ranking-frontend/src/components/treasury/TreasuryEconomyView.tsx"), "utf8");
  const mine = fs.readFileSync(path.resolve(systemRoot, "../../volley-ranking-frontend/src/components/payments/MyObligationsView.tsx"), "utf8");
  assert.match(delegated, /Ver cobros específicos/);
  assert.doesNotMatch(delegated, /Ver ocurrencias/);
  assert.match(mine, /Grupo: \{item\.groupName\}/);
  assert.doesNotMatch(mine, /item\.groupId/);
});
