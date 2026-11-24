"use client";

import { OwnGroupMembershipHistoryView } from "@/components/memberships/OwnGroupMembershipHistoryView";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { usePerson } from "@/hooks/usePerson";

export default function GroupMembershipHistoryPage() {
  const { personStatus } = usePerson();
  return <GroupPageShell backHref="/profile/info" title="Historial de grupos" description="Membresías finalizadas, separadas por Grupo y Temporada."><section className="w-full max-w-2xl"><OwnGroupMembershipHistoryView available={personStatus === "ready"} /></section></GroupPageShell>;
}
