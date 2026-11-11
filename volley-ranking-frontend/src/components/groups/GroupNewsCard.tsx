"use client";

import Link from "next/link";
import type { ReturnTypeOfGroupTasks } from "./groupDashboardTaskTypes";

export function GroupNewsCard({ tasks }: { tasks: ReturnTypeOfGroupTasks }) {
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="group-news-title">
    <h2 id="group-news-title" className="text-xl font-semibold">Novedades</h2>
    {tasks.status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Consultando novedades…</p> : null}
    {tasks.status === "error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{tasks.error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void tasks.load()}>Reintentar</button></div> : null}
    {tasks.status === "ready" && tasks.health !== "READY" ? <div className="mt-3 text-sm text-amber-800"><p>La cobertura está actualizándose; no mostramos totales inciertos.</p><button type="button" className="mt-2 min-h-11 rounded-lg border border-amber-500 px-3 font-semibold" onClick={() => void tasks.load()}>Reintentar ahora</button></div> : null}
    {tasks.status === "ready" && tasks.items.length === 0 ? <p className="mt-3 text-sm text-[var(--text-muted)]">No hay novedades acreditadas para mostrar.</p> : null}
    {tasks.items.length ? <ul className="mt-4 grid gap-3">{tasks.items.map((task) => <li key={task.taskId}><Link href={task.destination.href} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-3 font-medium hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><span>{task.summary}</span><span aria-hidden="true">→</span></Link></li>)}</ul> : null}
    {tasks.nextCursor ? <button type="button" disabled={tasks.loadingMore} className="mt-4 min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-60" onClick={() => void tasks.load(tasks.nextCursor)}>{tasks.loadingMore ? "Cargando…" : "Ver más"}</button> : null}
  </section>;
}
