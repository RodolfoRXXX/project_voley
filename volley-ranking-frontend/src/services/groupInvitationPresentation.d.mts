export type PresentedInvitationStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";
export type PresentedCandidateState = "AVAILABLE" | "REQUEST_PENDING" | "INVITATION_PENDING" | "ALREADY_MEMBER" | "UNAVAILABLE";
export type PresentedInvitation = { invitationId: string; status: PresentedInvitationStatus; createdAt: string };
export const INVITATION_STATUS_LABELS: Readonly<Record<PresentedInvitationStatus, string>>;
export const DIRECTORY_CANDIDATE_STATE_LABELS: Readonly<Record<PresentedCandidateState, string>>;
export function invitationStatusLabel(status: PresentedInvitationStatus): string;
export function directoryCandidateStateLabel(state: PresentedCandidateState): string;
export function sortGroupInvitations<T extends PresentedInvitation>(items: T[]): T[];
export function mergeGroupInvitationPages<T extends PresentedInvitation>(current: T[], incoming: T[], reset?: boolean): T[];
