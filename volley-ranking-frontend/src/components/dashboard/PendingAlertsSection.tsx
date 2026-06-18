"use client";

import Link from "next/link";
import type { PendingAlert } from "@/types/pendingAlerts";
import { pendingAlertSeverityLabel } from "@/types/pendingAlerts";
import { Spinner } from "@/components/ui/spinner/spinner";

type PendingAlertsSectionProps = {
  loading: boolean;
  alerts: PendingAlert[];
  onDismissAlert?: (alertId: string) => void;
  dismissLoadingAlertId?: string | null;
};

const stylesBySeverity: Record<PendingAlert["severity"], string> = {
  urgent: "border-red-300 bg-red-50/80 text-red-900",
  warning: "border-amber-300 bg-amber-50/80 text-amber-900",
  info: "border-sky-300 bg-sky-50/80 text-sky-900",
};

export default function PendingAlertsSection({ loading, alerts, onDismissAlert, dismissLoadingAlertId }: PendingAlertsSectionProps) {
  return (
    <section className="space-y-3">
      {/*<header>
        <h2 className="text-2xl font-bold">Pendientes</h2>
        <p className="text-sm text-neutral-600">Acciones sugeridas para mantener tus grupos y torneos al día.</p>
      </header>*/}

      {loading && <p className="text-sm text-neutral-500">Cargando pendientes...</p>}

      {!loading && alerts.length === 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          No tenés pendientes por ahora.
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <article key={alert.id} className={`relative rounded-md border px-4 py-3 ${stylesBySeverity[alert.severity]}`}>
            {alert.kind !== "complete_profile" && onDismissAlert && (
              <button
                type="button"
                onClick={() => onDismissAlert(alert.id)}
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed"
                aria-label={`Cerrar alerta ${alert.title}`}
                disabled={dismissLoadingAlertId === alert.id}
              >
                {dismissLoadingAlertId === alert.id ? (
                  <Spinner size="sm" className="text-neutral-600" />
                ) : (
                  "×"
                )}
              </button>
            )}

            <div className="space-y-1 pr-10">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {pendingAlertSeverityLabel[alert.severity]}
              </p>
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-xs opacity-90">{alert.message}</p>
            </div>

            {alert.link?.path && (
              <div className="mt-2 flex justify-end">
                <Link
                  href={alert.link.path}
                  className={`inline-flex items-center gap-1 rounded-none border-0 bg-transparent px-0 py-0 text-xs font-semibold no-underline transition ${
                    alert.severity === "urgent"
                      ? "text-red-800"
                      : alert.severity === "warning"
                      ? "text-amber-800"
                      : "text-sky-800"
                  } hover:opacity-80`}
                >
                  {alert.link.label || "Ver"}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
