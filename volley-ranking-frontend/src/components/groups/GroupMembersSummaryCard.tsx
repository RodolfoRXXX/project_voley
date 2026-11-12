"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CopyGroupJoinLinkButton } from "./CopyGroupJoinLinkButton";
import type { ReturnTypeOfGroupTasks } from "./groupDashboardTaskTypes";
import { getActiveGroupMemberTotalForOwnedGroup, reconcileActiveGroupMemberTotalForOwnedGroup } from "@/services/membershipsService";

export function GroupMembersSummaryCard({ groupId, tasks }: { groupId: string; tasks: ReturnTypeOfGroupTasks }) {
  const [total, setTotal] = useState<number | null>(null);
  const [totalStatus, setTotalStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const loadTotal = useCallback(async () => {
    setTotalStatus("loading");
    try {
      const result = await getActiveGroupMemberTotalForOwnedGroup(groupId);
      if (result.status === "READY" || result.status === "NO_OPEN_SEASON") { setTotal(result.total); setTotalStatus("ready"); }
      else { setTotal(null); setTotalStatus("unavailable"); }
    } catch { setTotal(null); setTotalStatus("unavailable"); }
  }, [groupId]);
  const reconcileTotal = useCallback(async () => {
    setTotalStatus("loading");
    try {
      const result = await reconcileActiveGroupMemberTotalForOwnedGroup(groupId);
      if (result.status === "READY" || result.status === "NO_OPEN_SEASON") { setTotal(result.total); setTotalStatus("ready"); }
      else { setTotal(null); setTotalStatus("unavailable"); }
    } catch { setTotal(null); setTotalStatus("unavailable"); }
  }, [groupId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTotal(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTotal]);
  useEffect(() => {
    const refresh = (event: Event) => { if ((event as CustomEvent<{ groupId?: string }>).detail?.groupId === groupId) void loadTotal(); };
    window.addEventListener("group-membership-changed", refresh);
    window.addEventListener("season-context-changed", refresh);
    return () => { window.removeEventListener("group-membership-changed", refresh); window.removeEventListener("season-context-changed", refresh); };
  }, [groupId, loadTotal]);

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="group-members-summary-title">
    <div className="flex items-start justify-between gap-3"><h2 id="group-members-summary-title" className="text-xl font-semibold">Integrantes</h2><CopyGroupJoinLinkButton key={groupId} groupId={groupId} /></div>
    {totalStatus === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Calculando total exacto…</p> : null}
    {totalStatus === "ready" && total !== null ? <p className="mt-3 text-sm"><span className="font-semibold">{total}</span> {total === 0 ? "integrantes" : total === 1 ? "integrante activo" : "integrantes activos"}</p> : null}
    {totalStatus === "unavailable" ? <div className="mt-3"><p className="text-sm text-[var(--text-muted)]">Total no disponible</p><button type="button" className="mt-2 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void reconcileTotal()}>Reintentar</button></div> : null}
    {tasks.status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Consultando solicitudes pendientes…</p> : null}
    {tasks.status === "error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{tasks.error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void tasks.load()}>Reintentar</button></div> : null}
    {tasks.status === "ready" && tasks.pendingRequests !== undefined ? <p className="mt-3 text-sm"><span className="font-semibold">{tasks.pendingRequests}</span> {tasks.pendingRequests === 1 ? "solicitud pendiente" : "solicitudes pendientes"}</p> : null}
    {tasks.status === "ready" && tasks.pendingRequests === undefined ? <p className="mt-3 text-sm text-[var(--text-muted)]">Todavía no podemos acreditar la cantidad de solicitudes pendientes.</p> : null}
    <Link href={`/dashboard/groups/${groupId}/members`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Abrir integrantes</Link>
  </section>;
}
