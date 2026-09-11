"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { approveGroupJoinRequest, getGroupJoinRequestDecisionResult, getGroupJoinRequestErrorMessage, getGroupJoinRequestErrorReason, listPendingGroupJoinRequestsForOwnedGroup, rejectGroupJoinRequest } from "@/services/groupJoinRequestsService";
import type { GroupJoinRequestErrorReason, PendingGroupJoinRequestForOwner } from "@/types/GroupJoinRequest";
import { applyAuthoritativeDecision, createDecisionIntentRegistry, createRequestFlights, scheduleFocus, shouldConsultAfterDecisionError } from "./groupJoinRequestDecisionMachine.mjs";

type Action = "approve" | "reject";
type Confirmation = { action: Action; item: PendingGroupJoinRequestForOwner };
const keyFactory = () => `group-join-decision-${crypto.randomUUID()}`;

export function PendingGroupJoinRequestsSection({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<PendingGroupJoinRequestForOwner[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const listBusy = useRef(false);
  const intents = useRef(createDecisionIntentRegistry(keyFactory));
  const flights = useRef(createRequestFlights());
  const region = useRef<HTMLDivElement>(null);
  const dialogInitial = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const focusResult = () => scheduleFocus(region.current);
  const load = useCallback(async (nextCursor?: string, append = false) => {
    if (listBusy.current) return;
    listBusy.current = true; setStatus("loading"); setError("");
    try {
      const result = await listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize: 20, ...(nextCursor ? { cursor: nextCursor } : {}) });
      setItems((current) => append ? [...current, ...result.items] : result.items); setCursor(result.nextCursor); setStatus("ready"); focusResult();
    } catch (cause) { setError(getGroupJoinRequestErrorMessage(getGroupJoinRequestErrorReason(cause))); setStatus("error"); focusResult(); }
    finally { listBusy.current = false; }
  }, [groupId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (confirmation) dialogInitial.current?.focus(); }, [confirmation]);

  const closeDialog = () => { setConfirmation(null); scheduleFocus(returnFocus.current); };
  const begin = (action: Action, item: PendingGroupJoinRequestForOwner, target: HTMLElement) => { returnFocus.current = target; setConfirmation({ action, item }); };
  const markBusy = (requestId: string, value: boolean) => setBusyIds((current) => { const next = new Set(current); if (value) next.add(requestId); else next.delete(requestId); return next; });
  const consultAuthoritative = async (requestId: string) => {
    setError(""); setNotice("Consultando el resultado autoritativo…");
    try {
      const result = await getGroupJoinRequestDecisionResult(groupId, requestId);
      setItems((current) => applyAuthoritativeDecision(current, result));
      setNotice(result.status === "APPROVAL_IN_PROGRESS" ? "La aprobación sigue en proceso." : result.status === "PENDING" ? "La solicitud sigue pendiente." : `Resultado confirmado: ${result.status === "APPROVED" ? "aprobada" : result.status === "REJECTED" ? "rechazada" : "cancelada"}.`);
    } catch (cause) { setError(getGroupJoinRequestErrorMessage(getGroupJoinRequestErrorReason(cause))); setNotice(""); }
    finally { focusResult(); }
  };
  const consult = async (requestId: string) => {
    if (!flights.current.start(requestId)) return;
    markBusy(requestId, true);
    try { await consultAuthoritative(requestId); }
    finally { flights.current.finish(requestId); markBusy(requestId, false); }
  };
  const decide = async () => {
    if (!confirmation) return;
    const { action, item } = confirmation; const requestId = item.id; closeDialog();
    if (!flights.current.start(requestId)) return;
    const intent = intents.current.getOrCreate(action, requestId);
    const reactivates = action === "approve" && item.approvalEffect === "REACTIVATE_MEMBERSHIP";
    markBusy(requestId, true); setError(""); setNotice(action === "approve" ? (reactivates ? "Coordinando reactivación y aprobación…" : "Coordinando creación y aprobación…") : "Confirmando rechazo…");
    try {
      if (action === "approve") await approveGroupJoinRequest({ groupId, requestId, idempotencyKey: intent.idempotencyKey });
      else await rejectGroupJoinRequest({ groupId, requestId, idempotencyKey: intent.idempotencyKey });
      intents.current.confirm(action, requestId); setItems((current) => current.filter((candidate) => candidate.id !== requestId)); setNotice(action === "approve" ? (reactivates ? "Membresía reactivada y Solicitud aprobada." : "Membresía creada y Solicitud aprobada.") : "Rechazo confirmado; no se creó ninguna Membresía.");
    } catch (cause) {
      const reason = getGroupJoinRequestErrorReason(cause); setError(getGroupJoinRequestErrorMessage(reason)); setNotice("");
      if (reason === "MEMBERSHIP_REACTIVATION_SUPERSEDED") intents.current.requireNewConfirmation(action, requestId);
      if (reason === "APPROVAL_IN_PROGRESS" || shouldConsultAfterDecisionError(reason)) await consultAuthoritative(requestId);
      else if (["REQUEST_CANCELLED", "DECISION_ALREADY_APPROVED", "DECISION_ALREADY_REJECTED"].includes(reason as GroupJoinRequestErrorReason)) await consultAuthoritative(requestId);
    } finally { flights.current.finish(requestId); markBusy(requestId, false); focusResult(); }
  };
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/join/groups/${encodeURIComponent(groupId)}`); setError(""); setNotice("Enlace copiado."); focusResult(); } catch { setNotice(""); setError("No pudimos copiar el enlace."); setStatus("error"); } };

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="pending-requests-heading">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 id="pending-requests-heading" className="text-lg font-semibold">Solicitudes pendientes</h2><button type="button" className="min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={() => void copyLink()}>Copiar enlace de solicitud</button></div>
    <div ref={region} tabIndex={-1} aria-live="polite" className="mt-4 focus-visible:outline-2">
      {notice ? <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p role="alert" className="mb-3 text-sm text-red-700">{error}</p> : null}
      {status === "loading" ? <p role="status">Cargando solicitudes…</p> : null}
      {status === "error" ? <button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load()}>Reintentar</button> : null}
      {status === "ready" && items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No hay solicitudes pendientes.</p> : null}
      {items.length ? <ul className="grid gap-3">{items.map((item) => { const busy = busyIds.has(item.id); const name = `${item.person.firstName} ${item.person.lastName}`; return <li key={item.id} className="rounded-xl border border-[var(--border)] p-4"><p className="font-semibold">{name}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Solicitó el <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("es-AR")}</time></p>{item.approvalEffect === "REACTIVATE_MEMBERSHIP" ? <p className="mt-2 text-sm font-medium text-amber-800">Reingreso: esta aprobación requiere reactivar la Membresía existente.</p> : <p className="mt-2 text-sm text-[var(--text-muted)]">La aprobación creará una Membresía.</p>}{item.decisionStatus === "APPROVAL_IN_PROGRESS" ? <div className="mt-3"><p className="text-sm font-medium">Aprobación en proceso</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy} aria-label={`Consultar resultado de ${name}`} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60" onClick={() => void consult(item.id)}>Consultar resultado</button><button type="button" disabled={busy} aria-label={`Continuar recuperación de ${name}`} className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={(event) => begin("approve", item, event.currentTarget)}>Continuar recuperación</button></div></div> : <div className="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy} aria-label={`Aprobar solicitud de ${name}`} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={(event) => begin("approve", item, event.currentTarget)}>Aprobar</button><button type="button" disabled={busy} aria-label={`Rechazar solicitud de ${name}`} className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 disabled:opacity-60" onClick={(event) => begin("reject", item, event.currentTarget)}>Rechazar</button></div>}</li>; })}</ul> : null}
      {status === "ready" && cursor ? <button type="button" className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={() => void load(cursor, true)}>Cargar más</button> : null}
    </div>
    {confirmation ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="decision-title" aria-describedby="decision-description" onKeyDown={(event) => { if (event.key === "Escape") closeDialog(); }} className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-xl"><h3 id="decision-title" className="text-lg font-semibold">{confirmation.action === "approve" ? (confirmation.item.approvalEffect === "REACTIVATE_MEMBERSHIP" ? "Reactivar Membresía y aprobar Solicitud" : "Crear Membresía y aprobar Solicitud") : "Confirmar rechazo"}</h3><p id="decision-description" className="mt-2 text-sm">{confirmation.action === "approve" ? (confirmation.item.approvalEffect === "REACTIVATE_MEMBERSHIP" ? "Se reactivará la misma Membresía. La Solicitud sólo se aprobará después de confirmar esa activación." : "Se creará una Membresía en la Temporada abierta. La aprobación sólo se confirmará después de crearla.") : "La solicitud será rechazada y no se creará ninguna Membresía."}</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={dialogInitial} type="button" className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={closeDialog}>Cancelar</button><button type="button" className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white" onClick={() => void decide()}>Sí, {confirmation.action === "approve" ? "aprobar" : "rechazar"}</button></div></div></div> : null}
  </section>;
}
