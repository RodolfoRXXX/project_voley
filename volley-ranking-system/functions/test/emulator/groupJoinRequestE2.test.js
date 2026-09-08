"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { groupJoinRequestIntentId, pendingGroupJoinRequestGuardId } = require("../../src/groupJoinRequests/application/groupJoinRequestHashing");
const { activeMembershipGuardId } = require("../../src/memberships/application/membershipHashing");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const value = await response.text(); return value ? JSON.parse(value) : null; }
async function signUp(host, email) { const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-06-synthetic-key`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "E2-06-synthetic-password!", returnSecureToken: true }) }); const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body)); return { uid: body.localId, idToken: body.idToken, email }; }
async function invoke(host, projectId, name, data, token) { const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }; const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, { method: "POST", headers, body: JSON.stringify({ data }) }); return { status: response.status, body: await json(response) }; }
async function firestore(host, projectId, path, token, method = "GET") { const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }; const suffix = method === "POST" ? "?documentId=client-attempt" : ""; const response = await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}${suffix}`, { method, headers, body: ["GET", "DELETE"].includes(method) ? undefined : JSON.stringify({ fields: {} }) }); return response.status; }
function account(actor, personId) { return { nombre: "Cuenta", email: actor.email, photoURL: "", personaId: personId, createdAt: new Date() }; }
function person(firstName, lastName, email) { return { nombre: firstName, apellido: lastName, emailContacto: email, createdAt: new Date() }; }
function group(ownerId, name = "Grupo sintético") { return { nombre: name, deporte: "voleibol", ownerId, estado: "activo", createdAt: new Date(), schemaVersion: 1 }; }
function command(groupId, idempotencyKey = "e2-06-key-000000000001") { return { groupId, idempotencyKey }; }

test("E2-06 solicitud propia usa fuente autoritativa, idempotencia, privacidad, índice y deny-all", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const admin = require("firebase-admin"); const app = admin.initializeApp({ projectId }, "e2-06-group-join-request"); const db = app.firestore(); const auth = app.auth(); const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, candidate, candidateTwo, member, globalAdmin] = await Promise.all([signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-06-owner@example.invalid"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-06-candidate@example.invalid"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-06-candidate-two@example.invalid"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-06-member@example.invalid"), signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "e2-06-admin@example.invalid")]);
  const ids = { group: "e2-06-group", otherGroup: "e2-06-other-group", raceGroup: "e2-06-race-group", actorGroupA: "e2-06-actor-group-a", actorGroupB: "e2-06-actor-group-b", recoveryGroup: "e2-06-recovery-group", cancelRaceGroup: "e2-06-cancel-race-group", membershipRaceGroup: "e2-06-membership-race-group", sideEffectGroup: "e2-06-side-effect-group", ownerPerson: "e2-06-person-owner", candidatePerson: "e2-06-person-candidate", candidateTwoPerson: "e2-06-person-candidate-two", memberPerson: "e2-06-person-member", adminPerson: "e2-06-person-admin" };
  const call = (name, data, token) => invoke(process.env.FUNCTIONS_EMULATOR_HOST, projectId, name, data, token);
  async function registerCreated(result, actor, key) { const id = result.body?.result?.request?.id; if (id) fixtures.register(db.collection("groupJoinRequests").doc(id)); fixtures.register(db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(result.body.result.request.groupId, actor === candidate ? ids.candidatePerson : ids.candidateTwoPerson))); fixtures.register(db.collection("groupJoinRequestIntents").doc(groupJoinRequestIntentId(actor.uid, key))); return id; }
  try {
    await Promise.all([
      fixtures.set(db.collection("users").doc(owner.uid), account(owner, ids.ownerPerson)),
      fixtures.set(db.collection("users").doc(candidate.uid), account(candidate, ids.candidatePerson)),
      fixtures.set(db.collection("users").doc(candidateTwo.uid), account(candidateTwo, ids.candidateTwoPerson)),
      fixtures.set(db.collection("users").doc(member.uid), account(member, ids.memberPerson)),
      fixtures.set(db.collection("users").doc(globalAdmin.uid), { ...account(globalAdmin, ids.adminPerson), roles: "admin" }),
      fixtures.set(db.collection("personas").doc(ids.ownerPerson), person("Olivia", "Owner", owner.email)),
      fixtures.set(db.collection("personas").doc(ids.candidatePerson), person("Ana", "Pérez", candidate.email)),
      fixtures.set(db.collection("personas").doc(ids.candidateTwoPerson), person("Beto", "López", candidateTwo.email)),
      fixtures.set(db.collection("personas").doc(ids.adminPerson), person("Admin", "Global", globalAdmin.email)),
      fixtures.set(db.collection("personas").doc(ids.memberPerson), person("Mara", "Miembro", member.email)),
      fixtures.set(db.collection("groups").doc(ids.group), group(owner.uid)),
      fixtures.set(db.collection("groups").doc(ids.otherGroup), group(owner.uid, "Otro Grupo")),
      fixtures.set(db.collection("groups").doc(ids.raceGroup), group(owner.uid, "Grupo Carrera")),
      ...[ids.actorGroupA, ids.actorGroupB, ids.recoveryGroup, ids.cancelRaceGroup, ids.membershipRaceGroup, ids.sideEffectGroup].map((id) => fixtures.set(db.collection("groups").doc(id), group(owner.uid, id))),
    ]);

    const memberMembershipId = "e2-06-member-membership"; const memberMembershipGuard = activeMembershipGuardId(ids.otherGroup, ids.memberPerson); const memberAt = admin.firestore.Timestamp.now();
    await Promise.all([
      fixtures.set(db.collection("memberships").doc(memberMembershipId), { personId: ids.memberPerson, groupId: ids.otherGroup, seasonId: "e2-06-member-season", estado: "activa", fechaIngreso: memberAt, createdAt: memberAt, schemaVersion: 1 }),
      fixtures.set(db.collection("activeMembershipGuards").doc(memberMembershipGuard), { membershipId: memberMembershipId, personId: ids.memberPerson, groupId: ids.otherGroup, seasonId: "e2-06-member-season", idempotencyKeyHash: "d".repeat(64), requestHash: "e".repeat(64), createdAt: memberAt, guardVersion: 1 }),
    ]);

    await t.test("preview, payloads y autoridad colapsan sin exponer internals", async () => {
      const [visitor, preview, ownerPreview, manipulated, adminList] = await Promise.all([
        call("getKnownGroupJoinPreview", { groupId: ids.group }), call("getKnownGroupJoinPreview", { groupId: ids.group }, candidate.idToken), call("getKnownGroupJoinPreview", { groupId: ids.group }, owner.idToken), call("createMyGroupJoinRequest", { ...command(ids.group), personId: ids.candidatePerson }, candidate.idToken), call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group }, globalAdmin.idToken),
      ]);
      assert.equal(visitor.body.error.details.reason, "UNAUTHENTICATED"); assert.deepEqual(preview.body.result, { group: { id: ids.group, nombre: "Grupo sintético", deporte: "voleibol" } }); assert.equal(ownerPreview.body.error.details.reason, "OWNER_CANNOT_REQUEST"); assert.equal(manipulated.body.error.details.reason, "VALIDATION_FAILED"); assert.equal(adminList.body.error.details.reason, "NOT_AUTHORIZED");
      assert.equal(JSON.stringify(preview.body).includes(owner.uid), false); assert.equal(JSON.stringify(preview.body).includes("email"), false);
    });

    await t.test("Membresía activa correlacionada impide preview y creación", async () => {
      const membershipId = "e2-06-active-membership", seasonId = "e2-06-season", guardId = activeMembershipGuardId(ids.otherGroup, ids.adminPerson), at = admin.firestore.Timestamp.now();
      fixtures.register(db.collection("memberships").doc(membershipId)); fixtures.register(db.collection("activeMembershipGuards").doc(guardId));
      await Promise.all([
        db.collection("memberships").doc(membershipId).set({ personId: ids.adminPerson, groupId: ids.otherGroup, seasonId, estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 }),
        db.collection("activeMembershipGuards").doc(guardId).set({ membershipId, personId: ids.adminPerson, groupId: ids.otherGroup, seasonId, idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64), createdAt: at, guardVersion: 1 }),
      ]);
      const [preview, create] = await Promise.all([call("getKnownGroupJoinPreview", { groupId: ids.otherGroup }, globalAdmin.idToken), call("createMyGroupJoinRequest", command(ids.otherGroup, "e2-06-active-member-key"), globalAdmin.idToken)]);
      assert.equal(preview.body.error.details.reason, "ACTIVE_MEMBERSHIP_EXISTS"); assert.equal(create.body.error.details.reason, "ACTIVE_MEMBERSHIP_EXISTS");
    });

    let firstId;
    await t.test("creación concurrente, retry y conflicto de contexto convergen", async () => {
      const key = "e2-06-key-000000000001";
      const results = await Promise.all([call("createMyGroupJoinRequest", command(ids.group, key), candidate.idToken), call("createMyGroupJoinRequest", command(ids.group, key), candidate.idToken)]);
      for (const result of results) assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.deepEqual(new Set(results.map((result) => result.body.result.request.id)).size, 1); assert.deepEqual(new Set(results.map((result) => result.body.result.outcome)), new Set(["CREATED_PENDING", "EXISTING_PENDING"]));
      firstId = await registerCreated(results[0], candidate, key);
      const conflict = await call("createMyGroupJoinRequest", command(ids.otherGroup, key), candidate.idToken); assert.equal(conflict.body.error.details.reason, "IDEMPOTENCY_CONFLICT");
      const requestDoc = (await db.collection("groupJoinRequests").doc(firstId).get()).data(); const guard = (await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(ids.group, ids.candidatePerson)).get()).data(); const intent = (await db.collection("groupJoinRequestIntents").doc(groupJoinRequestIntentId(candidate.uid, key)).get()).data();
      assert.deepEqual(Object.keys(requestDoc).sort(), ["createdAt", "estado", "groupId", "personId", "schemaVersion"]); assert.deepEqual(Object.keys(guard).sort(), ["createdAt", "groupId", "guardVersion", "personId", "requestId"]); assert.deepEqual(Object.keys(intent).sort(), ["createdAt", "groupId", "intentVersion", "personId", "requestHash", "requestId"]); assert.equal(requestDoc.createdAt.isEqual(guard.createdAt) && guard.createdAt.isEqual(intent.createdAt), true); assert.equal(JSON.stringify(intent).includes(key), false);
    });

    await t.test("actores distintos y respuesta perdida recuperan sin colisión", async () => {
      const sharedKey = "e2-06-shared-actor-key";
      const [actorA, actorB] = await Promise.all([call("createMyGroupJoinRequest", command(ids.actorGroupA, sharedKey), candidate.idToken), call("createMyGroupJoinRequest", command(ids.actorGroupB, sharedKey), candidateTwo.idToken)]);
      assert.equal(actorA.status, 200); assert.equal(actorB.status, 200);
      const actorAId = await registerCreated(actorA, candidate, sharedKey); const actorBId = await registerCreated(actorB, candidateTwo, sharedKey);
      assert.notEqual(actorAId, actorBId); assert.notEqual(groupJoinRequestIntentId(candidate.uid, sharedKey), groupJoinRequestIntentId(candidateTwo.uid, sharedKey));
      const lostKey = "e2-06-lost-response-key";
      const lostResponse = await call("createMyGroupJoinRequest", command(ids.recoveryGroup, lostKey), candidate.idToken); const lostId = await registerCreated(lostResponse, candidate, lostKey);
      const recovered = await call("createMyGroupJoinRequest", command(ids.recoveryGroup, lostKey), candidate.idToken);
      assert.equal(recovered.body.result.outcome, "EXISTING_PENDING"); assert.equal(recovered.body.result.request.id, lostId);
      const authoritative = await db.collection("groupJoinRequests").where("personId", "==", ids.candidatePerson).where("groupId", "==", ids.recoveryGroup).where("estado", "==", "pendiente").limit(2).get(); assert.equal(authoritative.size, 1);
    });

    await t.test("cancelación contra retry y nueva intención convergen", async () => {
      const oldKey = "e2-06-cancel-race-old"; const created = await call("createMyGroupJoinRequest", command(ids.cancelRaceGroup, oldKey), candidate.idToken); const requestId = await registerCreated(created, candidate, oldKey);
      const [cancelled, retry] = await Promise.all([call("cancelMyGroupJoinRequest", { groupId: ids.cancelRaceGroup, requestId }, candidate.idToken), call("createMyGroupJoinRequest", command(ids.cancelRaceGroup, oldKey), candidate.idToken)]);
      assert.equal(cancelled.status, 200); assert.equal(retry.status, 200); assert.ok(["EXISTING_PENDING", "EXISTING_CANCELLED"].includes(retry.body.result.outcome));
      const newKey = "e2-06-cancel-race-new"; const next = await call("createMyGroupJoinRequest", command(ids.cancelRaceGroup, newKey), candidate.idToken);
      assert.equal(next.body.result.outcome, "CREATED_PENDING"); await registerCreated(next, candidate, newKey);
      const pending = await db.collection("groupJoinRequests").where("personId", "==", ids.candidatePerson).where("groupId", "==", ids.cancelRaceGroup).where("estado", "==", "pendiente").limit(2).get(); assert.equal(pending.size, 1);
    });

    await t.test("Membresía coordinada gana antes de crear Solicitud", async () => {
      const membershipId = "e2-06-racing-membership"; const guardId = activeMembershipGuardId(ids.membershipRaceGroup, ids.memberPerson); const at = admin.firestore.Timestamp.now();
      fixtures.register(db.collection("memberships").doc(membershipId)); fixtures.register(db.collection("activeMembershipGuards").doc(guardId));
      const membershipCommit = db.runTransaction(async (transaction) => {
        transaction.create(db.collection("memberships").doc(membershipId), { personId: ids.memberPerson, groupId: ids.membershipRaceGroup, seasonId: "e2-06-racing-season", estado: "activa", fechaIngreso: at, createdAt: at, schemaVersion: 1 });
        transaction.create(db.collection("activeMembershipGuards").doc(guardId), { membershipId, personId: ids.memberPerson, groupId: ids.membershipRaceGroup, seasonId: "e2-06-racing-season", idempotencyKeyHash: "f".repeat(64), requestHash: "a".repeat(64), createdAt: at, guardVersion: 1 });
      });
      const [, result] = await Promise.all([membershipCommit, membershipCommit.then(() => call("createMyGroupJoinRequest", command(ids.membershipRaceGroup, "e2-06-membership-race-key"), member.idToken))]);
      assert.equal(result.body.error.details.reason, "ACTIVE_MEMBERSHIP_EXISTS");
      const requests = await db.collection("groupJoinRequests").where("personId", "==", ids.memberPerson).where("groupId", "==", ids.membershipRaceGroup).limit(1).get(); assert.equal(requests.empty, true);
    });

    await t.test("flujo no altera otros Agregados", async () => {
      const protectedRefs = [db.collection("groups").doc(ids.sideEffectGroup), db.collection("users").doc(candidate.uid), db.collection("personas").doc(ids.candidatePerson), db.collection("memberships").doc(memberMembershipId)];
      const beforeData = (await db.getAll(...protectedRefs)).map((snapshot) => snapshot.data());
      const protectedQueries = [db.collection("seasons"), db.collection("activities"), db.collection("notifications"), db.collectionGroup("pendingAlerts")];
      const beforeCounts = await Promise.all(protectedQueries.map((query) => query.count().get().then((snapshot) => snapshot.data().count)));
      await call("getKnownGroupJoinPreview", { groupId: ids.sideEffectGroup }, candidate.idToken);
      const created = await call("createMyGroupJoinRequest", command(ids.sideEffectGroup, "e2-06-side-effect-key"), candidate.idToken); const requestId = await registerCreated(created, candidate, "e2-06-side-effect-key");
      await call("cancelMyGroupJoinRequest", { groupId: ids.sideEffectGroup, requestId }, candidate.idToken);
      assert.deepEqual((await db.getAll(...protectedRefs)).map((snapshot) => snapshot.data()), beforeData);
      assert.deepEqual(await Promise.all(protectedQueries.map((query) => query.count().get().then((snapshot) => snapshot.data().count))), beforeCounts);
    });

    await t.test("consulta/listado son mínimos y cancelación conserva historia e intent", async () => {
      const current = await call("getMyCurrentGroupJoinRequest", { groupId: ids.group }, candidate.idToken); assert.equal(current.body.result.request.id, firstId); assert.equal(Object.hasOwn(current.body.result.request, "personId"), false);
      const listed = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group, pageSize: 1 }, owner.idToken); assert.deepEqual(listed.body.result.items[0].person, { firstName: "Ana", lastName: "Pérez" }); assert.equal(JSON.stringify(listed.body).includes(candidate.email), false); assert.equal(JSON.stringify(listed.body).includes(ids.candidatePerson), false);
      const cancellations = await Promise.all([call("cancelMyGroupJoinRequest", { groupId: ids.group, requestId: firstId }, candidate.idToken), call("cancelMyGroupJoinRequest", { groupId: ids.group, requestId: firstId }, candidate.idToken)]);
      assert.deepEqual(new Set(cancellations.map((result) => result.body.result.outcome)), new Set(["CANCELLED", "ALREADY_CANCELLED"]));
      assert.equal((await db.collection("groupJoinRequests").doc(firstId).get()).data().estado, "cancelada"); assert.equal((await db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(ids.group, ids.candidatePerson)).get()).exists, false); assert.equal((await db.collection("groupJoinRequestIntents").doc(groupJoinRequestIntentId(candidate.uid, "e2-06-key-000000000001")).get()).exists, true);
      const noCurrent = await call("getMyCurrentGroupJoinRequest", { groupId: ids.group }, candidate.idToken); assert.deepEqual(noCurrent.body.result, { request: null });
      const retry = await call("createMyGroupJoinRequest", command(ids.group), candidate.idToken); assert.equal(retry.body.result.outcome, "EXISTING_CANCELLED");
    });

    await t.test("dos claves distintas para la misma Persona–Grupo dejan una sola pendiente", async () => {
      const keys = ["e2-06-race-key-000001", "e2-06-race-key-000002"];
      const results = await Promise.all(keys.map((key) => call("createMyGroupJoinRequest", command(ids.raceGroup, key), candidateTwo.idToken)));
      const createdIndex = results.findIndex((result) => result.body?.result?.outcome === "CREATED_PENDING");
      assert.notEqual(createdIndex, -1); assert.equal(results.filter((result) => result.body?.error?.details?.reason === "REQUEST_ALREADY_PENDING").length, 1);
      const requestId = await registerCreated(results[createdIndex], candidateTwo, keys[createdIndex]);
      const pending = await db.collection("groupJoinRequests").where("personId", "==", ids.candidateTwoPerson).where("groupId", "==", ids.raceGroup).where("estado", "==", "pendiente").limit(2).get(); assert.equal(pending.size, 1);
      const cancelled = await call("cancelMyGroupJoinRequest", { groupId: ids.raceGroup, requestId }, candidateTwo.idToken); assert.equal(cancelled.body.result.outcome, "CANCELLED");
    });

    await t.test("nueva intención, paginación y timestamps iguales usan requestId DESC", async () => {
      const keyA = "e2-06-key-000000000002"; const keyB = "e2-06-key-000000000003";
      const [a, b] = await Promise.all([call("createMyGroupJoinRequest", command(ids.group, keyA), candidate.idToken), call("createMyGroupJoinRequest", command(ids.group, keyB), candidateTwo.idToken)]);
      const idA = await registerCreated(a, candidate, keyA); const idB = await registerCreated(b, candidateTwo, keyB); assert.notEqual(idA, firstId);
      const same = admin.firestore.Timestamp.fromMillis(1893456000000); await Promise.all([db.collection("groupJoinRequests").doc(idA).update({ createdAt: same }), db.collection("groupJoinRequests").doc(idB).update({ createdAt: same }), db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(ids.group, ids.candidatePerson)).update({ createdAt: same }), db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(ids.group, ids.candidateTwoPerson)).update({ createdAt: same })]);
      const page1 = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group, pageSize: 1 }, owner.idToken); assert.equal(page1.body.result.items.length, 1); assert.ok(page1.body.result.nextCursor); const page2 = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group, pageSize: 1, cursor: page1.body.result.nextCursor }, owner.idToken); assert.equal(page2.body.result.items.length, 1); assert.notEqual(page1.body.result.items[0].id, page2.body.result.items[0].id); assert.equal(page1.body.result.items[0].id > page2.body.result.items[0].id, true);
      const page2PersonId = page2.body.result.items[0].id === idA ? ids.candidatePerson : ids.candidateTwoPerson; const disappearance = db.batch(); disappearance.update(db.collection("groupJoinRequests").doc(page2.body.result.items[0].id), { estado: "cancelada", cancelledAt: admin.firestore.Timestamp.now() }); disappearance.delete(db.collection("pendingGroupJoinRequestGuards").doc(pendingGroupJoinRequestGuardId(ids.group, page2PersonId))); await disappearance.commit();
      const laterEmpty = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group, pageSize: 1, cursor: page1.body.result.nextCursor }, owner.idToken); assert.deepEqual(laterEmpty.body.result, { items: [], nextCursor: null });
      const invalid = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.otherGroup, cursor: page1.body.result.nextCursor }, owner.idToken); assert.equal(invalid.body.error.details.reason, "VALIDATION_FAILED");
      const empty = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.otherGroup }, owner.idToken); assert.deepEqual(empty.body.result, { items: [], nextCursor: null });
      await db.collection("groups").doc(ids.group).update({ ownerId: candidateTwo.uid });
      const [formerOwner, currentOwner] = await Promise.all([call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group }, owner.idToken), call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group }, candidateTwo.idToken)]);
      assert.equal(formerOwner.body.error.details.reason, "NOT_AUTHORIZED"); assert.equal(currentOwner.status, 200); await db.collection("groups").doc(ids.group).update({ ownerId: owner.uid });
      const remainingPersonId = page1.body.result.items[0].id === idA ? ids.candidatePerson : ids.candidateTwoPerson; const remainingActor = remainingPersonId === ids.candidatePerson ? candidate : candidateTwo;
      await db.collection("personas").doc(remainingPersonId).update({ incompatibleField: true });
      const incompatiblePerson = await call("listPendingGroupJoinRequestsForOwnedGroup", { groupId: ids.group }, owner.idToken); assert.equal(incompatiblePerson.body.error.details.reason, "INCOMPATIBLE_STATE");
      await db.collection("personas").doc(remainingPersonId).set(person(remainingPersonId === ids.candidatePerson ? "Ana" : "Beto", remainingPersonId === ids.candidatePerson ? "Pérez" : "López", remainingActor.email));
    });

    await t.test("huérfanos y duplicados autoritativos fallan cerrados", async () => {
      const orphanId = "e2-06-orphan"; fixtures.register(db.collection("groupJoinRequests").doc(orphanId)); await db.collection("groupJoinRequests").doc(orphanId).set({ personId: ids.adminPerson, groupId: ids.group, estado: "pendiente", createdAt: new Date(), schemaVersion: 1 });
      const orphan = await call("getMyCurrentGroupJoinRequest", { groupId: ids.group }, globalAdmin.idToken); assert.equal(orphan.body.error.details.reason, "INCOMPATIBLE_STATE");
      const orphanGuardId = pendingGroupJoinRequestGuardId(ids.otherGroup, ids.ownerPerson); fixtures.register(db.collection("pendingGroupJoinRequestGuards").doc(orphanGuardId)); await db.collection("pendingGroupJoinRequestGuards").doc(orphanGuardId).set({ requestId: "e2-06-missing", personId: ids.ownerPerson, groupId: ids.otherGroup, createdAt: admin.firestore.Timestamp.now(), guardVersion: 1 });
      const orphanGuard = await call("getMyCurrentGroupJoinRequest", { groupId: ids.otherGroup }, owner.idToken); assert.equal(orphanGuard.body.error.details.reason, "INCOMPATIBLE_STATE");
      const badKey = "e2-06-incompatible-intent", badIntentId = groupJoinRequestIntentId(candidateTwo.uid, badKey), atIntent = admin.firestore.Timestamp.now(); fixtures.register(db.collection("groupJoinRequestIntents").doc(badIntentId)); await db.collection("groupJoinRequestIntents").doc(badIntentId).set({ requestId: "e2-06-missing", personId: ids.candidateTwoPerson, groupId: ids.otherGroup, requestHash: "c".repeat(64), createdAt: atIntent, intentVersion: 1, unexpected: true });
      const badIntent = await call("createMyGroupJoinRequest", command(ids.otherGroup, badKey), candidateTwo.idToken); assert.equal(badIntent.body.error.details.reason, "INCOMPATIBLE_STATE"); await db.collection("groupJoinRequestIntents").doc(badIntentId).delete();
      const futureId = "e2-06-future-state"; fixtures.register(db.collection("groupJoinRequests").doc(futureId)); await db.collection("groupJoinRequests").doc(futureId).set({ personId: ids.candidatePerson, groupId: ids.otherGroup, estado: "aprobada", createdAt: admin.firestore.Timestamp.now(), schemaVersion: 2 });
      const future = await call("cancelMyGroupJoinRequest", { groupId: ids.otherGroup, requestId: futureId }, candidate.idToken); assert.equal(future.body.error.details.reason, "INCOMPATIBLE_STATE");
      const duplicateA = "e2-06-duplicate-a", duplicateB = "e2-06-duplicate-b", duplicateGuard = pendingGroupJoinRequestGuardId(ids.otherGroup, ids.candidateTwoPerson), at = admin.firestore.Timestamp.now();
      for (const id of [duplicateA, duplicateB]) { fixtures.register(db.collection("groupJoinRequests").doc(id)); await db.collection("groupJoinRequests").doc(id).set({ personId: ids.candidateTwoPerson, groupId: ids.otherGroup, estado: "pendiente", createdAt: at, schemaVersion: 1 }); }
      fixtures.register(db.collection("pendingGroupJoinRequestGuards").doc(duplicateGuard)); await db.collection("pendingGroupJoinRequestGuards").doc(duplicateGuard).set({ requestId: duplicateA, personId: ids.candidateTwoPerson, groupId: ids.otherGroup, createdAt: at, guardVersion: 1 });
      const duplicate = await call("getMyCurrentGroupJoinRequest", { groupId: ids.otherGroup }, candidateTwo.idToken); assert.equal(duplicate.body.error.details.reason, "INCOMPATIBLE_STATE");
    });

    await t.test("reglas deniegan get y write de las colecciones de Solicitud a todos los actores", async () => {
      for (const collection of ["groupJoinRequests", "pendingGroupJoinRequestGuards", "groupJoinRequestIntents", "groupJoinRequestDecisionIntents", "groupJoinRequestApprovalCoordinations"]) for (const token of [undefined, candidate.idToken, owner.idToken, member.idToken, globalAdmin.idToken]) {
        assert.equal(await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `${collection}/forbidden`, token), 403);
        assert.equal(await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, collection, token), 403);
        assert.equal(await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, collection, token, "POST"), 403);
        assert.equal(await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `${collection}/forbidden`, token, "PATCH"), 403);
        assert.equal(await firestore(process.env.FIRESTORE_EMULATOR_HOST, projectId, `${collection}/forbidden`, token, "DELETE"), 403);
      }
    });
  } finally {
    await fixtures.cleanup(); await auth.deleteUsers([owner.uid, candidate.uid, candidateTwo.uid, member.uid, globalAdmin.uid]); await app.delete();
  }
});
