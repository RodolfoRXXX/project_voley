"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useConfirm } from "@/components/confirmModal/ConfirmProvider";
import { useAuth } from "@/hooks/useAuth";
import { usePerson } from "@/hooks/usePerson";
import { listOwnGroups } from "@/services/groupsService";
import { listMyCurrentGroupMemberships } from "@/services/membershipsService";

type ContextOption = { groupId: string; groupName: string; owner: boolean; membership: boolean };
type AlternativesState = { scopeKey: string; items: ContextOption[]; complete: boolean; error: string };

function mergeContext(contexts: Map<string, ContextOption>, next: ContextOption) {
  const current = contexts.get(next.groupId);
  contexts.set(next.groupId, current ? {
    groupId: next.groupId,
    groupName: current.owner ? current.groupName : next.groupName,
    owner: current.owner || next.owner,
    membership: current.membership || next.membership,
  } : next);
}

async function loadGroupAlternatives(current: ContextOption, membershipCoverage: "available" | "empty" | "unavailable"): Promise<Omit<AlternativesState, "scopeKey">> {
  const contexts = new Map<string, ContextOption>();
  mergeContext(contexts, current);
  let complete = true;
  let ownerFailed = false;
  let membershipFailed = membershipCoverage === "unavailable";

  try {
    const owned = await listOwnGroups();
    owned.items.forEach((group) => mergeContext(contexts, { groupId: group.id, groupName: group.nombre, owner: true, membership: false }));
  } catch {
    complete = false;
    ownerFailed = true;
  }

  if (membershipCoverage === "available") {
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    try {
      do {
        const page = await listMyCurrentGroupMemberships({ pageSize: 20, ...(cursor ? { cursor } : {}) });
        page.items.forEach((item) => mergeContext(contexts, { groupId: item.group.id, groupName: item.group.nombre, owner: false, membership: true }));
        const next = page.nextCursor ?? undefined;
        if (next && seenCursors.has(next)) throw new Error("MEMBERSHIP_CURSOR_REPEATED");
        if (next) seenCursors.add(next);
        cursor = next;
      } while (cursor);
    } catch {
      complete = false;
      membershipFailed = true;
    }
  } else if (membershipCoverage === "unavailable") {
    complete = false;
  }

  return {
    items: [...contexts.values()].sort((left, right) => left.groupName.localeCompare(right.groupName, "es") || left.groupId.localeCompare(right.groupId)),
    complete,
    error: ownerFailed || membershipFailed
      ? "No pudimos cargar todas las alternativas. Podés seguir usando este Grupo y reintentar."
      : "",
  };
}

function contextLabel(option: ContextOption) {
  if (option.owner && option.membership) return "Administrás · Integrás";
  if (option.owner) return "Administrás";
  if (option.membership) return "Integrás";
  return "Acceso delegado";
}

function destinationFor(pathname: string, target: ContextOption) {
  const base = `/dashboard/groups/${target.groupId}`;
  if (pathname.endsWith("/personal-economy") && target.membership) return `${base}/personal-economy`;
  if (pathname.endsWith("/membership") && target.membership) return `${base}/membership`;
  if (pathname.endsWith("/economy") && target.owner) return `${base}/economy`;
  if (pathname.includes("/seasons") && target.owner) return `${base}/seasons`;
  if (pathname.includes("/members") && target.owner) return `${base}/members`;
  if (target.owner) return base;
  if (target.membership) return `${base}/membership`;
  return `${base}/economy`;
}

export function GroupSwitcher({ groupId, groupName, owner, membership, hasPendingOperation = false, blockContextChange = false }: { groupId: string; groupName: string; owner: boolean; membership: boolean; hasPendingOperation?: boolean; blockContextChange?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { firebaseUser } = useAuth();
  const { personStatus, personAccountId } = usePerson();
  const current = useMemo<ContextOption>(() => ({ groupId, groupName, owner, membership }), [groupId, groupName, membership, owner]);
  const scopedStatus = personAccountId === firebaseUser?.uid ? personStatus : "loading";
  const coverage = scopedStatus === "ready" ? "available" : scopedStatus === "empty" ? "empty" : ["error", "inconsistent", "sessionInvalid"].includes(scopedStatus) ? "unavailable" : null;
  const scopeKey = `${firebaseUser?.uid ?? ""}\0${groupId}\0${groupName}\0${owner}\0${membership}\0${personAccountId ?? ""}\0${scopedStatus}`;
  const [loadedAlternatives, setLoadedAlternatives] = useState<AlternativesState>({ scopeKey: "", items: [current], complete: false, error: "" });
  const [open, setOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [switchError, setSwitchError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let active = true;
    if (!coverage) return () => { active = false; };
    void loadGroupAlternatives(current, coverage).then((result) => {
      if (!active) return;
      setLoadedAlternatives({ ...result, scopeKey });
      setRequestLoading(false);
    }, () => {
      if (!active) return;
      setLoadedAlternatives({ scopeKey, items: [current], complete: false, error: "No pudimos cargar todas las alternativas. Podés seguir usando este Grupo y reintentar." });
      setRequestLoading(false);
    });
    return () => { active = false; };
  }, [coverage, current, reloadVersion, scopeKey]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  const alternatives = loadedAlternatives.scopeKey === scopeKey
    ? loadedAlternatives
    : { scopeKey, items: [current], complete: false, error: "" };
  const loading = loadedAlternatives.scopeKey !== scopeKey || requestLoading;
  const showTrigger = loading || !alternatives.complete || alternatives.items.length > 1;

  function focusItem(index: number) {
    const count = alternatives.items.length;
    if (!count) return;
    itemRefs.current[(index + count) % count]?.focus();
  }

  async function changeGroup(target: ContextOption) {
    if (target.groupId === groupId) { setOpen(false); triggerRef.current?.focus(); return; }
    if (blockContextChange) {
      setSwitchError("Hay una operación con resultado incierto. Recuperala antes de cambiar de Grupo.");
      return;
    }
    if (hasPendingOperation && !await confirm({ message: "Hay un borrador o una operación pendiente. Si cambiás de Grupo, se descartarán los datos locales.", confirmText: "Cambiar y descartar", cancelText: "Permanecer", variant: "warning" })) return;
    setOpen(false);
    router.push(destinationFor(pathname, target));
  }

  if (!showTrigger) return <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl">{groupName}</h1>;

  return (
    <div ref={rootRef} className="relative min-w-0 max-w-full">
      <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl"><button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg text-left hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cambiar de Grupo. Grupo actual: ${groupName}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            queueMicrotask(() => focusItem(event.key === "ArrowDown" ? 0 : alternatives.items.length - 1));
          }
        }}
      >
        <span className="min-w-0 break-words">{groupName}</span>
        <span aria-hidden="true" className={`shrink-0 text-base transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button></h1>
      {open ? <div
        className="absolute left-0 z-30 mt-2 block max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-base font-normal shadow-xl"
        onKeyDown={(event) => {
          const index = itemRefs.current.findIndex((item) => item === document.activeElement);
          if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
          else if (event.key === "ArrowDown") { event.preventDefault(); focusItem(index + 1); }
          else if (event.key === "ArrowUp") { event.preventDefault(); focusItem(index - 1); }
          else if (event.key === "Home") { event.preventDefault(); focusItem(0); }
          else if (event.key === "End") { event.preventDefault(); focusItem(alternatives.items.length - 1); }
        }}
      >
        <div role="menu" aria-label="Grupos disponibles">{alternatives.items.map((option, index) => <button
          ref={(node) => { itemRefs.current[index] = node; }}
          key={option.groupId}
          type="button"
          role="menuitem"
          aria-current={option.groupId === groupId ? "true" : undefined}
          className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-orange-600 ${option.groupId === groupId ? "bg-orange-50 text-orange-900" : "hover:bg-[var(--background)]"}`}
          onClick={() => void changeGroup(option)}
        >
          <span className="block break-words font-semibold">{option.groupName}</span>
          <span className="block break-words text-xs text-[var(--text-muted)]">{contextLabel(option)}{option.groupId === groupId ? " · Actual" : ""}</span>
        </button>)}</div>
        {loading ? <div className="block px-3 py-2 text-sm text-[var(--text-muted)]">Cargando alternativas…</div> : null}
        {alternatives.error ? <div className="mt-1 block border-t border-[var(--border)] px-3 pt-3 text-sm" role="alert">
          <span className="block text-amber-800">{alternatives.error}</span>
          <button type="button" className="mt-2 min-h-11 rounded-lg border px-3 font-semibold focus-visible:outline-2 focus-visible:outline-orange-600" onClick={() => { setRequestLoading(true); setReloadVersion((version) => version + 1); }}>Reintentar alternativas</button>
        </div> : null}
        {switchError ? <div className="mt-1 block px-3 py-2 text-sm text-red-700" role="alert">{switchError}</div> : null}
      </div> : null}
    </div>
  );
}
