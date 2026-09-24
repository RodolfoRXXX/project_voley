"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { assertSafeFirebaseTestEnvironment } = require("../guards/firebaseTestGuard");
const { SYNTHETIC_DATA } = require("../fixtures/syntheticData");

async function json(response) { const text = await response.text(); return text ? JSON.parse(text) : null; }
async function signUp(host, email) {
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2-17-key`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "E2-17-synthetic-password!", returnSecureToken: true }),
  });
  const body = await json(response); assert.equal(response.status, 200, JSON.stringify(body));
  return { uid: body.localId, idToken: body.idToken, email };
}
async function call(host, projectId, name, data, token) {
  const response = await fetch(`http://${host}/${projectId}/us-central1/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data }),
  });
  return { status: response.status, body: await json(response) };
}
async function clientRead(host, projectId, path, token) {
  return (await fetch(`http://${host}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })).status;
}

test("E2-17 edita canónicamente, recupera sin reescribir y serializa con cierre", async (t) => {
  const { projectId } = assertSafeFirebaseTestEnvironment(process.env); assert.equal(projectId, SYNTHETIC_DATA.projectId);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const admin = require("firebase-admin");
  const app = admin.initializeApp({ projectId }, "e2-17-season-update"); const db = app.firestore(); const auth = app.auth();
  const owner = await signUp(authHost, "e2-17-owner@example.invalid");
  const outsider = await signUp(authHost, "e2-17-outsider@example.invalid");
  const noAccount = await signUp(authHost, "e2-17-no-account@example.invalid");
  const now = admin.firestore.Timestamp.fromDate(new Date("2026-09-24T10:00:00.000Z"));
  const groupId = "e2-17-main";
  const opening = { groupId, nombre: "Temporada Original", fechaInicio: "2026-01-01", idempotencyKey: "e2-17-opening-123456" };
  const update1Key = "e2-17-update-first-1234";
  const protectedDocuments = [["memberships", "e2-17-membership"], ["groupJoinRequests", "e2-17-request"],
    ["matches", "e2-17-match"], ["tournaments", "e2-17-tournament"]];
  try {
    await db.collection("users").doc(owner.uid).set({ nombre: "Owner sin Persona", email: owner.email, photoURL: "", createdAt: now });
    await db.collection("users").doc(outsider.uid).set({ nombre: "No Owner", email: outsider.email, photoURL: "", createdAt: now });
    await db.collection("groups").doc(groupId).set({ nombre: "Grupo E2-17", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1 });
    for (const [collection, id] of protectedDocuments) await db.collection(collection).doc(id).set({ marker: "untouched" });
    const opened = await call(functionsHost, projectId, "createAndOpenSeason", opening, owner.idToken);
    assert.equal(opened.body?.result?.outcome, "CREATED_OPEN", JSON.stringify(opened.body));
    const seasonId = opened.body.result.season.id;
    const initialRoot = (await db.collection("seasons").doc(seasonId).get()).data();
    const initialGuard = (await db.collection("openSeasonGuards").doc(groupId).get()).data();
    const openingReceipt = (await db.collection("seasonOpeningReceipts").where("seasonId", "==", seasonId).get()).docs[0];
    const openingReceiptBefore = openingReceipt.data();
    const own = await call(functionsHost, projectId, "getOwnSeason", { groupId, seasonId }, owner.idToken);
    assert.match(own.body?.result?.editToken, /^[a-f0-9]{64}$/);
    assert.deepEqual(Object.keys(own.body.result).sort(), ["editToken", "season"]);
    const initialToken = own.body.result.editToken;

    await t.test("Auth, Cuenta, no-Owner y payload cerrado fallan sin enumerar ni escribir", async () => {
      const command = { groupId, seasonId, nombre: "No permitido", expectedEditToken: initialToken, idempotencyKey: "e2-17-access-1234567" };
      assert.equal((await call(functionsHost, projectId, "updateSeason", command)).body?.error?.details?.reason, "UNAUTHENTICATED");
      assert.equal((await call(functionsHost, projectId, "updateSeason", command, noAccount.idToken)).body?.error?.details?.reason, "ACCOUNT_REQUIRED");
      assert.equal((await call(functionsHost, projectId, "updateSeason", command, outsider.idToken)).body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      for (const field of ["fechaInicio", "uid", "ownerId", "estado", "schemaVersion", "updatedAt", "revision"]) {
        assert.equal((await call(functionsHost, projectId, "updateSeason", { ...command, [field]: "x" }, owner.idToken)).body?.error?.details?.reason, "VALIDATION_FAILED");
      }
      assert.equal((await db.collection("seasonUpdateReceipts").get()).size, 0);
      assert.deepEqual((await db.collection("seasons").doc(seasonId).get()).data(), initialRoot);
    });

    const firstRequest = { groupId, seasonId, nombre: "  Temporada   Editada  ", expectedEditToken: initialToken, idempotencyKey: update1Key };
    const first = await call(functionsHost, projectId, "updateSeason", firstRequest, owner.idToken);
    assert.equal(first.body?.result?.outcome, "UPDATED", JSON.stringify(first.body));
    assert.equal(first.body.result.currentSeason.nombre, "Temporada Editada");
    const firstToken = first.body.result.currentEditToken;

    await t.test("UPDATED cambia sólo nombre y crea un receipt exacto; apertura/guard/Grupo quedan intactos", async () => {
      const root = (await db.collection("seasons").doc(seasonId).get()).data();
      assert.deepEqual(root, { ...initialRoot, nombre: "Temporada Editada" });
      const receipts = await db.collection("seasonUpdateReceipts").get(); assert.equal(receipts.size, 1);
      assert.deepEqual(Object.keys(receipts.docs[0].data()).sort(), ["action", "actorUserId", "confirmedAt", "expectedEditToken", "groupId", "outcome", "receiptVersion", "requestHash", "resultEditToken", "seasonId"].sort());
      assert.equal(receipts.docs[0].data().outcome, "UPDATED");
      assert.deepEqual((await db.collection("openSeasonGuards").doc(groupId).get()).data(), initialGuard);
      assert.deepEqual((await db.collection("seasonOpeningReceipts").doc(openingReceipt.id).get()).data(), openingReceiptBefore);
      assert.equal((await db.collection("groups").doc(groupId).get()).data().ownerId, owner.uid);
      for (const [collection, id] of protectedDocuments) {
        assert.deepEqual((await db.collection(collection).doc(id).get()).data(), { marker: "untouched" });
      }
    });

    await t.test("NO_CHANGES y stale hacen cero escrituras y no consumen clave", async () => {
      const beforeRoot = (await db.collection("seasons").doc(seasonId).get()).data();
      const noChange = await call(functionsHost, projectId, "updateSeason", { groupId, seasonId, nombre: " Temporada Editada ", expectedEditToken: firstToken, idempotencyKey: "e2-17-noop-123456789" }, owner.idToken);
      assert.equal(noChange.body?.result?.outcome, "NO_CHANGES", JSON.stringify(noChange.body));
      assert.equal(noChange.body.result.appliedEffect, null);
      assert.equal((await db.collection("seasonUpdateReceipts").get()).size, 1);
      assert.deepEqual((await db.collection("seasons").doc(seasonId).get()).data(), beforeRoot);
      const stale = await call(functionsHost, projectId, "updateSeason", { ...firstRequest, nombre: "Temporada Editada", idempotencyKey: "e2-17-stale-12345678" }, owner.idToken);
      assert.equal(stale.body?.error?.details?.reason, "STALE_UPDATE");
      assert.equal((await db.collection("seasonUpdateReceipts").get()).size, 1);
    });

    const second = await call(functionsHost, projectId, "updateSeason", { groupId, seasonId, nombre: "Temporada Posterior", expectedEditToken: firstToken, idempotencyKey: "e2-17-update-second-123" }, owner.idToken);
    assert.equal(second.body?.result?.outcome, "UPDATED", JSON.stringify(second.body));
    const secondToken = second.body.result.currentEditToken;

    await t.test("retry tras otra edición conserva efecto histórico y estado actual; conflicto no escribe", async () => {
      const before = (await db.collection("seasons").doc(seasonId).get()).data();
      const recovered = await call(functionsHost, projectId, "updateSeason", firstRequest, owner.idToken);
      assert.equal(recovered.body?.result?.outcome, "EXISTING_IDEMPOTENT", JSON.stringify(recovered.body));
      assert.equal(recovered.body.result.appliedEffect.nombre, "Temporada Editada");
      assert.equal(recovered.body.result.currentSeason.nombre, "Temporada Posterior");
      const conflict = await call(functionsHost, projectId, "updateSeason", { ...firstRequest, nombre: "Payload distinto" }, owner.idToken);
      assert.equal(conflict.body?.error?.details?.reason, "IDEMPOTENCY_CONFLICT");
      assert.deepEqual((await db.collection("seasons").doc(seasonId).get()).data(), before);
      assert.equal((await db.collection("seasonUpdateReceipts").get()).size, 2);
    });

    await t.test("retry de apertura no restaura nombre y E2-16 relee la abierta editada", async () => {
      const openRetry = await call(functionsHost, projectId, "createAndOpenSeason", opening, owner.idToken);
      assert.equal(openRetry.body?.result?.outcome, "EXISTING_IDEMPOTENT");
      assert.equal(openRetry.body.result.season.nombre, "Temporada Posterior");
      const history = await call(functionsHost, projectId, "listSeasonsForOwnedGroup", { groupId }, owner.idToken);
      assert.equal(history.body?.result?.currentSeason?.nombre, "Temporada Posterior", JSON.stringify(history.body));
    });

    await t.test("dos ediciones desde la misma base serializan sin last-write-wins", async () => {
      const [left, right] = await Promise.all([
        call(functionsHost, projectId, "updateSeason", { groupId, seasonId, nombre: "Carrera A", expectedEditToken: secondToken, idempotencyKey: "e2-17-race-left-12345" }, owner.idToken),
        call(functionsHost, projectId, "updateSeason", { groupId, seasonId, nombre: "Carrera B", expectedEditToken: secondToken, idempotencyKey: "e2-17-race-right-1234" }, owner.idToken),
      ]);
      const outcomes = [left, right].map((result) => result.body?.result?.outcome || result.body?.error?.details?.reason).sort();
      assert.deepEqual(outcomes, ["STALE_UPDATE", "UPDATED"]);
    });

    await t.test("transferencia revoca recovery y restaurar ownership no altera receipts", async () => {
      await db.collection("groups").doc(groupId).update({ ownerId: outsider.uid });
      assert.equal((await call(functionsHost, projectId, "updateSeason", firstRequest, owner.idToken)).body?.error?.details?.reason, "GROUP_NOT_ACCESSIBLE");
      await db.collection("groups").doc(groupId).update({ ownerId: owner.uid });
    });

    const beforeClose = (await db.collection("seasons").doc(seasonId).get()).data();
    const closed = await call(functionsHost, projectId, "closeSeason", { groupId, seasonId, idempotencyKey: "e2-17-close-123456789" }, owner.idToken);
    assert.equal(closed.body?.result?.outcome, "CLOSED", JSON.stringify(closed.body));

    await t.test("cierre preserva nombre; recovery previo devuelve v2 actual y una intención nueva falla", async () => {
      const closedRoot = (await db.collection("seasons").doc(seasonId).get()).data();
      assert.equal(closedRoot.nombre, beforeClose.nombre); assert.equal(closedRoot.estado, "cerrada"); assert.equal(closedRoot.schemaVersion, 2);
      const closureReceiptBefore = (await db.collection("seasonClosureReceipts").where("seasonId", "==", seasonId).get()).docs[0].data();
      const recovered = await call(functionsHost, projectId, "updateSeason", firstRequest, owner.idToken);
      assert.equal(recovered.body?.result?.outcome, "EXISTING_IDEMPOTENT", JSON.stringify(recovered.body));
      assert.equal(recovered.body.result.currentSeason.estado, "cerrada"); assert.equal(recovered.body.result.currentEditToken, null);
      const fresh = await call(functionsHost, projectId, "updateSeason", { groupId, seasonId, nombre: "No reabrir", expectedEditToken: secondToken, idempotencyKey: "e2-17-after-close-123" }, owner.idToken);
      assert.equal(fresh.body?.error?.details?.reason, "SEASON_ALREADY_CLOSED");
      assert.deepEqual((await db.collection("seasonClosureReceipts").where("seasonId", "==", seasonId).get()).docs[0].data(), closureReceiptBefore);
      assert.deepEqual((await db.collection("seasons").doc(seasonId).get()).data(), closedRoot);
    });

    await t.test("Rules niega raíz y receipt a anónimo, Owner y no-Owner", async () => {
      for (const token of [undefined, owner.idToken, outsider.idToken]) {
        assert.equal(await clientRead(firestoreHost, projectId, `seasons/${seasonId}`, token), 403);
        assert.equal(await clientRead(firestoreHost, projectId, "seasonUpdateReceipts/hidden", token), 403);
      }
    });

    await t.test("edición y cierre simultáneos serializan en uno de los dos órdenes válidos", async () => {
      const raceGroupId = "e2-17-edit-close-race";
      await db.collection("groups").doc(raceGroupId).set({ nombre: "Grupo carrera", deporte: "voleibol", ownerId: owner.uid, estado: "activo", createdAt: now, schemaVersion: 1 });
      const raceOpening = await call(functionsHost, projectId, "createAndOpenSeason", {
        groupId: raceGroupId, nombre: "Antes de carrera", fechaInicio: "2027-01-01", idempotencyKey: "e2-17-race-opening-123",
      }, owner.idToken);
      assert.equal(raceOpening.body?.result?.outcome, "CREATED_OPEN", JSON.stringify(raceOpening.body));
      const raceSeasonId = raceOpening.body.result.season.id;
      const raceOwn = await call(functionsHost, projectId, "getOwnSeason", { groupId: raceGroupId, seasonId: raceSeasonId }, owner.idToken);
      const [edit, close] = await Promise.all([
        call(functionsHost, projectId, "updateSeason", { groupId: raceGroupId, seasonId: raceSeasonId,
          nombre: "Después de carrera", expectedEditToken: raceOwn.body.result.editToken,
          idempotencyKey: "e2-17-edit-close-update" }, owner.idToken),
        call(functionsHost, projectId, "closeSeason", { groupId: raceGroupId, seasonId: raceSeasonId,
          idempotencyKey: "e2-17-edit-close-close-1" }, owner.idToken),
      ]);
      assert.equal(close.body?.result?.outcome, "CLOSED", JSON.stringify(close.body));
      const editOutcome = edit.body?.result?.outcome || edit.body?.error?.details?.reason;
      assert.ok(["UPDATED", "SEASON_ALREADY_CLOSED"].includes(editOutcome), JSON.stringify(edit.body));
      const root = (await db.collection("seasons").doc(raceSeasonId).get()).data();
      assert.equal(root.estado, "cerrada"); assert.equal(root.schemaVersion, 2);
      assert.equal(root.nombre, editOutcome === "UPDATED" ? "Después de carrera" : "Antes de carrera");
      if (editOutcome === "UPDATED") {
        const recovered = await call(functionsHost, projectId, "updateSeason", { groupId: raceGroupId, seasonId: raceSeasonId,
          nombre: "Después de carrera", expectedEditToken: raceOwn.body.result.editToken,
          idempotencyKey: "e2-17-edit-close-update" }, owner.idToken);
        assert.equal(recovered.body?.result?.outcome, "EXISTING_IDEMPOTENT");
        assert.equal(recovered.body.result.currentSeason.estado, "cerrada");
      }
    });
  } finally {
    for (const collection of ["seasonUpdateReceipts", "seasonClosureReceipts", "seasonOpeningReceipts", "openSeasonGuards",
      "memberships", "groupJoinRequests", "matches", "tournaments", "seasons", "groups", "users"]) {
      const snapshot = await db.collection(collection).get(); const batch = db.batch();
      for (const document of snapshot.docs) if (document.id.startsWith("e2-17-") || [owner.uid, outsider.uid].includes(document.id)) batch.delete(document.ref);
      await batch.commit();
    }
    await Promise.allSettled([auth.deleteUser(owner.uid), auth.deleteUser(outsider.uid), auth.deleteUser(noAccount.uid)]); await app.delete();
  }
});
