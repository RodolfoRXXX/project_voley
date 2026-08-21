
// -------------------
// Layout Profile
// -------------------

"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { firebaseUser, account, accountStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (accountStatus === "checkingSession" || accountStatus === "initializingAccount") return;

    if (!firebaseUser) {
      router.replace("/");
      return;
    }

    if (pathname === "/profile/info") {
      router.replace("/dashboard");
    }
  }, [accountStatus, firebaseUser, pathname, router]);

  if (accountStatus !== "ready" || !firebaseUser || !account || pathname === "/profile/info") {
    return null;
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {children}
    </main>
  );
}
