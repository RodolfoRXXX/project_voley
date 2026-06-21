import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "project-groupvolley.firebaseapp.com",
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

//para conectarlo en el celular con el emulador, usar la IP local de la máquina (ej: 192.168.100.5) en luga 
//r de localhost, y asegurarse de que el celular esté conectado a la misma red Wi-Fi. Además, es posible que
//  necesites configurar reglas de firewall para permitir conexiones entrantes a los puertos utilizados por los emuladores (9099 para Auth, 8080 para Firestore, 5001 para Functions).

const EMULATOR_HOST = "192.168.100.5"; // tu IP local de home


const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

if (useEmulator && typeof window !== "undefined") {
  console.log("🔥 Conectando a emuladores...");

  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`);
  connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
}

//console.log("USE_EMULATOR =", process.env.NEXT_PUBLIC_USE_EMULATOR);
//console.log("PROJECT_ID =", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);


export { app, auth, db, functions };
