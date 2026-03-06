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
  status: TournamentStatus;
  ownerAdminId: string;
  adminIds: string[];
  minTeams: number;
  maxTeams: number;
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
