
// -------------------
// Layout Public
// -------------------

"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import { useAuth } from "@/hooks/useAuth";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser } = useAuth();

  const isLoggedIn = !!firebaseUser;

  return (
    <div className="flex flex-1 min-h-0 h-full bg-[var(--background)] transition-colors">
      {isLoggedIn && <AppSidebar />}

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:p-6">{children}</div>
      </main>
    </div>
  );
}
