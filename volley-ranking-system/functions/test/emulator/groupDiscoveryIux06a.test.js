"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { groupJoinRequestIntentId, pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=iux-06a-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "IUX-06A-password!", returnSecureToken: true }) });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email };
}
async function invoke(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data }) });
  return { status: response.status, body: await json(response) };
}
async function directRead(host, projectId, path, token) {
  return fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
}
function account(actor, personId) { return { nombre: "Cuenta", email: actor.email, photoURL: "", ...(personId ? { personaId: personId } : {}), createdAt: new Date() }; }
function person(first, last, email) { return { nombre: first, apellido: last, emailContacto: email, createdAt: new Date() }; }
function group(ownerId, nombre, deporte = "voleibol") { return { nombre, deporte, ownerId, estado: "activo", createdAt: new Date(), schemaVersion: 1 }; }

test("IUX-06A publica, descubre y solicita con autorización y compatibilidad", async () => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "iux-06a-discovery"); const db = app.firestore(); const auth = app.auth(); const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, candidate, noPerson, member, foreign, otherOwner] = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06a-owner@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06a-candidate@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06a-no-person@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06a-member@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06a-foreign@example.invalid"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "iux-06a-other-owner@example.invalid"),
  ]);
  const ids = { legacy: "iux-06a-legacy", member: "iux-06a-member-group", candidatePerson: "iux-06a-person-candidate", memberPerson: "iux-06a-person-member" };
  const call = (name, data, token) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, token);
  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner)),
      fixtures.set(db.collection("users").doc(candidate.uid), account(candidate, ids.candidatePerson)),
      fixtures.set(db.collection("users").doc(noPerson.uid), account(noPerson)),
      fixtures.set(db.collection("users").doc(member.uid), account(member, ids.memberPerson)),
      fixtures.set(db.collection("users").doc(foreign.uid), account(foreign)),
      fixtures.set(db.collection("users").doc(otherOwner.uid), account(otherOwner)),
      fixtures.set(db.collection("personas").doc(ids.candidatePerson), person("Ana", "Candidata", candidate.email)),
      fixtures.set(db.collection("personas").doc(ids.memberPerson), person("Mara", "Miembro", member.email)),
      fixtures.set(db.collection("groups").doc(ids.legacy), group(owner.uid, "Grupo histórico")),
      fixtures.set(db.collection("groups").doc(ids.member), group(owner.uid, "Grupo ya integrado")),
    ]);
    const membershipId = "iux-06a-active-membership"; const guardId = activeMembershipGuardId(ids.member, ids.memberPerson); const at = admin.firestore.Timestamp.now();
    await Promise.all([
      fixtures.set(db.collection("memberships").doc(membershipId), { personId: ids.memberPerson, groupId: ids.member, seasonId: "iux-06a-season", estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }),
      fixtures.set(db.collection("activeMembershipGuards").doc(guardId), { membershipId, personId: ids.memberPerson, groupId: ids.member, seasonId: "iux-06a-season", idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
    ]);

    const initial = await call("getOwnGroupPublication", { groupId: ids.legacy }, owner.idToken);
    assert.deepEqual(initial.body.result, { publicationState: "invite_only", publishedAt: null });
    for (const groupId of [ids.legacy, ids.member]) {
      const published = await call("setOwnGroupPublication", { groupId, published: true }, owner.idToken);
      assert.equal(published.body.result.publicationState, "published", JSON.stringify(published.body));
      fixtures.register(db.collection("groupExplorationPublications").doc(groupId));
    }
    const foreignChange = await call("setOwnGroupPublication", { groupId: ids.legacy, published: false }, foreign.idToken);
    assert.equal(foreignChange.body.error.details.reason, "GROUP_NOT_ACCESSIBLE");

    const candidateCatalog = await call("listExploreGroups", {}, candidate.idToken);
    assert.deepEqual(new Set(candidateCatalog.body.result.items.map((item) => item.id)), new Set([ids.legacy, ids.member]));
    for (const item of candidateCatalog.body.result.items) {
      assert.deepEqual(Object.keys(item).sort(), ["deporte", "id", "nombre", "ownRequestStatus"]);
      assert.equal(item.ownRequestStatus, "none");
    }
    assert.equal(candidateCatalog.body.result.viewer.personStatus, "available");
    const ownerCatalog = await call("listExploreGroups", {}, owner.idToken);
    assert.deepEqual(ownerCatalog.body.result.items, []);
    const memberCatalog = await call("listExploreGroups", {}, member.idToken);
    assert.equal(memberCatalog.body.result.items.some((item) => item.id === ids.member), false);
    assert.equal(memberCatalog.body.result.items.some((item) => item.id === ids.legacy), true);

    const noPersonCatalog = await call("listExploreGroups", {}, noPerson.idToken);
    assert.equal(noPersonCatalog.body.result.viewer.personStatus, "required");
    const noPersonPreview = await call("getKnownGroupJoinPreview", { groupId: ids.legacy, source: "EXPLORE" }, noPerson.idToken);
    assert.deepEqual(noPersonPreview.body.result, { group: { id: ids.legacy, nombre: "Grupo histórico", deporte: "voleibol" }, requestEligibility: "PERSON_REQUIRED" });
    assert.equal((await directRead(process.env.FIRESTORE_EMULATOR_HOST, projectId, `groupExplorationPublications/${ids.legacy}`, candidate.idToken)).status, 403);

    const requestKey = "iux-06a-request-key-0001";
    const created = await call("createMyGroupJoinRequest", { groupId: ids.legacy, idempotencyKey: requestKey, source: "EXPLORE" }, candidate.idToken);
    assert.equal(created.body.result.outcome, "CREATED_PENDING", JSON.stringify(created.body));
    const requestId = created.body.result.request.id;
    fixtures.register(db.collection("groupJoinRequests").doc(requestId));
    fixtures.register(db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(ids.legacy, ids.candidatePerson)));
    fixtures.register(db.collection("groupJoinRequestIntents").doc(groupJoinRequestIntentId(candidate.uid, requestKey)));

    const catalogWithPendingRequest = await call("listExploreGroups", {}, candidate.idToken);
    const pendingCard = catalogWithPendingRequest.body.result.items.find((item) => item.id === ids.legacy);
    assert.equal(pendingCard?.ownRequestStatus, "pending", JSON.stringify(catalogWithPendingRequest.body));

    const unpublished = await call("setOwnGroupPublication", { groupId: ids.legacy, published: false }, owner.idToken);
    assert.equal(unpublished.body.result.publicationState, "invite_only");
    const after = await call("listExploreGroups", {}, candidate.idToken);
    assert.equal(after.body.result.items.some((item) => item.id === ids.legacy), false);
    const sharedLink = await call("getKnownGroupJoinPreview", { groupId: ids.legacy }, noPerson.idToken);
    assert.equal(sharedLink.body.result.requestEligibility, "PERSON_REQUIRED");
    const existing = await call("getMyCurrentGroupJoinRequest", { groupId: ids.legacy }, candidate.idToken);
    assert.equal(existing.body.result.request.id, requestId);
    const staleCard = await call("createMyGroupJoinRequest", { groupId: ids.legacy, idempotencyKey: "iux-06a-stale-card-0001", source: "EXPLORE" }, candidate.idToken);
    assert.equal(staleCard.body.error.details.reason, "GROUP_NOT_AVAILABLE");

    const other = await call("createOwnGroup", { nombre: "Grupo genérico", deporte: "otro", idempotencyKey: "iux-06a-other-group-key" }, otherOwner.idToken);
    assert.equal(other.body.result.group.deporte, "otro", JSON.stringify(other.body));
    const otherGroupId = other.body.result.group.id;
    fixtures.register(db.collection("groups").doc(otherGroupId)); fixtures.register(db.collection("groupCreationGuards").doc(otherOwner.uid));
    await fixtures.registerQuery(db.collection("dashboardTaskScopes").where("groupId", "==", otherGroupId));
    await fixtures.registerQuery(db.collection("dashboardTaskOutbox").where("groupId", "==", otherGroupId));
    const otherInitialPublication = await call("getOwnGroupPublication", { groupId: otherGroupId }, otherOwner.idToken);
    assert.deepEqual(otherInitialPublication.body.result, { publicationState: "invite_only", publishedAt: null });
    const legacyRead = await call("getOwnGroup", { groupId: ids.legacy }, owner.idToken);
    assert.equal(legacyRead.body.result.group.deporte, "voleibol");
  } finally {
    await fixtures.registerQuery(db.collection("dashboardTaskOutbox").where("groupId", "in", [ids.legacy, ids.member]));
    await fixtures.registerQuery(db.collection("dashboardTaskScopes").where("groupId", "in", [ids.legacy, ids.member]));
    await fixtures.cleanup(); await auth.deleteUsers([owner.uid, candidate.uid, noPerson.uid, member.uid, foreign.uid, otherOwner.uid]); await app.delete();
  }
});
