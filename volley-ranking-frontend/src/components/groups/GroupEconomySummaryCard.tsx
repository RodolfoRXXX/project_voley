"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatArs, getOwnerGroupEconomySummary, type OwnerGroupEconomySummary } from "@/services/paymentsService";

export function GroupEconomySummaryCard({ groupId }: { groupId: string }) {
  const [summary, setSummary] = useState<OwnerGroupEconomySummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSummary(null);
      setStatus("loading");
    });
    void getOwnerGroupEconomySummary(groupId).then((result) => {
      if (!active) return;
      setSummary(result);
      setStatus("ready");
    }, () => {
      if (active) setStatus("error");
    });
    return () => { active = false; };
  }, [groupId]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="group-economy-summary-title">
      <h2 id="group-economy-summary-title" className="text-xl font-semibold">Economía</h2>
      {status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Calculando resumen económico…</p> : null}
      {status === "ready" && summary ? <dl className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <div><dt className="text-xs text-[var(--text-muted)]">Saldo pendiente</dt><dd className="font-semibold">{formatArs(summary.pendingBalanceMinor)}</dd></div>
        <div><dt className="text-xs text-[var(--text-muted)]">Obligaciones con saldo</dt><dd className="font-semibold">{summary.pendingObligationCount}</dd></div>
        <div><dt className="text-xs text-[var(--text-muted)]">Entregas por revisar</dt><dd className="font-semibold">{summary.pendingNoticeCount}</dd></div>
      </dl> : null}
      {status === "error" ? <p className="mt-3 text-sm text-red-700" role="alert">No pudimos obtener el resumen exacto. Abrí Economía para consultar sus secciones.</p> : null}
      <p className="mt-3 text-xs text-[var(--text-muted)]">Los pagos informados pendientes no reducen el saldo.</p>
      <Link href={`/dashboard/groups/${groupId}/economy`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Abrir economía</Link>
    </section>
  );
}
