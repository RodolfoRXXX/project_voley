"use client";

import { useState } from "react";
import Link from "next/link";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "../ui/avatar/UserAvatar";
import { usePathname, useRouter } from "next/navigation";
import { Arizonia } from "next/font/google";
import useToast from "@/components/ui/toast/useToast";
import { handleAuthPopupError } from "@/lib/auth/handleAuthPopupError";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";
import ThemeSwitch from "@/components/layout/ThemeSwitch";
import { useThemeMode } from "@/hooks/useThemeMode";
import SportexaLogo from "./SportexaLogo";

const arizonia = Arizonia({
  weight: "400",
  subsets: ["latin"],
});

export default function Navbar() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const { theme, themeLabel, toggleTheme } = useThemeMode();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

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
    const ok = await confirm({
      message: "¿Seguro que querés cerrar sesión?",
      confirmText: "Cerrar sesión",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!ok) return;

    await signOut(auth);
    setOpen(false);
    router.replace("/dashboard");
  };

  const navItems = [
    { label: "Inicio", href: "/dashboard" },
    { label: "Grupos", href: "/groups" },
    { label: "Torneos", href: "/tournaments" },

    {
      label: "Mi perfil",
      children: [
        { label: "Mi info", href: "/profile/info" },
        { label: "Mis grupos", href: "/profile/groups" },
        { label: "Mis torneos", href: "/profile/tournaments" },
      ],
    },
  ];

  if (userDoc?.roles === "admin") {
    navItems.push({
      label: "Mi gestión",
      children: [
        { label: "Grupos", href: "/admin/groups" },
        { label: "Torneos", href: "/admin/tournaments" },
      ],
    });
  }

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <nav className="sticky top-0 z-50 bg-[var(--nav-bg)] border-b border-[var(--border)] shadow-sm transition-colors">
      <div className="relative max-w-7xl mx-auto px-4 py-3 flex items-center">
        <div className="hidden md:block w-64" />

        <SportexaLogo />

        {/* DESKTOP */}
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

              <span className="text-sm font-medium text-[var(--foreground)]">
                {firebaseUser.displayName}
              </span>
            </div>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
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
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
              <span className="text-sm font-medium text-[var(--foreground)]">{themeLabel}</span>
              <ThemeSwitch theme={theme} onToggle={toggleTheme} />
            </div>
          </div>

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

          {firebaseUser && <div className="border-t border-[var(--border)] my-1" />}

          {firebaseUser && (
            <nav className="px-2 space-y-1 border-b border-[var(--border)] py-2">
              {navItems.map((item) => {

                // ITEM SIMPLE
                if (!item.children) {
                  const isActive = pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-orange-500/10 text-orange-600"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                }

                // ITEM CON SUBMENU
                const isOpen = openMenus[item.label];

                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className="w-full flex items-center justify-between rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    >
                      {item.label}
                      <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>
                        ▶
                      </span>
                    </button>

                    {isOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((sub) => {
                          const isActive = pathname.startsWith(sub.href);

                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setOpen(false)}
                              className={`block rounded-lg px-4 py-2 text-sm transition-colors ${
                                isActive
                                  ? "bg-orange-500/10 text-orange-600"
                                  : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}

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
