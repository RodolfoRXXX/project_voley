"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { sha256LengthPrefixed } = require("../../src/memberships/application/membershipHashing");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux11b`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Iux11b-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, token: body.idToken, email };
}
async function call(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
function reason(response) { return response.body?.error?.details?.reason; }

test("IUX-11B vincula, rechaza, recupera y coordina carreras sin efectos parciales", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "iux-11b"); const db = app.firestore(); const auth = app.auth();
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-owner@example.invalid");
  const target = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-target@example.invalid");
  const concurrent = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-concurrent@example.invalid");
  const ensureRace = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-ensure-race@example.invalid");
  const pendingMerge = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-pending-merge@example.invalid");
  const correctionRace = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-correction-race@example.invalid");
  const rateAccount = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-rate@example.invalid");
  const unverified = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11b-unverified@example.invalid");
  const accounts = [owner, target, concurrent, ensureRace, pendingMerge, correctionRace, rateAccount, unverified];
  const groupId = "iux11b-group", seasonId = "iux11b-season", createdAt = new Date("2026-11-26T12:00:00Z");
  try {
    for (const account of accounts) await db.doc(`users/${account.uid}`).set({ nombre: account.email.split("@")[0], email: account.email, photoURL: "", createdAt });
    await db.doc(`groups/${groupId}`).set({ nombre: "Grupo histórico IUX-11B", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt, schemaVersion: 1 });
    await db.doc(`seasons/${seasonId}`).set({ groupId, nombre: "Temporada cerrada 2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt, schemaVersion: 1 });
    await db.doc(`openSeasonGuards/${groupId}`).set({ seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt, guardVersion: 1 });

    const specifications = [
      ["Titular", "Histórica", target.email, "target"], ["Doble", "Aceptación", concurrent.email, "concurrent"],
      ["Carrera", "Alta propia", ensureRace.email, "ensure"], ["Fusión", "Pendiente", pendingMerge.email, "merge"],
      ["Correo", "Concurrente", correctionRace.email, "correction"], ["Límite", "Lecturas", rateAccount.email, "rate"],
    ];
    const created = new Map();
    for (const [firstName, lastName, contactEmail, key] of specifications) {
      const response = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "createAdministrativePersonForOwnedGroup", { groupId, firstName, lastName, contactEmail, idempotencyKey: `iux11b-create-${key}-stable-0001` }, owner.token);
      assert.equal(response.status, 200, JSON.stringify(response.body)); created.set(key, response.body.result);
    }

    const finalizedPreview = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId: created.get("target").membershipId }, owner.token);
    const finalized = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId: created.get("target").membershipId, activationRef: finalizedPreview.body.result.activationRef, idempotencyKey: "iux11b-finalize-target-0001" }, owner.token);
    assert.equal(finalized.status, 200, JSON.stringify(finalized.body));
    await db.doc(`seasons/${seasonId}`).update({ estado: "cerrada", closedAt: createdAt, closedBy: owner.uid, schemaVersion: 2 });
    await db.doc(`openSeasonGuards/${groupId}`).delete();
    await db.doc(`groups/${groupId}`).update({ estado: "archivado", archivedAt: createdAt, schemaVersion: 2 });
    await db.doc("memberships/iux11b-older-target-history").set({ personId: created.get("target").personId, groupId, seasonId, estado: "finalizada", fechaIngreso: new Date("2025-01-01T12:00:00Z"), fechaEgreso: new Date("2025-12-01T12:00:00Z"), createdAt, schemaVersion: 2 });

    const deniedUnverified = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, target.token);
    assert.equal(reason(deniedUnverified), "EMAIL_NOT_VERIFIED");
    for (const account of [target, concurrent, ensureRace, pendingMerge, correctionRace, rateAccount]) await auth.updateUser(account.uid, { emailVerified: true });

    const firstList = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, target.token);
    assert.equal(firstList.status, 200, JSON.stringify(firstList.body)); assert.equal(firstList.body.result.items.length, 1); assert.deepEqual(firstList.body.result.measurement, { authReads: 1, firestoreReads: 5, firestoreReadBudget: 24, inspectedCandidates: 1, decisionReads: 1 });
    const original = firstList.body.result.items[0];
    const switchedAccount = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkCandidate", { candidateRef: original.candidateRef }, concurrent.token);
    assert.equal(reason(switchedAccount), "CURSOR_INVALID");
    const reviewed = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkCandidate", { candidateRef: original.candidateRef }, target.token);
    assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body)); assert.equal(reviewed.body.result.measurement.firestoreReads, 9); assert.equal(reviewed.body.result.candidate.originGroup.archived, true); assert.equal(reviewed.body.result.candidate.participation.membershipId, created.get("target").membershipId); assert.equal(reviewed.body.result.candidate.participation.status, "finalizada"); assert.equal(reviewed.body.result.candidate.participation.seasonStatus, "cerrada");

    const rejected = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "rejectMyAdministrativePersonLinkCandidate", { candidateRef: original.candidateRef, expectedEmailRevision: original.emailRevision, idempotencyKey: "iux11b-reject-target-0001" }, target.token);
    assert.equal(rejected.body.result.outcome, "REJECTED", JSON.stringify(rejected.body));
    const away = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "updateAdministrativePersonForOwnedGroup", { groupId, personId: created.get("target").personId, firstName: "Titular", lastName: "Histórica", contactEmail: "otro-correo@example.invalid", expectedRevision: 1, idempotencyKey: "iux11b-email-away-0001" }, owner.token);
    assert.equal(away.status, 200, JSON.stringify(away.body));
    const back = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "updateAdministrativePersonForOwnedGroup", { groupId, personId: created.get("target").personId, firstName: "Titular corregida", lastName: "Histórica", contactEmail: target.email, expectedRevision: 2, idempotencyKey: "iux11b-email-back-0001" }, owner.token);
    assert.equal(back.status, 200, JSON.stringify(back.body));
    const stillRejected = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "REJECTED", pageSize: 10 }, target.token);
    assert.equal(stillRejected.body.result.items.length, 1, JSON.stringify(stillRejected.body)); assert.equal(stillRejected.body.result.items[0].firstName, "Titular corregida");
    const pendingAfterRoundTrip = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, target.token);
    assert.equal(pendingAfterRoundTrip.body.result.items.length, 0);
    const discarded = stillRejected.body.result.items[0];
    const reconsidered = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "reconsiderMyAdministrativePersonLinkCandidate", { candidateRef: discarded.candidateRef, expectedDecisionRevision: discarded.decisionRevision, idempotencyKey: "iux11b-reconsider-target-0001" }, target.token);
    assert.equal(reconsidered.body.result.outcome, "RECONSIDERED", JSON.stringify(reconsidered.body));
    const pendingAgain = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, target.token);
    const reconsideredCandidate = pendingAgain.body.result.items[0]; const reconsideredDetail = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkCandidate", { candidateRef: reconsideredCandidate.candidateRef }, target.token);
    const adoptionCommand = { candidateRef: reconsideredCandidate.candidateRef, expectedEmailRevision: reconsideredCandidate.emailRevision, previewToken: reconsideredDetail.body.result.previewToken, idempotencyKey: "iux11b-adopt-target-0001" };
    const adopted = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "recognizeMyAdministrativePersonLinkCandidate", adoptionCommand, target.token);
    const recovered = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "recognizeMyAdministrativePersonLinkCandidate", adoptionCommand, target.token);
    assert.equal(adopted.body.result.outcome, "ADOPTED", JSON.stringify(adopted.body)); assert.ok(adopted.body.result.measurement.firestoreReads <= 12); assert.equal(recovered.body.result.outcome, "RECOVERED"); assert.equal(recovered.body.result.measurement.firestoreReads, 1); assert.equal(recovered.body.result.personId, adopted.body.result.personId);
    const recoveredByRef = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkDecisionResult", { operationRef: adopted.body.result.operationRef }, target.token);
    assert.equal(recoveredByRef.body.result.personId, adopted.body.result.personId);
    assert.equal((await db.doc(`users/${target.uid}`).get()).data().personaId, created.get("target").personId);
    assert.equal((await db.doc(`administrativePersonCustodies/${created.get("target").personId}`).get()).data().state, "LINKED");
    assert.equal((await db.doc(`personAccountAssignments/${created.get("target").personId}`).get()).data().accountId, target.uid);
    assert.deepEqual((await db.doc(`accountIdentities/${target.uid}`).get()).data(), {
      accountId: target.uid, primaryPersonId: created.get("target").personId, state: "MIRRORED_SINGLE", identityRevision: 1,
      createdAt: (await db.doc(`accountIdentities/${target.uid}`).get()).data().createdAt,
      updatedAt: (await db.doc(`accountIdentities/${target.uid}`).get()).data().updatedAt,
      schemaVersion: 1,
    });
    assert.equal((await db.doc(`personIdentityAssignments/${created.get("target").personId}`).get()).data().source, "IUX11B_ADOPTION");
    assert.equal((await db.doc(`personDiscoverability/${created.get("target").personId}`).get()).exists, false);
    const ownPerson = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyPerson", {}, target.token); assert.equal(ownPerson.body.result.person.personId, created.get("target").personId);
    const ownHistory = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyGroupMembershipHistory", { pageSize: 5 }, target.token); assert.equal(ownHistory.status, 200, JSON.stringify(ownHistory.body)); assert.equal(ownHistory.body.result.items[0].group.id, groupId); assert.equal(ownHistory.body.result.items[0].status, "HISTORICAL");
    const obligations = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyObligations", { status: "OPEN", pageSize: 20 }, target.token); assert.equal(obligations.status, 200, JSON.stringify(obligations.body));

    const concurrentList = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, concurrent.token); const concurrentCandidate = concurrentList.body.result.items[0];
    const concurrentDetail = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkCandidate", { candidateRef: concurrentCandidate.candidateRef }, concurrent.token);
    const doubleCommands = ["a", "b"].map((suffix) => call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "recognizeMyAdministrativePersonLinkCandidate", { candidateRef: concurrentCandidate.candidateRef, expectedEmailRevision: concurrentCandidate.emailRevision, previewToken: concurrentDetail.body.result.previewToken, idempotencyKey: `iux11b-double-adoption-${suffix}-0001` }, concurrent.token));
    const doubleResults = await Promise.all(doubleCommands); assert.equal(doubleResults.filter((entry) => entry.body.result?.outcome === "ADOPTED").length, 1); assert.equal((await db.collection("personAccountAssignments").where("accountId", "==", concurrent.uid).get()).size, 1);

    const ensureList = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, ensureRace.token); const ensureCandidate = ensureList.body.result.items[0]; const ensureDetail = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkCandidate", { candidateRef: ensureCandidate.candidateRef }, ensureRace.token);
    const [ensureResult, recognizeResult] = await Promise.all([
      call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "ensureMyPerson", { firstName: "Propia", lastName: "Concurrente", contactEmail: ensureRace.email }, ensureRace.token),
      call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "recognizeMyAdministrativePersonLinkCandidate", { candidateRef: ensureCandidate.candidateRef, expectedEmailRevision: ensureCandidate.emailRevision, previewToken: ensureDetail.body.result.previewToken, idempotencyKey: "iux11b-ensure-race-recognize-0001" }, ensureRace.token),
    ]);
    assert.equal(ensureResult.status, 200, JSON.stringify(ensureResult.body)); assert.equal(recognizeResult.status, 200, JSON.stringify(recognizeResult.body));
    const ensureUser = (await db.doc(`users/${ensureRace.uid}`).get()).data(); assert.equal(typeof ensureUser.personaId, "string");
    const ensureAssignments = await db.collection("personAccountAssignments").where("accountId", "==", ensureRace.uid).get(); assert.ok(ensureAssignments.size <= 1); if (ensureAssignments.size === 1) assert.equal(ensureAssignments.docs[0].id, ensureUser.personaId);

    const ownBeforeMerge = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "ensureMyPerson", { firstName: "Ficha", lastName: "Propia", contactEmail: pendingMerge.email }, pendingMerge.token); assert.equal(ownBeforeMerge.status, 200);
    const mergeList = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, pendingMerge.token); const mergeCandidate = mergeList.body.result.items[0]; const mergeDetail = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkCandidate", { candidateRef: mergeCandidate.candidateRef }, pendingMerge.token);
    const mergeRecognition = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "recognizeMyAdministrativePersonLinkCandidate", { candidateRef: mergeCandidate.candidateRef, expectedEmailRevision: mergeCandidate.emailRevision, previewToken: mergeDetail.body.result.previewToken, idempotencyKey: "iux11b-pending-merge-0001" }, pendingMerge.token);
    assert.equal(mergeRecognition.body.result.outcome, "RECOGNIZED_PENDING_MERGE", JSON.stringify(mergeRecognition.body)); assert.equal((await db.doc(`administrativePersonCustodies/${created.get("merge").personId}`).get()).data().state, "UNLINKED"); assert.equal((await db.doc(`administrativePersonLinkCandidates/${created.get("merge").personId}`).get()).exists, true);

    const correctionList = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, correctionRace.token); const correctionCandidate = correctionList.body.result.items[0]; const correctionDetail = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "getMyAdministrativePersonLinkCandidate", { candidateRef: correctionCandidate.candidateRef }, correctionRace.token);
    const [correction, correctionRecognition] = await Promise.all([
      call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "updateAdministrativePersonForOwnedGroup", { groupId, personId: created.get("correction").personId, firstName: "Correo", lastName: "Concurrente", contactEmail: "retirado@example.invalid", expectedRevision: 1, idempotencyKey: "iux11b-correction-race-owner-0001" }, owner.token),
      call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "recognizeMyAdministrativePersonLinkCandidate", { candidateRef: correctionCandidate.candidateRef, expectedEmailRevision: correctionCandidate.emailRevision, previewToken: correctionDetail.body.result.previewToken, idempotencyKey: "iux11b-correction-race-target-0001" }, correctionRace.token),
    ]);
    assert.ok(correction.status === 200 || correctionRecognition.status === 200); const correctionCustody = (await db.doc(`administrativePersonCustodies/${created.get("correction").personId}`).get()).data();
    if (correctionRecognition.status === 200) assert.equal(correctionCustody.state, "LINKED"); else {
      assert.equal(correction.status, 200);
      const retiredCandidate = await db.doc(`administrativePersonLinkCandidates/${created.get("correction").personId}`).get();
      const oldAccountList = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, correctionRace.token);
      assert.equal(retiredCandidate.exists, true);
      assert.equal(retiredCandidate.data().emailRevision, 2);
      assert.equal(oldAccountList.body.result.items.length, 0);
    }

    const rateWindow = Math.floor(Date.now() / 10000) * 10000;
    for (const windowStart of [rateWindow, rateWindow + 10000]) {
      const bucketId = sha256LengthPrefixed(["sportexa:IUX-11B:v1", "rate", rateAccount.uid, "LIST_BURST", String(windowStart)]);
      await db.doc(`administrativePersonLinkRateLimits/${bucketId}`).set({ accountId: rateAccount.uid, family: "LIST_BURST", windowStart, windowMs: 10000, count: 10, updatedAt: createdAt, schemaVersion: 1 });
    }
    const limited = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listMyAdministrativePersonLinkCandidates", { bucket: "PENDING", pageSize: 10 }, rateAccount.token);
    assert.equal(reason(limited), "RATE_LIMITED", JSON.stringify(limited));
  } finally {
    const collections = ["personIdentityAssignments", "accountIdentities", "administrativePersonLinkRateLimits", "administrativePersonLinkReceipts", "administrativePersonLinkDecisions", "accountVerifiedEmailCredentials", "personAccountAssignments", "administrativePersonLinkCandidates", "personDiscoverability", "discoverablePersonDirectory", "dashboardTaskOutbox", "activeRosterSearchEntries", "activeRosterSearchSummaries", "activeRosterContributions", "activeRosterSummaries", "administrativePersonCommandReceipts", "administrativePersonCustodies", "activeMembershipGuards", "membershipLifecycleGuards", "memberships", "openSeasonGuards", "seasons", "groups", "personas", "users"];
    for (const name of collections) { const snapshot = await db.collection(name).get(); for (const document of snapshot.docs) { for (const nested of await document.ref.listCollections()) { const children = await nested.get(); for (const child of children.docs) await child.ref.delete(); } await document.ref.delete(); } }
    await app.delete();
  }
});
