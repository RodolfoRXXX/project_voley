"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { GroupEconomySummaryCard } from "@/components/groups/GroupEconomySummaryCard";
import { GroupSeasonSummaryCard } from "@/components/groups/GroupSeasonSummaryCard";
import { useGroupFrame } from "@/components/groups/GroupFrame";
import { OwnMembershipSection } from "@/components/memberships/OwnMembershipSection";
import { ActiveGroupMembersSection } from "@/components/memberships/ActiveGroupMembersSection";
import { PendingGroupJoinRequestsSection } from "@/components/groupJoinRequests/PendingGroupJoinRequestsSection";

export default function OwnGroupDetailPage() {
  const router = useRouter();
  const { owner, group, loseAccess } = useGroupFrame();

  const handleAccessLost = useCallback((message: string) => {
    loseAccess(message);
    router.replace("/dashboard/groups");
  }, [loseAccess, router]);

  if (!owner || !group) return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">El resumen del Grupo sólo está disponible para su Owner.</section>;

  return <>
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <GroupSeasonSummaryCard groupId={group.id} readOnly={group.estado === "archivado"} onAccessLost={handleAccessLost} />
      <GroupEconomySummaryCard groupId={group.id} />
      {group.estado === "activo" ? <section id="integrantes" className="grid scroll-mt-6 gap-5 lg:col-span-2 lg:grid-cols-[2fr_1fr]" aria-labelledby="integrantes-title">
        <h2 id="integrantes-title" className="sr-only">Integrantes</h2>
        <OwnMembershipSection groupId={group.id} onAccessLost={handleAccessLost} />
        <ActiveGroupMembersSection groupId={group.id} onAccessLost={handleAccessLost} />
        <PendingGroupJoinRequestsSection groupId={group.id} onAccessLost={handleAccessLost} />
      </section> : null}
    </div>
  </>;
}
