"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export type GroupEconomyTabId = "concepts" | "debts" | "notices" | "history";
export type GroupEconomyTab = { id: GroupEconomyTabId; label: string };

export function GroupEconomyTabs({ tabs, activeTab }: { tabs: GroupEconomyTab[]; activeTab: GroupEconomyTabId }) {
  const router = useRouter();
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  function moveFocus(event: React.KeyboardEvent<HTMLAnchorElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    router.push(`?tab=${tabs[next].id}`, { scroll: false });
    queueMicrotask(() => tabRefs.current[next]?.focus());
  }
  return <nav className="grid border-b border-[var(--border)] px-2 sm:px-4" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} aria-label="Vistas de Economía" role="tablist">{tabs.map((item, index) => <Link id={`group-economy-tab-${item.id}`} ref={(node) => { tabRefs.current[index] = node; }} key={item.id} role="tab" tabIndex={activeTab === item.id ? 0 : -1} aria-selected={activeTab === item.id} aria-controls={`group-economy-panel-${item.id}`} onKeyDown={(event) => moveFocus(event, index)} className={`relative -mb-px inline-flex min-h-12 min-w-0 items-center justify-center border-b-2 px-1 py-2 text-center text-sm font-semibold leading-tight focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:px-4 ${activeTab === item.id ? "border-orange-500 bg-[var(--background)] text-orange-800" : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"}`} href={`?tab=${item.id}`}>{item.label}</Link>)}</nav>;
}
