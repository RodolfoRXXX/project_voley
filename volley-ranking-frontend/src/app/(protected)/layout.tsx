
// -------------------
// Layout Protected
// -------------------

"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* =====================
   SKELETON
===================== */

function ProtectedLayoutSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 h-full bg-[#F8FAFC]">

      {/* Sidebar placeholder */}
      <div className="hidden md:block w-64 border-r bg-white">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-slate-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4">
          <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </main>

    </div>
  );
}

export default function ProtectedLayout({
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

    if (firebaseUser && (!userDoc || !userDoc.onboarded)) {
      router.replace("/onboarding");
      return;
    }
  }, [firebaseUser, userDoc, loading, router]);

  const isLoggedIn = !!firebaseUser && !!userDoc;

  if (loading) {
    return <ProtectedLayoutSkeleton />;
  }

  if (!isLoggedIn) {
    return <ProtectedLayoutSkeleton />;
  }

  return (
    <div className="flex flex-1 min-h-0 h-full bg-[#F8FAFC]">
      {isLoggedIn && (
        <AppSidebar />
      )}

      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Content */}
        <div
          className={
            isLoggedIn
              ? "p-4 md:p-6"
              : "max-w-5xl mx-auto p-4 md:p-8"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );

}
