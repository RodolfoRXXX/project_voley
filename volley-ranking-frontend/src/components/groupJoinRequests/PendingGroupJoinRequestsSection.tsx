"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getGroupJoinRequestErrorMessage, getGroupJoinRequestErrorReason, listPendingGroupJoinRequestsForOwnedGroup } from "@/services/groupJoinRequestsService";
import type { PendingGroupJoinRequestForOwner } from "@/types/GroupJoinRequest";

export function PendingGroupJoinRequestsSection({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<PendingGroupJoinRequestForOwner[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const region = useRef<HTMLDivElement>(null);
  const load = useCallback(async (nextCursor?: string, append = false) => {
    if (busy.current) return;
    busy.current = true; setStatus("loading"); setError("");
    try {
      const result = await listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize: 20, ...(nextCursor ? { cursor: nextCursor } : {}) });
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setCursor(result.nextCursor); setStatus("ready"); queueMicrotask(() => region.current?.focus());
    } catch (cause) { setError(getGroupJoinRequestErrorMessage(getGroupJoinRequestErrorReason(cause))); setStatus("error"); queueMicrotask(() => region.current?.focus()); }
    finally { busy.current = false; }
  }, [groupId]);
  useEffect(() => { let active = true; void listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize: 20 }).then((result) => { if (!active) return; setItems(result.items); setCursor(result.nextCursor); setStatus("ready"); }, (cause) => { if (!active) return; setError(getGroupJoinRequestErrorMessage(getGroupJoinRequestErrorReason(cause))); setStatus("error"); }); return () => { active = false; }; }, [groupId]);
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/join/groups/${encodeURIComponent(groupId)}`); setError(""); setNotice("Enlace copiado."); queueMicrotask(() => region.current?.focus()); } catch { setNotice(""); setError("No pudimos copiar el enlace."); setStatus("error"); } };
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="pending-requests-heading">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 id="pending-requests-heading" className="text-lg font-semibold">Solicitudes pendientes</h2><button type="button" className="min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={() => void copyLink()}>Copiar enlace de solicitud</button></div>
    <div ref={region} tabIndex={-1} aria-live="polite" className="mt-4 focus-visible:outline-2">
      {notice ? <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p> : null}
      {status === "loading" ? <p role="status">Cargando solicitudes…</p> : null}
      {status === "error" ? <div role="alert"><p className="text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load()}>Reintentar</button></div> : null}
      {status === "ready" && items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No hay solicitudes pendientes.</p> : null}
      {items.length ? <ul className="grid gap-3">{items.map((item) => <li key={item.id} className="rounded-xl border border-[var(--border)] p-4"><p className="font-semibold">{item.person.firstName} {item.person.lastName}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Solicitó el <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("es-AR")}</time></p></li>)}</ul> : null}
      {status === "ready" && cursor ? <button type="button" className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={() => void load(cursor, true)}>Cargar más</button> : null}
    </div>
  </section>;
}
