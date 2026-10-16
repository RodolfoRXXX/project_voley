"use client";

import Link from "next/link";

import { useGroupFrame } from "@/components/groups/GroupFrame";
import { SeasonHistorySection } from "@/components/seasons/SeasonHistorySection";

export default function GroupSeasonsPage() {
  const { groupId, owner, group, loseAccess } = useGroupFrame();
  if (!owner || !group) return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">Las Temporadas sólo están disponibles para el Owner del Grupo.</section>;
  return <>
    <Link className="mb-5 inline-flex font-semibold text-orange-700 underline" href={`/dashboard/groups/${groupId}`}>← Volver al resumen</Link>
    <SeasonHistorySection groupId={groupId} readOnly={group.estado === "archivado"} onAccessLost={loseAccess} />
  </>;
}
