"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { createMyMembershipForOwnedGroup, getMembershipErrorMessage, getMembershipErrorReason, getMyMembershipForOwnedGroup } from "@/services/membershipsService";
import { getMyPerson, getPersonErrorReason } from "@/services/personService";
import { getOpenSeasonContext } from "@/services/seasonsService";
import type { OwnMembership } from "@/types/OwnMembership";
import { createMembershipIntent } from "./membershipIntent.mjs";

type ViewState = "loading" | "person-required" | "season-required" | "eligible" | "confirming" | "active" | "idempotent" | "idempotency-conflict" | "new-intent-required" | "recoverable-error" | "closed-error";

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

export function OwnMembershipSection({ groupId }: { groupId: string }) {
  const [view, setView] = useState<ViewState>("loading");
  const [membership, setMembership] = useState<OwnMembership | null>(null);
  const [error, setError] = useState("");
  const intentRef = useRef(createMembershipIntent(groupId, newIdempotencyKey));
  const sendingRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    intentRef.current.setGroupId(groupId);
    setView("loading");
    setError("");
    try {
      const person = await getMyPerson();
      if (!person) {
        setMembership(null);
        setView("person-required");
        return;
      }
      const [{ openSeason }, membershipResult] = await Promise.all([
        getOpenSeasonContext(groupId),
        getMyMembershipForOwnedGroup(groupId),
      ]);
      if (membershipResult.membership) {
        setMembership(membershipResult.membership);
        setView("active");
        return;
      }
      setMembership(null);
      if (intentRef.current.snapshot().conflict) {
        intentRef.current.confirmMembershipAbsent();
        setView(openSeason ? "new-intent-required" : "season-required");
      } else {
        setView(openSeason ? "eligible" : "season-required");
      }
    } catch (cause) {
      const reason = reasonForPresentation(cause);
      setError(getMembershipErrorMessage(reason));
      setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "recoverable-error" : "closed-error");
    }
  }, [groupId]);

  useEffect(() => {
    intentRef.current.setGroupId(groupId);
    let active = true;
    void (async () => {
      try {
        const person = await getMyPerson();
        if (!active) return;
        if (!person) { setView("person-required"); return; }
        const [{ openSeason }, membershipResult] = await Promise.all([
          getOpenSeasonContext(groupId),
          getMyMembershipForOwnedGroup(groupId),
        ]);
        if (!active) return;
        if (membershipResult.membership) {
          setMembership(membershipResult.membership);
          setView("active");
        } else {
          setView(openSeason ? "eligible" : "season-required");
        }
      } catch (cause) {
        if (!active) return;
        const reason = reasonForPresentation(cause);
        setError(getMembershipErrorMessage(reason));
        setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "recoverable-error" : "closed-error");
      }
    })();
    return () => { active = false; };
  }, [groupId]);

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
      setView(result.outcome === "EXISTING_IDEMPOTENT" ? "idempotent" : "active");
      queueMicrotask(() => resultRef.current?.focus());
    } catch (cause) {
      const reason = reasonForPresentation(cause);
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
      setError(getMembershipErrorMessage(reason));
      setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "recoverable-error" : "closed-error");
    } finally {
      sendingRef.current = false;
    }
  }, [groupId, load]);

  const recheckAfterIdempotencyConflict = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setView("loading");
    setError("");
    try {
      const [{ openSeason }, result] = await Promise.all([
        getOpenSeasonContext(groupId),
        getMyMembershipForOwnedGroup(groupId),
      ]);
      if (result.membership) {
        intentRef.current.resolve();
        setMembership(result.membership);
        setView("active");
        return;
      }
      setMembership(null);
      intentRef.current.confirmMembershipAbsent();
      setView(openSeason ? "new-intent-required" : "season-required");
    } catch (cause) {
      const reason = reasonForPresentation(cause);
      setError(getMembershipErrorMessage(reason));
      setView(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"].includes(reason) ? "idempotency-conflict" : "closed-error");
    } finally {
      sendingRef.current = false;
    }
  }, [groupId]);

  const beginNewIntent = useCallback(() => {
    intentRef.current.setGroupId(groupId);
    intentRef.current.beginNewIntent();
    setError("");
    setView("eligible");
  }, [groupId]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="membership-heading">
      <h2 id="membership-heading" className="text-lg font-semibold">Tu Membresía</h2>
      {view === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Cargando contexto de Membresía…</p> : null}
      {view === "person-required" ? <div className="mt-3 space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Seguís administrando el Grupo como Owner, pero necesitás una Persona vinculada para incorporarte como integrante.</p><Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 py-2 font-semibold" href="/profile/person">Crear mi Persona</Link></div> : null}
      {view === "season-required" ? <div className="mt-3 space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Necesitás una Temporada abierta antes de crear la Membresía.</p><Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 py-2 font-semibold" href={`/dashboard/groups/${groupId}/seasons/new`}>Crear y abrir temporada</Link></div> : null}
      {view === "eligible" ? <div className="mt-3 space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">Tu Persona es elegible. La incorporación es explícita y no cambia tu acceso de Owner.</p><button type="button" className="min-h-11 rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void confirm()}>Incorporarme como integrante</button></div> : null}
      {view === "confirming" ? <div className="mt-3" aria-live="polite"><button type="button" disabled className="min-h-11 cursor-wait rounded-lg bg-orange-400 px-5 py-2 font-semibold text-white">Confirmando Membresía…</button></div> : null}
      {(view === "active" || view === "idempotent") && membership ? <div ref={resultRef} tabIndex={-1} className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 focus-visible:outline-2" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{membership.estado}</p><p className="mt-2 text-sm text-emerald-950">Integrante desde <time dateTime={membership.fechaIngreso}>{new Date(membership.fechaIngreso).toLocaleDateString("es-AR")}</time>.</p><p className="mt-1 text-sm text-emerald-900">Temporada: {membership.seasonId}</p>{view === "idempotent" ? <p className="mt-2 text-sm text-emerald-900">Recuperamos la Membresía ya confirmada para esta intención.</p> : null}</div> : null}
      {view === "idempotency-conflict" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error} No volveremos a enviar esa clave.</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void recheckAfterIdempotencyConflict()}>Reconsultar estado de Membresía</button></div> : null}
      {view === "new-intent-required" ? <div className="mt-3 space-y-3" aria-live="polite"><p className="text-sm text-[var(--text-muted)]">Confirmamos que no existe una Membresía activa. Podés descartar la clave incompatible y preparar una intención nueva.</p><button type="button" className="min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={beginNewIntent}>Comenzar una nueva intención</button></div> : null}
      {view === "recoverable-error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void confirm()}>Reintentar la misma intención</button></div> : null}
      {view === "closed-error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load()}>Volver a consultar</button></div> : null}
    </section>
  );
}
