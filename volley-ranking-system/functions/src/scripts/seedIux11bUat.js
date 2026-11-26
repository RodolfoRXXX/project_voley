"use strict";

const ALLOWED_EMULATOR_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const RESERVED_PREFIX = "iux11b-uat-";

function explicitProject(argv) {
  if (argv.length !== 2 || argv[0] !== "--project" || !/^demo-[a-z0-9-]+$/.test(argv[1])) {
    throw new Error("Usage: npm run iux-11b:uat:seed -- --project demo-<isolated-name>");
  }
  return argv[1];
}

function requireLoopbackEmulator(value, variable) {
  if (typeof value !== "string" || !value.trim() || value.includes("://")) throw new Error(`${variable} must be an explicit loopback host:port`);
  let parsed;
  try { parsed = new URL(`http://${value.trim()}`); } catch { throw new Error(`${variable} must be an explicit loopback host:port`); }
  if (!ALLOWED_EMULATOR_HOSTS.has(parsed.hostname) || !parsed.port || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`${variable} must target localhost, 127.0.0.1 or ::1 with an explicit port`);
  }
}

function configuredFirebaseProject(env) {
  if (!env.FIREBASE_CONFIG) return null;
  try { return JSON.parse(env.FIREBASE_CONFIG).projectId || null; }
  catch { throw new Error("FIREBASE_CONFIG must be valid JSON when present"); }
}

function requireLocal(argv, env) {
  const projectId = explicitProject(argv);
  requireLoopbackEmulator(env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST");
  requireLoopbackEmulator(env.FIREBASE_AUTH_EMULATOR_HOST, "FIREBASE_AUTH_EMULATOR_HOST");
  for (const configured of [env.GCLOUD_PROJECT, env.GOOGLE_CLOUD_PROJECT, configuredFirebaseProject(env)].filter(Boolean)) {
    if (configured !== projectId) throw new Error(`Configured project ${configured} does not match explicit demo project ${projectId}`);
  }
  return projectId;
}

async function upsertAuth(admin, uid, email, password) {
  const providerToLink = { providerId: "google.com", uid: email, email, displayName: uid };
  try {
    await admin.auth().getUser(uid);
    return admin.auth().updateUser(uid, { email, password, emailVerified: true, displayName: uid, providerToLink });
  }
  catch (error) { if (error.code !== "auth/user-not-found") throw error; return admin.auth().createUser({ uid, email, password, emailVerified: true, displayName: uid, providerToLink }); }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const projectId = requireLocal(argv, env);
  env.GCLOUD_PROJECT = projectId;
  env.GOOGLE_CLOUD_PROJECT = projectId;
  const { admin, db } = require("../firebase");
  const at = admin.firestore.Timestamp.fromDate(new Date("2026-11-26T15:00:00Z"));
  const password = "Sportexa-IUX11B-UAT!";
  const accounts = [
    { uid: "iux11b-uat-adopt", email: "iux11b-adopt@example.invalid", nombre: "Adopta" },
    { uid: "iux11b-uat-merge", email: "iux11b-merge@example.invalid", nombre: "Fusiona", personaId: "iux11b-uat-own-person" },
    { uid: "iux11b-uat-owner", email: "iux11b-owner@example.invalid", nombre: "Owner" },
  ];
  for (const account of accounts) { await upsertAuth(admin, account.uid, account.email, password); await db.doc(`users/${account.uid}`).set({ nombre: account.nombre, email: account.email, photoURL: "", createdAt: at, ...(account.personaId ? { personaId: account.personaId } : {}) }); }
  await db.doc("personas/iux11b-uat-own-person").set({ nombre: "Ficha", apellido: "Propia", emailContacto: "iux11b-merge@example.invalid", createdAt: at });
  await db.doc("groups/iux11b-uat-group").set({ nombre: "Club histórico IUX-11B", deporte: "voleibol", ownerId: "iux11b-uat-owner", estado: "archivado", createdAt: at, archivedAt: at, schemaVersion: 2 });
  await db.doc("seasons/iux11b-uat-season").set({ groupId: "iux11b-uat-group", nombre: "Temporada 2025", fechaInicio: "2025-01-10", estado: "cerrada", createdAt: at, closedAt: at, closedBy: "iux11b-uat-owner", schemaVersion: 2 });
  const candidates = [
    { personId: "iux11b-uat-admin-adopt", membershipId: "iux11b-uat-membership-adopt", firstName: "Ana", lastName: "Administrativa", email: "iux11b-adopt@example.invalid" },
    { personId: "iux11b-uat-admin-merge", membershipId: "iux11b-uat-membership-merge", firstName: "Mara", lastName: "Con Historia", email: "iux11b-merge@example.invalid" },
  ];
  for (const row of candidates) {
    await db.doc(`personas/${row.personId}`).set({ nombre: row.firstName, apellido: row.lastName, emailContacto: row.email, createdAt: at, schemaVersion: 2 });
    await db.doc(`administrativePersonCustodies/${row.personId}`).set({ personId: row.personId, originGroupId: "iux11b-uat-group", custodianGroupId: "iux11b-uat-group", createdByAccountId: "iux11b-uat-owner", state: "UNLINKED", revision: 1, createdAt: at, updatedAt: at, schemaVersion: 1 });
    await db.doc(`memberships/${row.membershipId}`).set({ personId: row.personId, groupId: "iux11b-uat-group", seasonId: "iux11b-uat-season", estado: "finalizada", fechaIngreso: at, fechaEgreso: at, createdAt: at, schemaVersion: 2 });
  }
  console.log(JSON.stringify({
    projectId,
    reservedPrefix: RESERVED_PREFIX,
    replacedDocuments: { users: 3, personas: 3, groups: 1, seasons: 1, administrativePersonCustodies: 2, memberships: 2 },
    authUsersCreatedOrUpdated: 3,
    nextStep: "npm run iux-11b:backfill:inspect, then npm run iux-11b:backfill:emulator",
  }, null, 2));
}

if (require.main === module) main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

module.exports = { explicitProject, main, requireLocal, requireLoopbackEmulator };
