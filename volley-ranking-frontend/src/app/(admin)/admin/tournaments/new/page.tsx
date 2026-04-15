"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { Spinner } from "@/components/ui/spinner/spinner";

import { createTournament } from "@/services/tournaments/tournamentMutations";
import { getKnockoutBracketSize, getKnockoutPreview, type KnockoutStartFrom } from "@/lib/tournaments/knockout";
import { getMixedConfigurationMessage, getMixedQualificationSummary } from "@/lib/tournaments/mixed";

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
      qualifyPerGroup: number;
      wildcardsCount: number;
      seedingCriteria: "points" | "group_position" | "setsDiff" | "pointsDiff";
      crossGroupSeeding: boolean;
      bracketMatchup: "standard_seeded" | "1A_vs_2B";
    };
    knockoutStage: {
      enabled: boolean;
      startFrom: KnockoutStartFrom;
      allowByes?: boolean;
    };
  };
};

export default function NewTournamentPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

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
        qualifyPerGroup: 2,
        wildcardsCount: 0,
        seedingCriteria: "points",
        crossGroupSeeding: true,
        bracketMatchup: "1A_vs_2B",
      },
      knockoutStage: {
        enabled: false,
        startFrom: "semi",
        allowByes: true,
      },
    },
  });

  const isLeague = form.format === "liga";
  const isKnockout = form.format === "eliminacion";
  const isMixed = form.format === "mixto";
  const requiredKnockoutTeams = getKnockoutBracketSize(form.structure.knockoutStage.startFrom);
  const minAllowedTeams = isKnockout && form.structure.knockoutStage.startFrom === "final" ? 2 : 4;

  const normalizeMixedSettings = (next: TournamentForm, isAdvanced: boolean): TournamentForm => {
    if (next.format !== "mixto") return next;

    const requiredQualified = getKnockoutBracketSize(next.structure.knockoutStage.startFrom);
    const automaticQualified = Math.max(1, Number(next.structure.groupStage.groupCount || 1))
      * Math.max(1, Number(next.structure.groupStage.qualifyPerGroup || 1));
    const missingSlots = Math.max(0, requiredQualified - automaticQualified);

    const normalizedWildcards = isAdvanced
      ? Math.max(0, Number(next.structure.groupStage.wildcardsCount || 0))
      : missingSlots;

    const normalizedBracketMatchup = isAdvanced
      ? next.structure.groupStage.bracketMatchup
      : next.structure.groupStage.qualifyPerGroup === 2 && normalizedWildcards === 0
        ? next.structure.groupStage.bracketMatchup
        : "standard_seeded";

    const normalizedSeedingCriteria = isAdvanced ? next.structure.groupStage.seedingCriteria : "points";
    const normalizedCrossGroupSeeding = isAdvanced ? next.structure.groupStage.crossGroupSeeding : true;

    return {
      ...next,
      structure: {
        ...next.structure,
        groupStage: {
          ...next.structure.groupStage,
          wildcardsCount: normalizedWildcards,
          seedingCriteria: normalizedSeedingCriteria,
          crossGroupSeeding: normalizedCrossGroupSeeding,
          bracketMatchup: normalizedBracketMatchup,
        },
        knockoutStage: {
          ...next.structure.knockoutStage,
          allowByes: true,
        },
      },
    };
  };

  const updateFormat = (format: TournamentForm["format"]) => {
    setForm((prev) => {
      const nextStartFrom = prev.structure.knockoutStage.startFrom;
      const nextBracketSize = getKnockoutBracketSize(nextStartFrom);
      const nextForm = {
        ...prev,
        format,
        minTeams: format === "eliminacion" ? nextBracketSize : Math.max(prev.minTeams, 4),
        maxTeams: format === "eliminacion" ? nextBracketSize : Math.max(prev.maxTeams, 4),
        structure: {
          groupStage: {
            ...prev.structure.groupStage,
            enabled: format !== "eliminacion",
            groupCount: format === "liga" ? 1 : prev.structure.groupStage.groupCount,
          },
          knockoutStage: {
            ...prev.structure.knockoutStage,
            enabled: format !== "liga",
            allowByes: true,
          },
        },
      } satisfies TournamentForm;

      return normalizeMixedSettings(nextForm, advancedMode);
    });
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

    if (form.minTeams < minAllowedTeams) {
      showToast({
        type: "error",
        message: isKnockout && form.structure.knockoutStage.startFrom === "final"
          ? "Una final directa admite 2 equipos, pero no menos"
          : "Un torneo necesita al menos 4 equipos",
      });
      setLoading(false);
      return;
    }

    if (isMixed && !mixedSummary.configurationValid) {
      showToast({
        type: "error",
        message: getMixedConfigurationMessage(mixedSummary),
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
                  qualifyPerGroup: Number(form.structure.groupStage.qualifyPerGroup),
                  wildcardsCount: Number(form.structure.groupStage.wildcardsCount),
                  seedingCriteria: form.structure.groupStage.seedingCriteria,
                  crossGroupSeeding: form.structure.groupStage.crossGroupSeeding,
                  bracketMatchup: form.structure.groupStage.bracketMatchup,
                }),
          },
          knockoutStage: {
            enabled: !isLeague,
            ...(!isLeague
              ? {
                  startFrom: form.structure.knockoutStage.startFrom,
                  allowByes: true,
                }
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
  const leagueRounds = Math.max(1, Number(form.structure.groupStage.rounds || 1));

  const teamsPerGroup =
    groups > 0 ? Math.floor(teams / groups) : 0;
  const mixedSummary = getMixedQualificationSummary({
    groupCount: groups,
    rounds: leagueRounds,
    qualifyPerGroup: form.structure.groupStage.qualifyPerGroup,
    wildcardsCount: form.structure.groupStage.wildcardsCount,
    startFrom: form.structure.knockoutStage.startFrom,
    seedingCriteria: form.structure.groupStage.seedingCriteria,
    crossGroupSeeding: form.structure.groupStage.crossGroupSeeding,
    bracketMatchup: form.structure.groupStage.bracketMatchup,
  });
  const estimatedLeagueMatches = Math.max(0, (teams * (teams - 1)) / 2) * leagueRounds;
  const estimatedLeagueMatchdays = Math.max(0, Math.max(teams - 1, 0) + (teams % 2 === 0 ? 0 : 1)) * leagueRounds;

  const knockoutPreview = getKnockoutPreview(form.structure.knockoutStage.startFrom);
  const selectClassName =
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:[color-scheme:dark]";
  const selectOptionClassName = "dark:bg-neutral-900 dark:text-neutral-100";

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
        <p className="text-xs text-neutral-500">
          Podés alternar entre modo simple (recomendado) y modo avanzado para opciones técnicas.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 dark:border-neutral-700 dark:bg-neutral-900"
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
              className={selectClassName}
              value={form.format}
              onChange={(e) =>
                updateFormat(e.target.value as TournamentForm["format"])
              }
            >
              <option className={selectOptionClassName} value="liga">Liga</option>
              <option className={selectOptionClassName} value="eliminacion">Eliminación</option>
              <option className={selectOptionClassName} value="mixto">Grupos y eliminatorias</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Mín. equipos</label>
            <input
              type="number"
              min={minAllowedTeams}
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
              min={minAllowedTeams}
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
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:[color-scheme:dark]"
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
            <label className="text-sm font-medium">Sets máximos por partido</label>
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
            <p className="mt-1 text-xs text-neutral-500">
              Este valor define cuántos sets puede tener como máximo cada partido y luego se valida al cargar resultados.
            </p>
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

        <section className="space-y-3 border-t border-neutral-200 pt-4">

          <h2 className="text-sm font-semibold text-neutral-800">
            Estructura
          </h2>
          {isMixed && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-700">Modo simple</span>
              <button
                type="button"
                onClick={() => {
                  const nextAdvanced = !advancedMode;
                  setAdvancedMode(nextAdvanced);
                  setForm((prev) => normalizeMixedSettings(prev, nextAdvanced));
                }}
                className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors ${
                  advancedMode ? "border-slate-600 bg-slate-900" : "border-neutral-300 bg-white"
                }`}
                role="switch"
                aria-checked={advancedMode}
                aria-label="Activar modo avanzado"
              >
                <span
                  className={`ml-1 h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
                    advancedMode ? "translate-x-7 bg-neutral-200" : "translate-x-0 bg-neutral-700"
                  }`}
                  aria-hidden
                />
              </button>
              <span className="text-sm text-neutral-700">Modo avanzado</span>
            </div>
          )}

          {/* fase de grupos */}

          {!isKnockout && (
            <>
              {!isLeague && (
                <div>
                  <label className="text-sm font-medium">
                    Cantidad de grupos
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={form.structure.groupStage.groupCount}
                    onChange={(e) =>
                      setForm((prev) => normalizeMixedSettings({
                        ...prev,
                        structure: {
                          ...prev.structure,
                          groupStage: {
                            ...prev.structure.groupStage,
                            groupCount: Number(e.target.value),
                          },
                        },
                      }, advancedMode))
                    }
                  />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Rondas</label>

                  <select
                    className={selectClassName}
                    value={form.structure.groupStage.rounds}
                    onChange={(e) =>
                        setForm((prev) => normalizeMixedSettings({
                          ...prev,
                          structure: {
                            ...prev.structure,
                          groupStage: {
                            ...prev.structure.groupStage,
                            rounds: Number(e.target.value),
                          },
                        },
                      }, advancedMode))
                    }
                  >
                    <option className={selectOptionClassName} value={1}>Una ronda</option>
                    <option className={selectOptionClassName} value={2}>Ida y vuelta</option>
                    <option className={selectOptionClassName} value={3}>Tres rondas</option>
                  </select>
                </div>

                {isMixed && (
                  <div>
                    <label className="text-sm font-medium">Clasifican por grupo</label>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.structure.groupStage.qualifyPerGroup}
                      onChange={(e) =>
                        setForm((prev) => normalizeMixedSettings({
                          ...prev,
                          structure: {
                            ...prev.structure,
                            groupStage: {
                              ...prev.structure.groupStage,
                              qualifyPerGroup: Number(e.target.value),
                            },
                          },
                        }, advancedMode))
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {(isKnockout || isMixed) && (
            <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div>
                <label className="text-sm font-medium">
                  Inicio de eliminación
                </label>

                <select
                  className={selectClassName}
                  value={form.structure.knockoutStage.startFrom}
                  onChange={(e) => {
                    setForm((prev) => {
                      const startFrom = e.target.value as TournamentForm["structure"]["knockoutStage"]["startFrom"];
                      const bracketSize = getKnockoutBracketSize(startFrom);
                      return normalizeMixedSettings({
                        ...prev,
                        minTeams: prev.format === "eliminacion" ? bracketSize : prev.minTeams,
                        maxTeams: prev.format === "eliminacion" ? bracketSize : prev.maxTeams,
                        structure: {
                          ...prev.structure,
                          knockoutStage: {
                            ...prev.structure.knockoutStage,
                            startFrom,
                            allowByes: true,
                          },
                        },
                      }, advancedMode);
                    });
                  }}
                >
                  <option className={selectOptionClassName} value="octavos">Octavos</option>
                  <option className={selectOptionClassName} value="cuartos">Cuartos</option>
                  <option className={selectOptionClassName} value="semi">Semifinal</option>
                  <option className={selectOptionClassName} value="final">Final</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tamaño de cuadro</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{requiredKnockoutTeams} equipos</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pases automáticos</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">Activados (cuando falta rival)</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Flujo</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{knockoutPreview}</p>
                </div>
              </div>

              {isMixed && advancedMode && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Clasificados extra</label>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.structure.groupStage.wildcardsCount}
                      onChange={(e) =>
                        setForm((prev) => normalizeMixedSettings({
                          ...prev,
                          structure: {
                            ...prev.structure,
                            groupStage: {
                              ...prev.structure.groupStage,
                              wildcardsCount: Number(e.target.value),
                            },
                          },
                        }, advancedMode))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cómo ordenar a los clasificados</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.structure.groupStage.seedingCriteria}
                      onChange={(e) =>
                        setForm((prev) => normalizeMixedSettings({
                          ...prev,
                          structure: {
                            ...prev.structure,
                            groupStage: {
                              ...prev.structure.groupStage,
                              seedingCriteria: e.target.value as TournamentForm["structure"]["groupStage"]["seedingCriteria"],
                            },
                          },
                        }, advancedMode))
                      }
                    >
                      <option value="points">Puntos</option>
                      <option value="group_position">Posición de grupo</option>
                      <option value="setsDiff">Dif. de sets</option>
                      <option value="pointsDiff">Dif. de puntos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cómo se cruzan en playoff</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={form.structure.groupStage.bracketMatchup}
                      onChange={(e) =>
                        setForm((prev) => normalizeMixedSettings({
                          ...prev,
                          structure: {
                            ...prev.structure,
                            groupStage: {
                              ...prev.structure.groupStage,
                              bracketMatchup: e.target.value as TournamentForm["structure"]["groupStage"]["bracketMatchup"],
                            },
                          },
                        }, advancedMode))
                      }
                    >
                      <option
                        value="1A_vs_2B"
                      >
                        Cruce 1° vs 2°
                      </option>
                      <option value="standard_seeded">Ranking global</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={form.structure.groupStage.crossGroupSeeding}
                      onChange={(e) =>
                        setForm((prev) => normalizeMixedSettings({
                          ...prev,
                          structure: {
                            ...prev.structure,
                            groupStage: {
                              ...prev.structure.groupStage,
                              crossGroupSeeding: e.target.checked,
                            },
                          },
                        }, advancedMode))
                      }
                    />
                    Usar ranking general entre grupos
                  </label>
                </div>
              )}

              {isMixed && (
                <p className={`text-xs ${mixedSummary.configurationValid ? "text-emerald-700" : "text-amber-700"}`}>
                  {getMixedConfigurationMessage(mixedSummary)}
                </p>
              )}

              {isKnockout && (
                <p className="text-xs text-neutral-500">
                  En torneos de eliminación directa pura no hay grupos ni liga previa. Para confirmar el fixture se debe completar exactamente el cuadro seleccionado.
                </p>
              )}
            </div>
          )}

        </section>

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

            {isLeague ? (
              <>
                <p>
                  <b>Participantes de liga:</b> hasta {teams} equipos
                </p>
                <p>
                  <b>Vueltas:</b> {leagueRounds}
                </p>
                <p>
                  <b>Partidos estimados:</b> {estimatedLeagueMatches}
                </p>
                <p>
                  <b>Fechas estimadas:</b> {estimatedLeagueMatchdays}
                </p>
              </>
            ) : isKnockout ? (
              <>
                <p>
                  <b>Cuadro:</b> {knockoutPreview}
                </p>
                <p>
                  <b>Equipos requeridos:</b> {requiredKnockoutTeams}
                </p>
                <p>
                  <b>Pases automáticos:</b> habilitados cuando falta rival
                </p>
              </>
            ) : (
              <>
                <p>
                  <b>Grupos:</b> {groups} grupos de {teamsPerGroup} equipos
                </p>
                <p>
                  <b>Clasifican por grupo:</b> {form.structure.groupStage.qualifyPerGroup}
                </p>
                <p>
                  <b>Clasificados extra:</b> {form.structure.groupStage.wildcardsCount}
                </p>
                <p>
                  <b>Eliminación:</b> {knockoutPreview}
                </p>
                <p>
                  <b>Clasificados esperados:</b> {mixedSummary.totalQualified} / {mixedSummary.requiredQualified}
                </p>
                <p>
                  <b>Cómo ordenar a los clasificados:</b> {form.structure.groupStage.seedingCriteria}
                </p>
              </>
            )}

            {!isKnockout && !isLeague && (
              <p>
                <b>Rondas fase grupos:</b> {form.structure.groupStage.rounds}
              </p>
            )}

          </div>

        </section>

        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 text-sm font-medium hover:bg-neutral-800 dark:border-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? <Spinner /> : null}
            Crear torneo
          </button>

          <Link
            href="/admin/tournaments"
            aria-disabled={loading}
            tabIndex={loading ? -1 : undefined}
            onClick={(event) => {
              if (loading) event.preventDefault();
            }}
            className={`text-sm text-neutral-600 hover:text-neutral-800 ${
              loading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
