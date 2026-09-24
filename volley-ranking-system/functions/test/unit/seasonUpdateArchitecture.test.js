"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("E2-17 conserva v1/v2, backend único writer y receipt deny-all", () => {
  const domain = read("volley-ranking-system/functions/src/groups/domain/season.js");
  const store = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreSeasonUpdateStore.js");
  const frontend = read("volley-ranking-frontend/src/components/seasons/EditSeasonSection.tsx");
  assert.doesNotMatch(domain, /schemaVersion\s*[=:]\s*[34]|revision|updatedAt|updatedBy/);
  assert.match(store, /updateName/); assert.doesNotMatch(store, /fechaInicio\s*:/);
  assert.doesNotMatch(frontend, /firebase\/firestore|fechaInicio|reabrir|renovar|invit/i);
  assert.match(read("volley-ranking-system/firestore.rules"), /match \/seasonUpdateReceipts\/\{receiptId\}[\s\S]*allow read, write: if false/);
  assert.match(read("volley-ranking-system/functions/index.js"), /exports\.updateSeason/);
});

test("E2-17 UI limita edición a Actual y cubre retry, stale, foco y accesibilidad", () => {
  const history = read("volley-ranking-frontend/src/components/seasons/SeasonHistorySection.tsx");
  const edit = read("volley-ranking-frontend/src/components/seasons/EditSeasonSection.tsx");
  assert.match(history, /EditSeasonSection[\s\S]*OpenSeasonSection/);
  for (const pattern of [/getOwnSeason/, /expectedEditToken/, /intent/, /sendingRef\.current/, /STALE_UPDATE/,
    /Escape/, /queueMicrotask.*focus/, /aria-live/, /aria-busy/, /htmlFor="season-edit-name"/, /sm:/]) assert.match(edit, pattern);
  assert.doesNotMatch(edit, /type="date"|fechaInicio/);
});

test("E2-17 no altera índices ni receipts E2-02/E2-15", () => {
  const indexes = read("volley-ranking-system/firestore.indexes.json");
  assert.doesNotMatch(indexes, /seasonUpdateReceipts/);
  const receipts = read("volley-ranking-system/functions/src/groups/infrastructure/seasonReceipts.js");
  assert.match(receipts, /OPENING_V1_FIELDS/); assert.match(receipts, /OPENING_V2_FIELDS/); assert.match(receipts, /CLOSURE_FIELDS/);
  assert.doesNotMatch(read("volley-ranking-system/functions/src/groups/infrastructure/firestoreOpenSeasonGuard.js"), /seasonUpdateReceipts/);
  assert.doesNotMatch(read("volley-ranking-system/functions/src/groups/infrastructure/firestoreSeasonClosureStore.js"), /seasonUpdateReceipts/);
});
