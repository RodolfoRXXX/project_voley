"use client";

import Iux07HomeUnderTest from "@/app/page";
import AppSidebar from "@/components/layout/AppSidebar";
import Navbar from "@/components/layout/Navbar";

export default function Iux07BrowserPage() {
  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Iux07HomeUnderTest />
        </main>
      </div>
    </div>
  );
}
