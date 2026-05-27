"use client";

import type { PendingAlert, PendingAlertSeverity } from "@/types/pendingAlerts";
import { pendingAlertSeverityLabel } from "@/types/pendingAlerts";

type Props = {
  alerts: PendingAlert[];
};

const severityOrder: PendingAlertSeverity[] = ["urgent", "warning", "info"];

const severityStyles: Record<PendingAlertSeverity, string> = {
  urgent: "border-red-300 bg-red-50/80 text-red-900",
  warning: "border-amber-300 bg-amber-50/80 text-amber-900",
  info: "border-sky-300 bg-sky-50/80 text-sky-900",
};

export default function AdminResourcePendingAlerts({ alerts }: Props) {
  if (alerts.length === 0) return null;

  const grouped = severityOrder
    .map((severity) => ({
      severity,
      alerts: alerts.filter((alert) => alert.severity === severity),
    }))
    .filter((entry) => entry.alerts.length > 0);

  return (
    <section className="space-y-3" aria-label="Alertas pendientes del recurso">
      {grouped.map(({ severity, alerts: alertsBySeverity }) => (
        <article
          key={severity}
          className={`rounded-2xl border px-4 py-3 ${severityStyles[severity]}`}
        >
          <p className="text-sm font-semibold">
            {pendingAlertSeverityLabel[severity]}: tenés acciones pendientes
          </p>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {alertsBySeverity.map((alert) => (
              <li key={alert.id}>
                {alert.title}
                {alert.message ? ` — ${alert.message}` : ""}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
