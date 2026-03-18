import {
  Tournament,
  TournamentGroup,
  TournamentPhase,
  TournamentPhaseType,
} from "@/types/tournament";
import { TournamentMatch } from "@/types/tournamentMatch";
import { TournamentStanding } from "@/types/tournamentStanding";

export function toTournament(id: string, data: Omit<Tournament, "id">): Tournament {
  return { id, ...data };
}

export function toTournamentPhase(id: string, data: Omit<TournamentPhase, "id">): TournamentPhase {
  return { id, ...data };
}

export function toTournamentMatch(id: string, data: Record<string, unknown>): TournamentMatch {
  return {
    id,
    tournamentId: String(data.tournamentId || ""),
    phaseId: String(data.phaseId || ""),
    phaseType: (data.phaseType as TournamentPhaseType) || "registration",
    round: Number(data.round || 0),
    groupLabel: typeof data.groupLabel === "string" ? data.groupLabel : null,
    homeTeamId: String(data.homeTeamId || ""),
    awayTeamId: String(data.awayTeamId || ""),
    status: (data.status as TournamentMatch["status"]) || "scheduled",
    result: (data.result as TournamentMatch["result"]) ?? null,
  };
}

export function toTournamentStanding(id: string, data: Record<string, unknown>): TournamentStanding {
  return {
    id,
    tournamentId: String(data.tournamentId || ""),
    phaseId: String(data.phaseId || ""),
    phaseType: (data.phaseType as TournamentPhaseType) || "registration",
    teamId: String(data.teamId || ""),
    groupLabel: typeof data.groupLabel === "string" ? data.groupLabel : null,
    position: Number(data.position || 0),
    qualified: Boolean(data.qualified),
    stats: {
      played: Number((data.stats as Record<string, unknown> | undefined)?.played || 0),
      won: Number((data.stats as Record<string, unknown> | undefined)?.won || 0),
      draw: Number((data.stats as Record<string, unknown> | undefined)?.draw || 0),
      lost: Number((data.stats as Record<string, unknown> | undefined)?.lost || 0),
      points: Number((data.stats as Record<string, unknown> | undefined)?.points || 0),
      setsFor: Number((data.stats as Record<string, unknown> | undefined)?.setsFor || 0),
      setsAgainst: Number((data.stats as Record<string, unknown> | undefined)?.setsAgainst || 0),
      setsDiff: Number((data.stats as Record<string, unknown> | undefined)?.setsDiff || 0),
      pointsFor: Number((data.stats as Record<string, unknown> | undefined)?.pointsFor || 0),
      pointsAgainst: Number((data.stats as Record<string, unknown> | undefined)?.pointsAgainst || 0),
      pointsDiff: Number((data.stats as Record<string, unknown> | undefined)?.pointsDiff || 0),
    },
    updatedAt: data.updatedAt as { seconds: number } | undefined,
  };
}

export function getConfirmedGroupsFromTournamentContext({
  phase,
  tournament,
}: {
  phase: TournamentPhase | null;
  tournament: Tournament;
}): TournamentGroup[] {
  if (Array.isArray(phase?.config?.groups) && phase.config.groups.length > 0) {
    return phase.config.groups;
  }

  return tournament.groups || [];
}
