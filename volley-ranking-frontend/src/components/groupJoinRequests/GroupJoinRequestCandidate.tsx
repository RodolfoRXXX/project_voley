"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelMyGroupJoinRequest, createMyGroupJoinRequest, getGroupJoinRequestErrorMessage, getGroupJoinRequestErrorReason, getKnownGroupJoinPreview, getMyCurrentGroupJoinRequest } from "@/services/groupJoinRequestsService";
import type { KnownGroupJoinPreview, OwnGroupJoinRequest } from "@/types/GroupJoinRequest";
import { resolveAuthoritativeCandidateView } from "./groupJoinRequestCandidateState";

type View = "loading" | "eligible" | "creating" | "pending" | "cancel-confirm" | "cancelling" | "cancelled" | "error";
type RetryAction = "load" | "create" | "cancel";
function newKey() { return `group-join-${crypto.randomUUID()}`; }

export function GroupJoinRequestCandidate({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<KnownGroupJoinPreview | null>(null);
  const [request, setRequest] = useState<OwnGroupJoinRequest | null>(null);
  const [view, setView] = useState<View>("loading");
  const [error, setError] = useState("");
  const keyRef = useRef(newKey());
  const consumedIntentRequiresExplicitRenewal = useRef(false);
  const busy = useRef(false);
  const retryAction = useRef<RetryAction>("load");
  const result = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setView("loading"); setError("");
    try {
      const preview = await getKnownGroupJoinPreview(groupId);
      const current = await getMyCurrentGroupJoinRequest(groupId);
      setGroup(preview.group); setRequest(current.request);
      setView(resolveAuthoritativeCandidateView(Boolean(current.request), consumedIntentRequiresExplicitRenewal.current));
    } catch (cause) { retryAction.current = "load"; setError(getGroupJoinRequestErrorMessage(getGroupJoinRequestErrorReason(cause))); setView("error"); queueMicrotask(() => result.current?.focus()); }
  }, [groupId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (view === "cancel-confirm") cancelButton.current?.focus(); }, [view]);

  const create = async () => {
    if (busy.current) return; busy.current = true; setView("creating"); setError("");
    try {
      const response = await createMyGroupJoinRequest({ groupId, idempotencyKey: keyRef.current });
      consumedIntentRequiresExplicitRenewal.current = true;
      setRequest(response.request); setView(response.request.estado === "cancelada" ? "cancelled" : "pending"); queueMicrotask(() => result.current?.focus());
    } catch (cause) {
      const reason = getGroupJoinRequestErrorReason(cause);
      retryAction.current = "create"; setError(getGroupJoinRequestErrorMessage(reason)); setView("error"); queueMicrotask(() => result.current?.focus());
    } finally { busy.current = false; }
  };
  const cancel = async () => {
    if (busy.current || !request || request.estado !== "pendiente") return; busy.current = true; consumedIntentRequiresExplicitRenewal.current = true; setView("cancelling"); setError("");
    try { const response = await cancelMyGroupJoinRequest(groupId, request.id); setRequest(response.request); setView("cancelled"); queueMicrotask(() => result.current?.focus()); }
    catch (cause) { retryAction.current = "cancel"; setError(getGroupJoinRequestErrorMessage(getGroupJoinRequestErrorReason(cause))); setView("error"); queueMicrotask(() => result.current?.focus()); }
    finally { busy.current = false; }
  };
  const beginNew = () => { keyRef.current = newKey(); consumedIntentRequiresExplicitRenewal.current = false; setRequest(null); setError(""); setView("eligible"); };

  return <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-orange-600 hover:underline">← Volver al panel</Link>
    <div ref={result} tabIndex={-1} className="mt-4 focus-visible:outline-2">
      {view === "loading" ? <p role="status" aria-live="polite">Cargando Grupo y solicitud…</p> : null}
      {group ? <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{group.deporte}</p><h1 className="mt-2 text-2xl font-bold">{group.nombre}</h1><p className="mt-3 text-sm text-[var(--text-muted)]">Solicitud de ingreso al Grupo.</p></header> : null}
      {view === "eligible" ? <section className="mt-5 rounded-2xl border border-[var(--border)] p-5"><h2 className="font-semibold">Solicitar ingreso</h2><p className="mt-2 text-sm text-[var(--text-muted)]">El Owner podrá ver tu nombre y apellido mientras la solicitud esté pendiente.</p><button type="button" className="mt-4 min-h-11 rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white" onClick={() => void create()}>Solicitar ingreso</button></section> : null}
      {view === "creating" ? <p className="mt-5" role="status" aria-live="polite">Confirmando solicitud…</p> : null}
      {view === "pending" && request?.estado === "pendiente" ? <section className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-5" aria-live="polite"><h2 className="font-semibold text-emerald-950">Solicitud pendiente</h2><p className="mt-2 text-sm text-emerald-900">Creada el <time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString("es-AR")}</time>.</p><button type="button" className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800" onClick={() => setView("cancel-confirm")}>Cancelar solicitud</button></section> : null}
      {view === "cancel-confirm" && request?.estado === "pendiente" ? <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5" role="alertdialog" aria-modal="true" aria-labelledby="cancel-request-title" aria-describedby="cancel-request-description" onKeyDown={(event) => { if (event.key === "Escape") setView("pending"); }}><h2 id="cancel-request-title" className="font-semibold">Confirmar cancelación</h2><p id="cancel-request-description" className="mt-2 text-sm">La solicitud se conservará como historia cancelada. Podrás iniciar otra después.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button ref={cancelButton} type="button" className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => setView("pending")}>Volver</button><button type="button" className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white" onClick={() => void cancel()}>Sí, cancelar solicitud</button></div></section> : null}
      {view === "cancelling" ? <p className="mt-5" role="status" aria-live="polite">Cancelando solicitud…</p> : null}
      {view === "cancelled" ? <section className="mt-5 rounded-2xl border border-slate-300 bg-slate-50 p-5" aria-live="polite"><h2 className="font-semibold">Sin solicitud pendiente</h2>{request?.estado === "cancelada" ? <p className="mt-2 text-sm">Cancelada el <time dateTime={request.cancelledAt}>{new Date(request.cancelledAt).toLocaleDateString("es-AR")}</time>.</p> : <p className="mt-2 text-sm">El estado autoritativo confirma que ya no existe una solicitud pendiente.</p>}<button type="button" className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={beginNew}>Preparar una nueva solicitud</button></section> : null}
      {view === "error" ? <section className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-5" role="alert"><p className="text-red-900">{error}</p><button type="button" className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold" onClick={() => retryAction.current === "load" ? void load() : retryAction.current === "cancel" ? void cancel() : void create()}>Reintentar la misma operación</button><button type="button" className="ml-2 mt-4 min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => void load()}>Reconsultar estado</button></section> : null}
    </div>
  </main>;
}
