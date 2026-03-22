export type TournamentPhaseType =
  | "registration"
  | "group_stage"
  | "round_robin"
  | "knockout"
  | "final";

export type TournamentPhaseStatus =
  | "pending"
  | "active"
  | "preview"
  | "confirmed"
  | "completed";

export type TournamentGroup = {
  name: string;
  teamIds: string[];
};

export type TournamentPhase = {
  id: string;
  tournamentId: string;
  type: TournamentPhaseType;
  order: number;
  status: TournamentPhaseStatus;
  config?: {
    groupCount?: number;
    rounds?: number;
    qualifyPerGroup?: number;
    qualifyPositions?: number[];
    wildcardsCount?: number;
    qualifyBestThirds?: boolean;
    seedingCriteria?: "points" | "group_position" | "setsDiff" | "pointsDiff";
    crossGroupSeeding?: boolean;
    bracketMatchup?: "standard_seeded" | "1A_vs_2B";
    tiebreakers?: string[];
    bracketSize?: number | null;
    startFrom?: "octavos" | "cuartos" | "semi" | "final";
    allowByes?: boolean;
    currentRoundLabel?: string | null;
    fixture?: {
      generated?: boolean;
      generationMode?: string;
      totalRounds?: number;
      totalMatchdays?: number;
      roundLabels?: string[];
      matchesCount?: number;
    };
    groupsConfirmed?: boolean;
    standingsClosed?: boolean;
    qualifiedTeamsPublished?: Array<{
      teamId: string;
      groupLabel?: string | null;
      position?: number | null;
      seed?: number | null;
      qualificationType?: string | null;
      points?: number;
      setsDiff?: number;
      pointsDiff?: number;
    }>;
    qualifiedTeams?: Array<{
      teamId: string;
      seed?: number | null;
      standingsSeed?: number | null;
      groupLabel?: string | null;
      position?: number | null;
      qualificationType?: string | null;
    }>;
    groups?: TournamentGroup[];
  };
  confirmedAt?: { seconds: number } | null;
  completedAt?: { seconds: number } | null;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
};

export const tournamentPhaseTypeLabel: Record<TournamentPhaseType, string> = {
  registration: "Inscripción",
  group_stage: "Fase de grupos",
  round_robin: "Liga",
  knockout: "Eliminación",
  final: "Final",
};

export const tournamentPhaseStatusLabel: Record<TournamentPhaseStatus, string> = {
  pending: "Pendiente",
  active: "Activa",
  preview: "Vista previa",
  confirmed: "Confirmada",
  completed: "Completada",
};
