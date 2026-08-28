"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

test("Dominio y Aplicación de Membresía no importan Firebase ni Agregados externos", () => {
  const files = ["membership.js", "../application/membershipService.js", "../application/membershipDto.js", "../application/membershipContract.js"];
  const source = files.map((file) => read(`volley-ranking-system/functions/src/memberships/domain/${file}`)).join("\n");
  assert.doesNotMatch(source, /firebase-admin|firebase\/functions|firestoreSeasonRepository|openSeasonGuards/);
  assert.doesNotMatch(read("volley-ranking-system/functions/src/memberships/domain/membership.js"), /ownerId|memberIds|adminIds|roles|plan|subscription/i);
});

test("Módulo consume Temporada por capacidad pública y no por persistencia interna", () => {
  const moduleSource = read("volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js");
  assert.match(moduleSource, /groups\/infrastructure\/seasonModule/);
  assert.doesNotMatch(moduleSource, /firestoreSeasonRepository|firestoreOpenSeasonReader|firestoreOpenSeasonGuard|openSeasonGuards|collection\("seasons"\)/);
});

test("repositorio de Membresía es exclusivo y usa consulta exacta limit 2", () => {
  const repository = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipRepository.js");
  assert.match(repository, /collection\("memberships"\)/);
  for (const term of [/where\("personId"/, /where\("groupId"/, /where\("estado"/, /\.limit\(2\)/]) assert.match(repository, term);
  assert.doesNotMatch(repository, /collection\("(users|personas|groups|seasons|requests)"\)/);
});

test("frontend owner-scoped usa callables, explicitud, single-flight, retry estable y accesibilidad", () => {
  const files = [
    "volley-ranking-frontend/src/components/memberships/OwnMembershipSection.tsx",
    "volley-ranking-frontend/src/services/membershipsService.ts",
    "volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/page.tsx",
  ];
  const source = files.map(read).join("\n");
  assert.doesNotMatch(source, /firebase\/firestore|collection\(|getDoc\(|setDoc\(|updateDoc\(/);
  for (const pattern of [/Incorporarme como integrante/, /sendingRef\.current/, /createMembershipIntent/, /Reconsultar estado de Membresía/, /Comenzar una nueva intención/, /aria-live/, /role="alert"/, /min-h-11/, /sm:/, /OwnMembershipSection/]) assert.match(source, pattern);
  assert.doesNotMatch(source, /Membresías todavía vacías/);
});

test("nuevo flujo no usa ni escribe contratos legacy o efectos laterales", () => {
  const directory = path.join(root, "volley-ranking-system/functions/src/memberships");
  const queue = [directory];
  const files = [];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(target); else if (entry.name.endsWith(".js")) files.push(target);
    }
  }
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /memberIds|adminIds|pendingRequestIds|pendingAdminRequestIds|playerIds|posicionesPreferidas|notification|alert|activity|payment|match|tournament/i);
});
