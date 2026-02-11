import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error("Firebase config no definida. Revisar variables de entorno.");
}

// Evita doble inicialización
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

if (useEmulator && typeof window !== "undefined") {
  console.log("🔥 Conectando a emuladores...");

  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

console.log("USE_EMULATOR =", process.env.NEXT_PUBLIC_USE_EMULATOR);
console.log("PROJECT_ID =", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);


export { app, auth, db, functions };
