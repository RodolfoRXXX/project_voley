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
    return <p className="p-6">Cargando...</p>;
  }

  const isAdmin = !!firebaseUser && userDoc?.roles === "admin";

  return (
      <div className="flex flex-1 min-h-0 bg-[#F8FAFC]">
        {isAdmin && (
          <AppSidebar />
        )}
  
        <main className="flex-1 min-h-0 overflow-y-auto">
          {/* Content */}
          <div
            className={
              isAdmin
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
