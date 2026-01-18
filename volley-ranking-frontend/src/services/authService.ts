import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  await signInWithPopup(auth, provider);
};
