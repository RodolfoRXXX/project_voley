"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { getMembershipErrorMessage, getMembershipErrorReason, leaveMyGroupMembership, listMyCurrentGroupMemberships } from "@/services/membershipsService";
import type { MyCurrentGroupMembership } from "@/types/MyCurrentGroupMembership";
import type { MembershipErrorReason } from "@/types/OwnMembership";
import { createMembershipSelfExitMachine } from "./membershipSelfExitMachine.mjs";

type Status = "loading" | "ready" | "error" | "person-required";
type ExitView = "idle" | "confirmation" | "submitting" | "recoverable" | "season-closed" | "blocked" | "confirmed";

function newExitKey() { return `membership-exit-${crypto.randomUUID()}`; }

export function MyCurrentGroupMembershipsSection() {
  const [items, setItems] = useState<MyCurrentGroupMembership[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reason, setReason] = useState<MembershipErrorReason | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [emptyContinuation, setEmptyContinuation] = useState(false);
  const [exitView, setExitView] = useState<ExitView>("idle");
  const [exitReason, setExitReason] = useState<MembershipErrorReason | null>(null);
  const exitMachineRef = useRef(createMembershipSelfExitMachine());
  const sendingRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const acceptResult = useCallback((result: Awaited<ReturnType<typeof listMyCurrentGroupMemberships>>, continuing: boolean) => {
    setItems((current) => continuing ? [...current, ...result.items] : result.items);
    setNextCursor(result.nextCursor);
    setEmptyContinuation(result.items.length === 0 && result.nextCursor !== null);
    setStatus("ready");
    return result;
  }, []);

  const acceptError = useCallback((cause: unknown) => {
    const nextReason = getMembershipErrorReason(cause);
    setReason(nextReason);
    setStatus(nextReason === "PERSON_REQUIRED" ? "person-required" : "error");
  }, []);

  const load = useCallback(async (cursor?: string) => {
    const continuing = Boolean(cursor);
    if (continuing) setLoadingNext(true); else setStatus("loading");
    setReason(null);
    try { acceptResult(await listMyCurrentGroupMemberships(cursor ? { cursor } : {}), continuing); }
    catch (cause) { acceptError(cause); }
    finally { setLoadingNext(false); }
  }, [acceptError, acceptResult]);

  useEffect(() => {
    let active = true;
    void listMyCurrentGroupMemberships().then(
      (result) => { if (active) acceptResult(result, false); },
      (cause) => { if (active) acceptError(cause); }
    );
    return () => { active = false; };
  }, [acceptError, acceptResult]);

  const target = exitMachineRef.current.snapshot().target;
  const openExit = useCallback((item: MyCurrentGroupMembership) => {
    const snapshot = exitMachineRef.current.open({ groupId: item.group.id, membershipId: item.membership.id, groupName: item.group.nombre, viewerIsOwner: item.group.viewerIsOwner }, newExitKey);
    setExitReason(null);
    setExitView(snapshot.state as ExitView);
  }, []);
  const cancelExit = useCallback(() => {
    setExitReason(null);
    setExitView(exitMachineRef.current.cancel().state as ExitView);
  }, []);

  useEffect(() => {
    if (exitView === "confirmation") cancelRef.current?.focus();
    if (exitView === "confirmed") resultRef.current?.focus();
  }, [exitView]);

  const confirmExit = useCallback(async () => {
    if (sendingRef.current) return;
    const command = exitMachineRef.current.begin();
    if (!command) return;
    sendingRef.current = true;
    setExitView("submitting");
    setExitReason(null);
    try {
      const result = await leaveMyGroupMembership(command);
      if (result.outcome !== "EXIT_CONFIRMED") throw new Error("Unexpected membership exit outcome");
      const refreshed = await listMyCurrentGroupMemberships();
      acceptResult(refreshed, false);
      if (refreshed.items.some((item) => item.membership.id === result.exit.membershipId)) throw new Error("Persisted membership exit is not visible yet");
      exitMachineRef.current.confirm();
      setExitView("confirmed");
    } catch (cause) {
      const nextReason = getMembershipErrorReason(cause);
      setExitReason(nextReason);
      setExitView(exitMachineRef.current.fail(nextReason).state as ExitView);
    } finally { sendingRef.current = false; }
  }, [acceptResult]);

  const closeExitStatus = useCallback(() => {
    exitMachineRef.current.reset();
    setExitReason(null);
    setExitView("idle");
    void load();
  }, [load]);

  return (
    <section aria-labelledby="member-groups-title" className="space-y-4">
      <div>
        <h2 id="member-groups-title" className="text-2xl font-semibold">Grupos que integrás</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Pertenencias operativas confirmadas por tu Membresía y la Temporada abierta actual.</p>
      </div>
      <div aria-live="polite" aria-busy={status === "loading" || loadingNext || exitView === "submitting"} className="min-w-0">
        {status === "loading" ? <p className="rounded-xl border border-[var(--border)] p-5">Cargando tus pertenencias…</p> : null}
        {status === "person-required" ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><p>Necesitás vincular tu Persona para consultar los Grupos que integrás.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-500 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" href="/profile/person">Ir a mi Persona</Link></div> : null}
        {status === "error" ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><p>{reason ? getMembershipErrorMessage(reason) : "No pudimos cargar tus pertenencias."}</p>{reason === "INCOMPATIBLE_STATE" ? <p className="mt-2 text-sm">La información requiere revisión y no se mostrará parcialmente.</p> : null}<button type="button" className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load()}>Reintentar</button></div> : null}
        {status === "ready" && items.length === 0 && !nextCursor ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center sm:p-10"><h3 className="text-lg font-semibold">No tenés Grupos operativos para mostrar</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Una Membresía aparece cuando está íntegra y coincide con la Temporada abierta actual.</p></div> : null}
        {items.length > 0 ? <div className="grid min-w-0 gap-4 sm:grid-cols-2">{items.map((item) => <article key={item.membership.id} className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] p-5"><h3 className="break-words text-lg font-semibold">{item.group.nombre}</h3><p className="mt-2 text-sm capitalize text-[var(--text-muted)]">{item.group.deporte}</p><p className="mt-3 text-sm">Integrás este Grupo mediante una Membresía activa.</p><p className="mt-2 text-sm text-[var(--text-muted)]">Primera incorporación: <time dateTime={item.membership.fechaIngreso}>{new Date(item.membership.fechaIngreso).toLocaleDateString("es-AR")}</time></p><button type="button" className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60" disabled={exitView === "submitting"} onClick={() => openExit(item)}>Salir del grupo</button></article>)}</div> : null}
        {exitView === "confirmation" && target ? <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="leave-group-title" aria-describedby="leave-group-description" onKeyDown={(event) => { if (event.key === "Escape") cancelExit(); }}><h3 id="leave-group-title" className="font-semibold text-amber-950">Confirmar “Salir del grupo”</h3><p id="leave-group-description" className="mt-2 text-sm leading-6 text-amber-950">Vas a finalizar tu propia Membresía activa en {target.groupName}. Podrás volver a solicitar ingreso más adelante.</p>{target.viewerIsOwner ? <p className="mt-2 text-sm font-semibold text-amber-950">Seguirás siendo Owner del Grupo y podrás continuar administrándolo. Esta acción no abandona ni transfiere la propiedad.</p> : null}<div className="mt-4 flex flex-col gap-2 sm:flex-row"><button ref={cancelRef} type="button" className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={cancelExit}>Cancelar</button><button type="button" className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void confirmExit()}>Sí, salir del grupo</button></div></div> : null}
        {exitView === "submitting" ? <p className="mt-4 rounded-xl border border-[var(--border)] p-4" role="status">Confirmando tu salida…</p> : null}
        {exitView === "recoverable" ? <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4" role="alert"><p>{getMembershipErrorMessage(exitReason || "INTERNAL_ERROR")}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void confirmExit()}>Reintentar la misma salida</button></div> : null}
        {exitView === "season-closed" ? <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert"><p>{getMembershipErrorMessage("MEMBERSHIP_SEASON_NOT_MODIFIABLE")}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-amber-500 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={closeExitStatus}>Actualizar Membresías</button></div> : null}
        {exitView === "blocked" ? <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4" role="alert"><p>{getMembershipErrorMessage(exitReason || "INTERNAL_ERROR")}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={closeExitStatus}>Actualizar Membresías</button></div> : null}
        {exitView === "confirmed" ? <div ref={resultRef} tabIndex={-1} className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 focus-visible:outline-2" aria-live="polite"><p className="font-semibold text-emerald-950">Salida confirmada.</p><p className="mt-1 text-sm text-emerald-900">La Membresía dejó de aparecer entre tus pertenencias activas.</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-emerald-500 px-4 py-2 font-semibold" onClick={closeExitStatus}>Cerrar</button></div> : null}
        {status === "ready" && emptyContinuation ? <p className="mt-4 rounded-xl border border-[var(--border)] p-4 text-sm">Esta página no contiene pertenencias operativas, pero todavía hay resultados para revisar.</p> : null}
        {status === "ready" && nextCursor ? <button type="button" className="mt-4 min-h-11 rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60" disabled={loadingNext || exitView === "submitting"} onClick={() => void load(nextCursor)}>{loadingNext ? "Cargando…" : "Ver página siguiente"}</button> : null}
        {status === "ready" && !nextCursor && items.length > 0 ? <p className="mt-4 text-sm text-[var(--text-muted)]">Llegaste al fin de los resultados.</p> : null}
      </div>
    </section>
  );
}
