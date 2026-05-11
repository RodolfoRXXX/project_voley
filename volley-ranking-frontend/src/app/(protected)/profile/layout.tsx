
// -------------------
// Layout Profile
// -------------------

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/");
      return;
    }

    if (!userDoc?.onboarded) {
      router.replace("/onboarding");
    }
  }, [firebaseUser, userDoc, loading, router]);

  if (loading || !firebaseUser || !userDoc?.onboarded) {
    return null;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {children}
    </main>
  );
}