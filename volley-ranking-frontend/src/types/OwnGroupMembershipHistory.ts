export type OwnGroupMembershipHistoryItem = {
  rowKey: string;
  group: { id: string; nombre: string };
  season: { id: string; nombre: string };
  status: "CURRENT" | "HISTORICAL";
  joinedAt: string;
  leftAt?: string;
  validityPeriodCount: number;
  continuity: "INITIAL" | "RENEWAL";
};

export type ListMyGroupMembershipHistoryResult = {
  items: OwnGroupMembershipHistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
};
