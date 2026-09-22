"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { closeSeason, getOpenSeasonContext, getSeasonErrorMessage, getSeasonErrorReason } from "@/services/seasonsService";
import type { OwnSeason, SeasonErrorReason } from "@/types/OwnSeason";

const keyFactory = () => `season-close-${crypto.randomUUID()}`;
const retryable = new Set<SeasonErrorReason>(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]);

export function OpenSeasonSection({ groupId }: { groupId: string }) {
  const [season, setSeason] = useState<OwnSeason | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const intent = useRef<{ seasonId: string; key: string } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setStatus("loading"); setError("");
    try { setSeason((await getOpenSeasonContext(groupId)).openSeason); setStatus("ready"); }
    catch (cause) { setError(getSeasonErrorMessage(getSeasonErrorReason(cause))); setStatus("error"); }
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (dialog) title.current?.focus(); }, [dialog]);

  const openDialog = () => {
    if (!season) return;
    if (!intent.current || intent.current.seasonId !== season.id) intent.current = { seasonId: season.id, key: keyFactory() };
    setError(""); setNotice(""); setDialog(true);
  };
  const closeDialog = (clearIntent = true) => {
    if (sending) return;
    setDialog(false); if (clearIntent) intent.current = null;
    queueMicrotask(() => trigger.current?.focus());
  };
  const focusSection = (id: string) => {
    setDialog(false); window.location.hash = id;
    queueMicrotask(() => document.getElementById(id)?.focus());
  };
  const confirmClose = async () => {
    if (!season || !intent.current || sending) return;
    const command = { groupId, seasonId: season.id, idempotencyKey: intent.current.key };
    setSending(true); setError("");
    try {
      const result = await closeSeason(command);
      intent.current = null; setDialog(false); setSeason(null); setStatus("ready");
      setNotice(`Temporada cerrada el ${new Date(result.season.closedAt).toLocaleString("es-AR")}. La historia se conservó y el slot quedó libre.`);
      window.dispatchEvent(new CustomEvent("season-context-changed", { detail: { groupId } }));
    } catch (cause) {
      const reason = getSeasonErrorReason(cause); setError(getSeasonErrorMessage(reason));
      if (reason === "ACTIVE_MEMBERSHIPS_EXIST") focusSection("active-members");
      else if (reason === "APPROVAL_IN_PROGRESS") focusSection("pending-group-join-requests");
      else if (!retryable.has(reason)) intent.current = null;
    } finally { setSending(false); }
  };
  const dialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !sending) { event.preventDefault(); closeDialog(); return; }
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === cancel.current) { event.preventDefault(); confirm.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === confirm.current) { event.preventDefault(); cancel.current?.focus(); }
  };

  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="season-heading">
    <h2 id="season-heading" className="text-lg font-semibold">Temporada</h2>
    <div aria-live="polite">
      {notice ? <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
    {status === "loading" ? <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">Cargando contexto de Temporada…</p> : null}
    {status === "error" ? <button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load()}>Reintentar</button> : null}
    {status === "ready" && !season ? <div className="mt-3 space-y-4"><p className="text-sm leading-6 text-[var(--text-muted)]">Este Grupo no tiene una Temporada abierta. Es un estado válido y la historia cerrada se conserva.</p><Link href={`/dashboard/groups/${groupId}/seasons/new`} className="inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white">Crear y abrir temporada</Link></div> : null}
    {status === "ready" && season ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{season.estado}</p><h3 className="mt-1 text-lg font-semibold text-emerald-950">{season.nombre}</h3><p className="mt-2 text-sm text-emerald-900">Fecha de inicio: <time dateTime={season.fechaInicio}>{season.fechaInicio}</time></p><button ref={trigger} type="button" className="mt-4 min-h-11 rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={openDialog}>Cerrar Temporada</button></div> : null}
    {dialog && season ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="close-season-title" aria-describedby="close-season-description" onKeyDown={dialogKeyDown} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"><h3 ref={title} tabIndex={-1} id="close-season-title" className="text-lg font-semibold">Cerrar {season.nombre}</h3><div id="close-season-description" className="mt-3 space-y-2 text-sm leading-6"><p>El cierre es terminal: no existe reapertura. La historia se preservará.</p><p>Antes deben finalizarse explícitamente todas las Membresías activas. No habrá finalización automática.</p><p>Las Solicitudes pendientes no se rechazan y no se renovará ninguna pertenencia.</p></div>{error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}<p role="status" aria-live="assertive" className="mt-3 text-sm">{sending ? "Confirmando cierre…" : "Revisá la decisión antes de confirmar."}</p><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancel} type="button" disabled={sending} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60" onClick={() => closeDialog()}>Cancelar</button><button ref={confirm} type="button" disabled={sending} className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:cursor-wait disabled:opacity-60" onClick={() => void confirmClose()}>{sending ? "Cerrando…" : "Sí, cerrar definitivamente"}</button></div></div></div> : null}
  </section>;
}
