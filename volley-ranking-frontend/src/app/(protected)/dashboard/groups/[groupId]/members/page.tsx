"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PendingGroupJoinRequestsSection } from "@/components/groupJoinRequests/PendingGroupJoinRequestsSection";
import { CopyGroupJoinLinkButton } from "@/components/groups/CopyGroupJoinLinkButton";
import { useGroupFrame } from "@/components/groups/GroupFrame";
import { ActiveGroupMembersSection } from "@/components/memberships/ActiveGroupMembersSection";

export default function GroupMembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { owner, group, loseAccess } = useGroupFrame();
  const handleAccessLost = useCallback((message: string) => {
    loseAccess(message);
    router.replace("/dashboard/groups");
  }, [loseAccess, router]);

  if (!owner || !group || group.estado !== "activo") return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">Integrantes sólo está disponible para el Owner de un Grupo activo.</section>;

  return <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
    <div className="flex items-start justify-between gap-3 lg:col-span-2">
      <div><h1 className="text-2xl font-semibold">Integrantes</h1><p className="mt-1 text-sm text-[var(--text-muted)]">Membresías y solicitudes del Grupo.</p></div>
      <CopyGroupJoinLinkButton key={group.id} groupId={group.id} />
    </div>
    <ActiveGroupMembersSection groupId={group.id} onAccessLost={handleAccessLost} />
    <PendingGroupJoinRequestsSection groupId={group.id} requestedRequestId={searchParams.get("joinRequestId") ?? undefined} onAccessLost={handleAccessLost} />
  </div>;
}
