export type DashboardTaskKind = "N20" | "N31";
export type DashboardTaskHealth = "READY" | "UPDATING" | "REBUILDING" | "DEGRADED";

export interface DashboardTask {
  taskId: string;
  kind: DashboardTaskKind;
  resourceId: string;
  actionableAt: string;
  group: { id: string; name: string };
  season?: { id: string; name: string };
  summary: string;
  destination: { href: string };
}

export interface DashboardTaskPage {
  coverage: { version: "N20_N31_V1"; complete: boolean; health: DashboardTaskHealth;
    asOf: string; generationId: string };
  totalTasks?: number;
  groupTaskCounts?: { groupId: string; count: number; N20: number; N31: number }[];
  items: DashboardTask[];
  nextCursor?: string;
}

export type DashboardTaskQueryReason = "UNAUTHENTICATED" | "VALIDATION_FAILED" | "PROJECTION_DISABLED"
  | "PROJECTION_NOT_READY" | "COVERAGE_CHANGED" | "INCOMPATIBLE_STATE" | "DEPENDENCY_UNAVAILABLE"
  | "INVALID_CURSOR" | "CURSOR_EXPIRED" | "GROUP_CONTEXT_NOT_ACCESSIBLE" | "INTERNAL_ERROR" | "STALE_RESPONSE";
