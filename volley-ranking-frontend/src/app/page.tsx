"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { loading, firebaseUser, needsOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) return;

    if (needsOnboarding) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, needsOnboarding, router]);

  return <p>Cargando...</p>;
}

