"use strict";

const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const test = require("node:test");
const admin = require("firebase-admin");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");

const { projectId } = assertSafeFirebaseTestEnvironment(process.env, {
  requiredEmulatorHosts: ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FUNCTIONS_EMULATOR_HOST"],
  requireSyntheticSecrets: false,
});
const app = admin.initializeApp({ projectId }, `e3-08-callable-${process.pid}`);
const db = app.firestore();
const auth = app.auth();
const Timestamp = admin.firestore.Timestamp;

async function json(response) {
  const text = await response.text();
  return { text, value: text ? JSON.parse(text) : null };
}

async function signUp(email) {
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-08-local`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E3-08-local-password!", returnSecureToken: true }),
  });
  const body = await json(response);
  assert.equal(response.status, 200, body.text);
  return { uid: body.value.localId, idToken: body.value.idToken, email };
}

async function invoke(name, data, actor) {
  const started = performance.now();
  const response = await fetch(`http://${process.env.FUNCTIONS_EMULATOR_HOST}/${projectId}/us-central1/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json",
      ...(actor ? { Authorization: `Bearer ${actor.idToken}` } : {}) },
    body: JSON.stringify({ data }),
  });
  const parsed = await json(response);
  return { status: response.status, body: parsed.value, responseBytes: Buffer.byteLength(parsed.text, "utf8"),
    durationMs: Number((performance.now() - started).toFixed(3)) };
}

async function commit(writes) {
  for (let start = 0; start < writes.length; start += 400) {
    const batch = db.batch();
    for (const write of writes.slice(start, start + 400)) batch.set(db.doc(write.path), write.data);
    await batch.commit();
  }
}

function receipt(groupId, personId, index, reversed) {
  const receiptId = `${groupId}-receipt-${String(index).padStart(4, "0")}`;
  const confirmedAt = Timestamp.fromDate(new Date(Date.UTC(2026, 9, 2, 12, index % 60, index % 59)));
  const totalMinor = 10000 + index;
  return { path: `paymentDeliveries/${receiptId}`, data: {
    deliveryId: receiptId, receiptId, origin: "INFORMED", groupId,
    seasonId: `${groupId}-season`, membershipId: `${groupId}-membership`, personId,
    reportedByAccountId: `${groupId}-reporter`, declaredPaidOn: "2026-10-02",
    declaredTotalMinor: totalMinor, decisionState: "CONFIRMED",
    applicationState: reversed ? "REVERSED" : "APPLIED",
    lines: [{ lineId: `${receiptId}-line`, paymentId: `${receiptId}-payment`, selectionMode: "FULL",
      requestedAmountMinor: totalMinor, expectedBalanceMinor: totalMinor, expectedEconomicRevision: 1,
      conceptName: "Cuota sintética", dueDate: "2026-10-31" }],
    revision: reversed ? 2 : 1, schemaVersion: 2,
    reportedAt: Timestamp.fromMillis(confirmedAt.toMillis() - 1000), confirmedAt,
    confirmedByAccountId: `${groupId}-owner`, confirmedByKind: "OWNER",
    ...(reversed ? { reversedAt: Timestamp.fromDate(new Date(Date.UTC(2026, 9, 20, 12, index % 60, index % 59))),
      reversalId: `${receiptId}-reversal`, reversal: { reversalId: `${receiptId}-reversal`, receiptId,
        reason: "Corrección sintética", reversedAt: Timestamp.fromDate(new Date(Date.UTC(2026, 9, 20, 12, index % 60, index % 59))),
        reversedByAccountId: `${groupId}-owner`, schemaVersion: 1 } } : {}),
  } };
}

test("E3-08 callable real autoriza Owner/Tesorería y transporta 1.000 hechos sin parciales", async () => {
  const prefix = `e308-call-${process.pid}-`;
  const groupId = `${prefix}group`;
  const personId = `${prefix}person`;
  const membershipId = `${prefix}membership`;
  const seasonId = `${prefix}season`;
  const [owner, treasury] = await Promise.all([
    signUp(`${prefix}owner@example.invalid`), signUp(`${prefix}treasury@example.invalid`),
  ]);
  const createdAt = Timestamp.fromDate(new Date("2026-09-01T12:00:00.000Z"));
  try {
    await commit([
      { path: `users/${owner.uid}`, data: { email: owner.email, createdAt } },
      { path: `users/${treasury.uid}`, data: { email: treasury.email, personaId: personId, createdAt } },
      { path: `personas/${personId}`, data: { nombre: "Tania", apellido: "Tesorería", createdAt } },
      { path: `groups/${groupId}`, data: { nombre: "Grupo E3-08", deporte: "voleibol", ownerId: owner.uid,
        estado: "activo", ownershipRevision: 1, createdAt, schemaVersion: 3 } },
      { path: `seasons/${seasonId}`, data: { groupId, nombre: "2026", fechaInicio: "2026-01-01",
        estado: "abierta", createdAt, schemaVersion: 1 } },
      { path: `memberships/${membershipId}`, data: { personId, groupId, seasonId, estado: "activa",
        fechaIngreso: createdAt, createdAt, schemaVersion: 1 } },
    ]);
    const grant = await invoke("grantGroupTreasuryCapability", { groupId, membershipId,
      idempotencyKey: `${prefix}grant-0001` }, owner);
    assert.equal(grant.body?.result?.outcome, "GRANTED", JSON.stringify(grant.body));

    const writes = [];
    for (let index = 0; index < 834; index += 1) writes.push(receipt(groupId, personId, index, index < 166));
    await commit(writes);
    const query = { groupId, from: "2026-10-01", to: "2026-10-31" };
    const ownerResponse = await invoke("listGroupRegisteredIncomeMovements", query, owner);
    const treasuryResponse = await invoke("listGroupRegisteredIncomeMovements", query, treasury);
    for (const result of [ownerResponse, treasuryResponse]) {
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body?.result?.items?.length, 1000);
      assert.equal(result.body.result.totals.movementCount, 1000);
      assert.equal(result.body.result.nextCursor, undefined);
    }
    assert.equal(ownerResponse.body.result.audience, "OWNER");
    assert.equal(ownerResponse.body.result.items.every((item) => typeof item.receiptId === "string"), true);
    assert.equal(treasuryResponse.body.result.audience, "TREASURY");
    assert.equal(treasuryResponse.body.result.items.every((item) => item.receiptId === undefined), true);

    await commit([receipt(groupId, personId, 834, false)]);
    const ownerExcess = await invoke("listGroupRegisteredIncomeMovements", query, owner);
    const treasuryExcess = await invoke("listGroupRegisteredIncomeMovements", query, treasury);
    for (const result of [ownerExcess, treasuryExcess]) {
      assert.equal(result.body?.error?.details?.reason, "MOVEMENT_LIMIT_EXCEEDED", JSON.stringify(result.body));
      assert.equal(result.body?.result, undefined);
    }
    const legacyContinuation = await invoke("listGroupRegisteredIncomeMovements", { ...query, pageSize: 20 }, owner);
    assert.equal(legacyContinuation.body?.error?.details?.reason, "INVALID_DATE_RANGE");
    const revoked = await invoke("revokeGroupTreasuryCapability", { groupId,
      grantId: grant.body.result.grant.grantId, idempotencyKey: `${prefix}revoke-0001` }, owner);
    assert.equal(revoked.body?.result?.outcome, "REVOKED", JSON.stringify(revoked.body));
    const revokedRead = await invoke("listGroupRegisteredIncomeMovements", query, treasury);
    assert.equal(revokedRead.body?.error?.details?.reason, "GROUP_TREASURY_NOT_AUTHORIZED");
    await db.doc(`groups/${groupId}`).update({ estado: "archivado", schemaVersion: 4 });
    const archivedOwner = await invoke("listGroupRegisteredIncomeMovements", {
      groupId, from: "2026-09-01", to: "2026-09-30" }, owner);
    assert.equal(archivedOwner.body?.result?.audience, "OWNER", JSON.stringify(archivedOwner.body));
    assert.equal(archivedOwner.body.result.items.length, 0);
    process.stdout.write(`E3_08_CALLABLE_EVIDENCE=${JSON.stringify({
      owner1000: { durationMs: ownerResponse.durationMs, responseBytes: ownerResponse.responseBytes },
      treasury1000: { durationMs: treasuryResponse.durationMs, responseBytes: treasuryResponse.responseBytes },
      owner1001: { durationMs: ownerExcess.durationMs, responseBytes: ownerExcess.responseBytes },
      treasury1001: { durationMs: treasuryExcess.durationMs, responseBytes: treasuryExcess.responseBytes },
      legacyPaginationRejected: true, revokedTreasuryDenied: true, archivedOwnerRead: true,
      auth: "Firebase Auth emulator ID tokens", transport: "Functions emulator callable HTTP",
      billingReadsObserved: false,
    })}\n`);
  } finally {
    const collections = ["groupCapabilityCommandReceipts", "groupCapabilityGrantSlots",
      "groupCapabilityGrants", "paymentDeliveries", "memberships", "seasons", "groups", "personas"];
    for (const name of collections) {
      const snapshot = await db.collection(name).get();
      for (const document of snapshot.docs.filter((item) => item.id.startsWith(prefix)
        || item.data()?.groupId === groupId)) await document.ref.delete();
    }
    for (const actor of [owner, treasury]) {
      await db.doc(`users/${actor.uid}`).delete().catch(() => {});
      await auth.deleteUser(actor.uid).catch(() => {});
    }
    await app.delete();
  }
});
