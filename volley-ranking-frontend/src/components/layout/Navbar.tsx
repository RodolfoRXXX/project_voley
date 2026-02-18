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
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setOpen(false);
    } catch (err) {
      handleAuthPopupError(err, showToast);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setOpen(false);
    router.replace("/dashboard");
  };

  const navItems = [
    { label: "Inicio", href: "/dashboard" },
    { label: "Perfil", href: "/profile" },
  ];

  if (userDoc?.roles === "admin") {
    navItems.push({
      label: "Gestión",
      href: "/admin/groups",
    });
  }

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
          🏐 Proyecto Voley
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
        <div className="md:hidden border-t bg-white">

          {/* USER INFO */}
          {firebaseUser && (
            <div className="px-4 py-4 flex items-center gap-3">
              <UserAvatar
                nombre={firebaseUser.displayName || "user"}
                photoURL={firebaseUser.photoURL || ""}
                size={40}
              />

              <div className="text-sm">
                <p className="font-medium">
                  {firebaseUser.displayName}
                </p>
                <p className="text-xs text-gray-400">
                  {userDoc?.roles || "Player"}
                </p>
              </div>
            </div>
          )}

          {/* SEPARATOR */}
          {firebaseUser && (
          <div className="border-t border-neutral-200 my-1" />
          )}

          {/* NAV LINKS */}
          {firebaseUser && (
            <nav className="px-2 space-y-1 border-b border-neutral-200 py-2">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors
                      ${
                        isActive
                          ? "bg-orange-500/10 text-orange-600"
                          : "text-neutral-600 hover:bg-neutral-200/60"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* FOOTER */}
          <div className="p-2">
            {firebaseUser ? (
              <button
                onClick={logout}
                className="w-full rounded-lg px-4 py-2 text-left text-sm text-slate-600 hover:bg-orange-500/10 hover:text-orange-600 transition-colors"
              >
                Cerrar sesión
              </button>
            ) : (
              <button
                onClick={login}
                className="w-full bg-orange-500 text-white py-2 rounded-lg"
              >
                Ingresar con Google
              </button>
            )}
          </div>
        </div>
      )}

    </nav>
  );
}
