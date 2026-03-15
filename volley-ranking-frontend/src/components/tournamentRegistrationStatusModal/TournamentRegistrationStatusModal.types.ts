export type RegistrationStatus = "pendiente" | "aceptado" | "rechazado";

export type PaymentStatus = "pendiente" | "parcial" | "pagado";

export type TournamentRegistrationItem = {
  id: string;
  source?: "registration" | "team";
  registrationId?: string;
  nameTeam?: string;
  name?: string;
  groupId?: string;
  teamMembersCount?: number;
  playerIds?: string[];
  status?: RegistrationStatus;
  paymentStatus?: PaymentStatus;
  expectedAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  paymentForPlayer?: number;
  paymentVerifiedBy?: string | null;
  paymentVerifiedAt?: { seconds?: number };
  decidedByUserId?: string | null;
  registeredAt?: { seconds?: number };
  updatedAt?: { seconds?: number };
  createdAt?: { seconds?: number };
};

export type TournamentRegistrationStatusModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
  registration: TournamentRegistrationItem | null;
  tournamentMinPlayers?: number;
  tournamentMaxPlayers?: number;
};
