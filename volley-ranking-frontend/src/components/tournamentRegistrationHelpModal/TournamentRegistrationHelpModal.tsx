"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserManagedGroups } from "@/services/tournaments/tournamentQueries";
import type { Tournament } from "@/types/tournaments";

type CheckStatus = "pending" | "loading" | "success" | "fail";

type RegistrationCheck = {
  title: string;
  description: string;
};

type TournamentRegistrationHelpModalProps = {
  open: boolean;
  onClose: () => void;
  tournament: Tournament;
};

const STEP_DELAY_MS = 450;

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function CheckIcon({ status }: { status: CheckStatus }) {
  if (status === "loading") {
    return (
      <span
        aria-label="Verificando"
        className="h-5 w-5 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin"
      />
    );
  }

  if (status === "success") {
    return (
      <span aria-label="Cumplido" className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
        ✓
      </span>
    );
  }

  if (status === "fail") {
    return (
      <span aria-label="No cumplido" className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
        ×
      </span>
    );
  }

  return <span className="h-6 w-6 rounded-full border border-neutral-200 bg-neutral-50" />;
}

export default function TournamentRegistrationHelpModal({
  open,
  onClose,
  tournament,
}: TournamentRegistrationHelpModalProps) {
  const { firebaseUser, userDoc, loading: authLoading } = useAuth();
  const minPlayers = Number(tournament.minPlayers || tournament.settings?.minPlayers || 1);

  const checks = useMemo<RegistrationCheck[]>(() => [
    {
      title: "Ser usuario administrador",
      description: "Tu cuenta debe tener permisos de administrador para solicitar inscripciones a torneos.",
    },
    {
      title: "Tener grupos creados",
      description: "Necesitás administrar al menos un grupo para elegirlo como equipo del torneo.",
    },
    {
      title: `Tener un grupo con ${minPlayers} ${minPlayers === 1 ? "jugador" : "jugadores"} o más`,
      description: "Al menos uno de tus grupos debe cumplir con la cantidad mínima de jugadores requerida.",
    },
  ], [minPlayers]);

  const [statuses, setStatuses] = useState<CheckStatus[]>(() => checks.map(() => "pending"));
  const [visibleCount, setVisibleCount] = useState(0);
  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState<"success" | "fail" | null>(null);

  useEffect(() => {
    if (!open || authLoading) return;

    let cancelled = false;

    const markStatus = (index: number, status: CheckStatus) => {
      if (cancelled) return;
      setVisibleCount(index + 1);
      setStatuses((current) => current.map((item, itemIndex) => (itemIndex === index ? status : item)));
    };

    const fail = (index: number, message: string) => {
      if (cancelled) return;
      markStatus(index, "fail");
      setResultType("fail");
      setResultMessage(message);
    };

    const runChecks = async () => {
      setStatuses(checks.map(() => "pending"));
      setVisibleCount(0);
      setResultMessage("");
      setResultType(null);

      await sleep(STEP_DELAY_MS);

      markStatus(0, "loading");
      await sleep(STEP_DELAY_MS);

      if (!firebaseUser || userDoc?.roles !== "admin") {
        fail(0, "No podés inscribir un equipo porque tu usuario no tiene rol de administrador.");
        return;
      }

      markStatus(0, "success");
      await sleep(STEP_DELAY_MS);

      markStatus(1, "loading");
      await sleep(STEP_DELAY_MS);

      let groups: Awaited<ReturnType<typeof getUserManagedGroups>> = [];

      try {
        groups = await getUserManagedGroups(firebaseUser.uid);
      } catch {
        fail(1, "No pudimos verificar tus grupos creados. Intentá nuevamente en unos instantes.");
        return;
      }

      if (groups.length === 0) {
        fail(1, "No podés inscribir un equipo porque todavía no administrás ningún grupo.");
        return;
      }

      markStatus(1, "success");
      await sleep(STEP_DELAY_MS);

      markStatus(2, "loading");
      await sleep(STEP_DELAY_MS);

      const eligibleGroup = groups.find((group) => {
        const memberCount = Array.isArray(group.memberIds) ? group.memberIds.length : 0;
        return memberCount >= minPlayers;
      });

      if (!eligibleGroup) {
        fail(2, `No podés inscribir un equipo porque ninguno de tus grupos llega al mínimo de ${minPlayers} ${minPlayers === 1 ? "jugador" : "jugadores"}.`);
        return;
      }

      if (cancelled) return;
      markStatus(2, "success");
      setResultType("success");
      setResultMessage("Cumplís con todas las condiciones para inscribir a tu equipo en este torneo.");
    };

    runChecks();

    return () => {
      cancelled = true;
    };
  }, [authLoading, checks, firebaseUser, minPlayers, open, userDoc?.roles]);

  if (!open) return null;

  const visibleChecks = checks.slice(0, visibleCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              ¿Cómo me inscribo?
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Verificamos las condiciones necesarias para inscribir a tu equipo en {tournament.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/60">
          {authLoading && visibleChecks.length === 0 ? (
            <div className="flex items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span>Preparando verificación de tu usuario...</span>
              <CheckIcon status="loading" />
            </div>
          ) : null}

          {!authLoading && visibleChecks.length === 0 ? (
            <div className="flex items-center justify-between gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span>Iniciando verificación...</span>
              <CheckIcon status="loading" />
            </div>
          ) : null}

          <ul className="space-y-3">
            {visibleChecks.map((check, index) => (
              <li key={check.title} className="flex items-start justify-between gap-3 rounded-lg border border-white bg-white px-3 py-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {check.title}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {check.description}
                  </p>
                </div>

                <CheckIcon status={statuses[index]} />
              </li>
            ))}
          </ul>
        </div>

        {resultMessage ? (
          <div className={`rounded-xl border p-4 text-sm ${resultType === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {resultMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
