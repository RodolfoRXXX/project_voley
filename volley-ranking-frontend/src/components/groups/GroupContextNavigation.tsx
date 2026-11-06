"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

export function GroupContextNavigation({ groupId, owner, membership, capabilities, activeGroup = true }: { groupId: string; owner: boolean; membership: boolean; capabilities: { treasury: boolean; review: boolean; record: boolean }; activeGroup?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
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

  const activeHref = useMemo(() => {
    const base = `/dashboard/groups/${groupId}`;
    return links.find((link) => link.label === "Temporada"
      ? pathname.startsWith(`${base}/seasons`)
      : pathname === link.href)?.href ?? links[0]?.href ?? base;
  }, [groupId, links, pathname]);

  return (
    <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Navegación del Grupo">
      <label className="block text-sm font-medium md:hidden">
        Sección del Grupo
        <select value={activeHref} onChange={(event) => router.push(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border bg-[var(--background)] px-3">
          {links.map((link) => <option key={link.href} value={link.href}>{link.label}</option>)}
        </select>
      </label>
      <nav className="hidden flex-wrap gap-2 md:flex" aria-label="Secciones del Grupo">
        {links.map((link) => {
          const base = `/dashboard/groups/${groupId}`;
          const active = link.label === "Resumen"
            ? pathname === base
            : link.label === "Temporada"
              ? pathname.startsWith(`${base}/seasons`)
              : pathname === link.href;
          return <Link key={link.label} href={link.href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold ${active ? "border-orange-500 bg-orange-50 text-orange-800" : "border-[var(--border)]"}`}>{link.label}</Link>;
        })}
      </nav>
    </section>
  );
}
