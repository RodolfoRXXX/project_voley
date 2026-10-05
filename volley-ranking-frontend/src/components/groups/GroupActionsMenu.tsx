"use client";

import { useEffect, useRef, useState } from "react";
import { ArchiveGroupDialog } from "./ArchiveGroupDialog";
import { DeleteGroupDialog } from "./DeleteGroupDialog";
import { EditGroupNameDialog } from "./EditGroupNameDialog";
import type { OwnGroup, OwnGroupActive, OwnGroupArchived } from "@/types/OwnGroup";

type Action = "edit" | "archive" | "delete" | null;
const labels = ["Editar nombre", "Archivar grupo", "Eliminar grupo"] as const;

function ActionIcon({ kind }: { kind: "more" | "edit" | "archive" | "delete" }) {
  const paths = {
    more: <><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
    archive: <><path d="M4 7h16v13H4z" /><path d="M3 3h18v4H3zM9 11h6" /></>,
    delete: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={kind === "more" ? "h-5 w-5" : "h-4 w-4"} fill={kind === "more" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

export function GroupActionsMenu({ group, onPrepared, onUpdated, onArchived, onDeleted, onAccessLost }: {
  group: OwnGroupActive;
  onPrepared: (group: OwnGroupActive) => void;
  onUpdated: (group: OwnGroup, message: string) => void;
  onArchived: (group: OwnGroupArchived, message: string) => void;
  onDeleted: (message: string) => void;
  onAccessLost: (message: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false); const [activeIndex, setActiveIndex] = useState(0); const [action, setAction] = useState<Action>(null);
  const root = useRef<HTMLDivElement>(null); const button = useRef<HTMLButtonElement>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);

  const openMenu = (index: number) => { setAction(null); setActiveIndex(index); setMenuOpen(true); queueMicrotask(() => items.current[index]?.focus()); };
  const closeMenu = (restoreFocus: boolean) => { setMenuOpen(false); if (restoreFocus) queueMicrotask(() => button.current?.focus()); };
  const choose = (next: Exclude<Action, null>) => { setMenuOpen(false); setAction(next); };

  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (root.current?.contains(event.target as Node)) return;
      const focusWasInside = root.current?.contains(document.activeElement);
      setMenuOpen(false);
      if (focusWasInside) window.setTimeout(() => {
        if (document.activeElement === document.body || root.current?.contains(document.activeElement)) button.current?.focus();
      }, 0);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menuOpen]);
  const move = (index: number) => { const normalized = (index + labels.length) % labels.length; setActiveIndex(normalized); items.current[normalized]?.focus(); };
  const menuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); move(activeIndex + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); move(activeIndex - 1); }
    else if (event.key === "Home") { event.preventDefault(); move(0); }
    else if (event.key === "End") { event.preventDefault(); move(labels.length - 1); }
    else if (event.key === "Escape") { event.preventDefault(); closeMenu(true); }
    else if (event.key === "Tab") closeMenu(false);
  };

  return <>
    <div ref={root} className="relative inline-flex">
      <button ref={button} type="button" aria-label="Acciones del grupo" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => menuOpen ? closeMenu(true) : openMenu(0)} onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); openMenu(0); }
        else if (event.key === "ArrowUp") { event.preventDefault(); openMenu(labels.length - 1); }
        else if (event.key === "Escape" && menuOpen) { event.preventDefault(); closeMenu(true); }
      }} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-sm hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"><ActionIcon kind="more" /></button>
      {menuOpen ? <div role="menu" aria-label="Acciones del grupo" onKeyDown={menuKeyDown} className="absolute right-0 top-12 z-40 max-h-[min(18rem,70vh)] w-[min(16rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-300 bg-white p-2 shadow-xl">
        <button ref={(node) => { items.current[0] = node; }} type="button" role="menuitem" tabIndex={activeIndex === 0 ? 0 : -1} onFocus={() => setActiveIndex(0)} onClick={() => choose("edit")} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-orange-500"><ActionIcon kind="edit" />Editar nombre</button>
        <button ref={(node) => { items.current[1] = node; }} type="button" role="menuitem" tabIndex={activeIndex === 1 ? 0 : -1} onFocus={() => setActiveIndex(1)} onClick={() => choose("archive")} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-orange-500"><ActionIcon kind="archive" />Archivar grupo</button>
        <div className="my-1 border-t border-slate-300" aria-hidden="true" />
        <button ref={(node) => { items.current[2] = node; }} type="button" role="menuitem" tabIndex={activeIndex === 2 ? 0 : -1} onFocus={() => setActiveIndex(2)} onClick={() => choose("delete")} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"><ActionIcon kind="delete" /><span>Eliminar grupo <span className="sr-only">Acción destructiva</span></span></button>
      </div> : null}
    </div>
    <EditGroupNameDialog group={group} open={action === "edit"} onOpenChange={(open) => setAction(open ? "edit" : null)} returnFocusRef={button} onUpdated={onUpdated} onAccessLost={onAccessLost} />
    <ArchiveGroupDialog group={group} open={action === "archive"} onOpenChange={(open) => setAction(open ? "archive" : null)} returnFocusRef={button} onPrepared={onPrepared} onArchived={onArchived} onAccessLost={onAccessLost} />
    <DeleteGroupDialog group={group} open={action === "delete"} onOpenChange={(open) => setAction(open ? "delete" : null)} returnFocusRef={button} onPrepared={onPrepared} onDeleted={onDeleted} onAccessLost={onAccessLost} />
  </>;
}
