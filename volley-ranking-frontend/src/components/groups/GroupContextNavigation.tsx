"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function GroupContextNavigation({ groupId, owner, membership, capabilities, activeGroup = true }: { groupId: string; owner: boolean; membership: boolean; capabilities: { treasury: boolean; review: boolean; record: boolean }; activeGroup?: boolean }) {
  const pathname = usePathname();
  const links = useMemo(() => owner ? [
    { label: "Resumen", href: `/dashboard/groups/${groupId}` },
    ...(membership ? [
      { label: "Mi participación", href: `/dashboard/groups/${groupId}/membership` },
      { label: "Economía personal", href: `/dashboard/groups/${groupId}/personal-economy` },
    ] : []),
    { label: "Economía del Grupo", href: `/dashboard/groups/${groupId}/economy` },
    { label: "Temporada", href: `/dashboard/groups/${groupId}/seasons` },
    ...(activeGroup ? [{ label: "Integrantes", href: `/dashboard/groups/${groupId}/members` }] : []),
  ] : [
    ...(membership ? [{ label: "Mi participación", href: `/dashboard/groups/${groupId}/membership` }] : []),
    ...(membership ? [{ label: "Economía personal", href: `/dashboard/groups/${groupId}/personal-economy` }] : []),
    ...((capabilities.treasury || capabilities.review || capabilities.record) ? [{ label: "Economía del Grupo", href: `/dashboard/groups/${groupId}/economy` }] : []),
  ], [activeGroup, capabilities.record, capabilities.review, capabilities.treasury, groupId, membership, owner]);

  return (
    <section className="mb-6 min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 pt-2 sm:px-5" aria-label="Navegación del Grupo">
      <nav className="flex min-w-0 flex-wrap gap-x-1" aria-label="Secciones del Grupo">
        {links.map((link) => {
          const base = `/dashboard/groups/${groupId}`;
          const active = link.label === "Resumen"
            ? pathname === base
            : link.label === "Temporada"
              ? pathname.startsWith(`${base}/seasons`)
              : pathname === link.href;
          return <Link key={link.label} href={link.href} aria-current={active ? "page" : undefined} className={`relative -mb-px inline-flex min-h-11 min-w-0 max-w-full items-center justify-center border-b-2 px-3 py-2 text-center text-sm font-semibold focus-visible:z-10 focus-visible:rounded-t focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:px-4 ${active ? "border-orange-500 text-orange-800" : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>{link.label}</Link>;
        })}
      </nav>
    </section>
  );
}
