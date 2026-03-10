export type TournamentStatus =
  | "draft"
  | "inscripciones_abiertas"
  | "activo"
  | "finalizado";

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
  activo: "Activo",
  finalizado: "Finalizado",
};
