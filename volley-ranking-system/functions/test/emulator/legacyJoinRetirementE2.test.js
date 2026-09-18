"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, label) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-13-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `e2-13-${label}@example.invalid`, password: "E2-13-synthetic-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken };
}
async function api(host, projectId, path, { token, method = "POST", origin = "http://127.0.0.1:3000", body } = {}) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/api${path}`, { method, headers: { ...(origin ? { Origin: origin } : {}), "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(!["GET", "HEAD"].includes(method) && body !== undefined ? { body } : {}) });
  return { status: response.status, headers: response.headers, body: await json(response) };
}
async function callable(host, projectId, name, data, token) {
  const region = ["addGroupAdmin", "removeGroupAdmin", "reorderGroupAdmins", "transferGroupOwnership"].includes(name) ? "southamerica-east1" : "us-central1";
  const response = await fetch(`http://${host}/${projectId}/${region}/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function firestore(host, projectId, path, token, method, fields) {
  const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: fields ? JSON.stringify({ fields }) : undefined });
  return { status: response.status, body: await json(response) };
}
const array = (values) => ({ arrayValue: { values: values.map((value) => ({ stringValue: value })) } });

test("E2-13 retira autoridad organizativa legacy y conserva compatibilidad E4", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-13-retirement");
  const db = app.firestore(); const auth = app.auth();
  const [owner, globalAdmin, outsider] = await Promise.all([signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "owner"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "global-admin"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "outsider")]);
  const legacyId = "e2-13-legacy-public"; const privateId = "e2-13-legacy-private"; const v1Id = "e2-13-v1";
  const legacyRef = db.collection("groups").doc(legacyId);
  const legacy = { nombre: "Grupo histórico", descripcion: "Compatibilidad E4", visibility: "public", activo: true, ownerId: owner.uid, adminIds: [owner.uid], admins: [{ userId: owner.uid, role: "owner", order: 0 }], memberIds: [owner.uid], pendingRequestIds: [outsider.uid], pendingAdminRequestIds: [globalAdmin.uid] };
  try {
    await Promise.all([
      db.collection("users").doc(owner.uid).set({ nombre: "Owner" }), db.collection("users").doc(globalAdmin.uid).set({ nombre: "Admin", roles: "admin" }), db.collection("users").doc(outsider.uid).set({ nombre: "Outsider" }),
      legacyRef.set(legacy), db.collection("groups").doc(privateId).set({ ...legacy, nombre: "Privado", visibility: "private" }), db.collection("groups").doc(v1Id).set({ nombre: "Canónico", deporte: "voleibol", ownerId: owner.uid, estado: "activo", schemaVersion: 1, createdAt: new Date() }),
      db.collection("matches").doc("e2-13-public-match").set({ groupId: legacyId, titulo: "Partido público", visibility: "public", estado: "abierto" }), db.collection("matches").doc("e2-13-private-match").set({ groupId: legacyId, titulo: "Partido privado", visibility: "group_only", estado: "abierto" }),
    ]);

    await t.test("Rules niega create/update/delete para toda identidad y todo campo", async () => {
      const createFields = { nombre: { stringValue: "Cliente" }, adminIds: array([globalAdmin.uid]) };
      for (const actor of [globalAdmin, outsider]) {
        assert.equal((await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `groups?documentId=e2-13-created-${actor.uid}`, actor.idToken, "POST", createFields)).status, 403);
      }
      for (const [field, value] of [["memberIds", array([outsider.uid])], ["adminIds", array([globalAdmin.uid])], ["admins", array([])], ["pendingAdminRequestIds", array([])], ["pendingRequestIds", array([])], ["descripcion", { stringValue: "inocuo" }]]) {
        const result = await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `groups/${legacyId}?updateMask.fieldPaths=${field}`, globalAdmin.idToken, "PATCH", { [field]: value });
        assert.equal(result.status, 403, `${field}: ${JSON.stringify(result.body)}`);
      }
      assert.equal((await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `groups/${v1Id}?updateMask.fieldPaths=nombre`, owner.idToken, "PATCH", { nombre: { stringValue: "No" } })).status, 403);
      assert.equal((await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `groups/${legacyId}`, owner.idToken, "DELETE")).status, 403);
      assert.deepEqual((await legacyRef.get()).data(), legacy);
      const completeLegacyRead = await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `groups/${legacyId}`, owner.idToken, "GET");
      assert.equal(completeLegacyRead.status, 200, JSON.stringify(completeLegacyRead.body));
      for (const field of ["memberIds", "adminIds", "admins", "pendingAdminRequestIds", "pendingRequestIds"]) assert.ok(completeLegacyRead.body.fields[field], field);
      assert.equal((await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `groups/${v1Id}`, owner.idToken, "GET")).status, 403);
    });

    await t.test("ocho HTTP devuelven 410 uniforme antes de identidad o datos", async () => {
      const routes = [
        ["POST", `/groups/${legacyId}/members/${outsider.uid}/add`], ["POST", `/groups/${legacyId}/members/${outsider.uid}/remove`], ["GET", `/groups/${legacyId}/members/search`], ["POST", `/groups/${legacyId}/admin-request`],
        ["POST", `/groups/${legacyId}/admin-requests/${globalAdmin.uid}/approve`], ["POST", `/groups/missing/admin-requests/${globalAdmin.uid}/reject`], ["POST", `/groups/${v1Id}/admins/${globalAdmin.uid}/add`], ["POST", `/groups/${legacyId}/admins/${globalAdmin.uid}/remove`],
      ];
      for (const [method, route] of routes) for (const token of [undefined, owner.idToken, globalAdmin.idToken]) {
        const result = await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, `${route}?retry=1`, { method, token, body: "{}" });
        assert.equal(result.status, 410, `${method} ${route}: ${JSON.stringify(result.body)}`);
        assert.deepEqual(result.body, { error: { code: "LEGACY_GROUP_CAPABILITY_RETIRED", message: "Esta capacidad ya no está disponible." } });
        assert.match(result.headers.get("content-type") || "", /application\/json/);
      }
      assert.equal((await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, `${routes[0][1]}/`, { method: "POST" })).status, 404);
      assert.equal((await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, routes[0][1], { method: "GET" })).status, 404);
      assert.equal((await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, `${routes[4][1]}/extra`, { method: "POST" })).status, 404);
      assert.equal((await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, routes[0][1], { method: "OPTIONS" })).status, 204);
      assert.equal((await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, routes[0][1], { method: "POST", origin: "https://invalid.example" })).status, 403);
      assert.deepEqual((await legacyRef.get()).data(), legacy);
    });

    await t.test("alertas históricas permanecen intactas y no se recrean alertas administrativas", async () => {
      const alerts = db.collection("users").doc(owner.uid).collection("pendingAlerts");
      const historical = {
        "legacy-join": { kind: "group_join_requests_pending", status: "active", meta: {} },
        "legacy-admin": { kind: "group_admin_requests_pending", status: "active", meta: {} },
        "legacy-removed": { kind: "group_membership_result", status: "active", meta: { decision: "removed" } },
        "future-kind": { kind: "future_group_alert", status: "active", meta: {} },
        "tournament-kind": { kind: "group_accepted_in_tournament", status: "active", meta: {} },
      };
      await Promise.all(Object.entries(historical).map(([id, value]) => alerts.doc(id).set(value)));
      await legacyRef.update({ pendingAdminRequestIds: [globalAdmin.uid, outsider.uid] });
      await new Promise((resolve) => setTimeout(resolve, 750));
      const snapshot = await alerts.get();
      assert.deepEqual(Object.fromEntries(snapshot.docs.map((document) => [document.id, document.data()])), historical);
      await legacyRef.set(legacy);
    });

    await t.test("seis callables son tombstones uniformes", async () => {
      for (const name of ["addGroupAdmin", "removeGroupAdmin", "reorderGroupAdmins", "transferGroupOwnership", "editGroup", "toggleGroupActivo"]) for (const token of [undefined, owner.idToken]) {
        const result = await callable(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, { groupId: legacyId, malformed: true }, token);
        assert.equal(result.body?.error?.status, "FAILED_PRECONDITION", `${name}: ${JSON.stringify(result.body)}`);
        assert.equal(result.body?.error?.details?.reason, "LEGACY_GROUP_CAPABILITY_RETIRED");
        assert.equal(result.body?.error?.message, "Esta capacidad ya no está disponible.");
      }
      assert.deepEqual((await legacyRef.get()).data(), legacy);
    });

    await t.test("GET públicos son anónimos, cerrados y excluyen v1/privado", async () => {
      const listed = await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "/groups/public", { method: "GET" });
      assert.equal(listed.status, 200, JSON.stringify(listed.body)); assert.equal(listed.body.groups.length, 1);
      assert.deepEqual(Object.keys(listed.body.groups[0]).sort(), ["active", "description", "id", "name", "totalMatches", "visibility"]);
      const detail = await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, `/groups/${legacyId}/public`, { method: "GET" });
      assert.equal(detail.status, 200, JSON.stringify(detail.body)); assert.deepEqual(Object.keys(detail.body.group).sort(), ["active", "description", "id", "name", "visibility"]); assert.deepEqual(detail.body.matches.map((item) => item.id), ["e2-13-public-match"]);
      for (const id of [privateId, v1Id, "missing"]) {
        const hidden = await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, `/groups/${id}/public`, { method: "GET" });
        assert.equal(hidden.status, 404);
        assert.deepEqual(hidden.body, { error: "Grupo no encontrado" });
      }
    });

    await t.test("push público conserva despacho y no lee users", async () => {
      const result = await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "/push/vapid-public-key", { method: "GET" });
      assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(typeof result.body.vapidPublicKey, "string");
      await db.collection("users").doc(outsider.uid).delete();
      const subscribed = await api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, "/push/subscribe", { method: "POST", token: outsider.idToken, body: JSON.stringify({ endpoint: "https://push.example.invalid/e2-13", keys: { p256dh: "synthetic-p256dh", auth: "synthetic-auth" } }) });
      assert.equal(subscribed.status, 200, JSON.stringify(subscribed.body));
      const subscription = await db.collection("push_subscriptions").where("user_id", "==", outsider.uid).get();
      assert.equal(subscription.size, 1);
      await Promise.all(subscription.docs.map((document) => document.ref.delete()));
    });
  } finally {
    await Promise.allSettled([legacyRef.delete(), db.collection("groups").doc(privateId).delete(), db.collection("groups").doc(v1Id).delete(), db.collection("matches").doc("e2-13-public-match").delete(), db.collection("matches").doc("e2-13-private-match").delete(), ...[owner, globalAdmin, outsider].map((actor) => db.collection("users").doc(actor.uid).delete()), ...[owner, globalAdmin, outsider].map((actor) => auth.deleteUser(actor.uid))]);
    await app.delete();
  }
});
