"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { createMyMembershipForOwnedGroup, finalizeMyMembershipForOwnedGroup, getMembershipCargoForOwnedGroup, getMembershipErrorMessage, getMembershipErrorReason, getMyMembershipForOwnedGroup } from "@/services/membershipsService";
import { getMyPerson, getPersonErrorReason } from "@/services/personService";
import { getOpenSeasonContext } from "@/services/seasonsService";
import type { OwnMembership } from "@/types/OwnMembership";
import { createMembershipIntent } from "./membershipIntent.mjs";
import { createMembershipFinalizationMachine } from "./membershipFinalizationMachine.mjs";

type ViewState = "loading" | "person-required" | "season-required" | "eligible" | "confirming" | "active" | "idempotent" | "finalize-confirmation" | "finalizing" | "finalized" | "already-finalized" | "reactivation-required" | "finalize-recoverable" | "idempotency-conflict" | "new-intent-required" | "recoverable-error" | "closed-error";

function newIdempotencyKey() {
  return `membership-${crypto.randomUUID()}`;
}

function reasonForPresentation(cause: unknown) {
  const personReason = getPersonErrorReason(cause);
  if (personReason === "PERSON_LINK_INCONSISTENT") return "PERSON_INCOMPATIBLE" as const;
  if (personReason === "ACCOUNT_NOT_INITIALIZED") return "ACCOUNT_REQUIRED" as const;
  if (personReason === "AUTHENTICATION_REQUIRED") return "UNAUTHENTICATED" as const;
  if (["PERSON_SERVICE_UNAVAILABLE", "CONCURRENT_MODIFICATION"].includes(personReason)) return "DEPENDENCY_UNAVAILABLE" as const;
  return getMembershipErrorReason(cause);
}

export function OwnMembershipSection({ groupId, actionBusy = false, onAccessLost, onEditCargo, onMembershipChanged }: { groupId: string; actionBusy?: boolean; onAccessLost?: (message: string) => void; onEditCargo?: (membershipId: string, trigger: HTMLButtonElement) => void; onMembershipChanged?: () => void }) {
  const [view, setView] = useState<ViewState>("loading");
  const [membership, setMembership] = useState<OwnMembership | null>(null);
  const [personName, setPersonName] = useState("Tu membresía");
  const [cargo, setCargo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const intentRef = useRef(createMembershipIntent(groupId, newIdempotencyKey));
  const finalizationRef = useRef(createMembershipFinalizationMachine());
  const sendingRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const cancelFinalizeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    intentRef.current.setGroupId(groupId);
    setView("loading");
    setError("");
    try {
      const person = await getMyPerson();
      if (!person) {
        setPersonName("Tu membresía");
        setMembership(null);
        setView("person-required");
        return;
      }
      setPersonName(`${person.firstName} ${person.lastName}`);
      const membershipResult = await getMyMembershipForOwnedGroup(groupId);
      if (membershipResult.membership) {
        setMembership(membershipResult.membership);
        if (membershipResult.membership.estado === "activa") {
          const detail = await getMembershipCargoForOwnedGroup({ groupId, membershipId: membershipResult.membership.id });
          setCargo(detail.membership.cargo);
        } else setCargo(null);
        if (membershipResult.membership.estado === "finalizada") {
          finalizationRef.current.restoreFinalized();
          setView("finalized");
        } else {
          finalizationRef.current.restoreActive();
          setView("active");
        }
        return;
      }
      const { openSeason } = await getOpenSeasonContext(groupId);
      setMembership(null);
      if (intentRef.current.snapshot().conflict) {
        intentRef.current.confirmMembershipAbsent();
        setView(openSeason ? "new-intent-required" : "season-required");
      } else {
        setView(openSeason ? "eligible" : "season-required");
      }
    } catch (cause) {
      const reason = reasonForPresentation(cause);
      if (reason === "GROUP_NOT_ACCESSIBLE") { setMembership(null); onAccessLost?.(getMembershipErrorMessage(reason)); return; }
      setError(getMembershipErrorMessage(reason));
      setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "recoverable-error" : "closed-error");
    }
  }, [groupId, onAccessLost]);

  useEffect(() => {
    intentRef.current.setGroupId(groupId);
    let active = true;
    void (async () => {
      try {
        const person = await getMyPerson();
        if (!active) return;
        if (!person) { setPersonName("Tu membresía"); setView("person-required"); return; }
        setPersonName(`${person.firstName} ${person.lastName}`);
        const membershipResult = await getMyMembershipForOwnedGroup(groupId);
        if (!active) return;
        if (membershipResult.membership) {
          setMembership(membershipResult.membership);
          if (membershipResult.membership.estado === "activa") {
            const detail = await getMembershipCargoForOwnedGroup({ groupId, membershipId: membershipResult.membership.id });
            if (!active) return;
            setCargo(detail.membership.cargo);
          } else setCargo(null);
          if (membershipResult.membership.estado === "finalizada") {
            finalizationRef.current.restoreFinalized();
            setView("finalized");
          } else {
            finalizationRef.current.restoreActive();
            setView("active");
          }
        } else {
          const { openSeason } = await getOpenSeasonContext(groupId);
          if (!active) return;
          setView(openSeason ? "eligible" : "season-required");
        }
      } catch (cause) {
        if (!active) return;
        const reason = reasonForPresentation(cause);
        if (reason === "GROUP_NOT_ACCESSIBLE") { setMembership(null); onAccessLost?.(getMembershipErrorMessage(reason)); return; }
        setError(getMembershipErrorMessage(reason));
        setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "recoverable-error" : "closed-error");
      }
    })();
    return () => { active = false; };
  }, [groupId, onAccessLost]);

  const confirm = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setView("confirming");
    setError("");
    intentRef.current.setGroupId(groupId);
    const idempotencyKey = intentRef.current.keyForExplicitAttempt();
    try {
      const result = await createMyMembershipForOwnedGroup({ groupId, idempotencyKey });
      intentRef.current.resolve();
      setMembership(result.membership);
      setCargo(null);
      setView(result.outcome === "EXISTING_IDEMPOTENT" ? "idempotent" : "active");
      onMembershipChanged?.();
      queueMicrotask(() => resultRef.current?.focus());
    } catch (cause) {
      const reason = reasonForPresentation(cause);
      if (reason === "GROUP_NOT_ACCESSIBLE") { setMembership(null); onAccessLost?.(getMembershipErrorMessage(reason)); return; }
      intentRef.current.recordFailure(reason);
      if (reason === "IDEMPOTENCY_CONFLICT") {
        setError(getMembershipErrorMessage(reason));
        setView("idempotency-conflict");
        return;
      }
      if (reason === "MEMBERSHIP_ALREADY_EXISTS") {
        sendingRef.current = false;
        await load();
        return;
      }
      if (reason === "MEMBERSHIP_REACTIVATION_REQUIRED") {
        sendingRef.current = false;
        await load();
        return;
      }
      setError(getMembershipErrorMessage(reason));
      setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "recoverable-error" : "closed-error");
    } finally {
      sendingRef.current = false;
    }
  }, [groupId, load, onAccessLost, onMembershipChanged]);

  const recheckAfterIdempotencyConflict = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setView("loading");
    setError("");
    try {
      const result = await getMyMembershipForOwnedGroup(groupId);
      if (result.membership) {
        intentRef.current.resolve();
        setMembership(result.membership);
        if (result.membership.estado === "finalizada") {
          finalizationRef.current.restoreFinalized();
          setView("finalized");
        } else {
          finalizationRef.current.restoreActive();
          setView("active");
        }
        return;
      }
      const { openSeason } = await getOpenSeasonContext(groupId);
      setMembership(null);
      intentRef.current.confirmMembershipAbsent();
      setView(openSeason ? "new-intent-required" : "season-required");
    } catch (cause) {
      const reason = reasonForPresentation(cause);
      if (reason === "GROUP_NOT_ACCESSIBLE") { setMembership(null); onAccessLost?.(getMembershipErrorMessage(reason)); return; }
      setError(getMembershipErrorMessage(reason));
      setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "idempotency-conflict" : "closed-error");
    } finally {
      sendingRef.current = false;
    }
  }, [groupId, onAccessLost]);

  const beginNewIntent = useCallback(() => {
    intentRef.current.setGroupId(groupId);
    intentRef.current.beginNewIntent();
    setError("");
    setView("eligible");
  }, [groupId]);

  const openFinalizeConfirmation = useCallback(() => {
    finalizationRef.current.openConfirmation();
    setView("finalize-confirmation");
  }, []);

  const cancelFinalize = useCallback(() => {
    finalizationRef.current.cancel();
    setView("active");
  }, []);

  useEffect(() => {
    if (view === "finalize-confirmation") cancelFinalizeRef.current?.focus();
  }, [view]);

  const finalizeMembership = useCallback(async () => {
    if (sendingRef.current || !finalizationRef.current.begin()) return;
    sendingRef.current = true;
    setView("finalizing");
    setError("");
    try {
      const result = await finalizeMyMembershipForOwnedGroup(groupId);
      finalizationRef.current.confirm(result.outcome);
      setMembership(result.membership);
      setCargo(null);
      setView(result.outcome === "ALREADY_FINALIZED" ? "already-finalized" : "finalized");
      onMembershipChanged?.();
      queueMicrotask(() => resultRef.current?.focus());
    } catch (cause) {
      const reason = reasonForPresentation(cause);
      if (reason === "GROUP_NOT_ACCESSIBLE") { setMembership(null); onAccessLost?.(getMembershipErrorMessage(reason)); return; }
      finalizationRef.current.fail(reason);
      setError(getMembershipErrorMessage(reason));
      if (reason === "MEMBERSHIP_REACTIVATION_REQUIRED") setView("reactivation-required");
      else setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "finalize-recoverable" : "closed-error");
    } finally {
      sendingRef.current = false;
    }
  }, [groupId, onAccessLost, onMembershipChanged]);

  return (
    <li className="min-w-0 rounded-xl border border-orange-300 bg-orange-50/40">
      <button type="button" aria-expanded={expanded} aria-controls="owner-membership-details" className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => setExpanded((current) => !current)}>
        <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="break-words font-semibold">{personName}</span><span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">Owner</span></span><span className="mt-1 block break-words text-sm text-[var(--text-muted)]">{membership?.estado === "activa" ? cargo ?? "Sin cargo" : "Todavía no sos integrante"}</span></span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`size-5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
      </button>
      {expanded ? <div id="owner-membership-details" className="border-t border-orange-200 px-4 pb-4 pt-3">
      <h3 id="membership-heading" className="font-semibold">Tu Membresía</h3>
      {view === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Cargando contexto de Membresía…</p> : null}
      {view === "person-required" ? <div className="mt-3 space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Seguís administrando el grupo. Para sumarte como integrante, necesitás crear tu ficha personal.</p><Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 py-2 font-semibold" href="/profile/person">Crear mi ficha personal</Link></div> : null}
      {view === "season-required" ? <div className="mt-3 space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Necesitás una Temporada abierta antes de crear la Membresía.</p><Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 py-2 font-semibold" href={`/dashboard/groups/${groupId}/seasons/new`}>Crear y abrir temporada</Link></div> : null}
      {view === "eligible" ? <div className="mt-3 space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Ya podés sumarte como integrante y seguir administrando el grupo.</p><button type="button" className="min-h-11 rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void confirm()}>Incorporarme como integrante</button></div> : null}
      {view === "confirming" ? <div className="mt-3" aria-live="polite"><button type="button" disabled className="min-h-11 cursor-wait rounded-lg bg-orange-400 px-5 py-2 font-semibold text-white">Confirmando Membresía…</button></div> : null}
      {(view === "active" || view === "idempotent") && membership?.estado === "activa" ? <div ref={resultRef} tabIndex={-1} className="mt-4 focus-visible:outline-2" aria-live="polite"><p className="text-xs font-semibold tracking-wide text-emerald-700">ACTIVA</p><p className="mt-2 text-sm">Integrante desde <time dateTime={membership.fechaIngreso}>{new Date(membership.fechaIngreso).toLocaleDateString("es-AR")}</time>.</p>{view === "idempotent" ? <p className="mt-2 text-sm text-[var(--text-muted)]">Recuperamos la Membresía ya confirmada para esta intención.</p> : null}<div className="mt-4 flex flex-col gap-2 md:flex-row md:flex-wrap"><button type="button" disabled={actionBusy} className="min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold disabled:opacity-60" onClick={(event) => onEditCargo?.(membership.id, event.currentTarget)}>Editar cargo</button><button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={openFinalizeConfirmation}>Finalizar mi Membresía</button></div></div> : null}
      {view === "finalize-confirmation" && membership?.estado === "activa" ? <div className="mt-4 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="finalize-membership-title" aria-describedby="finalize-membership-description" onKeyDown={(event) => { if (event.key === "Escape") cancelFinalize(); }}><h3 id="finalize-membership-title" className="font-semibold text-amber-950">Confirmar finalización</h3><p id="finalize-membership-description" className="text-sm leading-6 text-amber-950">Dejarás de integrar deportivamente el Grupo. Vas a conservar el ownership y podrás seguir administrándolo. La reactivación todavía no está disponible.</p><div className="flex flex-col gap-2 sm:flex-row"><button ref={cancelFinalizeRef} type="button" className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-semibold" onClick={cancelFinalize}>Cancelar</button><button type="button" className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void finalizeMembership()}>Sí, finalizar mi Membresía</button></div></div> : null}
      {view === "finalizing" ? <p className="mt-4 text-sm text-[var(--text-muted)]" role="status" aria-live="polite">Finalizando tu Membresía…</p> : null}
      {(["finalized", "already-finalized"].includes(view)) && membership?.estado === "finalizada" ? <div ref={resultRef} tabIndex={-1} className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 focus-visible:outline-2" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-wide text-slate-700">finalizada</p><p className="mt-2 text-sm text-slate-950">Integraste el Grupo desde <time dateTime={membership.fechaIngreso}>{new Date(membership.fechaIngreso).toLocaleDateString("es-AR")}</time> hasta <time dateTime={membership.fechaEgreso}>{new Date(membership.fechaEgreso).toLocaleDateString("es-AR")}</time>.</p><p className="mt-2 text-sm text-slate-800">Conservás el ownership. Para volver a integrar el Grupo se requiere reactivación, que todavía no está disponible.</p>{view === "already-finalized" ? <p className="mt-2 text-sm text-slate-800">Recuperamos la finalización ya confirmada.</p> : null}</div> : null}
      {view === "reactivation-required" ? <div className="mt-3" role="alert"><p className="text-sm text-amber-800">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-amber-400 px-4 py-2 font-semibold" onClick={() => void load()}>Volver a consultar</button></div> : null}
      {view === "finalize-recoverable" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => { finalizationRef.current.restoreActive(); finalizationRef.current.openConfirmation(); void finalizeMembership(); }}>Reintentar finalización</button></div> : null}
      {view === "idempotency-conflict" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error} No volveremos a enviar esa clave.</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void recheckAfterIdempotencyConflict()}>Reconsultar estado de Membresía</button></div> : null}
      {view === "new-intent-required" ? <div className="mt-3 space-y-3" aria-live="polite"><p className="text-sm text-[var(--text-muted)]">Confirmamos que no existe una Membresía activa. Podés descartar la clave incompatible y preparar una intención nueva.</p><button type="button" className="min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={beginNewIntent}>Comenzar una nueva intención</button></div> : null}
      {view === "recoverable-error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void confirm()}>Reintentar la misma intención</button></div> : null}
      {view === "closed-error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load()}>Volver a consultar</button></div> : null}
      </div> : null}
    </li>
  );
}
