"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getMembershipErrorMessage, getMembershipErrorReason, listMyGroupMembershipHistory } from "@/services/membershipsService";
import type { OwnGroupMembershipHistoryItem } from "@/types/OwnGroupMembershipHistory";

export function OwnGroupMembershipHistorySection({ available }: { available: boolean }) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OwnGroupMembershipHistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const generation = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    generation.current += 1; busy.current = false; setOpen(false); setItems([]); setCursor(null); setStatus("idle"); setError("");
    return () => { generation.current += 1; busy.current = false; };
  }, [firebaseUser?.uid]);

  const load = useCallback(async (nextCursor?: string) => {
    if (busy.current) return;
    busy.current = true; const currentGeneration = generation.current; setStatus("loading"); setError("");
    try {
      const page = await listMyGroupMembershipHistory({ pageSize: 5, ...(nextCursor ? { cursor: nextCursor } : {}) });
      if (currentGeneration !== generation.current) return;
      setItems((current) => nextCursor ? [...current, ...page.items.filter((item) => !current.some((known) => known.rowKey === item.rowKey))] : page.items);
      setCursor(page.nextCursor); setStatus("ready");
    } catch (cause) {
      if (currentGeneration !== generation.current) return;
      setError(getMembershipErrorMessage(getMembershipErrorReason(cause))); setStatus("error");
    } finally { if (currentGeneration === generation.current) busy.current = false; }
  }, []);

  return <section className="mt-8 border-t border-[var(--border)] pt-5">
    <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left text-xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" aria-expanded={open} onClick={() => { const next = !open; setOpen(next); if (next && status === "idle" && available) void load(); }}><span>Historial</span><span aria-hidden="true">{open ? "⌃" : "⌄"}</span></button>
    {open ? <div className="mt-4" aria-busy={status === "loading"}>
      {!available ? <p className="rounded-xl border border-dashed p-5 text-sm text-[var(--text-muted)]">Completá tu ficha personal para consultar tu historial.</p> : null}
      {status === "loading" && items.length === 0 ? <p role="status" className="rounded-xl border p-4">Cargando historial…</p> : null}
      {status === "error" ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><p>{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 font-semibold" onClick={() => void load()}>Reintentar historial</button></div> : null}
      {status === "ready" && items.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-[var(--text-muted)]">No hay membresías finalizadas.</p> : null}
      {items.length ? <ol className="grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item.rowKey} className="rounded-xl border border-[var(--border)] p-4"><p className="font-semibold">{item.group.nombre}</p><p className="mt-2 text-sm">Temporada: {item.season.nombre}</p>{item.validityPeriodCount > 1 ? <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-orange-700">Último período</p> : null}<p className="mt-1 text-sm text-[var(--text-muted)]">Inicio: {new Date(item.joinedAt).toLocaleDateString("es-AR", { timeZone: "UTC" })}</p>{item.leftAt ? <p className="mt-1 text-sm text-[var(--text-muted)]">Fin: {new Date(item.leftAt).toLocaleDateString("es-AR", { timeZone: "UTC" })}</p> : null}</li>)}</ol> : null}
      {status === "ready" && cursor ? <button type="button" className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 font-semibold text-orange-700" onClick={() => void load(cursor)}>Cargar más</button> : null}
    </div> : null}
  </section>;
}
