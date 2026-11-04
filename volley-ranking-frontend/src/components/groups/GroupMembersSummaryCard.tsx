"use client";

import Link from "next/link";
import { CopyGroupJoinLinkButton } from "./CopyGroupJoinLinkButton";
import type { ReturnTypeOfGroupTasks } from "./groupDashboardTaskTypes";

export function GroupMembersSummaryCard({ groupId, tasks }: { groupId: string; tasks: ReturnTypeOfGroupTasks }) {
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="group-members-summary-title">
    <div className="flex items-start justify-between gap-3"><h2 id="group-members-summary-title" className="text-xl font-semibold">Integrantes</h2><CopyGroupJoinLinkButton key={groupId} groupId={groupId} /></div>
    {tasks.status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Consultando solicitudes pendientes…</p> : null}
    {tasks.status === "error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{tasks.error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void tasks.load()}>Reintentar</button></div> : null}
    {tasks.status === "ready" && tasks.pendingRequests !== undefined ? <p className="mt-3 text-sm"><span className="font-semibold">{tasks.pendingRequests}</span> {tasks.pendingRequests === 1 ? "solicitud pendiente" : "solicitudes pendientes"}</p> : null}
    {tasks.status === "ready" && tasks.pendingRequests === undefined ? <p className="mt-3 text-sm text-[var(--text-muted)]">Todavía no podemos acreditar la cantidad de solicitudes pendientes.</p> : null}
    <Link href={`/dashboard/groups/${groupId}/members`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Abrir integrantes</Link>
  </section>;
}
