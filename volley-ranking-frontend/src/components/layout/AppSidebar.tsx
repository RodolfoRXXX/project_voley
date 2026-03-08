// -------------------
// SIDEBAR
// -------------------

"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "../ui/avatar/UserAvatar";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";
import ThemeSwitch from "@/components/layout/ThemeSwitch";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useEffect, useState } from "react";

export default function AppSidebar() {
  const pathname = usePathname();
  const { userDoc } = useAuth();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { theme, themeLabel, toggleTheme } = useThemeMode();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const isAdmin = userDoc?.roles === "admin";

  const navItems = [
    {
      label: "Inicio",
      href: "/dashboard",
    },
    {
      label: "Grupos",
      href: "/grupos",
    },
    {
      label: "Torneos",
      href: "/torneos",
    },
    {
      label: "Mi perfil",
      children: [
        { label: "Mi info", href: "/profile" },
        { label: "Mis grupos", href: "/profile/groups" },
        { label: "Mis torneos", href: "/profile/tournaments" },
      ],
    },
    {
      label: "Mi gestión",
      adminOnly: true,
      children: [
        { label: "Grupos", href: "/admin/groups" },
        { label: "Torneos", href: "/admin/tournaments" },
      ],
    },
  ];

  useEffect(() => {
    if (pathname.startsWith("/profile")) {
      setOpenMenus((prev) => ({ ...prev, "Mi perfil": true }));
    }

    if (pathname.startsWith("/admin")) {
      setOpenMenus((prev) => ({ ...prev, "Mi gestión": true }));
    }
  }, [pathname]);

  const logout = async () => {
    const ok = await confirm({
      message: "¿Seguro que querés cerrar sesión?",
      confirmText: "Cerrar sesión",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!ok) return;

    await signOut(auth);
    router.replace("/dashboard");
  };

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <aside className="
      hidden md:flex w-64 flex-col h-full min-h-0
      bg-[var(--surface)] text-[var(--foreground)]
      border-r border-[var(--border)]
    ">

      {/* Logo */}
      <div className="px-6 py-5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          Navegación
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;

          const isOpen = openMenus[item.label];

          // ITEM SIMPLE
          if (!item.children) {
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-orange-500/10 text-orange-600"
                      : "hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  }
                `}
              >
                {item.label}
              </Link>
            );
          }

          // ITEM CON SUBMENU
          return (
            <div key={item.label}>
              <button
                onClick={() => toggleMenu(item.label)}
                className="w-full flex items-center justify-between rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
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
                        className={`block rounded-lg px-4 py-2 text-sm transition-colors
                          ${
                            isActive
                              ? "bg-orange-500/10 text-orange-600"
                              : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                          }
                        `}
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

      <div className="px-4 pb-3">
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
          <span className="text-sm font-medium text-[var(--foreground)]">{themeLabel}</span>
          <ThemeSwitch theme={theme} onToggle={toggleTheme} />
        </div>
      </div>

      {/* User section */}
      <div className="border-t border-[var(--border)] p-4">

        <div className="flex items-center mb-3 px-3 gap-3 text-sm text-[var(--text-muted)]">
            {userDoc?.photoURL ? (
            <UserAvatar
                nombre={userDoc?.nombre}
                photoURL={userDoc?.photoURL}
                size={34}
                className="w-10 h-10 rounded-full object-cover"
            />
            ) : (
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-sm">
                👤
            </div>
            )}

            <div className="text-sm">
            <p className="font-medium">
                {userDoc?.nombre || "Admin"}
            </p>
            <p className="text-[var(--text-muted)] text-xs">
                {userDoc?.roles || "Player"}
            </p>
            </div>
        </div>

        <button
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text-muted)] hover:bg-orange-500/10 hover:text-orange-600 transition-colors"
          onClick={logout}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
