"use client";

import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import UserAvatar from "../ui/avatar/UserAvatar";
import { useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import { handleAuthPopupError } from "@/lib/auth/handleAuthPopupError";

export default function Navbar() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const login = async () => {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      handleAuthPopupError(err, showToast);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("/dashboard");
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b">
      <Link href="/dashboard" className="font-bold text-lg">
        🏐 GroupVolley
      </Link>

      <div className="flex items-center gap-4">
        {!loading && !firebaseUser && (
          <button
            onClick={login}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Ingresar con Google
          </button>
        )}

        {!loading && firebaseUser && (
          <>
            {userDoc?.roles === "admin" && (
              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                ADMIN
              </span>
            )}

            {userDoc && (
              <>
                <Link href="/dashboard">Dashboard</Link>

                {userDoc.roles === "admin" && (
                  <Link
                    href="/admin/groups"
                    className="font-semibold text-blue-600"
                  >
                    Groups
                  </Link>
                )}

                <Link href="/profile">Perfil</Link>
              </>
            )}

            {!userDoc && (
              <Link href="/onboarding" className="text-orange-600 font-semibold">
                Completar perfil
              </Link>
            )}

            <div className="flex items-center gap-2">
              {firebaseUser.photoURL && (
                <UserAvatar
                  nombre={firebaseUser.displayName || "user"}
                  photoURL={firebaseUser.photoURL}
                  size={28}
                  className="w-8 h-8 rounded-full"
                />
              )}

              <button
                onClick={logout}
                className="text-sm text-gray-600 border rounded px-2 py-1 pointer"
              >
                Salir
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

