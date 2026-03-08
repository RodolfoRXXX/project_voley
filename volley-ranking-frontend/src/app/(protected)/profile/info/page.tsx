
// -------------------
// Page Profile
// -------------------

"use client";

import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/hooks/useAuth";
import ProfileGame from "@/components/profile/profileGame";
import ProfileMatches from "@/components/profile/ProfileMatches";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

/* =====================
   SKELETON
===================== */

function ProfilePageSkeleton() {
  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />

        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <SkeletonSoft className="h-4 w-24" />
        </div>
      </div>

      {/* Profile game */}
      <div className="bg-white border p-4 space-y-3">
        <Skeleton className="h-5 w-32" />

        <div className="flex gap-2 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <SkeletonSoft
              key={i}
              className="h-8 w-20 rounded-full"
            />
          ))}
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />

        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <SkeletonSoft
              key={i}
              className="h-16 rounded-xl"
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
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 pb-12 space-y-8">

      {/* Profile Header */}
      <ProfileHeader user={userDoc} />

      {/* Profile Game */}

      <ProfileGame
        posicionesPreferidas={userDoc.posicionesPreferidas || []}
        role={userDoc.roles}
      />

      {/* Profile Matches */}

      <ProfileMatches />
    </main>
  );
}

