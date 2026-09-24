"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { getSeasonErrorReason, getSeasonHistoryErrorMessage, listSeasonsForOwnedGroup } from "@/services/seasonsService";
import type { ClosedSeasonHistory, OpenSeasonHistory } from "@/types/SeasonHistory";
import { OpenSeasonSection } from "./OpenSeasonSection";

const resetReasons = new Set(["CURSOR_STALE", "CURSOR_INVALID"]);
const accessReasons = new Set(["GROUP_NOT_ACCESSIBLE", "GROUP_NOT_FOUND", "NOT_AUTHORIZED"]);

export function SeasonHistorySection({ groupId }: { groupId: string }) {
  const [current, setCurrent] = useState<OpenSeasonHistory | null>(null);
  const [closed, setClosed] = useState<ClosedSeasonHistory[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [incrementalError, setIncrementalError] = useState("");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const generation = useRef(0);
  const appendedHeading = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async (mode: "reset" | "more", announcement = "") => {
    if (inFlight.current) return;
    inFlight.current = true;
    const requestGeneration = generation.current;
    if (mode === "reset") { setStatus("loading"); setIncrementalError(""); }
    else { setLoadingMore(true); setIncrementalError(""); }
    try {
      const page = await listSeasonsForOwnedGroup(groupId, mode === "more" ? cursor ?? undefined : undefined);
      if (requestGeneration !== generation.current) return;
      const priorIds = new Set(closed.map((season) => season.id));
      if (mode === "more" && page.closedSeasons.some((season) => priorIds.has(season.id))) {
        inFlight.current = false; setLoadingMore(false); generation.current += 1;
        setClosed([]); setCursor(null); setHasMore(false);
        const message = "El historial cambió mientras lo consultabas. Reiniciamos la lista.";
        setNotice(message); await load("reset", message); return;
      }
      setCurrent(page.currentSeason);
      setClosed((items) => mode === "more" ? [...items, ...page.closedSeasons] : page.closedSeasons);
      setCursor(page.nextCursor); setHasMore(page.hasMore); setStatus("ready");
      if (mode === "more") queueMicrotask(() => appendedHeading.current?.focus());
      if (announcement) setNotice(announcement);
    } catch (cause) {
      if (requestGeneration !== generation.current) return;
      const reason = getSeasonErrorReason(cause);
      if (accessReasons.has(reason)) { setCurrent(null); setClosed([]); setCursor(null); setHasMore(false); }
      if (resetReasons.has(reason) && mode === "more") {
        inFlight.current = false; setLoadingMore(false); generation.current += 1;
        setCurrent(null); setClosed([]); setCursor(null); setHasMore(false);
        const message = getSeasonHistoryErrorMessage(reason);
        setNotice(message); await load("reset", message); return;
      }
      const message = getSeasonHistoryErrorMessage(reason);
      if (mode === "more") setIncrementalError(message);
      else { setNotice(""); setStatus("error"); setIncrementalError(message); }
    } finally {
      if (requestGeneration === generation.current) { inFlight.current = false; setLoadingMore(false); }
    }
  }, [closed, cursor, groupId]);

  useEffect(() => {
    generation.current += 1; inFlight.current = false;
    setCurrent(null); setClosed([]); setCursor(null); setHasMore(false); setNotice("");
    void load("reset");
    return () => { generation.current += 1; inFlight.current = false; };
  // Accumulated rows intentionally do not restart the Group lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  return <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="seasons-heading" aria-busy={status === "loading" || loadingMore}>
    <h2 id="seasons-heading" className="text-lg font-semibold">Temporadas</h2>
    <div className="sr-only" aria-live="polite">{notice}{loadingMore ? "Cargando más Temporadas." : ""}</div>
    {notice ? <p className="mt-3 text-sm text-blue-800">{notice}</p> : null}
    {status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Cargando Temporadas…</p> : null}
    {status === "error" ? <div className="mt-3"><p role="alert" className="text-sm text-red-700">{incrementalError}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => void load("reset")}>Reintentar</button></div> : null}
    {status === "ready" ? <div className="mt-5 grid min-w-0 gap-7">
      <section aria-labelledby="current-season-heading">
        <h3 id="current-season-heading" className="font-semibold">Actual</h3>
        {!current ? <div className="mt-3 space-y-4"><p className="text-sm text-[var(--text-muted)]">No hay una Temporada actual. Es un estado válido.</p><Link href={`/dashboard/groups/${groupId}/seasons/new`} className="inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white">Crear y abrir temporada</Link></div> : <article className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Abierta · actual</p><h4 className="mt-1 text-lg font-semibold text-emerald-950">{current.nombre}</h4><p className="mt-2 text-sm text-emerald-900">Fecha de inicio: <time dateTime={current.fechaInicio}>{current.fechaInicio}</time></p><OpenSeasonSection groupId={groupId} season={current} onClosed={() => { generation.current += 1; inFlight.current = false; void load("reset", "Temporada cerrada. Historial actualizado."); }} /></article>}
      </section>
      <section aria-labelledby="previous-seasons-heading">
        <h3 ref={appendedHeading} tabIndex={-1} id="previous-seasons-heading" className="font-semibold focus:outline-none">Anteriores</h3>
        {!closed.length ? <p className="mt-3 text-sm text-[var(--text-muted)]">Todavía no hay temporadas anteriores.</p> : <ol className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">{closed.map((season) => <li key={season.id} className="min-w-0 rounded-xl border border-[var(--border)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Cerrada</p><h4 className="mt-1 break-words font-semibold">{season.nombre}</h4><p className="mt-2 text-sm">Inicio: <time dateTime={season.fechaInicio}>{season.fechaInicio}</time></p><p className="mt-1 text-sm text-[var(--text-muted)]">Cierre: <time dateTime={season.closedAt}>{new Date(season.closedAt).toLocaleDateString("es-AR")}</time></p></li>)}</ol>}
        {incrementalError && status === "ready" ? <p role="alert" className="mt-3 text-sm text-red-700">{incrementalError}</p> : null}
        {hasMore ? <button type="button" disabled={loadingMore} className="mt-4 min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:cursor-wait disabled:opacity-60" onClick={() => void load("more")}>{loadingMore ? "Cargando…" : incrementalError ? "Reintentar" : "Cargar más"}</button> : null}
      </section>
    </div> : null}
  </section>;
}
