import { initializeApp, getApps, getApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

/*
  PRODUCCION

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};
*/

const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "localhost",
  projectId: "project-groupvolley",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// ⚠️ SOLO en desarrollo (browser)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  connectAuthEmulator(auth, "http://localhost:9099", {
    disableWarnings: true,
  });

  connectFirestoreEmulator(db, "localhost", 8080);

  // 🔴 ESTA ES LA LÍNEA QUE FALTABA
  connectFunctionsEmulator(functions, "localhost", 5001);
}
