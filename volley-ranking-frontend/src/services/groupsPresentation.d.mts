import type { MyCurrentGroupMembership } from "@/types/MyCurrentGroupMembership";
import type { OwnGroup } from "@/types/OwnGroup";
import type { OwnGroupMembershipHistoryItem } from "@/types/OwnGroupMembershipHistory";

export type GroupFilter = "all" | "admin" | "member";
export type PresentableGroup = {
  groupId: string; name: string; sport: "voleibol"; state: "activo";
  administers: boolean; participates: boolean; membershipId?: string; membershipKey?: string;
};
export function membershipRelationKey(item: MyCurrentGroupMembership): string;
export function historyRelationKey(item: OwnGroupMembershipHistoryItem): string;
export function mergePresentableGroups(ownedGroups: OwnGroup[], memberships: MyCurrentGroupMembership[]): PresentableGroup[];
export function filterPresentableGroups(items: PresentableGroup[], filter: GroupFilter): PresentableGroup[];
export function visibleHistoryItems(items: OwnGroupMembershipHistoryItem[], visibleMembershipKeys: Set<string>): OwnGroupMembershipHistoryItem[];
export function collectCurrentMembershipPages(
  fetchPage: (cursor?: string) => Promise<{ items: MyCurrentGroupMembership[]; nextCursor: string | null }>,
  isCurrent?: () => boolean,
  onItems?: (items: MyCurrentGroupMembership[]) => void,
): Promise<{ items: MyCurrentGroupMembership[]; cancelled: boolean }>;
