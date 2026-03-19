import { TournamentGroup, TournamentPhase, TournamentPhaseType } from "@/types/tournaments/tournamentPhase";

export type TournamentStatus =
  | "draft"
  | "inscripciones_abiertas"
  | "inscripciones_cerradas"
  | "activo"
  | "finalizado"
  | "cancelado";

export type Tournament = {
  id: string;
  name: string;
  description: string;
  sport: string;
  format: "liga" | "eliminacion" | "mixto";
  rules?: {
    setsToWin?: number;
    pointsWin?: number;
    pointsDraw?: number;
    pointsLose?: number;
  };
  groups?: TournamentGroup[]; // legacy fallback
  structure?: {
    groupStage?: {
      enabled?: boolean;
      groupCount?: number;
      rounds?: number;
    };
    knockoutStage?: {
      enabled?: boolean;
      startFrom?: "octavos" | "cuartos" | "semi" | "final";
    };
  };
  status: TournamentStatus;
  ownerAdminId: string;
  adminIds: string[];
  settings?: {
    minTeams?: number;
    maxTeams?: number;
    minPlayers?: number;
    maxPlayers?: number;
    paymentPerPlayer?: number;
    setsToWin?: number;
    pointsWin?: number;
    pointsDraw?: number;
    pointsLose?: number;
  };
  phaseOrder?: Array<{
    type: TournamentPhaseType;
    order: number;
  }>;
  phaseDefinitions?: TournamentPhase[];
  currentPhaseId?: string;
  currentPhaseType?: TournamentPhaseType;
  minTeams: number;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  paymentForPlayer: number;
  acceptedTeamsCount?: number;
  podiumTeamIds?: [string, string, string] | null;
  startDate?: { seconds: number };
  endDate?: { seconds: number };
  updatedAt?: { seconds: number };
};

export const tournamentStatusLabel: Record<TournamentStatus, string> = {
  draft: "Borrador",
  inscripciones_abiertas: "Inscripciones abiertas",
  inscripciones_cerradas: "Inscripciones cerradas",
  activo: "Activo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
