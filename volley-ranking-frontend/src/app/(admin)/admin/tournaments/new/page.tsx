"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";

import { createTournament } from "@/services/tournaments/tournamentMutations";

type TournamentForm = {
  name: string;
  description: string;
  format: "liga" | "eliminacion" | "mixto";
  minTeams: number;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: number;
  paymentForPlayer: number;
  startDate: string;
  rules: {
    setsToWin: number;
    pointsWin: number;
    pointsDraw: number;
    pointsLose: number;
  };
  structure: {
    groupStage: {
      enabled: boolean;
      groupCount: number;
      rounds: number;
    };
    knockoutStage: {
      enabled: boolean;
      startFrom: "octavos" | "cuartos" | "semi" | "final";
    };
  };
};

export default function NewTournamentPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<TournamentForm>({
    name: "",
    description: "",
    format: "mixto",
    minTeams: 4,
    maxTeams: 12,
    minPlayers: 6,
    maxPlayers: 12,
    paymentForPlayer: 0,
    startDate: "",
    rules: {
      setsToWin: 3,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLose: 0,
    },
    structure: {
      groupStage: {
        enabled: true,
        groupCount: 2,
        rounds: 1,
      },
      knockoutStage: {
        enabled: false,
        startFrom: "semi",
      },
    },
  });

  const isLeague = form.format === "liga";
  const isKnockout = form.format === "eliminacion";
  const isMixed = form.format === "mixto";

  const showStructure = !isKnockout;
  const showKnockoutStart = isMixed;

  const updateFormat = (format: TournamentForm["format"]) => {
    setForm((prev) => ({
      ...prev,
      format,
      structure: {
        groupStage: {
          ...prev.structure.groupStage,
          enabled: format !== "eliminacion",
          groupCount: format === "liga" ? 1 : prev.structure.groupStage.groupCount,
        },
        knockoutStage: {
          ...prev.structure.knockoutStage,
          enabled: format !== "liga",
        },
      },
    }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (form.minTeams > form.maxTeams) {
      showToast({
        type: "error",
        message: "El mínimo de equipos no puede ser mayor al máximo",
      });
      setLoading(false);
      return;
    }

    if (form.minTeams < 4) {
      showToast({
        type: "error",
        message: "Un torneo necesita al menos 4 equipos",
      });
      setLoading(false);
      return;
    }


    if (form.minPlayers > form.maxPlayers) {
      showToast({
        type: "error",
        message: "El mínimo de jugadores no puede ser mayor al máximo",
      });
      setLoading(false);
      return;
    }

    if (!form.startDate) {
      showToast({
        type: "error",
        message: "Debes seleccionar una fecha de inicio",
      });
      setLoading(false);
      return;
    }

    try {
      const result = await createTournament({
        name: form.name,
        description: form.description,
        sport: "voley",
        format: form.format,
        minTeams: Number(form.minTeams),
        maxTeams: Number(form.maxTeams),
        minPlayers: Number(form.minPlayers),
        maxPlayers: Number(form.maxPlayers),
        paymentForPlayer: Number(form.paymentForPlayer),
        startDateMillis: new Date(form.startDate).getTime(),
        rules: {
          setsToWin: Number(form.rules.setsToWin),
          pointsWin: isKnockout ? 0 : Number(form.rules.pointsWin),
          pointsDraw: isKnockout ? 0 : Number(form.rules.pointsDraw),
          pointsLose: isKnockout ? 0 : Number(form.rules.pointsLose),
        },
        structure: {
          groupStage: {
            enabled: !isKnockout,
            ...(isKnockout
              ? {}
              : {
                  groupCount: Number(form.structure.groupStage.groupCount),
                  rounds: Number(form.structure.groupStage.rounds),
                }),
          },
          knockoutStage: {
            enabled: !isLeague,
            ...(!isLeague
              ? { startFrom: form.structure.knockoutStage.startFrom }
              : {}),
          },
        },
      });

      const tournamentId = result.tournamentId;

      showToast({
        type: "success",
        message: "Torneo creado en borrador",
      });

      router.push(`/admin/tournaments/${tournamentId}`);
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo crear el torneo");
    } finally {
      setLoading(false);
    }
  };

  const teams = form.maxTeams;
  const groups = form.structure.groupStage.groupCount;

  const teamsPerGroup =
    groups > 0 ? Math.floor(teams / groups) : 0;

  let knockoutPreview = "";

  switch (form.structure.knockoutStage.startFrom) {
    case "octavos":
      knockoutPreview = "Octavos → Cuartos → Semifinal → Final";
      break;
    case "cuartos":
      knockoutPreview = "Cuartos → Semifinal → Final";
      break;
    case "semi":
      knockoutPreview = "Semifinal → Final";
      break;
    case "final":
      knockoutPreview = "Final";
      break;
  }

  return (
    <main className="max-w-3xl mx-auto mt-6 sm:mt-10 pb-12 space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Mis grupos", href: "/admin/groups" },
          { label: "Torneos", href: "/admin/tournaments" },
          { label: "Nuevo torneo" },
        ]}
      />

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-900">
          Crear torneo
        </h1>
        <p className="text-sm text-neutral-500">
          El torneo inicia en estado draft.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4"
      >

        {/* nombre */}

        <div>
          <label className="text-sm font-medium">Nombre</label>
          <input
            required
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>

        {/* descripcion */}

        <div>
          <label className="text-sm font-medium">Descripción</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </div>

        {/* formato */}

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Formato</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.format}
              onChange={(e) =>
                updateFormat(e.target.value as TournamentForm["format"])
              }
            >
              <option value="liga">Liga</option>
              <option value="eliminacion">Eliminación</option>
              <option value="mixto">Normal</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Mín. equipos</label>
            <input
              type="number"
              min={4}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.minTeams}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  minTeams: Number(e.target.value),
                }))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Máx. equipos</label>
            <input
              type="number"
              min={4}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.maxTeams}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  maxTeams: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Mín. jugadores por equipo</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.minPlayers}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  minPlayers: Number(e.target.value),
                }))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Máx. jugadores por equipo</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.maxPlayers}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  maxPlayers: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>

        {/* Monto pago */}

        <div>
          <label className="text-sm font-medium">
            Pago por jugador
          </label>

          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={form.paymentForPlayer}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                paymentForPlayer: Number(e.target.value),
              }))
            }
          />

          <p className="text-xs text-neutral-500 mt-1">
            Monto que paga cada jugador para participar
          </p>
        </div>

        {/* fecha */}

        <div>
          <label className="text-sm font-medium">Inicio</label>
          <input
            type="datetime-local"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={form.startDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, startDate: e.target.value }))
            }
          />
        </div>

        {/* reglas */}

        <section className="space-y-3 border-t border-neutral-200 pt-4">

          <h2 className="text-sm font-semibold text-neutral-800">Reglas</h2>

          <div>
            <label className="text-sm font-medium">Sets para ganar</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.rules.setsToWin}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  rules: {
                    ...prev.rules,
                    setsToWin: Number(e.target.value),
                  },
                }))
              }
            />
          </div>

          {!isKnockout && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <p className="text-sm">
                  Puntos victoria: <b>{form.rules.pointsWin}</b>
                </p>
              </div>
              <div>
                <p className="text-sm">
                  Puntos empate: <b>{form.rules.pointsDraw}</b>
                </p>
              </div>
              <div>
                <p className="text-sm">
                  Puntos derrota: <b>{form.rules.pointsLose}</b>
                </p>
              </div>
            </div>
          )}
        </section>

        {/* estructura */}

        {showStructure && (
        <section className="space-y-3 border-t border-neutral-200 pt-4">

          <h2 className="text-sm font-semibold text-neutral-800">
            Estructura
          </h2>

          {/* fase de grupos */}

          {!isKnockout && (
            <>
              <div>
                <label className="text-sm font-medium">
                  Cantidad de grupos
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={isLeague}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.structure.groupStage.groupCount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      structure: {
                        ...prev.structure,
                        groupStage: {
                          ...prev.structure.groupStage,
                          groupCount: Number(e.target.value),
                        },
                      },
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Rondas</label>

                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.structure.groupStage.rounds}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      structure: {
                        ...prev.structure,
                        groupStage: {
                          ...prev.structure.groupStage,
                          rounds: Number(e.target.value),
                        },
                      },
                    }))
                  }
                >
                  <option value={1}>Una ronda</option>
                  <option value={2}>Ida y vuelta</option>
                  <option value={3}>Tres rondas</option>
                </select>
              </div>
            </>
          )}

          {/* inicio eliminación SOLO para mixto */}

          {showKnockoutStart && (
            <div>
              <label className="text-sm font-medium">
                Inicio de eliminación
              </label>

              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.structure.knockoutStage.startFrom}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    structure: {
                      ...prev.structure,
                      knockoutStage: {
                        ...prev.structure.knockoutStage,
                        startFrom:
                          e.target.value as TournamentForm["structure"]["knockoutStage"]["startFrom"],
                      },
                    },
                  }))
                }
              >
                <option value="octavos">Octavos</option>
                <option value="cuartos">Cuartos</option>
                <option value="semi">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </div>
          )}

        </section>
        )}

        {/* preview */}

        <section className="border-t border-neutral-200 pt-4">

          <h2 className="text-sm font-semibold text-neutral-800">
            Vista previa
          </h2>

          <div className="mt-2 rounded-lg bg-neutral-50 border p-4 text-sm space-y-1">

            <p>
              <b>Formato:</b> {form.format}
            </p>

            <p>
              <b>Equipos:</b> {form.minTeams} - {form.maxTeams}
            </p>

            <p>
              <b>Jugadores por equipo:</b> {form.minPlayers} - {form.maxPlayers}
            </p>

            <p>
              <b>Pago por jugador:</b> ${form.paymentForPlayer}
            </p>

            {!isKnockout && (
              <p>
                <b>Grupos:</b> {groups} grupos de {teamsPerGroup} equipos
              </p>
            )}

            {!isLeague && (
              <p>
                <b>Eliminación:</b> {knockoutPreview}
              </p>
            )}

            {!isKnockout && (
              <p>
                <b>Rondas fase grupos:</b> {form.structure.groupStage.rounds}
              </p>
            )}

          </div>

        </section>

        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear torneo"}
          </button>

          <Link
            href="/admin/tournaments"
            className="text-sm text-neutral-600 hover:text-neutral-800"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}