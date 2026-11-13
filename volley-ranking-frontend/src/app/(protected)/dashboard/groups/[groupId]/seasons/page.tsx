"use client";

import { useGroupFrame } from "@/components/groups/GroupFrame";
import { GroupSectionHeader } from "@/components/groups/GroupSectionHeader";
import { SeasonHistorySection } from "@/components/seasons/SeasonHistorySection";

export default function GroupSeasonsPage() {
  const { groupId, owner, group, loseAccess } = useGroupFrame();
  if (!owner || !group) return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">Las Temporadas sólo están disponibles para el Owner del Grupo.</section>;
  return <>
    <GroupSectionHeader title="Temporada" />
    <SeasonHistorySection groupId={groupId} readOnly={group.estado === "archivado"} onAccessLost={loseAccess} />
  </>;
}
