"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { visibleHistoryItems } from "@/services/groupsPresentation.mjs";
import { getMembershipErrorMessage, getMembershipErrorReason, listMyGroupMembershipHistory } from "@/services/membershipsService";
import type { OwnGroup } from "@/types/OwnGroup";
import type { OwnGroupMembershipHistoryItem } from "@/types/OwnGroupMembershipHistory";

type Props = { archivedGroups: OwnGroup[]; visibleMembershipKeys: Set<string>; membershipHistoryAvailable: boolean };

export function OwnGroupMembershipHistorySection({ archivedGroups, visibleMembershipKeys, membershipHistoryAvailable }: Props) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OwnGroupMembershipHistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "person-required">("idle");
  const [error, setError] = useState("");
  const generation = useRef(0);
  const inFlight = useRef(false);
  const seenCursors = useRef(new Set<string>());

  useEffect(() => {
    generation.current += 1; inFlight.current = false;
    seenCursors.current.clear(); setOpen(false); setItems([]); setCursor(null); setHasMore(false); setStatus("idle"); setError("");
    return () => { generation.current += 1; inFlight.current = false; };
  }, [firebaseUser?.uid]);

  const load = useCallback(async (more = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const requestGeneration = generation.current;
    if (!more) { setStatus("loading"); setError(""); }
    try {
      const page = await listMyGroupMembershipHistory(more && cursor ? { pageSize: 20, cursor } : { pageSize: 20 });
      if (requestGeneration !== generation.current) return;
      if (!more) seenCursors.current.clear();
      if (page.nextCursor && (page.nextCursor === cursor || seenCursors.current.has(page.nextCursor))) throw new Error("MEMBERSHIP_HISTORY_CURSOR_REPEATED");
      if (page.nextCursor) seenCursors.current.add(page.nextCursor);
      setItems((current) => more ? [...current, ...page.items] : page.items);
      setCursor(page.nextCursor); setHasMore(page.hasMore); setStatus("ready");
    } catch (cause) {
      if (requestGeneration !== generation.current) return;
      const reason = getMembershipErrorReason(cause);
      setError(getMembershipErrorMessage(reason));
      setStatus(reason === "PERSON_REQUIRED" ? "person-required" : "error");
    } finally {
      if (requestGeneration === generation.current) inFlight.current = false;
    }
  }, [cursor]);

  const visibleItems = useMemo(() => visibleHistoryItems(items, visibleMembershipKeys), [items, visibleMembershipKeys]);
  const archived = archivedGroups.filter((group): group is Extract<OwnGroup, { estado: "archivado" }> => group.estado === "archivado");
  const empty = status === "ready" && membershipHistoryAvailable && archived.length === 0 && visibleItems.length === 0;

  return <section className="mt-8 border-t border-[var(--border)] pt-5">
    <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" aria-expanded={open} onClick={() => { const next = !open; setOpen(next); if (next && status === "idle") { if (membershipHistoryAvailable) void load(false); else setStatus("ready"); } }}><span>Historial</span><span aria-hidden="true">{open ? "⌃" : "⌄"}</span></button>
    {open ? <div className="mt-4 space-y-5" aria-busy={status === "loading"}>
      {archived.length ? <section aria-labelledby="archived-owned-title"><h2 id="archived-owned-title" className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Grupos propios archivados</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{archived.map((group) => <Link key={group.id} href={`/dashboard/groups/${group.id}`} className="rounded-xl border border-[var(--border)] p-4 focus-visible:outline-2 focus-visible:outline-offset-2"><span className="block font-semibold">{group.nombre}</span><span className="mt-1 block text-sm text-[var(--text-muted)]">Archivado el {new Date(group.archivedAt).toLocaleDateString("es-AR")}</span></Link>)}</div></section> : null}
      {status === "loading" ? <p role="status" className="rounded-xl border p-4">Cargando historial…</p> : null}
      {status === "error" ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><p>{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 font-semibold" onClick={() => void load(false)}>Reintentar historial</button></div> : null}
      {visibleItems.length ? <section aria-labelledby="membership-history-title"><h2 id="membership-history-title" className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Pertenencias</h2><ol className="mt-3 grid gap-3 sm:grid-cols-2">{visibleItems.map((item) => <li key={item.rowKey} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{item.group.nombre}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{item.status === "CURRENT" ? "Actual" : "Finalizada"}</span></div><p className="mt-2 text-sm">Temporada: {item.season.nombre}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Ingreso: {new Date(item.joinedAt).toLocaleDateString("es-AR", { timeZone: "UTC" })}</p>{item.leftAt ? <p className="mt-1 text-sm text-[var(--text-muted)]">Egreso: {new Date(item.leftAt).toLocaleDateString("es-AR", { timeZone: "UTC" })}</p> : null}<p className="mt-1 text-sm text-[var(--text-muted)]">{item.validityPeriodCount === 1 ? "1 período de vigencia" : `${item.validityPeriodCount} períodos de vigencia`}</p></li>)}</ol></section> : null}
      {empty ? <p className="rounded-xl border border-dashed p-6 text-center font-semibold">No hay historial para mostrar</p> : null}
      {status === "ready" && hasMore && cursor ? <button type="button" className="min-h-11 rounded-lg border border-orange-500 px-4 font-semibold text-orange-700" onClick={() => void load(true)}>Cargar más</button> : null}
    </div> : null}
  </section>;
}
