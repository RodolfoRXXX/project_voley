
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

export default function AppSidebar() {
  const pathname = usePathname();
  const { userDoc } = useAuth();
  const router = useRouter();

  const isAdmin = userDoc?.roles === "admin";

  const navItems = [
    {
      label: "Inicio",
      href: "/dashboard",
    },
    {
      label: "Perfil",
      href: "/profile",
    },
  ];

  if (isAdmin) {
    navItems.push({
      label: "Gestión",
      href: "/admin/groups",
    });
  }

  const logout = async () => {
        await signOut(auth);
        router.replace("/dashboard");
    };

  return (
    <aside className="hidden md:flex w-64 flex-col bg-[#0F172A] text-slate-200">
      {/* Logo */}
      <div className="px-6 py-5 text-xl font-bold text-white">
        🏐 VolleyApp
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-[rgba(252,76,2,0.15)] text-[#FC4C02]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-4">

        <div className="flex items-center mb-3 gap-3 text-sm text-slate-300">
            {userDoc?.photoURL ? (
            <UserAvatar
                nombre={userDoc?.nombre}
                photoURL={userDoc?.photoURL}
                size={34}
                className="w-10 h-10 rounded-full object-cover"
            />
            ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm">
                👤
            </div>
            )}

            <div className="text-sm">
            <p className="font-medium">
                {userDoc?.nombre || "Admin"}
            </p>
            <p className="text-gray-500 text-xs">
                {userDoc?.roles || "Player"}
            </p>
            </div>
        </div>

        <button
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          onClick={logout}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
