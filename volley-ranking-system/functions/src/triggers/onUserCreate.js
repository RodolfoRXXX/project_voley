// functions/triggers/onUserCreate.js

const functions = require("firebase-functions/v1");
const { db } = require("../firebase");

// 👇 IMPORT CORRECTO
const { FieldValue } = require("firebase-admin/firestore");

module.exports = functions.auth.user().onCreate(async (user) => {
  const userRef = db.collection("users").doc(user.uid);

  await userRef.set({
    email: user.email,
    nombre: user.displayName || "",
    photoURL: user.photoURL || "",

    // La creación de identidad no concede privilegios globales.
    roles: null,
    posicionesPreferidas: [],
    estadoCompromiso: 0,
    onboarded: false,

    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`👤 Usuario creado: ${user.uid}`);
});
