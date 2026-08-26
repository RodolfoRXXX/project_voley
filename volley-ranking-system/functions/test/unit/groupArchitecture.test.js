"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

test("dominio y servicio de Grupo no importan Firebase/Admin SDK", () => {
  for (const file of [
    "volley-ranking-system/functions/src/groups/domain/group.js",
    "volley-ranking-system/functions/src/groups/application/groupService.js",
    "volley-ranking-system/functions/src/groups/application/groupDto.js",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /firebase-admin|firebase\/functions|\.\.\/\.\.\/firebase/);
  }
});

test("flujo E2-01 no usa roles, Persona, Membresía, Temporada ni Comercial", () => {
  const directory = path.join(root, "volley-ranking-system/functions/src/groups");
  const files = fs.readdirSync(path.join(directory, "application")).map((name) => path.join(directory, "application", name));
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /users\.roles|personaId|memberIds|adminIds|temporada|subscription|plan/i);
});

test("rutas owner-scoped usan contratos y no importan Firestore", () => {
  const base = "volley-ranking-frontend/src/app/(protected)/dashboard/groups";
  for (const file of ["page.tsx", "new/page.tsx", "[groupId]/page.tsx"]) {
    const source = read(`${base}/${file}`);
    assert.doesNotMatch(source, /firebase\/firestore|collection\(|addDoc\(|getDocs\(/);
    assert.match(source, /groupsService|GroupPageShell/);
  }
});

test("alta directa legada fue retirada y las superficies legadas fallan ante schema v1", () => {
  assert.doesNotMatch(read("volley-ranking-frontend/src/app/(admin)/admin/groups/new/page.tsx"), /addDoc|firebase\/firestore|roles/);
  assert.match(read("volley-ranking-system/functions/src/services/groupAdminsService.js"), /schemaVersion === 1/);
  assert.match(read("volley-ranking-system/functions/src/triggers/onGroupPendingAlertsSync.js"), /schemaVersion === 1/);
});

test("frontend cubre vacío, loading, doble submit, errores, Owner y estado deportivo vacío", () => {
  const list = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  const form = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/new/page.tsx");
  const detail = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  assert.match(list, /Todavía no tenés un Grupo propio/);
  assert.match(list, /GroupLoading/);
  assert.match(form, /sendingRef\.current|randomUUID|aria-live|role="alert"/);
  for (const reason of ["VALIDATION_FAILED", "PROVISIONAL_LIMIT_REACHED", "CONFLICT", "DEPENDENCY_UNAVAILABLE", "NOT_AUTHORIZED"]) {
    assert.match(read("volley-ranking-frontend/src/services/groupsService.ts"), new RegExp(reason));
  }
  assert.match(detail, /Membresías/);
  assert.match(detail, /Temporada/);
  assert.match(detail, /Owner/);
  assert.match(detail, /sm:|lg:/);
});
