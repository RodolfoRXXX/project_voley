import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { UserDoc } from "@/types/UserDoc";

// Deuda transitoria E1-01: consumidores deportivos y de administración global
// todavía leen campos legados. Esta lectura no inicializa ni autoriza la cuenta.
export async function getLegacySelfUserDoc(userId: string): Promise<UserDoc | null> {
  const snapshot = await getDoc(doc(db, "users", userId));
  return snapshot.exists() ? snapshot.data() as UserDoc : null;
}
