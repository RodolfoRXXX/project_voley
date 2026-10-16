"use client";

import Link from "next/link";

import { useGroupFrame } from "@/components/groups/GroupFrame";
import { OpenSeasonForm } from "@/components/seasons/OpenSeasonForm";

export default function NewOpenSeasonPage() {
  const { groupId, owner, group } = useGroupFrame();
  if (!owner || !group || group.estado !== "activo") return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">No podés abrir una Temporada en este Grupo.</section>;
  return <>
    <Link className="mb-5 inline-flex font-semibold text-orange-700 underline" href={`/dashboard/groups/${groupId}/seasons`}>← Volver a Temporadas</Link>
    <h2 className="mb-2 text-2xl font-semibold">Crear y abrir Temporada</h2>
    <p className="mb-6 text-sm text-[var(--text-muted)]">Definí el ciclo temporal mínimo de tu Grupo.</p>
    <OpenSeasonForm groupId={groupId} />
  </>;
}
