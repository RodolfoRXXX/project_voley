"use client";

import { useState } from "react";
import Link from "next/link";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "../ui/avatar/UserAvatar";
import { useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import { handleAuthPopupError } from "@/lib/auth/handleAuthPopupError";

export default function Navbar() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

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
    setOpen(false);
    router.replace("/dashboard");
  };

  return (
    <nav className="sticky top-0 z-50 bg-neutral-50 shadow-sm">
      <div className="relative max-w-7xl mx-auto px-4 py-3 flex items-center">
  
        {/* LEFT spacer */}
        <div className="hidden md:block w-64" />

        {/* Logo */}
        <Link
          href="/dashboard"
          className="
            font-bold text-lg
            md:absolute md:left-1/2 md:-translate-x-1/2
          "
        >
          🏐 GroupVolley
        </Link>

        {/* RIGHT */}
        <div className="ml-auto hidden md:flex items-center gap-3">
          {!loading && !firebaseUser && (
            <button
              onClick={login}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Ingresar con Google
            </button>
          )}

          {firebaseUser && (
            <div className="flex items-center gap-2">
              {userDoc?.roles === "admin" && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                  ADMIN
                </span>
              )}

              {firebaseUser.photoURL && (
                <UserAvatar
                  nombre={firebaseUser.displayName || "user"}
                  photoURL={firebaseUser.photoURL}
                  size={32}
                />
              )}

              <span className="text-sm font-medium">
                {firebaseUser.displayName}
              </span>
            </div>
          )}
        </div>

        {/* MOBILE */}
        <div className="ml-auto md:hidden flex items-center gap-2">
          {firebaseUser?.photoURL && (
            <UserAvatar
              nombre={firebaseUser.displayName || "user"}
              photoURL={firebaseUser.photoURL}
              size={32}
            />
          )}

          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded hover:bg-gray-100"
          >
            ☰
          </button>
        </div>
      </div>


      {/* MOBILE DRAWER */}
      {open && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-3">
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            Inicio
          </Link>

          {firebaseUser && (
            <>
              <Link href="/profile" onClick={() => setOpen(false)}>
                Perfil
              </Link>

              {userDoc?.roles === "admin" && (
                <Link href="/admin/groups" onClick={() => setOpen(false)}>
                  Administración
                </Link>
              )}

              <button
                onClick={logout}
                className="block text-left text-red-600"
              >
                Cerrar sesión
              </button>
            </>
          )}

          {!firebaseUser && (
            <button
              onClick={login}
              className="w-full bg-orange-500 text-white py-2 rounded-lg"
            >
              Ingresar con Google
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
