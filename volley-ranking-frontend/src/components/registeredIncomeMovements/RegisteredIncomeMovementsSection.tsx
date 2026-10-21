"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { formatArs } from "@/services/paymentsService";
import {
  listGroupRegisteredIncomeMovements,
  registeredIncomeMovementErrorMessage,
  registeredIncomeMovementErrorReason,
  type RegisteredIncomeMovementQuery,
} from "@/services/registeredIncomeMovementsService";
import type { RegisteredIncomeMovementResponse } from "@/types/RegisteredIncomeMovement";
import { createLatestRequestGate, visibleMovementRows } from "./registeredIncomeMovementView.mjs";

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const civilToday = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());
const initialRange = () => {
  const month = civilToday().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { from: `${month}-01`, to };
};
const dateTime = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE, dateStyle: "short", timeStyle: "medium",
});
const observeFirebaseSignedOut = (callback: () => void) => {
  let initialized = false;
  let accountId: string | null = null;
  return onAuthStateChanged(auth, (user) => {
    const nextAccountId = user?.uid ?? null;
    if (!initialized) {
      initialized = true;
      accountId = nextAccountId;
      if (!nextAccountId) callback();
      return;
    }
    if (nextAccountId !== accountId) callback();
    accountId = nextAccountId;
  });
};

export function RegisteredIncomeMovementsSection({ groupId, onAccessLost,
  loadMovements = listGroupRegisteredIncomeMovements,
  observeSignedOut = observeFirebaseSignedOut,
}: {
  groupId: string;
  onAccessLost: () => void;
  loadMovements?: typeof listGroupRegisteredIncomeMovements;
  observeSignedOut?: (callback: () => void) => () => void;
}) {
  const [draft, setDraft] = useState(initialRange);
  const [applied, setApplied] = useState(initialRange);
  const [response, setResponse] = useState<RegisteredIncomeMovementResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState<20 | 50>(20);
  const [page, setPage] = useState(1);
  const gate = useRef(createLatestRequestGate());
  const statusRef = useRef<HTMLDivElement>(null);

  const clear = useCallback(() => {
    gate.current.invalidate(groupId);
    setResponse(null);
    setPage(1);
  }, [groupId]);

  const load = useCallback(async (range: { from: string; to: string }) => {
    const query: RegisteredIncomeMovementQuery = { groupId, ...range };
    const token = gate.current.begin(`${groupId}:${range.from}:${range.to}`);
    setStatus("loading");
    setError("");
    try {
      const next = await loadMovements(query);
      if (!gate.current.isCurrent(token)) return;
      setResponse(next);
      setPage(1);
      setStatus("ready");
      queueMicrotask(() => statusRef.current?.focus());
    } catch (cause) {
      if (!gate.current.isCurrent(token)) return;
      const reason = registeredIncomeMovementErrorReason(cause);
      setResponse(null);
      setPage(1);
      if (["GROUP_NOT_ACCESSIBLE", "GROUP_TREASURY_NOT_AUTHORIZED", "UNAUTHENTICATED"].includes(reason)) {
        gate.current.invalidate(groupId);
        onAccessLost();
        return;
      }
      setError(registeredIncomeMovementErrorMessage(reason));
      setStatus("error");
      queueMicrotask(() => statusRef.current?.focus());
    }
  }, [groupId, loadMovements, onAccessLost]);

  useEffect(() => {
    const range = initialRange();
    const requestGate = gate.current;
    let active = true;
    queueMicrotask(() => { if (active) void load(range); });
    return () => { active = false; requestGate.invalidate(); };
  }, [load]);

  useEffect(() => observeSignedOut(clear), [clear, observeSignedOut]);

  const visible = useMemo(() => visibleMovementRows(response?.items ?? [], page, pageSize),
    [page, pageSize, response]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setApplied(draft);
    void load(draft);
  }

  return <section aria-labelledby="registered-income-title" className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="registered-income-title" className="text-xl font-semibold">Movimientos de ingresos registrados</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Ingresos y reversiones registrales · ARS · fechas de Buenos Aires. El neto no es saldo de caja.</p></div>{response ? <button type="button" disabled={status === "loading"} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50" onClick={() => void load(applied)}>Actualizar</button> : null}</div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={submit}><label className="text-sm">Desde<input required type="date" value={draft.from} onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))} className="mt-1 block rounded-lg border p-2" /></label><label className="text-sm">Hasta<input required type="date" value={draft.to} onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} className="mt-1 block rounded-lg border p-2" /></label><button type="submit" disabled={status === "loading"} className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Consultar</button></form>
    <div ref={statusRef} tabIndex={-1} aria-live="polite">
      {status === "loading" ? <p role="status">Consultando el conjunto completo…</p> : null}
      {status === "error" ? <div role="alert"><p className="text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => void load(applied)}>Reintentar</button></div> : null}
      {status === "ready" && response ? <p className="text-sm text-[var(--text-muted)]">Actualizado al corte {dateTime.format(new Date(response.view.readCutoffExclusive))}. Refresh reemplaza filas y totales conjuntamente.</p> : null}
    </div>
    {status === "ready" && response ? <>
      <dl className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><dt className="text-sm text-[var(--text-muted)]">Ingresos registrados</dt><dd className="text-lg font-semibold">{formatArs(response.totals.grossRecordedIncomeMinor)}</dd></div><div className="rounded-xl border p-3"><dt className="text-sm text-[var(--text-muted)]">Registros revertidos</dt><dd className="text-lg font-semibold">{formatArs(response.totals.reversedRecordsMinor)}</dd></div><div className="rounded-xl border p-3"><dt className="text-sm text-[var(--text-muted)]">Ingreso neto registrado</dt><dd className="text-lg font-semibold">{formatArs(response.totals.netRegisteredIncomeMinor)}</dd></div></dl>
      {response.items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No hay movimientos registrados en el rango.</p> : <><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{response.totals.movementCount} movimientos · página {visible.page} de {visible.pageCount}</p><label className="text-sm">Filas por página <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as 20 | 50); setPage(1); }} className="ml-2 rounded border p-2"><option value="20">20</option><option value="50">50</option></select></label></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Fecha registral</th><th className="p-2">Movimiento</th><th className="p-2">Persona</th><th className="p-2">Origen</th><th className="p-2 text-right">Importe</th></tr></thead><tbody>{visible.rows.map((item) => <tr key={item.movementId} className="border-t"><td className="p-2">{dateTime.format(new Date(item.eventAt))}</td><td className="p-2">{item.kind === "INCOME_RECORDED" ? "Ingreso registrado" : "Reversión de registro"}<span className="block text-xs text-[var(--text-muted)]">Fecha efectiva informativa: {item.effectiveOn}</span></td><td className="p-2">{item.subject.status === "AVAILABLE" ? `${item.subject.firstName} ${item.subject.lastName}` : "Persona no disponible"}</td><td className="p-2">{item.origin === "INFORMED" ? "Informado" : "Administrativo"}</td><td className="p-2 text-right">{item.kind === "RECORD_REVERSAL" ? "−" : "+"}{formatArs(item.amountMinor)}</td></tr>)}</tbody></table></div><div className="flex items-center justify-end gap-2"><button type="button" disabled={visible.page <= 1} className="min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50" onClick={() => setPage((value) => value - 1)}>Anterior</button><button type="button" disabled={visible.page >= visible.pageCount} className="min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50" onClick={() => setPage((value) => value + 1)}>Siguiente</button></div></>}
    </> : null}
  </section>;
}
