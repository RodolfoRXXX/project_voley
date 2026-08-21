"use client";

import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";
import { ensureMyAccount, getAccountErrorMessage } from "@/services/accountService";
import {
  getAuthErrorMessage,
  loginWithGoogle,
  logout as logoutFromFirebase,
} from "@/services/authService";
import { getLegacySelfUserDoc } from "@/services/legacyUserService";
import type { MyAccount } from "@/types/MyAccount";
import type { UserDoc } from "@/types/UserDoc";

export type AccountStatus =
  | "checkingSession"
  | "initializingAccount"
  | "ready"
  | "accountError";

type AuthState = {
  firebaseUser: User | null;
  account: MyAccount | null;
  userDoc: UserDoc | null;
  accountStatus: AccountStatus;
  accountError: string | null;
  authError: string | null;
  authenticating: boolean;
  legacyUserLoading: boolean;
  loading: boolean;
  retryAccount: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [account, setAccount] = useState<MyAccount | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("checkingSession");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [legacyUserLoading, setLegacyUserLoading] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const firebaseUserId = firebaseUser?.uid;

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        setFirebaseUser(user);
        if (!user) {
          setAccount(null);
          setUserDoc(null);
          setAccountError(null);
          setAccountStatus("ready");
          setLegacyUserLoading(false);
        }
      },
      () => {
        setFirebaseUser(null);
        setAccount(null);
        setUserDoc(null);
        setAuthError("No pudimos comprobar tu sesión. Intentá nuevamente.");
        setAccountStatus("ready");
        setLegacyUserLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!firebaseUserId) return;
    let active = true;

    setAccount(null);
    setUserDoc(null);
    setAccountError(null);
    setAccountStatus("initializingAccount");
    setLegacyUserLoading(true);

    ensureMyAccount()
      .then((nextAccount) => {
        if (!active) return;
        setAccount(nextAccount);
        setUserDoc({
          nombre: nextAccount.displayName,
          email: nextAccount.accessEmail,
          photoURL: nextAccount.accountPhotoUrl || "",
        });
        setAccountStatus("ready");

        getLegacySelfUserDoc(nextAccount.userId)
          .then((legacyUser) => {
            if (active && legacyUser) setUserDoc(legacyUser);
          })
          .catch(() => {
            // La deuda legacy no bloquea una cuenta E1-01 válida.
          })
          .finally(() => {
            if (active) setLegacyUserLoading(false);
          });
      })
      .catch((error) => {
        if (!active) return;
        setAccount(null);
        setUserDoc(null);
        setAccountError(getAccountErrorMessage(error));
        setAccountStatus("accountError");
        setLegacyUserLoading(false);
      });

    return () => {
      active = false;
    };
  }, [firebaseUserId, retryVersion]);

  const retryAccount = useCallback(() => {
    setRetryVersion((version) => version + 1);
  }, []);

  const login = useCallback(async () => {
    setAuthError(null);
    setAuthenticating(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      throw error;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    try {
      await logoutFromFirebase();
      setFirebaseUser(null);
      setAccount(null);
      setUserDoc(null);
      setAccountError(null);
      setAccountStatus("ready");
      setLegacyUserLoading(false);
    } catch (error) {
      setAuthError("No pudimos cerrar la sesión. Intentá nuevamente.");
      throw error;
    }
  }, []);

  const loading = accountStatus === "checkingSession"
    || accountStatus === "initializingAccount";

  const value = useMemo<AuthState>(
    () => ({
      firebaseUser,
      account,
      userDoc,
      accountStatus,
      accountError,
      authError,
      authenticating,
      legacyUserLoading,
      loading,
      retryAccount,
      login,
      logout,
    }),
    [
      account,
      accountError,
      accountStatus,
      authError,
      authenticating,
      firebaseUser,
      loading,
      legacyUserLoading,
      login,
      logout,
      retryAccount,
      userDoc,
    ]
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
