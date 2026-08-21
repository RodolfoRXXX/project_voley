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
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e0-05-synthetic-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `e0-05-${label}@example.invalid`,
        password: "E0-05-synthetic-password!",
        returnSecureToken: true,
      }),
    }
  );
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
}

async function callFunction(functionsHost, projectId, name, data, idToken) {
  const response = await fetch(
    `http://${functionsHost}/${projectId}/us-central1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ data }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

function firestoreUrl(host, projectId, suffix) {
  return `http://${host}/v1/projects/${projectId}/databases/(default)/documents${suffix}`;
}

function stringArray(values) {
  return { arrayValue: { values: values.map((value) => ({ stringValue: value })) } };
}

async function createGroupFromClient({ host, projectId, groupId, actor, memberIds }) {
  const response = await fetch(
    firestoreUrl(host, projectId, `/groups?documentId=${encodeURIComponent(groupId)}`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${actor.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          nombre: { stringValue: `Grupo sintético ${groupId}` },
          descripcion: { stringValue: "Caracterización E0-05" },
          activo: { booleanValue: true },
          memberIds: stringArray(memberIds),
          admins: {
            arrayValue: {
              values: [{
                mapValue: {
                  fields: {
                    userId: { stringValue: actor.uid },
                    role: { stringValue: "owner" },
                    order: { integerValue: "0" },
                  },
                },
              }],
            },
          },
          ownerId: { stringValue: actor.uid },
          adminIds: stringArray([actor.uid]),
          visibility: { stringValue: "private" },
          joinApproval: { booleanValue: true },
          partidosTotales: { integerValue: "0" },
        },
      }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

async function updateRegistrationPlayers({
  host,
  projectId,
  registrationId,
  actor,
  playerIds,
  expectedAmount,
}) {
  const masks = [
    "playerIds",
    "teamMembersCount",
    "expectedAmount",
    "pendingAmount",
    "paymentStatus",
  ].map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const response = await fetch(
    `${firestoreUrl(host, projectId, `/tournamentRegistrations/${registrationId}`)}?${masks}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${actor.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          playerIds: stringArray(playerIds),
          teamMembersCount: { integerValue: String(playerIds.length) },
          expectedAmount: { integerValue: String(expectedAmount) },
          pendingAmount: { integerValue: String(expectedAmount) },
          paymentStatus: { stringValue: "pendiente" },
        },
      }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

async function deleteWhere(db, collectionId, predicate) {
  const snapshot = await db.collection(collectionId).get();
  await Promise.all(
    snapshot.docs
      .filter((document) => predicate(document.id, document.data()))
      .map((document) => document.ref.delete())
  );
}

test("caracteriza activos prioritarios sin convertir legados en contratos", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const adminSdk = require("firebase-admin");
  const app = adminSdk.initializeApp({ projectId }, "e0-05-priority-assets");
  const db = app.firestore();
  const auth = app.auth();
  const actors = await Promise.all([
    signUp(authHost, "admin"),
    signUp(authHost, "player-a"),
    signUp(authHost, "player-b"),
  ]);
  const [adminActor, playerA, playerB] = actors;
  const groupIds = ["e0-05-group-a", "e0-05-group-b"];
  let socialMatchId = null;
  let tournamentId = null;
  let phaseId = null;
  let tournamentMatchId = null;

  try {
    await t.test("[A/B] autenticación y bootstrap completan el alta sin conceder privilegios", async () => {
      for (const actor of actors) {
        const result = await callFunction(
          functionsHost,
          projectId,
          "ensureMyAccount",
          {},
          actor.idToken
        );
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(result.body?.result?.userId, actor.uid);
      }

      const playerDoc = (await db.collection("users").doc(playerA.uid).get()).data();
      assert.equal(playerDoc.onboarded, undefined);
      assert.equal(playerDoc.roles, undefined);
      assert.equal(playerDoc.posicionesPreferidas, undefined);
    });

    // Los siguientes casos caracterizan flujos deportivos legados. Sus fixtures
    // incorporan explícitamente los campos antiguos sin convertirlos en defaults
    // de las cuentas nuevas de E1-01.
    await Promise.all(
      actors.map((actor) => db.collection("users").doc(actor.uid).update({
        onboarded: true,
        posicionesPreferidas: ["central"],
      }))
    );

    await db.collection("users").doc(adminActor.uid).update({ roles: "admin" });

    await t.test("[B] un admin global sintético crea Grupos por la escritura directa legada", async () => {
      const groupA = await createGroupFromClient({
        host: firestoreHost,
        projectId,
        groupId: groupIds[0],
        actor: adminActor,
        memberIds: [adminActor.uid, playerA.uid],
      });
      const groupB = await createGroupFromClient({
        host: firestoreHost,
        projectId,
        groupId: groupIds[1],
        actor: adminActor,
        memberIds: [adminActor.uid, playerB.uid],
      });
      assert.equal(groupA.status, 200, JSON.stringify(groupA.body));
      assert.equal(groupB.status, 200, JSON.stringify(groupB.body));

      const denied = await createGroupFromClient({
        host: firestoreHost,
        projectId,
        groupId: "e0-05-forbidden-group",
        actor: playerA,
        memberIds: [playerA.uid],
      });
      assert.equal(denied.status, 403, JSON.stringify(denied.body));
      assert.equal((await db.collection("groups").doc("e0-05-forbidden-group").get()).exists, false);
    });

    await t.test("[B/C] Partido crea participación determinista y conserva pago embebido legado", async () => {
      const createResult = await callFunction(
        functionsHost,
        projectId,
        "createMatch",
        {
          groupId: groupIds[0],
          horaInicioMillis: Date.now() + 24 * 60 * 60 * 1000,
          cantidadEquipos: 2,
          formacion: "dos_centrales",
          cantidadSuplentes: 0,
          visibility: "group_only",
        },
        adminActor.idToken
      );
      assert.equal(createResult.status, 200, JSON.stringify(createResult.body));
      socialMatchId = createResult.body?.result?.matchId;
      assert.ok(socialMatchId);

      const joinResult = await callFunction(
        functionsHost,
        projectId,
        "joinMatch",
        { matchId: socialMatchId },
        playerA.idToken
      );
      assert.equal(joinResult.status, 200, JSON.stringify(joinResult.body));
      const participationId = `${socialMatchId}_${playerA.uid}`;
      assert.equal(joinResult.body?.result?.participationId, participationId);

      const participationRef = db.collection("participations").doc(participationId);
      const participation = (await participationRef.get()).data();
      assert.equal(participation.matchId, socialMatchId);
      assert.equal(participation.userId, playerA.uid);
      assert.equal(participation.estado, "pendiente");
      assert.equal(participation.pagoEstado, "pendiente");

      const paymentResult = await callFunction(
        functionsHost,
        projectId,
        "updatePagoEstado",
        { participationId, estado: "confirmado" },
        adminActor.idToken
      );
      assert.equal(paymentResult.status, 200, JSON.stringify(paymentResult.body));
      assert.equal((await participationRef.get()).data().pagoEstado, "confirmado");
    });

    await t.test("[B] Torneo crea fases y rechaza administración sin rol legado", async () => {
      const payload = {
        name: "Torneo sintético E0-05",
        description: "Caracterización reproducible",
        sport: "voley",
        format: "liga",
        maxTeams: 2,
        minTeams: 2,
        minPlayers: 1,
        maxPlayers: 6,
        startDateMillis: Date.now() + 7 * 24 * 60 * 60 * 1000,
        paymentForPlayer: 100,
        rules: { setsToWin: 2, pointsWin: 3, pointsDraw: 0, pointsLose: 0 },
      };

      const denied = await callFunction(
        functionsHost,
        projectId,
        "createTournament",
        payload,
        playerA.idToken
      );
      assert.notEqual(denied.status, 200);
      assert.equal(denied.body?.error?.status, "PERMISSION_DENIED");

      const created = await callFunction(
        functionsHost,
        projectId,
        "createTournament",
        payload,
        adminActor.idToken
      );
      assert.equal(created.status, 200, JSON.stringify(created.body));
      tournamentId = created.body?.result?.tournamentId;
      assert.ok(tournamentId);

      const tournament = (await db.collection("tournaments").doc(tournamentId).get()).data();
      assert.equal(tournament.status, "draft");
      assert.equal(tournament.ownerAdminId, adminActor.uid);
      assert.deepEqual(tournament.adminIds, [adminActor.uid]);

      const phases = await db.collection("tournamentPhases")
        .where("tournamentId", "==", tournamentId)
        .get();
      assert.deepEqual(
        phases.docs.map((document) => document.data().type).sort(),
        ["registration", "round_robin"]
      );
    });

    await t.test("[B/C] inscripción y pago deportivo permanecen embebidos y observables", async () => {
      const opened = await callFunction(
        functionsHost,
        projectId,
        "openTournamentRegistrations",
        { tournamentId },
        adminActor.idToken
      );
      assert.equal(opened.status, 200, JSON.stringify(opened.body));

      const registrations = [];
      for (const [index, groupId] of groupIds.entries()) {
        const requested = await callFunction(
          functionsHost,
          projectId,
          "requestTournamentRegistration",
          { tournamentId, groupId, nameTeam: `Equipo sintético ${index + 1}` },
          adminActor.idToken
        );
        assert.equal(requested.status, 200, JSON.stringify(requested.body));
        const registrationId = requested.body?.result?.registrationId;
        registrations.push(registrationId);

        const player = index === 0 ? playerA : playerB;
        const selected = await updateRegistrationPlayers({
          host: firestoreHost,
          projectId,
          registrationId,
          actor: adminActor,
          playerIds: [player.uid],
          expectedAmount: 100,
        });
        assert.equal(selected.status, 200, JSON.stringify(selected.body));

        const accepted = await callFunction(
          functionsHost,
          projectId,
          "reviewTournamentRegistration",
          {
            registrationId,
            status: "aceptado",
            paymentStatus: "pendiente",
            paidAmountInput: 0,
            source: "registration",
          },
          adminActor.idToken
        );
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
      }

      const payment = await callFunction(
        functionsHost,
        projectId,
        "updateTournamentRegistrationPayment",
        { registrationId: registrations[0], paidAmountToAdd: 40, source: "team" },
        adminActor.idToken
      );
      assert.equal(payment.status, 200, JSON.stringify(payment.body));
      const paidTeam = (await db.collection("tournamentTeams").doc(registrations[0]).get()).data();
      assert.equal(paidTeam.expectedAmount, 100);
      assert.equal(paidTeam.paidAmount, 40);
      assert.equal(paidTeam.pendingAmount, 60);
      assert.equal(paidTeam.paymentStatus, "parcial");
    });

    await t.test("[A/B] fixture confirmado persiste partidos y standings deterministas", async () => {
      const closed = await callFunction(
        functionsHost,
        projectId,
        "closeTournamentRegistrations",
        { tournamentId },
        adminActor.idToken
      );
      assert.equal(closed.status, 200, JSON.stringify(closed.body));
      const tournament = (await db.collection("tournaments").doc(tournamentId).get()).data();
      assert.equal(tournament.status, "inscripciones_cerradas");
      phaseId = tournament.currentPhaseId;

      const preview = await callFunction(
        functionsHost,
        projectId,
        "previewFixture",
        { tournamentId, phaseId, seed: 5005 },
        adminActor.idToken
      );
      assert.equal(preview.status, 200, JSON.stringify(preview.body));
      assert.equal(preview.body?.result?.seed, 5005);
      assert.equal(preview.body?.result?.matches?.length, 1);

      const confirmed = await callFunction(
        functionsHost,
        projectId,
        "confirmFixture",
        { tournamentId, phaseId, matches: preview.body.result.matches },
        adminActor.idToken
      );
      assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
      assert.equal(confirmed.body?.result?.matchesCount, 1);
      tournamentMatchId = preview.body.result.matches[0].id;

      const [match, standings] = await Promise.all([
        db.collection("tournamentMatches").doc(tournamentMatchId).get(),
        db.collection("tournamentStandings").where("phaseId", "==", phaseId).get(),
      ]);
      assert.equal(match.data().status, "scheduled");
      assert.equal(standings.size, 2);
    });

    await t.test("[C] resultado actualiza Partido, standings y fase en el flujo compartido actual", async () => {
      const started = await callFunction(
        functionsHost,
        projectId,
        "startTournament",
        { tournamentId },
        adminActor.idToken
      );
      assert.equal(started.status, 200, JSON.stringify(started.body));

      const matchBefore = (await db.collection("tournamentMatches").doc(tournamentMatchId).get()).data();
      const result = {
        homeSets: 2,
        awaySets: 0,
        homePoints: [25, 25],
        awayPoints: [18, 20],
        winnerId: matchBefore.homeTeamId,
      };
      const recorded = await callFunction(
        functionsHost,
        projectId,
        "recordMatchResult",
        { matchId: tournamentMatchId, result },
        adminActor.idToken
      );
      assert.equal(recorded.status, 200, JSON.stringify(recorded.body));
      assert.equal(recorded.body?.result?.phaseCompleted, true);

      const [matchAfter, phaseAfter, standingsAfter] = await Promise.all([
        db.collection("tournamentMatches").doc(tournamentMatchId).get(),
        db.collection("tournamentPhases").doc(phaseId).get(),
        db.collection("tournamentStandings").where("phaseId", "==", phaseId).get(),
      ]);
      assert.equal(matchAfter.data().status, "completed");
      assert.equal(matchAfter.data().result.winnerId, matchBefore.homeTeamId);
      assert.equal(phaseAfter.data().status, "completed");

      const rows = standingsAfter.docs.map((document) => document.data());
      const winner = rows.find((row) => row.teamId === matchBefore.homeTeamId);
      const loser = rows.find((row) => row.teamId === matchBefore.awayTeamId);
      assert.equal(winner.stats.played, 1);
      assert.equal(winner.stats.won, 1);
      assert.equal(winner.stats.points, 3);
      assert.equal(winner.position, 1);
      assert.equal(loser.stats.lost, 1);
      assert.equal(loser.position, 2);
    });
  } finally {
    const relatedToTournament = (_id, data) => data.tournamentId === tournamentId;
    const relatedToSocialMatch = (id, data) =>
      data.matchId === socialMatchId || id === socialMatchId;
    await Promise.allSettled([
      deleteWhere(db, "tournamentStandings", relatedToTournament),
      deleteWhere(db, "tournamentMatches", relatedToTournament),
      deleteWhere(db, "tournamentTeams", relatedToTournament),
      deleteWhere(db, "tournamentRegistrations", relatedToTournament),
      deleteWhere(db, "tournamentPhases", relatedToTournament),
      deleteWhere(db, "tournamentAdvancementRules", relatedToTournament),
      deleteWhere(db, "participations", relatedToSocialMatch),
      deleteWhere(db, "teams", relatedToSocialMatch),
      ...groupIds.map((groupId) => db.collection("groups").doc(groupId).delete()),
      db.collection("groups").doc("e0-05-forbidden-group").delete(),
      ...(socialMatchId ? [db.collection("matches").doc(socialMatchId).delete()] : []),
      ...(tournamentId ? [db.collection("tournaments").doc(tournamentId).delete()] : []),
    ]);
    for (const actor of actors) {
      const alerts = await db.collection("users").doc(actor.uid).collection("pendingAlerts").get();
      await Promise.allSettled(alerts.docs.map((document) => document.ref.delete()));
    }
    await Promise.allSettled([
      ...actors.map((actor) => db.collection("users").doc(actor.uid).delete()),
      ...actors.map((actor) => auth.deleteUser(actor.uid)),
    ]);
    await app.delete();
  }
});
