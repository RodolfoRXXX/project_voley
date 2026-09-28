"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { membershipValidityPeriodId } = require("../../src/memberships/application/membershipHashing");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function body(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-19-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-19-synthetic-password!", returnSecureToken: true }) });
  const value = await body(response); assert.equal(response.status, 200, JSON.stringify(value));
  return { uid: value.localId, idToken: value.idToken, email };
}
async function invoke(host, projectId, data, token) {
  const headers = { "Content-Type": "application/json" }; if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`http://${host}/${projectId}/us-central1/listMyGroupMembershipHistory`, { method: "POST", headers, body: JSON.stringify({ data }) });
  return { status: response.status, body: await body(response) };
}
async function directGet(host, projectId, path, token) {
  return fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
}

test("E2-19 consulta historia propia v1-v4 sin escrituras", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-19-own-history");
  const db = app.firestore(); const auth = app.auth(); const T = admin.firestore.Timestamp;
  const [actor, other, noPerson, pagination] = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-19-actor@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-19-other@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-19-no-person@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-19-pagination@example.invalid"),
  ]);
  const personId = "e2-19-person"; const otherPersonId = "e2-19-person-other"; const pagePersonId = "e2-19-person-page";
  const refs = [];
  const put = async (collection, id, data) => { const ref = db.collection(collection).doc(id); refs.push(ref); await ref.set(data); return ref; };
  const at = (millis) => T.fromMillis(millis);
  const group = (id, name = id) => put("groups", id, { nombre: name, deporte: "voleibol", ownerId: other.uid, estado: "activo", createdAt: at(100), schemaVersion: 1 });
  const season = (id, groupId, estado, name = id) => put("seasons", id, estado === "abierta"
    ? { groupId, nombre: name, fechaInicio: "2026-01-01", estado, createdAt: at(100), schemaVersion: 1 }
    : { groupId, nombre: name, fechaInicio: "2025-01-01", estado, createdAt: at(100), closedAt: at(900), closedBy: other.uid, schemaVersion: 2 });
  const period = async (membershipId, ordinal, startedAt, endedAt) => {
    const id = membershipValidityPeriodId(membershipId, ordinal);
    const ref = db.collection("memberships").doc(membershipId).collection("validityPeriods").doc(id); refs.push(ref);
    await ref.set(endedAt ? { ordinal, estado: "cerrado", startedAt, endedAt, periodSchemaVersion: 1 } : { ordinal, estado: "abierto", startedAt, periodSchemaVersion: 1 });
    return id;
  };
  const call = (data, who = actor) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, data, who?.idToken);

  try {
    await put("users", actor.uid, { nombre: "Actor", email: actor.email, photoURL: "", createdAt: at(100), personaId: personId });
    await put("personas", personId, { nombre: "Ana", apellido: "Historia", emailContacto: actor.email, createdAt: at(100) });
    await put("users", other.uid, { nombre: "Other", email: other.email, photoURL: "", roles: "admin", createdAt: at(100), personaId: otherPersonId });
    await put("personas", otherPersonId, { nombre: "Otra", apellido: "Persona", emailContacto: other.email, createdAt: at(100) });
    await put("users", noPerson.uid, { nombre: "No person", email: noPerson.email, photoURL: "", createdAt: at(100) });
    await put("users", pagination.uid, { nombre: "Page", email: pagination.email, photoURL: "", createdAt: at(100), personaId: pagePersonId });
    await put("personas", pagePersonId, { nombre: "Paz", apellido: "Página", emailContacto: pagination.email, createdAt: at(100) });

    await group("e2-19-group-current", "Actual"); await season("e2-19-season-current", "e2-19-group-current", "abierta", "Actual 2026");
    await group("e2-19-group-shared", "Compartido");
    await season("e2-19-season-old", "e2-19-group-shared", "cerrada", "Anterior");
    await season("e2-19-season-reactivated", "e2-19-group-shared", "abierta", "Reactivada");
    await season("e2-19-season-renewed", "e2-19-group-shared", "cerrada", "Renovada");

    await put("memberships", "e2-19-root-v1", { personId, groupId: "e2-19-group-current", seasonId: "e2-19-season-current", estado: "activa", fechaIngreso: at(4000), createdAt: at(4000), schemaVersion: 1 });
    await put("memberships", "e2-19-root-v2", { personId, groupId: "e2-19-group-shared", seasonId: "e2-19-season-old", estado: "finalizada", fechaIngreso: at(1000), fechaEgreso: at(1500), createdAt: at(1000), schemaVersion: 2 });
    const v3First = await period("e2-19-root-v3", 1, at(2000), at(2200)); const v3Latest = await period("e2-19-root-v3", 2, at(2500));
    assert.notEqual(v3First, v3Latest);
    await put("memberships", "e2-19-root-v3", { personId, groupId: "e2-19-group-shared", seasonId: "e2-19-season-reactivated", estado: "activa", fechaIngreso: at(2000), createdAt: at(2000), latestPeriodId: v3Latest, periodCount: 2, schemaVersion: 3 });
    const v4Period = await period("e2-19-root-v4", 1, at(3000), at(3500));
    await put("memberships", "e2-19-root-v4", { personId, groupId: "e2-19-group-shared", seasonId: "e2-19-season-renewed", estado: "finalizada", fechaIngreso: at(3000), fechaEgreso: at(3500), createdAt: at(3000), latestPeriodId: v4Period, periodCount: 1, previousMembershipId: "e2-19-missing-predecessor", schemaVersion: 4 });

    await t.test("Auth, payload cerrado, Cuenta/Persona y no enumeración", async () => {
      const [visitor, unknown, missing, foreign] = await Promise.all([
        invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, {}, null),
        call({ personId }),
        call({}, noPerson),
        call({}, other),
      ]);
      assert.equal(visitor.body?.error?.details?.reason, "UNAUTHENTICATED");
      assert.equal(unknown.body?.error?.details?.reason, "VALIDATION_FAILED");
      assert.equal(missing.body?.error?.details?.reason, "PERSON_REQUIRED");
      assert.deepEqual(foreign.body?.result, { items: [], nextCursor: null, hasMore: false });
    });

    let ownCursor;
    await t.test("v1-v4, activas/finalizadas, reactivación y renovación se proyectan por raíz", async () => {
      const before = await db.collection("memberships").where("personId", "==", personId).get();
      const result = await call({ pageSize: 3 });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.deepEqual(result.body.result.items.map((item) => [item.status, item.validityPeriodCount, item.continuity]), [
        ["CURRENT", 1, "INITIAL"], ["HISTORICAL", 1, "RENEWAL"], ["CURRENT", 2, "INITIAL"],
      ]);
      assert.equal(result.body.result.items[1].leftAt.endsWith("Z"), true);
      assert.equal(Object.hasOwn(result.body.result.items[0], "leftAt"), false);
      assert.equal(new Set(result.body.result.items.map((item) => item.rowKey)).size, 3);
      for (const item of result.body.result.items) {
        assert.deepEqual(Object.keys(item).sort(), Object.hasOwn(item, "leftAt")
          ? ["continuity", "group", "joinedAt", "leftAt", "rowKey", "season", "status", "validityPeriodCount"]
          : ["continuity", "group", "joinedAt", "rowKey", "season", "status", "validityPeriodCount"]);
        for (const forbidden of ["membershipId", "personId", "previousMembershipId", "schemaVersion", "latestPeriodId"]) assert.equal(JSON.stringify(item).includes(forbidden), false);
      }
      ownCursor = result.body.result.nextCursor; assert.equal(result.body.result.hasMore, true);
      const next = await call({ pageSize: 3, cursor: ownCursor });
      assert.deepEqual(next.body.result.items.map((item) => [item.status, item.continuity]), [["HISTORICAL", "INITIAL"]]);
      assert.equal(next.body.result.hasMore, false); assert.equal(next.body.result.nextCursor, null);
      const after = await db.collection("memberships").where("personId", "==", personId).get();
      assert.deepEqual(after.docs.map((doc) => [doc.id, doc.data()]), before.docs.map((doc) => [doc.id, doc.data()]));
      assert.equal((await db.collection("memberships").doc("e2-19-missing-predecessor").get()).exists, false);
    });

    await t.test("cursor de otro actor y vínculo cambiado no conceden autoridad", async () => {
      const alien = await call({ cursor: ownCursor }, other); assert.equal(alien.body?.error?.details?.reason, "CURSOR_INVALID");
      const userRef = db.collection("users").doc(actor.uid); const user = (await userRef.get()).data();
      await userRef.update({ personaId: otherPersonId });
      const changed = await call({ cursor: ownCursor }); assert.equal(changed.body?.error?.details?.reason, "CURSOR_INVALID");
      await userRef.set(user);
    });

    await group("e2-19-page-group", "Página"); await season("e2-19-page-season", "e2-19-page-group", "abierta", "Página 2026");
    const pageRoots = [];
    for (let index = 0; index < 21; index += 1) {
      const id = `e2-19-page-root-${String(index).padStart(2, "0")}`; const ref = db.collection("memberships").doc(id); refs.push(ref); pageRoots.push(ref);
      await ref.set({ personId: pagePersonId, groupId: "e2-19-page-group", seasonId: "e2-19-page-season", estado: "activa", fechaIngreso: at(10000 - index), createdAt: at(10000 - index), schemaVersion: 1 });
    }
    await t.test("20/21 ordena, desempata, ancla última entregada y detecta lookahead incompatible", async () => {
      const first = await call({}, pagination); assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(first.body.result.items.length, 20); assert.equal(first.body.result.hasMore, true); assert.equal(typeof first.body.result.nextCursor, "string");
      const second = await call({ cursor: first.body.result.nextCursor }, pagination); assert.equal(second.body.result.items.length, 1); assert.equal(second.body.result.hasMore, false);
      await pageRoots[20].update({ extra: true });
      const incompatible = await call({}, pagination); assert.equal(incompatible.body?.error?.details?.reason, "INCOMPATIBLE_STATE");
      assert.equal(incompatible.body?.result, undefined);
      await pageRoots[20].update({ extra: admin.firestore.FieldValue.delete() });
    });

    await t.test("referencias ausentes fallan toda la página y no se reparan", async () => {
      const ref = db.collection("groups").doc("e2-19-group-current"); const data = (await ref.get()).data(); await ref.delete();
      const result = await call({ pageSize: 1 }); assert.equal(result.body?.error?.details?.reason, "INCOMPATIBLE_STATE"); assert.equal((await ref.get()).exists, false);
      await ref.set(data);
    });

    await t.test("Rules niegan acceso cliente a roots, Períodos y guards", async () => {
      for (const path of ["memberships/e2-19-root-v1", `memberships/e2-19-root-v3/validityPeriods/${v3First}`, "activeMembershipGuards/nonexistent", "membershipLifecycleGuards/nonexistent"]) {
        const response = await directGet(process.env.FIRESTORE_EMULATOR_HOST, projectId, path, actor.idToken);
        assert.equal(response.status, 403, `${path}: ${await response.text()}`);
      }
    });
  } finally {
    for (const ref of refs.reverse()) await ref.delete().catch(() => {});
    await auth.deleteUsers([actor.uid, other.uid, noPerson.uid, pagination.uid]); await app.delete();
  }
});
