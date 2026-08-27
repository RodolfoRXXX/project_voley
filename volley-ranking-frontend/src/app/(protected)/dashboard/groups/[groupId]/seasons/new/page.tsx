"use client";

import { useParams } from "next/navigation";

import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { OpenSeasonForm } from "@/components/seasons/OpenSeasonForm";

export default function NewOpenSeasonPage() {
  const params = useParams<{ groupId: string }>();
  return (
    <GroupPageShell backHref={`/dashboard/groups/${params.groupId}`} title="Crear y abrir Temporada" description="Definí el ciclo temporal mínimo de tu Grupo.">
      <OpenSeasonForm groupId={params.groupId} />
    </GroupPageShell>
  );
}
