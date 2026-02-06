"use client";

import AppSidebar from "@/components/layout/AppSidebar";
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

  const isLoggedIn = !!firebaseUser && !!userDoc;

  if (!isLoggedIn && !isDashboardRoute) {
    return <p className="p-6">Cargando...</p>;
  }

  return (
    <div className="flex flex-1 min-h-0 bg-[#F8FAFC]">
      {isLoggedIn && (
        <AppSidebar />
      )}

      <main className="flex-1 min-h-0 overflow-y-auto">
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
  );

}
