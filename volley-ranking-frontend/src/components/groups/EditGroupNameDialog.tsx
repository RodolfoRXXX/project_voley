"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { getGroupErrorMessage, getGroupErrorReason, getOwnGroup, updateOwnGroupName } from "@/services/groupsService";
import type { GroupErrorReason, OwnGroup } from "@/types/OwnGroup";

const normalizeName = (value: string) => value.normalize("NFC").trim().replace(/\s+/gu, " ");
const keyFactory = () => `group-name-update-${crypto.randomUUID()}`;
const retryable = new Set<GroupErrorReason>(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]);

export function EditGroupNameDialog({ group, open, onOpenChange, returnFocusRef, onUpdated, onAccessLost }: {
  group: OwnGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onUpdated: (group: OwnGroup, message: string) => void;
  onAccessLost: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false); const [sending, setSending] = useState(false);
  const [nombre, setNombre] = useState(""); const [initialName, setInitialName] = useState(""); const [token, setToken] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const sendingRef = useRef(false); const intent = useRef<{ signature: string; key: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null); const save = useRef<HTMLButtonElement>(null); const generation = useRef(0);
  const normalized = useMemo(() => normalizeName(nombre), [nombre]); const dirty = normalized !== initialName;
  const valid = Array.from(normalized).length >= 1 && Array.from(normalized).length <= 80 && !/\p{Cc}/u.test(nombre);

  useEffect(() => { if (open && !loading) input.current?.focus(); }, [open, loading]);

  const refresh = async (keepOpen: boolean) => {
    const requestGeneration = ++generation.current; setLoading(true); setError("");
    try {
      const result = await getOwnGroup(group.id); if (requestGeneration !== generation.current) return;
      if (result.group.estado !== "activo" || !result.editToken) { onOpenChange(false); onAccessLost("El Grupo ya no admite edición. Volvé a abrirlo desde Mis Grupos."); return; }
      setNombre(result.group.nombre); setInitialName(result.group.nombre); setToken(result.editToken); intent.current = null;
      if (keepOpen) setNotice("Cargamos el nombre vigente. Revisalo y decidí explícitamente si querés editarlo.");
    } catch (cause) {
      if (requestGeneration !== generation.current) return; const reason = getGroupErrorReason(cause);
      if (["GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "NOT_FOUND"].includes(reason)) { onOpenChange(false); onAccessLost(getGroupErrorMessage(reason)); return; }
      setError(getGroupErrorMessage(reason));
    } finally { if (requestGeneration === generation.current) setLoading(false); }
  };
  useEffect(() => { if (open) { setError(""); setNotice(""); void refresh(false); } }, [open, group.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeDialog = () => { if (sending) return; generation.current += 1; onOpenChange(false); setError(""); setNotice(""); intent.current = null; queueMicrotask(() => returnFocusRef.current?.focus()); };
  const submit = async () => {
    if (sendingRef.current || loading || !dirty || !valid || !token) return;
    const signature = `${group.id}\u0000${normalized}\u0000${token}`;
    if (!intent.current || intent.current.signature !== signature) intent.current = { signature, key: keyFactory() };
    const activeIntent = intent.current; const requestGeneration = generation.current; const groupId = group.id;
    sendingRef.current = true; setSending(true); setError(""); setNotice("");
    try {
      const result = await updateOwnGroupName({ groupId, nombre: normalized, expectedEditToken: token, idempotencyKey: activeIntent.key });
      if (requestGeneration !== generation.current || groupId !== group.id) return;
      intent.current = null; onOpenChange(false);
      if (result.outcome === "UPDATED_THEN_DELETED") {
        onAccessLost("La edición se había confirmado, pero el Grupo ya no está disponible.");
        return;
      }
      onUpdated(result.currentGroup, result.recovered ? "Recuperamos la edición confirmada y mostramos el nombre vigente." : result.outcome === "NO_CHANGES" ? "No había cambios para guardar." : "Nombre del Grupo actualizado.");
      window.dispatchEvent(new CustomEvent("group-context-changed", { detail: { groupId } }));
      queueMicrotask(() => returnFocusRef.current?.focus());
    } catch (cause) {
      if (requestGeneration !== generation.current || groupId !== group.id) return;
      const reason = getGroupErrorReason(cause); setError(getGroupErrorMessage(reason));
      if (reason === "STALE_UPDATE") { intent.current = null; await refresh(true); }
      else if (["GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "NOT_FOUND"].includes(reason)) { intent.current = null; onOpenChange(false); onAccessLost(getGroupErrorMessage(reason)); }
      else if (!retryable.has(reason)) intent.current = null;
    } finally {
      if (requestGeneration === generation.current && groupId === group.id) setSending(false);
      sendingRef.current = false;
    }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !sending) { event.preventDefault(); closeDialog(); return; }
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === input.current) { event.preventDefault(); save.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === save.current) { event.preventDefault(); input.current?.focus(); }
  };

  return open ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="edit-group-name-title" aria-busy={loading || sending} onKeyDown={onKeyDown} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"><h2 id="edit-group-name-title" className="text-lg font-semibold">Editar nombre del Grupo</h2><p className="mt-2 text-sm text-slate-600">Esta acción cambia únicamente el nombre.</p><label htmlFor="group-edit-name" className="mt-5 block text-sm font-semibold">Nombre</label><input ref={input} id="group-edit-name" value={nombre} maxLength={160} disabled={loading || sending} onChange={(event) => { const value = event.target.value; setNombre(value); setError(""); setNotice(""); if (intent.current?.signature !== `${group.id}\u0000${normalizeName(value)}\u0000${token}`) intent.current = null; }} aria-invalid={!valid} aria-describedby="group-edit-feedback" className="mt-2 min-h-11 w-full rounded-lg border border-slate-400 px-3 py-2 disabled:opacity-60"/><div id="group-edit-feedback" aria-live="assertive" className="mt-3 min-h-6 text-sm">{loading ? "Cargando nombre vigente…" : sending ? "Guardando…" : error ? <span role="alert" className="text-red-700">{error}</span> : notice ? <span className="text-blue-800">{notice}</span> : !valid ? <span className="text-red-700">Ingresá entre 1 y 80 caracteres, sin controles.</span> : null}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancel} type="button" disabled={sending} onClick={closeDialog} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60">Cancelar</button><button ref={save} type="button" disabled={loading || sending || !dirty || !valid || !token} onClick={() => void submit()} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{sending ? "Guardando…" : "Guardar"}</button></div></div></div> : null;
}
