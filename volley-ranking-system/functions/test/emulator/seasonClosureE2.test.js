"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");
const { activeMembershipGuardId, pendingGroupJoinRequestGuardId } = (() => {
  const memberships = require("../../src/memberships/application/membershipHashing");
  const requests = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
  return { activeMembershipGuardId: memberships.activeMembershipGuardId, pendingGroupJoinRequestGuardId: requests.pendingGroupJoinRequestGuardId };
})();
const { hashSeasonIdempotencyKey, hashSeasonRequest, legacySeasonOpeningReceiptId } = require("../../src/groups/application/seasonHashing");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-15-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-15-synthetic-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
async function call(host, projectId, name, data, token) { const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }
async function clientRead(host, projectId, path, token) { const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }); return response.status; }

test("E2-15 cierra canónicamente, bloquea autoridades y recupera sin tocar N+1", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST; const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST; const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-15-season-close"); const db = app.firestore(); const auth = app.auth();
  const owner = await signUp(authHost, "e2-15-owner@example.invalid"); const outsider = await signUp(authHost, "e2-15-outsider@example.invalid");
  const groups = { success: "e2-15-success", active: "e2-15-active", legacy: "e2-15-legacy" };
  const now = admin.firestore.Timestamp.fromDate(new Date("2026-09-01T10:00:00.000Z"));
  const seasonData = (groupId, nombre = "Temporada N") => ({ groupId, nombre, fechaInicio: "2026-01-01", estado: "abierta", createdAt: now, schemaVersion: 1 });
  try {
    await db.collection("users").doc(owner.uid).set({ nombre: "Owner sin Persona", email: owner.email, photoURL: "", createdAt: now });
    await db.collection("users").doc(outsider.uid).set({ nombre: "Admin global", email: outsider.email, photoURL: "", createdAt: now, personaId: "persona-outsider" });
    for (const groupId of Object.values(groups)) await db.collection("groups").doc(groupId).set({ nombre: groupId, deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1 });

    await t.test("Owner sin Persona cierra, libera slot, conserva Solicitud y no toca Partido/Torneo", async () => {
      const opened = await call(functionsHost, projectId, "createAndOpenSeason", { groupId: groups.success, nombre: "Temporada N", fechaInicio: "2026-01-01", idempotencyKey: "e2-15-open-success-0001" }, owner.idToken);
      assert.equal(opened.body?.result?.outcome, "CREATED_OPEN", JSON.stringify(opened.body)); const seasonId = opened.body.result.season.id;
      const requestId = "e2-15-pending-request"; const personId = "e2-15-candidate"; const createdAt = now;
      await db.collection("groupJoinRequests").doc(requestId).set({ personId, groupId: groups.success, estado: "pendiente", createdAt, schemaVersion: 1 });
      await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(groups.success, personId)).set({ requestId, personId, groupId: groups.success, createdAt, guardVersion: 1 });
      await db.collection("matches").doc("e2-15-match").set({ marker: "untouched", nested: { value: 1 } });
      await db.collection("tournaments").doc("e2-15-tournament").set({ marker: "untouched", nested: { value: 2 } });
      const matchBefore = (await db.collection("matches").doc("e2-15-match").get()).data(); const tournamentBefore = (await db.collection("tournaments").doc("e2-15-tournament").get()).data();
      const command = { groupId: groups.success, seasonId, idempotencyKey: "e2-15-close-success-0001" };
      const result = await call(functionsHost, projectId, "closeSeason", command, owner.idToken);
      assert.equal(result.body?.result?.outcome, "CLOSED", JSON.stringify(result.body));
      assert.deepEqual(Object.keys(result.body.result.season).sort(), ["closedAt", "estado", "fechaInicio", "groupId", "id", "nombre"]);
      const closed = (await db.collection("seasons").doc(seasonId).get()).data(); assert.equal(closed.estado, "cerrada"); assert.equal(closed.schemaVersion, 2); assert.equal(closed.closedBy, owner.uid);
      assert.equal((await db.collection("openSeasonGuards").doc(groups.success).get()).exists, false);
      assert.equal((await db.collection("seasonClosureReceipts").where("seasonId", "==", seasonId).get()).size, 1);
      assert.equal((await db.collection("groupJoinRequests").doc(requestId).get()).data().createdAt.toMillis(), createdAt.toMillis());
      assert.deepEqual((await db.collection("matches").doc("e2-15-match").get()).data(), matchBefore); assert.deepEqual((await db.collection("tournaments").doc("e2-15-tournament").get()).data(), tournamentBefore);

      const next = await call(functionsHost, projectId, "createAndOpenSeason", { groupId: groups.success, nombre: "Temporada N+1", fechaInicio: "2027-01-01", idempotencyKey: "e2-15-open-next-000001" }, owner.idToken);
      assert.equal(next.body?.result?.outcome, "CREATED_OPEN", JSON.stringify(next.body));
      const nextGuard = (await db.collection("openSeasonGuards").doc(groups.success).get()).data(); assert.equal(nextGuard.seasonId, next.body.result.season.id);
      const retry = await call(functionsHost, projectId, "closeSeason", command, owner.idToken);
      assert.equal(retry.body?.result?.outcome, "EXISTING_IDEMPOTENT", JSON.stringify(retry.body)); assert.equal(retry.body.result.season.id, seasonId);
      assert.deepEqual((await db.collection("openSeasonGuards").doc(groups.success).get()).data(), nextGuard);
      const conflict = await call(functionsHost, projectId, "closeSeason", { ...command, seasonId: next.body.result.season.id }, owner.idToken);
      assert.equal(conflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT");
    });

    await t.test("raíz activa íntegra bloquea sin escrituras y global admin/no Owner no obtiene autoridad", async () => {
      const seasonId = "e2-15-active-season"; const membershipId = "e2-15-active-membership"; const personId = "e2-15-active-person";
      await db.collection("seasons").doc(seasonId).set(seasonData(groups.active)); await db.collection("openSeasonGuards").doc(groups.active).set({ seasonId, openedAt: now, guardVersion: 2 });
      await db.collection("memberships").doc(membershipId).set({ personId, groupId: groups.active, seasonId, estado: "activa", fechaIngreso: now, createdAt: now, schemaVersion: 1 });
      await db.collection("activeMembershipGuards").doc(activeMembershipGuardId(groups.active, personId)).set({ membershipId, personId, groupId: groups.active, seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: now, guardVersion: 1 });
      const command = { groupId: groups.active, seasonId, idempotencyKey: "e2-15-close-active-00001" };
      const [blocked, forbidden] = await Promise.all([call(functionsHost, projectId, "closeSeason", command, owner.idToken), call(functionsHost, projectId, "closeSeason", command, outsider.idToken)]);
      assert.equal(blocked.body?.error?.details?.reason, "ACTIVE_MEMBERSHIPS_EXIST", JSON.stringify(blocked.body)); assert.equal(forbidden.body?.error?.details?.reason, "NOT_AUTHORIZED");
      assert.equal((await db.collection("seasons").doc(seasonId).get()).data().estado, "abierta"); assert.equal((await db.collection("seasonClosureReceipts").where("seasonId", "==", seasonId).get()).size, 0);
    });

    await t.test("guard v1 se backfillea sólo dentro del cierre válido", async () => {
      const seasonId = "e2-15-legacy-season"; const key = "e2-15-legacy-open-key"; const season = seasonData(groups.legacy, "Legacy N");
      const keyHash = hashSeasonIdempotencyKey(groups.legacy, key); const requestHash = hashSeasonRequest({ ...season, seasonId });
      await db.collection("seasons").doc(seasonId).set(season); await db.collection("openSeasonGuards").doc(groups.legacy).set({ seasonId, idempotencyKeyHash: keyHash, requestHash, createdAt: now, guardVersion: 1 });
      const result = await call(functionsHost, projectId, "closeSeason", { groupId: groups.legacy, seasonId, idempotencyKey: "e2-15-close-legacy-0001" }, owner.idToken);
      assert.equal(result.body?.result?.outcome, "CLOSED", JSON.stringify(result.body));
      const receipt = (await db.collection("seasonOpeningReceipts").doc(legacySeasonOpeningReceiptId(groups.legacy, keyHash)).get()).data();
      assert.equal(receipt.receiptVersion, 1); assert.equal(receipt.seasonId, seasonId); assert.equal(Object.hasOwn(receipt, "actorUserId"), false);
    });

    await t.test("payload cerrado y Rules niegan ambos receipts a visitante/Owner/global admin", async () => {
      const invalid = await call(functionsHost, projectId, "closeSeason", { groupId: groups.success, seasonId: "x", idempotencyKey: "e2-15-invalid-close-key", closedBy: owner.uid }, owner.idToken);
      assert.equal(invalid.body?.error?.details?.reason, "VALIDATION_FAILED");
      for (const token of [undefined, owner.idToken, outsider.idToken]) for (const collection of ["seasonOpeningReceipts", "seasonClosureReceipts"]) assert.equal(await clientRead(firestoreHost, projectId, `${collection}/hidden`, token), 403);
    });
  } finally {
    for (const collection of ["seasonClosureReceipts", "seasonOpeningReceipts", "openSeasonGuards", "activeMembershipGuards", "memberships", "pendingGroupJoinRequestGuards", "groupJoinRequests", "seasons", "matches", "tournaments", "groups", "users"]) {
      const snapshot = await db.collection(collection).get(); const batch = db.batch(); for (const document of snapshot.docs) if (document.id.startsWith("e2-15-") || document.id === owner.uid || document.id === outsider.uid) batch.delete(document.ref); await batch.commit();
    }
    await Promise.allSettled([auth.deleteUser(owner.uid), auth.deleteUser(outsider.uid)]); await app.delete();
  }
});
