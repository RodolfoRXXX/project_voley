"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "../ui/avatar/UserAvatar";
import { usePathname, useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import { handleAuthPopupError } from "@/lib/auth/handleAuthPopupError";

export default function Navbar() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }

    return prefersDark ? "dark" : "light";
  });
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  };

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
    <nav className="sticky top-0 z-50 bg-[var(--nav-bg)] border-b border-[var(--border)] shadow-sm transition-colors">
      <div className="relative max-w-7xl mx-auto px-4 py-3 flex items-center">
  
        {/* LEFT spacer */}
        <div className="hidden md:block w-64" />

        {/* Logo */}
        <Link
          href="/dashboard"
          className="
            font-bold text-lg text-[var(--foreground)]
            md:absolute md:left-1/2 md:-translate-x-1/2
          "
        >
          🏐 Proyecto Voley
        </Link>

        {/* RIGHT */}
        <div className="ml-auto hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Cambiar tema"
            title={`Cambiar a modo ${theme === "light" ? "dark" : "light"}`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

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

              <span className="text-sm font-medium text-[var(--foreground)]">
                {firebaseUser.displayName}
              </span>
            </div>
          )}
        </div>

        {/* MOBILE */}
        <div className="ml-auto md:hidden flex items-center gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded text-[var(--foreground)] hover:bg-[var(--surface)]"
          >
            ☰
          </button>
        </div>
      </div>


      {/* MOBILE DRAWER */}
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] transition-colors">

          <div className="px-4 pt-3">
            <button
              onClick={toggleTheme}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-muted)]"
            >
              {theme === "light" ? "🌙 Activar dark" : "☀️ Activar light"}
            </button>
          </div>

          {/* USER INFO */}
          {firebaseUser && (
            <div className="px-4 py-4 flex items-center gap-3">
              <UserAvatar
                nombre={firebaseUser.displayName || "user"}
                photoURL={firebaseUser.photoURL || ""}
                size={40}
              />

              <div className="text-sm">
                <p className="font-medium text-[var(--foreground)]">
                  {firebaseUser.displayName}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {userDoc?.roles || "Player"}
                </p>
              </div>
            </div>
          )}

          {/* SEPARATOR */}
          {firebaseUser && (
          <div className="border-t border-[var(--border)] my-1" />
          )}

          {/* NAV LINKS */}
          {firebaseUser && (
            <nav className="px-2 space-y-1 border-b border-[var(--border)] py-2">
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
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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
                className="w-full rounded-lg px-4 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-orange-500/10 hover:text-orange-600 transition-colors"
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
