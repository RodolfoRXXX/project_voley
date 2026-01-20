
const admin = require("firebase-admin");

if (process.env.NODE_ENV === 'test' && !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('🔥 TEST intentando usar Firestore REAL');
}

if (!admin.apps.length) {
  admin.initializeApp(); // 👈 SIN CONFIG
}

const db = admin.firestore();

module.exports = {
  admin, // 🔴 exportamos el admin REAL
  db,
};