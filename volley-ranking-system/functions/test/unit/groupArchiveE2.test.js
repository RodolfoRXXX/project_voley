"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { archiveGroup, hydrateGroup, InvalidGroupStateError } = require("../../src/groups/domain/group");
const { validateArchiveOwnGroupPayload } = require("../../src/groups/application/groupContract");
const { groupArchiveReceiptId, groupArchiveToken, hashGroupArchiveRequest } = require("../../src/groups/application/groupHashing");
const { toGroupDto } = require("../../src/groups/application/groupDto");
const { GroupValidationError } = require("../../src/groups/application/groupErrors");
const { hydrateGroupArchiveReceipt } = require("../../src/groups/infrastructure/groupArchiveReceipts");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const timestamp = (iso) => {
  const date = new Date(iso); const millis = date.getTime();
  return { seconds: Math.floor(millis / 1000), nanoseconds: (millis % 1000) * 1e6, toDate: () => date };
};
const activeData = Object.freeze({ nombre: "Grupo", deporte: "voleibol", ownerId: "owner", estado: "activo", createdAt: timestamp("2026-01-01T00:00:00.000Z"), schemaVersion: 1 });

test("E2-23 hydrates exact active v1 and archived v2 schemas only", () => {
  const active = hydrateGroup("group", activeData);
  const archivedAt = timestamp("2026-10-01T12:00:00.000Z");
  const archived = hydrateGroup("group", { ...activeData, estado: "archivado", archivedAt, schemaVersion: 2 });
  assert.equal(active.estado, "activo"); assert.equal(archived.estado, "archivado");
  assert.deepEqual(toGroupDto(archived), { id: "group", nombre: "Grupo", deporte: "voleibol", estado: "archivado", ownerUserId: "owner", createdAt: "2026-01-01T00:00:00.000Z", archivedAt: "2026-10-01T12:00:00.000Z" });
  for (const invalid of [
    { ...activeData, archivedAt },
    { ...activeData, estado: "archivado", schemaVersion: 2 },
    { ...activeData, estado: "archivado", archivedAt, schemaVersion: 1 },
    { ...activeData, estado: "archivado", archivedAt, archivedBy: "owner", schemaVersion: 2 },
  ]) assert.throws(() => hydrateGroup("group", invalid), InvalidGroupStateError);
});

test("archive transition changes only state, schema and authoritative timestamp", () => {
  const active = hydrateGroup("group", activeData); const archivedAt = timestamp("2026-10-01T12:00:00.000Z");
  const archived = archiveGroup(active, archivedAt);
  for (const key of ["groupId", "nombre", "deporte", "ownerId", "createdAt"]) assert.equal(archived[key], active[key]);
  assert.equal(archived.estado, "archivado"); assert.equal(archived.schemaVersion, 2); assert.equal(archived.archivedAt, archivedAt);
  assert.throws(() => archiveGroup(archived, archivedAt), InvalidGroupStateError);
});

test("archive payload and cryptographic contexts are closed and deterministic", () => {
  const payload = { groupId: "group", expectedArchiveToken: "a".repeat(64), idempotencyKey: "archive-intent-1234" };
  assert.equal(validateArchiveOwnGroupPayload(payload), payload);
  for (const extra of ["estado", "archivedAt", "archivedBy", "reason", "patch", "fieldMask"]) {
    assert.throws(() => validateArchiveOwnGroupPayload({ ...payload, [extra]: "x" }), GroupValidationError);
  }
  const active = hydrateGroup("group", activeData);
  assert.match(groupArchiveToken(active), /^[a-f0-9]{64}$/);
  assert.notEqual(groupArchiveReceiptId("owner", payload.idempotencyKey), groupArchiveReceiptId("other", payload.idempotencyKey));
  assert.notEqual(hashGroupArchiveRequest("owner", payload), hashGroupArchiveRequest("owner", { ...payload, expectedArchiveToken: "b".repeat(64) }));
});

test("archive receipt is exact, private and contains no raw key or archivedBy", () => {
  const archivedAt = timestamp("2026-10-01T12:00:00.000Z"); const id = "f".repeat(64);
  const data = { action: "ARCHIVE_GROUP", actorUserId: "owner", groupId: "group", requestHash: "a".repeat(64), appliedState: "archivado", archivedAt, outcome: "ARCHIVED", receiptVersion: 1 };
  assert.deepEqual(hydrateGroupArchiveReceipt({ exists: true, id, data: () => data }, id), data);
  assert.throws(() => hydrateGroupArchiveReceipt({ exists: true, id, data: () => ({ ...data, idempotencyKey: "secret" }) }, id));
  assert.match(read("volley-ranking-system/firestore.rules"), /match \/groupArchiveReceipts\/\{receiptId\}[\s\S]*?allow read, write: if false/);
});

test("E2-23 wiring preserves one atomic Group patch plus receipt and no cascade", () => {
  const store = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupArchiveStore.js");
  const repository = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupRepository.js");
  assert.match(store, /runTransaction/); assert.match(store, /transaction\.create\(receiptRef/);
  assert.match(repository, /transaction\.update\(reference\(groupId\), \{[\s\S]*estado: "archivado"[\s\S]*archivedAt[\s\S]*schemaVersion: 2/);
  assert.doesNotMatch(store, /transaction\.(?:update|set|delete)\(db\.collection\("(?:seasons|memberships|groupJoinRequests)"/);
  assert.match(read("volley-ranking-system/functions/index.js"), /prepareOwnGroupArchive/);
  assert.match(read("volley-ranking-system/functions/index.js"), /archiveOwnGroup/);
});

test("frontend exposes preparation, stable retry, focus and archived read-only state", () => {
  const dialog = read("volley-ranking-frontend/src/components/groups/ArchiveGroupDialog.tsx");
  const detail = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  const seasons = read("volley-ranking-frontend/src/components/seasons/SeasonHistorySection.tsx");
  const ownMembership = read("volley-ranking-frontend/src/components/memberships/OwnMembershipSection.tsx");
  const pendingRequests = read("volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx");
  assert.match(dialog, /prepareOwnGroupArchive/); assert.match(dialog, /intent\.current/); assert.match(dialog, /inFlight\.current/);
  assert.match(dialog, /Escape/); assert.match(dialog, /aria-live/); assert.match(dialog, /aria-modal/); assert.match(dialog, /queueMicrotask/);
  assert.match(dialog, /current !== generation\.current \|\| groupId !== group\.id/);
  assert.match(dialog, /onPrepared\(result\.group\)/);
  assert.match(dialog, /await prepare\(getGroupErrorMessage\(reason\)\)/);
  assert.match(dialog, /inFlight\.current = false; setSending\(false\)/);
  assert.match(detail, /group\.estado === "activo"/); assert.match(detail, /Organización archivada/); assert.match(detail, /generation\.current/);
  assert.match(detail, /readOnly=\{group\.estado === "archivado"\}/);
  for (const source of [seasons, ownMembership, pendingRequests]) assert.match(source, /onAccessLost/);
  assert.match(seasons, /!readOnly \? <Link/);
});
