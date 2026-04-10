"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { auth, db } from "@/lib/firebase";
import type { UserDoc } from "@/types/UserDoc";

type AuthState = {
  firebaseUser: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  needsOnboarding: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);

      if (!user) {
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }

        setUserDoc(null);
        setLoading(false);
        return;
      }

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }

      const ref = doc(db, "users", user.uid);
      unsubscribeUserDoc = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          setUserDoc(snap.data() as UserDoc);
        } else {
          setUserDoc(null);
        }

        setLoading(false);
      });
    });

    return () => {
      unsub();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      firebaseUser,
      userDoc,
      loading,
      needsOnboarding: !!firebaseUser && !!userDoc && userDoc.onboarded === false,
    }),
    [firebaseUser, userDoc, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }

  return context;
}
