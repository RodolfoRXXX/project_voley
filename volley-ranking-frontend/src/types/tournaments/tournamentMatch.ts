import { TournamentPhaseType } from "@/types/tournaments/tournamentPhase";

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
  groupLabel?: string | null;
  homeTeamId: string;
  awayTeamId: string;
  status: TournamentMatchStatus;
  result?: TournamentMatchResult;
};
