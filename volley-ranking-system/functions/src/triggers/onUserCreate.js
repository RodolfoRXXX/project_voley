// functions/triggers/onUserCreate.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

module.exports = functions.auth.user().onCreate(async (user) => {
  const userRef = db.collection("users").doc(user.uid);

  await userRef.set({
    email: user.email || "",
    nombre: user.displayName || "",
    photoURL: user.photoURL || "",

    roles: "player",
    posicionesPreferidas: [],

    estadoCompromiso: 0,

    onboarded: false,

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`👤 Usuario creado: ${user.uid}`);
});
