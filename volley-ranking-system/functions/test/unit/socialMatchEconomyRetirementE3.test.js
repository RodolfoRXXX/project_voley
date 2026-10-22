"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const functionsRoot = path.resolve(__dirname, "../..");
const repositoryRoot = path.resolve(functionsRoot, "../..");

function read(...segments) {
  return fs.readFileSync(path.join(...segments), "utf8");
}

function listSourceFiles(root, extensions) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (["node_modules", ".next", "test"].includes(entry.name)) continue;
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(target, extensions));
    else if (extensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

test("E3-09 retira writers y consumidores productivos de pagoEstado", () => {
  const backendFiles = listSourceFiles(functionsRoot, new Set([".js"]));
  const frontendRoot = path.join(repositoryRoot, "volley-ranking-frontend", "src");
  const frontendFiles = listSourceFiles(frontendRoot, new Set([".ts", ".tsx"]));

  for (const file of [...backendFiles, ...frontendFiles]) {
    const source = read(file);
    assert.doesNotMatch(source, /pagoEstado/, path.relative(repositoryRoot, file));
  }

  const joinMatch = read(functionsRoot, "callables", "joinMatch.js");
  const replacement = read(functionsRoot, "src", "services", "replacementService.js");
  const ranking = read(functionsRoot, "src", "services", "rankingService.js");
  const adminMatch = read(functionsRoot, "src", "services", "adminMatchService.js");
  assert.doesNotMatch(joinMatch, /actualizarPago|pagoEstado/);
  assert.doesNotMatch(replacement, /actualizarPago|pagoEstado|postDeadline/);
  assert.doesNotMatch(ranking, /actualizarPago|pagoEstado/);
  assert.doesNotMatch(adminMatch, /actualizarPago|pagoEstado|PENDING_PAYMENTS/);
});

test("E3-09 conserva el tombstone exportado con precedencia y error estables", () => {
  const callable = read(functionsRoot, "callables", "updatePagoEstado.js");
  const index = read(functionsRoot, "index.js");
  const orderedTokens = [
    "if (!context.auth)",
    "if (!participationId || !estado)",
    "await assertIsAdmin",
    "await assertParticipationMatchAdmin",
    '!["confirmado", "pendiente", "pospuesto"].includes(estado)',
    '"SOCIAL_MATCH_PAYMENT_RETIRED"',
  ];
  let previous = -1;
  for (const token of orderedTokens) {
    const current = callable.indexOf(token);
    assert.ok(current > previous, token);
    previous = current;
  }
  assert.match(callable, /La gestión económica de partidos sociales fue retirada/);
  assert.doesNotMatch(callable, /return\s+\{\s*ok:\s*true|\.update\(|\.set\(|\.create\(/);
  assert.match(index, /exports\.updatePagoEstado\s*=/);
});

test("E3-09 retira onMatchClose y conserva cierre explícito deportivo", () => {
  const index = read(functionsRoot, "index.js");
  const adminMatch = read(functionsRoot, "src", "services", "adminMatchService.js");
  const closeCallable = read(functionsRoot, "callables", "cerrarMatch.js");
  assert.equal(fs.existsSync(path.join(functionsRoot, "src", "triggers", "onMatchClose.js")), false);
  assert.doesNotMatch(index, /onMatchClose/);
  assert.match(adminMatch, /match\.lock === true/);
  assert.match(adminMatch, /match\.posicionesObjetivo/);
  assert.match(adminMatch, /participationsSnap\.size < titularesEsperados/);
  assert.match(closeCallable, /MATCH_LOCKED/);
  assert.match(closeCallable, /INCOMPLETE_ROSTER/);
});

test("E3-09 retira UI y contrato económico de partidos sociales", () => {
  const frontendRoot = path.join(repositoryRoot, "volley-ranking-frontend", "src");
  const page = read(
    frontendRoot,
    "app",
    "(protected)",
    "profile",
    "groups",
    "[groupId]",
    "matches",
    "[matchId]",
    "page.tsx"
  );
  const actions = read(frontendRoot, "components", "matchDetail", "MatchActions.tsx");
  assert.equal(fs.existsSync(path.join(frontendRoot, "components", "pagoModal", "pagoModal.tsx")), false);
  for (const source of [page, actions]) {
    assert.doesNotMatch(source, /updatePagoEstado|PagoModal|pagoModal|hayPagosPendientes|pagoEstado/);
  }
  assert.doesNotMatch(page, />Pago<|Estado de pago|Todos los titulares deben tener un pago/);
});
