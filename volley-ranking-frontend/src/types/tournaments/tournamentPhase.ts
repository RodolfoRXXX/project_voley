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
