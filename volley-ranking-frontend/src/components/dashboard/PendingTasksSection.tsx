"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { dashboardTaskQueryReason, createDashboardTasksClient } from "@/services/dashboardTasksService";
import { mergeDashboardTasks } from "@/services/dashboardPresentation.mjs";
import type { DashboardTask, DashboardTaskHealth } from "@/types/DashboardTask";

type LoadState = "loading" | "ready" | "error";

const healthCopy: Record<Exclude<DashboardTaskHealth, "READY">, string> = {
  UPDATING: "Estamos actualizando tus tareas. La lista puede cambiar en la próxima consulta.",
  REBUILDING: "Estamos preparando tus tareas. Todavía no podemos confirmar el total.",
  DEGRADED: "No pudimos actualizar todas tus tareas. Podés reintentar en unos minutos.",
};

function errorCopy(reason: ReturnType<typeof dashboardTaskQueryReason>) {
  if (reason === "PROJECTION_DISABLED") return "La consulta de tareas todavía no está habilitada en este entorno.";
  if (reason === "PROJECTION_NOT_READY") return "Estamos preparando tus tareas. Todavía no hay una lista completa disponible.";
  if (reason === "UNAUTHENTICATED") return "Tu sesión venció. Volvé a ingresar para consultar tus tareas.";
  if (reason === "INVALID_CURSOR" || reason === "CURSOR_EXPIRED" || reason === "COVERAGE_CHANGED") return "La lista cambió mientras la consultabas. Actualizala para continuar.";
  return "No pudimos consultar tus tareas. Intentá nuevamente.";
}

function TaskRow({ task }: { task: DashboardTask }) {
  return (
    <li>
      <Link
        href={task.destination.href}
        className="group flex min-h-16 items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-orange-300 hover:bg-orange-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] dark:hover:bg-orange-950/20"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-[var(--foreground)]">{task.summary}</span>
          <span className="mt-1 block text-sm text-[var(--text-muted)]">
            {task.group.name}{task.season ? ` · ${task.season.name}` : ""}
          </span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-orange-600 transition group-hover:translate-x-0.5">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>
    </li>
  );
}

export function PendingTasksSection({ sessionId }: { sessionId: string | null }) {
  const client = useMemo(() => createDashboardTasksClient(() => sessionId), [sessionId]);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<LoadState>("loading");
  const [items, setItems] = useState<DashboardTask[]>([]);
  const [health, setHealth] = useState<DashboardTaskHealth>();
  const [total, setTotal] = useState<number>();
  const [nextCursor, setNextCursor] = useState<string>();
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState("");

  const load = useCallback(async (cursor?: string) => {
    const append = Boolean(cursor);
    if (append) {
      setLoadingMore(true);
      setPageError("");
    } else {
      setStatus("loading");
      setItems([]);
      setHealth(undefined);
      setTotal(undefined);
      setNextCursor(undefined);
      setError("");
      setPageError("");
    }
    try {
      const result = await client.list(cursor);
      setItems((current) => append ? mergeDashboardTasks(current, result.items) : result.items);
      setHealth(result.coverage.health);
      setTotal(result.coverage.complete ? result.totalTasks : undefined);
      setNextCursor(result.nextCursor);
      setStatus("ready");
    } catch (cause) {
      const reason = dashboardTaskQueryReason(cause);
      if (reason === "STALE_RESPONSE") return;
      if (append) setPageError(errorCopy(reason));
      else {
        setItems([]);
        setHealth(undefined);
        setTotal(undefined);
        setNextCursor(undefined);
        setError(errorCopy(reason));
        setStatus("error");
      }
    } finally {
      if (append) setLoadingMore(false);
    }
  }, [client]);

  useEffect(() => {
    setExpanded(false);
    if (sessionId) void load();
    else {
      client.invalidate();
      setItems([]);
      setTotal(undefined);
      setHealth(undefined);
      setNextCursor(undefined);
    }
    return () => client.invalidate();
  }, [client, load, sessionId]);

  const totalAvailable = status === "ready" && health === "READY" && total !== undefined;
  const trueEmpty = totalAvailable && total === 0 && items.length === 0;
  const contentId = "dashboard-pending-tasks-content";

  return (
    <section aria-labelledby="pending-tasks-title" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex min-h-16 items-center gap-2 px-4 sm:px-5">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform ${expanded ? "rotate-90" : ""}`}>
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span id="pending-tasks-title" className="truncate text-lg font-semibold text-[var(--foreground)]">Pendientes</span>
          {totalAvailable && total > 0 ? (
            <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
              {total} {total === 1 ? "tarea" : "tareas"}
            </span>
          ) : null}
        </button>
        <RefreshButton loading={status === "loading"} onClick={() => void load()} label="Actualizar tareas" />
      </div>

      {expanded ? (
        <div id={contentId} className="border-t border-[var(--border)] px-4 py-4 sm:px-5" aria-live="polite">
          {status === "loading" ? (
            <div role="status" className="space-y-3">
              <span className="sr-only">Consultando tareas</span>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : null}

          {status === "error" ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              <p>{error}</p>
              <button type="button" onClick={() => void load()} className="mt-3 min-h-11 rounded-lg px-3 font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">Reintentar</button>
            </div>
          ) : null}

          {status === "ready" && health && health !== "READY" ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">{healthCopy[health]}</p>
          ) : null}

          {trueEmpty ? (
            <p className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">No hay pendientes</p>
          ) : null}

          {status === "ready" && items.length > 0 ? <ul className="space-y-3">{items.map((task) => <TaskRow key={task.taskId} task={task} />)}</ul> : null}

          {status === "ready" && items.length === 0 && !trueEmpty && health !== "READY" ? (
            <p className="text-sm text-[var(--text-muted)]">Todavía no pudimos completar la lista. Actualizá para volver a intentar.</p>
          ) : null}

          {pageError ? <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{pageError}</p> : null}
          {nextCursor ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load(nextCursor)}
              className="mt-4 min-h-11 rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-wait disabled:opacity-60"
            >
              {loadingMore ? "Cargando…" : "Ver más"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
