import type {
  TournamentPaymentStatus as PaymentStatus,
  TournamentRegistration as TournamentRegistrationItem,
  TournamentRegistrationStatus as RegistrationStatus,
} from "@/types/tournaments/tournamentRegistration";

export type { PaymentStatus, RegistrationStatus, TournamentRegistrationItem };

export type TournamentRegistrationStatusModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
  registration: TournamentRegistrationItem | null;
  tournamentMinPlayers?: number;
  tournamentMaxPlayers?: number;
};
