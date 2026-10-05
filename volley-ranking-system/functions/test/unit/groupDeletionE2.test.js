"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { hydrateGroup } = require("../../src/groups/domain/group");
const { validateDeleteOwnGroupPayload } = require("../../src/groups/application/groupContract");
const { createGroupService } = require("../../src/groups/application/groupService");
const { groupDeletionReceiptId, groupDeletionToken, hashGroupDeletionIdempotencyKey, hashGroupDeletionRequest } = require("../../src/groups/application/groupHashing");
const { GroupValidationError } = require("../../src/groups/application/groupErrors");
const { GROUP_DELETION_RECEIPT_FIELDS, hydrateGroupDeletionReceipt } = require("../../src/groups/infrastructure/groupDeletionReceipts");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const timestamp = (iso) => { const date = new Date(iso); const milliseconds = date.getTime(); return { seconds: Math.floor(milliseconds / 1000), nanoseconds: (milliseconds % 1000) * 1e6, toDate: () => date }; };
const active = (overrides = {}) => { const { groupId = "group-a", ...data } = overrides; return hydrateGroup(groupId, { nombre: "Grupo A", deporte: "voleibol", ownerId: "owner-a", estado: "activo", createdAt: timestamp("2026-10-01T12:00:00.000Z"), schemaVersion: 1, ...data }); };

test("E2-24 delete payload is exact and cryptographic contexts bind every contract field", () => {
  const input = { groupId: "group-a", expectedDeletionToken: "a".repeat(64), idempotencyKey: "delete-group-key-1234" };
  assert.equal(validateDeleteOwnGroupPayload(input), input);
  for (const field of ["ownerId", "force", "cascade", "reason", "deletionToken"]) {
    assert.throws(() => validateDeleteOwnGroupPayload({ ...input, [field]: "x" }), GroupValidationError);
  }
  for (const invalid of [{ ...input, expectedDeletionToken: "A".repeat(64) }, { ...input, idempotencyKey: "short" }, { ...input, groupId: "a/b" }]) {
    assert.throws(() => validateDeleteOwnGroupPayload(invalid), GroupValidationError);
  }
  const group = active(); const token = groupDeletionToken(group);
  for (const changed of [
    { groupId: "group-b" }, { ownerId: "owner-b" }, { nombre: "Otro" }, { deporte: "otro" },
    { estado: "otro" }, { schemaVersion: 9 }, { createdAt: timestamp("2026-10-02T12:00:00.000Z") },
  ]) assert.notEqual(groupDeletionToken({ ...group, ...changed }), token);
  assert.notEqual(groupDeletionReceiptId("owner-a", input.idempotencyKey), groupDeletionReceiptId("owner-b", input.idempotencyKey));
  assert.notEqual(hashGroupDeletionIdempotencyKey("owner-a", input.idempotencyKey), hashGroupDeletionIdempotencyKey("owner-a", `${input.idempotencyKey}-other`));
  assert.notEqual(hashGroupDeletionRequest("owner-a", input), hashGroupDeletionRequest("owner-a", { ...input, expectedDeletionToken: "b".repeat(64) }));
});

test("E2-24 deletion receipt is exact, minimal and contains no Group snapshot or raw key", () => {
  const id = "f".repeat(64); const data = {
    action: "DELETE_GROUP", actorUserId: "owner-a", groupId: "group-a",
    idempotencyKeyHash: "a".repeat(64), requestHash: "b".repeat(64),
    creationIdempotencyKeyHash: "c".repeat(64), creationRequestHash: "d".repeat(64),
    deletedAt: timestamp("2026-10-03T12:00:00.000Z"), outcome: "DELETED", receiptVersion: 1,
  };
  const receipt = hydrateGroupDeletionReceipt({ exists: true, id, data: () => data }, id);
  assert.deepEqual(Object.keys(receipt).sort(), [...GROUP_DELETION_RECEIPT_FIELDS].sort());
  for (const field of ["nombre", "deporte", "ownerId", "createdAt", "idempotencyKey", "blockers", "references", "snapshot"]) {
    assert.throws(() => hydrateGroupDeletionReceipt({ exists: true, id, data: () => ({ ...data, [field]: "private" }) }, id));
  }
});

test("service derives private delete identity and exposes no current Group", async () => {
  let prepared; let deleted;
  const service = createGroupService({
    selfAccountReader: { async getByUserId(userId) { return { userId }; } },
    groupRepository: { newId() { return "unused"; } }, ownGroupsReader: {}, creationGuard: {},
    groupDeletionStore: {
      async prepare(command) { prepared = command; return { eligibility: { status: "ELIGIBLE", blockers: [] } }; },
      async delete(command) { deleted = command; return { outcome: "DELETED", recovered: false, appliedEffect: { outcome: "DELETED", deletedAt: "2026-10-03T12:00:00.000Z" } }; },
    },
  });
  await service.prepareOwnGroupDeletion({ userId: "owner-a" }, { groupId: "group-a" });
  const input = { groupId: "group-a", expectedDeletionToken: "a".repeat(64), idempotencyKey: "delete-group-key-1234" };
  const result = await service.deleteOwnGroup({ userId: "owner-a" }, input);
  assert.deepEqual(prepared, { userId: "owner-a", groupId: "group-a" });
  assert.match(deleted.receiptId, /^[a-f0-9]{64}$/); assert.match(deleted.idempotencyKeyHash, /^[a-f0-9]{64}$/); assert.match(deleted.requestHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(deleted, "idempotencyKey"), false);
  assert.equal(Object.hasOwn(result, "currentGroup"), false); assert.equal(JSON.stringify(result).includes("Grupo A"), false);
});

test("persistence, recovery and Rules preserve the E2-24 boundaries", () => {
  const store = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupDeletionStore.js");
  const creation = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupCreationGuard.js");
  const rename = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupNameUpdateStore.js");
  const rules = read("volley-ranking-system/firestore.rules");
  for (const collection of ["seasons", "memberships", "groupJoinRequests", "matches", "teams", "groupStats", "tournamentRegistrations", "tournamentTeams"]) assert.match(store, new RegExp(`"${collection}"`));
  assert.match(store, /transaction\.create\(receiptRef/); assert.match(store, /deleteRoot\(transaction/); assert.match(store, /transaction\.delete\(guardRef\)/);
  assert.doesNotMatch(store, /transaction\.(?:delete|update|set)\(db\.collection\("(?:seasons|memberships|groupJoinRequests|matches|teams|groupStats|tournamentRegistrations|tournamentTeams)"/);
  assert.match(creation, /CREATED_THEN_DELETED/); assert.match(rename, /UPDATED_THEN_DELETED/);
  assert.match(rules, /match \/groupDeletionReceipts\/\{receiptId\}[\s\S]*?allow read, write: if false/);
  assert.match(read("volley-ranking-system/functions/index.js"), /prepareOwnGroupDeletion/); assert.match(read("volley-ranking-system/functions/index.js"), /deleteOwnGroup/);
});

test("Owner menu replaces large triggers and implements keyboard, focus and destructive semantics", () => {
  const detail = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  const menu = read("volley-ranking-frontend/src/components/groups/GroupActionsMenu.tsx");
  const deletion = read("volley-ranking-frontend/src/components/groups/DeleteGroupDialog.tsx");
  assert.match(detail, /GroupActionsMenu/); assert.doesNotMatch(detail, /<EditGroupNameDialog|<ArchiveGroupDialog|<DeleteGroupDialog/);
  for (const pattern of [/Acciones del grupo/g, /aria-haspopup="menu"/, /aria-expanded/, /role="menu"/, /role="menuitem"/g, /ArrowDown/, /ArrowUp/, /Home/, /End/, /Escape/, /Tab/, /pointerdown/, /<svg aria-hidden="true"/, /circle cx="12" cy="5"[\s\S]*circle cx="12" cy="12"[\s\S]*circle cx="12" cy="19"/, /M4 7h16M9 7V4h6v3/, /border-t/]) assert.match(menu, pattern);
  assert.ok((menu.match(/role="menuitem"/g) || []).length === 3);
  assert.match(menu, /Editar nombre[\s\S]*Archivar grupo[\s\S]*Eliminar grupo/);
  assert.match(deletion, /prepareOwnGroupDeletion/); assert.match(deletion, /intent\.current/); assert.match(deletion, /inFlight\.current/);
  assert.match(deletion, /inFlight\.current = false; setSending\(false\);[\s\S]*await prepare/);
  assert.match(deletion, /current !== generation\.current \|\| groupId !== group\.id/); assert.match(deletion, /role="alertdialog"/);
  assert.match(deletion, /Eliminar grupo definitivamente/); assert.match(deletion, /returnFocusRef\.current\?\.focus/);
  const edit = read("volley-ranking-frontend/src/components/groups/EditGroupNameDialog.tsx");
  assert.match(edit, /UPDATED_THEN_DELETED/); assert.match(edit, /requestGeneration !== generation\.current \|\| groupId !== group\.id/);
});
