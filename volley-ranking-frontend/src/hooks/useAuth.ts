"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";
import type { UserDoc } from "@/types/UserDoc";

export const useAuth = () => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setUserDoc(null);
        setLoading(false);
        return;
      }

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setUserDoc(snap.data() as UserDoc);
      } else {
        setUserDoc(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  return {
    firebaseUser,
    userDoc,
    loading,
    needsOnboarding:
      !!firebaseUser && !!userDoc && userDoc.onboarded === false,
  };
};
