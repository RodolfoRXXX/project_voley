export type PendingAlertSeverity = "urgent" | "warning" | "info";

export type PendingAlertKind =
  | "complete_profile"
  | "group_membership_result"
  | "group_accepted_in_tournament"
  | "group_tournament_team_missing_players"
  | "group_tournament_team_payment_pending"
  | "group_join_requests_pending"
  | "group_admin_requests_pending"
  | "tournament_draft_open_registrations"
  | "tournament_registrations_pending_review"
  | "tournament_ready_to_close_registrations"
  | "tournament_registrations_closed"
  | "tournament_fixture_pending"
  | "tournament_ready_to_start"
  | "tournament_active_results_pending";

export type PendingAlertStatus = "active" | "resolved" | "dismissed";

export type PendingAlert = {
  id: string;
  kind: PendingAlertKind;
  severity: PendingAlertSeverity;
  title: string;
  message: string;
  status: PendingAlertStatus;
  priority: number;
  dedupeKey?: string;
  actorScope?: {
    userId: string;
    roleAtCreation?: "player" | "admin" | null;
  };
  createdAt?: number;
  updatedAt?: number;
  expiresAt?: number | null;
  link?: {
    path: string;
    label: string;
  };
  resource?: {
    groupId?: string;
    tournamentId?: string;
    requestUserId?: string;
  };
  meta?: {
    groupName?: string;
    tournamentName?: string;
    decision?: "accepted" | "rejected";
    pendingCount?: number;
    minPlayers?: number;
    selectedPlayersCount?: number;
    missingPlayersCount?: number;
    paymentStatus?: "pendiente" | "parcial" | "pagado";
    pendingAmount?: number;
    fixtureReady?: boolean;
  };
};

export const pendingAlertPriority: Record<PendingAlertSeverity, number> = {
  urgent: 100,
  warning: 200,
  info: 300,
};

export const pendingAlertSeverityLabel: Record<PendingAlertSeverity, string> = {
  urgent: "Urgente",
  warning: "Advertencia",
  info: "Info",
};
