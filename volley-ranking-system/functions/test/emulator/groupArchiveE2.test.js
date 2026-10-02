"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { pendingGroupJoinRequestGuardId, groupJoinRequestDecisionHash, groupJoinRequestDecisionIntentId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-23-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-23-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
async function call(host, projectId, name, data, idToken) { const headers = { "Content-Type": "application/json" }; if (idToken) headers.Authorization = `Bearer ${idToken}`; const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }
async function direct(host, projectId, path, idToken, method = "GET", body) { const headers = { "Content-Type": "application/json" }; if (idToken) headers.Authorization = `Bearer ${idToken}`; const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }); return response.status; }

test("E2-23 archives an owned Group without cascades and preserves private recovery", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST; const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST; const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-23-archive"); const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, outsider, noAccount] = await Promise.all([signUp(authHost, "e2-23-owner@example.invalid"), signUp(authHost, "e2-23-outsider@example.invalid"), signUp(authHost, "e2-23-no-account@example.invalid")]);
  const at = T.fromDate(new Date("2026-09-01T12:00:00.000Z")); const groups = { success: "e2-23-success", stale: "e2-23-stale", open: "e2-23-open", active: "e2-23-active", pending: "e2-23-pending", coordination: "e2-23-coordination", corrupt: "e2-23-corrupt", sameKey: "e2-23-same-key", differentKeys: "e2-23-different-keys", renameRace: "e2-23-rename-race", seasonRace: "e2-23-season-race" };
  const seedGroup = (id, ownerId = owner.uid) => db.collection("groups").doc(id).set({ nombre: `Grupo ${id}`, deporte: "voleibol", ownerId, estado: "activo", createdAt: at, schemaVersion: 1 });
  try {
    await Promise.all([
      db.collection("users").doc(owner.uid).set({ nombre: "Owner", email: owner.email, photoURL: "", createdAt: at }),
      db.collection("users").doc(outsider.uid).set({ nombre: "Outsider", email: outsider.email, photoURL: "", createdAt: at, roles: "admin" }),
      ...Object.values(groups).map((id) => seedGroup(id)),
    ]);

    await t.test("authorization precedes state disclosure and payloads are closed", async () => {
      const [unauthenticated, accountRequired, foreign, missing, opened] = await Promise.all([
        call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.success }),
        call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.success }, noAccount.idToken),
        call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.success }, outsider.idToken),
        call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: "e2-23-missing" }, outsider.idToken),
        call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.success, ownerId: owner.uid }, owner.idToken),
      ]);
      assert.equal(unauthenticated.body?.error?.details?.reason, "UNAUTHENTICATED"); assert.equal(accountRequired.body?.error?.details?.reason, "ACCOUNT_REQUIRED");
      assert.equal(foreign.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal(missing.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal(opened.body?.error?.details?.reason, "VALIDATION_FAILED");
    });

    await t.test("preparation reports every valid blocker without identities or counts", async () => {
      const seasonId = "e2-23-open-season"; await Promise.all([
        db.collection("seasons").doc(seasonId).set({ groupId: groups.open, nombre: "Temporada", fechaInicio: "2026-09-01", estado: "abierta", createdAt: at, schemaVersion: 1 }),
        db.collection("openSeasonGuards").doc(groups.open).set({ seasonId, openedAt: at, guardVersion: 2 }),
      ]);
      const personId = "e2-23-person"; const membershipId = "e2-23-membership"; const activeSeason = "e2-23-active-season";
      await Promise.all([
        db.collection("memberships").doc(membershipId).set({ personId, groupId: groups.active, seasonId: activeSeason, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }),
        db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groups.active, personId)).set({ membershipId, personId, groupId: groups.active, seasonId: activeSeason, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
      ]);
      const pendingPerson = "e2-23-pending-person"; const pendingId = "e2-23-pending-request";
      await Promise.all([
        db.collection("groupJoinRequests").doc(pendingId).set({ personId: pendingPerson, groupId: groups.pending, estado: "pendiente", createdAt: at, schemaVersion: 1 }),
        db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(groups.pending, pendingPerson)).set({ requestId: pendingId, personId: pendingPerson, groupId: groups.pending, createdAt: at, guardVersion: 1 }),
      ]);
      const coordinationPerson = "e2-23-coordination-person"; const requestId = "e2-23-coordination-request"; const key = "e2-23-coordination-key"; const intentId = groupJoinRequestDecisionIntentId(owner.uid, key);
      await Promise.all([
        db.collection("groupJoinRequests").doc(requestId).set({ personId: coordinationPerson, groupId: groups.coordination, estado: "pendiente", createdAt: at, schemaVersion: 1 }),
        db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(groups.coordination, coordinationPerson)).set({ requestId, personId: coordinationPerson, groupId: groups.coordination, createdAt: at, guardVersion: 1 }),
        db.collection("groupJoinRequestDecisionIntents").doc(intentId).set({ requestId, personId: coordinationPerson, groupId: groups.coordination, action: "approve", requestedBy: owner.uid, requestHash: groupJoinRequestDecisionHash(requestId, coordinationPerson, groups.coordination, "approve"), createdAt: at, intentStatus: "pending", intentVersion: 2 }),
        db.collection("groupJoinRequestApprovalCoordinations").doc(requestId).set({ requestId, personId: coordinationPerson, groupId: groups.coordination, seasonId: "e2-23-coordination-season", decisionIntentId: intentId, requestedBy: owner.uid, approvalEffect: "CREATE_MEMBERSHIP", membershipId: "e2-23-coordination-membership", expectedActivationOrdinal: 1, createdAt: at, coordinationVersion: 2 }),
      ]);
      const results = await Promise.all(Object.values({ open: groups.open, active: groups.active, pending: groups.pending, coordination: groups.coordination }).map((groupId) => call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId }, owner.idToken)));
      assert.deepEqual(results.map((result) => result.body.result.eligibility.blockers), [["OPEN_SEASON_EXISTS"], ["ACTIVE_MEMBERSHIPS_EXIST"], ["PENDING_REQUESTS_EXIST"], ["PENDING_REQUESTS_EXIST", "APPROVAL_IN_PROGRESS"]]);
      assert.equal(JSON.stringify(results).includes(pendingPerson), false);
    });

    await t.test("success writes only three Group fields and one exact receipt", async () => {
      const closedSeasonId = "e2-23-success-closed-season";
      await Promise.all([
        db.collection("matches").doc("e2-23-history").set({ marker: "untouched" }),
        db.collection("seasons").doc(closedSeasonId).set({ groupId: groups.success, nombre: "Temporada cerrada", fechaInicio: "2026-08-01", estado: "cerrada", createdAt: at, closedAt: at, closedBy: owner.uid, schemaVersion: 2 }),
      ]); const historyBefore = (await db.collection("matches").doc("e2-23-history").get()).data();
      const prepared = await call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.success }, owner.idToken); assert.deepEqual(prepared.body.result.eligibility, { status: "ELIGIBLE", blockers: [] });
      const before = (await db.collection("groups").doc(groups.success).get()).data(); const request = { groupId: groups.success, expectedArchiveToken: prepared.body.result.archiveToken, idempotencyKey: "e2-23-archive-success-key" };
      const archived = await call(functionsHost, projectId, "archiveOwnGroup", request, owner.idToken); assert.equal(archived.body?.result?.outcome, "ARCHIVED", JSON.stringify(archived.body)); assert.equal(archived.body.result.recovered, false);
      const after = (await db.collection("groups").doc(groups.success).get()).data(); assert.deepEqual(Object.keys(after).sort(), ["archivedAt", "createdAt", "deporte", "estado", "nombre", "ownerId", "schemaVersion"].sort());
      for (const field of ["nombre", "deporte", "ownerId", "createdAt"]) assert.deepEqual(after[field], before[field]); assert.equal(after.estado, "archivado"); assert.equal(after.schemaVersion, 2); assert.equal(Object.hasOwn(after, "archivedBy"), false);
      const receipts = await db.collection("groupArchiveReceipts").where("groupId", "==", groups.success).get(); assert.equal(receipts.size, 1); assert.deepEqual(Object.keys(receipts.docs[0].data()).sort(), ["action", "actorUserId", "appliedState", "archivedAt", "groupId", "outcome", "receiptVersion", "requestHash"].sort()); assert.equal(Object.hasOwn(receipts.docs[0].data(), "idempotencyKey"), false);
      assert.deepEqual((await db.collection("matches").doc("e2-23-history").get()).data(), historyBefore);

      const retry = await call(functionsHost, projectId, "archiveOwnGroup", request, owner.idToken); assert.equal(retry.body.result.outcome, "EXISTING_IDEMPOTENT"); assert.equal(retry.body.result.recovered, true); assert.deepEqual(retry.body.result.appliedEffect, archived.body.result.appliedEffect);
      const keyConflict = await call(functionsHost, projectId, "archiveOwnGroup", { ...request, expectedArchiveToken: "a".repeat(64) }, owner.idToken); assert.equal(keyConflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT");
      const other = await call(functionsHost, projectId, "archiveOwnGroup", { ...request, idempotencyKey: "e2-23-other-archive-key" }, owner.idToken); assert.equal(other.body?.error?.details?.reason, "GROUP_ALREADY_ARCHIVED"); assert.equal((await db.collection("groupArchiveReceipts").where("groupId", "==", groups.success).get()).size, 1);
      const seasons = await call(functionsHost, projectId, "listSeasonsForOwnedGroup", { groupId: groups.success, pageSize: 20 }, owner.idToken); assert.equal(seasons.status, 200, JSON.stringify(seasons.body)); assert.equal(seasons.body.result.currentSeason, null); assert.equal(seasons.body.result.closedSeasons.some((season) => season.id === closedSeasonId), true);
      const opening = await call(functionsHost, projectId, "createAndOpenSeason", { groupId: groups.success, nombre: "No permitida", fechaInicio: "2026-10-02", idempotencyKey: "e2-23-archived-open-key" }, owner.idToken); assert.equal(opening.body?.error?.details?.reason, "GROUP_INCOMPATIBLE");
      await db.collection("groups").doc(groups.success).update({ ownerId: outsider.uid });
      const formerOwnerRecovery = await call(functionsHost, projectId, "archiveOwnGroup", request, owner.idToken); assert.equal(formerOwnerRecovery.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      const formerOwnerHistory = await call(functionsHost, projectId, "listSeasonsForOwnedGroup", { groupId: groups.success, pageSize: 20 }, owner.idToken); assert.equal(formerOwnerHistory.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      await db.collection("groups").doc(groups.success).update({ ownerId: owner.uid });
    });

    await t.test("stale, incompatible correlation and archived operation blocking write nothing", async () => {
      const prepared = await call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.stale }, owner.idToken); await db.collection("groups").doc(groups.stale).update({ nombre: "Renombrado" });
      const stale = await call(functionsHost, projectId, "archiveOwnGroup", { groupId: groups.stale, expectedArchiveToken: prepared.body.result.archiveToken, idempotencyKey: "e2-23-stale-archive-key" }, owner.idToken); assert.equal(stale.body?.error?.details?.reason, "STALE_ARCHIVE"); assert.equal((await db.collection("groups").doc(groups.stale).get()).data().estado, "activo");
      await db.collection("openSeasonGuards").doc(groups.corrupt).set({ seasonId: "e2-23-missing-season", openedAt: at, guardVersion: 2 }); const corrupt = await call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.corrupt }, owner.idToken); assert.equal(corrupt.body?.error?.details?.reason, "GROUP_INCOMPATIBLE");
      const archivedDetail = await call(functionsHost, projectId, "getOwnGroup", { groupId: groups.success }, owner.idToken); assert.equal(archivedDetail.body.result.group.estado, "archivado"); assert.equal(archivedDetail.body.result.editToken, null);
      const rename = await call(functionsHost, projectId, "updateOwnGroupName", { groupId: groups.success, nombre: "No", expectedEditToken: "a".repeat(64), idempotencyKey: "e2-23-rename-archived" }, owner.idToken); assert.equal(rename.body?.error?.details?.reason, "GROUP_INCOMPATIBLE");
      const dashboard = await call(functionsHost, projectId, "getOwnGroupsDashboard", {}, owner.idToken); assert.equal(dashboard.body.result.items.some((group) => group.id === groups.success), false); const list = await call(functionsHost, projectId, "listOwnGroups", {}, owner.idToken); assert.equal(list.body.result.items.some((group) => group.id === groups.success && group.estado === "archivado"), true);
    });

    await t.test("concurrent archives and opposing writers serialize through the Group root", async () => {
      const samePrepared = await call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.sameKey }, owner.idToken); const sameRequest = { groupId: groups.sameKey, expectedArchiveToken: samePrepared.body.result.archiveToken, idempotencyKey: "e2-23-same-key-race" };
      const same = await Promise.all([call(functionsHost, projectId, "archiveOwnGroup", sameRequest, owner.idToken), call(functionsHost, projectId, "archiveOwnGroup", sameRequest, owner.idToken)]);
      assert.deepEqual(same.map((result) => result.body?.result?.outcome).sort(), ["ARCHIVED", "EXISTING_IDEMPOTENT"]);

      const differentPrepared = await call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.differentKeys }, owner.idToken); const differentBase = { groupId: groups.differentKeys, expectedArchiveToken: differentPrepared.body.result.archiveToken };
      const different = await Promise.all([call(functionsHost, projectId, "archiveOwnGroup", { ...differentBase, idempotencyKey: "e2-23-different-left" }, owner.idToken), call(functionsHost, projectId, "archiveOwnGroup", { ...differentBase, idempotencyKey: "e2-23-different-right" }, owner.idToken)]);
      assert.deepEqual(different.map((result) => result.body?.result?.outcome || result.body?.error?.details?.reason).sort(), ["ARCHIVED", "GROUP_ALREADY_ARCHIVED"]);

      const [renamePrepared, renameDetail] = await Promise.all([call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.renameRace }, owner.idToken), call(functionsHost, projectId, "getOwnGroup", { groupId: groups.renameRace }, owner.idToken)]);
      const [archiveResult, renameResult] = await Promise.all([
        call(functionsHost, projectId, "archiveOwnGroup", { groupId: groups.renameRace, expectedArchiveToken: renamePrepared.body.result.archiveToken, idempotencyKey: "e2-23-rename-race-archive" }, owner.idToken),
        call(functionsHost, projectId, "updateOwnGroupName", { groupId: groups.renameRace, nombre: "Nombre concurrente", expectedEditToken: renameDetail.body.result.editToken, idempotencyKey: "e2-23-rename-race-update" }, owner.idToken),
      ]);
      const raceOutcomes = [archiveResult.body?.result?.outcome || archiveResult.body?.error?.details?.reason, renameResult.body?.result?.outcome || renameResult.body?.error?.details?.reason];
      assert.ok(raceOutcomes.includes("ARCHIVED") ? raceOutcomes.includes("GROUP_INCOMPATIBLE") : raceOutcomes.includes("UPDATED") && raceOutcomes.includes("STALE_ARCHIVE"), JSON.stringify(raceOutcomes));

      const seasonPrepared = await call(functionsHost, projectId, "prepareOwnGroupArchive", { groupId: groups.seasonRace }, owner.idToken);
      const [archiveSeason, openSeason] = await Promise.all([
        call(functionsHost, projectId, "archiveOwnGroup", { groupId: groups.seasonRace, expectedArchiveToken: seasonPrepared.body.result.archiveToken, idempotencyKey: "e2-23-season-race-archive" }, owner.idToken),
        call(functionsHost, projectId, "createAndOpenSeason", { groupId: groups.seasonRace, nombre: "Temporada carrera", fechaInicio: "2026-10-01", idempotencyKey: "e2-23-season-race-open" }, owner.idToken),
      ]);
      const finalGroup = (await db.collection("groups").doc(groups.seasonRace).get()).data(); const openRoots = await db.collection("seasons").where("groupId", "==", groups.seasonRace).where("estado", "==", "abierta").get();
      assert.equal(finalGroup.estado === "archivado" && !openRoots.empty, false, JSON.stringify({ archiveSeason: archiveSeason.body, openSeason: openSeason.body }));
    });

    await t.test("Rules deny canonical v2 and receipts to anonymous, Owner and non-Owner", async () => {
      const receipt = (await db.collection("groupArchiveReceipts").where("groupId", "==", groups.success).get()).docs[0];
      for (const token of [undefined, owner.idToken, outsider.idToken]) {
        assert.equal(await direct(firestoreHost, projectId, `groups/${groups.success}`, token), 403);
        assert.equal(await direct(firestoreHost, projectId, `groupArchiveReceipts/${receipt.id}`, token), 403);
        assert.equal(await direct(firestoreHost, projectId, `groups/${groups.success}?updateMask.fieldPaths=nombre`, token, "PATCH", { fields: { nombre: { stringValue: "Directo" } } }), 403);
      }
    });
  } finally {
    const groupIds = Object.values(groups);
    for (const collection of [
      "groupArchiveReceipts", "groupNameUpdateReceipts", "seasonOpeningReceipts",
      "groupJoinRequestApprovalCoordinations", "groupJoinRequestDecisionIntents",
      "pendingGroupJoinRequestGuards", "groupJoinRequests", "activeMembershipGuards",
      "memberships", "seasons",
    ]) {
      await fixtures.registerQuery(db.collection(collection).where("groupId", "in", groupIds));
    }
    for (const groupId of groupIds) {
      fixtures.register(db.collection("groups").doc(groupId));
      fixtures.register(db.collection("openSeasonGuards").doc(groupId));
    }
    fixtures.register(db.collection("matches").doc("e2-23-history"));
    for (const actor of [owner, outsider, noAccount]) fixtures.register(db.collection("users").doc(actor.uid));
    await fixtures.cleanup();
    await Promise.allSettled([auth.deleteUser(owner.uid), auth.deleteUser(outsider.uid), auth.deleteUser(noAccount.uid)]); await app.delete();
  }
});
