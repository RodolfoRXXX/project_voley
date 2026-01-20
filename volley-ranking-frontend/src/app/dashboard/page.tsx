"use client";

import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { firebaseUser, userDoc, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!firebaseUser) return <p>No autenticado</p>;

  return (
    <main className="max-w-xl mx-auto mt-10">
      <h1 className="text-2xl font-bold">
        Dashboard
      </h1>

      <pre className="mt-4 bg-gray-100 p-2 rounded text-sm">
        {JSON.stringify(userDoc, null, 2)}
      </pre>
    </main>
  );
}
