"use strict";

const assert = require("node:assert/strict"); const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard"); const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { groupNameUpdateReceiptId } = require("../../src/groups/application/groupHashing");
async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-20-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-20-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
async function call(host, projectId, name, data, idToken) { const headers = { "Content-Type": "application/json" }; if (idToken) headers.Authorization = `Bearer ${idToken}`; const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }
async function clientRead(host, projectId, path, idToken) { const headers = { "Content-Type": "application/json" }; if (idToken) headers.Authorization = `Bearer ${idToken}`; return (await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers })).status; }
async function seedAccount(db, actor, extra = {}) { await db.collection("users").doc(actor.uid).set({ nombre: "Cuenta", email: actor.email, photoURL: "", createdAt: new Date(), ...extra }); }

test("E2-20 edita exclusivamente el nombre con concurrencia, recovery e idempotencia", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST; const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST; const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-20-group-name-update"); const db = app.firestore(); const auth = app.auth();
  const [owner, outsider, noAccount] = await Promise.all([signUp(authHost, "e2-20-owner@example.invalid"), signUp(authHost, "e2-20-outsider@example.invalid"), signUp(authHost, "e2-20-no-account@example.invalid")]);
  const groupId = "e2-20-owned-group"; const creation = { nombre: "Nombre Inicial", deporte: "voleibol", idempotencyKey: "e2-20-create-group-key" };
  try {
    await Promise.all([seedAccount(db, owner), seedAccount(db, outsider, { roles: "admin" })]);
    const created = await call(functionsHost, projectId, "createOwnGroup", creation, owner.idToken); assert.equal(created.body?.result?.outcome, "created", JSON.stringify(created.body));
    const createdId = created.body.result.group.id; await db.collection("groups").doc(createdId).delete();
    const guardRef = db.collection("groupCreationGuards").doc(owner.uid); await guardRef.update({ groupId });
    const now = admin.firestore.Timestamp.fromDate(new Date("2026-09-29T12:00:00.000Z"));
    await db.collection("groups").doc(groupId).set({ nombre: "Nombre Inicial", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1 });
    for (const [collection, id] of [["seasons", "e2-20-season"], ["memberships", "e2-20-membership"], ["groupJoinRequests", "e2-20-request"], ["matches", "e2-20-match"], ["tournaments", "e2-20-tournament"]]) await db.collection(collection).doc(id).set({ marker: "untouched", nombre: `Propio ${collection}` });
    const protectedIds = { seasons: "e2-20-season", memberships: "e2-20-membership", groupJoinRequests: "e2-20-request", matches: "e2-20-match", tournaments: "e2-20-tournament" };
    const protectedBefore = {}; for (const collection of Object.keys(protectedIds)) protectedBefore[collection] = (await db.collection(collection).doc(protectedIds[collection]).get()).data();

    await t.test("contrato, Auth, Cuenta y no enumeración fallan sin escribir", async () => {
      const own = await call(functionsHost, projectId, "getOwnGroup", { groupId }, owner.idToken); const token = own.body.result.editToken;
      const base = { groupId, nombre: "Nuevo", expectedEditToken: token, idempotencyKey: "e2-20-validation-key" };
      const [unauth, missingAccount, foreign, missing, opened] = await Promise.all([
        call(functionsHost, projectId, "updateOwnGroupName", base), call(functionsHost, projectId, "updateOwnGroupName", base, noAccount.idToken),
        call(functionsHost, projectId, "updateOwnGroupName", base, outsider.idToken), call(functionsHost, projectId, "updateOwnGroupName", { ...base, groupId: "e2-20-missing" }, owner.idToken),
        call(functionsHost, projectId, "updateOwnGroupName", { ...base, deporte: "otro" }, owner.idToken),
      ]);
      assert.equal(unauth.body?.error?.details?.reason, "UNAUTHENTICATED"); assert.equal(missingAccount.body?.error?.details?.reason, "ACCOUNT_REQUIRED");
      assert.equal(foreign.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal(missing.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal(opened.body?.error?.details?.reason, "VALIDATION_FAILED");
      const [foreignRead, missingRead] = await Promise.all([
        call(functionsHost, projectId, "getOwnGroup", { groupId }, outsider.idToken),
        call(functionsHost, projectId, "getOwnGroup", { groupId: "e2-20-missing" }, owner.idToken),
      ]);
      assert.equal(foreignRead.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      assert.equal(missingRead.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      assert.equal((await db.collection("groupNameUpdateReceipts").get()).size, 0);
    });

    const own = await call(functionsHost, projectId, "getOwnGroup", { groupId }, owner.idToken); assert.deepEqual(Object.keys(own.body.result).sort(), ["editToken", "group"]); assert.match(own.body.result.editToken, /^[a-f0-9]{64}$/);
    const initialToken = own.body.result.editToken; const reusableKey = "e2-20-reusable-noop-key";
    await t.test("NO_CHANGES valida token, no escribe y no consume la clave", async () => {
      const result = await call(functionsHost, projectId, "updateOwnGroupName", { groupId, nombre: " Nombre   Inicial ", expectedEditToken: initialToken, idempotencyKey: reusableKey }, owner.idToken);
      assert.deepEqual(result.body.result, { outcome: "NO_CHANGES", recovered: false, appliedEffect: null, currentGroup: own.body.result.group, currentEditToken: initialToken });
      assert.equal((await db.collection("groupNameUpdateReceipts").get()).size, 0);
    });

    const rootBefore = (await db.collection("groups").doc(groupId).get()).data();
    const firstRequest = { groupId, nombre: "Nombre Editado", expectedEditToken: initialToken, idempotencyKey: reusableKey };
    const first = await call(functionsHost, projectId, "updateOwnGroupName", firstRequest, owner.idToken);
    await t.test("UPDATED cambia sólo field path nombre y crea receipt cerrado atómicamente", async () => {
      assert.equal(first.body?.result?.outcome, "UPDATED", JSON.stringify(first.body)); assert.equal(first.body.result.recovered, false); assert.equal(first.body.result.appliedEffect.nombre, "Nombre Editado");
      const rootAfter = (await db.collection("groups").doc(groupId).get()).data(); assert.equal(rootAfter.nombre, "Nombre Editado");
      for (const key of ["deporte", "ownerId", "estado", "createdAt", "schemaVersion"]) assert.deepEqual(rootAfter[key], rootBefore[key], key);
      assert.deepEqual(Object.keys(rootAfter).sort(), Object.keys(rootBefore).sort());
      const receipts = await db.collection("groupNameUpdateReceipts").get(); assert.equal(receipts.size, 1);
      assert.deepEqual(Object.keys(receipts.docs[0].data()).sort(), ["action", "actorUserId", "appliedName", "confirmedAt", "groupId", "outcome", "receiptVersion", "requestHash"].sort());
      assert.equal(receipts.docs[0].data().appliedName, "Nombre Editado"); assert.equal(Object.hasOwn(receipts.docs[0].data(), "idempotencyKey"), false);
      for (const collection of Object.keys(protectedIds)) assert.deepEqual((await db.collection(collection).doc(protectedIds[collection]).get()).data(), protectedBefore[collection]);
    });

    const secondRequest = { groupId, nombre: "Nombre Posterior", expectedEditToken: first.body.result.currentEditToken, idempotencyKey: "e2-20-second-update-key" };
    const second = await call(functionsHost, projectId, "updateOwnGroupName", secondRequest, owner.idToken); assert.equal(second.body?.result?.outcome, "UPDATED", JSON.stringify(second.body));
    await t.test("recovery histórico separa efecto aplicado del estado actual y conflicto no restaura", async () => {
      const recovered = await call(functionsHost, projectId, "updateOwnGroupName", firstRequest, owner.idToken); assert.equal(recovered.body?.result?.outcome, "UPDATED"); assert.equal(recovered.body.result.recovered, true);
      assert.equal(recovered.body.result.appliedEffect.nombre, "Nombre Editado"); assert.equal(recovered.body.result.currentGroup.nombre, "Nombre Posterior");
      const conflict = await call(functionsHost, projectId, "updateOwnGroupName", { ...firstRequest, nombre: "Distinto" }, owner.idToken); assert.equal(conflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT");
      assert.equal((await db.collection("groups").doc(groupId).get()).data().nombre, "Nombre Posterior");
    });

    await t.test("stale prevalece sobre no-op y carreras no pierden actualizaciones", async () => {
      const stale = await call(functionsHost, projectId, "updateOwnGroupName", { groupId, nombre: "Nombre Posterior", expectedEditToken: initialToken, idempotencyKey: "e2-20-stale-same-name" }, owner.idToken); assert.equal(stale.body?.error?.details?.reason, "STALE_UPDATE");
      const base = second.body.result.currentEditToken; const [left, right] = await Promise.all([
        call(functionsHost, projectId, "updateOwnGroupName", { groupId, nombre: "Carrera A", expectedEditToken: base, idempotencyKey: "e2-20-race-left-key" }, owner.idToken),
        call(functionsHost, projectId, "updateOwnGroupName", { groupId, nombre: "Carrera B", expectedEditToken: base, idempotencyKey: "e2-20-race-right-key" }, owner.idToken),
      ]); assert.deepEqual([left, right].map((item) => item.body?.result?.outcome || item.body?.error?.details?.reason).sort(), ["STALE_UPDATE", "UPDATED"]);
    });

    await t.test("misma clave recupera una carrera y claves distintas con mismo nombre dejan un solo receipt", async () => {
      const sameKeyGroup = "e2-20-same-key-race"; await db.collection("groups").doc(sameKeyGroup).set({ nombre: "Base", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1 });
      const sameOwn = await call(functionsHost, projectId, "getOwnGroup", { groupId: sameKeyGroup }, owner.idToken);
      const sameRequest = { groupId: sameKeyGroup, nombre: "Confirmado", expectedEditToken: sameOwn.body.result.editToken, idempotencyKey: "e2-20-same-key-race-key" };
      const sameResults = await Promise.all([call(functionsHost, projectId, "updateOwnGroupName", sameRequest, owner.idToken), call(functionsHost, projectId, "updateOwnGroupName", sameRequest, owner.idToken)]);
      assert.deepEqual(sameResults.map((item) => item.body?.result?.outcome), ["UPDATED", "UPDATED"]); assert.deepEqual(sameResults.map((item) => item.body.result.recovered).sort(), [false, true]);
      assert.equal((await db.collection("groupNameUpdateReceipts").where("groupId", "==", sameKeyGroup).get()).size, 1);

      const sameNameGroup = "e2-20-same-name-race"; await db.collection("groups").doc(sameNameGroup).set({ nombre: "Base", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1 });
      const sameNameOwn = await call(functionsHost, projectId, "getOwnGroup", { groupId: sameNameGroup }, owner.idToken); const raceBase = { groupId: sameNameGroup, nombre: "Mismo", expectedEditToken: sameNameOwn.body.result.editToken };
      const distinct = await Promise.all([call(functionsHost, projectId, "updateOwnGroupName", { ...raceBase, idempotencyKey: "e2-20-same-name-left-key" }, owner.idToken), call(functionsHost, projectId, "updateOwnGroupName", { ...raceBase, idempotencyKey: "e2-20-same-name-right-key" }, owner.idToken)]);
      assert.deepEqual(distinct.map((item) => item.body?.result?.outcome || item.body?.error?.details?.reason).sort(), ["STALE_UPDATE", "UPDATED"]);
      assert.equal((await db.collection("groupNameUpdateReceipts").where("groupId", "==", sameNameGroup).get()).size, 1);
    });

    await t.test("edición y transferencia concurrentes serializan y el ex Owner no recupera", async () => {
      const transferGroup = "e2-20-transfer-race"; await db.collection("groups").doc(transferGroup).set({ nombre: "Antes", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1 });
      const transferOwn = await call(functionsHost, projectId, "getOwnGroup", { groupId: transferGroup }, owner.idToken);
      const request = { groupId: transferGroup, nombre: "Después", expectedEditToken: transferOwn.body.result.editToken, idempotencyKey: "e2-20-transfer-race-key" };
      const [edit] = await Promise.all([call(functionsHost, projectId, "updateOwnGroupName", request, owner.idToken), db.collection("groups").doc(transferGroup).update({ ownerId: outsider.uid })]);
      const outcome = edit.body?.result?.outcome || edit.body?.error?.details?.reason; assert.ok(["UPDATED", "GROUP_NOT_ACCESSIBLE"].includes(outcome), JSON.stringify(edit.body));
      const final = (await db.collection("groups").doc(transferGroup).get()).data(); assert.equal(final.ownerId, outsider.uid); assert.equal(final.nombre, outcome === "UPDATED" ? "Después" : "Antes");
      assert.equal((await call(functionsHost, projectId, "updateOwnGroupName", request, owner.idToken)).body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
    });

    await t.test("retry de creación devuelve nombre vigente sin tocar guard", async () => {
      const guardBefore = (await guardRef.get()).data(); const retry = await call(functionsHost, projectId, "createOwnGroup", creation, owner.idToken);
      assert.equal(retry.body?.result?.outcome, "existing", JSON.stringify(retry.body)); assert.equal(retry.body.result.group.nombre, (await db.collection("groups").doc(groupId).get()).data().nombre); assert.deepEqual((await guardRef.get()).data(), guardBefore);
    });

    await t.test("transferencia revoca recovery; Grupo incompatible y receipt corrupto fallan cerrados", async () => {
      await db.collection("groups").doc(groupId).update({ ownerId: outsider.uid }); assert.equal((await call(functionsHost, projectId, "updateOwnGroupName", firstRequest, owner.idToken)).body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); await db.collection("groups").doc(groupId).update({ ownerId: owner.uid });
      const brokenId = "e2-20-broken-group"; await db.collection("groups").doc(brokenId).set({ nombre: "Roto", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1, extra: true });
      const badGroup = await call(functionsHost, projectId, "updateOwnGroupName", { groupId: brokenId, nombre: "Otro", expectedEditToken: "a".repeat(64), idempotencyKey: "e2-20-broken-group-key" }, owner.idToken); assert.equal(badGroup.body?.error?.details?.reason, "GROUP_INCOMPATIBLE");
      const corruptKey = "e2-20-corrupt-receipt"; await db.collection("groupNameUpdateReceipts").doc(groupNameUpdateReceiptId(owner.uid, corruptKey)).set({ broken: true });
      const latest = await call(functionsHost, projectId, "getOwnGroup", { groupId }, owner.idToken); const corrupt = await call(functionsHost, projectId, "updateOwnGroupName", { groupId, nombre: "No aplicar", expectedEditToken: latest.body.result.editToken, idempotencyKey: corruptKey }, owner.idToken); assert.equal(corrupt.body?.error?.details?.reason, "GROUP_INCOMPATIBLE"); assert.notEqual((await db.collection("groups").doc(groupId).get()).data().nombre, "No aplicar");
    });

    await t.test("Rules niega Grupo y receipts a anónimo, Owner y no-Owner", async () => { for (const token of [undefined, owner.idToken, outsider.idToken]) { assert.equal(await clientRead(firestoreHost, projectId, `groups/${groupId}`, token), 403); assert.equal(await clientRead(firestoreHost, projectId, "groupNameUpdateReceipts/hidden", token), 403); } });
  } finally {
    for (const collection of ["groupNameUpdateReceipts", "groupCreationGuards", "seasons", "memberships", "groupJoinRequests", "matches", "tournaments", "groups", "users"]) { const snapshot = await db.collection(collection).get(); const batch = db.batch(); for (const document of snapshot.docs) if (document.id.startsWith("e2-20-") || [owner.uid, outsider.uid, noAccount.uid].includes(document.id)) batch.delete(document.ref); await batch.commit(); }
    await Promise.allSettled([auth.deleteUser(owner.uid), auth.deleteUser(outsider.uid), auth.deleteUser(noAccount.uid)]); await app.delete();
  }
});
