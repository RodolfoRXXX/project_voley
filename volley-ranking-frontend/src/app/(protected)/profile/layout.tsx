
// -------------------
// Layout Profile
// -------------------

"use client";

import { ReactNode } from "react";

export default function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {children}
    </main>
  );
}