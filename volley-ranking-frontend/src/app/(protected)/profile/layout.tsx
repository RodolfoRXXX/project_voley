
// -------------------
// Layout Profile
// -------------------

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";

/* =====================
   SKELETON
===================== */

function ProfileLayoutSkeleton() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
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
