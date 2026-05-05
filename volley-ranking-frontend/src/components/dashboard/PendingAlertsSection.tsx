"use client";

import Link from "next/link";
import type { PendingAlert } from "@/types/pendingAlerts";
import { pendingAlertSeverityLabel } from "@/types/pendingAlerts";

type PendingAlertsSectionProps = {
  loading: boolean;
  alerts: PendingAlert[];
};

const stylesBySeverity: Record<PendingAlert["severity"], string> = {
  urgent: "border-red-300 bg-red-50/80 text-red-900",
  warning: "border-amber-300 bg-amber-50/80 text-amber-900",
  info: "border-sky-300 bg-sky-50/80 text-sky-900",
};

export default function PendingAlertsSection({ loading, alerts }: PendingAlertsSectionProps) {
  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-2xl font-bold">Pendientes</h2>
        <p className="text-sm text-neutral-600">Acciones sugeridas para mantener tus grupos y torneos al día.</p>
      </header>

      {loading && <p className="text-sm text-neutral-500">Cargando pendientes...</p>}

      {!loading && alerts.length === 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          No tenés pendientes por ahora.
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className={`rounded-2xl border px-4 py-3 ${stylesBySeverity[alert.severity]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {pendingAlertSeverityLabel[alert.severity]}
                </p>
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="text-xs opacity-90">{alert.message}</p>
              </div>

              {alert.link?.path && (
                <Link
                  href={alert.link.path}
                  className="shrink-0 inline-flex items-center justify-center rounded-lg bg-black/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                >
                  {alert.link.label || "Ver"}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
