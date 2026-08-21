
// -------------------
// Layout admin
// -------------------

"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* =====================
   SKELETON
===================== */

function AdminLayoutSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 h-full bg-[var(--background)] transition-colors">

      {/* Sidebar admin */}
      <div className="hidden md:block w-64 border-r border-[var(--border)] bg-[var(--background)] transition-colors">
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-10 rounded-md"
            />
          ))}
        </div>
      </div>

      {/* Main admin */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* ⬇️ IMPORTANTE: no definimos ancho */}
        <div className="p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-8">
          <SkeletonSoft className="h-6 w-48 mb-6" />
          <SkeletonSoft className="h-64 rounded-lg" />
        </div>
      </main>

    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    firebaseUser,
    account,
    accountStatus,
    legacyUserLoading,
    userDoc,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      accountStatus === "checkingSession"
      || accountStatus === "initializingAccount"
      || accountStatus === "accountError"
      || legacyUserLoading
    ) return;

    if (!firebaseUser) {
      router.replace("/");
      return;
    }

    if (!account || userDoc?.roles !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [account, accountStatus, firebaseUser, legacyUserLoading, router, userDoc]);

  if (
    accountStatus !== "ready"
    || legacyUserLoading
    || !firebaseUser
    || !account
    || userDoc?.roles !== "admin"
  ) {
    return <AdminLayoutSkeleton />;
  }

  return (
      <div className="flex flex-1 min-h-0 h-full bg-[var(--background)] transition-colors">
        <AppSidebar />
  
        <main className="flex-1 min-h-0 overflow-y-auto">
          {/* Content */}
          <div className="p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-8 max-w-none">
            {children}
          </div>
        </main>
      </div>
    );
}
