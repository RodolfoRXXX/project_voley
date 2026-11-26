"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-11B integra la revisión sólo en Ficha personal y usa callables", () => {
  const page = read("volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx");
  const component = read("volley-ranking-frontend/src/components/person/AdministrativePersonLinkingSection.tsx");
  const service = read("volley-ranking-frontend/src/services/administrativePersonLinksService.ts");
  assert.match(page, /AdministrativePersonLinkingSection/);
  for (const label of ["Ahora no", "Esta ficha no es mía", "Reconsiderar", "Pendientes de fusión", "otro corte"]) assert.match(component, new RegExp(label));
  for (const callable of ["listMyAdministrativePersonLinkCandidates", "getMyAdministrativePersonLinkCandidate", "rejectMyAdministrativePersonLinkCandidate", "reconsiderMyAdministrativePersonLinkCandidate", "recognizeMyAdministrativePersonLinkCandidate"]) assert.match(service, new RegExp(callable));
  assert.doesNotMatch(service, /firebase\/firestore|collection\(|doc\(/);
});

test("IUX-11B descarta respuestas al cambiar de Cuenta y refresca Persona tras adoptar", () => {
  const component = read("volley-ranking-frontend/src/components/person/AdministrativePersonLinkingSection.tsx");
  const service = read("volley-ranking-frontend/src/services/administrativePersonLinksService.ts");
  const page = read("volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx");
  assert.match(component, /generation\.current/); assert.match(component, /request !== generation\.current/);
  assert.match(page, /key=\{account\.userId\}/); assert.match(component, /await onAdopted\(\)/);
  assert.match(component, /intentions\.current\.get/); assert.match(component, /completeIntention/);
  assert.doesNotMatch(service, /crypto\.randomUUID/); assert.match(service, /idempotencyKey: string/);
});

test("IUX-11B mantiene raíces privadas, flag y secretos separados", () => {
  const rules = read("volley-ranking-system/firestore.rules");
  const projection = read("volley-ranking-system/functions/src/administrativePersonLinks/infrastructure/administrativePersonLinkCandidateProjection.js");
  for (const collection of ["administrativePersonLinkCandidates", "accountVerifiedEmailCredentials", "administrativePersonLinkDecisions", "administrativePersonLinkReceipts", "administrativePersonLinkRateLimits", "personAccountAssignments"]) assert.match(rules, new RegExp(collection));
  assert.match(projection, /ENABLE_IUX11B_LINKING/); assert.match(projection, /IUX11B_EMAIL_HMAC_SECRET/);
});
