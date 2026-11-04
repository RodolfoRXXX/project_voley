"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { dashboardTaskQueryReason, createDashboardTasksClient } from "@/services/dashboardTasksService";
import { mergeDashboardTasks } from "@/services/dashboardPresentation.mjs";
import type { DashboardTask, DashboardTaskHealth } from "@/types/DashboardTask";

function errorMessage(reason: ReturnType<typeof dashboardTaskQueryReason>) {
  if (reason === "GROUP_CONTEXT_NOT_ACCESSIBLE") return "Ya no tenés acceso a las tareas de este Grupo.";
  if (["INVALID_CURSOR", "CURSOR_EXPIRED", "COVERAGE_CHANGED"].includes(reason)) return "La lista cambió. Actualizala para continuar.";
  if (reason === "PROJECTION_NOT_READY") return "Estamos preparando las tareas de este Grupo.";
  return "No pudimos consultar las tareas de este Grupo.";
}

export function useGroupDashboardTasks(groupId: string, sessionId: string | null) {
  const client = useMemo(() => createDashboardTasksClient(() => sessionId), [sessionId]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<DashboardTask[]>([]);
  const [health, setHealth] = useState<DashboardTaskHealth>();
  const [pendingRequests, setPendingRequests] = useState<number>();
  const [nextCursor, setNextCursor] = useState<string>();
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    const append = Boolean(cursor);
    if (append) setLoadingMore(true);
    else { setStatus("loading"); setItems([]); setPendingRequests(undefined); setNextCursor(undefined); setError(""); }
    try {
      const page = await client.list(cursor, groupId);
      setItems((current) => append ? mergeDashboardTasks(current, page.items) : page.items);
      setHealth(page.coverage.health);
      const context = page.coverage.complete && page.coverage.health === "READY"
        ? page.groupTaskCounts?.find((entry) => entry.groupId === groupId) : undefined;
      setPendingRequests(context?.N20);
      setNextCursor(page.nextCursor);
      setStatus("ready");
    } catch (cause) {
      const reason = dashboardTaskQueryReason(cause);
      if (reason === "STALE_RESPONSE") return;
      setError(errorMessage(reason));
      setStatus("error");
    } finally { setLoadingMore(false); }
  }, [client, groupId]);

  useEffect(() => {
    if (sessionId) void load();
    return () => client.invalidate();
  }, [client, load, sessionId]);

  return { status, items, health, pendingRequests, nextCursor, error, loadingMore, load };
}
