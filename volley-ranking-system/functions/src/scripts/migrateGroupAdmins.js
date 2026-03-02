const { db, admin } = require("../firebase");
const { normalizeGroupAdmins } = require("../services/groupAdminsService");

async function migrateGroupAdmins({ dryRun = true } = {}) {
  const snap = await db.collection("groups").get();
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const normalized = normalizeGroupAdmins(data);

    if (!normalized.ownerId || normalized.adminIds.length === 0) {
      console.warn(`⚠️ Grupo ${doc.id} sin owner/admin válido, se omite`);
      continue;
    }

    const needsUpdate =
      !Array.isArray(data.admins) ||
      data.ownerId !== normalized.ownerId ||
      JSON.stringify(data.adminIds || []) !== JSON.stringify(normalized.adminIds);

    if (!needsUpdate) continue;

    updated += 1;

    if (dryRun) {
      console.log(`[DRY_RUN] ${doc.id}`, normalized);
      continue;
    }

    await doc.ref.update({
      admins: normalized.admins,
      ownerId: normalized.ownerId,
      adminIds: normalized.adminIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: "migration-script",
    });

    console.log(`✅ Grupo migrado: ${doc.id}`);
  }

  console.log(`Finalizado. Grupos a actualizar/actualizados: ${updated}`);
}

const dryRun = process.argv.includes("--write") ? false : true;
migrateGroupAdmins({ dryRun })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
