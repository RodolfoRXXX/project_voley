
// -------------------
// NAVBAR
// -------------------

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
    <nav className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-lg font-bold text-slate-900"
        >
          🏐 GroupVolley
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {!loading && !firebaseUser && (
            <button
              onClick={login}
              className="rounded-lg bg-[#FC4C02] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E44402] transition-colors"
            >
              Entrar
            </button>
          )}

          {!loading && firebaseUser && (
            <>
              {userDoc?.roles === "admin" && (
                <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
                  Admin
                </span>
              )}

              {firebaseUser.photoURL && (
                <UserAvatar
                  nombre={firebaseUser.displayName || "user"}
                  photoURL={firebaseUser.photoURL}
                  size={32}
                  className="w-8 h-8 rounded-full"
                />
              )}

              {/* Botón menú (placeholder por ahora) */}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                onClick={() => {
                  // después abrimos drawer
                  console.log("open mobile menu");
                }}
              >
                ☰
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );

}

