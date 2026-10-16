"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-04-obligations-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E3-04-obligations-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, actor) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${actor.idToken}` }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}

test("E3-04 Mis obligaciones distingue vacío, Persona faltante e historia de exintegrante", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-04-my-obligations-empty");
  const db = app.firestore(); const auth = app.auth();
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-01-01T00:00:00Z"));
  const paymentAt = admin.firestore.Timestamp.fromDate(new Date("2026-10-01T00:00:00Z"));
  const [empty, noPerson, former] = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-04-empty@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-04-no-person@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-04-former@example.invalid"),
  ]);
  const prefix = "e3-04-obligations-"; const refs = [];
  const put = async (path, data) => { const ref = db.doc(path); refs.push(ref); await ref.set(data); };
  const call = (name, data, actor) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, actor);
  try {
    await put(`users/${empty.uid}`, { nombre: "Vacía", email: empty.email, photoURL: "", createdAt: at, personaId: `${prefix}person-empty` });
    await put(`personas/${prefix}person-empty`, { nombre: "Eva", apellido: "Vacía", emailContacto: empty.email, createdAt: at });
    await put(`users/${noPerson.uid}`, { nombre: "Sin Persona", email: noPerson.email, photoURL: "", createdAt: at });
    await put(`users/${former.uid}`, { nombre: "Exintegrante", email: former.email, photoURL: "", createdAt: at, personaId: `${prefix}person-former` });
    await put(`personas/${prefix}person-former`, { nombre: "Ex", apellido: "Integrante", emailContacto: former.email, createdAt: at });
    await put(`groups/${prefix}group`, { nombre: "Grupo histórico", deporte: "voleibol", ownerId: empty.uid, estado: "activo", createdAt: at, schemaVersion: 1 });
    await put(`seasons/${prefix}season`, { groupId: `${prefix}group`, nombre: "Temporada anterior", fechaInicio: "2026-01-01", estado: "cerrada", createdAt: at, closedAt: admin.firestore.Timestamp.fromDate(new Date("2026-09-30T00:00:00Z")), closedBy: empty.uid, schemaVersion: 2 });
    const joinedAt = admin.firestore.Timestamp.fromDate(new Date("2026-01-10T00:00:00Z"));
    await put(`memberships/${prefix}membership`, { personId: `${prefix}person-former`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "finalizada", fechaIngreso: joinedAt, fechaEgreso: admin.firestore.Timestamp.fromDate(new Date("2026-09-30T00:00:00Z")), createdAt: joinedAt, schemaVersion: 2 });
    await put(`payments/${prefix}payment`, { groupId: `${prefix}group`, membershipId: `${prefix}membership`, personId: `${prefix}person-former`, seasonId: `${prefix}season`, conceptId: `${prefix}concept`, conceptSnapshot: { version: 1, name: "Cuota histórica", kind: "MONTHLY", currency: "ARS", defaultAmountMinor: 250000 }, amountMinor: 250000, dueDate: "2026-09-20", estado: "PENDING", generationIntentId: `${prefix}intent`, payloadHash: "a".repeat(64), periodKey: "2026-09", createdAt: paymentAt, schemaVersion: 1 });

    const rejected = await call("listMyGroupMembershipHistory", { pageSize: 50 }, empty);
    assert.equal(rejected.status, 400); assert.equal(rejected.body?.error?.details?.reason, "VALIDATION_FAILED");

    const [emptyHistory, emptyObligations] = await Promise.all([
      call("listMyGroupMembershipHistory", {}, empty),
      call("listMyObligations", { economicStates: ["PENDING", "PARTIAL"], pageSize: 20 }, empty),
    ]);
    assert.equal(emptyHistory.status, 200, JSON.stringify(emptyHistory.body)); assert.deepEqual(emptyHistory.body.result.items, []);
    assert.equal(emptyObligations.status, 200, JSON.stringify(emptyObligations.body)); assert.deepEqual(emptyObligations.body.result.items, []);

    const [missingHistory, missingObligations] = await Promise.all([
      call("listMyGroupMembershipHistory", {}, noPerson),
      call("listMyObligations", { economicStates: ["PENDING", "PARTIAL"], pageSize: 20 }, noPerson),
    ]);
    assert.equal(missingHistory.body?.error?.details?.reason, "PERSON_REQUIRED");
    assert.equal(missingObligations.body?.error?.details?.reason, "PERSON_REQUIRED");

    const [formerHistory, formerObligations] = await Promise.all([
      call("listMyGroupMembershipHistory", {}, former),
      call("listMyObligations", { economicStates: ["PENDING", "PARTIAL"], pageSize: 20 }, former),
    ]);
    assert.equal(formerHistory.status, 200, JSON.stringify(formerHistory.body));
    assert.deepEqual(formerHistory.body.result.items.map((item) => item.status), ["HISTORICAL"]);
    assert.equal(formerObligations.status, 200, JSON.stringify(formerObligations.body));
    assert.deepEqual(formerObligations.body.result.items.map((item) => [item.groupName, item.balanceMinor]), [["Grupo histórico", 250000]]);
  } finally {
    for (const ref of refs.reverse()) await ref.delete().catch(() => {});
    await Promise.allSettled([empty, noPerson, former].map((actor) => auth.deleteUser(actor.uid)));
    await app.delete();
  }
});
