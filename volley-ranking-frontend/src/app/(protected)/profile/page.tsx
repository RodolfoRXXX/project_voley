
"use client";

import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/hooks/useAuth";
import ProfileGame from "@/components/profile/profileGame";
import ProfileMatches from "@/components/profile/ProfileMatches";

export default function ProfilePage() {
  const { userDoc, loading } = useAuth();

  if (loading || !userDoc) return <p>Cargando...</p>;

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

