const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
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

function getProjectIdFromEnv() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    ""
  );
}

function isUsingEmulators() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };

  argv.forEach((arg) => {
    if (arg === "--dry-run") {
      options.dryRun = true;
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
      options[key] = key === "domain" || key === "prefix" ? value.toLowerCase() : value;
    }
  });

  options.project = options.project || getProjectIdFromEnv();

  return options;
}

function initializeFirebase(options) {
  if (admin.apps.length) return;

  const initConfig = {};
  const credentialsPath = options.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath) {
    const absolutePath = path.resolve(credentialsPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`No existe el archivo de credenciales: ${absolutePath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    initConfig.credential = admin.credential.cert(serviceAccount);
    initConfig.projectId = options.project || serviceAccount.project_id;
  } else if (options.project) {
    initConfig.projectId = options.project;
  }

  if (!initConfig.projectId && !isUsingEmulators() && !options.dryRun) {
    throw new Error(
      "Falta projectId. Definí FIREBASE_PROJECT_ID o pasá --project=<tu-project-id>."
    );
  }

  admin.initializeApp(initConfig);
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
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

async function upsertFirestoreUser(user, isAdmin, dryRun) {
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

  const userRef = admin.firestore().collection("users").doc(user.uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await userRef.set(payload, { merge: true });
}

async function upsertGroup(group, dryRun) {
  if (dryRun) return;

  await admin.firestore().collection("groups").doc(group.id).set(
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
  initializeFirebase(options);

  const users = buildUsers(options.users, options.prefix, options.domain);
  const [adminUser, ...players] = users;
  const groups = buildGroups(options.groups, adminUser, users, options.prefix);

  console.log("\n🏐 Seed config");
  console.log(`- users: ${options.users}`);
  console.log(`- groups: ${options.groups}`);
  console.log(`- prefix: ${options.prefix}`);
  console.log(`- domain: ${options.domain}`);
  console.log(`- project: ${options.project || "(auto/emulator)"}`);
  console.log(`- credentials: ${options.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS || "(ADC)"}`);
  console.log(`- dryRun: ${options.dryRun}`);

  for (const user of users) {
    await ensureAuthUser(user, options.dryRun);
    await upsertFirestoreUser(user, user.uid === adminUser.uid, options.dryRun);
  }

  for (const group of groups) {
    await upsertGroup(group, options.dryRun);
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
  if (error.code === "app/invalid-credential") {
    console.error("\n💡 Tip de configuración:");
    console.error("1) Definí FIREBASE_PROJECT_ID=<tu_project_id>");
    console.error(
      "2) Definí GOOGLE_APPLICATION_CREDENTIALS=<ruta_service_account.json> o pasá --credentials"
    );
    console.error("3) Alternativa: usar emuladores con FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST");
  }
  console.error("\n❌ Error ejecutando seed:", error);
  process.exitCode = 1;
});
