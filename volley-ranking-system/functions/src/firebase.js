
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT
    //projectId: "volley-ranking-system" // 👈 EXACTO al firebase.json
  });
}

module.exports = {
  admin,
  db: admin.firestore()
};