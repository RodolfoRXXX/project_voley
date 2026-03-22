import type { FormEvent } from "react";
import { getKnockoutBracketSize, getKnockoutPreview, getKnockoutRoundLabel, type KnockoutStartFrom } from "@/lib/tournaments/knockout";
import type { Tournament } from "@/types/tournaments";

export type TournamentFormValues = {
  name: string;
  description: string;
  format: "liga" | "eliminacion" | "mixto";
  minTeams: number;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  paymentForPlayer: number;
  rules: {
    setsToWin: number;
  };
  structure: {
    groupStage: {
      enabled: boolean;
      groupCount: number;
      rounds: number;
    };
    knockoutStage: {
      enabled: boolean;
      startFrom: KnockoutStartFrom;
      allowByes?: boolean;
    };
  };
};

export function TournamentEditForm({
  values,
  isActiveTournament,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  values: TournamentFormValues;
  isActiveTournament: boolean;
  saving: boolean;
  onChange: (next: TournamentFormValues) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const isLeague = values.format === "liga";
  const isKnockout = values.format === "eliminacion";
  const isMixed = values.format === "mixto";
  const requiredKnockoutTeams = getKnockoutBracketSize(values.structure.knockoutStage.startFrom);
  const knockoutPreview = getKnockoutPreview(values.structure.knockoutStage.startFrom);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <h2 className="text-base font-semibold">Editar torneo</h2>
      {isActiveTournament && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Torneo activo: solo se permiten cambios en pago por jugador, cupos de equipos, máximo de jugadores, sets máximos por partido y configuración estructural todavía pendiente.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium">Nombre</label>
          <input
            value={values.name}
            disabled={isActiveTournament}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Descripción</label>
          <textarea
            value={values.description}
            disabled={isActiveTournament}
            onChange={(e) => onChange({ ...values, description: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Formato</label>
            <select
              value={values.format}
              disabled={isActiveTournament}
              onChange={(e) => {
                const format = e.target.value as TournamentFormValues["format"];
                const nextBracketSize = getKnockoutBracketSize(values.structure.knockoutStage.startFrom);
                onChange({
                  ...values,
                  format,
                  minTeams: format === "eliminacion" ? nextBracketSize : Math.max(values.minTeams, 4),
                  maxTeams: format === "eliminacion" ? nextBracketSize : Math.max(values.maxTeams, 4),
                  structure: {
                    groupStage: {
                      ...values.structure.groupStage,
                      enabled: format !== "eliminacion",
                      groupCount: format === "liga" ? 1 : values.structure.groupStage.groupCount,
                    },
                    knockoutStage: {
                      ...values.structure.knockoutStage,
                      enabled: format !== "liga",
                      allowByes: false,
                    },
                  },
                });
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="liga">Liga</option>
              <option value="eliminacion">Eliminación</option>
              <option value="mixto">Normal</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Min equipos</label>
            <input
              type="number"
              min={isKnockout && values.structure.knockoutStage.startFrom === "final" ? 2 : 4}
              value={values.minTeams}
              onChange={(e) => onChange({ ...values, minTeams: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Max equipos</label>
            <input
              type="number"
              min={isKnockout && values.structure.knockoutStage.startFrom === "final" ? 2 : 4}
              value={values.maxTeams}
              onChange={(e) => onChange({ ...values, maxTeams: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Min jugadores por equipo</label>
            <input
              type="number"
              value={values.minPlayers}
              disabled={isActiveTournament}
              onChange={(e) => onChange({ ...values, minPlayers: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Max jugadores por equipo</label>
            <input
              type="number"
              value={values.maxPlayers}
              onChange={(e) => onChange({ ...values, maxPlayers: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Pago por jugador</label>
            <input
              type="number"
              value={values.paymentForPlayer}
              onChange={(e) => onChange({ ...values, paymentForPlayer: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Sets máximos por partido</label>
            <input
              type="number"
              value={values.rules.setsToWin}
              onChange={(e) =>
                onChange({
                  ...values,
                  rules: {
                    ...values.rules,
                    setsToWin: Number(e.target.value),
                  },
                })
              }
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Se usa como tope de sets permitidos al registrar resultados de cada partido.
            </p>
          </div>
        </div>

        {!isKnockout && (
          <div className={`grid gap-3 ${isLeague ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
            {!isLeague && (
              <div>
                <label className="text-sm font-medium">Cantidad de grupos</label>
                <input
                  type="number"
                  value={values.structure.groupStage.groupCount}
                  onChange={(e) =>
                    onChange({
                      ...values,
                      structure: {
                        ...values.structure,
                        groupStage: {
                          ...values.structure.groupStage,
                          enabled: true,
                          groupCount: Number(e.target.value),
                        },
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Vueltas de liga</label>
              <input
                type="number"
                value={values.structure.groupStage.rounds}
                onChange={(e) =>
                  onChange({
                    ...values,
                    structure: {
                      ...values.structure,
                      groupStage: {
                        ...values.structure.groupStage,
                        rounds: Number(e.target.value),
                      },
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {(isKnockout || isMixed) && (
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <label className="text-sm font-medium">Etapa de eliminación</label>
              <select
                value={values.structure.knockoutStage.startFrom}
                disabled={isActiveTournament}
                onChange={(e) => {
                  const startFrom = e.target.value as TournamentFormValues["structure"]["knockoutStage"]["startFrom"];
                  const nextBracketSize = getKnockoutBracketSize(startFrom);
                  onChange({
                    ...values,
                    minTeams: values.format === "eliminacion" ? nextBracketSize : values.minTeams,
                    maxTeams: values.format === "eliminacion" ? nextBracketSize : values.maxTeams,
                    structure: {
                      ...values.structure,
                      knockoutStage: {
                        enabled: values.format !== "liga",
                        startFrom,
                        allowByes: false,
                      },
                    },
                  });
                }}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="octavos">Octavos</option>
                <option value="cuartos">Cuartos</option>
                <option value="semi">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Cuadro requerido</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{requiredKnockoutTeams} equipos</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Byes</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">No permitidos</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Camino</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{knockoutPreview}</p>
              </div>
            </div>

            {isKnockout && (
              <p className="text-xs text-neutral-500">
                En eliminación directa pura no se permiten grupos ni liga previa: el fixture sólo se puede confirmar cuando el torneo tiene exactamente {requiredKnockoutTeams} equipos aceptados.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button disabled={saving} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-200 dark:text-neutral-900">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>

          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

function formatLabel(format: Tournament["format"]) {
  if (format === "mixto") return "Normal";
  if (format === "eliminacion") return "Eliminación";
  return "Liga";
}

function knockoutLabel(startFrom?: KnockoutStartFrom) {
  return getKnockoutRoundLabel(startFrom);
}

export function TournamentDetailsCard({
  tournament,
  editing,
  canEdit,
  isLockedTournament,
  onEdit,
}: {
  tournament: Tournament;
  editing: boolean;
  canEdit: boolean;
  isLockedTournament: boolean;
  onEdit: () => void;
}) {
  const isLeague = tournament.format === "liga";
  const isNormal = tournament.format === "mixto";
  const isKnockout = tournament.format === "eliminacion";
  const hasGroups = tournament.structure?.groupStage?.enabled && !isLeague;
  const hasKnockout = tournament.structure?.knockoutStage?.enabled;
  const maxTeams = Number(tournament.maxTeams || 0);
  const rounds = Number(tournament.structure?.groupStage?.rounds || 1);
  const estimatedLeagueMatches = isLeague ? Math.max(0, (maxTeams * (maxTeams - 1)) / 2) * rounds : null;
  const estimatedLeagueMatchdays = isLeague ? Math.max(0, (maxTeams % 2 === 0 ? maxTeams - 1 : maxTeams) * rounds) : null;
  const knockoutStartFrom = tournament.structure?.knockoutStage?.startFrom || "semi";
  const knockoutBracketSize = getKnockoutBracketSize(knockoutStartFrom);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-900">Información del torneo</h2>
        {!editing && (
          <button
            onClick={onEdit}
            disabled={!canEdit || isLockedTournament}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Editar
          </button>
        )}
      </div>
      <div className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
        <p>Formato: <b>{formatLabel(tournament.format)}</b></p>
        <p>Deporte: <b>{tournament.sport}</b></p>
        <p>Equipos mínimos: <b>{tournament.minTeams}</b></p>
        <p>Equipos máximos: <b>{tournament.maxTeams}</b></p>
        <p>Equipos aceptados: <b>{tournament.acceptedTeamsCount || 0}</b></p>
        <p>Jugadores mínimos por equipo: <b>{tournament.minPlayers || 1}</b></p>
        <p>Jugadores máximos por equipo: <b>{tournament.maxPlayers || 1}</b></p>
        <p>Admins asignados: <b>{tournament.adminIds?.length || 0}</b></p>
        <p>Sets máximos por partido: <b>{tournament.rules?.setsToWin || "-"}</b></p>
        <p>¿Tiene grupos?: <b>{hasGroups ? "Sí" : "No"}</b></p>
        {hasGroups && (
          <>
            <p>Cantidad de grupos: <b>{tournament.structure?.groupStage?.groupCount || "-"}</b></p>
            <p>Vueltas: <b>{tournament.structure?.groupStage?.rounds || "-"}</b></p>
          </>
        )}
        {(isNormal || isKnockout) && hasKnockout && (
          <>
            <p>Eliminación desde: <b>{knockoutLabel(knockoutStartFrom)}</b></p>
            <p>Tamaño del cuadro: <b>{knockoutBracketSize} equipos</b></p>
            <p>Byes: <b>No permitidos</b></p>
          </>
        )}
        {isLeague && (
          <>
            <p>Tipo de fase: <b>Liga todos contra todos</b></p>
            <p>Vueltas: <b>{rounds}</b></p>
            <p>Partidos estimados: <b>{estimatedLeagueMatches ?? "-"}</b></p>
            <p>Fechas estimadas: <b>{estimatedLeagueMatchdays ?? "-"}</b></p>
          </>
        )}
      </div>
    </section>
  );
}
