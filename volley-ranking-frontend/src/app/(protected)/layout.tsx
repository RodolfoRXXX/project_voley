
// -------------------
// Layout Protected
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

function ProtectedLayoutSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 h-full bg-[var(--background)] transition-colors">

      {/* Sidebar placeholder */}
      <div className="hidden md:block w-64 border-r border-[var(--border)] bg-[var(--background)] transition-colors">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-10 rounded-lg"
            />
          ))}
        </div>
      </div>

      {/* Main */}
      <main
        id="protected-scroll-container"
        className="flex-1 min-h-0 overflow-y-auto"
      >
        <div className="p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonSoft className="h-4 w-64" />
          <SkeletonSoft className="h-32 rounded-xl" />
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
  const {
    firebaseUser,
    account,
    accountError,
    accountStatus,
    retryAccount,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (accountStatus === "checkingSession" || accountStatus === "initializingAccount") return;

    if (!firebaseUser) {
      router.replace("/");
    }
  }, [accountStatus, firebaseUser, router]);

  const isLoggedIn = accountStatus === "ready" && !!firebaseUser && !!account;

  if (accountStatus === "checkingSession" || accountStatus === "initializingAccount") {
    return <ProtectedLayoutSkeleton />;
  }

  if (accountStatus === "accountError") {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-lg items-center px-6">
        <section className="w-full rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="text-lg font-semibold">No pudimos inicializar tu cuenta</h1>
          <p className="mt-2 text-sm">{accountError}</p>
          <button
            type="button"
            onClick={retryAccount}
            className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  if (!isLoggedIn) {
    return <ProtectedLayoutSkeleton />;
  }

  return (
    <div className="flex flex-1 min-h-0 h-full bg-[var(--background)] transition-colors">
      <AppSidebar />

      <main
        id="protected-scroll-container"
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {/* Content */}
        <div
          className={
            isLoggedIn
              ? "pb-[env(safe-area-inset-bottom)] md:p-6 md:pb-6"
              : "max-w-5xl mx-auto pb-[env(safe-area-inset-bottom)] md:p-8 md:pb-8"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );

}
