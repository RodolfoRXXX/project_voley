"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/dashboard";

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser && !isDashboardRoute) {
      router.replace("/");
      return;
    }

    if (firebaseUser && (!userDoc || !userDoc.onboarded)) {
      router.replace("/onboarding");
      return;
    }
  }, [firebaseUser, userDoc, loading, router, isDashboardRoute]);

  if (loading) {
    return <p className="p-6">Cargando...</p>;
  }

  if (!firebaseUser && isDashboardRoute) {
    return <>{children}</>;
  }

  if (!firebaseUser || !userDoc) {
    return <p className="p-6">Cargando...</p>;
  }

  const isLoggedIn = !!firebaseUser && !!userDoc;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="flex">
        {isLoggedIn && (
          <aside className="hidden md:flex w-64 bg-[#0F172A] text-white">
            {/* Sidebar placeholder */}
            <AppSidebar />
          </aside>
        )}

        <main className="flex-1 min-h-screen">
          {/* Header mobile */}
          <div className="md:hidden sticky top-0 z-30">
            <Navbar />
          </div>

          {/* Content */}
          <div
            className={
              isLoggedIn
                ? "p-4 md:p-8"
                : "max-w-5xl mx-auto p-4 md:p-8"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );

}
