"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { deleteOwnGroup, getGroupErrorMessage, getGroupErrorReason, prepareOwnGroupDeletion, type GroupDeletionBlocker } from "@/services/groupsService";
import type { GroupErrorReason, OwnGroupActive } from "@/types/OwnGroup";

const keyFactory = () => `group-delete-${crypto.randomUUID()}`;
const retryable = new Set<GroupErrorReason>(["CONFLICT", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]);
const blockerText: Record<GroupDeletionBlocker, string> = {
  SEASONS_EXIST: "El Grupo tiene Temporadas. Su historia debe conservarse; podés archivar el Grupo cuando cumpla las condiciones.",
  MEMBERSHIPS_EXIST: "El Grupo tiene Membresías o períodos de vigencia y su historia debe conservarse.",
  REQUESTS_EXIST: "El Grupo tiene Solicitudes, incluso resultados terminales, y no puede eliminarse.",
  FUNCTIONAL_REFERENCES_EXIST: "El Grupo tiene actividad funcional vinculada y no puede eliminarse.",
  OPERATION_IN_PROGRESS: "Hay una operación en curso capaz de crear referencias. Esperá a que termine y verificá nuevamente.",
};

export function DeleteGroupDialog({ group, open, onOpenChange, returnFocusRef, onPrepared, onDeleted, onAccessLost }: {
  group: OwnGroupActive;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onPrepared: (group: OwnGroupActive) => void;
  onDeleted: (message: string) => void;
  onAccessLost: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false); const [sending, setSending] = useState(false);
  const [token, setToken] = useState(""); const [blockers, setBlockers] = useState<GroupDeletionBlocker[]>([]); const [error, setError] = useState("");
  const generation = useRef(0); const inFlight = useRef(false); const intent = useRef<{ token: string; key: string } | null>(null);
  const cancel = useRef<HTMLButtonElement>(null); const confirm = useRef<HTMLButtonElement>(null);

  const prepare = async (message = "") => {
    const current = ++generation.current; const groupId = group.id;
    setLoading(true); setError(""); setToken(""); setBlockers([]); intent.current = null;
    try {
      const result = await prepareOwnGroupDeletion(groupId);
      if (current !== generation.current || groupId !== group.id) return;
      onPrepared(result.group); setToken(result.deletionToken); setBlockers(result.eligibility.blockers); setError(message);
    } catch (cause) {
      if (current !== generation.current || groupId !== group.id) return;
      const reason = getGroupErrorReason(cause);
      if (["GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "NOT_FOUND"].includes(reason)) { onOpenChange(false); onAccessLost(getGroupErrorMessage(reason)); return; }
      if (reason === "GROUP_NOT_DELETABLE") { onOpenChange(false); onAccessLost(getGroupErrorMessage(reason)); return; }
      setError(getGroupErrorMessage(reason));
    } finally { if (current === generation.current && groupId === group.id) setLoading(false); }
  };

  useEffect(() => { if (open) void prepare(); }, [open, group.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    generation.current += 1; inFlight.current = false; intent.current = null;
    setLoading(false); setSending(false); setToken(""); setBlockers([]); setError("");
  }, [group.id]);
  useEffect(() => { if (open && !loading) cancel.current?.focus(); }, [open, loading, blockers.length]);

  const dismiss = () => {
    if (sending) return;
    generation.current += 1; intent.current = null; onOpenChange(false); setError("");
    queueMicrotask(() => returnFocusRef.current?.focus());
  };
  const submit = async () => {
    if (inFlight.current || loading || blockers.length || !token) return;
    if (!intent.current || intent.current.token !== token) intent.current = { token, key: keyFactory() };
    const active = intent.current; const current = generation.current; const groupId = group.id;
    inFlight.current = true; setSending(true); setError("");
    try {
      const result = await deleteOwnGroup({ groupId, expectedDeletionToken: token, idempotencyKey: active.key });
      if (current !== generation.current || groupId !== group.id) return;
      intent.current = null; onOpenChange(false);
      onDeleted(result.recovered ? "Recuperamos la eliminación ya confirmada." : "Grupo eliminado definitivamente.");
      window.dispatchEvent(new CustomEvent("group-context-changed", { detail: { groupId } }));
    } catch (cause) {
      if (current !== generation.current || groupId !== group.id) return;
      const reason = getGroupErrorReason(cause); setError(getGroupErrorMessage(reason));
      if (reason === "STALE_DELETION" || ["SEASONS_EXIST", "MEMBERSHIPS_EXIST", "REQUESTS_EXIST", "FUNCTIONAL_REFERENCES_EXIST", "OPERATION_IN_PROGRESS"].includes(reason)) {
        intent.current = null; inFlight.current = false; setSending(false);
        await prepare(getGroupErrorMessage(reason));
      } else if (["GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "NOT_FOUND"].includes(reason)) {
        intent.current = null; onOpenChange(false); onAccessLost(getGroupErrorMessage(reason));
      } else if (!retryable.has(reason)) intent.current = null;
    } finally { if (current === generation.current && groupId === group.id) { inFlight.current = false; setSending(false); } }
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !sending) { event.preventDefault(); dismiss(); return; }
    if (event.key !== "Tab") return;
    const last = blockers.length || loading || !token ? cancel.current : confirm.current;
    if (event.shiftKey && document.activeElement === cancel.current) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); cancel.current?.focus(); }
  };

  return open ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-group-title" aria-describedby="delete-group-description" aria-busy={loading || sending} onKeyDown={onKeyDown} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"><h2 id="delete-group-title" className="text-lg font-semibold">Eliminar {group.nombre}</h2><p id="delete-group-description" className="mt-2 text-sm leading-6 text-slate-700">Esta eliminación es física, definitiva e irreversible. No elimina ni modifica Temporadas, Membresías, Solicitudes u otra actividad: si existe alguna referencia, el backend bloqueará la operación. Al confirmar se libera el cupo provisional para una creación nueva.</p>{blockers.length ? <section className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold text-amber-950">No se puede eliminar</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-amber-950">{blockers.map((blocker) => <li key={blocker}>{blockerText[blocker]}</li>)}</ul></section> : null}<div aria-live="assertive" className="mt-4 min-h-6 text-sm">{loading ? "Verificando todas las referencias…" : sending ? "Eliminando…" : error ? <span role="alert" className="text-red-700">{error}</span> : token && !blockers.length ? "El backend confirmó que el Grupo es eliminable. Revisá la consecuencia antes de confirmar." : null}</div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancel} type="button" disabled={sending} onClick={dismiss} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-60">Cancelar</button>{!blockers.length ? <button ref={confirm} type="button" disabled={loading || sending || !token} onClick={() => void submit()} className="min-h-11 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white disabled:opacity-60">{sending ? "Eliminando…" : "Eliminar grupo definitivamente"}</button> : null}</div></div></div> : null;
}
