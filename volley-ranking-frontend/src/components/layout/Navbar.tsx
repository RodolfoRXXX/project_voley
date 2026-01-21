"use client";

import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function Navbar() {
  const { firebaseUser, userDoc, loading } = useAuth();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b">
      <Link href="/" className="font-bold text-lg">
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
                <img
                  src={firebaseUser.photoURL}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}

              <button
                onClick={logout}
                className="text-sm text-gray-600 underline"
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
