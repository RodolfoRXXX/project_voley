"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { dashboardTaskQueryReason, createDashboardTasksClient } from "@/services/dashboardTasksService";
import { mergeDashboardTasks } from "@/services/dashboardPresentation.mjs";
import type { DashboardTask, DashboardTaskHealth } from "@/types/DashboardTask";

function errorMessage(reason: ReturnType<typeof dashboardTaskQueryReason>) {
  if (reason === "GROUP_CONTEXT_NOT_ACCESSIBLE") return "Ya no tenés acceso a las tareas de este Grupo.";
  if (["INVALID_CURSOR", "CURSOR_EXPIRED", "COVERAGE_CHANGED"].includes(reason)) return "La lista cambió. Actualizala para continuar.";
  if (reason === "PROJECTION_NOT_READY") return "Estamos preparando las tareas de este Grupo.";
  return "No pudimos consultar las tareas de este Grupo.";
}

const COVERAGE_RETRY_DELAYS_MS = [250, 500, 1000, 2000] as const;
type LoadTasks = (cursor?: string, coverageRetry?: number, background?: boolean) => Promise<void>;

export function useGroupDashboardTasks(groupId: string, sessionId: string | null) {
  const client = useMemo(() => createDashboardTasksClient(() => sessionId), [sessionId]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<DashboardTask[]>([]);
  const [health, setHealth] = useState<DashboardTaskHealth>();
  const [pendingRequests, setPendingRequests] = useState<number>();
  const [nextCursor, setNextCursor] = useState<string>();
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRef = useRef<LoadTasks>(async () => undefined);

  const scheduleCoverageRetry = useCallback((attempt: number) => {
    if (attempt >= COVERAGE_RETRY_DELAYS_MS.length) return;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      void loadRef.current(undefined, attempt + 1, true);
    }, COVERAGE_RETRY_DELAYS_MS[attempt]);
  }, []);

  const load = useCallback<LoadTasks>(async (cursor, coverageRetry = 0, background = false) => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    const append = Boolean(cursor);
    if (append) setLoadingMore(true);
    else if (!background) { setStatus("loading"); setItems([]); setPendingRequests(undefined); setNextCursor(undefined); setError(""); }
    try {
      const page = await client.list(cursor, groupId);
      setItems((current) => append ? mergeDashboardTasks(current, page.items) : page.items);
      setHealth(page.coverage.health);
      const context = page.coverage.complete && page.coverage.health === "READY"
        ? page.groupTaskCounts?.find((entry) => entry.groupId === groupId) : undefined;
      setPendingRequests(context?.N20);
      setNextCursor(page.nextCursor);
      setStatus("ready");
      setError("");
      if (!cursor && (!page.coverage.complete || page.coverage.health !== "READY")) scheduleCoverageRetry(coverageRetry);
    } catch (cause) {
      const reason = dashboardTaskQueryReason(cause);
      if (reason === "STALE_RESPONSE") return;
      if (!cursor && reason === "PROJECTION_NOT_READY") {
        setHealth("UPDATING"); setPendingRequests(undefined); setStatus("ready"); setError("");
        scheduleCoverageRetry(coverageRetry); return;
      }
      setError(errorMessage(reason));
      setStatus("error");
    } finally { setLoadingMore(false); }
  }, [client, groupId, scheduleCoverageRetry]);

  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    if (sessionId) void load();
    return () => {
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
      client.invalidate();
    };
  }, [client, load, sessionId]);

  return { status, items, health, pendingRequests, nextCursor, error, loadingMore, load };
}
