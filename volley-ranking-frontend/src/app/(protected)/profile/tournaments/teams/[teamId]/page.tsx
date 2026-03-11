"use client";

import { useParams } from "next/navigation";
import TournamentEntryDetail from "@/components/tournaments/TournamentEntryDetail";

export default function TournamentTeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();

  return <TournamentEntryDetail source="team" entryId={teamId} />;
}
