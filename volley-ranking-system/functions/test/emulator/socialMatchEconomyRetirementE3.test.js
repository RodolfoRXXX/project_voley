"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function signUp(authHost, label) {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e3-09-synthetic-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `e3-09-${label}@example.invalid`,
        password: "E3-09-synthetic-password!",
        returnSecureToken: true,
      }),
    }
  );
  const body = await readJson(response);
  assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken };
}

async function callable(host, projectId, name, data, token) {
  const response = await fetch(
    `http://${host}/${projectId}/us-central1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    }
  );
  return { status: response.status, body: await readJson(response) };
}

async function waitFor(read, predicate, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let value;
  while (Date.now() < deadline) {
    value = await read();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`${label}: ${JSON.stringify(value)}`);
}

const ECONOMIC_ROOTS = [
  "groupChargeConcepts",
  "groupChargeOccurrences",
  "payments",
  "paymentGenerationIntents",
  "paymentCommandReceipts",
  "paymentDeliveries",
  "paymentDeliveryReversals",
  "paymentDeliveryCommandReceipts",
  "paymentReceiptCandidateGuards",
  "administrativeReceiptCommandReceipts",
  "groupCapabilityGrants",
  "groupCapabilityGrantSlots",
  "groupCapabilityCommandReceipts",
];

const ECONOMIC_SUBCOLLECTIONS = {
  payments: ["deliveryApplications", "principalCorrections", "waiverEvents"],
  paymentGenerationIntents: ["rows"],
};

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value.toMillis === "function") {
    return { __timestampMillis: value.toMillis() };
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

async function economicSnapshot(db) {
  const entries = [];
  for (const root of ECONOMIC_ROOTS) {
    const roots = await db.collection(root).get();
    for (const document of roots.docs) {
      entries.push([document.ref.path, canonical(document.data())]);
      for (const child of ECONOMIC_SUBCOLLECTIONS[root] || []) {
        const children = await document.ref.collection(child).get();
        for (const nested of children.docs) {
          entries.push([nested.ref.path, canonical(nested.data())]);
        }
      }
    }
  }
  return entries.sort(([left], [right]) => left.localeCompare(right));
}

test("E3-09 retira economía legacy social y preserva operaciones deportivas", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env);
  assert.equal(projectId, SYNTHETIC_DATA.projectId);

  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e3-09-social-retirement");
  const db = app.firestore();
  const auth = app.auth();
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const actors = await Promise.all([
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "owner"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "other-admin"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "player-a"),
    signUp(process.env.FIREBASE_AUTH_EMULATOR_HOST, "player-b"),
  ]);
  const [owner, otherAdmin, playerA, playerB] = actors;
  const groupId = "e3-09-social-group";
  const matchIds = [];
  const participationIds = [];
  const rememberMatch = (id) => (matchIds.push(id), db.collection("matches").doc(id));
  const rememberParticipation = (id) => (
    participationIds.push(id),
    db.collection("participations").doc(id)
  );
  const economicFixtureRefs = [];
  const assertEconomyUnchanged = async (label, operation) => {
    const before = await economicSnapshot(db);
    const result = await operation();
    const after = await economicSnapshot(db);
    assert.deepEqual(after, before, `${label} alteró persistencia económica`);
    return result;
  };

  try {
    await Promise.all([
      db.collection("users").doc(owner.uid).set({
        nombre: "Owner E3-09",
        roles: "admin",
        onboarded: true,
        estadoCompromiso: 0,
        posicionesPreferidas: ["central"],
      }),
      db.collection("users").doc(otherAdmin.uid).set({
        nombre: "Otro admin E3-09",
        roles: "admin",
        onboarded: true,
        estadoCompromiso: 0,
        posicionesPreferidas: ["central"],
      }),
      db.collection("users").doc(playerA.uid).set({
        nombre: "Jugador A E3-09",
        onboarded: true,
        estadoCompromiso: 0,
        posicionesPreferidas: ["central"],
      }),
      db.collection("users").doc(playerB.uid).set({
        nombre: "Jugador B E3-09",
        onboarded: true,
        estadoCompromiso: 0,
        posicionesPreferidas: ["central"],
      }),
      db.collection("groups").doc(groupId).set({
        nombre: "Grupo social E3-09",
        activo: true,
        partidosTotales: 0,
        ownerId: owner.uid,
        adminIds: [owner.uid],
        admins: [{ userId: owner.uid, role: "owner", order: 0 }],
        memberIds: [owner.uid, playerA.uid, playerB.uid],
        visibility: "private",
      }),
    ]);

    const economicSeedWrites = [];
    for (const root of ECONOMIC_ROOTS) {
      const ref = db.collection(root).doc(`e3-09-existing-${root}`);
      economicFixtureRefs.push(ref);
      economicSeedWrites.push(ref.set({ marker: `preserve-${root}`, revision: 7 }));
      for (const child of ECONOMIC_SUBCOLLECTIONS[root] || []) {
        const nested = ref.collection(child).doc(`e3-09-existing-${child}`);
        economicFixtureRefs.push(nested);
        economicSeedWrites.push(nested.set({ marker: `preserve-${child}`, revision: 11 }));
      }
    }
    await Promise.all(economicSeedWrites);

    await t.test("alta y ranking omiten pagoEstado, incluso ante reintento", async () => {
      const matchId = "e3-09-join-ranking";
      const matchRef = rememberMatch(matchId);
      await matchRef.set({
        groupId,
        estado: "abierto",
        lock: false,
        horaInicio: admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
        posicionesObjetivo: { central: 1 },
        cantidadSuplentes: 0,
        visibility: "group_only",
      });

      const joined = await assertEconomyUnchanged("alta y ranking", async () => {
        const response = await callable(
          functionsHost,
          projectId,
          "joinMatch",
          { matchId },
          playerA.idToken
        );
        const ref = db.collection("participations").doc(`${matchId}_${playerA.uid}`);
        await waitFor(
          async () => (await ref.get()).data(),
          (data) => data?.estado === "titular" && data?.rankingTitular === 1,
          "ranking posterior al alta"
        );
        return response;
      });
      assert.equal(joined.status, 200, JSON.stringify(joined.body));
      const participationId = `${matchId}_${playerA.uid}`;
      participationIds.push(participationId);
      const participationRef = db.collection("participations").doc(participationId);
      const ranked = (await participationRef.get()).data();
      assert.equal(Object.hasOwn(ranked, "pagoEstado"), false);
      const duplicate = await callable(functionsHost, projectId, "joinMatch", { matchId }, playerA.idToken);
      assert.equal(duplicate.body?.error?.status, "FAILED_PRECONDITION");
      assert.equal(Object.hasOwn((await participationRef.get()).data(), "pagoEstado"), false);

      const concurrentMatchId = "e3-09-join-concurrent";
      const concurrentMatchRef = rememberMatch(concurrentMatchId);
      await concurrentMatchRef.set({
        groupId,
        estado: "abierto",
        lock: false,
        horaInicio: admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
        posicionesObjetivo: { central: 1 },
        cantidadSuplentes: 0,
        visibility: "group_only",
      });
      const concurrentParticipationId = `${concurrentMatchId}_${playerB.uid}`;
      participationIds.push(concurrentParticipationId);
      const concurrentResults = await assertEconomyUnchanged("alta concurrente", () => Promise.all([
        callable(functionsHost, projectId, "joinMatch", { matchId: concurrentMatchId }, playerB.idToken),
        callable(functionsHost, projectId, "joinMatch", { matchId: concurrentMatchId }, playerB.idToken),
      ]));
      assert.equal(
        concurrentResults.filter((result) => result.status === 200).length,
        1
      );
      const concurrentParticipation = (
        await db.collection("participations").doc(concurrentParticipationId).get()
      ).data();
      assert.equal(Object.hasOwn(concurrentParticipation, "pagoEstado"), false);
    });

    await t.test("tombstone conserva precedencia, acceso, error estable y cero efectos", async () => {
      const participationId = `e3-09-join-ranking_${playerA.uid}`;
      const ref = db.collection("participations").doc(participationId);
      const before = (await ref.get()).data();
      const economyBefore = await economicSnapshot(db);

      const unauthenticated = await callable(
        functionsHost,
        projectId,
        "updatePagoEstado",
        { participationId, estado: "confirmado" }
      );
      assert.equal(unauthenticated.body?.error?.status, "UNAUTHENTICATED");

      const invalidInput = await callable(
        functionsHost,
        projectId,
        "updatePagoEstado",
        { participationId },
        owner.idToken
      );
      assert.equal(invalidInput.body?.error?.status, "INVALID_ARGUMENT");

      const forbidden = await callable(
        functionsHost,
        projectId,
        "updatePagoEstado",
        { participationId, estado: "confirmado" },
        otherAdmin.idToken
      );
      assert.equal(forbidden.body?.error?.status, "PERMISSION_DENIED");

      const invalidState = await callable(
        functionsHost,
        projectId,
        "updatePagoEstado",
        { participationId, estado: "inventado" },
        owner.idToken
      );
      assert.equal(invalidState.body?.error?.status, "FAILED_PRECONDITION");
      assert.equal(invalidState.body?.error?.message, "Estado de pago inválido");

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const retired = await callable(
          functionsHost,
          projectId,
          "updatePagoEstado",
          { participationId, estado: "confirmado" },
          owner.idToken
        );
        assert.equal(retired.body?.error?.status, "FAILED_PRECONDITION");
        assert.equal(
          retired.body?.error?.message,
          "La gestión económica de partidos sociales fue retirada"
        );
        assert.equal(retired.body?.error?.details?.code, "SOCIAL_MATCH_PAYMENT_RETIRED");
      }

      assert.deepEqual((await ref.get()).data(), before);
      assert.deepEqual(await economicSnapshot(db), economyBefore);
    });

    await t.test("cierre ignora historia, exige estado, lock y mínimo titular", async () => {
      const openMatchId = "e3-09-close-open";
      const openMatchRef = rememberMatch(openMatchId);
      await openMatchRef.set({
        groupId,
        estado: "abierto",
        lock: false,
        posicionesObjetivo: { central: 1 },
      });
      const firstStep = await assertEconomyUnchanged("cierre abierto a verificando", () => callable(
        functionsHost,
        projectId,
        "cerrarMatch",
        { matchId: openMatchId },
        owner.idToken
      ));
      assert.equal(firstStep.status, 200, JSON.stringify(firstStep.body));
      assert.equal((await openMatchRef.get()).data().estado, "verificando");

      const historicalMatchId = "e3-09-close-historical";
      const historicalMatchRef = rememberMatch(historicalMatchId);
      await historicalMatchRef.set({
        groupId,
        estado: "verificando",
        lock: false,
        posicionesObjetivo: { central: 4 },
      });
      const legacyValues = ["confirmado", "pendiente", "pospuesto", undefined];
      const historicalRefs = [];
      for (const [index, pagoEstado] of legacyValues.entries()) {
        const ref = rememberParticipation(`e3-09-close-historical-${index}`);
        historicalRefs.push(ref);
        await ref.set({
          matchId: historicalMatchId,
          userId: index % 2 ? playerA.uid : playerB.uid,
          estado: "titular",
          posicionAsignada: "central",
          ...(pagoEstado === undefined ? {} : { pagoEstado }),
        });
      }
      const before = await Promise.all(historicalRefs.map(async (ref) => (await ref.get()).data()));
      const closed = await assertEconomyUnchanged("cierre verificando a cerrado", () => callable(
        functionsHost,
        projectId,
        "cerrarMatch",
        { matchId: historicalMatchId },
        owner.idToken
      ));
      assert.equal(closed.status, 200, JSON.stringify(closed.body));
      assert.equal((await historicalMatchRef.get()).data().estado, "cerrado");
      assert.deepEqual(
        await Promise.all(historicalRefs.map(async (ref) => (await ref.get()).data())),
        before
      );

      const insufficientId = "e3-09-close-insufficient";
      const insufficientRef = rememberMatch(insufficientId);
      const onlyStarter = rememberParticipation("e3-09-close-insufficient-0");
      await Promise.all([
        insufficientRef.set({
          groupId,
          estado: "verificando",
          lock: false,
          posicionesObjetivo: { central: 2 },
        }),
        onlyStarter.set({ matchId: insufficientId, userId: playerA.uid, estado: "titular" }),
      ]);
      const insufficient = await callable(
        functionsHost,
        projectId,
        "cerrarMatch",
        { matchId: insufficientId },
        owner.idToken
      );
      assert.equal(insufficient.body?.error?.status, "FAILED_PRECONDITION");
      assert.equal((await insufficientRef.get()).data().estado, "verificando");

      const lockedId = "e3-09-close-locked";
      const lockedRef = rememberMatch(lockedId);
      const lockedStarter = rememberParticipation("e3-09-close-locked-0");
      await Promise.all([
        lockedRef.set({
          groupId,
          estado: "verificando",
          lock: true,
          posicionesObjetivo: { central: 1 },
        }),
        lockedStarter.set({ matchId: lockedId, userId: playerA.uid, estado: "titular" }),
      ]);
      const locked = await callable(
        functionsHost,
        projectId,
        "cerrarMatch",
        { matchId: lockedId },
        owner.idToken
      );
      assert.equal(locked.body?.error?.status, "FAILED_PRECONDITION");
      assert.equal((await lockedRef.get()).data().estado, "verificando");
    });

    await t.test("reemplazo post-deadline y reincorporación conservan deporte e historia inerte", async () => {
      const matchId = "e3-09-replacement";
      const matchRef = rememberMatch(matchId);
      const starterRef = rememberParticipation("e3-09-replacement-starter");
      const substituteRef = rememberParticipation("e3-09-replacement-substitute");
      await Promise.all([
        matchRef.set({
          groupId,
          estado: "verificando",
          lock: false,
          horaInicio: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
          posicionesObjetivo: { central: 1 },
        }),
        starterRef.set({
          matchId,
          userId: playerA.uid,
          estado: "titular",
          posicionAsignada: "central",
          pagoEstado: "pendiente",
        }),
        substituteRef.set({
          matchId,
          userId: playerB.uid,
          estado: "suplente",
          rankingSuplente: 1,
          posicionesPreferidas: ["central"],
        }),
      ]);

      const removed = await assertEconomyUnchanged("reemplazo y ranking", async () => {
        const response = await callable(
          functionsHost,
          projectId,
          "eliminarJugador",
          { participationId: starterRef.id },
          owner.idToken
        );
        await waitFor(
          async () => ({
            participation: (await substituteRef.get()).data(),
            match: (await matchRef.get()).data(),
          }),
          (value) => value.participation?.estado === "titular" && value.match?.lock === false,
          "reemplazo post-deadline"
        );
        return response;
      });
      assert.equal(removed.status, 200, JSON.stringify(removed.body));
      const promoted = {
        participation: (await substituteRef.get()).data(),
        match: (await matchRef.get()).data(),
      };
      assert.equal(promoted.participation.posicionAsignada, "central");
      assert.equal(Object.hasOwn(promoted.participation, "pagoEstado"), false);
      assert.equal((await starterRef.get()).data().pagoEstado, "pendiente");

      const reinstated = await assertEconomyUnchanged("reincorporación y ranking", async () => {
        const response = await callable(
          functionsHost,
          projectId,
          "reincorporarJugador",
          { participationId: starterRef.id },
          owner.idToken
        );
        await waitFor(
          async () => (await starterRef.get()).data(),
          (data) => data?.estado === "pendiente",
          "reincorporación"
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        return response;
      });
      assert.equal(reinstated.status, 200, JSON.stringify(reinstated.body));
      const restored = (await starterRef.get()).data();
      assert.equal(restored.estado, "pendiente");
      assert.equal(restored.rankingSuplente, null);
      assert.equal(restored.pagoEstado, "pendiente");
    });

    await t.test("cambiar pagoEstado histórico no cierra automáticamente", async () => {
      const matchId = "e3-09-no-auto-close";
      const matchRef = rememberMatch(matchId);
      const participantRef = rememberParticipation("e3-09-no-auto-close-starter");
      await Promise.all([
        matchRef.set({
          groupId,
          estado: "verificando",
          lock: false,
          posicionesObjetivo: { central: 1 },
        }),
        participantRef.set({
          matchId,
          userId: playerA.uid,
          estado: "titular",
          pagoEstado: "pendiente",
        }),
      ]);
      await participantRef.update({ pagoEstado: "confirmado" });
      await new Promise((resolve) => setTimeout(resolve, 750));
      assert.equal((await matchRef.get()).data().estado, "verificando");
    });

    await t.test("cierre y modificación coherente del roster serializan sin cerrado insuficiente", async () => {
      const matchId = "e3-09-close-concurrent";
      const matchRef = rememberMatch(matchId);
      const participantRef = rememberParticipation("e3-09-close-concurrent-starter");
      await Promise.all([
        matchRef.set({
          groupId,
          estado: "verificando",
          lock: false,
          posicionesObjetivo: { central: 1 },
        }),
        participantRef.set({ matchId, userId: playerA.uid, estado: "titular" }),
      ]);

      const rosterMutation = db.runTransaction(async (tx) => {
        const matchSnap = await tx.get(matchRef);
        if (matchSnap.data()?.estado !== "verificando") {
          throw new Error("MATCH_NOT_VERIFYING");
        }
        tx.update(matchRef, { lock: true });
        tx.update(participantRef, { estado: "eliminado" });
      });
      const close = callable(
        functionsHost,
        projectId,
        "cerrarMatch",
        { matchId },
        owner.idToken
      );
      const [mutationResult, closeResult] = await Promise.allSettled([rosterMutation, close]);
      const match = (await matchRef.get()).data();
      const participation = (await participantRef.get()).data();

      if (closeResult.status === "fulfilled" && closeResult.value.status === 200) {
        assert.equal(mutationResult.status, "rejected");
        assert.equal(match.estado, "cerrado");
        assert.equal(participation.estado, "titular");
      } else {
        assert.equal(mutationResult.status, "fulfilled");
        assert.equal(closeResult.status, "fulfilled");
        assert.equal(closeResult.value.body?.error?.status, "FAILED_PRECONDITION");
        assert.equal(match.estado, "verificando");
        assert.equal(match.lock, true);
        assert.equal(participation.estado, "eliminado");
      }
      assert.equal(match.estado === "cerrado" && participation.estado !== "titular", false);
    });
  } finally {
    await Promise.allSettled([
      ...participationIds.map((id) => db.collection("participations").doc(id).delete()),
      ...matchIds.map((id) => db.collection("matches").doc(id).delete()),
      ...economicFixtureRefs.reverse().map((ref) => ref.delete()),
      db.collection("groups").doc(groupId).delete(),
      ...actors.map((actor) => db.collection("users").doc(actor.uid).delete()),
      ...actors.map((actor) => auth.deleteUser(actor.uid)),
    ]);
    await app.delete();
  }
});
