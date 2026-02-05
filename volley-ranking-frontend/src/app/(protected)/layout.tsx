"use client";

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

  if (!firebaseUser && isDashboardRoute) {
    return <>{children}</>;
  }

  if (!firebaseUser || !userDoc) {
    return <p className="p-6">Cargando...</p>;
  }

  return <>{children}</>;
}
