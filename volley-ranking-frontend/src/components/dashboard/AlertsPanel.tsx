"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PendingAlert, PendingAlertSeverity } from "@/types/pendingAlerts";
import { pendingAlertPriority, pendingAlertSeverityLabel } from "@/types/pendingAlerts";
import { Spinner } from "@/components/ui/spinner/spinner";

type AlertsPanelProps = {
  loading: boolean;
  alerts: PendingAlert[];
  onDismissAlert?: (alertId: string) => void | Promise<void>;
  dismissLoadingAlertId?: string | null;
};

type FilterValue = PendingAlertSeverity | null;

const severityOrder: PendingAlertSeverity[] = ["urgent", "warning", "info"];

const severityStyles: Record<
  PendingAlertSeverity,
  { dot: string; ring: string; text: string; soft: string; border: string }
> = {
  urgent: {
    dot: "bg-red-500",
    ring: "ring-red-200",
    text: "text-red-900",
    soft: "bg-red-50/90",
    border: "border-red-200/80",
  },
  warning: {
    dot: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-900",
    soft: "bg-amber-50/90",
    border: "border-amber-200/80",
  },
  info: {
    dot: "bg-sky-500",
    ring: "ring-sky-200",
    text: "text-sky-900",
    soft: "bg-sky-50/90",
    border: "border-sky-200/80",
  },
};

const filterLabels: Record<PendingAlertSeverity, string> = {
  urgent: "Urgente",
  warning: "Advertencias",
  info: "Información",
};

function sortAlerts(alerts: PendingAlert[]) {
  return [...alerts].sort((a, b) => {
    const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    if (severityDiff !== 0) return severityDiff;

    const aPriority = a.priority ?? pendingAlertPriority[a.severity];
    const bPriority = b.priority ?? pendingAlertPriority[b.severity];
    return aPriority - bPriority;
  });
}

function AlertsFilterBar({
  activeFilter,
  counts,
  onChange,
}: {
  activeFilter: PendingAlertSeverity | null;
  counts: Record<PendingAlertSeverity, number>;
  onChange: (filter: PendingAlertSeverity | null) => void;
}) {
  const filters: PendingAlertSeverity[] = [
    "urgent",
    "warning",
    "info",
  ];

  return (
    <div className="flex flex-wrap items-center gap-5 text-sm">
      {filters.map((filter) => {
        const active = activeFilter === filter;

        const style = severityStyles[filter];

        return (
          <button
            key={filter}
            type="button"
            onClick={() =>
              onChange(active ? null : filter)
            }
            className={`
              inline-flex items-center gap-2
              transition-colors
              ${
                active
                  ? `${style.text} font-medium`
                  : "text-neutral-500 hover:text-neutral-700"
              }
            `}
          >
            <span
              className={`
                h-2 w-2 rounded-full
                ${
                  active
                    ? style.dot
                    : "bg-neutral-300"
                }
              `}
            />

            <span>
              {filterLabels[filter]}
            </span>

            <span className="text-xs">
              {counts[filter]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AlertCard({
  alert,
  onDismissAlert,
  dismissLoadingAlertId,
}: {
  alert: PendingAlert;
  onDismissAlert?: (alertId: string) => void | Promise<void>;
  dismissLoadingAlertId?: string | null;
}) {
  const [confirmDismissAlertId, setConfirmDismissAlertId] = useState<string | null>(null);

  const handleConfirmDismiss = async (alertId: string) => {
    if (!onDismissAlert || dismissLoadingAlertId) return;

    try {
      await onDismissAlert(alertId);
    } finally {
      setConfirmDismissAlertId(null);
    }
  };

  const isConfirmingDismiss = confirmDismissAlertId === alert.id;
  const isDismissing = dismissLoadingAlertId === alert.id;
  const severityStyle = severityStyles[alert.severity];

  return (
    <article
      className={`rounded-lg border px-3.5 py-3 transition-all duration-300 ${severityStyle.border} ${severityStyle.soft}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${severityStyle.dot}`} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
              {pendingAlertSeverityLabel[alert.severity]}
            </p>
          </div>
          <p className={`text-sm font-semibold ${severityStyle.text}`}>{alert.title}</p>
        </div>

        {alert.kind !== "complete_profile" && onDismissAlert && (
          isConfirmingDismiss ? (
            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs">
              <span className="text-neutral-600">¿Eliminar?</span>
              <button
                type="button"
                onClick={() => handleConfirmDismiss(alert.id)}
                disabled={isDismissing}
                className="font-semibold text-emerald-700 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-emerald-500"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setConfirmDismissAlertId(null)}
                disabled={isDismissing}
                className="font-semibold text-neutral-600 transition hover:text-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-400"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDismissAlertId(alert.id)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-neutral-600 transition hover:bg-white/70 hover:text-neutral-900 disabled:cursor-not-allowed"
              aria-label={`Cerrar alerta ${alert.title}`}
              disabled={isDismissing}
            >
              {isDismissing ? (
                <Spinner size="sm" className="text-neutral-700" />
              ) : (
                <span aria-hidden="true">×</span>
              )}
            </button>
          )
        )}
      </div>

      {alert.message ? <p className="mt-2 text-sm text-neutral-700">{alert.message}</p> : null}

      {alert.link?.path ? (
        <div className="mt-3 flex justify-end">
          <Link
            href={alert.link.path}
            className={`inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80 ${severityStyle.text}`}
          >
            {alert.link.label || "Ver"}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default function AlertsPanel({
  loading,
  alerts,
  onDismissAlert,
  dismissLoadingAlertId,
}: AlertsPanelProps) {
  const [activeFilter, setActiveFilter] =
  useState<PendingAlertSeverity | null>(null);

  const counts = useMemo(() => {
    const nextCounts: Record<PendingAlertSeverity, number> = {
    urgent: 0,
    warning: 0,
    info: 0,
    };

    alerts.forEach((alert) => {
      nextCounts[alert.severity] += 1;
    });

    return nextCounts;
  }, [alerts]);

  const visibleAlerts = useMemo(() => {
    if (!activeFilter) return [];

    return sortAlerts(
        alerts.filter(
        (alert) =>
            alert.severity === activeFilter
        )
    );
    }, [alerts, activeFilter]);

  return (
    <section className="space-y-4">
        <AlertsFilterBar
        activeFilter={activeFilter}
        counts={counts}
        onChange={setActiveFilter}
        />

        {loading ? (
        <p className="text-sm text-neutral-500">
            Cargando pendientes...
        </p>
        ) : alerts.length === 0 ? (
        <p className="text-sm text-neutral-500">
            No tenés acciones pendientes.
        </p>
        ) : activeFilter === null ? (
        <p className="text-sm text-neutral-500">
            Seleccioná un tipo de alerta para visualizarla.
        </p>
        ) : visibleAlerts.length === 0 ? (
        <p className="text-sm text-neutral-500">
            No hay alertas de este tipo.
        </p>
        ) : (
        <div className="space-y-2">
            {visibleAlerts.map((alert) => (
            <AlertCard
                key={alert.id}
                alert={alert}
                onDismissAlert={onDismissAlert}
                dismissLoadingAlertId={dismissLoadingAlertId}
            />
            ))}
        </div>
        )}
    </section>
    );
}
