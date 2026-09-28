"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { usePerson } from "@/hooks/usePerson";
import { getMembershipErrorMessage, getMembershipErrorReason, listMyGroupMembershipHistory } from "@/services/membershipsService";
import type { MembershipErrorReason } from "@/types/OwnMembership";
import type { OwnGroupMembershipHistoryItem } from "@/types/OwnGroupMembershipHistory";

const resetReasons = new Set<MembershipErrorReason>(["CURSOR_INVALID", "CURSOR_STALE"]);
const clearReasons = new Set<MembershipErrorReason>(["UNAUTHENTICATED", "ACCOUNT_REQUIRED", "PERSON_REQUIRED", "PERSON_INCOMPATIBLE"]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export function OwnGroupMembershipHistorySection() {
  const { firebaseUser, accountStatus } = useAuth();
  const { person, personStatus } = usePerson();
  const [items, setItems] = useState<OwnGroupMembershipHistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "person-required">("idle");
  const [reason, setReason] = useState<MembershipErrorReason | null>(null);
  const [incrementalError, setIncrementalError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const itemsRef = useRef<OwnGroupMembershipHistoryItem[]>([]);
  const cursorRef = useRef<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const replaceItems = useCallback((next: OwnGroupMembershipHistoryItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const replaceCursor = useCallback((next: string | null) => {
    cursorRef.current = next;
    setCursor(next);
  }, []);

  const load = useCallback(async (mode: "reset" | "more", announcement = "") => {
    if (inFlight.current) return;
    inFlight.current = true;
    const requestGeneration = generation.current;
    const prior = itemsRef.current;
    if (mode === "reset") { setStatus("loading"); setReason(null); setIncrementalError(""); }
    else { setLoadingMore(true); setIncrementalError(""); }
    try {
      const page = await listMyGroupMembershipHistory(mode === "more" && cursorRef.current ? { cursor: cursorRef.current } : {});
      if (requestGeneration !== generation.current) return;
      const known = new Set(prior.map((item) => item.rowKey));
      if (mode === "more" && page.items.some((item) => known.has(item.rowKey))) {
        inFlight.current = false; setLoadingMore(false); generation.current += 1;
        replaceItems([]); replaceCursor(null); setHasMore(false);
        const message = "El historial cambió mientras lo consultabas. Reiniciamos la lista.";
        setNotice(message); await load("reset", message); return;
      }
      const next = mode === "more" ? [...prior, ...page.items] : page.items;
      replaceItems(next); replaceCursor(page.nextCursor); setHasMore(page.hasMore); setStatus("ready"); setReason(null);
      if (announcement) setNotice(announcement);
      if (mode === "more" && page.items.length) {
        const firstKey = page.items[0].rowKey;
        queueMicrotask(() => listRef.current?.querySelector<HTMLElement>(`[data-row-key="${firstKey}"]`)?.focus());
      }
    } catch (cause) {
      if (requestGeneration !== generation.current) return;
      const nextReason = getMembershipErrorReason(cause);
      if (clearReasons.has(nextReason)) { replaceItems([]); replaceCursor(null); setHasMore(false); }
      if (mode === "more" && resetReasons.has(nextReason)) {
        inFlight.current = false; setLoadingMore(false); generation.current += 1;
        replaceItems([]); replaceCursor(null); setHasMore(false);
        const message = getMembershipErrorMessage(nextReason);
        setNotice(message); await load("reset", message); return;
      }
      setReason(nextReason);
      if (mode === "more") { setIncrementalError(getMembershipErrorMessage(nextReason)); setStatus("ready"); }
      else setStatus(nextReason === "PERSON_REQUIRED" ? "person-required" : "error");
    } finally {
      if (requestGeneration === generation.current) { inFlight.current = false; setLoadingMore(false); }
    }
  }, [replaceCursor, replaceItems]);

  useEffect(() => {
    generation.current += 1; inFlight.current = false;
    replaceItems([]); replaceCursor(null); setHasMore(false); setNotice(""); setReason(null); setIncrementalError("");
    if (!firebaseUser?.uid) { setStatus("idle"); return; }
    if (accountStatus !== "ready" || personStatus === "loading" || personStatus === "idle") { setStatus("loading"); return; }
    void load("reset");
    return () => { generation.current += 1; inFlight.current = false; };
  // Session and Person identity deliberately reset all accumulated private rows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid, accountStatus, person?.personId, personStatus]);

  return <section aria-labelledby="group-history-title" aria-busy={status === "loading" || loadingMore} className="space-y-4">
    <div>
      <h2 id="group-history-title" className="text-2xl font-semibold">Historial de grupos</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Esta cronología incluye tus pertenencias actuales y finalizadas. Las actuales también aparecen en ‘Grupos que integrás’, donde están disponibles las acciones operativas.</p>
    </div>
    <div className="sr-only" aria-live="polite">{notice}{loadingMore ? "Cargando más pertenencias." : ""}</div>
    {notice ? <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{notice}</p> : null}
    {status === "loading" ? <p role="status" className="rounded-xl border border-[var(--border)] p-5">Cargando tu historial…</p> : null}
    {status === "person-required" ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><p>Necesitás vincular tu Persona para consultar tu historial.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-500 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" href="/profile/person">Ir a mi Persona</Link></div> : null}
    {status === "error" ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><p>{getMembershipErrorMessage(reason || "INTERNAL_ERROR")}</p><button type="button" className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load("reset")}>Reintentar</button></div> : null}
    {status === "ready" && !items.length ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center sm:p-10"><p className="font-semibold">Todavía no tenés pertenencias registradas</p></div> : null}
    {items.length ? <ol ref={listRef} className="grid min-w-0 gap-4 sm:grid-cols-2">{items.map((item) => <li key={item.rowKey} data-row-key={item.rowKey} tabIndex={-1} className="min-w-0 rounded-2xl border border-[var(--border)] p-5 focus-visible:outline-2 focus-visible:outline-offset-2">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-lg font-semibold">{item.group.nombre}</h3><span className={item.status === "CURRENT" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"}>{item.status === "CURRENT" ? "Actual" : "Finalizada"}</span></div>
      <p className="mt-2 break-words text-sm">Temporada: <span className="font-medium">{item.season.nombre}</span></p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Ingreso: <time dateTime={item.joinedAt}>{formatDate(item.joinedAt)}</time></p>
      {item.leftAt ? <p className="mt-1 text-sm text-[var(--text-muted)]">Egreso: <time dateTime={item.leftAt}>{formatDate(item.leftAt)}</time></p> : null}
      <p className="mt-2 text-sm">Origen: <span className="font-medium">{item.continuity === "RENEWAL" ? "Renovación intertemporada" : "Alta inicial"}</span></p>
      <p className="mt-1 text-sm">{item.validityPeriodCount === 1 ? "Período de vigencia" : "Períodos de vigencia"}: <span className="font-medium">{item.validityPeriodCount}</span></p>
    </li>)}</ol> : null}
    {incrementalError ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"><p>{incrementalError}</p></div> : null}
    {status === "ready" && hasMore && cursor ? <button type="button" disabled={loadingMore} className="min-h-11 rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60" onClick={() => void load("more")}>{loadingMore ? "Cargando…" : incrementalError ? "Reintentar" : "Cargar más"}</button> : null}
  </section>;
}
