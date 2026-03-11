"use client";

import { useParams } from "next/navigation";
import TournamentEntryDetail from "@/components/tournaments/TournamentEntryDetail";

export default function TournamentRegistrationDetailPage() {
  const { registrationId } = useParams<{ registrationId: string }>();

  return <TournamentEntryDetail source="registration" entryId={registrationId} />;
}
