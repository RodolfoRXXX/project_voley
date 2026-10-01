export type ActiveGroupMemberPerson =
  | { status: "AVAILABLE"; firstName: string; lastName: string }
  | { status: "UNAVAILABLE" };

export type ActiveGroupMember = {
  membershipId: string;
  joinedAt: string;
  isOwner: boolean;
  cargo: string | null;
  person: ActiveGroupMemberPerson;
};

export type MembershipCargoDetail = {
  membership: { id: string; person: ActiveGroupMemberPerson; cargo: string | null };
  editToken: string;
};

export type MembershipCargoUpdateResult = {
  outcome: "UPDATED" | "NO_CHANGES";
  recovered: boolean;
  appliedEffect: null | { membershipId: string; cargo: string | null; confirmedAt: string; editToken: string };
  currentMembership: { id: string; estado: "activa" | "finalizada"; cargo: string | null };
  currentEditToken: string | null;
};

export type ActiveGroupMembersScope = { status: "OPEN_SEASON" | "NO_OPEN_SEASON" };

export type ListActiveGroupMembersResult = {
  scope: ActiveGroupMembersScope;
  items: ActiveGroupMember[];
  nextCursor: string | null;
};
