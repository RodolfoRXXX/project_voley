
export type Team = {
  nombre: string;
  jugadores: string[]; // userIds
};

export type TeamsDoc = {
  matchId: string;
  createdAt: any;
  equipos: Team[];
};

export interface TeamsModalProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  usersMap: Record<string, any>;
  participations: Record<string, { position: string }>;
  isAdmin: boolean;
  matchEstado: string;
}
