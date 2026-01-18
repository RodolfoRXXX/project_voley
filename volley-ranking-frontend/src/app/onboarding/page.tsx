"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import OnboardingForm from "@/components/onboarding/onboardingForm";

export default function OnboardingPage() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/");
    }

    if (!loading && userDoc) {
      router.replace("/");
    }
  }, [firebaseUser, userDoc, loading, router]);

  if (loading || !firebaseUser || userDoc) {
    return <p>Cargando...</p>;
  }

  return (
    <main className="max-w-xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Completar perfil</h1>
      <OnboardingForm />
    </main>
  );
}
