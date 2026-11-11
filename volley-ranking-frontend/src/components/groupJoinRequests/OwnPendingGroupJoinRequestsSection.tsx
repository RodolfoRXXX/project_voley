"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cancelMyGroupJoinRequest, getGroupJoinRequestErrorMessage, getGroupJoinRequestErrorReason, listMyPendingGroupJoinRequests, type OwnPendingGroupJoinRequest } from "@/services/groupJoinRequestsService";

export function OwnPendingGroupJoinRequestsSection({ available, onChanged }: { available: boolean; onChanged: () => Promise<void> }) {
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState<OwnPendingGroupJoinRequest[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async (nextCursor?: string) => {
    const currentGeneration = generation.current;
    setStatus("loading"); setError("");
    try {
      const page = await listMyPendingGroupJoinRequests(nextCursor ? { pageSize: 5, cursor: nextCursor } : { pageSize: 5 });
      if (currentGeneration !== generation.current) return;
      setItems((current) => nextCursor ? [...current, ...page.items.filter((item) => !current.some((known) => known.id === item.id))] : page.items);
      setCursor(page.nextCursor); setStatus("ready");
    } catch (cause) {
      if (currentGeneration !== generation.current) return;
      setError(getGroupJoinRequestErrorMessage(getGroupJoinRequestErrorReason(cause))); setStatus("error");
    }
  }, []);

  useEffect(() => {
    generation.current += 1; setItems([]); setCursor(null); setNotice(""); setConfirming(null); setBusy(null);
    if (firebaseUser?.uid && available) queueMicrotask(() => void load()); else setStatus("ready");
    return () => { generation.current += 1; };
  }, [available, firebaseUser?.uid, load]);

  const cancel = async (item: OwnPendingGroupJoinRequest) => {
    if (busy) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      await cancelMyGroupJoinRequest(item.group.id, item.id);
      setNotice("La solicitud fue cancelada.");
    } catch (cause) {
      const reason = getGroupJoinRequestErrorReason(cause);
      setNotice(reason === "DECISION_ALREADY_APPROVED" ? "La solicitud ya fue aprobada." : reason === "DECISION_ALREADY_REJECTED" ? "La solicitud ya fue rechazada." : reason === "REQUEST_CANCELLED" || reason === "REQUEST_NOT_PENDING" ? "La solicitud ya no está pendiente." : "");
      if (!(["DECISION_ALREADY_APPROVED", "DECISION_ALREADY_REJECTED", "REQUEST_CANCELLED", "REQUEST_NOT_PENDING"] as string[]).includes(reason)) setError(getGroupJoinRequestErrorMessage(reason));
    } finally {
      setBusy(null); setConfirming(null); await load(); await onChanged();
    }
  };

  return <section className="mt-8" aria-labelledby="pending-own-title">
    <h2 id="pending-own-title" className="text-xl font-semibold">Solicitudes pendientes</h2>
    {notice ? <p role="status" className="mt-3 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-950">{notice}</p> : null}
    {status === "loading" && items.length === 0 ? <p role="status" className="mt-3 rounded-xl border p-4">Cargando solicitudes…</p> : null}
    {status === "error" ? <div role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><p>{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 font-semibold" onClick={() => void load()}>Reintentar</button></div> : null}
    {status === "ready" && items.length === 0 ? <p className="mt-3 rounded-xl border border-dashed p-5 text-sm text-[var(--text-muted)]">No tenés solicitudes pendientes.</p> : null}
    {items.length ? <ol className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <li key={item.id} className="rounded-xl border border-[var(--border)] p-4"><p className="font-semibold">{item.group.nombre}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Solicitud pendiente</p>{confirming === item.id ? <div className="mt-3"><p className="text-sm">¿Querés cancelar esta solicitud?</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg border px-3 font-semibold" onClick={() => setConfirming(null)}>Volver</button><button type="button" disabled={busy === item.id} className="min-h-11 rounded-lg bg-red-700 px-3 font-semibold text-white disabled:opacity-50" onClick={() => void cancel(item)}>{busy === item.id ? "Cancelando…" : "Sí, cancelar"}</button></div></div> : <button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-3 font-semibold text-red-800" onClick={() => setConfirming(item.id)}>Cancelar solicitud</button>}</li>)}</ol> : null}
    {status === "ready" && cursor ? <button type="button" className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 font-semibold text-orange-700" onClick={() => void load(cursor)}>Cargar más</button> : null}
  </section>;
}
