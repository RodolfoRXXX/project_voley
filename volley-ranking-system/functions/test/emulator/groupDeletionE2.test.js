"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-24-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-24-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
async function call(host, projectId, name, data, idToken) { const headers = { "Content-Type": "application/json" }; if (idToken) headers.Authorization = `Bearer ${idToken}`; const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }
async function direct(host, projectId, path, idToken, method = "GET", body) { const headers = { "Content-Type": "application/json" }; if (idToken) headers.Authorization = `Bearer ${idToken}`; const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }); return response.status; }

test("E2-24 deletes only an eligible owned v1 and preserves private historical recovery", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST; const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST; const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, `e2-24-${Date.now()}`); const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const fixtures = createFirestoreFixtureRegistry(db); const prefix = `e2-24-${Date.now()}`;
  const [owner, owner2, owner3, owner4, outsider, noAccount] = await Promise.all([
    signUp(authHost, `${prefix}-owner@example.invalid`), signUp(authHost, `${prefix}-owner2@example.invalid`),
    signUp(authHost, `${prefix}-owner3@example.invalid`), signUp(authHost, `${prefix}-owner4@example.invalid`), signUp(authHost, `${prefix}-outsider@example.invalid`),
    signUp(authHost, `${prefix}-no-account@example.invalid`),
  ]);
  const actors = [owner, owner2, owner3, owner4, outsider]; const at = T.fromDate(new Date("2026-10-01T12:00:00.000Z"));
  const creationA = { nombre: "Grupo A", deporte: "voleibol", idempotencyKey: `${prefix}-create-a-key` };
  let groupA; let groupC; let raceGroup;
  try {
    for (const actor of actors) await fixtures.set(db.collection("users").doc(actor.uid), { nombre: "Owner", email: actor.email, photoURL: "", createdAt: at });

    await t.test("authorization, no enumeration and closed payload precede disclosure", async () => {
      const created = await call(functionsHost, projectId, "createOwnGroup", creationA, owner.idToken); assert.equal(created.body?.result?.outcome, "created", JSON.stringify(created.body)); groupA = created.body.result.group.id; fixtures.register(db.collection("groups").doc(groupA)); fixtures.register(db.collection("groupCreationGuards").doc(owner.uid));
      const [unauthenticated, accountRequired, foreign, missing, extra] = await Promise.all([
        call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: groupA }),
        call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: groupA }, noAccount.idToken),
        call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: groupA }, outsider.idToken),
        call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: `${prefix}-missing` }, outsider.idToken),
        call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: groupA, force: true }, owner.idToken),
      ]);
      assert.equal(unauthenticated.body?.error?.details?.reason, "UNAUTHENTICATED"); assert.equal(accountRequired.body?.error?.details?.reason, "ACCOUNT_REQUIRED");
      assert.equal(foreign.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal(missing.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal(extra.body?.error?.details?.reason, "VALIDATION_FAILED");
    });

    await t.test("all functional categories block without exposing identities or counts", async () => {
      const categories = ["season", "membership", "request", "functional"];
      for (const category of categories) {
        const id = `${prefix}-${category}`;
        await fixtures.set(db.collection("groups").doc(id), { nombre: `Grupo ${category}`, deporte: "voleibol", ownerId: outsider.uid, estado: "activo", createdAt: at, schemaVersion: 1 });
        await fixtures.set(db.collection("groupCreationGuards").doc(`${outsider.uid}-${category}`), { groupId: id, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 });
      }
      // Preparation requires the singleton guard owned by the actor, so exercise one category at a time.
      const guardRef = db.collection("groupCreationGuards").doc(outsider.uid); fixtures.register(guardRef);
      const expected = { season: "SEASONS_EXIST", membership: "MEMBERSHIPS_EXIST", request: "REQUESTS_EXIST", functional: "FUNCTIONAL_REFERENCES_EXIST" };
      for (const category of categories) {
        const id = `${prefix}-${category}`; await guardRef.set({ groupId: id, idempotencyKeyHash: "c".repeat(64), requestHash: "d".repeat(64), createdAt: at, guardVersion: 1 });
        if (category === "season") await fixtures.set(db.collection("seasons").doc(`${id}-root`), { groupId: id, nombre: "Histórica", fechaInicio: "2026-01-01", estado: "cerrada", createdAt: at, closedAt: at, closedBy: outsider.uid, schemaVersion: 2 });
        if (category === "membership") await fixtures.set(db.collection("memberships").doc(`${id}-root`), { personId: `${id}-person`, groupId: id, seasonId: `${id}-season`, estado: "finalizada", fechaIngreso: at, fechaEgreso: at, createdAt: at, schemaVersion: 2 });
        if (category === "request") {
          await fixtures.set(db.collection("groupJoinRequests").doc(`${id}-pending`), { personId: `${id}-pending-person`, groupId: id, estado: "pendiente", createdAt: at, schemaVersion: 1 });
          await fixtures.set(db.collection("groupJoinRequests").doc(`${id}-cancelled`), { personId: `${id}-cancelled-person`, groupId: id, estado: "cancelada", createdAt: at, cancelledAt: at, schemaVersion: 1 });
          await fixtures.set(db.collection("groupJoinRequests").doc(`${id}-rejected`), { personId: `${id}-rejected-person`, groupId: id, estado: "rechazada", createdAt: at, decisionIntentId: `${id}-reject-intent`, decidedBy: outsider.uid, decidedAt: at, schemaVersion: 2 });
          await fixtures.set(db.collection("groupJoinRequests").doc(`${id}-approved`), { personId: `${id}-approved-person`, groupId: id, estado: "aprobada", createdAt: at, decisionIntentId: `${id}-approve-intent`, decidedBy: outsider.uid, decidedAt: at, membershipId: `${id}-approved-membership`, schemaVersion: 2 });
        }
        if (category === "functional") await fixtures.set(db.collection("matches").doc(`${id}-root`), { groupId: id, marker: "legacy-reference" });
        const result = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: id }, outsider.idToken);
        assert.deepEqual(result.body?.result?.eligibility?.blockers, [expected[category]], JSON.stringify(result.body)); assert.equal(JSON.stringify(result.body).includes(`${id}-root`), false); assert.equal(JSON.stringify(result.body).includes(`${id}-pending-person`), false);
      }
    });

    await t.test("an orphan open-season guard fails closed instead of surviving deletion", async () => {
      const id = `${prefix}-orphan-open-season-guard`;
      await fixtures.set(db.collection("groups").doc(id), { nombre: "Grupo inconsistente", deporte: "voleibol", ownerId: outsider.uid, estado: "activo", createdAt: at, schemaVersion: 1 });
      await fixtures.set(db.collection("groupCreationGuards").doc(outsider.uid), { groupId: id, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 });
      await fixtures.set(db.collection("openSeasonGuards").doc(id), { seasonId: `${id}-missing-season`, openedAt: at, guardVersion: 2 });
      const result = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: id }, outsider.idToken);
      assert.equal(result.body?.error?.details?.reason, "GROUP_INCOMPATIBLE", JSON.stringify(result.body));
      assert.equal((await db.collection("groups").doc(id).get()).exists, true);
    });

    await t.test("physical delete, guard release, minimal receipt, idempotency and A/B recovery", async () => {
      const prepared = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: groupA }, owner.idToken); assert.deepEqual(prepared.body?.result?.eligibility, { status: "ELIGIBLE", blockers: [] });
      const request = { groupId: groupA, expectedDeletionToken: prepared.body.result.deletionToken, idempotencyKey: `${prefix}-delete-a-key` };
      const deleted = await call(functionsHost, projectId, "deleteOwnGroup", request, owner.idToken); assert.equal(deleted.body?.result?.outcome, "DELETED", JSON.stringify(deleted.body)); assert.equal(deleted.body.result.recovered, false); assert.equal(Object.hasOwn(deleted.body.result, "currentGroup"), false);
      assert.equal((await db.collection("groups").doc(groupA).get()).exists, false); assert.equal((await db.collection("groupCreationGuards").doc(owner.uid).get()).exists, false);
      const receipts = await db.collection("groupDeletionReceipts").where("actorUserId", "==", owner.uid).get(); receipts.docs.forEach((document) => fixtures.register(document.ref)); assert.equal(receipts.size, 1);
      assert.deepEqual(Object.keys(receipts.docs[0].data()).sort(), ["action", "actorUserId", "creationIdempotencyKeyHash", "creationRequestHash", "deletedAt", "groupId", "idempotencyKeyHash", "outcome", "receiptVersion", "requestHash"].sort());
      for (const prohibited of ["nombre", "deporte", "ownerId", "createdAt", "idempotencyKey", "references", "blockers"]) assert.equal(Object.hasOwn(receipts.docs[0].data(), prohibited), false);
      const retry = await call(functionsHost, projectId, "deleteOwnGroup", request, owner.idToken); assert.equal(retry.body.result.outcome, "EXISTING_IDEMPOTENT"); assert.deepEqual(retry.body.result.appliedEffect, deleted.body.result.appliedEffect);
      const conflict = await call(functionsHost, projectId, "deleteOwnGroup", { ...request, expectedDeletionToken: "a".repeat(64) }, owner.idToken); assert.equal(conflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT");
      const otherKey = await call(functionsHost, projectId, "deleteOwnGroup", { ...request, idempotencyKey: `${prefix}-delete-other-key` }, owner.idToken); assert.equal(otherKey.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      const historicalA = await call(functionsHost, projectId, "createOwnGroup", creationA, owner.idToken); assert.equal(historicalA.body?.result?.outcome, "CREATED_THEN_DELETED", JSON.stringify(historicalA.body)); assert.equal(historicalA.body.result.currentGroup, null); assert.equal(Object.hasOwn(historicalA.body.result, "group"), false);
      const creationB = { nombre: "Grupo B", deporte: "voleibol", idempotencyKey: `${prefix}-create-b-key` }; const createdB = await call(functionsHost, projectId, "createOwnGroup", creationB, owner.idToken); assert.equal(createdB.body?.result?.outcome, "created", JSON.stringify(createdB.body)); const groupB = createdB.body.result.group; fixtures.register(db.collection("groups").doc(groupB.id)); fixtures.register(db.collection("groupCreationGuards").doc(owner.uid));
      const retryWithB = await call(functionsHost, projectId, "createOwnGroup", creationA, owner.idToken); assert.equal(retryWithB.body.result.outcome, "CREATED_THEN_DELETED"); assert.equal(retryWithB.body.result.currentGroup, null); assert.equal(JSON.stringify(retryWithB.body).includes(groupB.id), false); assert.equal((await db.collection("groups").doc(groupB.id).get()).data().nombre, "Grupo B");
      const reuse = await call(functionsHost, projectId, "createOwnGroup", { ...creationA, nombre: "Incompatible" }, owner.idToken); assert.equal(reuse.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT");
      assert.equal(await direct(firestoreHost, projectId, `groupDeletionReceipts/${receipts.docs[0].id}`), 403); assert.equal(await direct(firestoreHost, projectId, `groupDeletionReceipts/${receipts.docs[0].id}`, owner.idToken), 403); assert.equal(await direct(firestoreHost, projectId, `groupDeletionReceipts/${receipts.docs[0].id}`, outsider.idToken), 403); assert.equal(await direct(firestoreHost, projectId, `groups/${groupB.id}`, owner.idToken, "DELETE"), 403);
    });

    await t.test("rename recovery after deletion is minimal and an unconfirmed operation does not recover", async () => {
      const creation = { nombre: "Grupo C", deporte: "voleibol", idempotencyKey: `${prefix}-create-c-key` }; const created = await call(functionsHost, projectId, "createOwnGroup", creation, owner2.idToken); groupC = created.body.result.group.id; fixtures.register(db.collection("groups").doc(groupC)); fixtures.register(db.collection("groupCreationGuards").doc(owner2.uid));
      const stalePreparation = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: groupC }, owner2.idToken);
      const current = await call(functionsHost, projectId, "getOwnGroup", { groupId: groupC }, owner2.idToken); const rename = { groupId: groupC, nombre: "Grupo C renombrado", expectedEditToken: current.body.result.editToken, idempotencyKey: `${prefix}-rename-c-key` };
      const renamed = await call(functionsHost, projectId, "updateOwnGroupName", rename, owner2.idToken); assert.equal(renamed.body.result.outcome, "UPDATED");
      const stale = await call(functionsHost, projectId, "deleteOwnGroup", { groupId: groupC, expectedDeletionToken: stalePreparation.body.result.deletionToken, idempotencyKey: `${prefix}-stale-delete-key` }, owner2.idToken); assert.equal(stale.body?.error?.details?.reason, "STALE_DELETION"); assert.equal((await db.collection("groups").doc(groupC).get()).exists, true);
      const prepared = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: groupC }, owner2.idToken); const deletion = { groupId: groupC, expectedDeletionToken: prepared.body.result.deletionToken, idempotencyKey: `${prefix}-delete-c-key` };
      assert.equal((await call(functionsHost, projectId, "deleteOwnGroup", deletion, owner2.idToken)).body.result.outcome, "DELETED");
      const recovered = await call(functionsHost, projectId, "updateOwnGroupName", rename, owner2.idToken); assert.equal(recovered.body?.result?.outcome, "UPDATED_THEN_DELETED", JSON.stringify(recovered.body)); assert.equal(recovered.body.result.currentGroup, null); assert.equal(recovered.body.result.currentEditToken, null); assert.equal(JSON.stringify(recovered.body).includes("renombrado"), false);
      const neverConfirmed = await call(functionsHost, projectId, "updateOwnGroupName", { ...rename, idempotencyKey: `${prefix}-never-confirmed-key` }, owner2.idToken); assert.equal(neverConfirmed.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
    });

    await t.test("delete A and a new creation B serialize through the singleton guard", async () => {
      const createA = { nombre: "Grupo X", deporte: "voleibol", idempotencyKey: `${prefix}-owner4-create-a` }; const createdA = await call(functionsHost, projectId, "createOwnGroup", createA, owner4.idToken); const idA = createdA.body.result.group.id;
      const prepared = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: idA }, owner4.idToken); const deleteA = { groupId: idA, expectedDeletionToken: prepared.body.result.deletionToken, idempotencyKey: `${prefix}-owner4-delete-a` }; const createB = { nombre: "Grupo Y", deporte: "voleibol", idempotencyKey: `${prefix}-owner4-create-b` };
      const [deleted, firstB] = await Promise.all([call(functionsHost, projectId, "deleteOwnGroup", deleteA, owner4.idToken), call(functionsHost, projectId, "createOwnGroup", createB, owner4.idToken)]); assert.equal(deleted.body?.result?.outcome, "DELETED", JSON.stringify(deleted.body));
      const finalB = firstB.body?.result?.outcome === "created" ? firstB : await call(functionsHost, projectId, "createOwnGroup", createB, owner4.idToken); assert.equal(finalB.body?.result?.outcome, "created", JSON.stringify(finalB.body)); const idB = finalB.body.result.group.id;
      assert.equal((await db.collection("groups").doc(idA).get()).exists, false); assert.equal((await db.collection("groups").where("ownerId", "==", owner4.uid).get()).size, 1); assert.equal((await db.collection("groupCreationGuards").doc(owner4.uid).get()).data().groupId, idB);
      const historicalA = await call(functionsHost, projectId, "createOwnGroup", createA, owner4.idToken); assert.equal(historicalA.body.result.outcome, "CREATED_THEN_DELETED"); assert.equal(JSON.stringify(historicalA.body).includes(idB), false);
    });

    await t.test("archived v2 is not deletable and delete/reference creation serialize without orphans", async () => {
      const archivedId = `${prefix}-archived`; await fixtures.set(db.collection("groups").doc(archivedId), { nombre: "Archivado", deporte: "voleibol", ownerId: outsider.uid, estado: "archivado", createdAt: at, archivedAt: at, schemaVersion: 2 }); await db.collection("groupCreationGuards").doc(outsider.uid).set({ groupId: archivedId, idempotencyKeyHash: "e".repeat(64), requestHash: "f".repeat(64), createdAt: at, guardVersion: 1 });
      const archived = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: archivedId }, outsider.idToken); assert.equal(archived.body?.error?.details?.reason, "GROUP_NOT_DELETABLE");

      const sameCreated = await call(functionsHost, projectId, "createOwnGroup", { nombre: "Dos deletes misma key", deporte: "voleibol", idempotencyKey: `${prefix}-same-create-key` }, owner3.idToken); const sameId = sameCreated.body.result.group.id; const samePrepared = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: sameId }, owner3.idToken); const sameRequest = { groupId: sameId, expectedDeletionToken: samePrepared.body.result.deletionToken, idempotencyKey: `${prefix}-same-delete-key` };
      const sameResults = await Promise.all([call(functionsHost, projectId, "deleteOwnGroup", sameRequest, owner3.idToken), call(functionsHost, projectId, "deleteOwnGroup", sameRequest, owner3.idToken)]); assert.deepEqual(sameResults.map((result) => result.body.result.outcome).sort(), ["DELETED", "EXISTING_IDEMPOTENT"]);

      const differentCreated = await call(functionsHost, projectId, "createOwnGroup", { nombre: "Dos deletes distintas", deporte: "voleibol", idempotencyKey: `${prefix}-different-create-key` }, owner3.idToken); const differentId = differentCreated.body.result.group.id; const differentPrepared = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: differentId }, owner3.idToken);
      const differentResults = await Promise.all(["one", "two"].map((suffix) => call(functionsHost, projectId, "deleteOwnGroup", { groupId: differentId, expectedDeletionToken: differentPrepared.body.result.deletionToken, idempotencyKey: `${prefix}-different-delete-${suffix}` }, owner3.idToken))); assert.equal(differentResults.filter((result) => result.body?.result?.outcome === "DELETED").length, 1); assert.equal(differentResults.filter((result) => result.body?.error?.details?.reason === "GROUP_NOT_ACCESSIBLE").length, 1);

      const creation = { nombre: "Grupo carrera", deporte: "voleibol", idempotencyKey: `${prefix}-race-create-key` }; const created = await call(functionsHost, projectId, "createOwnGroup", creation, owner3.idToken); raceGroup = created.body.result.group.id; fixtures.register(db.collection("groups").doc(raceGroup)); fixtures.register(db.collection("groupCreationGuards").doc(owner3.uid));
      const prepared = await call(functionsHost, projectId, "prepareOwnGroupDeletion", { groupId: raceGroup }, owner3.idToken); const deletion = { groupId: raceGroup, expectedDeletionToken: prepared.body.result.deletionToken, idempotencyKey: `${prefix}-race-delete-key` };
      const season = { groupId: raceGroup, nombre: "Temporada carrera", fechaInicio: "2026-10-01", idempotencyKey: `${prefix}-race-season-key` };
      const [deleteResult, seasonResult] = await Promise.all([call(functionsHost, projectId, "deleteOwnGroup", deletion, owner3.idToken), call(functionsHost, projectId, "createAndOpenSeason", season, owner3.idToken)]);
      const groupExists = (await db.collection("groups").doc(raceGroup).get()).exists; const seasons = await db.collection("seasons").where("groupId", "==", raceGroup).get(); seasons.docs.forEach((document) => fixtures.register(document.ref));
      assert.equal(groupExists, !seasons.empty); assert.ok(deleteResult.body?.result?.outcome === "DELETED" || deleteResult.body?.error?.details?.reason === "SEASONS_EXIST", JSON.stringify(deleteResult.body));
      if (deleteResult.body?.result?.outcome === "DELETED") assert.ok(seasonResult.body?.error); else assert.equal(seasonResult.body?.result?.outcome, "CREATED_OPEN");
    });
  } finally {
    for (const actor of actors) {
      await fixtures.registerQuery(db.collection("groups").where("ownerId", "==", actor.uid));
      await fixtures.registerQuery(db.collection("groupDeletionReceipts").where("actorUserId", "==", actor.uid));
      await fixtures.registerQuery(db.collection("groupNameUpdateReceipts").where("actorUserId", "==", actor.uid));
      fixtures.register(db.collection("groupCreationGuards").doc(actor.uid));
    }
    for (const id of [groupA, groupC, raceGroup].filter(Boolean)) {
      await fixtures.registerQuery(db.collection("seasons").where("groupId", "==", id));
      fixtures.register(db.collection("openSeasonGuards").doc(id));
      await fixtures.registerQuery(db.collection("seasonOpeningReceipts").where("groupId", "==", id));
    }
    await fixtures.cleanup(); await Promise.all([owner, owner2, owner3, owner4, outsider, noAccount].map((actor) => auth.deleteUser(actor.uid).catch(() => undefined))); await app.delete();
  }
});
