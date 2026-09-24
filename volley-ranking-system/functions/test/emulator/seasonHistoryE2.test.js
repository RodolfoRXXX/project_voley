"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-16-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-16-synthetic-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email };
}
async function call(host, projectId, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/listSeasonsForOwnedGroup`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function clientRead(host, projectId, path, token) {
  return (await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })).status;
}

test("E2-16 consulta historial canónico paginado, reautoriza y no escribe", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST; const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST; const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-16-season-history"); const db = app.firestore(); const auth = app.auth();
  const owner = await signUp(authHost, "e2-16-owner@example.invalid"); const outsider = await signUp(authHost, "e2-16-outsider@example.invalid"); const noAccount = await signUp(authHost, "e2-16-no-account@example.invalid");
  const groupId = "e2-16-main"; const now = admin.firestore.Timestamp.fromDate(new Date("2026-09-20T10:00:00.000Z")); const later = admin.firestore.Timestamp.fromDate(new Date("2026-09-21T10:00:00.000Z"));
  const group = (ownerId = owner.uid) => ({ nombre: "Grupo E2-16", deporte: "voleibol", ownerId, estado: "activo", createdAt: now, schemaVersion: 1 });
  const open = (id, name = "Temporada N") => ({ id, data: { groupId, nombre: name, fechaInicio: "2026-01-01", estado: "abierta", createdAt: now, schemaVersion: 1 } });
  const closed = (id, date) => ({ id, data: { groupId, nombre: id, fechaInicio: date, estado: "cerrada", createdAt: now, closedAt: later, closedBy: owner.uid, schemaVersion: 2 } });
  try {
    await db.collection("users").doc(owner.uid).set({ nombre: "Owner sin Persona", email: owner.email, photoURL: "", createdAt: now });
    await db.collection("users").doc(outsider.uid).set({ nombre: "Rol global", email: outsider.email, photoURL: "", createdAt: now, personaId: "e2-16-outsider-person", roles: ["admin"] });
    await db.collection("groups").doc(groupId).set(group());
    const current = open("e2-16-open");
    for (const [collection, id] of [["memberships", "e2-16-membership"], ["groupJoinRequests", "e2-16-request"], ["openSeasonGuards", groupId], ["seasonOpeningReceipts", "e2-16-opening-receipt"], ["seasonClosureReceipts", "e2-16-closure-receipt"], ["matches", "e2-16-match"], ["tournaments", "e2-16-tournament"]]) await db.collection(collection).doc(id).set({ marker: "untouched" });
    const protectedBefore = {};
    for (const [collection, id] of [["memberships", "e2-16-membership"], ["groupJoinRequests", "e2-16-request"], ["openSeasonGuards", groupId], ["seasonOpeningReceipts", "e2-16-opening-receipt"], ["seasonClosureReceipts", "e2-16-closure-receipt"], ["matches", "e2-16-match"], ["tournaments", "e2-16-tournament"]]) protectedBefore[`${collection}/${id}`] = (await db.collection(collection).doc(id).get()).data();

    await t.test("vacío, sólo abierta, sólo cerradas y empate por ID conservan semántica", async () => {
      const empty = (await call(functionsHost, projectId, { groupId }, owner.idToken)).body.result;
      assert.deepEqual(empty, { currentSeason: null, closedSeasons: [], nextCursor: null, hasMore: false });
      await db.collection("seasons").doc("e2-16-only-open").set(open("e2-16-only-open").data);
      const onlyOpen = (await call(functionsHost, projectId, { groupId, pageSize: 1 }, owner.idToken)).body.result;
      assert.equal(onlyOpen.currentSeason.id, "e2-16-only-open"); assert.equal(onlyOpen.closedSeasons.length, 0);
      await db.collection("seasons").doc("e2-16-only-open").delete();
      await db.collection("seasons").doc("e2-16-only-closed").set(closed("e2-16-only-closed", "2024-01-01").data);
      const onlyClosed = (await call(functionsHost, projectId, { groupId }, owner.idToken)).body.result;
      assert.equal(onlyClosed.currentSeason, null); assert.equal(onlyClosed.closedSeasons[0].id, "e2-16-only-closed");
      for (const id of ["e2-16-tie-a", "e2-16-tie-b"]) await db.collection("seasons").doc(id).set({ ...closed(id, "2023-01-01").data, nombre: id });
      const tie = (await call(functionsHost, projectId, { groupId }, owner.idToken)).body.result;
      assert.deepEqual(tie.closedSeasons.map((season) => season.id), ["e2-16-only-closed", "e2-16-tie-b", "e2-16-tie-a"]);
      for (const id of ["e2-16-only-closed", "e2-16-tie-a", "e2-16-tie-b"]) await db.collection("seasons").doc(id).delete();
    });

    await db.collection("seasons").doc(current.id).set(current.data);
    for (let index = 1; index <= 21; index += 1) {
      const day = String(22 - index).padStart(2, "0"); const season = closed(`e2-16-closed-${String(index).padStart(2, "0")}`, `2025-01-${day}`); await db.collection("seasons").doc(season.id).set(season.data);
    }

    await t.test("Owner sin Persona recibe actual separada y 20/21 cerradas con desempate total", async () => {
      const first = await call(functionsHost, projectId, { groupId }, owner.idToken);
      assert.equal(first.body?.result?.currentSeason?.id, current.id, JSON.stringify(first.body)); assert.equal(first.body.result.closedSeasons.length, 20); assert.equal(first.body.result.hasMore, true); assert.equal(typeof first.body.result.nextCursor, "string");
      assert.equal(first.body.result.closedSeasons.some((season) => season.id === current.id), false);
      assert.deepEqual(Object.keys(first.body.result.currentSeason).sort(), ["estado", "fechaInicio", "id", "isCurrent", "nombre"]);
      assert.deepEqual(Object.keys(first.body.result.closedSeasons[0]).sort(), ["closedAt", "estado", "fechaInicio", "id", "isCurrent", "nombre"]);
      const second = await call(functionsHost, projectId, { groupId, pageSize: 20, cursor: first.body.result.nextCursor }, owner.idToken);
      assert.equal(second.body?.result?.closedSeasons.length, 1, JSON.stringify(second.body)); assert.equal(second.body.result.hasMore, false); assert.equal(second.body.result.nextCursor, null);
      assert.equal(first.body.result.closedSeasons.some((season) => season.id === second.body.result.closedSeasons[0].id), false);
    });

    await t.test("Auth/Cuenta/acceso no enumeran Grupo y rol global no concede ownership", async () => {
      assert.equal((await call(functionsHost, projectId, { groupId })).body?.error?.details?.reason, "UNAUTHENTICATED");
      assert.equal((await call(functionsHost, projectId, { groupId }, noAccount.idToken)).body?.error?.details?.reason, "ACCOUNT_REQUIRED");
      assert.equal((await call(functionsHost, projectId, { groupId }, outsider.idToken)).body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      assert.equal((await call(functionsHost, projectId, { groupId: "e2-16-absent" }, outsider.idToken)).body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
    });

    await t.test("payload/schema incompatibles fallan cerrado y cliente conserva deny-all", async () => {
      assert.equal((await call(functionsHost, projectId, { groupId, uid: owner.uid }, owner.idToken)).body?.error?.details?.reason, "VALIDATION_FAILED");
      await db.collection("groups").doc("e2-16-incompatible-group").set({ ...group(), unexpected: true });
      assert.equal((await call(functionsHost, projectId, { groupId: "e2-16-incompatible-group" }, owner.idToken)).body?.error?.details?.reason, "GROUP_INCOMPATIBLE");
      await db.collection("groups").doc("e2-16-bad-season-group").set(group());
      await db.collection("seasons").doc("e2-16-bad-closed").set({ ...closed("x", "2024-01-01").data, groupId: "e2-16-bad-season-group", schemaVersion: 1 });
      assert.equal((await call(functionsHost, projectId, { groupId: "e2-16-bad-season-group" }, owner.idToken)).body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      for (const token of [undefined, owner.idToken, outsider.idToken]) assert.equal(await clientRead(firestoreHost, projectId, `seasons/${current.id}`, token), 403);
    });

    await t.test("cursor detecta ancla alterada, N/N+1 y transferencia de ownership", async () => {
      const first = await call(functionsHost, projectId, { groupId, pageSize: 2 }, owner.idToken); const cursor = first.body.result.nextCursor;
      const anchorId = first.body.result.closedSeasons[1].id; await db.collection("seasons").doc(anchorId).update({ fechaInicio: "2024-12-01" });
      assert.equal((await call(functionsHost, projectId, { groupId, pageSize: 2, cursor }, owner.idToken)).body?.error?.details?.reason, "CURSOR_STALE");
      await db.collection("seasons").doc(anchorId).update({ fechaInicio: first.body.result.closedSeasons[1].fechaInicio });
      const stable = await call(functionsHost, projectId, { groupId, pageSize: 2 }, owner.idToken); const openBefore = (await db.collection("seasons").doc(current.id).get()).data();
      await db.collection("seasons").doc(current.id).set({ ...openBefore, estado: "cerrada", closedAt: later, closedBy: owner.uid, schemaVersion: 2 });
      const next = open("e2-16-open-next", "Temporada N+1"); await db.collection("seasons").doc(next.id).set(next.data);
      assert.equal((await call(functionsHost, projectId, { groupId, pageSize: 2, cursor: stable.body.result.nextCursor }, owner.idToken)).body?.error?.details?.reason, "CURSOR_STALE");
      await db.collection("groups").doc(groupId).update({ ownerId: outsider.uid });
      assert.equal((await call(functionsHost, projectId, { groupId }, owner.idToken)).body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
    });

    await t.test("consulta no produce escrituras ni efectos laterales", async () => {
      for (const [path, before] of Object.entries(protectedBefore)) { const [collection, id] = path.split("/"); assert.deepEqual((await db.collection(collection).doc(id).get()).data(), before); }
    });
  } finally {
    // Group/Tournament deletes fire background sync triggers; start them first so
    // their handlers settle while the remaining deterministic teardown runs.
    for (const collection of ["groups", "tournaments", "seasonClosureReceipts", "seasonOpeningReceipts", "openSeasonGuards", "memberships", "groupJoinRequests", "seasons", "matches", "users"]) {
      const snapshot = await db.collection(collection).get(); const batch = db.batch(); for (const document of snapshot.docs) if (document.id.startsWith("e2-16-") || [owner.uid, outsider.uid].includes(document.id)) batch.delete(document.ref); await batch.commit();
    }
    await Promise.allSettled([auth.deleteUser(owner.uid), auth.deleteUser(outsider.uid), auth.deleteUser(noAccount.uid)]); await app.delete();
  }
});
