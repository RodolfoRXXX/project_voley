"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

test("Dominio y Aplicación de Membresía no importan Firebase ni Agregados externos", () => {
  const files = ["membership.js", "../application/membershipService.js", "../application/membershipDto.js", "../application/membershipContract.js", "../application/membershipObservability.js"];
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

test("E2-04 usa puertos member-safe, un único callable y capacidades internas no callables", () => {
  const moduleSource = read("volley-ranking-system/functions/src/memberships/infrastructure/membershipModule.js");
  const readerSource = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreMyCurrentGroupMembershipsReader.js");
  const indexSource = read("volley-ranking-system/functions/index.js");
  assert.match(moduleSource, /groups\/infrastructure\/memberContextModule/);
  assert.doesNotMatch(readerSource, /firestore(Group|Season)Repository|openSeasonGuards|collection\("groups"\)|collection\("seasons"\)/);
  assert.match(indexSource, /listMyCurrentGroupMemberships/);
  assert.doesNotMatch(indexSource, /getMemberReadableGroupContext|getOpenSeasonContextForMembership/);
  const memberContext = read("volley-ranking-system/functions/src/groups/infrastructure/firestoreMemberContext.js");
  for (const pattern of [/collection\("seasons"\)/, /where\("groupId", "=="/, /where\("estado", "==", "abierta"\)/, /\.limit\(2\)/]) {
    assert.match(memberContext, pattern);
  }
});

test("consulta e índice E2-04 conservan orden exacto y no declaran __name__", () => {
  const reader = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreMyCurrentGroupMembershipsReader.js");
  for (const pattern of [/where\("personId", "=="/, /where\("estado", "==", "activa"\)/, /orderBy\("fechaIngreso", "desc"\)/, /orderBy\(FieldPath\.documentId\(\), "desc"\)/, /pageSize \+ 1/, /\.slice\(0, pageSize\)/]) assert.match(reader, pattern);
  const indexes = JSON.parse(read("volley-ranking-system/firestore.indexes.json"));
  const membershipIndexes = indexes.indexes.filter((index) => index.collectionGroup === "memberships");
  assert.deepEqual(membershipIndexes, [
    { collectionGroup: "memberships", queryScope: "COLLECTION", fields: [
      { fieldPath: "personId", mode: "ASCENDING" }, { fieldPath: "groupId", mode: "ASCENDING" }, { fieldPath: "estado", mode: "ASCENDING" },
    ] },
    { collectionGroup: "memberships", queryScope: "COLLECTION", fields: [
      { fieldPath: "personId", mode: "ASCENDING" }, { fieldPath: "estado", mode: "ASCENDING" }, { fieldPath: "fechaIngreso", mode: "DESCENDING" },
    ] },
  ]);
  assert.equal(JSON.stringify(membershipIndexes).includes("__name__"), false);
});

test("dashboard separa ownership y pertenencia sin Firestore ni navegación administrativa member-scoped", () => {
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/page.tsx");
  const section = read("volley-ranking-frontend/src/components/memberships/MyCurrentGroupMembershipsSection.tsx");
  const service = read("volley-ranking-frontend/src/services/membershipsService.ts");
  assert.match(page, /Grupos que administrás/);
  assert.match(section, /Grupos que integrás/);
  assert.match(section, /PERSON_REQUIRED/);
  assert.match(section, /Ver página siguiente/);
  assert.match(section, /aria-live|role="alert"/);
  assert.match(section, /focus-visible/);
  assert.doesNotMatch(section, /dashboard\/groups\/\[groupId\]|href=.*dashboard\/groups|profile\/groups|firebase\/firestore/);
  assert.match(service, /listMyCurrentGroupMemberships/);
  assert.doesNotMatch(`${page}\n${section}\n${service}`, /firebase\/firestore|collection\(|getDoc\(/);
});

test("E2-05 arquitectura, timestamp y frontend se verifican estructuralmente (no conducta)", () => {
  const lifecycle = read("volley-ranking-system/functions/src/memberships/infrastructure/firestoreMembershipLifecycleGuard.js");
  const service = read("volley-ranking-system/functions/src/memberships/application/membershipService.js");
  const component = read("volley-ranking-frontend/src/components/memberships/OwnMembershipSection.tsx");
  const frontendService = read("volley-ranking-frontend/src/services/membershipsService.ts");
  assert.match(lifecycle, /now = \(\) => Timestamp\.now\(\)/);
  assert.match(lifecycle, /const finalizedAt = now\(\)/);
  assert.equal((lifecycle.match(/Timestamp\.now\(\)/g) || []).length, 1);
  for (const pattern of [/updateFinalized/, /transaction\.delete\(activeRef\)/, /transaction\.create\(lifecycleRef/, /membership\.finalize\(finalizedAt\)/]) assert.match(lifecycle, pattern);
  assert.doesNotMatch(`${service}\n${read("volley-ranking-system/functions/src/memberships/domain/membership.js")}`, /firebase-admin|firebase\/functions/);
  assert.doesNotMatch(lifecycle, /FieldValue\.serverTimestamp/);
  for (const pattern of [/Finalizar mi Membresía/, /Confirmar finalización/, /conservar el ownership/, /reactivación todavía no está disponible/, /finalizeMyMembershipForOwnedGroup/, /membershipFinalizationMachine/, /aria-live/, /alertdialog/]) assert.match(`${component}\n${frontendService}`, pattern);
  assert.doesNotMatch(`${component}\n${frontendService}`, /firebase\/firestore|updateDoc\(|setDoc\(/);
  assert.match(read("volley-ranking-system/functions/index.js"), /finalizeMyMembershipForOwnedGroup/);
});
