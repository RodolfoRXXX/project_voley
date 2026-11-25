"use client";

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  administrativePersonError,
  confirmAdministrativePersonReincorporation,
  listAdministrativePersons,
  newAdministrativePersonKey,
  prepareAdministrativePersonReincorporation,
  type AdministrativePersonItem,
} from "@/services/administrativePersonsService";

type ReincorporationPhase = "idle" | "preparing" | "confirmation" | "submitting" | "recoverable";
type PreparedReincorporation = {
  item: AdministrativePersonItem;
  destinationSeason: { seasonId: string; name: string };
  previewToken: string;
  idempotencyKey: string;
};

const secondaryButton = "min-h-11 cursor-pointer rounded-lg border border-orange-500 px-4 font-semibold transition-colors hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton = "min-h-11 cursor-pointer rounded-lg bg-orange-600 px-4 font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300 disabled:opacity-70";

export function AdministrativeNonMembersSection({ groupId, archived, onEdit, onChanged }: { groupId: string; archived: boolean; onEdit: (item: AdministrativePersonItem, trigger: HTMLButtonElement) => void; onChanged: () => void }) {
  const [items, setItems] = useState<AdministrativePersonItem[]>([]), [cursor, setCursor] = useState<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading"), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [phase, setPhase] = useState<ReincorporationPhase>("idle"), [prepared, setPrepared] = useState<PreparedReincorporation>(), [modalError, setModalError] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null), dialogRef = useRef<HTMLDivElement>(null), cancelRef = useRef<HTMLButtonElement>(null), sectionRef = useRef<HTMLElement>(null), sendingRef = useRef(false);

  const load = useCallback(async (next?: string) => {
    setStatus("loading"); setError("");
    try {
      const page = await listAdministrativePersons({ groupId, pageSize: 20, ...(next ? { cursor: next } : {}) });
      setItems((current) => next ? [...current, ...page.items.filter((candidate) => !current.some((item) => item.personId === candidate.personId))] : page.items);
      setCursor(page.nextCursor); setStatus("ready");
    } catch (cause) { setError(administrativePersonError(cause)); setStatus("error"); }
  }, [groupId]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    if (["confirmation", "recoverable"].includes(phase)) queueMicrotask(() => cancelRef.current?.focus());
  }, [phase]);

  function closeReincorporation(restoreFocus = true, force = false) {
    if (phase === "submitting" && !force) return;
    const trigger = triggerRef.current;
    setPhase("idle"); setPrepared(undefined); setModalError(""); sendingRef.current = false;
    if (restoreFocus) queueMicrotask(() => (trigger?.isConnected ? trigger.focus() : sectionRef.current?.focus()));
  }

  async function openReincorporation(item: AdministrativePersonItem, trigger: HTMLButtonElement) {
    if (phase !== "idle" || archived) return;
    triggerRef.current = trigger; setError(""); setNotice(""); setModalError(""); setPhase("preparing");
    try {
      const preview = await prepareAdministrativePersonReincorporation(groupId, item.personId);
      setPrepared({ item, destinationSeason: preview.destinationSeason, previewToken: preview.previewToken, idempotencyKey: newAdministrativePersonKey() });
      setPhase("confirmation");
    } catch (cause) {
      setError(administrativePersonError(cause)); setPhase("idle");
      await load(); queueMicrotask(() => (trigger.isConnected ? trigger.focus() : sectionRef.current?.focus()));
    }
  }

  async function confirmReincorporation() {
    if (!prepared || sendingRef.current || !["confirmation", "recoverable"].includes(phase)) return;
    sendingRef.current = true; setPhase("submitting"); setModalError("");
    try {
      await confirmAdministrativePersonReincorporation({ groupId, personId: prepared.item.personId, previewToken: prepared.previewToken, idempotencyKey: prepared.idempotencyKey });
      closeReincorporation(false, true);
      setNotice("Ficha reincorporada. Se actualizaron el padrón, contador y búsqueda.");
      await load(); onChanged(); queueMicrotask(() => sectionRef.current?.focus());
    } catch (cause) {
      sendingRef.current = false; setModalError(administrativePersonError(cause)); setPhase("recoverable");
    }
  }

  function modalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && phase !== "submitting") { event.preventDefault(); closeReincorporation(); return; }
    if (event.key !== "Tab" || phase === "submitting") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <section ref={sectionRef} tabIndex={-1} aria-labelledby="non-members-heading" aria-busy={status === "loading" || phase === "preparing"} className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">
    <h2 id="non-members-heading" className="text-lg font-semibold">No integrantes</h2>
    <p className="mt-1 text-sm text-[var(--text-muted)]">Fichas que administrás desde este grupo y que actualmente no forman parte de sus integrantes. Podés editar sus datos o reincorporarlas cuando haya una temporada abierta.</p>
    {notice ? <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {phase === "preparing" ? <p role="status" className="mt-4 text-sm">Preparando confirmación…</p> : null}
    {status === "loading" && items.length === 0 ? <p role="status" className="mt-4">Cargando fichas…</p> : null}
    {status === "ready" && items.length === 0 ? <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-[var(--text-muted)]">No hay fichas bajo custodia fuera del padrón activo.</p> : null}
    <ul className="mt-4 grid gap-3">{items.map((item) => <li key={item.personId} className="flex min-w-0 flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold">{item.firstName} {item.lastName}</p><p className="break-all text-sm text-[var(--text-muted)]">{item.contactEmail || "Sin correo"}</p></div><div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={phase !== "idle"} className={secondaryButton} onClick={(event) => onEdit(item, event.currentTarget)}>Editar ficha</button><button type="button" disabled={archived || status === "loading" || phase !== "idle"} title={archived ? "Un Grupo archivado no admite reincorporaciones" : undefined} className={primaryButton} onClick={(event) => void openReincorporation(item, event.currentTarget)}>Reincorporar</button></div></li>)}</ul>
    {cursor ? <button type="button" disabled={status === "loading" || phase !== "idle"} className={`mt-4 ${secondaryButton}`} onClick={() => void load(cursor)}>{status === "loading" ? "Cargando…" : "Cargar más"}</button> : null}
    {prepared && ["confirmation", "submitting", "recoverable"].includes(phase) ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="reincorporation-title" aria-describedby="reincorporation-description reincorporation-season" onKeyDown={modalKeyDown} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7"><h3 id="reincorporation-title" className="break-words text-xl font-semibold">Reincorporar a {prepared.item.firstName} {prepared.item.lastName}</h3><p id="reincorporation-season" className="mt-3 text-sm font-semibold">Temporada de destino: {prepared.destinationSeason.name}</p><p id="reincorporation-description" className="mt-2 text-sm leading-6">Volverá a integrar el grupo en la temporada actual. Su historial y sus pagos anteriores se conservarán.</p>{modalError ? <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{modalError}</p> : null}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancelRef} type="button" disabled={phase === "submitting"} className={secondaryButton} onClick={() => closeReincorporation()}>Cancelar</button><button type="button" disabled={phase === "submitting"} className={primaryButton} onClick={() => void confirmReincorporation()}>{phase === "submitting" ? "Reincorporando…" : "Reincorporar"}</button></div></div></div> : null}
  </section>;
}
