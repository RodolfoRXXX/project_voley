"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "../..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }
test("Dominio y Aplicación de Solicitud no importan Firebase/Admin SDK", () => {
  for (const file of ["src/groupJoinRequests/domain/groupJoinRequest.js", "src/groupJoinRequests/application/groupJoinRequestService.js", "src/groupJoinRequests/application/groupJoinRequestContract.js", "src/groupJoinRequests/application/groupJoinRequestDto.js", "src/groupJoinRequests/application/groupJoinRequestHashing.js", "src/groupJoinRequests/application/groupJoinRequestCursor.js"]) assert.doesNotMatch(read(file), /firebase-admin|firebase-functions|firestore/i, file);
  assert.doesNotMatch(read("src/groupJoinRequests/application/groupJoinRequestHashing.js"), /memberships|groups|persons/i);
});
test("cinco callables están compuestos y el flujo no toca legado ni otros Agregados", () => {
  const index = read("index.js");
  for (const name of ["getKnownGroupJoinPreview", "createMyGroupJoinRequest", "getMyCurrentGroupJoinRequest", "cancelMyGroupJoinRequest", "listPendingGroupJoinRequestsForOwnedGroup"]) assert.match(index, new RegExp(`exports\\.${name}`));
  const store = read("src/groupJoinRequests/infrastructure/firestoreGroupJoinRequestStore.js");
  for (const prohibited of ["pendingRequestIds", "pendingAdminRequestIds", "memberIds", "adminIds", "notifications", "activities", "seasons"]) assert.equal(store.includes(prohibited), false, prohibited);
  assert.doesNotMatch(store, /transaction\.(set|create|update|delete).*memberships|collection\("groups"\).*\.(set|update)/s);
});
test("Solicitud consume otros Agregados exclusivamente mediante capacidades públicas", () => {
  const moduleRoot = path.join(root, "src/groupJoinRequests");
  const files = fs.readdirSync(moduleRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(entry.parentPath || entry.path, entry.name));
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const foreignImports = [...source.matchAll(/require\(["'](\.\.\/\.\.\/(groups|persons|memberships|users)\/[^"']+)["']\)/g)];
    for (const match of foreignImports) assert.match(match[1], /\/public\/groupJoinRequest[A-Za-z]+Capability$/, `${path.relative(root, file)}: ${match[1]}`);
  }
  for (const capability of ["groups/public/groupJoinRequestGroupCapability.js", "persons/public/groupJoinRequestPersonCapability.js", "memberships/public/groupJoinRequestMembershipCapability.js", "users/public/groupJoinRequestAccountCapability.js"]) assert.equal(fs.existsSync(path.join(root, "src", capability)), true, capability);
});
test("frontend E2-06 usa callables sin Firestore, incluye accesibilidad y no resuelve solicitudes", () => {
  const service = fs.readFileSync(path.resolve(root, "../../volley-ranking-frontend/src/services/groupJoinRequestsService.ts"), "utf8");
  const candidate = fs.readFileSync(path.resolve(root, "../../volley-ranking-frontend/src/components/groupJoinRequests/GroupJoinRequestCandidate.tsx"), "utf8");
  const owner = fs.readFileSync(path.resolve(root, "../../volley-ranking-frontend/src/components/groupJoinRequests/PendingGroupJoinRequestsSection.tsx"), "utf8");
  assert.match(service, /firebase\/functions/); assert.doesNotMatch(service + candidate + owner, /firebase\/firestore|approve|reject|aprobar|rechazar/i);
  for (const marker of ["role=\"status\"", "role=\"alert\"", "aria-live", "alertdialog", "Escape", "min-h-11"]) assert.equal(candidate.includes(marker) || owner.includes(marker), true, marker);
  for (const marker of ["useRef(newKey())", "retryAction.current", "busy.current", "keyRef.current = newKey()", "navigator.clipboard.writeText", "Enlace copiado."]) assert.equal(candidate.includes(marker) || owner.includes(marker), true, marker);
});
test("reglas e índice declaran exclusivamente la persistencia aprobada", () => {
  const rules = fs.readFileSync(path.resolve(root, "../firestore.rules"), "utf8");
  for (const collection of ["groupJoinRequests", "pendingGroupJoinRequestGuards", "groupJoinRequestIntents"]) assert.match(rules, new RegExp(`match /${collection}`));
  const indexes = JSON.parse(fs.readFileSync(path.resolve(root, "../firestore.indexes.json"), "utf8"));
  assert.equal(indexes.indexes.length, 11); assert.deepEqual(indexes.fieldOverrides, []);
  const target = indexes.indexes.filter((item) => item.collectionGroup === "groupJoinRequests"); assert.equal(target.length, 1); assert.deepEqual(target[0].fields, [{ fieldPath: "groupId", mode: "ASCENDING" }, { fieldPath: "estado", mode: "ASCENDING" }, { fieldPath: "createdAt", mode: "DESCENDING" }]);
});
