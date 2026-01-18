"use client";

import { useAuth } from "@/hooks/useAuth";
import { loginWithGoogle } from "@/services/authService";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <nav className="w-full border-b px-6 py-3 flex items-center justify-between">
      <span className="font-bold">Volley Ranking</span>

      {loading ? null : firebaseUser ? (
        <div className="flex items-center gap-4">
          {firebaseUser.photoURL && (
            <img
              src={firebaseUser.photoURL}
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
          )}
          <button
            onClick={logout}
            className="border px-3 py-1 rounded"
          >
            Salir
          </button>
        </div>
      ) : (
        <button
          onClick={loginWithGoogle}
          className="border px-3 py-1 rounded"
        >
          Sign in con Google
        </button>
      )}
    </nav>
  );
}
