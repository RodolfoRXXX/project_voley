"use client";

import { useAuth } from "@/hooks/useAuth";
import { loginWithGoogle } from "@/services/authService";

export default function HomePage() {
  const { firebaseUser, userDoc, loading, needsOnboarding } = useAuth();

  if (loading) return <p>Cargando...</p>;

  if (!firebaseUser) {
    return <button onClick={loginWithGoogle}>Login con Google</button>;
  }

  if (needsOnboarding) {
    return <p>Ir a onboarding</p>;
  }

  return <p>Bienvenido {userDoc?.nombre}</p>;
}
