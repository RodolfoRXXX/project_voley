export type MyCurrentGroupMembership = {
  membership: { id: string; seasonId: string; estado: "activa"; fechaIngreso: string };
  group: { id: string; nombre: string; deporte: "voleibol"; estado: "activo"; viewerIsOwner: boolean };
};

export type LeaveMyGroupMembershipResult = {
  outcome: "EXIT_CONFIRMED";
  exit: {
    membershipId: string;
    groupId: string;
    seasonId: string;
    activationOrdinal: number;
    endedAt: string;
    actorWasOwner: boolean;
  };
};

export type ListMyCurrentGroupMembershipsResult = {
  items: MyCurrentGroupMembership[];
  nextCursor: string | null;
};
