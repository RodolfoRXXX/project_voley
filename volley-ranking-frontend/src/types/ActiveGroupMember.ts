export type ActiveGroupMemberPerson =
  | { status: "AVAILABLE"; firstName: string; lastName: string }
  | { status: "UNAVAILABLE" };

export type ActiveGroupMember = {
  membershipId: string;
  joinedAt: string;
  isOwner: boolean;
  person: ActiveGroupMemberPerson;
};

export type ActiveGroupMembersScope = { status: "OPEN_SEASON" | "NO_OPEN_SEASON" };

export type ListActiveGroupMembersResult = {
  scope: ActiveGroupMembersScope;
  items: ActiveGroupMember[];
  nextCursor: string | null;
};
