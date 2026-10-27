import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase";
import type { DashboardTaskPage, DashboardTaskQueryReason } from "@/types/DashboardTask";
import { createDashboardTaskRequestGate, StaleDashboardTaskResponseError } from "./dashboardTaskRequestGate.mjs";

const listCall = httpsCallable<{ coverage: "N20_N31_V1"; cursor?: string }, DashboardTaskPage>(functions, "listMyDashboardTasks");

export function createDashboardTasksClient(getSessionId: () => string | null = () => auth.currentUser?.uid ?? null) {
  const gate = createDashboardTaskRequestGate(getSessionId);
  return Object.freeze({
    list(cursor?: string) {
      return gate.run(async () => (await listCall({ coverage: "N20_N31_V1", ...(cursor ? { cursor } : {}) })).data);
    },
    invalidate() { gate.invalidate(); },
  });
}

export function dashboardTaskQueryReason(error: unknown): DashboardTaskQueryReason {
  if (error instanceof StaleDashboardTaskResponseError) return "STALE_RESPONSE";
  const reason = typeof error === "object" && error && "details" in error
    && typeof (error as { details?: unknown }).details === "object" && (error as { details?: { reason?: unknown } }).details
    ? String((error as { details: { reason?: unknown } }).details.reason) : "INTERNAL_ERROR";
  const known: DashboardTaskQueryReason[] = ["UNAUTHENTICATED", "VALIDATION_FAILED", "PROJECTION_DISABLED",
    "PROJECTION_NOT_READY", "COVERAGE_CHANGED", "INCOMPATIBLE_STATE", "DEPENDENCY_UNAVAILABLE",
    "INVALID_CURSOR", "CURSOR_EXPIRED", "INTERNAL_ERROR", "STALE_RESPONSE"];
  return known.includes(reason as DashboardTaskQueryReason) ? reason as DashboardTaskQueryReason : "INTERNAL_ERROR";
}
