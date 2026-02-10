
// -------------------
// Page Profile
// -------------------

"use client";

import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/hooks/useAuth";
import ProfileGame from "@/components/profile/profileGame";
import ProfileMatches from "@/components/profile/ProfileMatches";

/* =====================
   SKELETON
===================== */

function ProfilePageSkeleton() {
  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-slate-200 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Profile game */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 bg-slate-100 rounded-full animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-3">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>

    </main>
  );
}

export default function ProfilePage() {
  const { userDoc, loading } = useAuth();

  if (loading || !userDoc) return <ProfilePageSkeleton />;

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 space-y-8">

      {/* Profile Header */}
      <ProfileHeader user={userDoc} />

      {/* Profile Game */}

      <ProfileGame
        posicionesPreferidas={userDoc.posicionesPreferidas || []}
      />

      {/* Profile Matches */}

      <ProfileMatches />
    </main>
  );
}

