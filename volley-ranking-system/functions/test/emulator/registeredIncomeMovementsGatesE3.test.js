"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const test = require("node:test");
const admin = require("firebase-admin");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { createFirestoreRegisteredIncomeMovementReader } = require("../../src/registeredIncomeMovements/infrastructure/firestoreRegisteredIncomeMovementReader");
const movementDomain = require("../../src/registeredIncomeMovements/domain/registeredIncomeMovement");

const projectId = process.env.TEST_FIREBASE_PROJECT_ID;
assertSafeFirebaseTestEnvironment(process.env, {
  requiredEmulatorHosts: ["FIRESTORE_EMULATOR_HOST"],
  requireSyntheticSecrets: false,
});
const app = admin.initializeApp({ projectId }, `e3-08-gates-${process.pid}`);
const db = app.firestore();
db.settings({ ignoreUndefinedProperties: true });
const Timestamp = admin.firestore.Timestamp;
const FieldValue = admin.firestore.FieldValue;
const FieldPath = admin.firestore.FieldPath;
const periodStartInclusive = Timestamp.fromDate(new Date("2026-10-01T03:00:00.000Z"));
const periodEndExclusive = Timestamp.fromDate(new Date("2026-11-01T03:00:00.000Z"));
function installedVersion(packageName) {
  let directory = path.dirname(require.resolve(packageName));
  while (path.dirname(directory) !== directory) {
    const candidate = path.join(directory, "package.json");
    if (fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, "utf8")).version;
    directory = path.dirname(directory);
  }
  throw new Error(`Unable to resolve installed version for ${packageName}`);
}
const gateEvidence = { environment: { projectId, firestoreHost: process.env.FIRESTORE_EMULATOR_HOST,
  firebaseAdmin: admin.SDK_VERSION || installedVersion("firebase-admin"),
  firestore: installedVersion("@google-cloud/firestore"),
  node: process.version }, gateA: {}, gateB: {} };
const gateSelection = process.env.E3_08_GATE || "ALL";

function ts(value) {
  return Timestamp.fromDate(new Date(value));
}

function timestampFromTuple(value) {
  return new Timestamp(value.seconds, value.nanoseconds);
}

function lineAmounts(totalMinor, count) {
  const base = Math.floor(totalMinor / count);
  return Array.from({ length: count }, (_, index) => base + (index === count - 1 ? totalMinor - base * count : 0));
}

function linesFor(receiptId, totalMinor, count, administrative) {
  return lineAmounts(totalMinor, count).map((amountMinor, index) => ({
    lineId: `${receiptId}-line-${String(index).padStart(2, "0")}`,
    paymentId: `${receiptId}-payment-${String(index).padStart(2, "0")}`,
    ...(administrative ? { allocationMode: index ? "PARTIAL" : "FULL", amountMinor }
      : { selectionMode: index ? "PARTIAL" : "FULL", requestedAmountMinor: amountMinor }),
    expectedBalanceMinor: totalMinor,
    expectedEconomicRevision: 1,
    conceptName: `Concepto sintético representativo ${index}`,
    dueDate: "2026-10-31",
  }));
}

function receiptData({ receiptId, groupId, personId, index, origin, schemaVersion = 2,
  eventAt, reversedAt, lineCount = 1, totalMinor = 20000 + index }) {
  const administrative = origin === "ADMINISTRATIVE";
  const common = { groupId, seasonId: `${groupId}-season`, membershipId: `${groupId}-membership-${index}`,
    personId, applicationState: reversedAt ? "REVERSED" : "APPLIED",
    lines: linesFor(receiptId, totalMinor, lineCount, administrative), revision: reversedAt ? 2 : 1,
    schemaVersion, ...(reversedAt ? { reversedAt, reversalId: `${receiptId}-reversal`,
      reversal: { reversalId: `${receiptId}-reversal`, receiptId, reason: "Corrección sintética",
        reversedAt, reversedByAccountId: `${groupId}-owner`, schemaVersion: 1 } } : {}) };
  if (administrative) return { ...common, receiptId, origin, recordedByAccountId: `${groupId}-owner`,
    recordedByKind: "OWNER", receivedOn: "2026-10-15", totalMinor,
    relatedNoticeDecisions: [], resolvedNoticeIds: [], recordedAt: eventAt,
    requestHash: "a".repeat(64) };
  return { ...common, deliveryId: receiptId, ...(schemaVersion === 2 ? { receiptId, origin: "INFORMED" } : {}),
    reportedByAccountId: `${groupId}-reporter`, declaredPaidOn: "2026-10-15",
    declaredTotalMinor: totalMinor, decisionState: "CONFIRMED",
    reportedAt: Timestamp.fromMillis(eventAt.toMillis() - 60000), confirmedAt: eventAt,
    confirmedByAccountId: `${groupId}-owner`, confirmedByKind: "OWNER" };
}

async function commitWrites(writes) {
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = db.batch();
    for (const { path, data } of writes.slice(offset, offset + 400)) batch.set(db.doc(path), data);
    await batch.commit();
  }
}

async function baseContext(groupId, people = 64) {
  const ownerId = `${groupId}-owner`;
  const writes = [
    { path: `groups/${groupId}`, data: { groupId, ownerId, nombre: "Grupo sintético E3-08",
      estado: "activo", ownershipRevision: 1, schemaVersion: 3, createdAt: ts("2026-09-01T12:00:00Z") } },
    { path: `users/${ownerId}`, data: { uid: ownerId, email: `${ownerId}@example.invalid`, schemaVersion: 1 } },
  ];
  for (let index = 0; index < people; index += 1) {
    writes.push({ path: `personas/${groupId}-person-${index}`, data: {
      nombre: `Nombre${index}`, apellido: `Apellido sintético representativo ${index}`,
      createdAt: ts("2026-09-01T12:00:00Z"), schemaVersion: 1 } });
  }
  await commitWrites(writes);
  return ownerId;
}

function createMeasuredReader(options = {}) {
  const metrics = [];
  return { metrics, reader: createFirestoreRegisteredIncomeMovementReader({ db,
    instrumentation: { onRequest(value) { metrics.push(value); } }, ...options }) };
}

async function measuredCall(measured, accountId, input) {
  const before = process.memoryUsage();
  const started = performance.now();
  let response;
  let error;
  try { response = await measured.reader.list(accountId, input); } catch (caught) { error = caught; }
  const durationMs = performance.now() - started;
  const after = process.memoryUsage();
  const metric = measured.metrics.at(-1);
  return { response, error, metric, durationMs,
    memory: { rssBefore: before.rss, rssAfter: after.rss, heapUsedBefore: before.heapUsed,
      heapUsedAfter: after.heapUsed }, responseBytes: response ? Buffer.byteLength(JSON.stringify(response), "utf8") : 0,
    cursorBytes: response?.nextCursor ? Buffer.byteLength(response.nextCursor, "utf8") : 0 };
}

function expectedOrder(facts) {
  return [...facts].sort((left, right) => right.eventAt.toMillis() - left.eventAt.toMillis()
    || right.movementId.localeCompare(left.movementId, "en")).map((fact) => fact.movementId);
}

async function createDataset(label, factCount, { skewed = false } = {}) {
  const groupId = `e308-${label}`;
  const ownerId = await baseContext(groupId);
  const reversalCount = Math.floor(factCount * 0.2);
  const rootCount = factCount - reversalCount;
  const informedCount = skewed ? Math.floor(rootCount * 0.9) : Math.floor(rootCount * 0.62);
  const writes = [];
  const facts = [];
  const totals = { grossRecordedIncomeMinor: 0, reversedRecordsMinor: 0,
    netRegisteredIncomeMinor: 0, movementCount: factCount };
  const distribution = { informedV1: 0, informedV2: 0, administrative: 0, reversals: reversalCount,
    roots: rootCount, lineCounts: { one: 0, three: 0, twenty: 0 } };
  const rootBytes = [];
  for (let index = 0; index < rootCount; index += 1) {
    const origin = index < informedCount ? "INFORMED" : "ADMINISTRATIVE";
    const schemaVersion = origin === "INFORMED" && index % 2 === 0 ? 1 : 2;
    if (origin === "ADMINISTRATIVE") distribution.administrative += 1;
    else if (schemaVersion === 1) distribution.informedV1 += 1;
    else distribution.informedV2 += 1;
    const lineCount = index % 20 === 0 ? 20 : index % 5 === 0 ? 3 : 1;
    distribution.lineCounts[lineCount === 20 ? "twenty" : lineCount === 3 ? "three" : "one"] += 1;
    const personId = `${groupId}-person-${index % 64}`;
    const receiptId = `${groupId}-receipt-${String(index).padStart(4, "0")}`;
    const eventAt = Timestamp.fromMillis(ts("2026-10-02T03:00:00Z").toMillis() + index * 60000);
    const reversedAt = index < reversalCount
      ? Timestamp.fromMillis(ts("2026-10-20T03:00:00Z").toMillis() + index * 60000) : undefined;
    const totalMinor = 20000 + index;
    const data = receiptData({ receiptId, groupId, personId, index, origin, schemaVersion,
      eventAt, reversedAt, lineCount, totalMinor });
    writes.push({ path: `paymentDeliveries/${receiptId}`, data });
    rootBytes.push(Buffer.byteLength(JSON.stringify(data), "utf8"));
    totals.grossRecordedIncomeMinor += totalMinor;
    facts.push({ movementId: `income:${receiptId}`, eventAt });
    if (reversedAt) {
      totals.reversedRecordsMinor += totalMinor;
      facts.push({ movementId: `reversal:${receiptId}`, eventAt: reversedAt });
    }
  }
  totals.netRegisteredIncomeMinor = totals.grossRecordedIncomeMinor - totals.reversedRecordsMinor;
  await commitWrites(writes);
  return { groupId, ownerId, totals, expectedMovementIds: expectedOrder(facts), distribution,
    representativity: { minRootBytes: rootBytes.length ? Math.min(...rootBytes) : 0,
      maxRootBytes: rootBytes.length ? Math.max(...rootBytes) : 0,
      averageRootBytes: rootBytes.length ? Math.round(rootBytes.reduce((sum, size) => sum + size, 0) / rootBytes.length) : 0 } };
}

function requestEvidence(call) {
  return { durationMs: Number(call.durationMs.toFixed(3)), movementDocumentResults: call.metric.movementDocumentResults,
    authorizationDocumentResults: call.metric.authorizationDocumentResults,
    presentationDocumentResults: call.metric.presentationDocumentResults,
    querySnapshots: call.metric.querySnapshots, transactionAttempts: call.metric.transactionAttempts,
    retriesObserved: Math.max(0, call.metric.transactionAttempts - 1),
    commonReadTimeObserved: call.metric.commonReadTimeObserved,
    rowsEmitted: call.response?.items.length || 0, responseBytes: call.responseBytes,
    memory: call.memory, errorReason: call.error?.reason };
}

test("UAT regression: an Owner can read a valid active v1 Group without ownershipRevision",
  { skip: !["A", "AB", "ALL"].includes(gateSelection) }, async () => {
  const groupId = "e308-uat-legacy-group";
  const ownerId = `${groupId}-owner`;
  await commitWrites([
    { path: `groups/${groupId}`, data: { groupId, ownerId, nombre: "Grupo histórico sintético",
      estado: "activo", schemaVersion: 1, createdAt: ts("2026-09-01T12:00:00Z") } },
    { path: `users/${ownerId}`, data: { uid: ownerId, email: `${ownerId}@example.invalid`, schemaVersion: 1 } },
  ]);
  const measured = createMeasuredReader();
  const call = await measuredCall(measured, ownerId, {
    groupId, from: "2026-10-01", to: "2026-10-31",
  });
  assert.ifError(call.error);
  assert.equal(call.response.audience, "OWNER");
  assert.deepEqual(call.response.items, []);
  assert.deepEqual(call.response.totals, { grossRecordedIncomeMinor: 0,
    reversedRecordsMinor: 0, netRegisteredIncomeMinor: 0, movementCount: 0 });
  assert.equal(call.metric.querySnapshots, 3);
  const unchanged = (await db.doc(`groups/${groupId}`).get()).data();
  assert.equal(unchanged.schemaVersion, 1);
  assert.equal(Object.hasOwn(unchanged, "ownershipRevision"), false);
});

test("Gate A/B: one read-only transaction preserves the exclusive cutoff and complete manifest",
  { skip: !["A", "AB", "ALL"].includes(gateSelection) }, async () => {
  const groupId = "e308-gate-a";
  const ownerId = await baseContext(groupId, 8);
  const excessiveRange = await measuredCall(createMeasuredReader(), ownerId, {
    groupId,
    from: "2026-01-01",
    to: "2026-04-03",
  });
  assert.equal(excessiveRange.response, undefined);
  assert.equal(excessiveRange.error?.reason, "RANGE_TOO_WIDE");
  const before = ts("2026-10-10T12:00:00Z");
  const reversedBefore = ts("2026-10-11T12:00:00Z");
  const fixtures = [
    { id: `${groupId}-v1-later-reversed`, origin: "INFORMED", schemaVersion: 1, at: before },
    { id: `${groupId}-v2-reversed-before`, origin: "INFORMED", schemaVersion: 2,
      at: ts("2026-10-09T12:00:00Z"), reversedAt: reversedBefore },
    { id: `${groupId}-admin`, origin: "ADMINISTRATIVE", schemaVersion: 2,
      at: ts("2026-10-08T12:00:00Z") },
    { id: `${groupId}-equal-reversal`, origin: "INFORMED", schemaVersion: 2,
      at: ts("2026-10-07T12:00:00Z") },
  ];
  await commitWrites(fixtures.map((item, index) => ({ path: `paymentDeliveries/${item.id}`,
    data: receiptData({ receiptId: item.id, groupId, personId: `${groupId}-person-${index}`,
      index, origin: item.origin, schemaVersion: item.schemaVersion, eventAt: item.at,
      reversedAt: item.reversedAt, lineCount: index === 2 ? 20 : index === 1 ? 3 : 1,
      totalMinor: 21000 + index }) })));
  let cutoff;
  let overlapRan = false;
  const measured = createMeasuredReader({ testHooks: { async afterCutoffRead(context) {
    if (context.isContinuation || overlapRan) return;
    overlapRan = true;
    cutoff = context.cutoffExclusive;
    await Promise.all([
      db.doc(`paymentDeliveries/${groupId}-v1-later-reversed`).update({ applicationState: "REVERSED",
        reversedAt: FieldValue.serverTimestamp(), reversalId: `${groupId}-actual-overlap-reversal`, revision: 2 }),
      db.doc(`paymentDeliveries/${groupId}-after-confirmation`).set(receiptData({
        receiptId: `${groupId}-after-confirmation`, groupId, personId: `${groupId}-person-5`, index: 5,
        origin: "ADMINISTRATIVE", eventAt: FieldValue.serverTimestamp(), lineCount: 3, totalMinor: 22000 })),
    ]);
  } } });
  const input = { groupId, from: "2026-10-01", to: "2026-10-31" };
  const first = await measuredCall(measured, ownerId, input);
  assert.ifError(first.error);
  assert.equal(overlapRan, true);
  assert.ok(cutoff);
  assert.equal(first.metric.transactionMode, "READ_ONLY");
  assert.equal(first.metric.transactionAttempts, 1);
  assert.equal(first.metric.commonReadTimeObserved, true);
  assert.equal(first.response.totals.movementCount, 5);
  assert.equal(first.response.items.length, 5);
  assert.equal(first.response.nextCursor, undefined);
  const boundaryConfirmationId = `${groupId}-equal-confirmation`;
  await db.doc(`paymentDeliveries/${boundaryConfirmationId}`).set(receiptData({
    receiptId: boundaryConfirmationId, groupId, personId: `${groupId}-person-6`, index: 6,
    origin: "INFORMED", schemaVersion: 2, eventAt: cutoff, lineCount: 1, totalMinor: 23000 }));
  await db.doc(`paymentDeliveries/${groupId}-equal-reversal`).update({ applicationState: "REVERSED",
    reversedAt: cutoff, reversalId: `${groupId}-equal-reversal-id`, revision: 2 });
  const items = first.response.items;
  assert.equal(items.length, 5);
  assert.equal(new Set(items.map((item) => item.movementId)).size, 5);
  assert.equal(items.some((item) => item.movementId.includes("after-confirmation")), false);
  assert.equal(items.some((item) => item.movementId.includes("equal-confirmation")), false);
  assert.equal(items.find((item) => item.movementId === `income:${groupId}-v1-later-reversed`).receiptStateAtCutoff, "APPLIED");
  assert.equal(items.find((item) => item.movementId === `income:${groupId}-equal-reversal`).receiptStateAtCutoff, "APPLIED");
  assert.equal(items.find((item) => item.movementId === `income:${groupId}-v2-reversed-before`).receiptStateAtCutoff, "REVERSED");
  gateEvidence.gateA = {
    status: "PASSED",
    readOnlyTransactionSucceeded: true,
    cutoffSource: "groupSnapshot.readTime inside the same read-only transaction",
    retriesObserved: first.metric.transactionAttempts - 1,
    initialFacts: first.response.totals.movementCount,
    backendResponses: 1,
    overlap: "Two external Firestore writes committed after the group snapshot and before stream queries",
    boundaryFixtures: ["confirmation.eventAt == cutoff", "reversal.reversedAt == cutoff"],
    boundaryCaveat: "Exact-equality timestamps were persisted fixtures after the cutoff; they are not claimed as simultaneous server commits",
    laterReversalPreservedOriginalIncome: true,
    approvedRangeLimitEnforced: true,
    manifestDigest: first.response.view.manifestDigest,
  };
  process.stdout.write(`E3_08_GATE_A_EVIDENCE=${JSON.stringify(gateEvidence.gateA)}\n`);
});

test("Gate B: bounded local cost and complete traversals",
  { skip: !["B", "AB", "ALL"].includes(gateSelection) }, async () => {
  const sizes = [0, 20, 50, 999, 1000, 1001];
  const firstPageEvidence = {};
  for (const size of sizes) {
    const fixture = await createDataset(`gate-b-${size}`, size, { skewed: size === 1000 });
    const measured = createMeasuredReader();
    const call = await measuredCall(measured, fixture.ownerId, { groupId: fixture.groupId,
      from: "2026-10-01", to: "2026-10-31" });
    if (size === 1001) {
      assert.equal(call.response, undefined);
      assert.equal(call.error?.reason, "MOVEMENT_LIMIT_EXCEEDED");
      assert.equal(call.metric.movementDocumentResults.total, 1001);
      assert.equal(call.metric.presentationDocumentResults, 0);
    } else {
      assert.ifError(call.error);
      assert.deepEqual(call.response.totals, fixture.totals);
      assert.deepEqual(call.response.items.map((item) => item.movementId), fixture.expectedMovementIds);
      assert.equal(call.metric.movementDocumentResults.total, size);
      assert.equal(call.metric.transactionAttempts, 1);
      assert.equal(call.response.nextCursor, undefined);
    }
    firstPageEvidence[size] = { fixture: { facts: size, distribution: fixture.distribution,
      representativity: fixture.representativity }, request: requestEvidence(call) };
  }
  const thousandCall = firstPageEvidence[1000].request;
  gateEvidence.gateB = {
    status: "MEASURED_LOCAL_COMPLETE_RESPONSE",
    firstPages: firstPageEvidence,
    fullTraversal: { backendRequests: 1, movementDocumentResults: thousandCall.movementDocumentResults.total,
      rowsEmitted: thousandCall.rowsEmitted, backendCursorBytes: 0,
      visualPageRequests20: 0, visualPageRequests50: 0 },
    billingReadsObserved: false,
    billingCaveat: "Firestore Emulator exposes returned documents, not verified billable reads",
    memoryCaveat: "Process memory is sampled before/after each request; it is not a profiler-grade peak",
  };
  process.stdout.write(`E3_08_GATE_B_EVIDENCE=${JSON.stringify({
    environment: gateEvidence.environment,
    firstPages: firstPageEvidence,
    fullTraversal: gateEvidence.gateB.fullTraversal,
    billingReadsObserved: false,
    billingCaveat: gateEvidence.gateB.billingCaveat,
    memoryCaveat: gateEvidence.gateB.memoryCaveat,
  })}\n`);
});

function movementQuery(stream, groupId, upperExclusive, limit) {
  let query = db.collection("paymentDeliveries").where("groupId", "==", groupId);
  let field;
  if (stream === "INFORMED") {
    field = "confirmedAt";
    query = query.where("decisionState", "==", "CONFIRMED");
  } else if (stream === "ADMINISTRATIVE") {
    field = "recordedAt";
    query = query.where("origin", "==", "ADMINISTRATIVE");
  } else {
    field = "reversedAt";
  }
  return query.where(field, ">=", periodStartInclusive).where(field, "<", upperExclusive)
    .orderBy(field, "desc").orderBy(FieldPath.documentId(), "desc").limit(limit);
}

function serializedStats(items) {
  const sizes = items.map((item) => Buffer.byteLength(JSON.stringify(item), "utf8"));
  return { minBytes: Math.min(...sizes), maxBytes: Math.max(...sizes),
    averageBytes: Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length) };
}

async function transferSamples(payloads, rounds = 5) {
  const server = http.createServer((request, response) => {
    const payload = request.url === "/owner" ? payloads.owner : payloads.treasury;
    response.writeHead(200, { "content-type": "application/json", "content-length": payload.length });
    response.end(payload);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const result = {};
  try {
    for (const audience of ["owner", "treasury"]) {
      await fetch(`http://127.0.0.1:${port}/${audience}`).then((response) => response.arrayBuffer());
      const durations = [];
      for (let index = 0; index < rounds; index += 1) {
        const started = performance.now();
        const received = await fetch(`http://127.0.0.1:${port}/${audience}`)
          .then((response) => response.arrayBuffer());
        assert.equal(received.byteLength, payloads[audience].length);
        durations.push(Number((performance.now() - started).toFixed(3)));
      }
      const sorted = [...durations].sort((left, right) => left - right);
      result[audience] = { rounds, durationsMs: durations, minMs: sorted[0],
        medianMs: sorted[Math.floor(sorted.length / 2)], maxMs: sorted.at(-1) };
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  return result;
}

function parseMemorySample(payload) {
  if (typeof global.gc === "function") global.gc();
  const before = process.memoryUsage();
  const started = performance.now();
  let parsed = JSON.parse(payload.toString("utf8"));
  const parseMs = Number((performance.now() - started).toFixed(3));
  const after = process.memoryUsage();
  const rows = parsed.items.length;
  parsed = null;
  if (typeof global.gc === "function") global.gc();
  return { rows, parseMs, heapUsedBefore: before.heapUsed, heapUsedAfter: after.heapUsed,
    heapDeltaBytes: after.heapUsed - before.heapUsed, rssBefore: before.rss, rssAfter: after.rss };
}

test("Architecture B: focal single-response size and loopback measurement",
  { skip: !["C", "ALL"].includes(gateSelection) }, async () => {
  const fixture = await createDataset("architecture-b-1000", 1000, { skewed: true });
  const transactionStarted = performance.now();
  const built = await db.runTransaction(async (transaction) => {
    const groupSnapshot = await transaction.get(db.doc(`groups/${fixture.groupId}`));
    const accountSnapshot = await transaction.get(db.doc(`users/${fixture.ownerId}`));
    assert.equal(groupSnapshot.exists, true);
    assert.equal(accountSnapshot.exists, true);
    const cutoff = groupSnapshot.readTime;
    let remaining = movementDomain.DETECTION_LIMIT;
    const queryStarted = performance.now();
    const informed = await transaction.get(movementQuery("INFORMED", fixture.groupId, cutoff, remaining));
    remaining -= informed.size;
    const administrative = await transaction.get(movementQuery("ADMINISTRATIVE", fixture.groupId, cutoff, remaining));
    remaining -= administrative.size;
    const reversals = await transaction.get(movementQuery("REVERSAL", fixture.groupId, cutoff, remaining));
    const manifest = movementDomain.buildManifest({ scope: { actorId: fixture.ownerId, audience: "OWNER",
      groupId: fixture.groupId, periodStartInclusive, periodEndExclusive, pageSize: 1000 },
    cutoffExclusive: cutoff, informed: informed.docs, administrative: administrative.docs,
    reversals: reversals.docs });
    const manifestBuiltAt = performance.now();
    assert.equal(manifest.facts.length, 1000);
    const personIds = [...new Set(manifest.facts.map((fact) => fact.personId))];
    const people = new Map();
    for (const personId of personIds) {
      const snapshot = await transaction.get(db.doc(`personas/${personId}`));
      const data = snapshot.data();
      people.set(personId, { status: "AVAILABLE", firstName: data.nombre, lastName: data.apellido });
    }
    const presentedAt = performance.now();
    return { cutoff: cutoff.toDate().toISOString(), manifest, people,
      movementResults: informed.size + administrative.size + reversals.size,
      movementResultsByStream: { informed: informed.size, administrative: administrative.size,
        reversal: reversals.size }, presentationResults: personIds.length,
      queryAndManifestMs: Number((manifestBuiltAt - queryStarted).toFixed(3)),
      presentationMs: Number((presentedAt - manifestBuiltAt).toFixed(3)) };
  }, { readOnly: true });
  const transactionMs = Number((performance.now() - transactionStarted).toFixed(3));
  const common = { scope: { groupId: fixture.groupId, from: "2026-10-01", to: "2026-10-31",
    timeZone: "America/Argentina/Buenos_Aires", currency: "ARS" },
  view: { readCutoffExclusive: built.cutoff, manifestDigest: built.manifest.manifestDigest },
  totals: built.manifest.totals };
  const dtoStarted = performance.now();
  const ownerItems = built.manifest.facts.map((fact) => ({ movementId: fact.movementId,
    receiptId: fact.receiptId, kind: fact.kind, origin: fact.origin, amountMinor: fact.amountMinor,
    eventAt: timestampFromTuple(fact.eventAt).toDate().toISOString(), effectiveOn: fact.effectiveOn,
    receiptStateAtCutoff: fact.receiptStateAtCutoff, subject: built.people.get(fact.personId) }));
  const treasuryItems = ownerItems.map(({ receiptId: _omitted, ...item }) => item);
  const dtoConstructionMs = Number((performance.now() - dtoStarted).toFixed(3));
  const ownerSerializationStarted = performance.now();
  const ownerPayload = Buffer.from(JSON.stringify({ audience: "OWNER", ...common, items: ownerItems }), "utf8");
  const ownerSerializationMs = Number((performance.now() - ownerSerializationStarted).toFixed(3));
  const treasurySerializationStarted = performance.now();
  const treasuryPayload = Buffer.from(JSON.stringify({ audience: "TREASURY", ...common,
    items: treasuryItems }), "utf8");
  const treasurySerializationMs = Number((performance.now() - treasurySerializationStarted).toFixed(3));
  const transfer = await transferSamples({ owner: ownerPayload, treasury: treasuryPayload });
  const evidence = { status: "MEASURED_NOT_ADOPTED", facts: 1000, transactionAttempts: 1,
    transactionMs, queryAndManifestMs: built.queryAndManifestMs, presentationMs: built.presentationMs,
    dtoConstructionMs, resultDocuments: { movement: built.movementResults,
      movementByStream: built.movementResultsByStream, authorizationContext: 2,
      presentationUniqueWithinRequest: built.presentationResults },
    owner: { responseBytes: ownerPayload.length, itemBytes: serializedStats(ownerItems),
      serializationMs: ownerSerializationMs, transfer: transfer.owner,
      parseMemory: parseMemorySample(ownerPayload) },
    treasury: { responseBytes: treasuryPayload.length, itemBytes: serializedStats(treasuryItems),
      serializationMs: treasurySerializationMs, transfer: transfer.treasury,
      parseMemory: parseMemorySample(treasuryPayload) },
    caveats: ["Loopback HTTP is not callable or production network transfer",
      "Node parsing is not a browser heap or DOM measurement",
      "Presentation reads were request-local deduplicated over 64 synthetic people",
      "Returned documents are not verified billed reads"] };
  process.stdout.write(`E3_08_ARCHITECTURE_B_EVIDENCE=${JSON.stringify(evidence)}\n`);
});

test.after(async () => {
  await app.delete();
});
