
"use client";

import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { userDoc, loading } = useAuth();

  if (loading || !userDoc) return <p>Cargando...</p>;

  return (
    <main className="max-w-4xl mx-auto mt-10 space-y-8">
      <ProfileHeader user={userDoc} />
    </main>
  );
}

