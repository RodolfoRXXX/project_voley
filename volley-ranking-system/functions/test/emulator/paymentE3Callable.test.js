"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function body(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-01-callable-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E3-01-callable-password!", returnSecureToken: true }) });
  const value = await body(response); assert.equal(response.status, 200, JSON.stringify(value)); return { uid: value.localId, idToken: value.idToken, email };
}
async function invoke(host, projectId, name, data, actor) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", ...(actor ? { Authorization: `Bearer ${actor.idToken}` } : {}) }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await body(response) };
}

test("E3-01 recorre callables con clientes Auth Emulator y efectos observables", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e3-01-callable-integration"); const db = app.firestore(); const auth = app.auth();
  const [owner, member, foreign] = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-call-owner@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-call-member@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e3-call-foreign@example.invalid"),
  ]);
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST; const prefix = "e3-call-";
  try {
    const timestamp = admin.firestore.Timestamp.fromDate(new Date("2026-01-01T00:00:00Z"));
    await Promise.all([
      db.doc(`users/${owner.uid}`).set({ nombre: "Owner", email: owner.email, photoURL: "", createdAt: timestamp, personaId: `${prefix}person-owner` }),
      db.doc(`users/${member.uid}`).set({ nombre: "Member", email: member.email, photoURL: "", createdAt: timestamp, personaId: `${prefix}person-member` }),
      db.doc(`users/${foreign.uid}`).set({ nombre: "Foreign", email: foreign.email, photoURL: "", createdAt: timestamp, personaId: `${prefix}person-foreign` }),
      db.doc(`personas/${prefix}person-owner`).set({ nombre: "Olga", apellido: "Sintética", emailContacto: "owner@example.invalid", createdAt: timestamp }),
      db.doc(`personas/${prefix}person-member`).set({ nombre: "Mara", apellido: "Sintética", emailContacto: "member@example.invalid", createdAt: timestamp }),
      db.doc(`personas/${prefix}person-foreign`).set({ nombre: "Fina", apellido: "Sintética", emailContacto: "foreign@example.invalid", createdAt: timestamp }),
      db.doc(`groups/${prefix}group`).set({ nombre: "Grupo callable", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: timestamp, schemaVersion: 1 }),
      db.doc(`seasons/${prefix}season`).set({ groupId: `${prefix}group`, nombre: "2026", fechaInicio: "2026-01-01", estado: "abierta", createdAt: timestamp, schemaVersion: 1 }),
      db.doc(`memberships/${prefix}membership`).set({ personId: `${prefix}person-member`, groupId: `${prefix}group`, seasonId: `${prefix}season`, estado: "activa", fechaIngreso: timestamp, createdAt: timestamp, schemaVersion: 1 }),
    ]);

    const createInput = { groupId: `${prefix}group`, name: "Cuota callable", kind: "MONTHLY", defaultAmountMinor: 180000, idempotencyKey: "e3-call-concept-key-0001" };
    const created = await invoke(functionsHost, projectId, "createGroupChargeConcept", createInput, owner);
    assert.equal(created.body?.result?.outcome, "CREATED", JSON.stringify(created.body)); const concept = created.body.result.resource;
    const generation = { groupId: `${prefix}group`, conceptId: concept.conceptId, expectedConceptVersion: concept.version, membershipIds: [`${prefix}membership`], dueDate: "2026-10-20", baseAmountMinor: concept.defaultAmountMinor, exceptions: [], generationIdempotencyKey: "e3-call-generation-key-01", kind: "MONTHLY", periodKey: "2026-10" };

    await t.test("Owner crea, genera, consulta y el retry idéntico no duplica", async () => {
      const first = await invoke(functionsHost, projectId, "generateMembershipObligations", generation, owner); assert.equal(first.body?.result?.rows?.[0]?.outcome, "CREATED", JSON.stringify(first.body));
      const retry = await invoke(functionsHost, projectId, "generateMembershipObligations", generation, owner); assert.equal(retry.body?.result?.generationIntentId, first.body.result.generationIntentId); assert.equal(retry.body.result.rows[0].outcome, "CREATED");
      const listed = await invoke(functionsHost, projectId, "listGroupObligations", { groupId: `${prefix}group`, pageSize: 20 }, owner); assert.equal(listed.body?.result?.items?.length, 1, JSON.stringify(listed.body)); assert.deepEqual(listed.body.result.items[0].person, { status: "AVAILABLE", firstName: "Mara", lastName: "Sintética" });
      assert.equal((await db.collection("payments").where("groupId", "==", `${prefix}group`).get()).size, 1);
    });

    await t.test("integrante consulta sólo lo propio", async () => {
      const own = await invoke(functionsHost, projectId, "listMyObligations", { pageSize: 20 }, member); assert.equal(own.body?.result?.items?.length, 1, JSON.stringify(own.body)); assert.equal(own.body.result.items[0].groupId, undefined); assert.equal(own.body.result.items[0].person, undefined);
      const unrelated = await invoke(functionsHost, projectId, "listMyObligations", { pageSize: 20 }, foreign); assert.deepEqual(unrelated.body?.result?.items, []);
    });

    await t.test("ajeno, anónimo y campos de autoridad se rechazan sin efectos", async () => {
      const before = (await db.collection("payments").where("groupId", "==", `${prefix}group`).get()).size;
      const [foreignGenerate, unauthenticated, authority] = await Promise.all([
        invoke(functionsHost, projectId, "generateMembershipObligations", { ...generation, generationIdempotencyKey: "e3-call-foreign-key-0001" }, foreign),
        invoke(functionsHost, projectId, "generateMembershipObligations", { ...generation, generationIdempotencyKey: "e3-call-anon-key-000001" }),
        invoke(functionsHost, projectId, "createGroupChargeConcept", { ...createInput, idempotencyKey: "e3-call-authority-key-001", actorUserId: owner.uid }, owner),
      ]);
      assert.equal(foreignGenerate.body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE"); assert.equal(unauthenticated.body?.error?.details?.reason, "UNAUTHENTICATED"); assert.equal(authority.body?.error?.details?.reason, "VALIDATION_FAILED");
      assert.equal((await db.collection("payments").where("groupId", "==", `${prefix}group`).get()).size, before);
      assert.equal((await db.collection("paymentGenerationIntents").where("groupId", "==", `${prefix}group`).get()).size, 1);
      assert.equal((await db.collection("groupChargeConcepts").where("groupId", "==", `${prefix}group`).get()).size, 1);
    });

    await t.test("misma key con payload distinto conflictúa", async () => {
      const conflict = await invoke(functionsHost, projectId, "generateMembershipObligations", { ...generation, dueDate: "2026-10-21" }, owner);
      assert.equal(conflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT", JSON.stringify(conflict.body)); assert.equal((await db.collection("payments").where("groupId", "==", `${prefix}group`).get()).size, 1);
    });

    await t.test("Grupo archivado conserva consultas económicas y el roster operativo explica el error UAT-08", async () => {
      await db.doc(`groups/${prefix}group`).set({ nombre: "Grupo callable", deporte: "voleibol", ownerId: owner.uid, estado: "archivado", createdAt: timestamp, archivedAt: admin.firestore.Timestamp.fromDate(new Date("2026-10-08T18:00:00Z")), schemaVersion: 2 });
      const [concepts, obligations, roster] = await Promise.all([
        invoke(functionsHost, projectId, "listGroupChargeConcepts", { groupId: `${prefix}group`, pageSize: 20 }, owner),
        invoke(functionsHost, projectId, "listGroupObligations", { groupId: `${prefix}group`, pageSize: 20 }, owner),
        invoke(functionsHost, projectId, "listActiveGroupMembersForOwnedGroup", { groupId: `${prefix}group`, pageSize: 20 }, owner),
      ]);
      assert.equal(concepts.body?.result?.items?.length, 1, JSON.stringify(concepts.body)); assert.equal(obligations.body?.result?.items?.length, 1, JSON.stringify(obligations.body)); assert.equal(roster.body?.error?.details?.reason, "INCOMPATIBLE_STATE", JSON.stringify(roster.body));
    });
  } finally {
    const intents = await db.collection("paymentGenerationIntents").where("groupId", "==", `${prefix}group`).get();
    for (const intent of intents.docs) { const rows = await intent.ref.collection("rows").get(); const batch = db.batch(); rows.docs.forEach((row) => batch.delete(row.ref)); batch.delete(intent.ref); await batch.commit(); }
    for (const collection of ["payments", "groupChargeConcepts", "paymentCommandReceipts", "memberships", "seasons", "groups", "personas"]) { const snapshot = await db.collection(collection).get(); const batch = db.batch(); snapshot.docs.filter((doc) => doc.id.startsWith(prefix)).forEach((doc) => batch.delete(doc.ref)); await batch.commit(); }
    for (const actor of [owner, member, foreign]) await db.doc(`users/${actor.uid}`).delete().catch(() => {});
    await Promise.allSettled([owner, member, foreign].map((actor) => auth.deleteUser(actor.uid))); await app.delete();
  }
});
