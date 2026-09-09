"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createFirestoreFixtureRegistry } = require("../helpers/firestoreFixtureRegistry");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) {
  const value = await response.text();
  return value ? JSON.parse(value) : null;
}

async function signUp(host, label) {
  const response = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-08-synthetic-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `e2-08-${label}@example.invalid`,
        password: "E2-08-synthetic-password!",
        returnSecureToken: true,
      }),
    }
  );
  const body = await json(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
}

async function api(host, projectId, path, { token, method = "POST" } = {}) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/api${path}`, {
    method,
    headers: {
      Origin: "http://127.0.0.1:3000",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return { status: response.status, body: await json(response) };
}

async function waitForTrigger() {
  await new Promise((resolve) => setTimeout(resolve, 750));
}

test("E2-08 retira ingreso legacy sin alterar las capacidades preservadas", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-08-legacy-join-retirement");
  const db = app.firestore();
  const fixtures = createFirestoreFixtureRegistry(db);
  const [owner, member, pending, outsider, adminCandidate] = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "owner"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "member"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "pending"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "outsider"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "admin-candidate"),
  ]);
  const groupId = "e2-08-legacy-group";
  const triggerGroupId = "e2-08-trigger-group";
  const groupRef = db.collection("groups").doc(groupId);
  const triggerGroupRef = db.collection("groups").doc(triggerGroupId);
  const call = (path, options) => api(process.env.FUNCTIONS_EMULATOR_HOST, projectId, path, options);

  try {
    for (const [actor, name, roles] of [
      [owner, "Owner", null],
      [member, "Member", null],
      [pending, "Pending", null],
      [outsider, "Outsider", null],
      [adminCandidate, "Admin Candidate", "admin"],
    ]) {
      await fixtures.set(db.collection("users").doc(actor.uid), {
        nombre: name,
        photoURL: "",
        ...(roles ? { roles } : {}),
      });
    }

    await fixtures.set(groupRef, {
      nombre: "Grupo legacy E2-08",
      descripcion: "Fixture local",
      visibility: "public",
      activo: true,
      joinApproval: true,
      ownerId: owner.uid,
      adminIds: [owner.uid],
      admins: [{ userId: owner.uid, role: "owner", order: 0 }],
      memberIds: [owner.uid, member.uid],
      pendingRequestIds: [pending.uid],
      pendingAdminRequestIds: [adminCandidate.uid],
    });

    await t.test("listado y detalle omiten solicitudes por arrays y conservan las administrativas", async () => {
      const [listed, detail] = await Promise.all([
        call("/groups/public", { token: pending.idToken, method: "GET" }),
        call(`/groups/${groupId}/public`, { token: owner.idToken, method: "GET" }),
      ]);
      assert.equal(listed.status, 200, JSON.stringify(listed.body));
      assert.equal(listed.body.groups[0].membershipStatus, "none");
      assert.equal(detail.status, 200, JSON.stringify(detail.body));
      assert.equal(Object.hasOwn(detail.body.group, "pendingRequests"), false);
      assert.equal(Object.hasOwn(detail.body.group, "pendingRequestIds"), false);
      assert.deepEqual(detail.body.group.pendingAdminRequestIds, [adminCandidate.uid]);
      assert.deepEqual(detail.body.group.pendingAdminRequests.map((item) => item.id), [adminCandidate.uid]);
    });

    await t.test("decisiones retiradas y /join para no integrantes responden 404 sin efectos", async () => {
      const protectedCollections = [
        "groupJoinRequests",
        "memberships",
        "pendingGroupJoinRequestGuards",
        "groupJoinRequestIntents",
        "groupJoinRequestDecisionIntents",
        "groupJoinRequestApprovalCoordinations",
        "activities",
        "notifications",
      ];
      const beforeGroup = (await groupRef.get()).data();
      const beforeCounts = await Promise.all(
        protectedCollections.map((name) => db.collection(name).count().get().then((snap) => snap.data().count))
      );
      const calls = await Promise.all([
        call(`/groups/${groupId}/requests/${pending.uid}/approve`, { token: owner.idToken }),
        call(`/groups/${groupId}/requests/${pending.uid}/reject`, { token: owner.idToken }),
        call(`/groups/${groupId}/join`),
        call(`/groups/${groupId}/join`, { token: outsider.idToken }),
        call(`/groups/${groupId}/join`, { token: pending.idToken }),
        ...Array.from({ length: 3 }, () => call(`/groups/${groupId}/requests/${pending.uid}/approve`, { token: owner.idToken })),
      ]);
      for (const result of calls) {
        assert.equal(result.status, 404, JSON.stringify(result.body));
        assert.deepEqual(result.body, { error: "Not found" });
      }
      assert.deepEqual((await groupRef.get()).data(), beforeGroup);
      const afterCounts = await Promise.all(
        protectedCollections.map((name) => db.collection(name).count().get().then((snap) => snap.data().count))
      );
      assert.deepEqual(afterCounts, beforeCounts);
    });

    await t.test("/join conserva la salida legacy sin tocar solicitudes históricas", async () => {
      const result = await call(`/groups/${groupId}/join`, { token: member.idToken });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.membershipStatus, "none");
      assert.equal(Object.hasOwn(result.body, "pendingRequestIds"), false);
      const group = (await groupRef.get()).data();
      assert.equal(group.memberIds.includes(member.uid), false);
      assert.deepEqual(group.pendingRequestIds, [pending.uid]);
    });

    await t.test("alta separada y solicitudes administrativas siguen operativas", async () => {
      const added = await call(`/groups/${groupId}/members/${pending.uid}/add`, { token: owner.idToken });
      assert.equal(added.status, 200, JSON.stringify(added.body));
      let group = (await groupRef.get()).data();
      assert.equal(group.memberIds.includes(pending.uid), true);
      assert.deepEqual(group.pendingRequestIds, []);

      const removalAlertRef = db
        .collection("users")
        .doc(pending.uid)
        .collection("pendingAlerts")
        .doc(`group_membership_result_${groupId}`);
      fixtures.register(removalAlertRef);
      const removed = await call(`/groups/${groupId}/members/${pending.uid}/remove`, { token: owner.idToken });
      assert.equal(removed.status, 200, JSON.stringify(removed.body));
      const removalAlert = (await removalAlertRef.get()).data();
      assert.equal(removalAlert.kind, "group_membership_result");
      assert.equal(removalAlert.meta.decision, "removed");
      assert.equal(removalAlert.link, null);

      const approved = await call(
        `/groups/${groupId}/admin-requests/${adminCandidate.uid}/approve`,
        { token: owner.idToken }
      );
      assert.equal(approved.status, 200, JSON.stringify(approved.body));
      group = (await groupRef.get()).data();
      assert.equal(group.adminIds.includes(adminCandidate.uid), true);
      assert.equal(group.pendingAdminRequestIds.includes(adminCandidate.uid), false);
    });

    await t.test("cambiar pendingRequestIds no crea alertas ni borra históricos", async () => {
      await fixtures.set(triggerGroupRef, {
        nombre: "Trigger E2-08",
        visibility: "public",
        activo: true,
        ownerId: owner.uid,
        adminIds: [owner.uid],
        admins: [{ userId: owner.uid, role: "owner", order: 0 }],
        memberIds: [owner.uid],
        pendingRequestIds: [],
        pendingAdminRequestIds: [],
      });
      await waitForTrigger();
      const alerts = db.collection("users").doc(owner.uid).collection("pendingAlerts");
      const historical = [
        ["group_join_requests_pending_historical", "group_join_requests_pending", {}],
        ["group_membership_result_accepted", "group_membership_result", { decision: "accepted" }],
        ["group_membership_result_removed", "group_membership_result", { decision: "removed" }],
      ];
      for (const [id, kind, meta] of historical) {
        const ref = alerts.doc(id);
        await fixtures.set(ref, { kind, status: "active", meta });
      }
      const beforeIds = (await alerts.get()).docs.map((doc) => doc.id).sort();
      await triggerGroupRef.update({ pendingRequestIds: [outsider.uid] });
      await waitForTrigger();
      const after = await alerts.get();
      assert.deepEqual(after.docs.map((doc) => doc.id).sort(), beforeIds);
      for (const [id] of historical) assert.equal((await alerts.doc(id).get()).exists, true);
      assert.deepEqual((await triggerGroupRef.get()).data().pendingRequestIds, [outsider.uid]);
    });
  } finally {
    await fixtures.cleanup();
    await app.delete();
  }
});
