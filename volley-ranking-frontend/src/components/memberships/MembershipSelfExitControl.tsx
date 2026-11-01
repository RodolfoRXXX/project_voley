"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createMembershipSelfExitMachine } from "@/components/memberships/membershipSelfExitMachine.mjs";
import { getMembershipErrorMessage, getMembershipErrorReason, leaveMyGroupMembership } from "@/services/membershipsService";
import type { MembershipErrorReason } from "@/types/OwnMembership";

type ExitView = "idle" | "confirmation" | "submitting" | "recoverable" | "season-closed" | "blocked" | "confirmed";

function newExitKey() { return `membership-exit-${crypto.randomUUID()}`; }

export function MembershipSelfExitControl({ groupId, membershipId, groupName, viewerIsOwner, onConfirmed }: {
  groupId: string;
  membershipId: string;
  groupName: string;
  viewerIsOwner: boolean;
  onConfirmed: () => void;
}) {
  const machine = useRef(createMembershipSelfExitMachine());
  const sending = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ExitView>("idle");
  const [reason, setReason] = useState<MembershipErrorReason | null>(null);

  useEffect(() => {
    machine.current.reset();
    setView("idle");
    setReason(null);
  }, [groupId, membershipId]);

  useEffect(() => {
    if (view === "confirmation") cancelButton.current?.focus();
    if (view === "confirmed") result.current?.focus();
  }, [view]);

  const open = useCallback(() => {
    const snapshot = machine.current.open({ groupId, membershipId, groupName, viewerIsOwner }, newExitKey);
    setReason(null);
    setView(snapshot.state as ExitView);
  }, [groupId, groupName, membershipId, viewerIsOwner]);

  const close = useCallback(() => {
    setReason(null);
    setView(machine.current.cancel().state as ExitView);
  }, []);

  const confirm = useCallback(async () => {
    if (sending.current) return;
    const command = machine.current.begin();
    if (!command) return;
    sending.current = true;
    setView("submitting");
    setReason(null);
    try {
      const response = await leaveMyGroupMembership(command);
      if (response.outcome !== "EXIT_CONFIRMED" || response.exit.membershipId !== membershipId) throw new Error("Unexpected membership exit outcome");
      machine.current.confirm();
      setView("confirmed");
      onConfirmed();
    } catch (cause) {
      const nextReason = getMembershipErrorReason(cause);
      setReason(nextReason);
      setView(machine.current.fail(nextReason).state as ExitView);
    } finally {
      sending.current = false;
    }
  }, [membershipId, onConfirmed]);

  const reset = useCallback(() => {
    machine.current.reset();
    setReason(null);
    setView("idle");
    onConfirmed();
  }, [onConfirmed]);

  return <div className="mt-6">
    {view === "idle" ? <button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={open}>Salir del grupo</button> : null}
    {view === "confirmation" ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="leave-group-title" aria-describedby="leave-group-description" onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
      <h3 id="leave-group-title" className="font-semibold text-amber-950">Confirmar “Salir del grupo”</h3>
      <p id="leave-group-description" className="mt-2 text-sm leading-6 text-amber-950">Vas a finalizar tu propia Membresía activa en {groupName}. Podrás volver a solicitar ingreso más adelante.</p>
      {viewerIsOwner ? <p className="mt-2 text-sm font-semibold text-amber-950">Seguirás siendo Owner del Grupo. Esta acción no abandona ni transfiere la propiedad.</p> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button ref={cancelButton} type="button" className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-semibold" onClick={close}>Cancelar</button><button type="button" className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white" onClick={() => void confirm()}>Sí, salir del grupo</button></div>
    </div> : null}
    {view === "submitting" ? <p className="rounded-xl border p-4" role="status">Confirmando tu salida…</p> : null}
    {view === "recoverable" ? <div className="rounded-xl border border-red-300 bg-red-50 p-4" role="alert"><p>{getMembershipErrorMessage(reason || "INTERNAL_ERROR")}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 font-semibold" onClick={() => void confirm()}>Reintentar la misma salida</button></div> : null}
    {view === "season-closed" || view === "blocked" ? <div className={`rounded-xl border p-4 ${view === "season-closed" ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50"}`} role="alert"><p>{getMembershipErrorMessage(view === "season-closed" ? "MEMBERSHIP_SEASON_NOT_MODIFIABLE" : reason || "INTERNAL_ERROR")}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" onClick={reset}>Actualizar participación</button></div> : null}
    {view === "confirmed" ? <div ref={result} tabIndex={-1} className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 focus-visible:outline-2" aria-live="polite"><p className="font-semibold text-emerald-950">Salida confirmada.</p><p className="mt-1 text-sm text-emerald-900">La Membresía dejó de aparecer entre tus pertenencias activas.</p></div> : null}
  </div>;
}
