
const admin = require("firebase-admin");

if (process.env.NODE_ENV === 'test' && !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('🔥 TEST intentando usar Firestore REAL');
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT
    //projectId: "project-groupvolley" // 👈 EXACTO al firebase.json
  });
}

module.exports = {
  admin,
  db: admin.firestore()
};