"use client";

import { useState } from "react";
import Link from "next/link";
import type { PendingAlert } from "@/types/pendingAlerts";
import { pendingAlertSeverityLabel } from "@/types/pendingAlerts";
import { Spinner } from "@/components/ui/spinner/spinner";

type PendingAlertsSectionProps = {
  loading: boolean;
  alerts: PendingAlert[];
  onDismissAlert?: (alertId: string) => void | Promise<void>;
  dismissLoadingAlertId?: string | null;
};

const stylesBySeverity: Record<PendingAlert["severity"], string> = {
  urgent: "border-red-300 bg-red-50/80 text-red-900",
  warning: "border-amber-300 bg-amber-50/80 text-amber-900",
  info: "border-sky-300 bg-sky-50/80 text-sky-900",
};

export default function PendingAlertsSection({
  loading,
  alerts,
  onDismissAlert,
  dismissLoadingAlertId,
}: PendingAlertsSectionProps) {
  const [confirmDismissAlertId, setConfirmDismissAlertId] = useState<string | null>(null);

  const handleConfirmDismiss = async (alertId: string) => {
    if (!onDismissAlert || dismissLoadingAlertId) return;

    try {
      await onDismissAlert(alertId);
    } finally {
      setConfirmDismissAlertId(null);
    }
  };

  return (
    <section className="space-y-3">

      {loading && <p className="text-sm text-neutral-500">Cargando pendientes...</p>}

      {!loading && alerts.length === 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          No ten&eacute;s pendientes por ahora.
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => {
          const isConfirmingDismiss = confirmDismissAlertId === alert.id;
          const isDismissing = dismissLoadingAlertId === alert.id;

          return (
            <article key={alert.id} className={`rounded-md border px-4 py-3 ${stylesBySeverity[alert.severity]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                    {pendingAlertSeverityLabel[alert.severity]}
                  </p>
                  <p className="text-sm font-semibold">{alert.title}</p>
                </div>

                {alert.kind !== "complete_profile" && onDismissAlert && (
                  isConfirmingDismiss ? (
                    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs">
                      <span className="text-neutral-700 dark:text-neutral-700">&iquest;Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => handleConfirmDismiss(alert.id)}
                        disabled={isDismissing}
                        className="font-medium text-green-700 hover:text-green-800 disabled:cursor-not-allowed disabled:text-green-500 dark:text-green-700 dark:hover:text-green-800"
                      >
                        S&iacute;
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDismissAlertId(null)}
                        disabled={isDismissing}
                        className="font-medium text-neutral-700 hover:text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-500 dark:text-neutral-700 dark:hover:text-neutral-900"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDismissAlertId(alert.id)}
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-neutral-700 hover:text-neutral-900 disabled:cursor-not-allowed dark:text-neutral-700 dark:hover:text-neutral-900"
                      aria-label={`Cerrar alerta ${alert.title}`}
                      disabled={isDismissing}
                    >
                      {isDismissing ? (
                        <Spinner size="sm" className="text-neutral-700 dark:text-neutral-700" />
                      ) : (
                        <span aria-hidden="true">&times;</span>
                      )}
                    </button>
                  )
                )}
              </div>

              <p className="mt-2 text-xs opacity-90">{alert.message}</p>

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
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
