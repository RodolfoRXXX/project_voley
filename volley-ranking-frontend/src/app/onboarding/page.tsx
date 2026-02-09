"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import OnboardingForm from "@/components/onboarding/onboardingForm";

export default function OnboardingPage() {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/");
      return;
    }

    if (userDoc?.onboarded) {
      router.replace("/dashboard");
      return;
    }
  }, [firebaseUser, userDoc, loading, router]);

  if (loading || !firebaseUser || userDoc?.onboarded) {
    return <p>Cargando...</p>;
  }

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-start sm:items-center justify-center px-4 py-4">
      <div
        className="
          w-full max-w-xl
          bg-white
          rounded-lg
          border border-neutral-200
          shadow-[0_1px_2px_rgba(0,0,0,0.05)]
        "
      >
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-neutral-100">
          <h1 className="text-xl font-semibold text-neutral-900">
            Completá tu perfil
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Esto nos ayuda a armar mejores partidos para vos
          </p>
        </div>

        {/* Form */}
        <div className="px-6 sm:px-8 py-6">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
