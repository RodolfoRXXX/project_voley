"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../../../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("E1-02 usa callables y una unidad transaccional específica", () => {
  const exportsSource = read("volley-ranking-system/functions/index.js");
  const unit = read("volley-ranking-system/functions/src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork.js");
  const personRepository = read("volley-ranking-system/functions/src/persons/infrastructure/firestorePersonRepository.js");
  const userRepository = read("volley-ranking-system/functions/src/users/infrastructure/firestoreUserPersonLinkRepository.js");
  assert.match(exportsSource, /ensureMyPerson/);
  assert.match(exportsSource, /getMyPerson/);
  assert.match(unit, /runTransaction/);
  assert.match(unit, /personRepository\.createInitial/);
  assert.match(unit, /userRepository\.setInitialPersonLink/);
  assert.match(personRepository, /transaction\.create/);
  assert.match(userRepository, /transaction\.update/);
  assert.doesNotMatch(unit, /updatedAt|set\s*\(/);
});

test("Persona persiste el esquema físico exacto y las reglas niegan acceso cliente", () => {
  const unit = read("volley-ranking-system/functions/src/infrastructure/firestoreSelfPersonBootstrapUnitOfWork.js");
  const personRepository = read("volley-ranking-system/functions/src/persons/infrastructure/firestorePersonRepository.js");
  const rules = read("volley-ranking-system/firestore.rules");
  for (const field of ["nombre", "apellido", "emailContacto", "createdAt"]) assert.match(personRepository, new RegExp(`\\b${field}\\b`));
  assert.match(rules, /match \/personas\/\{personaId\}[\s\S]*?allow read, write: if false/);
});

test("frontend consulta Persona sólo por servicio y conserva proveedor separado", () => {
  const provider = read("volley-ranking-frontend/src/components/providers/PersonProvider.tsx");
  const service = read("volley-ranking-frontend/src/services/personService.ts");
  const layout = read("volley-ranking-frontend/src/app/layout.tsx");
  assert.match(provider, /accountStatus !== "ready"/);
  assert.match(provider, /inFlight\.current/);
  assert.doesNotMatch(provider, /firebase\/firestore|setDoc|updateDoc/);
  assert.match(service, /ensureMyPerson/);
  assert.match(service, /getMyPerson/);
  assert.match(layout, /<AuthProvider>[\s\S]*<PersonProvider>/);
});

test("UI expone ruta, navegación y tarjeta sin reactivar redirects neutrales", () => {
  const page = read("volley-ranking-frontend/src/app/(protected)/profile/person/page.tsx");
  const sidebar = read("volley-ranking-frontend/src/components/layout/AppSidebar.tsx");
  const navbar = read("volley-ranking-frontend/src/components/layout/Navbar.tsx");
  const dashboard = read("volley-ranking-frontend/src/app/(protected)/dashboard/page.tsx");
  assert.match(page, /PersonBootstrapForm/);
  for (const source of [sidebar, navbar, dashboard]) assert.match(source, /\/profile\/person/);
  assert.doesNotMatch(dashboard, /incremento posterior/);
});
