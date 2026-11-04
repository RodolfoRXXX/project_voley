"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { GroupEconomySummaryCard } from "@/components/groups/GroupEconomySummaryCard";
import { GroupMembersSummaryCard } from "@/components/groups/GroupMembersSummaryCard";
import { GroupNewsCard } from "@/components/groups/GroupNewsCard";
import { GroupSeasonSummaryCard } from "@/components/groups/GroupSeasonSummaryCard";
import { useGroupFrame } from "@/components/groups/GroupFrame";
import { useGroupDashboardTasks } from "@/components/groups/useGroupDashboardTasks";
import { useAuth } from "@/hooks/useAuth";

export default function OwnGroupDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser } = useAuth();
  const { owner, group, loseAccess } = useGroupFrame();
  const tasks = useGroupDashboardTasks(group?.id ?? "", firebaseUser?.uid ?? null);

  const handleAccessLost = useCallback((message: string) => {
    loseAccess(message);
    router.replace("/dashboard/groups");
  }, [loseAccess, router]);

  useEffect(() => {
    if (!group || window.location.hash !== "#integrantes") return;
    const query = searchParams.toString();
    router.replace(`/dashboard/groups/${group.id}/members${query ? `?${query}` : ""}`);
  }, [group, router, searchParams]);

  if (!owner || !group) return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">El resumen del Grupo sólo está disponible para su Owner.</section>;

  return <div className="grid gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2"><GroupNewsCard tasks={tasks} /></div>
      <GroupEconomySummaryCard groupId={group.id} />
      <GroupSeasonSummaryCard groupId={group.id} readOnly={group.estado === "archivado"} onAccessLost={handleAccessLost} />
      {group.estado === "activo" ? <div className="lg:col-span-2"><GroupMembersSummaryCard groupId={group.id} tasks={tasks} /></div> : null}
    </div>;
}
