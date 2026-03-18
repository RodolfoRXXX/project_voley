import { TournamentPhaseType } from "@/types/tournament";

export type TournamentStandingStats = {
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  setsFor: number;
  setsAgainst: number;
  setsDiff: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
};

export type TournamentStanding = {
  id: string;
  tournamentId: string;
  phaseId: string;
  phaseType: TournamentPhaseType;
  teamId: string;
  groupLabel?: string | null;
  position: number;
  qualified: boolean;
  stats: TournamentStandingStats;
  updatedAt?: { seconds: number };
};
