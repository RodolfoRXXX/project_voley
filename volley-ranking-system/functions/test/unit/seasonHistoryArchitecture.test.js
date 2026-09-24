"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("E2-16 conserva reader único, cero writers y consulta exacta", () => {
  const reader = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreSeasonHistoryReader.js");
  for (const pattern of [/where\("groupId", "==", groupId\)/, /where\("estado", "==", "abierta"\)\.limit\(2\)/, /where\("estado", "==", "cerrada"\)/, /orderBy\("fechaInicio", "desc"\)/, /FieldPath\.documentId\(\), "desc"/, /startAfter\(position\.last\.fechaInicio, position\.last\.seasonId\)/, /limit\(pageSize \+ 1\)/, /runTransaction/]) assert.match(reader, pattern);
  assert.doesNotMatch(reader, /transaction\.(create|set|update|delete)|\.add\(/);
  assert.doesNotMatch(reader, /memberships|personas|requests|matches|tournaments|receipt|guard/i);
  const application = ["seasonService.js", "seasonHistoryCursor.js", "seasonDto.js"].map((file) => read(`volley-ranking-system/functions/src/groups/application/${file}`)).join("\n");
  assert.doesNotMatch(application, /firebase-admin|firebase\/firestore|collection\(/);
});

test("E2-16 registra callable, índice único exacto y Rules deny-all", () => {
  assert.match(read("volley-ranking-system/functions/index.js"), /exports\.listSeasonsForOwnedGroup/);
  const indexes = JSON.parse(read("volley-ranking-system/firestore.indexes.json"));
  const wanted = [
    { fieldPath: "groupId", mode: "ASCENDING" },
    { fieldPath: "estado", mode: "ASCENDING" },
    { fieldPath: "fechaInicio", mode: "DESCENDING" },
  ];
  assert.equal(indexes.indexes.filter((index) => index.collectionGroup === "seasons" && index.queryScope === "COLLECTION" && JSON.stringify(index.fields) === JSON.stringify(wanted)).length, 1);
  const rules = read("volley-ranking-system/firestore.rules");
  for (const collection of ["seasons", "openSeasonGuards", "seasonOpeningReceipts", "seasonClosureReceipts"]) assert.match(rules, new RegExp(`match \/${collection}.*[\\s\\S]{0,100}allow read, write: if false`));
});

test("presentación E2-16 sólo usa callable y cubre estados/accesibilidad", () => {
  const ui = read("volley-ranking-frontend/src/components/seasons/SeasonHistorySection.tsx");
  const service = read("volley-ranking-frontend/src/services/seasonsService.ts");
  assert.doesNotMatch(`${ui}\n${service}`, /firebase\/firestore|collection\(|getDoc\(|setDoc\(|updateDoc\(/);
  for (const marker of ["Actual", "Anteriores", "No hay una Temporada actual", "Todavía no hay temporadas anteriores", "Cargar más", "Reintentar", "CURSOR_STALE", "CURSOR_INVALID", "aria-live", "aria-busy", "tabIndex={-1}", "min-h-11", "sm:grid-cols-2"]) assert.match(ui, new RegExp(marker));
  assert.match(ui, /inFlight\.current/); assert.match(ui, /generation\.current/); assert.match(ui, /priorIds/);
  assert.doesNotMatch(ui, />\s*(Editar|Reabrir|Renovar|Eliminar|Invitar|Administrar integrantes)/i);
});

test("E2-16 no crea Agregado, proyección, E2-17 ni E2-18", () => {
  const files = fs.readdirSync(path.join(root, "volley-ranking-system/functions/src/groups/domain"));
  assert.deepEqual(files.sort(), ["group.js", "season.js"]);
  const source = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreSeasonHistoryReader.js");
  assert.doesNotMatch(source, /collection\(["']seasonHistory["']\)|E2-17|E2-18|renew|reopen/i);
});
