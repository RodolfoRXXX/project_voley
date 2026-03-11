export type RegistrationStatus = "pendiente" | "aceptado" | "rechazado";

export type PaymentStatus = "pendiente" | "parcial" | "pagado";

export type TournamentRegistrationItem = {
  id: string;
  nameTeam?: string;
  groupId?: string;
  teamMembersCount?: number;
  playerIds?: string[];
  status?: RegistrationStatus;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  expectedAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  paymentForPlayer?: number;
  paymentVerifiedBy?: string | null;
  paymentVerifiedAt?: { seconds?: number };
  decidedByUserId?: string | null;
  registeredAt?: { seconds?: number };
  updatedAt?: { seconds?: number };
};

export type TournamentRegistrationStatusModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
  registration: TournamentRegistrationItem | null;
  tournamentMinPlayers?: number;
  tournamentMaxPlayers?: number;
};
