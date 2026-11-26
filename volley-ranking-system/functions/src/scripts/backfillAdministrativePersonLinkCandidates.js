"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../firebase");
const { candidateValue, initialEmailRevision } = require("../administrativePersonLinks/infrastructure/administrativePersonLinkCandidateProjection");

function requireLocalEmulator() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("IUX-11B backfill is restricted to the local Firestore emulator");
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId?.startsWith("demo-")) throw new Error("IUX-11B backfill requires an isolated demo-* project");
}

async function inspect({ apply = false } = {}) {
  requireLocalEmulator();
  const snapshot = await db.collection("administrativePersonCustodies").where("state", "==", "UNLINKED").get();
  const rows = [];
  for (const custodySnapshot of snapshot.docs) {
    const personSnapshot = await db.collection("personas").doc(custodySnapshot.id).get();
    if (!personSnapshot.exists) { rows.push({ personId: custodySnapshot.id, action: "INCOMPATIBLE_MISSING_PERSON" }); continue; }
    const personData = personSnapshot.data(); const custodyData = custodySnapshot.data();
    if (typeof personData.emailContacto !== "string" || !personData.emailContacto.trim()) { rows.push({ personId: custodySnapshot.id, action: "SKIP_WITHOUT_EMAIL" }); continue; }
    const emailRevision = Number.isSafeInteger(custodyData.emailRevision) ? custodyData.emailRevision : initialEmailRevision(personData.emailContacto);
    const timestamp = Timestamp.now(); const person = { personId: custodySnapshot.id, nombre: personData.nombre, apellido: personData.apellido, emailContacto: personData.emailContacto };
    const custody = { ...custodyData, emailRevision };
    const value = candidateValue({ person, custody, timestamp });
    rows.push({ personId: custodySnapshot.id, action: apply ? "UPSERTED" : "WOULD_UPSERT", emailRevision });
    if (apply) {
      const batch = db.batch();
      batch.set(custodySnapshot.ref, { emailRevision, schemaVersion: 2, updatedAt: timestamp }, { merge: true });
      batch.set(db.collection("administrativePersonLinkCandidates").doc(custodySnapshot.id), value);
      await batch.commit();
    }
  }
  const manifest = { mode: apply ? "apply" : "inspect", inspected: snapshot.size, eligible: rows.filter((row) => /UPSERT/.test(row.action)).length, rows };
  console.log(JSON.stringify(manifest, null, 2));
  return manifest;
}

if (require.main === module) inspect({ apply: process.argv.includes("--apply") }).then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
module.exports = { inspect };
