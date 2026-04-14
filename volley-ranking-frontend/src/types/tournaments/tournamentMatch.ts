import type { TournamentPhaseType } from "./tournamentPhase";

// TournamentMatch is reserved for tournament play.
// Social/community matches must keep using the `Match` type from `src/types/match.ts`.
export type TournamentMatchStatus = "scheduled" | "completed";

export type TournamentMatchResult = {
  winnerId?: string;
  homeSets?: number;
  awaySets?: number;
  homePoints?: number[];
  awayPoints?: number[];
} | null;

export type TournamentMatch = {
  id: string;
  tournamentId: string;
  phaseId: string;
  phaseType: TournamentPhaseType;
  round: number;
  roundLabel?: "octavos" | "cuartos" | "semi" | "final" | string | null;
  bracketIndex?: number | null;
  sourceHomeMatchId?: string | null;
  sourceAwayMatchId?: string | null;
  sourceHomeSlot?: "winner" | "loser" | string | null;
  sourceAwaySlot?: "winner" | "loser" | string | null;
  matchdayNumber?: number | null;
  roundCycle?: number | null;
  sequence?: number;
  groupLabel?: string | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  status: TournamentMatchStatus;
  result?: TournamentMatchResult;
};
