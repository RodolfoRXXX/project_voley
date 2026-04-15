import { GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { auth, authPersistenceReady } from "@/lib/firebase";

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  await authPersistenceReady;
  await signInWithRedirect(auth, provider);
};
