"use client";

import { useEffect, useRef, useState } from "react";
import { OwnerDirectPaymentAccessSection } from "@/components/administrativeReceipts/OwnerDirectPaymentAccessSection";
import { OwnerPaymentReviewAccessSection } from "@/components/paymentDeliveries/OwnerPaymentReviewAccessSection";
import { OwnerTreasuryAccessSection } from "@/components/treasury/OwnerTreasuryAccessSection";

type AccessKind = "TREASURY" | "REVIEW" | "RECORD";

export function OwnerAccessManagementSection({ groupId, compact = false }: { groupId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AccessKind>("TREASURY");
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open) queueMicrotask(() => close.current?.focus()); }, [open]);

  function closeDialog() {
    setOpen(false);
    queueMicrotask(() => trigger.current?.focus());
  }

  return (
    <section className={compact ? "" : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2"} aria-labelledby="owner-access-management-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={compact ? "sr-only" : ""}>
          <h2 id="owner-access-management-title" className="text-xl font-semibold">Accesos</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Tres permisos independientes: consultar economía, revisar pagos informados y registrar pagos. El cargo no concede ninguno.
          </p>
        </div>
        <button ref={trigger} type="button" className={`min-h-11 rounded-lg px-4 font-semibold ${compact ? "border" : "bg-orange-600 text-white"}`} onClick={() => setOpen(true)}>
          Administrar accesos
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !event.currentTarget.querySelector('[role="alertdialog"]')) closeDialog(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="owner-access-dialog-title" className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl bg-[var(--surface)] p-5 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="owner-access-dialog-title" className="text-xl font-semibold">Administrar accesos</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Cada concesión, revocación e historia permanece separada.</p>
              </div>
              <button ref={close} type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={closeDialog}>Cerrar</button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Tipo de acceso">
              <button type="button" role="tab" aria-selected={kind === "TREASURY"} className={`min-h-11 rounded-lg border px-4 font-semibold ${kind === "TREASURY" ? "border-orange-500 bg-orange-50" : ""}`} onClick={() => setKind("TREASURY")}>Consultar economía</button>
              <button type="button" role="tab" aria-selected={kind === "REVIEW"} className={`min-h-11 rounded-lg border px-4 font-semibold ${kind === "REVIEW" ? "border-orange-500 bg-orange-50" : ""}`} onClick={() => setKind("REVIEW")}>Revisar pagos informados</button>
              <button type="button" role="tab" aria-selected={kind === "RECORD"} className={`min-h-11 rounded-lg border px-4 font-semibold ${kind === "RECORD" ? "border-orange-500 bg-orange-50" : ""}`} onClick={() => setKind("RECORD")}>Registrar pagos</button>
            </div>
            <div className="mt-5" role="tabpanel">
              {kind === "TREASURY" ? <OwnerTreasuryAccessSection groupId={groupId} /> : null}
              {kind === "REVIEW" ? <OwnerPaymentReviewAccessSection groupId={groupId} /> : null}
              {kind === "RECORD" ? <OwnerDirectPaymentAccessSection groupId={groupId} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
