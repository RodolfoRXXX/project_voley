"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/");
      return;
    }

    if (userDoc && !userDoc.onboarded) {
      router.replace("/onboarding");
      return;
    }

    if (!userDoc || userDoc.roles !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [firebaseUser, userDoc, loading, router]);

  if (loading || !firebaseUser || !userDoc) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-neutral-500">
        Cargando panel de administración…
      </div>
    );
  }

  const isAdmin = !!firebaseUser && userDoc?.roles === "admin";

  return (
      <div className="flex flex-1 min-h-0 h-full bg-[#F8FAFC]">
        {isAdmin && (
          <AppSidebar />
        )}
  
        <main className="flex-1 min-h-0 overflow-y-auto">
          {/* Content */}
          <div className="p-4 md:p-8 max-w-none">
            {children}
          </div>
        </main>
      </div>
    );
}
