export type TournamentEntrySource = "registration" | "team";

export type TournamentRegistrationStatus = "pendiente" | "aceptado" | "rechazado";

export type TournamentPaymentStatus = "pendiente" | "parcial" | "pagado";

export type TournamentRegistration = {
  id: string;
  source?: TournamentEntrySource;
  tournamentId: string;
  groupId?: string;
  registrationId?: string;
  teamId?: string;
  nameTeam?: string;
  name?: string;
  teamMembersCount?: number;
  playerIds?: string[];
  playersIds?: string[];
  status?: TournamentRegistrationStatus;
  paymentStatus?: TournamentPaymentStatus;
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
  groupLabel?: string;
};

export type TournamentTeam = TournamentRegistration;

export type ProfileTournamentEntry = {
  id: string;
  tournamentId: string;
  groupId: string;
  name?: string;
  nameTeam?: string;
  status?: TournamentRegistrationStatus;
  playerIds?: string[];
  source: TournamentEntrySource;
};
