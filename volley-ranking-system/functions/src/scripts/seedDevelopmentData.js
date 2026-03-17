const admin = require("firebase-admin");
const fs = require("node:fs");
const path = require("node:path");
const { POSICIONES_VALIDAS } = require("../config/posiciones");

const DEFAULTS = {
  users: 24,
  groups: 4,
  domain: "seed.local",
  prefix: "seed",
  project: "",
  credentials: "",
  dryRun: false,
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };

  argv.forEach((arg) => {
    if (arg === "--dry-run") {
      options.dryRun = true;
      return;
    }

    if (arg === "--emulator") {
      options.emulator = true;
      return;
    }

    if (arg === "--no-emulator") {
      options.emulator = false;
      return;
    }

    if (arg === "--allow-production") {
      options.allowProduction = true;
      return;
    }

    const [rawKey, rawValue] = arg.split("=");
    const key = rawKey.replace(/^--/, "");

    if (!["users", "groups", "domain", "prefix", "project", "credentials"].includes(key)) {
      return;
    }

    if (key === "users" || key === "groups") {
      const parsed = Number(rawValue);
      if (Number.isFinite(parsed) && parsed > 0) {
        options[key] = Math.floor(parsed);
      }
      return;
    }

    if (typeof rawValue === "string" && rawValue.trim().length > 0) {
      const value = rawValue.trim();
      const normalizedKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[normalizedKey] = ["project", "domain", "prefix"].includes(normalizedKey)
        ? value.toLowerCase()
        : value;
    }
  });

  return options;
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function resolveInitOptions(options) {
  const initOptions = {};

  if (options.project) {
    initOptions.projectId = options.project;
    process.env.FIREBASE_PROJECT_ID = options.project;
    process.env.GCLOUD_PROJECT = options.project;
    process.env.GOOGLE_CLOUD_PROJECT = options.project;
  }

  if (options.credentials) {
    const credentialsPath = path.resolve(options.credentials);
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`No se encontró el archivo de credenciales: ${credentialsPath}`);
    }

    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  }

  return initOptions;
}

function pickRandomPositions(count = 3) {
  const pool = [...POSICIONES_VALIDAS];
  const picked = [];

  while (picked.length < count && pool.length > 0) {
    const index = randomInt(pool.length);
    const [selected] = pool.splice(index, 1);
    picked.push(selected);
  }

  return picked;
}

function buildUsers(totalUsers, prefix, domain) {
  return Array.from({ length: totalUsers }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      uid: `${prefix}-user-${number}`,
      email: `${prefix}.user.${number}@${domain}`,
      nombre: `Seed User ${number}`,
      role: "player",
      posicionesPreferidas: pickRandomPositions(3),
    };
  });
}

function buildGroups(totalGroups, adminUser, users, prefix) {
  const memberPool = users.filter((user) => user.uid !== adminUser.uid);

  return Array.from({ length: totalGroups }, (_, index) => {
    const groupNumber = String(index + 1).padStart(2, "0");
    const shuffledMembers = [...memberPool].sort(() => Math.random() - 0.5);

    const minMembers = Math.min(8, shuffledMembers.length);
    const maxMembers = Math.min(16, shuffledMembers.length);
    const totalMembers = minMembers + randomInt(Math.max(1, maxMembers - minMembers + 1));

    const memberIds = [adminUser.uid, ...shuffledMembers.slice(0, totalMembers).map((u) => u.uid)];

    return {
      id: `${prefix}-group-${groupNumber}`,
      nombre: `Grupo Seed ${groupNumber}`,
      descripcion: `Grupo generado automáticamente (${groupNumber})`,
      visibility: "public",
      joinApproval: false,
      memberIds: Array.from(new Set(memberIds)),
      adminIds: [adminUser.uid],
      admins: [{ userId: adminUser.uid, role: "owner", order: 0 }],
      ownerId: adminUser.uid,
    };
  });
}

async function ensureAuthUser(user, dryRun) {
  if (dryRun) return;

  try {
    await admin.auth().getUser(user.uid);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      await admin.auth().createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.nombre,
      });
      return;
    }

    throw error;
  }
}

async function upsertFirestoreUser(db, user, isAdmin, dryRun) {
  const payload = {
    email: user.email,
    nombre: user.nombre,
    photoURL: "",
    roles: isAdmin ? "admin" : user.role,
    posicionesPreferidas: user.posicionesPreferidas,
    estadoCompromiso: 0,
    onboarded: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (dryRun) return;

  const userRef = db.collection("users").doc(user.uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await userRef.set(payload, { merge: true });
}

async function upsertGroup(db, group, dryRun) {
  if (dryRun) return;

  await db.collection("groups").doc(group.id).set(
    {
      nombre: group.nombre,
      descripcion: group.descripcion,
      ownerId: group.ownerId,
      adminIds: group.adminIds,
      admins: group.admins,
      memberIds: group.memberIds,
      pendingRequestIds: [],
      pendingAdminRequestIds: [],
      activo: true,
      partidosTotales: 0,
      visibility: group.visibility,
      joinApproval: group.joinApproval,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const initOptions = resolveInitOptions(options);

  if (!admin.apps.length) {
    admin.initializeApp(initOptions);
  }

  const db = admin.firestore();
  const users = buildUsers(options.users, options.prefix, options.domain);
  const [adminUser, ...players] = users;
  const groups = buildGroups(options.groups, adminUser, users, options.prefix);

  console.log("\n🏐 Seed config");
  console.log(`- users: ${options.users}`);
  console.log(`- groups: ${options.groups}`);
  console.log(`- prefix: ${options.prefix}`);
  console.log(`- domain: ${options.domain}`);
  if (options.project) console.log(`- project: ${options.project}`);
  if (options.credentials) console.log(`- credentials: ${path.resolve(options.credentials)}`);
  console.log(`- dryRun: ${options.dryRun}`);

  for (const user of users) {
    await ensureAuthUser(user, options.dryRun);
    await upsertFirestoreUser(db, user, user.uid === adminUser.uid, options.dryRun);
  }

  for (const group of groups) {
    await upsertGroup(db, group, options.dryRun);
  }

  console.log("\n✅ Seed completado");
  console.log(`Admin: ${adminUser.email} (${adminUser.uid})`);
  console.log(`Players creados/actualizados: ${players.length}`);
  console.log(`Grupos creados/actualizados: ${groups.length}`);

  console.log("\nIntegrantes por grupo:");
  groups.forEach((group) => {
    console.log(`- ${group.id}: ${group.memberIds.length} miembros`);
  });
}

main().catch((error) => {
  console.error("\n❌ Error ejecutando seed:", error);
  process.exitCode = 1;
});
