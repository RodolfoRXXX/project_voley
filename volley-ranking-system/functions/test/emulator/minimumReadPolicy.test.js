"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertSafeFirebaseTestEnvironment,
} = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
}

async function signUp(authHost, label) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e0-04-synthetic-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `e0-04-${label}@example.invalid`,
        password: "E0-04-synthetic-password!",
        returnSecureToken: true,
      }),
    }
  );
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
}

function firestoreUrl(host, projectId, suffix) {
  return `http://${host}/v1/projects/${projectId}/databases/(default)/documents${suffix}`;
}

async function getDocument({ host, projectId, path, idToken }) {
  const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
  const response = await fetch(firestoreUrl(host, projectId, `/${path}`), { headers });
  return { status: response.status, body: await readJson(response) };
}

async function listCollection({ host, projectId, collectionId, idToken }) {
  const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
  const response = await fetch(
    firestoreUrl(host, projectId, `/${collectionId}?pageSize=100`),
    { headers }
  );
  return { status: response.status, body: await readJson(response) };
}

async function runQuery({ host, projectId, collectionId, field, op, value, idToken }) {
  const response = await fetch(firestoreUrl(host, projectId, ":runQuery"), {
    method: "POST",
    headers: {
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op,
            value: { stringValue: value },
          },
        },
      },
    }),
  });
  return { status: response.status, body: await readJson(response) };
}

async function patchRole({ host, projectId, uid, idToken }) {
  const response = await fetch(
    `${firestoreUrl(host, projectId, `/users/${uid}`)}?updateMask.fieldPaths=roles`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: { roles: { stringValue: "admin" } } }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

async function callPublicGroupsApi({ functionsHost, projectId, idToken }) {
  const response = await fetch(
    `http://${functionsHost}/${projectId}/us-central1/api/groups/public`,
    { headers: idToken ? { Authorization: `Bearer ${idToken}` } : {} }
  );
  return { status: response.status, body: await readJson(response) };
}

async function waitForUser(db, uid) {
  const ref = db.collection("users").doc(uid);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const snapshot = await ref.get();
    if (snapshot.exists) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Synthetic user document was not created: ${uid}`);
}

test("aplica privado por defecto y acceso contextual mínimo", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e0-04-minimum-read-policy");
  const db = app.firestore();
  const auth = app.auth();

  const [owner, member, outsider, appAdmin] = await Promise.all([
    signUp(authHost, "owner"),
    signUp(authHost, "member"),
    signUp(authHost, "outsider"),
    signUp(authHost, "app-admin"),
  ]);

  const ids = {
    publicGroup: "e0-04-public-group",
    privateGroup: "e0-04-private-group",
    publicMatch: "e0-04-public-match",
    privateMatch: "e0-04-private-match",
    ownerParticipation: "e0-04-owner-participation",
    memberParticipation: "e0-04-member-participation",
    team: "e0-04-team",
    stat: "e0-04-stat",
    tournament: "e0-04-tournament",
    registration: "e0-04-registration",
    tournamentTeam: "e0-04-tournament-team",
    phase: "e0-04-phase",
    tournamentMatch: "e0-04-tournament-match",
    standing: "e0-04-standing",
    advancement: "e0-04-advancement",
  };
  const refs = [];

  try {
    await Promise.all([
      waitForUser(db, owner.uid),
      waitForUser(db, member.uid),
      waitForUser(db, outsider.uid),
      waitForUser(db, appAdmin.uid),
    ]);
    await db.collection("users").doc(appAdmin.uid).update({ roles: "admin" });

    const add = (collectionId, documentId, data) => {
      const ref = db.collection(collectionId).doc(documentId);
      refs.push(ref);
      return ref.set({ ...data, fixture: "synthetic-e0-04" });
    };

    await Promise.all([
      add("groups", ids.publicGroup, {
        nombre: "Grupo público sintético",
        descripcion: "Proyección pública aprobada",
        visibility: "public",
        activo: true,
        ownerId: owner.uid,
        adminIds: [owner.uid],
        admins: [{ userId: owner.uid, role: "owner", order: 0 }],
        memberIds: [owner.uid, member.uid],
        pendingRequestIds: [outsider.uid],
        pendingAdminRequestIds: [],
        joinApproval: true,
      }),
      add("groups", ids.privateGroup, {
        nombre: "Grupo privado sintético",
        descripcion: "Interno",
        visibility: "private",
        activo: true,
        ownerId: owner.uid,
        adminIds: [owner.uid],
        admins: [{ userId: owner.uid, role: "owner", order: 0 }],
        memberIds: [owner.uid, member.uid],
        pendingRequestIds: [],
      }),
      add("matches", ids.publicMatch, {
        groupId: ids.publicGroup,
        visibility: "public",
        estado: "abierto",
        deadlineStage: 0,
        lock: false,
      }),
      add("matches", ids.privateMatch, {
        groupId: ids.privateGroup,
        visibility: "group_only",
        estado: "abierto",
        deadlineStage: 0,
        lock: false,
      }),
      add("participations", ids.ownerParticipation, {
        matchId: ids.publicMatch,
        userId: owner.uid,
        estado: "titular",
        pagoEstado: "confirmado",
        puntaje: 10,
      }),
      add("participations", ids.memberParticipation, {
        matchId: ids.publicMatch,
        userId: member.uid,
        estado: "titular",
        pagoEstado: "pendiente",
        puntaje: 8,
      }),
      add("teams", ids.team, {
        matchId: ids.publicMatch,
        groupId: ids.publicGroup,
        equipos: [{ nombre: "Equipo sintético", jugadores: [member.uid] }],
      }),
      add("groupStats", ids.stat, {
        groupId: ids.publicGroup,
        userId: member.uid,
        partidosJugados: 1,
      }),
      add("tournaments", ids.tournament, {
        name: "Torneo sintético",
        status: "activo",
        ownerAdminId: owner.uid,
        adminIds: [owner.uid],
        paymentForPlayer: 100,
      }),
      add("tournamentRegistrations", ids.registration, {
        tournamentId: ids.tournament,
        groupId: ids.publicGroup,
        playerIds: [member.uid],
        status: "aceptado",
        paymentStatus: "parcial",
        expectedAmount: 100,
        paidAmount: 50,
      }),
      add("tournamentTeams", ids.tournamentTeam, {
        tournamentId: ids.tournament,
        groupId: ids.publicGroup,
        playerIds: [member.uid],
        status: "aceptado",
        paymentStatus: "parcial",
      }),
      add("tournamentPhases", ids.phase, {
        tournamentId: ids.tournament,
        status: "active",
      }),
      add("tournamentMatches", ids.tournamentMatch, {
        tournamentId: ids.tournament,
        status: "scheduled",
      }),
      add("tournamentStandings", ids.standing, {
        tournamentId: ids.tournament,
        teamId: ids.tournamentTeam,
        points: 3,
      }),
      add("tournamentAdvancementRules", ids.advancement, {
        tournamentId: ids.tournament,
        rule: "synthetic",
      }),
    ]);

    await t.test("visitante no obtiene documentos directos aunque tengan marcador público", async () => {
      for (const path of [
        `users/${owner.uid}`,
        `groups/${ids.publicGroup}`,
        `groups/${ids.privateGroup}`,
        `matches/${ids.publicMatch}`,
        `matches/${ids.privateMatch}`,
        `participations/${ids.memberParticipation}`,
        `tournaments/${ids.tournament}`,
        `tournamentRegistrations/${ids.registration}`,
      ]) {
        const result = await getDocument({ host: firestoreHost, projectId, path });
        assert.equal(result.status, 403, `${path}: ${JSON.stringify(result.body)}`);
      }
    });

    await t.test("la proyección pública expone sólo grupos publicados y campos sanitizados", async () => {
      const visitor = await callPublicGroupsApi({ functionsHost, projectId });
      assert.equal(visitor.status, 200, JSON.stringify(visitor.body));
      assert.equal(visitor.body.groups.length, 1);
      const group = visitor.body.groups[0];
      assert.equal(group.id, ids.publicGroup);
      assert.equal(group.visibility, "public");
      assert.equal(group.membershipStatus, "none");
      assert.equal(group.membersCount, 2);
      for (const forbidden of [
        "owner",
        "ownerId",
        "memberIds",
        "adminIds",
        "pendingRequestIds",
        "pendingAdminRequestIds",
      ]) {
        assert.equal(Object.hasOwn(group, forbidden), false, forbidden);
      }

      const authenticated = await callPublicGroupsApi({
        functionsHost,
        projectId,
        idToken: outsider.idToken,
      });
      assert.equal(authenticated.status, 200, JSON.stringify(authenticated.body));
      assert.equal(authenticated.body.groups[0].membershipStatus, "pending");
      assert.equal(Object.hasOwn(authenticated.body.groups[0], "pendingRequestIds"), false);
    });

    await t.test("identidad propia es legible y la identidad ajena permanece privada", async () => {
      const own = await getDocument({
        host: firestoreHost,
        projectId,
        path: `users/${member.uid}`,
        idToken: member.idToken,
      });
      const other = await getDocument({
        host: firestoreHost,
        projectId,
        path: `users/${owner.uid}`,
        idToken: member.idToken,
      });
      assert.equal(own.status, 200, JSON.stringify(own.body));
      assert.equal(other.status, 403, JSON.stringify(other.body));
    });

    await t.test("owner e integrante leen el grupo y partido; un usuario ajeno no", async () => {
      for (const actor of [owner, member]) {
        for (const path of [
          `groups/${ids.publicGroup}`,
          `groups/${ids.privateGroup}`,
          `matches/${ids.publicMatch}`,
          `matches/${ids.privateMatch}`,
        ]) {
          const result = await getDocument({
            host: firestoreHost,
            projectId,
            path,
            idToken: actor.idToken,
          });
          assert.equal(result.status, 200, `${path}: ${JSON.stringify(result.body)}`);
        }
      }

      for (const path of [
        `groups/${ids.publicGroup}`,
        `groups/${ids.privateGroup}`,
        `matches/${ids.publicMatch}`,
        `matches/${ids.privateMatch}`,
      ]) {
        const denied = await getDocument({
          host: firestoreHost,
          projectId,
          path,
          idToken: outsider.idToken,
        });
        assert.equal(denied.status, 403, `${path}: ${JSON.stringify(denied.body)}`);
      }
    });

    await t.test("pagos y rendimiento se limitan al interesado o administrador contextual", async () => {
      const ownParticipation = await getDocument({
        host: firestoreHost,
        projectId,
        path: `participations/${ids.memberParticipation}`,
        idToken: member.idToken,
      });
      const anotherParticipation = await getDocument({
        host: firestoreHost,
        projectId,
        path: `participations/${ids.ownerParticipation}`,
        idToken: member.idToken,
      });
      const adminParticipation = await getDocument({
        host: firestoreHost,
        projectId,
        path: `participations/${ids.memberParticipation}`,
        idToken: owner.idToken,
      });
      const ownStat = await getDocument({
        host: firestoreHost,
        projectId,
        path: `groupStats/${ids.stat}`,
        idToken: member.idToken,
      });
      const outsiderStat = await getDocument({
        host: firestoreHost,
        projectId,
        path: `groupStats/${ids.stat}`,
        idToken: outsider.idToken,
      });
      assert.equal(ownParticipation.status, 200);
      assert.equal(anotherParticipation.status, 403);
      assert.equal(adminParticipation.status, 200);
      assert.equal(ownStat.status, 200);
      assert.equal(outsiderStat.status, 403);
    });

    await t.test("torneos y pagos usan administración, grupo o participación comprobable", async () => {
      const tournamentOwner = await getDocument({
        host: firestoreHost,
        projectId,
        path: `tournaments/${ids.tournament}`,
        idToken: owner.idToken,
      });
      const tournamentPlayer = await getDocument({
        host: firestoreHost,
        projectId,
        path: `tournaments/${ids.tournament}`,
        idToken: member.idToken,
      });
      const registrationOwner = await getDocument({
        host: firestoreHost,
        projectId,
        path: `tournamentRegistrations/${ids.registration}`,
        idToken: owner.idToken,
      });
      const registrationPlayer = await getDocument({
        host: firestoreHost,
        projectId,
        path: `tournamentRegistrations/${ids.registration}`,
        idToken: member.idToken,
      });
      const registrationOutsider = await getDocument({
        host: firestoreHost,
        projectId,
        path: `tournamentRegistrations/${ids.registration}`,
        idToken: outsider.idToken,
      });
      assert.equal(tournamentOwner.status, 200);
      assert.equal(tournamentPlayer.status, 403);
      assert.equal(registrationOwner.status, 200);
      assert.equal(registrationPlayer.status, 200);
      assert.equal(registrationOutsider.status, 403);
    });

    await t.test("consultas de lista deben demostrar el mismo contexto", async () => {
      const visitorList = await listCollection({
        host: firestoreHost,
        projectId,
        collectionId: "groups",
      });
      const outsiderList = await listCollection({
        host: firestoreHost,
        projectId,
        collectionId: "groups",
        idToken: outsider.idToken,
      });
      const memberGroups = await runQuery({
        host: firestoreHost,
        projectId,
        collectionId: "groups",
        field: "memberIds",
        op: "ARRAY_CONTAINS",
        value: member.uid,
        idToken: member.idToken,
      });
      const ownParticipations = await runQuery({
        host: firestoreHost,
        projectId,
        collectionId: "participations",
        field: "userId",
        op: "EQUAL",
        value: member.uid,
        idToken: member.idToken,
      });
      const unsafeParticipationList = await listCollection({
        host: firestoreHost,
        projectId,
        collectionId: "participations",
        idToken: member.idToken,
      });
      const systemAdminUsers = await listCollection({
        host: firestoreHost,
        projectId,
        collectionId: "users",
        idToken: appAdmin.idToken,
      });
      assert.equal(visitorList.status, 403);
      assert.equal(outsiderList.status, 403);
      assert.equal(memberGroups.status, 200, JSON.stringify(memberGroups.body));
      assert.equal(ownParticipations.status, 200, JSON.stringify(ownParticipations.body));
      assert.equal(unsafeParticipationList.status, 403);
      assert.equal(systemAdminUsers.status, 200, JSON.stringify(systemAdminUsers.body));
    });

    await t.test("las protecciones de escritura de E0-03 permanecen activas", async () => {
      const result = await patchRole({
        host: firestoreHost,
        projectId,
        uid: member.uid,
        idToken: member.idToken,
      });
      assert.equal(result.status, 403, JSON.stringify(result.body));
    });
  } finally {
    await Promise.allSettled(refs.map((ref) => ref.delete()));
    await Promise.allSettled([
      db.collection("users").doc(owner.uid).delete(),
      db.collection("users").doc(member.uid).delete(),
      db.collection("users").doc(outsider.uid).delete(),
      db.collection("users").doc(appAdmin.uid).delete(),
      auth.deleteUser(owner.uid),
      auth.deleteUser(member.uid),
      auth.deleteUser(outsider.uid),
      auth.deleteUser(appAdmin.uid),
    ]);
    await app.delete();
  }
});
