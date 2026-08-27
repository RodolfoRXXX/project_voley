"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

test("Temporada es independiente y Dominio/Aplicación no importan Firebase", () => {
  for (const file of [
    "volley-ranking-system/functions/src/groups/domain/season.js",
    "volley-ranking-system/functions/src/groups/application/seasonService.js",
    "volley-ranking-system/functions/src/groups/application/seasonDto.js",
  ]) assert.doesNotMatch(read(file), /firebase-admin|firebase\/functions|\.\.\/\.\.\/firebase/);
  const group = read("volley-ranking-system/functions/src/groups/domain/group.js");
  assert.doesNotMatch(group, /season|temporada|openSeason/i);
});

test("flujo E2-02 no usa roles, arrays, Persona, Membresía ni Comercial", () => {
  const files = ["seasonService.js", "seasonContract.js", "seasonDto.js", "seasonHashing.js"];
  const source = files.map((file) => read(`volley-ranking-system/functions/src/groups/application/${file}`)).join("\n");
  assert.doesNotMatch(source, /users\.roles|memberIds|adminIds|personaId|membership|subscription|plan/i);
});

test("repositorios de Grupo y Temporada permanecen separados y Grupo no se escribe", () => {
  const seasonRepository = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreSeasonRepository.js");
  const guard = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreOpenSeasonGuard.js");
  assert.doesNotMatch(seasonRepository, /collection\("groups"\)|ownerId/);
  assert.doesNotMatch(guard, /groupRepository\.create|transaction\.(create|set|update)\([^\n]*group/i);
  assert.doesNotMatch(read("volley-ranking-system/functions/src/groups/infrastructure/seasonModule.js"), /groupCreationGuards|ownGroupsReader/);
});

test("frontend de Temporada usa callables, estados accesibles y no Firestore directo", () => {
  const files = [
    "volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx",
    "volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/seasons/new/page.tsx",
    "volley-ranking-frontend/src/components/seasons/OpenSeasonSection.tsx",
    "volley-ranking-frontend/src/components/seasons/OpenSeasonForm.tsx",
    "volley-ranking-frontend/src/services/seasonsService.ts",
  ];
  const source = files.map(read).join("\n");
  assert.doesNotMatch(source, /firebase\/firestore|collection\(|addDoc\(|getDocs\(/);
  for (const phrase of ["Crear y abrir temporada", "no incorpora integrantes", "operaciones deportivas", "aria-live", "sendingRef.current", "randomUUID", "Membresía", "Owner"]) assert.match(source, new RegExp(phrase, "i"));
  for (const reason of ["OPEN_SEASON_ALREADY_EXISTS", "IDEMPOTENCY_CONFLICT", "INCOMPATIBLE_STATE", "DEPENDENCY_UNAVAILABLE", "NOT_AUTHORIZED"]) assert.match(source, new RegExp(reason));
});

test("frontend cubre vacío, formulario, validación, retry estable, confirmación y límites owner-scoped", () => {
  const form = read("volley-ranking-frontend/src/components/seasons/OpenSeasonForm.tsx");
  const section = read("volley-ranking-frontend/src/components/seasons/OpenSeasonSection.tsx");
  const detail = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx");
  for (const pattern of [
    /estado válido/i,
    /Crear y abrir temporada/,
    /htmlFor="season-name"/,
    /htmlFor="season-start-date"/,
    /isRealIsoDate/,
    /sendingRef\.current/,
    /EXISTING_IDEMPOTENT|result\.season\.id/,
    /OPEN_SEASON_ALREADY_EXISTS/,
    /getOpenSeasonContext/,
    /getOwnSeason/,
    /role="alert"/,
    /aria-live/,
    /queueMicrotask.*focus/,
    /min-h-11/,
    /sm:/,
  ]) assert.match(`${form}\n${section}`, pattern);
  assert.match(form, /intentSignature/);
  assert.match(form, /attemptedPayload !== intentSignature/);
  assert.match(form, /Owner.*Persona.*Membresía/);
  assert.match(detail, /Membresías todavía vacías/);
  assert.doesNotMatch(`${form}\n${section}`, /overflow-x|Partido|Torneo|posición|dorsal/);
});

test("E2-03 dispone sólo del contrato público contextual y no de internals", () => {
  assert.match(read("volley-ranking-system/functions/index.js"), /exports\.getOpenSeasonContext/);
  const dto = read("volley-ranking-system/functions/src/groups/application/seasonDto.js");
  assert.doesNotMatch(dto, /schemaVersion|guard|hash|DocumentSnapshot/);
  assert.doesNotMatch(read("volley-ranking-frontend/src/types/OwnSeason.ts"), /schemaVersion|ownerUid|fechaCierre/);
});
