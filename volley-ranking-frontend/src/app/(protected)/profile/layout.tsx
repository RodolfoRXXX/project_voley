
// -------------------
// Layout Profile
// -------------------

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { firebaseUser, account, accountStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (accountStatus === "checkingSession" || accountStatus === "initializingAccount") return;

    if (!firebaseUser) {
      router.replace("/");
      return;
    }

  }, [accountStatus, firebaseUser, router]);

  if (accountStatus !== "ready" || !firebaseUser || !account) {
    return null;
  }

  return children;
}
