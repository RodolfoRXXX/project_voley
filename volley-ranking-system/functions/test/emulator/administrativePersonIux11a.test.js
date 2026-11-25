"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux11a`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Iux11a-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, token: body.idToken, email }; }
async function call(host, projectId, name, data, token) { const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }

test("IUX-11A alta, recovery, custodia, corrección y proyecciones", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "iux-11a"); const db = app.firestore();
  const owner = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11a-owner@example.invalid");
  const other = await signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux11a-other@example.invalid");
  const groupId = "iux11a-group", seasonId = "iux11a-season"; const createdAt = new Date("2026-11-25T12:00:00Z");
  try {
    await db.doc(`users/${owner.uid}`).set({ nombre: "Owner", email: owner.email, photoURL: "", createdAt });
    await db.doc(`users/${other.uid}`).set({ nombre: "Otra", email: other.email, photoURL: "", createdAt });
    await db.doc(`groups/${groupId}`).set({ nombre: "IUX 11A", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt, schemaVersion: 1 });
    await db.doc(`seasons/${seasonId}`).set({ groupId, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt, schemaVersion: 1 });
    await db.doc(`openSeasonGuards/${groupId}`).set({ seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt, guardVersion: 1 });
    const command = { groupId, firstName: "Ana", lastName: "Sin Cuenta", contactEmail: null, idempotencyKey: "iux11a-create-stable-0001" };
    const first = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "createAdministrativePersonForOwnedGroup", command, owner.token);
    assert.equal(first.status, 200, JSON.stringify(first.body)); assert.equal(first.body.result.outcome, "CREATED");
    const retry = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "createAdministrativePersonForOwnedGroup", command, owner.token);
    assert.equal(retry.body.result.outcome, "RECOVERED"); assert.equal(retry.body.result.personId, first.body.result.personId);
    const personId = first.body.result.personId, membershipId = first.body.result.membershipId;
    const withEmail = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "createAdministrativePersonForOwnedGroup", { groupId, firstName: "Beto", lastName: "Con Correo", contactEmail: "beto@example.invalid", idempotencyKey: "iux11a-create-email-0001" }, owner.token);
    assert.equal(withEmail.status, 200, JSON.stringify(withEmail.body)); assert.equal((await db.doc(`personas/${withEmail.body.result.personId}`).get()).data().emailContacto, "beto@example.invalid");
    const rosterSummary = await db.collection("activeRosterSummaries").where("groupId", "==", groupId).where("seasonId", "==", seasonId).limit(1).get(); assert.equal(rosterSummary.docs[0].data().activeMembershipCount, 2);
    const preparedExit = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId: withEmail.body.result.membershipId }, owner.token);
    const finalized = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId: withEmail.body.result.membershipId, activationRef: preparedExit.body.result.activationRef, idempotencyKey: "iux11a-finalize-member-001" }, owner.token);
    assert.equal(finalized.status, 200, JSON.stringify(finalized.body));
    assert.equal((await db.doc(`personas/${personId}`).get()).data().emailContacto, undefined);
    assert.equal((await db.doc(`memberships/${membershipId}`).get()).data().personId, personId);
    assert.equal((await db.doc(`administrativePersonCustodies/${personId}`).get()).data().custodianGroupId, groupId);
    assert.equal((await db.collection("localizablePersonDirectory").where("personId", "==", personId).get()).empty, true);
    const conceptResponse = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "createGroupChargeConcept", { groupId, name: "Cuota IUX-11A", kind: "MONTHLY", defaultAmountMinor: 250000, idempotencyKey: "iux11a-concept-stable-001" }, owner.token);
    const concept = conceptResponse.body.result.resource;
    const generated = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "generateMembershipObligations", { groupId, conceptId: concept.conceptId, expectedConceptVersion: concept.version, membershipIds: [membershipId], dueDate: "2026-11-30", baseAmountMinor: 250000, exceptions: [], generationIdempotencyKey: "iux11a-generation-stable-01", kind: "MONTHLY", periodKey: "2026-11" }, owner.token);
    assert.equal(generated.status, 200, JSON.stringify(generated.body)); assert.equal(generated.body.result.rows[0].outcome, "CREATED", JSON.stringify(generated.body));
    const payment = (await db.collection("payments").where("membershipId", "==", membershipId).limit(1).get()).docs[0]; assert.ok(payment);
    const preview = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "previewAdministrativeReceipt", { groupId, membershipId, receivedOn: "2026-11-25", lines: [{ paymentId: payment.id, allocationMode: "FULL", amountMinor: 250000, expectedBalanceMinor: 250000, expectedEconomicRevision: 1 }] }, owner.token);
    assert.equal(preview.status, 200, JSON.stringify(preview.body));
    const recorded = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "recordAdministrativeReceipt", { groupId, membershipId, receivedOn: "2026-11-25", lines: [{ paymentId: payment.id, allocationMode: "FULL", amountMinor: 250000, expectedBalanceMinor: 250000, expectedEconomicRevision: 1 }], candidateRevision: preview.body.result.candidateRevision, candidateDigest: preview.body.result.candidateDigest, relatedNoticeDecisions: [], idempotencyKey: "iux11a-receipt-stable-0001" }, owner.token);
    assert.equal(recorded.status, 200, JSON.stringify(recorded.body)); assert.equal((await payment.ref.get()).data().balanceMinor, 0);
    const denied = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "updateAdministrativePersonForOwnedGroup", { groupId, personId, firstName: "Intrusa", lastName: "Cuenta", contactEmail: null, expectedRevision: 1, idempotencyKey: "iux11a-denied-update-001" }, other.token);
    assert.equal(denied.body.error.details.reason, "NOT_AUTHORIZED");
    await db.doc(`groups/${groupId}`).update({ estado: "archivado", archivedAt: createdAt, schemaVersion: 2 });
    const updated = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "updateAdministrativePersonForOwnedGroup", { groupId, personId, firstName: "Ana María", lastName: "Corregida", contactEmail: "ana@example.invalid", expectedRevision: 1, idempotencyKey: "iux11a-update-stable-0001" }, owner.token);
    assert.equal(updated.status, 200, JSON.stringify(updated.body)); assert.equal(updated.body.result.revision, 2);
    const person = (await db.doc(`personas/${personId}`).get()).data(); assert.equal(person.nombre, "Ana María"); assert.equal(person.emailContacto, "ana@example.invalid");
    const correctedFinalized = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "updateAdministrativePersonForOwnedGroup", { groupId, personId: withEmail.body.result.personId, firstName: "Beto", lastName: "Finalizado", contactEmail: "beto@example.invalid", expectedRevision: 1, idempotencyKey: "iux11a-update-finalized-001" }, owner.token);
    assert.equal(correctedFinalized.status, 200, JSON.stringify(correctedFinalized.body));
    const legacyPersonId = "iux11a-administrative-without-history";
    await db.doc(`personas/${legacyPersonId}`).set({ nombre: "Cata", apellido: "Sin Historia", createdAt, schemaVersion: 2 });
    await db.doc(`administrativePersonCustodies/${legacyPersonId}`).set({ personId: legacyPersonId, originGroupId: groupId, custodianGroupId: groupId, createdByAccountId: owner.uid, state: "UNLINKED", revision: 1, createdAt, updatedAt: createdAt, schemaVersion: 1 });
    const listed = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listAdministrativePersonsForOwnedGroup", { groupId, pageSize: 1 }, owner.token);
    assert.equal(listed.status, 200, JSON.stringify(listed.body)); assert.ok(listed.body.result.nextCursor);
    const listedNext = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listAdministrativePersonsForOwnedGroup", { groupId, pageSize: 1, cursor: listed.body.result.nextCursor }, owner.token);
    const nonMembers = [...listed.body.result.items, ...listedNext.body.result.items]; assert.equal(nonMembers.length, 2); assert.equal(nonMembers.find((item) => item.personId === withEmail.body.result.personId).reincorporation, "REACTIVATE"); assert.equal(nonMembers.find((item) => item.personId === legacyPersonId).reincorporation, "CREATE");
    await db.doc(`groups/${groupId}`).update({ estado: "activo", archivedAt: admin.firestore.FieldValue.delete(), schemaVersion: 1 });
    const preparedReactivation = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "prepareAdministrativePersonReincorporation", { groupId, personId: withEmail.body.result.personId }, owner.token);
    assert.equal(preparedReactivation.body.result.strategy, "REACTIVATE"); assert.deepEqual(preparedReactivation.body.result.destinationSeason, { seasonId, name: "2026" });
    const reactivationCommand = { groupId, personId: withEmail.body.result.personId, previewToken: preparedReactivation.body.result.previewToken, idempotencyKey: "iux11a-reactivate-stable-01" };
    const reactivated = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "confirmAdministrativePersonReincorporation", reactivationCommand, owner.token);
    const recoveredReactivation = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "confirmAdministrativePersonReincorporation", reactivationCommand, owner.token);
    assert.equal(reactivated.status, 200, JSON.stringify(reactivated.body)); assert.equal(recoveredReactivation.status, 200, JSON.stringify(recoveredReactivation.body)); assert.equal(recoveredReactivation.body.result.membershipId, reactivated.body.result.membershipId);
    const staleCreation = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "prepareAdministrativePersonReincorporation", { groupId, personId: legacyPersonId }, owner.token);
    await db.doc(`openSeasonGuards/${groupId}`).delete();
    const rejectedStaleCreation = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "confirmAdministrativePersonReincorporation", { groupId, personId: legacyPersonId, previewToken: staleCreation.body.result.previewToken, idempotencyKey: "iux11a-stale-season-0001" }, owner.token);
    assert.equal(rejectedStaleCreation.body.error.details.reason, "CONTEXT_CHANGED");
    await db.doc(`openSeasonGuards/${groupId}`).set({ seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt, guardVersion: 1 });
    const preparedCreation = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "prepareAdministrativePersonReincorporation", { groupId, personId: legacyPersonId }, owner.token);
    assert.equal(preparedCreation.body.result.strategy, "CREATE");
    const createdMembership = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "confirmAdministrativePersonReincorporation", { groupId, personId: legacyPersonId, previewToken: preparedCreation.body.result.previewToken, idempotencyKey: "iux11a-recreate-stable-001" }, owner.token);
    assert.equal(createdMembership.status, 200, JSON.stringify(createdMembership.body));
    const roster = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "listActiveGroupMembersForOwnedGroup", { groupId, pageSize: 20 }, owner.token);
    assert.equal(roster.status, 200, JSON.stringify(roster.body)); assert.equal(roster.body.result.items.length, 3); assert.equal(roster.body.result.items.every((item) => item.administrativeCustody?.status === "EDITABLE"), true);
    const preparedSecondExit = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "prepareActiveGroupMemberFinalizationForOwnedGroup", { groupId, membershipId: reactivated.body.result.membershipId }, owner.token);
    const secondExit = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "finalizeActiveGroupMemberForOwnedGroup", { groupId, membershipId: reactivated.body.result.membershipId, activationRef: preparedSecondExit.body.result.activationRef, idempotencyKey: "iux11a-finalize-second-001" }, owner.token);
    assert.equal(secondExit.status, 200, JSON.stringify(secondExit.body));
    const renewedSeasonId = "iux11a-season-2027"; await db.doc(`seasons/${seasonId}`).update({ estado: "cerrada", closedAt: createdAt, closedBy: owner.uid, schemaVersion: 2 });
    await db.doc(`seasons/${renewedSeasonId}`).set({ groupId, nombre: "2027", fechaInicio: "2027-01-01", estado: "abierta", createdAt, schemaVersion: 1 }); await db.doc(`openSeasonGuards/${groupId}`).set({ seasonId: renewedSeasonId, idempotencyKeyHash: "e".repeat(64), requestHash: "f".repeat(64), createdAt, guardVersion: 1 });
    const preparedRenewal = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "prepareAdministrativePersonReincorporation", { groupId, personId: withEmail.body.result.personId }, owner.token); assert.equal(preparedRenewal.body.result.strategy, "RENEW"); assert.equal(preparedRenewal.body.result.destinationSeason.name, "2027");
    const renewed = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "confirmAdministrativePersonReincorporation", { groupId, personId: withEmail.body.result.personId, previewToken: preparedRenewal.body.result.previewToken, idempotencyKey: "iux11a-renew-stable-0001" }, owner.token);
    assert.equal(renewed.status, 200, JSON.stringify(renewed.body)); assert.notEqual(renewed.body.result.membershipId, reactivated.body.result.membershipId);
    const raceGroup = "iux11a-race-group", raceSeason = "iux11a-race-season";
    await db.doc(`groups/${raceGroup}`).set({ nombre: "Carrera", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt, schemaVersion: 1 });
    await db.doc(`seasons/${raceSeason}`).set({ groupId: raceGroup, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt, schemaVersion: 1 });
    await db.doc(`openSeasonGuards/${raceGroup}`).set({ seasonId: raceSeason, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt, guardVersion: 1 });
    const [raceCreate] = await Promise.all([call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "createAdministrativePersonForOwnedGroup", { groupId: raceGroup, firstName: "Cierre", lastName: "Concurrente", contactEmail: null, idempotencyKey: "iux11a-race-create-0001" }, owner.token), db.runTransaction(async (transaction) => { const guard = db.doc(`openSeasonGuards/${raceGroup}`); await transaction.get(guard); transaction.delete(guard); })]);
    const raceCustodies = await db.collection("administrativePersonCustodies").where("custodianGroupId", "==", raceGroup).get();
    assert.equal(raceCreate.status === 200 ? raceCustodies.size === 1 : raceCustodies.empty, true, JSON.stringify(raceCreate.body));
    await db.doc(`groups/${groupId}`).delete();
    const orphaned = await call(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "updateAdministrativePersonForOwnedGroup", { groupId, personId, firstName: "No", lastName: "Aplicar", contactEmail: null, expectedRevision: 2, idempotencyKey: "iux11a-orphaned-update-01" }, owner.token);
    assert.equal(orphaned.body.error.details.reason, "ORPHANED_CUSTODY"); assert.equal((await db.doc(`personas/${personId}`).get()).data().nombre, "Ana María");
  } finally {
    for (const name of ["paymentDeliveries", "paymentReceiptCandidateGuards", "administrativeReceiptCommandReceipts", "payments", "paymentGenerationIntents", "groupChargeConcepts", "paymentCommandReceipts", "dashboardTaskOutbox", "activeRosterSearchEntries", "activeRosterSearchSummaries", "activeRosterContributions", "activeRosterSummaries", "administrativePersonCommandReceipts", "administrativePersonCustodies", "activeMembershipGuards", "membershipLifecycleGuards", "memberships", "openSeasonGuards", "seasons", "groups", "personas", "users"]) { const snapshot = await db.collection(name).get(); for (const document of snapshot.docs) { for (const sub of await document.ref.listCollections()) { const nested = await sub.get(); for (const item of nested.docs) await item.ref.delete(); } await document.ref.delete(); } }
    await app.delete();
  }
});
