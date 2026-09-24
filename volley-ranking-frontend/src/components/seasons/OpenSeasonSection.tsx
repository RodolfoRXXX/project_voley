"use client";

import { useEffect, useRef, useState } from "react";

import { closeSeason, getSeasonErrorMessage, getSeasonErrorReason } from "@/services/seasonsService";
import type { OpenSeasonHistory } from "@/types/SeasonHistory";
import type { SeasonErrorReason } from "@/types/OwnSeason";

const keyFactory = () => `season-close-${crypto.randomUUID()}`;
const retryable = new Set<SeasonErrorReason>(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]);

export function OpenSeasonSection({ groupId, season, onClosed }: {
  groupId: string;
  season: OpenSeasonHistory;
  onClosed: () => void;
}) {
  const [dialog, setDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const intent = useRef<{ seasonId: string; key: string } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (dialog) title.current?.focus(); }, [dialog]);
  const openDialog = () => {
    if (!intent.current || intent.current.seasonId !== season.id) intent.current = { seasonId: season.id, key: keyFactory() };
    setError(""); setDialog(true);
  };
  const closeDialog = () => {
    if (sending) return;
    setDialog(false); intent.current = null;
    queueMicrotask(() => trigger.current?.focus());
  };
  const confirmClose = async () => {
    if (!intent.current || sending) return;
    setSending(true); setError("");
    try {
      await closeSeason({ groupId, seasonId: season.id, idempotencyKey: intent.current.key });
      intent.current = null; setDialog(false); onClosed();
      window.dispatchEvent(new CustomEvent("season-context-changed", { detail: { groupId } }));
    } catch (cause) {
      const reason = getSeasonErrorReason(cause); setError(getSeasonErrorMessage(reason));
      if (!retryable.has(reason)) intent.current = null;
    } finally { setSending(false); }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !sending) { event.preventDefault(); closeDialog(); return; }
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === cancel.current) { event.preventDefault(); confirm.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === confirm.current) { event.preventDefault(); cancel.current?.focus(); }
  };

  return <>
    <button ref={trigger} type="button" className="mt-4 min-h-11 rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={openDialog}>Cerrar Temporada</button>
    {dialog ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="close-season-title" aria-describedby="close-season-description" onKeyDown={onKeyDown} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"><h4 ref={title} tabIndex={-1} id="close-season-title" className="text-lg font-semibold">Cerrar {season.nombre}</h4><div id="close-season-description" className="mt-3 space-y-2 text-sm leading-6"><p>El cierre es terminal: no existe reapertura.</p><p>Antes deben finalizarse explícitamente todas las Membresías activas.</p></div>{error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}<p role="status" aria-live="assertive" className="mt-3 text-sm">{sending ? "Confirmando cierre…" : "Revisá la decisión antes de confirmar."}</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancel} type="button" disabled={sending} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60" onClick={closeDialog}>Cancelar</button><button ref={confirm} type="button" disabled={sending} className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60" onClick={() => void confirmClose()}>{sending ? "Cerrando…" : "Sí, cerrar definitivamente"}</button></div></div></div> : null}
  </>;
}
