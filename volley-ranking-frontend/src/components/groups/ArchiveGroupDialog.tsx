"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { archiveOwnGroup, getGroupErrorMessage, getGroupErrorReason, prepareOwnGroupArchive, type GroupArchiveBlocker } from "@/services/groupsService";
import type { GroupErrorReason, OwnGroupActive, OwnGroupArchived } from "@/types/OwnGroup";

const keyFactory = () => `group-archive-${crypto.randomUUID()}`;
const retryable = new Set<GroupErrorReason>(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]);
const blockerText: Record<GroupArchiveBlocker, string> = {
  ACTIVE_MEMBERSHIPS_EXIST: "Finalizá las Membresías activas con las acciones existentes del listado de integrantes.",
  OPEN_SEASON_EXISTS: "Cerrá la Temporada abierta desde el historial de Temporadas.",
  PENDING_REQUESTS_EXIST: "Decidí las Solicitudes pendientes o esperá que sus autores las cancelen.",
  APPROVAL_IN_PROGRESS: "Completá la recuperación de la aprobación en curso y prepará nuevamente el archivo.",
};

export function ArchiveGroupDialog({ group, open, onOpenChange, returnFocusRef, onPrepared, onArchived, onAccessLost }: {
  group: OwnGroupActive;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onPrepared: (group: OwnGroupActive) => void;
  onArchived: (group: OwnGroupArchived, message: string) => void;
  onAccessLost: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false); const [sending, setSending] = useState(false);
  const [token, setToken] = useState(""); const [blockers, setBlockers] = useState<GroupArchiveBlocker[]>([]); const [error, setError] = useState("");
  const intent = useRef<{ token: string; key: string } | null>(null); const inFlight = useRef(false); const generation = useRef(0);
  const close = useRef<HTMLButtonElement>(null); const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (open && !loading) (blockers.length ? close : confirm).current?.focus(); }, [open, loading, blockers.length]);
  useEffect(() => {
    generation.current += 1; inFlight.current = false; intent.current = null;
    setLoading(false); setSending(false); setToken(""); setBlockers([]); setError("");
  }, [group.id]);

  const prepare = async (message = "") => {
    const current = ++generation.current; setLoading(true); setError(""); setToken(""); setBlockers([]); intent.current = null;
    try {
      const result = await prepareOwnGroupArchive(group.id); if (current !== generation.current) return;
      onPrepared(result.group); setToken(result.archiveToken); setBlockers(result.eligibility.blockers); setError(message);
    } catch (cause) {
      if (current !== generation.current) return; const reason = getGroupErrorReason(cause);
      if (["GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "NOT_FOUND"].includes(reason)) { onOpenChange(false); onAccessLost(getGroupErrorMessage(reason)); return; }
      if (reason === "GROUP_ALREADY_ARCHIVED") { onOpenChange(false); onAccessLost("El estado del Grupo cambió. Volvé a abrirlo desde Mis Grupos."); return; }
      setError(getGroupErrorMessage(reason));
    } finally { if (current === generation.current) setLoading(false); }
  };
  useEffect(() => { if (open) void prepare(); }, [open, group.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const dismiss = () => { if (sending) return; generation.current += 1; onOpenChange(false); setError(""); intent.current = null; queueMicrotask(() => returnFocusRef.current?.focus()); };
  const submit = async () => {
    if (inFlight.current || loading || blockers.length || !token) return;
    if (!intent.current || intent.current.token !== token) intent.current = { token, key: keyFactory() };
    const active = intent.current; const current = generation.current; const groupId = group.id; inFlight.current = true; setSending(true); setError("");
    try {
      const result = await archiveOwnGroup({ groupId, expectedArchiveToken: token, idempotencyKey: active.key });
      if (current !== generation.current || groupId !== group.id) return;
      intent.current = null; onOpenChange(false); onArchived(result.currentGroup, result.recovered ? "Recuperamos el archivo ya confirmado." : "Grupo archivado.");
      window.dispatchEvent(new CustomEvent("group-context-changed", { detail: { groupId } }));
    } catch (cause) {
      if (current !== generation.current || groupId !== group.id) return;
      const reason = getGroupErrorReason(cause); setError(getGroupErrorMessage(reason));
      if (reason === "STALE_ARCHIVE" || ["ACTIVE_MEMBERSHIPS_EXIST", "OPEN_SEASON_EXISTS", "PENDING_REQUESTS_EXIST", "APPROVAL_IN_PROGRESS"].includes(reason)) {
        intent.current = null; await prepare(getGroupErrorMessage(reason));
        if (groupId === group.id) { inFlight.current = false; setSending(false); }
      } else if (["GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "NOT_FOUND"].includes(reason)) {
        intent.current = null; onOpenChange(false); onAccessLost(getGroupErrorMessage(reason));
      } else if (reason === "GROUP_ALREADY_ARCHIVED") {
        intent.current = null; onOpenChange(false); onAccessLost("El Grupo ya fue archivado. Volvé a abrirlo desde Mis Grupos.");
      } else if (!retryable.has(reason)) intent.current = null;
    } finally { if (current === generation.current && groupId === group.id) { inFlight.current = false; setSending(false); } }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !sending) { event.preventDefault(); dismiss(); return; }
    if (event.key !== "Tab") return;
    const first = close.current; const last = blockers.length || loading || !token ? close.current : confirm.current;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return open ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="archive-group-title" aria-describedby="archive-group-description" aria-busy={loading || sending} onKeyDown={onKeyDown} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"><h2 id="archive-group-title" className="text-lg font-semibold">Archivar {group.nombre}</h2><p id="archive-group-description" className="mt-2 text-sm leading-6 text-slate-600">El Grupo quedará en modo de consulta y no podrá desarchivarse. Esta acción no cierra Temporadas, no finaliza Membresías ni decide Solicitudes.</p>{blockers.length ? <section className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold text-amber-950">Antes de archivar</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-amber-950">{blockers.map((blocker) => <li key={blocker}>{blockerText[blocker]}</li>)}</ul></section> : null}<div aria-live="assertive" className="mt-4 min-h-6 text-sm">{loading ? "Verificando condiciones…" : sending ? "Archivando…" : error ? <span role="alert" className="text-red-700">{error}</span> : token && !blockers.length ? "El Grupo cumple las condiciones para archivarse." : null}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={close} type="button" disabled={sending} onClick={dismiss} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60">Cancelar</button>{!blockers.length ? <button ref={confirm} type="button" disabled={loading || sending || !token} onClick={() => void submit()} className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{sending ? "Archivando…" : "Confirmar archivo"}</button> : null}</div></div></div> : null;
}
