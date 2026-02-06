"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace("/");
      return;
    }

    if (!userDoc || userDoc.roles !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [firebaseUser, userDoc, loading, router]);

  if (loading || !firebaseUser || !userDoc) {
    return <p className="p-6">Cargando...</p>;
  }

  const isAdmin = !!firebaseUser && userDoc?.roles === "admin";

  return (
    <div className="min-h-screen bg-slate-100 font-inter">
      <div className="flex">
        {/* Sidebar admin */}
        <aside className="hidden md:flex w-64 bg-slate-900 text-slate-100">
          <div className="p-6 text-lg font-semibold">
            Admin
          </div>
          {/* nav admin después */}
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );

}
