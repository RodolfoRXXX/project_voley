"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Tournament } from "@/types/tournament";
import { TournamentMatch } from "@/types/tournamentMatch";
import { getAdminAction } from "@/lib/tournamentAdmin";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";

type TournamentAdminPanelProps = {
  tournament: Tournament;
  onTournamentRefresh: () => Promise<void>;
};

const openRegistrationsFn = httpsCallable(functions, "openTournamentRegistrations");
const closeRegistrationsFn = httpsCallable(functions, "closeTournamentRegistrations");
const previewFixtureFn = httpsCallable(functions, "previewFixture");
const confirmFixtureFn = httpsCallable(functions, "confirmFixture");

export default function TournamentAdminPanel({ tournament, onTournamentRefresh }: TournamentAdminPanelProps) {
  const { showToast } = useToast();

  const [busyAction, setBusyAction] = useState(false);
  const [previewMatches, setPreviewMatches] = useState<TournamentMatch[] | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmingFixture, setConfirmingFixture] = useState(false);

  const action = getAdminAction(tournament);

  const onMainAction = async () => {
    if (!action.nextStatus) return;

    setBusyAction(true);

    try {
      if (action.nextStatus === "inscripciones_abiertas") {
        await openRegistrationsFn({ tournamentId: tournament.id });
      }

      if (action.nextStatus === "inscripciones_cerradas") {
        await closeRegistrationsFn({ tournamentId: tournament.id });
      }

      showToast({ type: "success", message: `${action.label} correctamente` });
      await onTournamentRefresh();
    } catch (error) {
      handleFirebaseError(error, showToast, `No se pudo ejecutar: ${action.label}`);
    } finally {
      setBusyAction(false);
    }
  };

  const onPreviewFixture = async (nextSeed?: number) => {
    setLoadingPreview(true);

    try {
      const response = await previewFixtureFn({
        tournamentId: tournament.id,
        ...(typeof nextSeed === "number" ? { seed: nextSeed } : {}),
      });

      const data = response.data as { seed: number; matches: TournamentMatch[] };
      setSeed(data.seed);
      setPreviewMatches(data.matches);
      showToast({ type: "success", message: "Fixture generado en memoria" });
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo generar el fixture");
    } finally {
      setLoadingPreview(false);
    }
  };

  const onRegenerate = async () => {
    await onPreviewFixture(Math.floor(Math.random() * 1000000000));
  };

  const onConfirmFixture = async () => {
    if (!previewMatches || previewMatches.length === 0) return;

    setConfirmingFixture(true);

    try {
      await confirmFixtureFn({
        tournamentId: tournament.id,
        matches: previewMatches,
      });

      showToast({ type: "success", message: "Fixture confirmado" });
      setPreviewMatches(null);
      setSeed(null);
      await onTournamentRefresh();
    } catch (error) {
      handleFirebaseError(error, showToast, "No se pudo confirmar el fixture");
    } finally {
      setConfirmingFixture(false);
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      {action.nextStatus && (
        <div className="flex justify-end">
          <button
            onClick={onMainAction}
            disabled={busyAction || action.disabled}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white disabled:opacity-60"
          >
            {busyAction ? "Procesando..." : action.label}
          </button>
        </div>
      )}

      {tournament.status === "inscripciones_cerradas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-neutral-900">Encuentros deportivos</h2>
            <div className="flex gap-2">
              <button
                onClick={() => onPreviewFixture()}
                disabled={loadingPreview}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-neutral-300 disabled:opacity-60"
              >
                {loadingPreview ? "Generando..." : "Generar fixture"}
              </button>
              <button
                onClick={onRegenerate}
                disabled={loadingPreview}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-neutral-300 disabled:opacity-60"
              >
                Regenerar
              </button>
              <button
                onClick={onConfirmFixture}
                disabled={confirmingFixture || !previewMatches || previewMatches.length === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white disabled:opacity-60"
              >
                {confirmingFixture ? "Confirmando..." : "Confirmar fixture"}
              </button>
            </div>
          </div>

          <div className="text-sm text-neutral-600">
            <p>Seed actual: <b>{seed ?? "-"}</b></p>
            <p>Partidos en previsualización: <b>{previewMatches?.length || 0}</b></p>
          </div>
        </div>
      )}
    </section>
  );
}
