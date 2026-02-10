
// -------------------
// Layout Profile
// -------------------

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/* =====================
   SKELETON
===================== */

function ProfileLayoutSkeleton() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
      <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
    </main>
  );
}

export default function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, loading, router]);

  if (loading) return <ProfileLayoutSkeleton />;
  if (!firebaseUser) return null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {children}
    </main>
  );
}
