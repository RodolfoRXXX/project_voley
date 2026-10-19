"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { performance } = require("node:perf_hooks");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { opaqueId } = require("../../src/payments/domain/payment");

function serializedBytes(snapshot) {
  return snapshot.docs.reduce((total, doc) => total + Buffer.byteLength(JSON.stringify({ id: doc.id, ...doc.data() }), "utf8"), 0);
}

async function inspectInsideTransaction(db, { groupId, membershipId, paymentId, at }) {
  const startedAt = performance.now();
  const result = await db.runTransaction(async (transaction) => {
    const guardRef = db.collection("paymentReceiptCandidateGuards").doc(opaqueId("payment-receipt-candidate-guard", groupId, membershipId));
    const guardSnapshot = await transaction.get(guardRef);
    const query = db.collection("paymentDeliveries")
      .where("membershipId", "==", membershipId)
      .where("decisionState", "==", "REPORTED")
      .orderBy("__name__", "asc");
    const snapshot = await transaction.get(query);
    const matchingIds = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.groupId !== groupId || data.membershipId !== membershipId || data.decisionState !== "REPORTED" || !Array.isArray(data.lines)) throw new Error("incompatible synthetic notice");
      if (data.lines.some((line) => line?.paymentId === paymentId)) matchingIds.push(doc.id);
    }
    const revision = guardSnapshot.exists ? guardSnapshot.data().revision + 1 : 1;
    transaction.set(guardRef, { guardId: guardRef.id, groupId, membershipId, revision, createdAt: guardSnapshot.data()?.createdAt || at, updatedAt: at, schemaVersion: 1 });
    return { matchingIds, documentsRead: snapshot.size + 1, queryDocumentsRead: snapshot.size, serializedQueryBytes: serializedBytes(snapshot) };
  });
  return { ...result, durationMs: Number((performance.now() - startedAt).toFixed(3)) };
}

test("E3-05 gate: la consulta completa distingue ausencia y encuentra un aviso posterior a los primeros 20", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e3-05-notice-gate");
  const db = app.firestore();
  const prefix = "e3-05-gate-";
  const groupId = `${prefix}group`;
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-10-16T12:00:00Z"));
  const metrics = [];
  try {
    const zero = await inspectInsideTransaction(db, { groupId, membershipId: `${prefix}zero`, paymentId: `${prefix}payment-zero`, at });
    assert.deepEqual(zero.matchingIds, []);
    assert.equal(zero.queryDocumentsRead, 0);
    metrics.push({ scenario: "zero-reported-notices", reportedNotices: 0, relatedPosition: null, ...zero, matchingIds: zero.matchingIds.length });

    const membershipId = `${prefix}many`;
    const paymentId = `${prefix}payment-related`;
    const batch = db.batch();
    for (let index = 1; index <= 25; index += 1) {
      const id = `${prefix}notice-${String(index).padStart(2, "0")}`;
      batch.set(db.collection("paymentDeliveries").doc(id), {
        deliveryId: id, groupId, membershipId, personId: `${prefix}person`, seasonId: `${prefix}season`,
        declaredPaidOn: "2026-10-16", declaredTotalMinor: 1000, decisionState: "REPORTED", revision: 1,
        lines: [{ lineId: `${prefix}line-${index}`, paymentId: index === 25 ? paymentId : `${prefix}unrelated-${index}`, selectionMode: "FULL", requestedAmountMinor: 1000, conceptName: "Sintético", dueDate: "2026-10-20" }],
        reportedAt: at, reportedByAccountId: `${prefix}reporter`, schemaVersion: 1,
      });
    }
    await batch.commit();
    const many = await inspectInsideTransaction(db, { groupId, membershipId, paymentId, at });
    assert.equal(many.queryDocumentsRead, 25);
    assert.deepEqual(many.matchingIds, [`${prefix}notice-25`]);
    metrics.push({ scenario: "twenty-five-related-last", reportedNotices: 25, relatedPosition: 25, ...many, matchingIds: many.matchingIds.length });

    process.stdout.write(`E3_05_NOTICE_GATE_METRICS ${JSON.stringify(metrics)}\n`);
  } finally {
    for (const collection of ["paymentReceiptCandidateGuards", "paymentDeliveries"]) {
      const snapshot = await db.collection(collection).get();
      for (const doc of snapshot.docs) if (doc.id.startsWith(prefix) || doc.data()?.groupId === groupId) await doc.ref.delete();
    }
    await app.delete();
  }
});
