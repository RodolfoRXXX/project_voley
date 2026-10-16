"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatArs } from "@/services/paymentsService";
import {
  confirmPaymentDelivery,
  deliveryErrorMessage,
  deliveryErrorReason,
  getGroupPaymentDelivery,
  listGroupPaymentDeliveries,
  newDeliveryKey,
  rejectPaymentDelivery,
} from "@/services/paymentDeliveriesService";
import type { PaymentDelivery } from "@/types/PaymentDelivery";

type Intent =
  | { kind: "confirm"; delivery: PaymentDelivery; key: string }
  | { kind: "reject"; delivery: PaymentDelivery; key: string };

const person = (item: PaymentDelivery) =>
  item.person?.status === "AVAILABLE" ? `${item.person.firstName} ${item.person.lastName}` : "Persona no disponible";

export function PaymentDeliveriesAdminSection({
  groupId,
  requestedDeliveryId,
  onRequestHandled,
  onDetailClosed,
  onEconomyChanged,
}: {
  groupId: string;
  owner?: boolean;
  requestedDeliveryId?: string;
  onRequestHandled?: () => void;
  onDetailClosed?: () => void;
  onEconomyChanged?: () => void;
}) {
  const [pending, setPending] = useState<PaymentDelivery[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [detail, setDetail] = useState<PaymentDelivery | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [reasonCode, setReasonCode] = useState("PAYMENT_NOT_RECEIVED");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "lost">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recovery, setRecovery] = useState<Intent | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const section = useRef<HTMLElement>(null);
  const detailClose = useRef<HTMLButtonElement>(null);
  const intentCancel = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (append = false) => {
    if (busy.current) return;
    busy.current = true;
    if (!append) setStatus("loading");
    setError("");
    try {
      const page = await listGroupPaymentDeliveries({
        groupId,
        decisionState: "REPORTED",
        pageSize: 20,
        ...(append && cursor ? { cursor } : {}),
      });
      setPending((current) => append ? [...current, ...page.items] : page.items);
      setCursor(page.nextCursor);
      setStatus("ready");
    } catch (cause) {
      const code = deliveryErrorReason(cause);
      setError(deliveryErrorMessage(code));
      if (!append) setPending([]);
      setDetail(null);
      setStatus(code === "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED" ? "lost" : "error");
    } finally {
      busy.current = false;
    }
  }, [cursor, groupId]);

  useEffect(() => { void load(false); }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (detail) queueMicrotask(() => detailClose.current?.focus()); }, [detail]);
  useEffect(() => { if (intent) queueMicrotask(() => intentCancel.current?.focus()); }, [intent]);

  async function open(item: PaymentDelivery) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try {
      setDetail(await getGroupPaymentDelivery({ groupId, deliveryId: item.deliveryId }));
    } catch (cause) {
      setError(deliveryErrorMessage(deliveryErrorReason(cause)));
      setDetail(null);
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    if (!requestedDeliveryId || busy.current) return;
    busy.current = true; setError("");
    void getGroupPaymentDelivery({ groupId, deliveryId: requestedDeliveryId }).then(setDetail, (cause) => setError(deliveryErrorMessage(deliveryErrorReason(cause)))).finally(() => { busy.current = false; onRequestHandled?.(); });
  }, [groupId, onRequestHandled, requestedDeliveryId]);

  async function execute(fixed?: Intent) {
    const current = fixed ?? intent;
    if (!current || busy.current) return;
    busy.current = true;
    setSending(true);
    setError("");
    try {
      if (current.kind === "confirm") {
        await confirmPaymentDelivery({ groupId, deliveryId: current.delivery.deliveryId, idempotencyKey: current.key });
      } else {
        await rejectPaymentDelivery({
          groupId,
          deliveryId: current.delivery.deliveryId,
          reasonCode,
          ...(reason.trim() ? { reasonNote: reason } : {}),
          idempotencyKey: current.key,
        });
      }
      setNotice(current.kind === "confirm" ? "Entrega confirmada completa." : "Entrega rechazada completa.");
      setRecovery(null);
      setIntent(null);
      setDetail(null);
      onDetailClosed?.();
      setReason("");
      if (current.kind === "confirm") onEconomyChanged?.();
      busy.current = false;
      await load(false);
    } catch (cause) {
      const code = deliveryErrorReason(cause);
      setError(deliveryErrorMessage(code));
      if (code === "PENDING_RECOVERY") setRecovery(current);
      if (code === "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED") {
        setPending([]);
        setDetail(null);
        setStatus("lost");
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return (
    <section ref={section} id="payment-deliveries" tabIndex={-1} className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="deliveries-admin-title">
      <div>
        <h2 id="deliveries-admin-title" className="text-xl font-semibold">Pagos informados pendientes</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Bandeja general accesible aunque el sujeto no aparezca en la página actual de obligaciones. Cada decisión abarca una entrega completa.</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">La reversión Owner permanece en el historial. Esta acción corrige el registro del pago; no devuelve dinero.</p>
      </div>
      <div aria-live="polite">
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      </div>
      {recovery ? <button type="button" disabled={sending} className="min-h-11 rounded-lg border border-amber-600 px-4 font-semibold" onClick={() => void execute(recovery)}>Recuperar la misma decisión</button> : null}
      {status === "loading" ? <p role="status">Cargando bandeja…</p> : null}
      {status === "lost" ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3">Tu autorización ya no está vigente. Se limpiaron los datos administrativos.</p> : null}
      {status === "error" ? <button type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void load(false)}>Reintentar</button> : null}
      {status === "ready" ? (
        <>
          {pending.length ? (
            <ul className="divide-y rounded-xl border">
              {pending.map((item) => (
                <li key={item.deliveryId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div>
                    <strong>{person(item)}</strong>
                    <p className="text-sm text-[var(--text-muted)]">{item.declaredPaidOn} · {formatArs(item.declaredTotalMinor)} · Pendiente</p>
                  </div>
                  <button type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void open(item)}>Revisar entrega completa</button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-[var(--text-muted)]">No hay entregas pendientes en la bandeja.</p>}
          {cursor ? <button type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void load(true)}>Cargar más pagos informados</button> : null}
        </>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !sending) { setDetail(null); onDetailClosed?.(); } }}>
          <div role="dialog" aria-modal="true" aria-labelledby="delivery-detail-title" className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6">
            <h3 id="delivery-detail-title" className="text-lg font-semibold">Entrega completa</h3>
            <p className="mt-2">{person(detail)} · fecha declarada {detail.declaredPaidOn}</p>
            <p className="mt-1">Total derivado: <strong>{formatArs(detail.declaredTotalMinor)}</strong></p>
            <ul className="mt-4 divide-y rounded border">{detail.lines?.map((line) => <li key={line.lineId} className="flex justify-between gap-3 p-3 text-sm"><span>{line.conceptName} · {line.selectionMode === "FULL" ? "Total" : "Parcial"}</span><strong>{formatArs(line.requestedAmountMinor)}</strong></li>)}</ul>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button ref={detailClose} type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => { setDetail(null); onDetailClosed?.(); }}>Cerrar</button>
              <button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 font-semibold text-red-800" onClick={() => setIntent({ kind: "reject", delivery: detail, key: newDeliveryKey() })}>Rechazar entrega completa</button>
              <button type="button" className="min-h-11 rounded-lg bg-orange-600 px-4 font-semibold text-white" onClick={() => setIntent({ kind: "confirm", delivery: detail, key: newDeliveryKey() })}>Confirmar entrega completa</button>
            </div>
          </div>
        </div>
      ) : null}

      {intent ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !sending) setIntent(null); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="decision-title" className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 id="decision-title" className="text-lg font-semibold">{intent.kind === "confirm" ? "Confirmar entrega completa" : "Rechazar entrega completa"}</h3>
            <p className="mt-2 text-sm">{intent.kind === "confirm" ? "Se aplicarán todas las líneas o ninguna." : "No se aplicará ninguna línea."}</p>
            {intent.kind === "reject" ? (
              <>
                <label className="mt-4 block text-sm">Categoría<select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className="mt-1 block min-h-11 w-full rounded border p-2"><option value="PAYMENT_NOT_RECEIVED">Entrega no recibida</option><option value="AMOUNT_DOES_NOT_MATCH">Importe no coincide</option><option value="DATE_DOES_NOT_MATCH">Fecha no coincide</option><option value="DUPLICATE_DELIVERY">Entrega duplicada</option><option value="OTHER">Otro motivo</option></select></label>
                <label className="mt-3 block text-sm">Observación{reasonCode === "OTHER" ? " obligatoria" : " opcional"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
              </>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button ref={intentCancel} type="button" disabled={sending} className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => setIntent(null)}>Cancelar</button>
              <button type="button" disabled={sending || (reasonCode === "OTHER" && !reason.trim())} className="min-h-11 rounded-lg bg-orange-600 px-4 font-semibold text-white disabled:opacity-50" onClick={() => void execute()}>{sending ? "Confirmando…" : "Confirmar decisión"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
