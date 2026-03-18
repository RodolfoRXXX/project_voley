export type TournamentStatus =
  | "draft"
  | "inscripciones_abiertas"
  | "inscripciones_cerradas"
  | "activo"
  | "finalizado"
  | "cancelado";

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
    bracketSize?: number | null;
    startFrom?: "octavos" | "cuartos" | "semi" | "final";
    groups?: TournamentGroup[];
  };
  confirmedAt?: { seconds: number } | null;
  completedAt?: { seconds: number } | null;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
};

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
