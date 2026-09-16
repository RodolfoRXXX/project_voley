"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { finalizeActiveGroupMemberForOwnedGroup, getMembershipErrorMessage, getMembershipErrorReason, listActiveGroupMembersForOwnedGroup, prepareActiveGroupMemberFinalizationForOwnedGroup } from "@/services/membershipsService";
import type { ActiveGroupMember, ActiveGroupMembersScope } from "@/types/ActiveGroupMember";
import type { MembershipErrorReason } from "@/types/OwnMembership";

type Status = "loading" | "ready" | "error";
type Phase = "idle" | "preparing" | "confirmation" | "submitting" | "recoverable";
type Prepared = { membershipId: string; firstName: string; lastName: string; activationRef: string; idempotencyKey?: string };
const INVALIDATING = new Set<MembershipErrorReason>(["TARGET_MEMBERSHIP_NOT_ACCESSIBLE", "TARGET_MEMBERSHIP_NOT_ACTIVE", "MEMBERSHIP_ACTIVATION_CHANGED", "MEMBERSHIP_SEASON_NOT_MODIFIABLE", "GROUP_NOT_ACCESSIBLE", "TARGET_IS_SELF"]);
const newFinalizationKey = () => `membership-finalization-${crypto.randomUUID()}`;

export function ActiveGroupMembersSection({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<ActiveGroupMember[]>([]);
  const [scope, setScope] = useState<ActiveGroupMembersScope | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [retryCursor, setRetryCursor] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>("loading");
  const [reason, setReason] = useState<MembershipErrorReason | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const inFlight = useRef(false);
  const sendingRef = useRef(false);
  const region = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const focusRegion = useCallback(() => queueMicrotask(() => region.current?.focus()), []);

  const load = useCallback(async (cursor?: string, append = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (append) setLoadingNext(true); else setStatus("loading");
    setReason(null); setRetryCursor(cursor);
    try {
      let result;
      try { result = await listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20, ...(cursor ? { cursor } : {}) }); }
      catch (cause) {
        if (cursor && getMembershipErrorReason(cause) === "ROSTER_CONTEXT_CHANGED") {
          result = await listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20 }); append = false;
          setNotice("La Temporada abierta cambió. Reiniciamos el listado desde la primera página.");
        } else throw cause;
      }
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setScope(result.scope); setNextCursor(result.nextCursor); setRetryCursor(undefined); setStatus("ready");
      if (append && result.items.length) setNotice(`Se agregaron ${result.items.length} integrantes.`);
    } catch (cause) {
      const nextReason = getMembershipErrorReason(cause);
      if (nextReason === "GROUP_NOT_ACCESSIBLE") { setItems([]); setScope(null); setNextCursor(null); }
      setReason(nextReason); setStatus("error");
    } finally { inFlight.current = false; setLoadingNext(false); focusRegion(); }
  }, [focusRegion, groupId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (phase === "confirmation") queueMicrotask(() => cancelRef.current?.focus()); }, [phase]);

  const closeIntent = useCallback((restoreFocus = true) => {
    setPhase("idle"); setPrepared(null); sendingRef.current = false;
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  async function openFinalization(item: ActiveGroupMember, trigger: HTMLButtonElement) {
    if (phase !== "idle" || item.isOwner || item.person.status !== "AVAILABLE") return;
    triggerRef.current = trigger; setActionError(""); setPhase("preparing");
    try {
      const result = await prepareActiveGroupMemberFinalizationForOwnedGroup({ groupId, membershipId: item.membershipId });
      setPrepared({ membershipId: item.membershipId, firstName: result.person.firstName, lastName: result.person.lastName, activationRef: result.activationRef });
      setPhase("confirmation");
    } catch (cause) {
      const nextReason = getMembershipErrorReason(cause); closeIntent(false); await load(); setActionError(getMembershipErrorMessage(nextReason));
    }
  }

  async function confirmFinalization() {
    if (!prepared || sendingRef.current || !["confirmation", "recoverable"].includes(phase)) return;
    sendingRef.current = true; setPhase("submitting"); setActionError("");
    const stable = { ...prepared, idempotencyKey: prepared.idempotencyKey || newFinalizationKey() };
    setPrepared(stable);
    try {
      await finalizeActiveGroupMemberForOwnedGroup({ groupId, membershipId: stable.membershipId, activationRef: stable.activationRef, idempotencyKey: stable.idempotencyKey });
      closeIntent(false); await load(); setNotice("Membresía finalizada. El roster fue actualizado desde la primera página."); focusRegion();
    } catch (cause) {
      const nextReason = getMembershipErrorReason(cause); sendingRef.current = false;
      if (INVALIDATING.has(nextReason)) { closeIntent(false); await load(); setActionError(getMembershipErrorMessage(nextReason)); focusRegion(); }
      else { setPhase("recoverable"); setActionError(getMembershipErrorMessage(nextReason)); }
    }
  }

  function dialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && ["confirmation", "recoverable"].includes(phase)) { event.preventDefault(); closeIntent(); return; }
    if (event.key !== "Tab" || !["confirmation", "recoverable"].includes(phase)) return;
    if (event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus(); }
  }

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="active-members-heading">
    <h2 id="active-members-heading" className="text-lg font-semibold">Integrantes</h2>
    <p className="mt-1 text-sm text-[var(--text-muted)]">Lista informativa de la Temporada abierta.</p>
    <div ref={region} tabIndex={-1} aria-live="polite" aria-busy={status === "loading" || loadingNext || phase === "preparing" || phase === "submitting"} className="mt-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
      {notice ? <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p> : null}
      {actionError && phase === "idle" ? <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p> : null}
      {phase === "preparing" ? <p role="status" className="mb-3 text-sm">Preparando confirmación…</p> : null}
      {status === "loading" ? <div role="status" aria-label="Cargando integrantes" className="grid gap-3"><span>Cargando integrantes…</span>{[0, 1, 2].map((value) => <span key={value} aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}
      {status === "error" && reason ? <div role="alert"><p className="text-sm text-red-700">{getMembershipErrorMessage(reason)}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load(retryCursor, Boolean(retryCursor))}>Reintentar</button></div> : null}
      {status === "ready" && scope?.status === "NO_OPEN_SEASON" ? <p className="text-sm leading-6 text-[var(--text-muted)]">No hay un roster actual porque el Grupo no posee una Temporada abierta.</p> : null}
      {status === "ready" && scope?.status === "OPEN_SEASON" && items.length === 0 ? <p className="text-sm leading-6 text-[var(--text-muted)]">Todavía no hay integrantes activos en la Temporada abierta.</p> : null}
      {items.length ? <ul className="grid min-w-0 gap-3 sm:grid-cols-2">{items.map((item) => {
        const name = item.person.status === "AVAILABLE" ? `${item.person.firstName} ${item.person.lastName}` : "Identidad no disponible";
        const availableThirdParty = item.person.status === "AVAILABLE" && !item.isOwner;
        return <li key={item.membershipId} className="min-w-0 rounded-xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="break-words font-semibold">{name}</p>{item.isOwner ? <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">Owner</span> : null}</div><p className="mt-2 text-sm text-[var(--text-muted)]">Primera incorporación: <time dateTime={item.joinedAt}>{new Date(item.joinedAt).toLocaleDateString("es-AR")}</time></p>{availableThirdParty ? <button type="button" disabled={phase !== "idle"} aria-label={`Finalizar Membresía de ${name}`} className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={(event) => void openFinalization(item, event.currentTarget)}>Finalizar Membresía</button> : null}</li>;
      })}</ul> : null}
      {status === "ready" && nextCursor ? <button type="button" disabled={loadingNext || phase !== "idle"} className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load(nextCursor, true)}>{loadingNext ? "Cargando más…" : "Cargar más"}</button> : null}
      {prepared && ["confirmation", "submitting", "recoverable"].includes(phase) ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7" role="alertdialog" aria-modal="true" aria-labelledby="finalize-membership-title" aria-describedby="finalize-membership-description" onKeyDown={dialogKeyDown}><h3 id="finalize-membership-title" className="break-words text-lg font-semibold">Finalizar Membresía de {prepared.firstName} {prepared.lastName}</h3><p id="finalize-membership-description" className="mt-3 text-sm leading-6">Se finalizará su pertenencia actual a este Grupo. Su Persona e historia se conservan; esta acción no impide por sí sola una nueva Solicitud.</p>{actionError ? <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p> : null}<p className="mt-3 text-sm" role="status" aria-live="assertive">{phase === "submitting" ? "Finalizando Membresía…" : phase === "recoverable" ? "No se pudo confirmar. Podés reintentar la misma intención." : "Revisá la decisión antes de confirmar."}</p><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><button ref={cancelRef} type="button" disabled={phase === "submitting"} className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => closeIntent()}>Cancelar</button><button ref={confirmRef} type="button" disabled={phase === "submitting"} className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void confirmFinalization()}>{phase === "recoverable" ? "Reintentar la misma finalización" : phase === "submitting" ? "Finalizando…" : "Sí, finalizar Membresía"}</button></div></div></div> : null}
    </div>
  </section>;
}
