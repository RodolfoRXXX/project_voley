import type {
  TournamentRegistration as TournamentRegistrationItem,
  TournamentRegistrationStatus as RegistrationStatus,
} from "@/types/tournaments";

export type { RegistrationStatus, TournamentRegistrationItem };

export type TournamentRegistrationStatusModalProps = {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
  registration: TournamentRegistrationItem | null;
  tournamentMinPlayers?: number;
  tournamentMaxPlayers?: number;
  isTournamentFinalized?: boolean;
};
