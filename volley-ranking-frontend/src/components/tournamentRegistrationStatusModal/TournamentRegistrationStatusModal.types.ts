export type RegistrationStatus = "pendiente" | "aceptado" | "rechazado";

export type PaymentStatus = "pendiente" | "pagado";

export type TournamentRegistrationItem = {
  id: string;
  nameTeam?: string;
  groupId?: string;
  status?: RegistrationStatus;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  decidedByUserId?: string | null;
  registeredAt?: { seconds?: number };
  updatedAt?: { seconds?: number };
};

export type TournamentRegistrationStatusModalProps = {
  open: boolean;
  onClose: () => void;
  registration: TournamentRegistrationItem | null;
};
