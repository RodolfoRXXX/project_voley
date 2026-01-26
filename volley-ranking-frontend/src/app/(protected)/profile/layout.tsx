"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

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

  if (loading) return <p>Cargando...</p>;
  if (!firebaseUser) return null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {children}
    </main>
  );
}
