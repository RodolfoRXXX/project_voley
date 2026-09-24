"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getOwnSeason, getSeasonErrorMessage, getSeasonErrorReason, updateSeason } from "@/services/seasonsService";
import type { OpenSeasonHistory } from "@/types/SeasonHistory";
import type { SeasonErrorReason } from "@/types/OwnSeason";

const normalizeName = (value: string) => value.normalize("NFC").trim().replace(/\s+/gu, " ");
const keyFactory = () => `season-update-${crypto.randomUUID()}`;
const retryable = new Set<SeasonErrorReason>(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]);

export function EditSeasonSection({ groupId, season, onUpdated }: {
  groupId: string;
  season: OpenSeasonHistory;
  onUpdated: (message: string) => void;
}) {
  const [dialog, setDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [nombre, setNombre] = useState("");
  const [initialName, setInitialName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sendingRef = useRef(false);
  const intent = useRef<{ signature: string; key: string } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const save = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const normalized = useMemo(() => normalizeName(nombre), [nombre]);
  const dirty = normalized !== initialName;
  const valid = Array.from(normalized).length >= 1 && Array.from(normalized).length <= 80 && !/\p{Cc}/u.test(nombre);

  useEffect(() => { if (dialog && !loading) input.current?.focus(); }, [dialog, loading]);

  const refresh = async (keepOpen: boolean) => {
    const requestGeneration = ++generation.current;
    setLoading(true); setError("");
    try {
      const result = await getOwnSeason(groupId, season.id);
      if (requestGeneration !== generation.current) return;
      if (result.season.estado !== "abierta" || !result.editToken) {
        setDialog(false); onUpdated("La Temporada fue cerrada. Actualizamos la vista."); return;
      }
      setNombre(result.season.nombre); setInitialName(result.season.nombre); setToken(result.editToken);
      intent.current = null;
      if (keepOpen) setNotice("Cargamos el nombre vigente. Revisalo y decidí explícitamente si querés editarlo.");
    } catch (cause) {
      if (requestGeneration !== generation.current) return;
      const reason = getSeasonErrorReason(cause);
      if (["SEASON_ALREADY_CLOSED", "SEASON_NOT_ACCESSIBLE", "GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED"].includes(reason)) {
        setDialog(false); onUpdated(getSeasonErrorMessage(reason)); return;
      }
      setError(getSeasonErrorMessage(reason));
    } finally { if (requestGeneration === generation.current) setLoading(false); }
  };

  const openDialog = () => { setDialog(true); setNotice(""); setError(""); void refresh(false); };
  const closeDialog = () => {
    if (sending) return;
    generation.current += 1; setDialog(false); setError(""); setNotice(""); intent.current = null;
    queueMicrotask(() => trigger.current?.focus());
  };
  const submit = async () => {
    if (sendingRef.current || loading || !dirty || !valid || !token) return;
    const signature = `${groupId}\u0000${season.id}\u0000${normalized}\u0000${token}`;
    if (!intent.current || intent.current.signature !== signature) intent.current = { signature, key: keyFactory() };
    const activeIntent = intent.current;
    sendingRef.current = true; setSending(true); setError(""); setNotice("");
    try {
      const result = await updateSeason({ groupId, seasonId: season.id, nombre: normalized,
        expectedEditToken: token, idempotencyKey: activeIntent.key });
      intent.current = null;
      const message = result.outcome === "EXISTING_IDEMPOTENT"
        ? "Recuperamos la edición confirmada y actualizamos el estado vigente."
        : result.outcome === "NO_CHANGES" ? "No había cambios para guardar." : "Nombre de la Temporada actualizado.";
      setDialog(false); onUpdated(message);
      window.dispatchEvent(new CustomEvent("season-context-changed", { detail: { groupId } }));
    } catch (cause) {
      const reason = getSeasonErrorReason(cause);
      setError(getSeasonErrorMessage(reason));
      if (reason === "STALE_UPDATE") { intent.current = null; await refresh(true); }
      else if (["SEASON_ALREADY_CLOSED", "GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "SEASON_NOT_ACCESSIBLE"].includes(reason)) {
        intent.current = null; setDialog(false); onUpdated(getSeasonErrorMessage(reason));
      } else if (!retryable.has(reason)) intent.current = null;
    } finally { sendingRef.current = false; setSending(false); }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !sending) { event.preventDefault(); closeDialog(); return; }
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === input.current) { event.preventDefault(); cancel.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === save.current) { event.preventDefault(); input.current?.focus(); }
  };

  return <>
    <button ref={trigger} type="button" className="mt-4 min-h-11 rounded-lg border border-emerald-700 px-4 py-2 font-semibold text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={openDialog}>Editar</button>
    {dialog ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="edit-season-title" onKeyDown={onKeyDown} aria-busy={loading || sending} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"><h4 id="edit-season-title" className="text-lg font-semibold">Editar Temporada actual</h4><p className="mt-2 text-sm text-slate-600">Sólo podés corregir el nombre mientras la Temporada está abierta.</p><label htmlFor="season-edit-name" className="mt-5 block text-sm font-semibold">Nombre</label><input ref={input} id="season-edit-name" value={nombre} maxLength={160} disabled={loading || sending} onChange={(event) => { setNombre(event.target.value); setError(""); setNotice(""); if (intent.current?.signature !== `${groupId}\u0000${season.id}\u0000${normalizeName(event.target.value)}\u0000${token}`) intent.current = null; }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 px-3 py-2 disabled:opacity-60" aria-invalid={!valid} aria-describedby="season-edit-feedback"/><div id="season-edit-feedback" aria-live="assertive" className="mt-3 min-h-6 text-sm">{loading ? "Cargando estado vigente…" : sending ? "Guardando…" : error ? <span role="alert" className="text-red-700">{error}</span> : notice ? <span className="text-blue-800">{notice}</span> : !valid ? <span className="text-red-700">Ingresá entre 1 y 80 caracteres, sin controles.</span> : null}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancel} type="button" disabled={sending} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60" onClick={closeDialog}>Cancelar</button><button ref={save} type="button" disabled={loading || sending || !dirty || !valid || !token} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void submit()}>{sending ? "Guardando…" : "Guardar"}</button></div></div></div> : null}
  </>;
}
