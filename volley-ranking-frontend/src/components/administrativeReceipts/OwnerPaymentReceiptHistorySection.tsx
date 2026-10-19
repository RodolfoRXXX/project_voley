"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentObligationDetailDialog } from "@/components/payments/PaymentObligationDetailDialog";
import {
  administrativeReceiptErrorMessage,
  administrativeReceiptErrorReason,
  listOwnerAdministrativeReceipts,
  newAdministrativeReceiptKey,
  reverseAdministrativeReceipt,
} from "@/services/administrativeReceiptsService";
import { formatArs } from "@/services/paymentsService";
import {
  deliveryErrorMessage,
  deliveryErrorReason,
  newDeliveryKey,
  reverseConfirmedPaymentDelivery,
} from "@/services/paymentDeliveriesService";
import type { PaymentReceipt } from "@/types/AdministrativeReceipt";

const personName = (receipt: PaymentReceipt) =>
  receipt.person?.status === "AVAILABLE"
    ? `${receipt.person.firstName} ${receipt.person.lastName}`
    : "Persona no disponible";

export function OwnerPaymentReceiptHistorySection({
  groupId,
  refreshVersion = 0,
  onEconomyChanged,
  initiallyExpanded = false,
}: {
  groupId: string;
  refreshVersion?: number;
  onEconomyChanged?: () => void;
  initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [items, setItems] = useState<PaymentReceipt[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<{ receipt: PaymentReceipt; key: string } | null>(null);
  const [reason, setReason] = useState("");
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [detail, setDetail] = useState<PaymentReceipt | null>(null);
  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null);
  const busy = useRef(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const obligationTrigger = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async (append = false) => {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError("");
    try {
      const page = await listOwnerAdministrativeReceipts({
        groupId,
        pageSize: 20,
        ...(append && cursor ? { cursor } : {}),
      });
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(administrativeReceiptErrorMessage(administrativeReceiptErrorReason(cause)));
    } finally {
      busy.current = false;
      setStatus("idle");
    }
  }, [cursor, groupId]);

  useEffect(() => {
    if (expanded) void load(false);
  }, [expanded, refreshVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (target) queueMicrotask(() => cancel.current?.focus()); }, [target]);

  async function reverse() {
    if (!target || !reason.trim() || busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError("");
    try {
      if (target.receipt.origin === "ADMINISTRATIVE") {
        await reverseAdministrativeReceipt({ groupId, receiptId: target.receipt.receiptId, reason, idempotencyKey: target.key });
      } else {
        await reverseConfirmedPaymentDelivery({ groupId, deliveryId: target.receipt.deliveryId!, reason, idempotencyKey: target.key });
      }
      setNotice("Registro revertido. Corrige el registro y los saldos; no devuelve dinero ni reabre avisos vinculados.");
      setTarget(null);
      setReason("");
      setRecoveryPending(false);
      onEconomyChanged?.();
      busy.current = false;
      await load(false);
    } catch (cause) {
      const code = target.receipt.origin === "ADMINISTRATIVE" ? administrativeReceiptErrorReason(cause) : deliveryErrorReason(cause);
      setError(target.receipt.origin === "ADMINISTRATIVE" ? administrativeReceiptErrorMessage(code as ReturnType<typeof administrativeReceiptErrorReason>) : deliveryErrorMessage(code as ReturnType<typeof deliveryErrorReason>));
      setRecoveryPending(code === "PENDING_RECOVERY");
    } finally {
      busy.current = false;
      setStatus("idle");
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="payment-receipt-history-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="payment-receipt-history-title" className="text-xl font-semibold">Historia de pagos</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Recepciones informadas y administrativas, inicialmente colapsadas.</p>
        </div>
        <button
          ref={toggle}
          type="button"
          className="min-h-11 rounded-lg border px-4 font-semibold"
          aria-expanded={expanded}
          aria-controls="payment-receipt-history-content"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Ocultar historia" : "Ver historia"}
        </button>
      </div>
      {expanded ? (
        <div id="payment-receipt-history-content" className="mt-5">
          <div aria-live="polite">
            {notice ? <p className="mb-3 text-sm text-emerald-700">{notice}</p> : null}
            {error ? <p role="alert" className="mb-3 text-sm text-red-700">{error}</p> : null}
          </div>
          {status === "loading" && items.length === 0 ? <p role="status">Cargando historia…</p> : null}
          {status === "idle" && items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Todavía no hay registros.</p> : null}
          {items.length ? (
            <ul className="divide-y rounded-xl border">
              {items.map((receipt) => (
                <li key={receipt.receiptId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-semibold">{personName(receipt)}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      <span className="rounded-full border px-2 py-0.5 font-semibold">
                        {receipt.origin === "ADMINISTRATIVE" ? "Administrativo" : "Informado"}
                      </span>{" "}
                      · {receipt.receivedOn} · {formatArs(receipt.totalMinor)} · {receipt.applicationState === "REVERSED" ? "Revertido" : "Aplicado"}
                    </p>
                  </div>
                  <button type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => setDetail(receipt)}>Ver detalle</button>
                </li>
              ))}
            </ul>
          ) : null}
          {cursor ? (
            <button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" disabled={status === "loading"} onClick={() => void load(true)}>
              {status === "loading" ? "Cargando…" : "Cargar más historia"}
            </button>
          ) : null}
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !detailPaymentId) setDetail(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="receipt-detail-title" className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-[var(--surface)] p-6 shadow-xl">
            <h3 id="receipt-detail-title" className="text-lg font-semibold">Detalle de la recepción</h3>
            <p className="mt-2">{personName(detail)} · {formatArs(detail.totalMinor)} · {detail.receivedOn}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Origen: {detail.origin === "ADMINISTRATIVE" ? "Registro administrativo" : "Pago informado"} · Estado: {detail.applicationState === "REVERSED" ? "Revertido" : detail.decisionState === "REPORTED" ? "Pendiente" : detail.decisionState === "REJECTED" ? "Rechazado" : detail.decisionState === "RESOLVED_BY_ADMINISTRATIVE_RECEIPT" ? "Resuelto por registro administrativo, sin ingreso propio" : "Aplicado"}</p>
            <ul className="mt-4 divide-y rounded-lg border">{detail.lines.map((line) => <li key={line.lineId ?? line.paymentId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><span>{line.conceptName} · vence {line.dueDate} · {line.allocationMode === "FULL" ? "Total" : "Parcial"}</span><div className="flex items-center gap-3"><strong>{formatArs(line.amountMinor)}</strong><button type="button" className="min-h-11 rounded-lg border px-3 font-semibold" onClick={(event) => { obligationTrigger.current = event.currentTarget; setDetailPaymentId(line.paymentId); }}>Ver obligación</button></div></li>)}</ul>
            {detail.reversal ? <p className="mt-3 text-sm">Motivo de reversión: {detail.reversal.reason}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => setDetail(null)}>Cerrar</button>{detail.applicationState === "APPLIED" ? <button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 font-semibold text-red-800" onClick={() => { setTarget({ receipt: detail, key: detail.origin === "ADMINISTRATIVE" ? newAdministrativeReceiptKey() : newDeliveryKey() }); setRecoveryPending(false); setDetail(null); }}>Revertir registro</button> : null}</div>
            {detail.applicationState === "APPLIED" ? <p className="mt-3 text-sm text-amber-800">La reversión corrige el registro; no devuelve dinero.</p> : null}
          </div>
        </div>
      ) : null}

      {detailPaymentId ? <PaymentObligationDetailDialog groupId={groupId} paymentId={detailPaymentId} onClose={() => { setDetailPaymentId(null); queueMicrotask(() => obligationTrigger.current?.focus()); }} onVoided={() => { onEconomyChanged?.(); void load(false); }} /> : null}

      {target ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !busy.current && !recoveryPending) setTarget(null); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="reverse-administrative-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="reverse-administrative-title" className="text-lg font-semibold">Revertir recepción completa</h3>
            <p className="mt-2 text-sm">Esta corrección registral ajusta saldos, pero no devuelve dinero ni reabre pagos informados vinculados.</p>
            <label className="mt-4 block font-semibold">
              Motivo obligatorio
              <textarea className="mt-1 min-h-24 w-full rounded-lg border p-3" value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button ref={cancel} type="button" disabled={status === "loading" || recoveryPending} className="min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50" onClick={() => setTarget(null)}>Cancelar</button>
              <button type="button" disabled={!reason.trim() || status === "loading"} className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white disabled:opacity-50" onClick={() => void reverse()}>
                {status === "loading" ? "Revirtiendo…" : recoveryPending ? "Recuperar misma reversión" : "Confirmar reversión"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
