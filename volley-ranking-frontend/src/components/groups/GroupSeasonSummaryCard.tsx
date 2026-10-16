"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getOpenSeasonContext, getSeasonErrorReason } from "@/services/seasonsService";
import type { OwnSeason } from "@/types/OwnSeason";

const accessReasons = new Set(["GROUP_NOT_ACCESSIBLE", "GROUP_NOT_FOUND", "NOT_AUTHORIZED"]);

export function GroupSeasonSummaryCard({ groupId, readOnly, onAccessLost }: { groupId: string; readOnly: boolean; onAccessLost: (message: string) => void }) {
  const [season, setSeason] = useState<OwnSeason | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSeason(null);
      setStatus("loading");
    });
    void getOpenSeasonContext(groupId).then(({ openSeason }) => {
      if (!active) return;
      setSeason(openSeason);
      setStatus("ready");
    }, (cause) => {
      if (!active) return;
      const reason = getSeasonErrorReason(cause);
      if (accessReasons.has(reason)) onAccessLost("Ya no tenés acceso a las Temporadas de este Grupo.");
      else setStatus("error");
    });
    return () => { active = false; };
  }, [groupId, onAccessLost]);

  return <section id="temporadas" className="scroll-mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="group-season-summary-title">
    <h2 id="group-season-summary-title" className="text-xl font-semibold">Temporada actual</h2>
    {status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Consultando Temporada actual…</p> : null}
    {status === "error" ? <p className="mt-3 text-sm text-red-700" role="alert">No pudimos consultar la Temporada actual. La gestión completa sigue disponible en Temporadas.</p> : null}
    {status === "ready" && season ? <div className="mt-3"><p className="font-semibold">{season.nombre}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Abierta · inicio <time dateTime={season.fechaInicio}>{season.fechaInicio}</time></p></div> : null}
    {status === "ready" && !season ? <p className="mt-3 text-sm text-[var(--text-muted)]">{readOnly ? "El Grupo archivado no tiene una Temporada actual." : "No hay una Temporada actual."}</p> : null}
    <Link href={`/dashboard/groups/${groupId}/seasons`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-orange-700 underline">Ver temporadas</Link>
  </section>;
}
