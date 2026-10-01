"use strict";
const assert = require("node:assert/strict"); const fs = require("node:fs"); const path = require("node:path"); const test = require("node:test");
const root = path.resolve(__dirname, "../../../.."); const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("E2-20 usa writer acotado, callable backend y receipt deny-all", () => {
  const repository = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupRepository.js"); const store = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupNameUpdateStore.js");
  assert.match(repository, /transaction\.update\(reference\(groupId\), "nombre", nombre\)/); assert.doesNotMatch(store, /deporte\s*:|ownerId\s*:|estado\s*:|schemaVersion\s*:|updatedAt|updatedBy/);
  assert.match(read("volley-ranking-system/firestore.rules"), /match \/groupNameUpdateReceipts\/\{receiptId\}[\s\S]*allow read, write: if false/);
  assert.match(read("volley-ranking-system/functions/index.js"), /exports\.updateOwnGroupName/);
});

test("E2-20 UI usa Functions, limita el formulario y cubre retry, stale, foco y pérdida de acceso", () => {
  const ui = read("volley-ranking-frontend/src/components/groups/EditGroupNameDialog.tsx");
  const detail = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  assert.doesNotMatch(ui, /firebase\/firestore|deporte|ownerId|schemaVersion|descripci|configur|archiv|elimin/i);
  for (const pattern of [/getOwnGroup/, /expectedEditToken/, /intent/, /sendingRef\.current/, /STALE_UPDATE/, /GROUP_NOT_ACCESSIBLE/, /Escape/, /queueMicrotask.*focus/, /aria-live/, /aria-busy/, /htmlFor="group-edit-name"/, /sm:/]) assert.match(ui, pattern);
  assert.match(detail, /EditGroupNameDialog/);
  assert.match(detail, /const handleAccessLost = useCallback\([\s\S]*setGroup\(null\);[\s\S]*router\.replace\("\/dashboard\/groups"\)/);
  assert.match(detail, /<EditGroupNameDialog[\s\S]*onAccessLost=\{handleAccessLost\}/);
  assert.match(detail, /<ActiveGroupMembersSection[\s\S]*onAccessLost=\{handleAccessLost\}/);
});

test("E2-20 no agrega índice ni dependencias hacia otros Agregados", () => {
  assert.doesNotMatch(read("volley-ranking-system/firestore.indexes.json"), /groupNameUpdateReceipts/);
  const store = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreGroupNameUpdateStore.js");
  assert.doesNotMatch(store, /memberships|seasons|requests|matches|tournaments|personas|roles/i);
});
