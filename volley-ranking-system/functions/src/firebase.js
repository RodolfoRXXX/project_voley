
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "volley-ranking-system"
  });
}

module.exports = {
  admin,
  db: admin.firestore()
};