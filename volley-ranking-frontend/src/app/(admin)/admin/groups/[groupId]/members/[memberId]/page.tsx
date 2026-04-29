"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileMatches from "@/components/profile/ProfileMatches";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import StatusPill from "@/components/ui/status/StatusPill";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { UserDoc } from "@/types/User";

type GroupData = {
  adminIds?: string[];
  adminId?: string;
};

const canAdminGroup = (
  group: GroupData | null | undefined,
  uid?: string
) => {
  if (!uid) return false;
  if (Array.isArray(group?.adminIds)) {
    return group.adminIds.includes(uid);
  }
  return group?.adminId === uid;
};

export default function AdminMemberProfilePage() {
  const { groupId, memberId } = useParams<{ groupId: string; memberId: string }>();
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();

  const [targetUser, setTargetUser] = useState<UserDoc | null>(null);
  const [isTargetGroupAdmin, setIsTargetGroupAdmin] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (loading) return;

      if (!firebaseUser || userDoc?.roles !== "admin") {
        router.replace("/");
        return;
      }

      const groupSnap = await getDoc(doc(db, "groups", groupId));
      if (!groupSnap.exists()) {
        router.replace("/admin/groups");
        return;
      }

      const groupData = groupSnap.data() as GroupData;

      if (!canAdminGroup(groupData, firebaseUser.uid)) {
        router.replace("/admin/groups");
        return;
      }

      const targetIsAdmin = Array.isArray(groupData.adminIds)
        ? groupData.adminIds.includes(memberId)
        : groupData.adminId === memberId;

      const userSnap = await getDoc(doc(db, "users", memberId));
      if (!userSnap.exists()) {
        router.replace(`/admin/groups/${groupId}`);
        return;
      }

      setTargetUser(userSnap.data() as UserDoc);
      setIsTargetGroupAdmin(targetIsAdmin);
      setLoadingData(false);
    };

    load();
  }, [firebaseUser, groupId, loading, memberId, router, userDoc?.roles]);

  if (loading || loadingData || !targetUser) {
    return (
      <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-8">
        <SkeletonSoft className="h-4 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <SkeletonSoft className="h-4 w-24" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-8">
      <Link
        href={`/admin/groups/${groupId}`}
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        ← Volver al grupo
      </Link>

      {isTargetGroupAdmin && (
        <div className="flex items-center">
          <StatusPill label="Admin del grupo" variant="warning" icon="🛡️" />
        </div>
      )}

      <ProfileHeader user={targetUser} />

      <ProfileMatches
        userId={memberId}
        maxItems={10}
        title="🏐 Últimos partidos"
      />
    </main>
  );
}
