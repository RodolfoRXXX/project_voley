"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const functionsRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(functionsRoot, "../..");
const {
  assertNoRetiredTournamentEconomy,
  getTournamentEconomicFields,
  getTournamentRegistrationEconomicFields,
  tournamentPaymentRetiredError,
} = require("../../src/services/tournamentEconomyRetirement");

function read(...segments) {
  return fs.readFileSync(path.join(...segments), "utf8");
}

function listSourceFiles(root, extensions) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (["node_modules", ".next", "test", "docs"].includes(entry.name)) continue;
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(target, extensions));
    else if (extensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

test("E3-10 detecta presencia económica con orden estable para todo valor", () => {
  for (const value of [null, 0, undefined, 10, "", false, {}, []]) {
    assert.deepEqual(
      getTournamentEconomicFields({ paymentForPlayer: value }),
      ["paymentForPlayer"]
    );
    assert.deepEqual(
      getTournamentEconomicFields({ settings: { paymentPerPlayer: value } }),
      ["settings.paymentPerPlayer"]
    );
    assert.deepEqual(
      getTournamentEconomicFields({ paymentForPlayer: value, settings: { paymentPerPlayer: value } }),
      ["paymentForPlayer", "settings.paymentPerPlayer"]
    );
    assert.deepEqual(
      getTournamentRegistrationEconomicFields({ paymentStatus: value }),
      ["paymentStatus"]
    );
    assert.deepEqual(
      getTournamentRegistrationEconomicFields({ paidAmountInput: value }),
      ["paidAmountInput"]
    );
    assert.deepEqual(
      getTournamentRegistrationEconomicFields({ paymentStatus: value, paidAmountInput: value }),
      ["paymentStatus", "paidAmountInput"]
    );
  }
  assert.deepEqual(getTournamentEconomicFields({ settings: {} }), []);
  assert.deepEqual(getTournamentEconomicFields({}), []);
  assert.deepEqual(getTournamentRegistrationEconomicFields({}), []);
});

test("E3-10 expone errores contractuales exactos", () => {
  assert.throws(
    () => assertNoRetiredTournamentEconomy(["paymentForPlayer"]),
    (error) => error.code === "failed-precondition"
      && error.message === "La gestión económica de Torneos fue retirada"
      && error.details?.code === "TOURNAMENT_ECONOMY_RETIRED"
      && error.details?.fields?.[0] === "paymentForPlayer"
  );
  const tombstone = tournamentPaymentRetiredError();
  assert.equal(tombstone.code, "failed-precondition");
  assert.equal(tombstone.message, "La gestión económica de inscripciones de Torneo fue retirada");
  assert.deepEqual(tombstone.details, { code: "TOURNAMENT_REGISTRATION_PAYMENT_RETIRED" });
});

test("E3-10 retira economía de fuentes productivas salvo detectores contractuales", () => {
  const allowed = new Set([
    path.join(functionsRoot, "src", "services", "tournamentEconomyRetirement.js"),
    path.join(functionsRoot, "src", "services", "tournamentPaymentAlertReconciliationService.js"),
    path.join(functionsRoot, "src", "services", "tournamentRegistrationService.js"),
    path.join(functionsRoot, "callables", "updateTournamentRegistrationPayment.js"),
    path.join(functionsRoot, "src", "scripts", "reconcileTournamentPaymentAlerts.js"),
    path.join(repositoryRoot, "volley-ranking-frontend", "src", "types", "pendingAlerts.ts"),
  ]);
  const backend = listSourceFiles(functionsRoot, new Set([".js"]));
  const frontend = listSourceFiles(path.join(repositoryRoot, "volley-ranking-frontend", "src"), new Set([".ts", ".tsx"]));
  const retired = /paymentForPlayer|paymentPerPlayer|expectedAmount|paidAmount|pendingAmount|paymentStatus|paymentDate|paymentVerifiedBy|paymentVerifiedAt|group_tournament_team_payment_pending/;
  for (const file of [...backend, ...frontend]) {
    if (allowed.has(file)) continue;
    assert.doesNotMatch(read(file), retired, path.relative(repositoryRoot, file));
  }
});

test("E3-10 conserva triggers deportivos, limita roster y evita reemplazar settings", () => {
  const alerts = read(functionsRoot, "src", "services", "tournamentPendingAlertsService.js");
  const registration = read(functionsRoot, "src", "services", "tournamentRegistrationService.js");
  const tournament = read(functionsRoot, "src", "services", "tournamentService.js");
  const rules = read(path.join(repositoryRoot, "volley-ranking-system", "firestore.rules"));
  const mutation = read(path.join(repositoryRoot, "volley-ranking-frontend", "src", "services", "tournaments", "tournamentMutations.ts"));

  assert.match(alerts, /group_accepted_in_tournament/);
  assert.match(alerts, /group_tournament_team_missing_players/);
  assert.doesNotMatch(alerts, /group_tournament_team_payment_pending/);
  assert.doesNotMatch(registration, /paidAmount\s*:|expectedAmount\s*:|paymentStatus\s*:|paymentVerifiedBy\s*:|paymentVerifiedAt\s*:/);
  assert.match(tournament, /nextPayload\[`settings\.\$\{field\}`\]/);
  assert.doesNotMatch(tournament, /nextPayload\.settings\s*=/);
  assert.match(rules, /"playerIds",\s*"teamMembersCount",\s*"updatedAt"/s);
  assert.doesNotMatch(rules, /"expectedAmount"|"pendingAmount"|"paymentStatus"/);
  assert.match(mutation, /teamMembersCount:\s*params\.playerIds\.length/);
});

test("E3-10 mantiene tombstone exportado y reconciliador fuera de triggers", () => {
  const index = read(functionsRoot, "index.js");
  const tombstone = read(functionsRoot, "callables", "updateTournamentRegistrationPayment.js");
  const registration = read(functionsRoot, "src", "services", "tournamentRegistrationService.js");
  const script = read(functionsRoot, "src", "scripts", "reconcileTournamentPaymentAlerts.js");

  assert.match(index, /exports\.updateTournamentRegistrationPayment\s*=/);
  assert.match(tombstone, /await assertIsAdmin/);
  assert.doesNotMatch(tombstone, /paidAmountToAdd/);
  assert.match(registration, /tournamentPaymentRetiredError/);
  const tombstoneService = registration.slice(
    registration.indexOf("async function updateTournamentRegistrationPayment"),
    registration.indexOf("async function notifyTournamentPlayerAdded")
  );
  assert.doesNotMatch(tombstoneService, /currentPaidAmount|trx\.|\.update\(|\.set\(|\.create\(/);
  assert.match(script, /requiredOption\("environment"\)/);
  assert.match(script, /requiredOption\("mode"\)/);
  assert.match(script, /requiredOption\("manifest"\)/);
  assert.match(script, /--confirm-rollout/);
  assert.doesNotMatch(index, /reconcileTournamentPaymentAlerts/);
});
