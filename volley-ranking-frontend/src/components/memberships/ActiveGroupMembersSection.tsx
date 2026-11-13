"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  finalizeActiveGroupMemberForOwnedGroup, getMembershipCargoForOwnedGroup, getMembershipErrorMessage,
  getMembershipErrorReason, listActiveGroupMembersForOwnedGroup,
  prepareActiveGroupMemberFinalizationForOwnedGroup, updateMembershipCargoForOwnedGroup,
} from "@/services/membershipsService";
import type { ActiveGroupMember } from "@/types/ActiveGroupMember";
import type { MembershipErrorReason } from "@/types/OwnMembership";
import { OwnMembershipSection } from "./OwnMembershipSection";
import { mergeRosterPages } from "./rosterPresentation.mjs";

type Status = "loading" | "ready" | "error";
type FinalizePhase = "idle" | "preparing" | "confirmation" | "submitting" | "recoverable";
type CargoPhase = "idle" | "preparing" | "editing" | "submitting" | "recoverable";
type PreparedFinalization = { membershipId: string; firstName: string; lastName: string; activationRef: string; idempotencyKey?: string };
type PreparedCargo = { groupId: string; membershipId: string; name: string; originalCargo: string | null; editToken: string; idempotencyKey?: string; pendingCargo?: string | null };

const FINALIZATION_INVALIDATING = new Set<MembershipErrorReason>(["TARGET_MEMBERSHIP_NOT_ACCESSIBLE", "TARGET_MEMBERSHIP_NOT_ACTIVE", "MEMBERSHIP_ACTIVATION_CHANGED", "MEMBERSHIP_SEASON_NOT_MODIFIABLE", "GROUP_NOT_ACCESSIBLE", "TARGET_IS_SELF"]);
const CARGO_INVALIDATING = new Set<MembershipErrorReason>(["TARGET_MEMBERSHIP_NOT_ACCESSIBLE", "TARGET_MEMBERSHIP_NOT_ACTIVE", "MEMBERSHIP_SEASON_NOT_MODIFIABLE", "GROUP_NOT_ACCESSIBLE", "EDIT_TOKEN_STALE", "INCOMPATIBLE_STATE"]);
const newFinalizationKey = () => `membership-finalization-${crypto.randomUUID()}`;
const newCargoKey = () => `membership-cargo-${crypto.randomUUID()}`;
const canonicalCargo = (value: string) => value.normalize("NFC").trim().replace(/\s+/gu, " ");
const cargoLength = (value: string) => Array.from(value.normalize("NFC")).length;
function validateCargo(value: string): string | null {
  if (/\p{Cc}/u.test(value)) return "El cargo no puede contener caracteres de control.";
  const canonical = canonicalCargo(value); const length = Array.from(canonical).length;
  if (length < 1) return "Ingresá un cargo o usá Quitar.";
  if (length > 80) return "El cargo puede tener hasta 80 caracteres.";
  return null;
}
function getCargoErrorMessage(reason: MembershipErrorReason): string {
  if (reason === "MEMBERSHIP_SEASON_NOT_MODIFIABLE") return "La Temporada de esta Membresía ya no está abierta. No se modificó el cargo.";
  if (reason === "GROUP_NOT_ACCESSIBLE") return "Ya no tenés acceso al cargo ni al roster de este Grupo.";
  return getMembershipErrorMessage(reason);
}

export function ActiveGroupMembersSection({ groupId, onAccessLost }: { groupId: string; onAccessLost: (message: string) => void }) {
  const [items, setItems] = useState<ActiveGroupMember[]>([]);
  const [loadedGroupId, setLoadedGroupId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchItems, setSearchItems] = useState<ActiveGroupMember[]>([]);
  const [searchCursor, setSearchCursor] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<Status | "idle" | "unavailable">("idle");
  const [searchReason, setSearchReason] = useState<MembershipErrorReason | null>(null);
  const [retryCursor, setRetryCursor] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>("loading");
  const [reason, setReason] = useState<MembershipErrorReason | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [phase, setPhase] = useState<FinalizePhase>("idle");
  const [prepared, setPrepared] = useState<PreparedFinalization | null>(null);
  const [cargoPhase, setCargoPhase] = useState<CargoPhase>("idle");
  const [preparedCargo, setPreparedCargo] = useState<PreparedCargo | null>(null);
  const [cargoDraft, setCargoDraft] = useState("");
  const [cargoError, setCargoError] = useState("");
  const [expandedMembershipId, setExpandedMembershipId] = useState<string | null>(null);
  const [ownRowRevision, setOwnRowRevision] = useState(0);
  const inFlight = useRef<string | null>(null); const currentGroupId = useRef(groupId); currentGroupId.current = groupId;
  const currentSearch = useRef<string | null>(null);
  const sendingRef = useRef(false); const cargoSending = useRef(false);
  const region = useRef<HTMLDivElement>(null); const cancelRef = useRef<HTMLButtonElement>(null); const confirmRef = useRef<HTMLButtonElement>(null);
  const cargoDialogRef = useRef<HTMLDivElement>(null); const cargoInputRef = useRef<HTMLInputElement>(null); const triggerRef = useRef<HTMLButtonElement | null>(null);
  const focusRegion = useCallback(() => queueMicrotask(() => region.current?.focus()), []);

  const load = useCallback(async (cursor?: string, append = false, search?: string) => {
    const requestKey = `${groupId}:${search || "roster"}`;
    if (inFlight.current === requestKey) return; inFlight.current = requestKey;
    if (append) setLoadingNext(true); else if (search) setSearchStatus("loading"); else setStatus("loading");
    if (search) setSearchReason(null); else { setReason(null); setRetryCursor(cursor); }
    try {
      let result;
      try { result = await listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20, ...(cursor ? { cursor } : {}), ...(search ? { search } : {}) }); }
      catch (cause) {
        if (cursor && getMembershipErrorReason(cause) === "ROSTER_CONTEXT_CHANGED") { result = await listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20, ...(search ? { search } : {}) }); append = false; setNotice("La Temporada abierta cambió. Reiniciamos el listado desde la primera página."); }
        else throw cause;
      }
      if (currentGroupId.current !== groupId) return;
      if (search && currentSearch.current !== search) return;
      if (search) {
        setSearchItems((current) => mergeRosterPages(append ? current : [], result.items)); setSearchCursor(result.nextCursor);
        setSearchStatus(result.projection?.status === "READY" ? "ready" : "unavailable");
      } else { setItems((current) => mergeRosterPages(append ? current : [], result.items)); setLoadedGroupId(groupId); setNextCursor(result.nextCursor); setRetryCursor(undefined); setStatus("ready"); }
      if (append && result.items.length) setNotice(`Se agregaron ${result.items.length} integrantes.`);
    } catch (cause) {
      if (currentGroupId.current !== groupId) return;
      if (search && currentSearch.current !== search) return;
      const nextReason = getMembershipErrorReason(cause); if (nextReason === "GROUP_NOT_ACCESSIBLE") { setItems([]); setLoadedGroupId(null); setNextCursor(null); setCargoPhase("idle"); setPreparedCargo(null); setCargoDraft(""); setCargoError(""); cargoSending.current = false; onAccessLost(getCargoErrorMessage(nextReason)); return; }
      if (search) { setSearchReason(nextReason); setSearchStatus("error"); } else { setReason(nextReason); setStatus("error"); }
    } finally { if (inFlight.current === requestKey) inFlight.current = null; if (currentGroupId.current === groupId) { setLoadingNext(false); if (!search) focusRegion(); } }
  }, [focusRegion, groupId, onAccessLost]);

  useEffect(() => { setItems([]); setLoadedGroupId(null); setNextCursor(null); setSearchInput(""); setSearchItems([]); setSearchCursor(null); setSearchStatus("idle"); setExpandedMembershipId(null); setCargoPhase("idle"); setPreparedCargo(null); setCargoDraft(""); setCargoError(""); cargoSending.current = false; void load(); }, [groupId, load]);
  const normalizedSearch = searchInput.normalize("NFD").replace(/\p{M}+/gu, "").toLocaleLowerCase("es-AR").match(/[\p{L}\p{N}]+/gu) || [];
  const activeSearch = normalizedSearch.length === 1 && Array.from(normalizedSearch[0]).length >= 3 ? normalizedSearch[0] : null;
  currentSearch.current = activeSearch;
  useEffect(() => {
    if (!activeSearch) { setSearchItems([]); setSearchCursor(null); setSearchStatus("idle"); setSearchReason(null); return; }
    const timer = window.setTimeout(() => { void load(undefined, false, activeSearch); }, 250);
    return () => window.clearTimeout(timer);
  }, [activeSearch, load]);
  useEffect(() => { const refresh = (event: Event) => { if ((event as CustomEvent<{ groupId?: string }>).detail?.groupId === groupId) void (async () => { await load(); if (activeSearch) await load(undefined, false, activeSearch); })(); }; window.addEventListener("season-context-changed", refresh); return () => window.removeEventListener("season-context-changed", refresh); }, [activeSearch, groupId, load]);
  useEffect(() => { const refresh = (event: Event) => { if ((event as CustomEvent<{ groupId?: string }>).detail?.groupId === groupId) void (async () => { await load(); if (activeSearch) await load(undefined, false, activeSearch); })(); }; window.addEventListener("group-membership-changed", refresh); return () => window.removeEventListener("group-membership-changed", refresh); }, [activeSearch, groupId, load]);
  useEffect(() => { if (phase === "confirmation") queueMicrotask(() => cancelRef.current?.focus()); }, [phase]);
  useEffect(() => { if (cargoPhase === "editing") queueMicrotask(() => { cargoInputRef.current?.focus(); cargoInputRef.current?.select(); }); }, [cargoPhase]);

  async function reloadRoster() { await load(); if (activeSearch) await load(undefined, false, activeSearch); }

  const closeIntent = useCallback((restoreFocus = true) => { setPhase("idle"); setPrepared(null); sendingRef.current = false; if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus()); }, []);
  const closeCargo = useCallback((restoreFocus = true) => { setCargoPhase("idle"); setPreparedCargo(null); setCargoDraft(""); setCargoError(""); cargoSending.current = false; if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus()); }, []);

  async function openFinalization(item: ActiveGroupMember, trigger: HTMLButtonElement) {
    if (phase !== "idle" || cargoPhase !== "idle" || item.isOwner || item.person.status !== "AVAILABLE") return;
    triggerRef.current = trigger; setActionError(""); setPhase("preparing");
    try { const result = await prepareActiveGroupMemberFinalizationForOwnedGroup({ groupId, membershipId: item.membershipId }); setPrepared({ membershipId: item.membershipId, firstName: result.person.firstName, lastName: result.person.lastName, activationRef: result.activationRef }); setPhase("confirmation"); }
    catch (cause) { const nextReason = getMembershipErrorReason(cause); closeIntent(false); if (nextReason === "GROUP_NOT_ACCESSIBLE") { onAccessLost(getMembershipErrorMessage(nextReason)); return; } await load(); setActionError(getMembershipErrorMessage(nextReason)); }
  }
  async function confirmFinalization() {
    if (!prepared || sendingRef.current || !["confirmation", "recoverable"].includes(phase)) return;
    sendingRef.current = true; setPhase("submitting"); setActionError("");
    const stable = { ...prepared, idempotencyKey: prepared.idempotencyKey || newFinalizationKey() }; setPrepared(stable);
    try { await finalizeActiveGroupMemberForOwnedGroup({ groupId, membershipId: stable.membershipId, activationRef: stable.activationRef, idempotencyKey: stable.idempotencyKey }); closeIntent(false); await reloadRoster(); setNotice("Membresía finalizada. El roster fue actualizado desde la primera página."); focusRegion(); }
    catch (cause) { const nextReason = getMembershipErrorReason(cause); sendingRef.current = false; if (FINALIZATION_INVALIDATING.has(nextReason)) { closeIntent(false); if (nextReason === "GROUP_NOT_ACCESSIBLE") { onAccessLost(getMembershipErrorMessage(nextReason)); return; } await reloadRoster(); setActionError(getMembershipErrorMessage(nextReason)); focusRegion(); } else { setPhase("recoverable"); setActionError(getMembershipErrorMessage(nextReason)); } }
  }

  async function openCargo(membershipId: string, trigger: HTMLButtonElement) {
    if (cargoPhase !== "idle" || phase !== "idle") return;
    triggerRef.current = trigger; setActionError(""); setCargoError(""); setCargoPhase("preparing");
    try {
      const result = await getMembershipCargoForOwnedGroup({ groupId, membershipId });
      const name = result.membership.person.status === "AVAILABLE" ? `${result.membership.person.firstName} ${result.membership.person.lastName}` : "Identidad no disponible";
      if (currentGroupId.current !== groupId) return;
      setPreparedCargo({ groupId, membershipId, name, originalCargo: result.membership.cargo, editToken: result.editToken }); setCargoDraft(result.membership.cargo ?? ""); setCargoPhase("editing");
    } catch (cause) { const nextReason = getMembershipErrorReason(cause); closeCargo(false); if (nextReason === "GROUP_NOT_ACCESSIBLE") { onAccessLost(getCargoErrorMessage(nextReason)); return; } await reloadRoster(); setActionError(getCargoErrorMessage(nextReason)); focusRegion(); }
  }
  async function submitCargo(remove: boolean) {
    if (!preparedCargo || cargoSending.current || !["editing", "recoverable"].includes(cargoPhase)) return;
    const retrying = cargoPhase === "recoverable" && Object.prototype.hasOwnProperty.call(preparedCargo, "pendingCargo");
    const cargo = retrying ? preparedCargo.pendingCargo ?? null : remove ? null : canonicalCargo(cargoDraft);
    const validation = retrying || remove ? null : validateCargo(cargoDraft);
    if (validation) { setCargoError(validation); cargoInputRef.current?.focus(); return; }
    cargoSending.current = true; setCargoPhase("submitting"); setCargoError("");
    const stable = { ...preparedCargo, idempotencyKey: preparedCargo.idempotencyKey || newCargoKey(), pendingCargo: cargo }; setPreparedCargo(stable);
    try {
      const result = await updateMembershipCargoForOwnedGroup({ groupId, membershipId: stable.membershipId, cargo, editToken: stable.editToken, idempotencyKey: stable.idempotencyKey });
      closeCargo(false); await reloadRoster(); setOwnRowRevision((current) => current + 1); setNotice(result.outcome === "NO_CHANGES" ? "El cargo ya estaba actualizado." : cargo === null ? "Cargo quitado y roster actualizado." : "Cargo guardado y roster actualizado."); focusRegion();
    } catch (cause) {
      const nextReason = getMembershipErrorReason(cause); cargoSending.current = false;
      if (CARGO_INVALIDATING.has(nextReason)) { closeCargo(false); if (nextReason === "GROUP_NOT_ACCESSIBLE") { onAccessLost(getCargoErrorMessage(nextReason)); return; } await reloadRoster(); setActionError(getCargoErrorMessage(nextReason)); focusRegion(); }
      else { setCargoPhase("recoverable"); setCargoError(getCargoErrorMessage(nextReason)); }
    }
  }

  function finalizationKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && ["confirmation", "recoverable"].includes(phase)) { event.preventDefault(); closeIntent(); return; }
    if (event.key !== "Tab" || !["confirmation", "recoverable"].includes(phase)) return;
    if (event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus(); }
  }

  function cargoDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && cargoPhase !== "submitting") { event.preventDefault(); closeCargo(); return; }
    if (event.key !== "Tab" || cargoPhase === "submitting") return;
    const focusable = Array.from(cargoDialogRef.current?.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)") ?? []);
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  const busy = phase !== "idle" || cargoPhase !== "idle";
  const visibleItems = activeSearch ? searchItems : items;
  return <section id="active-members" tabIndex={-1} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="active-members-heading">
    <h2 id="active-members-heading" className="text-lg font-semibold">Integrantes</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Lista informativa de la Temporada abierta.</p>
    <label htmlFor="member-search" className="mt-4 block text-sm font-semibold">Buscar integrante</label><input id="member-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Desde 3 caracteres" autoComplete="off" className="mt-2 min-h-11 w-full rounded-lg border border-[var(--border)] px-3 py-2" aria-describedby="member-search-help" /><p id="member-search-help" className="mt-1 text-xs text-[var(--text-muted)]">Busca por el comienzo de cualquier palabra del nombre o apellido, sin distinguir mayúsculas ni tildes.</p>
    {searchInput.trim() && !activeSearch ? <p className="mt-2 text-sm text-[var(--text-muted)]">Ingresá una sola palabra de al menos 3 caracteres.</p> : null}
    <div ref={region} tabIndex={-1} aria-live="polite" aria-busy={status === "loading" || searchStatus === "loading" || loadingNext || ["preparing", "submitting"].includes(phase) || ["preparing", "submitting"].includes(cargoPhase)} className="mt-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
      {notice ? <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p> : null}{actionError && !busy ? <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p> : null}
      {phase === "preparing" ? <p role="status" className="mb-3 text-sm">Preparando confirmación…</p> : null}{cargoPhase === "preparing" ? <p role="status" className="mb-3 text-sm">Cargando el cargo vigente…</p> : null}
      {status === "loading" ? <div role="status" aria-label="Cargando integrantes" className="grid gap-3"><span>Cargando integrantes…</span>{[0, 1, 2].map((value) => <span key={value} aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}
      {status === "error" && reason ? <div role="alert"><p className="text-sm text-red-700">{getMembershipErrorMessage(reason)}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load(retryCursor, Boolean(retryCursor))}>Reintentar</button></div> : null}
      {activeSearch && searchStatus === "loading" ? <p role="status" className="mb-3 text-sm">Buscando en todo el padrón…</p> : null}
      {activeSearch && searchStatus === "error" && searchReason ? <div role="alert" className="mb-3"><p className="text-sm text-red-700">{getMembershipErrorMessage(searchReason)}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load(undefined, false, activeSearch)}>Reintentar</button></div> : null}
      {activeSearch && searchStatus === "unavailable" ? <div role="alert" className="mb-3"><p className="text-sm text-red-700">Búsqueda no disponible.</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold" onClick={() => void load(undefined, false, activeSearch)}>Reintentar</button></div> : null}
      {activeSearch && searchStatus === "ready" && searchItems.length === 0 ? <p className="mb-3 text-sm text-[var(--text-muted)]">Sin resultados</p> : null}
      {loadedGroupId === groupId ? <ul className="grid min-w-0 gap-3">
        {!activeSearch ? <OwnMembershipSection key={`${groupId}-${ownRowRevision}`} groupId={groupId} actionBusy={busy} onAccessLost={onAccessLost} onEditCargo={(membershipId, trigger) => void openCargo(membershipId, trigger)} onMembershipChanged={() => void load()} /> : null}
        {/* items.map remains represented by visibleItems so the normal roster keeps its canonical rows. */}
        {visibleItems.map((item) => { const name = item.person.status === "AVAILABLE" ? `${item.person.firstName} ${item.person.lastName}` : "Identidad no disponible"; const expanded = expandedMembershipId === item.membershipId; return <li key={item.membershipId} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <button type="button" aria-expanded={expanded} aria-controls={`member-details-${item.membershipId}`} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => setExpandedMembershipId(expanded ? null : item.membershipId)}>
            <span className="min-w-0"><span className="block break-words font-semibold">{name}</span><span className="mt-1 block break-words text-sm text-[var(--text-muted)]">{item.cargo ?? "Sin cargo"}</span></span><span aria-hidden="true" className="shrink-0 text-xl">{expanded ? "−" : "+"}</span>
          </button>
          {expanded ? <div id={`member-details-${item.membershipId}`} className="border-t border-[var(--border)] px-4 pb-4 pt-3"><p className="text-sm text-[var(--text-muted)]">Primera incorporación: <time dateTime={item.joinedAt}>{new Date(item.joinedAt).toLocaleDateString("es-AR")}</time></p><div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap"><button type="button" disabled={busy} className="min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold disabled:opacity-60" onClick={(event) => void openCargo(item.membershipId, event.currentTarget)}>Editar cargo</button>{item.person.status === "AVAILABLE" ? <button type="button" disabled={busy} aria-label={`Finalizar Membresía de ${name}`} className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 disabled:opacity-60" onClick={(event) => void openFinalization(item, event.currentTarget)}>Finalizar Membresía</button> : null}</div></div> : null}
        </li>; })}
      </ul> : null}
      {!activeSearch && status === "ready" && nextCursor ? <button type="button" disabled={loadingNext || busy} className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold disabled:opacity-60" onClick={() => void load(nextCursor, true)}>{loadingNext ? "Cargando más…" : "Cargar más"}</button> : null}
      {activeSearch && searchStatus === "ready" && searchCursor ? <button type="button" disabled={loadingNext || busy} className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold disabled:opacity-60" onClick={() => void load(searchCursor, true, activeSearch)}>{loadingNext ? "Cargando más…" : "Cargar más resultados"}</button> : null}
      {preparedCargo?.groupId === groupId && ["editing", "submitting", "recoverable"].includes(cargoPhase) ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div ref={cargoDialogRef} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="cargo-title" aria-describedby="cargo-help" onKeyDown={cargoDialogKeyDown}><h3 id="cargo-title" className="break-words text-lg font-semibold">Editar cargo de {preparedCargo.name}</h3><p id="cargo-help" className="mt-2 text-sm text-[var(--text-muted)]">El cargo es descriptivo y no otorga permisos.</p><label htmlFor="membership-cargo" className="mt-4 block text-sm font-semibold">Cargo</label><input ref={cargoInputRef} id="membership-cargo" value={cargoDraft} disabled={["submitting", "recoverable"].includes(cargoPhase)} aria-invalid={Boolean(cargoError)} aria-describedby="cargo-help cargo-count" maxLength={160} className="mt-2 min-h-11 w-full rounded-lg border px-3 py-2" onChange={(event) => { setCargoDraft(event.target.value); setCargoError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void submitCargo(false); } }} /><p id="cargo-count" className="mt-1 text-right text-xs text-[var(--text-muted)]">{cargoLength(canonicalCargo(cargoDraft))}/80</p>{cargoError ? <p role="alert" className="mt-2 text-sm text-red-700">{cargoError}</p> : null}<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={cargoPhase === "submitting"} className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => closeCargo()}>Cancelar</button><button type="button" disabled={["submitting", "recoverable"].includes(cargoPhase) || preparedCargo.originalCargo === null} className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800 disabled:opacity-50" onClick={() => void submitCargo(true)}>Quitar</button><button type="button" disabled={cargoPhase === "submitting"} className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={() => void submitCargo(false)}>{cargoPhase === "recoverable" ? "Reintentar la misma edición" : cargoPhase === "submitting" ? "Guardando…" : "Guardar"}</button></div></div></div> : null}
      {prepared && ["confirmation", "submitting", "recoverable"].includes(phase) ? <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7" role="alertdialog" aria-modal="true" aria-labelledby="finalize-membership-title" aria-describedby="finalize-membership-description" onKeyDown={finalizationKeyDown}><h3 id="finalize-membership-title" className="break-words text-lg font-semibold">Finalizar Membresía de {prepared.firstName} {prepared.lastName}</h3><p id="finalize-membership-description" className="mt-3 text-sm leading-6">Se finalizará su pertenencia actual a este Grupo. Su Persona e historia se conservan.</p>{actionError ? <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p> : null}<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><button ref={cancelRef} type="button" disabled={phase === "submitting"} className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => closeIntent()}>Cancelar</button><button ref={confirmRef} type="button" disabled={phase === "submitting"} className="min-h-11 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white" onClick={() => void confirmFinalization()}>{phase === "recoverable" ? "Reintentar la misma finalización" : phase === "submitting" ? "Finalizando…" : "Sí, finalizar Membresía"}</button></div></div></div> : null}
    </div>
  </section>;
}
