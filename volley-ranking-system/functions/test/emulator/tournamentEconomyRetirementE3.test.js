"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

const ECONOMIC_FIELDS = [
  "paymentForPlayer", "expectedAmount", "paidAmount", "pendingAmount", "paymentStatus",
  "paymentDate", "paymentVerifiedBy", "paymentVerifiedAt",
];
const ECONOMIC_ROOTS = [
  "groupChargeConcepts", "groupChargeOccurrences", "payments", "paymentGenerationIntents",
  "paymentCommandReceipts", "paymentDeliveries", "paymentDeliveryReversals",
  "paymentDeliveryCommandReceipts", "paymentReceiptCandidateGuards",
  "administrativeReceiptCommandReceipts", "groupCapabilityGrants", "groupCapabilityGrantSlots",
  "groupCapabilityCommandReceipts",
];
const ECONOMIC_SUBCOLLECTIONS = {
  payments: ["deliveryApplications", "principalCorrections", "waiverEvents"],
  paymentGenerationIntents: ["rows"],
};

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function signUp(host, label) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-10-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `e3-10-${label}@example.invalid`, password: "E3-10-password!", returnSecureToken: true }),
  });
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
}

async function callable(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await readJson(response) };
}

function firestoreUrl(host, projectId, path) {
  return `http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`;
}

function stringArray(values) {
  return { arrayValue: { values: values.map((value) => ({ stringValue: value })) } };
}

async function patchEntry({ host, projectId, collection, id, actor, fields, maskFields = Object.keys(fields) }) {
  const masks = maskFields.map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const response = await fetch(`${firestoreUrl(host, projectId, `${collection}/${id}`)}?${masks}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${actor.idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  return { status: response.status, body: await readJson(response) };
}

function runReconciliationCli({ projectId, manifestPath, mode = "apply", batchSize = 200, maxBatches = null }) {
  const script = path.resolve(__dirname, "../../src/scripts/reconcileTournamentPaymentAlerts.js");
  const args = [
    script,
    "--environment=emulator",
    `--project=${projectId}`,
    `--mode=${mode}`,
    `--manifest=${manifestPath}`,
    `--batch-size=${batchSize}`,
  ];
  if (maxBatches !== null) args.push(`--max-batches=${maxBatches}`);
  return spawnSync(process.execPath, args, {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST },
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value.toMillis === "function") return { timestamp: value.toMillis() };
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function economyProjection(data = {}) {
  const projection = {};
  for (const field of ECONOMIC_FIELDS) {
    projection[field] = Object.hasOwn(data, field) ? { present: true, value: canonical(data[field]) } : { present: false };
  }
  projection["settings.paymentPerPlayer"] = Object.hasOwn(data.settings || {}, "paymentPerPlayer")
    ? { present: true, value: canonical(data.settings.paymentPerPlayer) }
    : { present: false };
  return projection;
}

function historicalEconomyFixture(prefix) {
  return Object.fromEntries(ECONOMIC_FIELDS.map((field) => [field, `${prefix}-${field}`]));
}

function firestoreString(value) {
  return { stringValue: String(value) };
}

async function economicSnapshot(db) {
  const rows = [];
  for (const root of ECONOMIC_ROOTS) {
    const snap = await db.collection(root).get();
    for (const doc of snap.docs) {
      rows.push([doc.ref.path, canonical(doc.data())]);
      for (const child of ECONOMIC_SUBCOLLECTIONS[root] || []) {
        const nested = await doc.ref.collection(child).get();
        for (const item of nested.docs) rows.push([item.ref.path, canonical(item.data())]);
      }
    }
  }
  return rows.sort(([a], [b]) => a.localeCompare(b));
}

async function waitFor(read, predicate, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let value;
  while (Date.now() < deadline) {
    value = await read();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`${label}: ${JSON.stringify(value)}`);
}

test("E3-10 retira economía legacy de Torneos y preserva deporte e historia", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e3-10-tournament-retirement");
  const db = app.firestore();
  const auth = app.auth();
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const [owner, otherAdmin, player] = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "owner"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "other-admin"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "player"),
  ]);
  const groupId = "e3-10-group";
  const rejectedGroupId = "e3-10-rejected-group";
  let tournamentId = null;
  let registrationId = null;
  let rejectedRegistrationId = null;
  const fixtureRefs = [];

  try {
    await Promise.all([
      db.collection("users").doc(owner.uid).set({ roles: "admin", onboarded: true, nombre: "Owner E3-10" }),
      db.collection("users").doc(otherAdmin.uid).set({ roles: "admin", onboarded: true, nombre: "Other E3-10" }),
      db.collection("users").doc(player.uid).set({ onboarded: true, nombre: "Player E3-10" }),
      db.collection("groups").doc(groupId).set({ nombre: "Grupo E3-10", ownerId: owner.uid, adminIds: [owner.uid], admins: [{ userId: owner.uid, role: "owner", order: 0 }], memberIds: [owner.uid, player.uid], activo: true }),
      db.collection("groups").doc(rejectedGroupId).set({ nombre: "Grupo rechazado E3-10", ownerId: owner.uid, adminIds: [owner.uid], admins: [{ userId: owner.uid, role: "owner", order: 0 }], memberIds: [owner.uid, player.uid], activo: true }),
    ]);
    for (const root of ECONOMIC_ROOTS) {
      const ref = db.collection(root).doc(`e3-10-existing-${root}`);
      fixtureRefs.push(ref);
      await ref.set({ marker: root, revision: 57 });
      for (const child of ECONOMIC_SUBCOLLECTIONS[root] || []) {
        const nested = ref.collection(child).doc(`e3-10-existing-${child}`);
        fixtureRefs.push(nested);
        await nested.set({ marker: child, revision: 57 });
      }
    }
    const rootsBefore = await economicSnapshot(db);
    const basePayload = {
      name: "Torneo E3-10", description: "Retiro local", sport: "voley", format: "liga",
      minTeams: 2, maxTeams: 2, minPlayers: 1, maxPlayers: 4,
      startDateMillis: Date.now() + 86400000,
      rules: { setsToWin: 2, pointsWin: 3, pointsDraw: 0, pointsLose: 0 },
    };

    await t.test("callables mixtos respetan precedencia y rechazan toda presencia sin efectos", async () => {
      const unauthenticated = await callable(functionsHost, projectId, "createTournament", { ...basePayload, paymentForPlayer: 0 });
      assert.equal(unauthenticated.body?.error?.status, "UNAUTHENTICATED");
      const denied = await callable(functionsHost, projectId, "createTournament", { ...basePayload, paymentForPlayer: 0 }, player.idToken);
      assert.equal(denied.body?.error?.status, "PERMISSION_DENIED");
      const retiredPayloads = [];
      for (const value of [null, 0, 17, "legacy"]) {
        retiredPayloads.push({ data: { ...basePayload, paymentForPlayer: value }, fields: ["paymentForPlayer"] });
        retiredPayloads.push({ data: { ...basePayload, settings: { paymentPerPlayer: value } }, fields: ["settings.paymentPerPlayer"] });
      }
      retiredPayloads.push({
        data: { ...basePayload, paymentForPlayer: 1, settings: { paymentPerPlayer: null } },
        fields: ["paymentForPlayer", "settings.paymentPerPlayer"],
      });
      for (const { data, fields } of retiredPayloads) {
        const before = (await db.collection("tournaments").get()).size;
        const result = await callable(functionsHost, projectId, "createTournament", data, owner.idToken);
        assert.equal(result.body?.error?.status, "FAILED_PRECONDITION");
        assert.equal(result.body?.error?.details?.code, "TOURNAMENT_ECONOMY_RETIRED");
        assert.deepEqual(result.body?.error?.details?.fields, fields);
        assert.equal((await db.collection("tournaments").get()).size, before);
      }

      const created = await callable(functionsHost, projectId, "createTournament", basePayload, owner.idToken);
      assert.equal(created.status, 200, JSON.stringify(created.body));
      tournamentId = created.body.result.tournamentId;
      const tournament = (await db.collection("tournaments").doc(tournamentId).get()).data();
      assert.deepEqual(economyProjection(tournament), economyProjection({}));
    });

    await t.test("edición deportiva granular preserva economía histórica anidada", async () => {
      const ref = db.collection("tournaments").doc(tournamentId);
      await ref.update({ paymentForPlayer: 137, "settings.paymentPerPlayer": 137 });
      const before = economyProjection((await ref.get()).data());
      const unauthenticated = await callable(functionsHost, projectId, "editTournament", { tournamentId, description: "no aplicar", paymentForPlayer: 0 });
      assert.equal(unauthenticated.body?.error?.status, "UNAUTHENTICATED");
      const forbidden = await callable(functionsHost, projectId, "editTournament", { tournamentId, description: "no aplicar", paymentForPlayer: 0 }, otherAdmin.idToken);
      assert.equal(forbidden.body?.error?.status, "PERMISSION_DENIED");
      const retiredPayloads = [];
      for (const value of [null, 0, 17, "legacy"]) {
        retiredPayloads.push({ data: { tournamentId, description: "no aplicar", paymentForPlayer: value }, fields: ["paymentForPlayer"] });
        retiredPayloads.push({ data: { tournamentId, description: "no aplicar", settings: { paymentPerPlayer: value } }, fields: ["settings.paymentPerPlayer"] });
      }
      retiredPayloads.push({
        data: { tournamentId, description: "no aplicar", paymentForPlayer: 1, settings: { paymentPerPlayer: null } },
        fields: ["paymentForPlayer", "settings.paymentPerPlayer"],
      });
      for (const { data, fields } of retiredPayloads) {
        const rejected = await callable(functionsHost, projectId, "editTournament", data, owner.idToken);
        assert.equal(rejected.body?.error?.details?.code, "TOURNAMENT_ECONOMY_RETIRED");
        assert.deepEqual(rejected.body?.error?.details?.fields, fields);
        assert.equal((await ref.get()).data().description, "Retiro local");
        assert.deepEqual(economyProjection((await ref.get()).data()), before);
      }
      const edited = await callable(functionsHost, projectId, "editTournament", { tournamentId, description: "Sólo deporte", minPlayers: 2 }, owner.idToken);
      assert.equal(edited.status, 200, JSON.stringify(edited.body));
      const after = (await ref.get()).data();
      assert.equal(after.description, "Sólo deporte");
      assert.equal(after.settings.minPlayers, 2);
      assert.deepEqual(economyProjection(after), before);
    });

    await t.test("inscripción nueva omite economía y Rules aíslan roster de historia", async () => {
      const opened = await callable(functionsHost, projectId, "openTournamentRegistrations", { tournamentId }, owner.idToken);
      assert.equal(opened.status, 200, JSON.stringify(opened.body));
      const requested = await callable(functionsHost, projectId, "requestTournamentRegistration", { tournamentId, groupId, nameTeam: "Equipo E3-10" }, owner.idToken);
      assert.equal(requested.status, 200, JSON.stringify(requested.body));
      registrationId = requested.body.result.registrationId;
      const ref = db.collection("tournamentRegistrations").doc(registrationId);
      assert.deepEqual(economyProjection((await ref.get()).data()), economyProjection({}));

      for (const field of ECONOMIC_FIELDS) {
        const economyAdd = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentRegistrations", id: registrationId, actor: owner, fields: { [field]: firestoreString(`add-${field}`) } });
        assert.equal(economyAdd.status, 403, `${field}: ${JSON.stringify(economyAdd.body)}`);
      }
      await ref.update(historicalEconomyFixture("registration"));
      const before = economyProjection((await ref.get()).data());
      const roster = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentRegistrations", id: registrationId, actor: owner, fields: { playerIds: stringArray([player.uid]), teamMembersCount: { integerValue: "1" } } });
      assert.equal(roster.status, 200, JSON.stringify(roster.body));
      assert.deepEqual(economyProjection((await ref.get()).data()), before);
      for (const field of ECONOMIC_FIELDS) {
        const economyModify = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentRegistrations", id: registrationId, actor: owner, fields: { [field]: firestoreString(`modify-${field}`) } });
        assert.equal(economyModify.status, 403, `${field}: ${JSON.stringify(economyModify.body)}`);
        const economyDelete = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentRegistrations", id: registrationId, actor: owner, fields: {}, maskFields: [field] });
        assert.equal(economyDelete.status, 403, `${field}: ${JSON.stringify(economyDelete.body)}`);
      }
      assert.deepEqual(economyProjection((await ref.get()).data()), before);
    });

    await t.test("review rechaza economía atómicamente y aceptación conserva historia", async () => {
      const ref = db.collection("tournamentRegistrations").doc(registrationId);
      const beforeDoc = canonical((await ref.get()).data());
      const unauthenticated = await callable(functionsHost, projectId, "reviewTournamentRegistration", { registrationId, source: "registration", status: "aceptado", paymentStatus: 0 });
      assert.equal(unauthenticated.body?.error?.status, "UNAUTHENTICATED");
      const forbidden = await callable(functionsHost, projectId, "reviewTournamentRegistration", { registrationId, source: "registration", status: "aceptado", paymentStatus: 0 }, otherAdmin.idToken);
      assert.equal(forbidden.body?.error?.status, "PERMISSION_DENIED");
      const retiredPayloads = [];
      for (const value of [null, 0, 17, "legacy"]) {
        retiredPayloads.push({ data: { registrationId, source: "registration", status: "aceptado", paymentStatus: value }, fields: ["paymentStatus"] });
        retiredPayloads.push({ data: { registrationId, source: "registration", status: "aceptado", paidAmountInput: value }, fields: ["paidAmountInput"] });
      }
      retiredPayloads.push({
        data: { registrationId, source: "registration", status: "aceptado", paymentStatus: null, paidAmountInput: 0 },
        fields: ["paymentStatus", "paidAmountInput"],
      });
      for (const { data, fields } of retiredPayloads) {
        const rejected = await callable(functionsHost, projectId, "reviewTournamentRegistration", data, owner.idToken);
        assert.equal(rejected.body?.error?.details?.code, "TOURNAMENT_ECONOMY_RETIRED");
        assert.deepEqual(rejected.body?.error?.details?.fields, fields);
        assert.deepEqual(canonical((await ref.get()).data()), beforeDoc);
        assert.equal((await db.collection("tournamentTeams").doc(registrationId).get()).exists, false);
      }

      const historical = economyProjection((await ref.get()).data());
      const accepted = await callable(functionsHost, projectId, "reviewTournamentRegistration", { registrationId, source: "registration", status: "aceptado" }, owner.idToken);
      assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
      assert.deepEqual(economyProjection((await ref.get()).data()), historical);
      const team = (await db.collection("tournamentTeams").doc(registrationId).get()).data();
      assert.deepEqual(economyProjection(team), economyProjection({}));
      assert.equal(team.status, "aceptado");
    });

    await t.test("Rules de equipo preservan historia y el trigger deportivo no reactiva economÃ­a", async () => {
      const ref = db.collection("tournamentTeams").doc(registrationId);
      for (const field of ECONOMIC_FIELDS) {
        const economyAdd = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentTeams", id: registrationId, actor: owner, fields: { [field]: firestoreString(`add-${field}`) } });
        assert.equal(economyAdd.status, 403, `${field}: ${JSON.stringify(economyAdd.body)}`);
      }

      await ref.update(historicalEconomyFixture("team"));
      const beforeEconomy = economyProjection((await ref.get()).data());
      const economicAlert = db.collection("users").doc(owner.uid).collection("pendingAlerts").doc("e3-10-economic-trigger-guard");
      await economicAlert.set({
        kind: "group_tournament_team_payment_pending",
        status: "resolved",
        title: "HistÃ³rica resuelta",
        meta: { legacy: true },
        createdAt: admin.firestore.Timestamp.fromMillis(10),
        updatedAt: admin.firestore.Timestamp.fromMillis(20),
      });
      const beforeEconomicAlert = canonical((await economicAlert.get()).data());

      const roster = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentTeams", id: registrationId, actor: owner, fields: { playerIds: stringArray([]), teamMembersCount: { integerValue: "0" } } });
      assert.equal(roster.status, 200, JSON.stringify(roster.body));
      assert.deepEqual(economyProjection((await ref.get()).data()), beforeEconomy);

      const sportsAlert = db.collection("users").doc(owner.uid).collection("pendingAlerts").doc(`group_tournament_team_missing_players_${tournamentId}_${groupId}`);
      await waitFor(
        async () => (await sportsAlert.get()).data()?.meta?.selectedPlayersCount,
        (count) => count === 0,
        "trigger deportivo de roster ejecutado"
      );
      assert.deepEqual(canonical((await economicAlert.get()).data()), beforeEconomicAlert);

      for (const field of ECONOMIC_FIELDS) {
        const economyModify = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentTeams", id: registrationId, actor: owner, fields: { [field]: firestoreString(`modify-${field}`) } });
        assert.equal(economyModify.status, 403, `${field}: ${JSON.stringify(economyModify.body)}`);
        const economyDelete = await patchEntry({ host: firestoreHost, projectId, collection: "tournamentTeams", id: registrationId, actor: owner, fields: {}, maskFields: [field] });
        assert.equal(economyDelete.status, 403, `${field}: ${JSON.stringify(economyDelete.body)}`);
      }
      assert.deepEqual(economyProjection((await ref.get()).data()), beforeEconomy);

      const acceptedAlert = db.collection("users").doc(owner.uid).collection("pendingAlerts").doc(`group_accepted_in_tournament_${tournamentId}_${groupId}`);
      await waitFor(
        async () => (await acceptedAlert.get()).data()?.status,
        (status) => status === "active",
        "alerta deportiva de aceptaciÃ³n"
      );
    });

    await t.test("rechazo deportivo conserva acceptedTeamsCount y crea su alerta", async () => {
      const requested = await callable(functionsHost, projectId, "requestTournamentRegistration", { tournamentId, groupId: rejectedGroupId, nameTeam: "Equipo rechazado E3-10" }, owner.idToken);
      assert.equal(requested.status, 200, JSON.stringify(requested.body));
      rejectedRegistrationId = requested.body.result.registrationId;
      const tournamentRef = db.collection("tournaments").doc(tournamentId);
      const countBefore = Number((await tournamentRef.get()).data().acceptedTeamsCount || 0);
      assert.equal(countBefore, 1);

      const rejected = await callable(functionsHost, projectId, "reviewTournamentRegistration", { registrationId: rejectedRegistrationId, source: "registration", status: "rechazado" }, owner.idToken);
      assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
      assert.equal((await db.collection("tournamentRegistrations").doc(rejectedRegistrationId).get()).data().status, "rechazado");
      assert.equal(Number((await tournamentRef.get()).data().acceptedTeamsCount || 0), countBefore);
      assert.deepEqual(economyProjection((await db.collection("tournamentRegistrations").doc(rejectedRegistrationId).get()).data()), economyProjection({}));

      const rejectionAlert = db.collection("users").doc(owner.uid).collection("pendingAlerts").doc(`group_rejected_from_tournament_${tournamentId}_${rejectedGroupId}`);
      await waitFor(
        async () => (await rejectionAlert.get()).data()?.status,
        (status) => status === "active",
        "alerta deportiva de rechazo"
      );
      assert.equal((await rejectionAlert.get()).data().kind, "group_rejected_from_tournament");
    });

    await t.test("tombstone conserva controles, error estable y cero efectos para cualquier importe", async () => {
      const ref = db.collection("tournamentTeams").doc(registrationId);
      const before = canonical((await ref.get()).data());
      const unauthenticated = await callable(functionsHost, projectId, "updateTournamentRegistrationPayment", { registrationId, source: "team" });
      assert.equal(unauthenticated.body?.error?.status, "UNAUTHENTICATED");
      const forbidden = await callable(functionsHost, projectId, "updateTournamentRegistrationPayment", { registrationId, source: "team" }, otherAdmin.idToken);
      assert.equal(forbidden.body?.error?.status, "PERMISSION_DENIED");
      for (const paidAmountToAdd of [undefined, null, 0, 50, "legacy"]) {
        const data = { registrationId, source: "team" };
        if (paidAmountToAdd !== undefined) data.paidAmountToAdd = paidAmountToAdd;
        const retired = await callable(functionsHost, projectId, "updateTournamentRegistrationPayment", data, owner.idToken);
        assert.equal(retired.body?.error?.status, "FAILED_PRECONDITION");
        assert.equal(retired.body?.error?.message, "La gestión económica de inscripciones de Torneo fue retirada");
        assert.equal(retired.body?.error?.details?.code, "TOURNAMENT_REGISTRATION_PAYMENT_RETIRED");
      }
      assert.deepEqual(canonical((await ref.get()).data()), before);
    });

    await t.test("triggers conservan alerta deportiva y no producen alerta económica", async () => {
      const alerts = db.collection("users").doc(owner.uid).collection("pendingAlerts");
      const sports = await waitFor(
        async () => (await alerts.where("kind", "==", "group_tournament_team_missing_players").where("status", "==", "active").get()).size,
        (size) => size > 0,
        "alerta deportiva de roster"
      );
      assert.ok(sports > 0);
      assert.equal((await alerts.where("kind", "==", "group_tournament_team_payment_pending").where("status", "==", "active").get()).size, 0);
      const historicalEconomicAlerts = await alerts.where("kind", "==", "group_tournament_team_payment_pending").get();
      assert.ok(historicalEconomicAlerts.docs.every((doc) => doc.data().status === "resolved"));
    });

    await t.test("reconciliación inspecciona, reanuda e itera sin tocar alertas deportivas", async () => {
      const alerts = db.collection("users").doc(owner.uid).collection("pendingAlerts");
      const activeA = alerts.doc("e3-10-economic-a");
      const activeB = alerts.doc("e3-10-economic-b");
      const resolved = alerts.doc("e3-10-economic-resolved");
      const sport = alerts.doc("e3-10-sport");
      await Promise.all([
        activeA.set({ kind: "group_tournament_team_payment_pending", status: "active", title: "A", meta: { legacy: 1 }, createdAt: admin.firestore.Timestamp.fromMillis(1) }),
        activeB.set({ kind: "group_tournament_team_payment_pending", status: "active", title: "B", meta: { legacy: 2 }, createdAt: admin.firestore.Timestamp.fromMillis(2) }),
        resolved.set({ kind: "group_tournament_team_payment_pending", status: "resolved", title: "R", meta: { legacy: 3 }, createdAt: admin.firestore.Timestamp.fromMillis(3) }),
        sport.set({ kind: "group_tournament_team_missing_players", status: "active", title: "Sport", meta: { missingPlayersCount: 1 }, createdAt: admin.firestore.Timestamp.fromMillis(4) }),
      ]);
      const before = new Map();
      for (const ref of [activeA, activeB, resolved, sport]) before.set(ref.path, canonical((await ref.get()).data()));
      const { reconcileTournamentPaymentAlertsBatch } = require("../../src/services/tournamentPaymentAlertReconciliationService");

      const inspected = await reconcileTournamentPaymentAlertsBatch({ db, batchSize: 2, write: false });
      assert.equal(inspected.counts.resolved, 0);
      assert.equal((await activeA.get()).data().status, "active");

      let cursor = null;
      let done = false;
      let batches = 0;
      while (!done) {
        const result = await reconcileTournamentPaymentAlertsBatch({ db, cursor, batchSize: 2, write: true });
        cursor = result.cursor;
        done = result.done;
        batches += 1;
        assert.ok(batches < 100);
      }
      assert.equal((await activeA.get()).data().status, "resolved");
      assert.equal((await activeB.get()).data().status, "resolved");
      assert.deepEqual(canonical((await resolved.get()).data()), before.get(resolved.path));
      assert.deepEqual(canonical((await sport.get()).data()), before.get(sport.path));
      for (const ref of [activeA, activeB]) {
        const after = canonical((await ref.get()).data());
        const prior = before.get(ref.path);
        assert.equal(after.title, prior.title);
        assert.deepEqual(after.meta, prior.meta);
        assert.deepEqual(after.createdAt, prior.createdAt);
      }
      const repeated = await reconcileTournamentPaymentAlertsBatch({ db, batchSize: 400, write: true });
      assert.equal(repeated.counts.resolved, 0);
    });

    await t.test("CLI reconciliador persiste manifest, reanuda, repite y registra fallo inyectado", async () => {
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "e3-10-reconcile-cli-"));
      assert.ok(path.resolve(tempRoot).startsWith(path.resolve(os.tmpdir())));
      try {
        const alerts = db.collection("users").doc(owner.uid).collection("pendingAlerts");
        const cliActiveA = alerts.doc("e3-10-cli-economic-a");
        const cliActiveB = alerts.doc("e3-10-cli-economic-b");
        const cliSport = alerts.doc("e3-10-cli-sport");
        await Promise.all([
          cliActiveA.set({ kind: "group_tournament_team_payment_pending", status: "active", title: "CLI A", meta: { legacy: "a" } }),
          cliActiveB.set({ kind: "group_tournament_team_payment_pending", status: "active", title: "CLI B", meta: { legacy: "b" } }),
          cliSport.set({ kind: "group_tournament_team_missing_players", status: "active", title: "CLI deporte", meta: { missingPlayersCount: 2 } }),
        ]);
        const sportBefore = canonical((await cliSport.get()).data());

        const inspectManifest = path.join(tempRoot, "inspect.json");
        const inspected = runReconciliationCli({ projectId, manifestPath: inspectManifest, mode: "inspect", batchSize: 2 });
        assert.equal(inspected.status, 0, inspected.stderr || inspected.stdout);
        const inspectState = JSON.parse(fs.readFileSync(inspectManifest, "utf8"));
        assert.equal(inspectState.done, true);
        assert.equal(inspectState.counts.resolved, 0);
        assert.equal((await cliActiveA.get()).data().status, "active");
        assert.equal((await cliActiveB.get()).data().status, "active");

        const applyManifest = path.join(tempRoot, "apply.json");
        const interrupted = runReconciliationCli({ projectId, manifestPath: applyManifest, mode: "apply", batchSize: 1, maxBatches: 1 });
        assert.equal(interrupted.status, 0, interrupted.stderr || interrupted.stdout);
        const interruptedState = JSON.parse(fs.readFileSync(applyManifest, "utf8"));
        assert.equal(interruptedState.done, false);
        assert.equal(interruptedState.batchesCompleted, 1);
        const statusesAfterInterruption = await Promise.all([cliActiveA.get(), cliActiveB.get()]);
        assert.ok(statusesAfterInterruption.some((snap) => snap.data().status === "active"));

        const resumed = runReconciliationCli({ projectId, manifestPath: applyManifest, mode: "apply", batchSize: 1 });
        assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
        const resumedState = JSON.parse(fs.readFileSync(applyManifest, "utf8"));
        assert.equal(resumedState.done, true);
        assert.ok(resumedState.batchesCompleted > 1);
        assert.equal((await cliActiveA.get()).data().status, "resolved");
        assert.equal((await cliActiveB.get()).data().status, "resolved");
        assert.deepEqual(canonical((await cliSport.get()).data()), sportBefore);

        const repeatedManifest = path.join(tempRoot, "repeat.json");
        const repeated = runReconciliationCli({ projectId, manifestPath: repeatedManifest, mode: "apply", batchSize: 400 });
        assert.equal(repeated.status, 0, repeated.stderr || repeated.stdout);
        const repeatedState = JSON.parse(fs.readFileSync(repeatedManifest, "utf8"));
        assert.equal(repeatedState.done, true);
        assert.equal(repeatedState.counts.resolved, 0);
        assert.ok(repeatedState.counts.alreadyResolved >= 2);
        assert.deepEqual(canonical((await cliSport.get()).data()), sportBefore);

        const failedManifest = path.join(tempRoot, "injected-failure.json");
        fs.writeFileSync(failedManifest, `${JSON.stringify({
          schemaVersion: 1,
          operation: "E3-10-reconcile-tournament-payment-alerts",
          projectId,
          environment: "emulator",
          mode: "apply",
          cursor: { userId: owner.uid },
          done: false,
          batchesCompleted: 0,
          counts: { inspected: 0, candidates: 0, resolved: 0, alreadyResolved: 0, skipped: 0, failed: 0 },
          startedAt: new Date(0).toISOString(),
        }, null, 2)}\n`, "utf8");
        const injectedFailure = runReconciliationCli({ projectId, manifestPath: failedManifest, mode: "apply", batchSize: 2 });
        assert.equal(injectedFailure.status, 1, "el cursor malformado inyectado debe fallar");
        const failedState = JSON.parse(fs.readFileSync(failedManifest, "utf8"));
        assert.equal(failedState.counts.failed, 1);
        assert.match(failedState.lastError?.message || "", /cursor requiere alertId/i);

        failedState.cursor = null;
        fs.writeFileSync(failedManifest, `${JSON.stringify(failedState, null, 2)}\n`, "utf8");
        const recovered = runReconciliationCli({ projectId, manifestPath: failedManifest, mode: "apply", batchSize: 2 });
        assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
        const recoveredState = JSON.parse(fs.readFileSync(failedManifest, "utf8"));
        assert.equal(recoveredState.done, true);
        assert.equal(recoveredState.counts.failed, 1);
        assert.equal(Object.hasOwn(recoveredState, "lastError"), false);
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });

    assert.deepEqual(await economicSnapshot(db), rootsBefore);
  } finally {
    const collections = ["tournamentTeams", "tournamentRegistrations", "tournamentPhases", "tournamentAdvancementRules", "tournaments"];
    for (const collection of collections) {
      const snap = await db.collection(collection).get();
      await Promise.allSettled(snap.docs.filter((doc) => doc.id === tournamentId || doc.data().tournamentId === tournamentId).map((doc) => doc.ref.delete()));
    }
    for (const actor of [owner, otherAdmin, player]) {
      const alerts = await db.collection("users").doc(actor.uid).collection("pendingAlerts").get();
      await Promise.allSettled(alerts.docs.map((doc) => doc.ref.delete()));
    }
    await Promise.allSettled([
      ...fixtureRefs.reverse().map((ref) => ref.delete()),
      db.collection("groups").doc(groupId).delete(),
      db.collection("groups").doc(rejectedGroupId).delete(),
      ...[owner, otherAdmin, player].map((actor) => db.collection("users").doc(actor.uid).delete()),
      ...[owner, otherAdmin, player].map((actor) => auth.deleteUser(actor.uid)),
    ]);
    await app.delete();
  }
});
