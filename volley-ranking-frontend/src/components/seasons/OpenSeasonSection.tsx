"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getOpenSeasonContext, getSeasonErrorMessage, getSeasonErrorReason } from "@/services/seasonsService";
import type { OwnSeason } from "@/types/OwnSeason";

export function OpenSeasonSection({ groupId }: { groupId: string }) {
  const [season, setSeason] = useState<OwnSeason | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      setSeason((await getOpenSeasonContext(groupId)).openSeason);
      setStatus("ready");
    } catch (cause) {
      setError(getSeasonErrorMessage(getSeasonErrorReason(cause)));
      setStatus("error");
    }
  }, [groupId]);

  useEffect(() => {
    let active = true;
    void getOpenSeasonContext(groupId).then(
      ({ openSeason }) => {
        if (!active) return;
        setSeason(openSeason);
        setStatus("ready");
      },
      (cause) => {
        if (!active) return;
        setError(getSeasonErrorMessage(getSeasonErrorReason(cause)));
        setStatus("error");
      }
    );
    return () => { active = false; };
  }, [groupId]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="season-heading">
      <h2 id="season-heading" className="text-lg font-semibold">Temporada</h2>
      {status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Cargando contexto de Temporada…</p> : null}
      {status === "error" ? <div className="mt-3" role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load()}>Reintentar</button></div> : null}
      {status === "ready" && !season ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm leading-6 text-[var(--text-muted)]">Este Grupo todavía no tiene una Temporada abierta. Es un estado válido.</p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">Abrir una Temporada establece el ciclo temporal; no incorpora integrantes ni habilita por sí sola operaciones deportivas.</p>
          <Link href={`/dashboard/groups/${groupId}/seasons/new`} className="inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2">Crear y abrir temporada</Link>
        </div>
      ) : null}
      {status === "ready" && season ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{season.estado}</p>
          <h3 className="mt-1 text-lg font-semibold text-emerald-950">{season.nombre}</h3>
          <p className="mt-2 text-sm text-emerald-900">Fecha de inicio: <time dateTime={season.fechaInicio}>{season.fechaInicio}</time></p>
        </div>
      ) : null}
    </section>
  );
}
