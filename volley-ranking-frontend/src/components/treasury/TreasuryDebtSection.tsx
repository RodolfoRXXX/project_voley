"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PaymentObligationDetailDialog } from "@/components/payments/PaymentObligationDetailDialog";
import { formatArs, getPaymentErrorMessage, getPaymentErrorReason, listGroupObligations } from "@/services/paymentsService";
import type { Obligation } from "@/types/Payment";

export function TreasuryDebtSection({ groupId, onAccessLost }: { groupId: string; onAccessLost: () => void }) {
  const [items, setItems] = useState<Obligation[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async (append = false) => {
    setStatus("loading");
    try {
      const page = await listGroupObligations({ groupId, pageSize: 20, ...(append && cursor ? { cursor } : {}) });
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setCursor(page.nextCursor);
      setStatus("ready");
    } catch (cause) {
      const reason = getPaymentErrorReason(cause);
      if (["GROUP_TREASURY_NOT_AUTHORIZED", "GROUP_NOT_ACCESSIBLE", "GROUP_NOT_OPERATIONAL"].includes(reason)) return onAccessLost();
      setError(getPaymentErrorMessage(reason));
      setStatus("error");
    }
  }, [cursor, groupId, onAccessLost]);

  useEffect(() => { queueMicrotask(() => void load(false)); }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
    <div><h2 className="text-xl font-semibold">Deudas · sólo consulta</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Sólo obligaciones con saldo canónico pendiente. Cada página conserva su contexto; no se presenta una deuda total incompleta.</p></div>
    {status === "loading" && !items.length ? <p role="status">Cargando deudas…</p> : null}
    {status === "error" ? <div role="alert"><p>{error}</p><button className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void load(false)}>Reintentar</button></div> : null}
    {status === "ready" && !items.length ? <p className="text-sm text-[var(--text-muted)]">No hay obligaciones pendientes en la página consultada.</p> : null}
    {items.length ? <ul className="divide-y rounded-xl border">{items.map((item) => <li key={item.paymentId} className="p-3 text-sm"><strong>{item.person?.status === "AVAILABLE" ? `${item.person.firstName} ${item.person.lastName}` : "Persona no disponible"}</strong><p>{item.concept.name} · saldo {formatArs(item.balanceMinor)} · vence {item.dueDate}</p><button type="button" className="mt-2 min-h-11 rounded-lg border px-3 font-semibold" onClick={(event) => { trigger.current = event.currentTarget; setDetailPaymentId(item.paymentId); }}>Ver detalle</button></li>)}</ul> : null}
    {cursor ? <button type="button" disabled={status === "loading"} className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void load(true)}>Cargar más deudas</button> : null}
    {detailPaymentId ? <PaymentObligationDetailDialog audience="TREASURY" groupId={groupId} paymentId={detailPaymentId} onClose={() => { setDetailPaymentId(null); queueMicrotask(() => trigger.current?.focus()); }} /> : null}
  </section>;
}
