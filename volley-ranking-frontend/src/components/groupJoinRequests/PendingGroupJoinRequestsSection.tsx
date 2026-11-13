"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { approveGroupJoinRequest, getGroupJoinRequestDecisionResult, getGroupJoinRequestErrorMessage, getGroupJoinRequestErrorReason, getPendingGroupJoinRequestForOwnedGroup, listPendingGroupJoinRequestsForOwnedGroup, rejectGroupJoinRequest } from "@/services/groupJoinRequestsService";
import type { GroupJoinRequestErrorReason, PendingGroupJoinRequestForOwner } from "@/types/GroupJoinRequest";
import { applyAuthoritativeDecision, createDecisionIntentRegistry, createRequestFlights, scheduleFocus, shouldConsultAfterDecisionError } from "./groupJoinRequestDecisionMachine.mjs";

type Action = "approve" | "reject";
type Confirmation = { action: Action; item: PendingGroupJoinRequestForOwner };
const keyFactory = () => `group-join-decision-${crypto.randomUUID()}`;
const effectLabel = (effect: PendingGroupJoinRequestForOwner["approvalEffect"]) => effect === "RENEW_MEMBERSHIP" ? "Renovar Membresía y aprobar Solicitud" : effect === "REACTIVATE_MEMBERSHIP" ? "Reactivar Membresía y aprobar Solicitud" : "Crear Membresía y aprobar Solicitud";
const effectDescription = (effect: PendingGroupJoinRequestForOwner["approvalEffect"]) => effect === "RENEW_MEMBERSHIP" ? "Se creará una nueva Membresía para la Temporada abierta actual y se preservará íntegra la anterior. El backend revalidará la Temporada y la última Membresía al confirmar." : effect === "REACTIVATE_MEMBERSHIP" ? "Se reactivará la misma Membresía para la Temporada abierta actual. El backend revalidará la clasificación al confirmar." : "Se creará una Membresía en la Temporada abierta actual. El backend revalidará la clasificación al confirmar.";

export function PendingGroupJoinRequestsSection({ groupId, requestedRequestId, onAccessLost }: { groupId: string; requestedRequestId?: string; onAccessLost?: (message: string) => void }) {
  const [items, setItems] = useState<PendingGroupJoinRequestForOwner[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [errorReason, setErrorReason] = useState<GroupJoinRequestErrorReason | null>(null);
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const listBusy = useRef(false);
  const intents = useRef(createDecisionIntentRegistry(keyFactory));
  const flights = useRef(createRequestFlights());
  const region = useRef<HTMLDivElement>(null);
  const dialogInitial = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const handledDeepLink = useRef("");
  const terminalRequestIds = useRef(new Set<string>());

  const focusResult = () => scheduleFocus(region.current);
  const load = useCallback(async (nextCursor?: string, append = false, focusAfter = false) => {
    if (listBusy.current) return;
    listBusy.current = true; setStatus("loading"); setError("");
    try {
      const result = await listPendingGroupJoinRequestsForOwnedGroup({ groupId, pageSize: 20, ...(nextCursor ? { cursor: nextCursor } : {}) });
      setItems((current) => {
        for (const next of result.items) { const previous = current.find((item) => item.id === next.id); if (previous && previous.approvalEffect !== next.approvalEffect) intents.current.requireNewConfirmation("approve", next.id); }
        return append ? [...current, ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))] : result.items;
      }); setCursor(result.nextCursor); setStatus("ready"); if (focusAfter) focusResult();
    } catch (cause) { const reason = getGroupJoinRequestErrorReason(cause); if (reason === "GROUP_NOT_ACCESSIBLE") { setItems([]); setConfirmation(null); onAccessLost?.(getGroupJoinRequestErrorMessage(reason)); return; } setError(getGroupJoinRequestErrorMessage(reason)); setStatus("error"); if (focusAfter) focusResult(); }
    finally { listBusy.current = false; }
  }, [groupId, onAccessLost]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (status !== "ready" || !requestedRequestId) return;
    const key = `${groupId}:${requestedRequestId}`;
    if (handledDeepLink.current === key) return;
    handledDeepLink.current = key;
    void getPendingGroupJoinRequestForOwnedGroup({ groupId, requestId: requestedRequestId }).then(({ item }) => {
      if (terminalRequestIds.current.has(item.id)) return;
      setItems((current) => current.some((candidate) => candidate.id === item.id) ? current : [item, ...current]);
      setNotice("Solicitud localizada. Revisá su estado antes de decidir.");
      queueMicrotask(() => region.current?.focus());
    }, (cause) => {
      if (terminalRequestIds.current.has(requestedRequestId)) return;
      const reason = getGroupJoinRequestErrorReason(cause);
      setNotice("");
      setError(["REQUEST_NOT_FOUND", "REQUEST_NOT_PENDING", "GROUP_NOT_ACCESSIBLE"].includes(reason)
        ? "La solicitud ya fue resuelta, no existe o no tenés acceso." : getGroupJoinRequestErrorMessage(reason));
    });
  }, [groupId, requestedRequestId, status]);
  useEffect(() => { const refresh = (event: Event) => { if ((event as CustomEvent<{ groupId?: string }>).detail?.groupId === groupId) void load(); }; window.addEventListener("season-context-changed", refresh); return () => window.removeEventListener("season-context-changed", refresh); }, [groupId, load]);
  useEffect(() => { if (confirmation) dialogInitial.current?.focus(); }, [confirmation]);

  const closeDialog = () => { setConfirmation(null); scheduleFocus(returnFocus.current); };
  const begin = (action: Action, item: PendingGroupJoinRequestForOwner, target: HTMLElement) => { returnFocus.current = target; setConfirmation({ action, item }); };
  const markBusy = (requestId: string, value: boolean) => setBusyIds((current) => { const next = new Set(current); if (value) next.add(requestId); else next.delete(requestId); return next; });
  const consultAuthoritative = async (requestId: string) => {
    setError(""); setNotice("Consultando el resultado autoritativo…");
    try {
      const result = await getGroupJoinRequestDecisionResult(groupId, requestId);
      if (["APPROVED", "REJECTED", "CANCELLED"].includes(result.status)) terminalRequestIds.current.add(requestId);
      setItems((current) => applyAuthoritativeDecision(current, result));
      setError("");
      setNotice(result.status === "APPROVAL_IN_PROGRESS" ? "La aprobación sigue en proceso." : result.status === "PENDING" ? "La solicitud sigue pendiente." : `Resultado confirmado: ${result.status === "APPROVED" ? "aprobada" : result.status === "REJECTED" ? "rechazada" : "cancelada"}.`);
      if (result.status === "APPROVED") window.dispatchEvent(new CustomEvent("group-membership-changed", { detail: { groupId } }));
    } catch (cause) { const reason = getGroupJoinRequestErrorReason(cause); if (reason === "GROUP_NOT_ACCESSIBLE") { setItems([]); setConfirmation(null); onAccessLost?.(getGroupJoinRequestErrorMessage(reason)); return; } setError(getGroupJoinRequestErrorMessage(reason)); setNotice(""); }
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
    const renews = action === "approve" && item.approvalEffect === "RENEW_MEMBERSHIP";
    markBusy(requestId, true); setError(""); setErrorReason(null); setNotice(action === "approve" ? (renews ? "Coordinando renovación y aprobación…" : reactivates ? "Coordinando reactivación y aprobación…" : "Coordinando creación y aprobación…") : "Confirmando rechazo…");
    try {
      if (action === "approve") await approveGroupJoinRequest({ groupId, requestId, idempotencyKey: intent.idempotencyKey });
      else await rejectGroupJoinRequest({ groupId, requestId, idempotencyKey: intent.idempotencyKey });
      terminalRequestIds.current.add(requestId); intents.current.confirm(action, requestId); setError(""); setErrorReason(null); setItems((current) => current.filter((candidate) => candidate.id !== requestId)); setNotice(action === "approve" ? (renews ? "Membresía renovada para la Temporada abierta actual y Solicitud aprobada." : reactivates ? "Membresía reactivada y Solicitud aprobada." : "Membresía creada y Solicitud aprobada.") : "Rechazo confirmado; no se creó ninguna Membresía.");
      if (action === "approve") window.dispatchEvent(new CustomEvent("group-membership-changed", { detail: { groupId } }));
    } catch (cause) {
      const reason = getGroupJoinRequestErrorReason(cause); setErrorReason(reason); setError(getGroupJoinRequestErrorMessage(reason)); setNotice("");
      if (reason === "GROUP_NOT_ACCESSIBLE") { setItems([]); setConfirmation(null); onAccessLost?.(getGroupJoinRequestErrorMessage(reason)); return; }
      if (["MEMBERSHIP_REACTIVATION_SUPERSEDED", "MEMBERSHIP_RENEWAL_SUPERSEDED"].includes(reason)) intents.current.requireNewConfirmation(action, requestId);
      if (reason === "APPROVAL_IN_PROGRESS" || shouldConsultAfterDecisionError(reason)) await consultAuthoritative(requestId);
      else if (["REQUEST_NOT_PENDING", "REQUEST_CANCELLED", "DECISION_ALREADY_APPROVED", "DECISION_ALREADY_REJECTED"].includes(reason as GroupJoinRequestErrorReason)) await consultAuthoritative(requestId);
    } finally { flights.current.finish(requestId); markBusy(requestId, false); focusResult(); }
  };
  return <section id="pending-group-join-requests" tabIndex={-1} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="pending-requests-heading">
    <h2 id="pending-requests-heading" className="text-lg font-semibold">Solicitudes pendientes</h2>
    <div ref={region} tabIndex={-1} aria-live="polite" className="mt-4 focus-visible:outline-2">
      {notice ? <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <div role="alert" className="mb-3 text-sm text-red-700"><p>{error}</p>{errorReason === "OPEN_SEASON_REQUIRED" && error === getGroupJoinRequestErrorMessage("OPEN_SEASON_REQUIRED") ? <Link href={`/dashboard/groups/${groupId}/seasons`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-orange-700 underline decoration-orange-300 underline-offset-4">Ir a Temporada</Link> : null}</div> : null}
      {status === "loading" ? <p role="status">Cargando solicitudes…</p> : null}
      {status === "error" ? <button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load(undefined, false, true)}>Reintentar</button> : null}
      {status === "ready" && items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No hay solicitudes pendientes.</p> : null}
      {items.length ? <ul className="grid gap-3">{items.map((item) => { const busy = busyIds.has(item.id); const name = `${item.person.firstName} ${item.person.lastName}`; return <li key={item.id} className="rounded-xl border border-[var(--border)] p-4"><p className="font-semibold">{name}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Solicitó el <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("es-AR")}</time></p><p className={item.approvalEffect === "RENEW_MEMBERSHIP" ? "mt-2 text-sm font-medium text-amber-800" : "mt-2 text-sm text-[var(--text-muted)]"}>{item.approvalEffect === "RENEW_MEMBERSHIP" ? "Renovación intertemporada: se creará una nueva Membresía para la Temporada abierta actual." : item.approvalEffect === "REACTIVATE_MEMBERSHIP" ? "Reingreso: se reactivará la misma Membresía en la Temporada abierta actual." : "Alta inicial: se creará una Membresía en la Temporada abierta actual."}</p><p className="mt-1 text-xs text-[var(--text-muted)]">La clasificación se revalidará al confirmar.</p>{item.decisionStatus === "APPROVAL_IN_PROGRESS" ? <div className="mt-3"><p className="text-sm font-medium">Aprobación en proceso</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy} aria-label={`Consultar resultado de ${name}`} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60" onClick={() => void consult(item.id)}>Consultar resultado</button><button type="button" disabled={busy} aria-label={`Continuar recuperación de ${name}`} className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={(event) => begin("approve", item, event.currentTarget)}>Continuar recuperación</button></div></div> : <div className="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy} aria-label={`Aprobar solicitud de ${name}`} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={(event) => begin("approve", item, event.currentTarget)}>Aprobar</button><button type="button" disabled={busy} aria-label={`Rechazar solicitud de ${name}`} className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 disabled:opacity-60" onClick={(event) => begin("reject", item, event.currentTarget)}>Rechazar</button></div>}</li>; })}</ul> : null}
      {status === "ready" && cursor ? <button type="button" className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={() => void load(cursor, true, true)}>Cargar más</button> : null}
    </div>
    {confirmation ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="decision-title" aria-describedby="decision-description" onKeyDown={(event) => { if (event.key === "Escape") closeDialog(); }} className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-xl"><h3 id="decision-title" className="text-lg font-semibold">{confirmation.action === "approve" ? effectLabel(confirmation.item.approvalEffect) : "Confirmar rechazo"}</h3><p id="decision-description" className="mt-2 text-sm">{confirmation.action === "approve" ? effectDescription(confirmation.item.approvalEffect) : "La solicitud será rechazada y no se creará ninguna Membresía."}</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={dialogInitial} type="button" className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={closeDialog}>Cancelar</button><button type="button" className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white" onClick={() => void decide()}>Sí, {confirmation.action === "approve" ? "aprobar" : "rechazar"}</button></div></div></div> : null}
  </section>;
}
