import Link from "next/link";
import type { PresentableGroup } from "@/services/groupsPresentation.mjs";
import { groupSportLabel } from "@/lib/groups/groupSports";
import type { GroupSport } from "@/types/OwnGroup";

export function GroupCard({ group, actionableTaskCount }: { group: PresentableGroup; actionableTaskCount?: number }) {
  const href = group.administers ? `/dashboard/groups/${group.groupId}` : `/dashboard/groups/${group.groupId}/membership`;
  return (
    <Link className="group flex min-h-28 min-w-0 items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-orange-400 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600" href={href}>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-orange-600">{groupSportLabel(group.sport as GroupSport)} · {group.state === "activo" ? "Activo" : group.state}</span>
        <span className="mt-1 block break-words text-lg font-semibold">{group.name}</span>
        <span className="mt-3 flex flex-wrap gap-2">
          {group.administers ? <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">Administrás</span> : null}
          {group.participates ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Integrás</span> : null}
          {typeof actionableTaskCount === "number" && actionableTaskCount > 0 ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">{actionableTaskCount === 1 ? "1 pendiente" : `${actionableTaskCount} pendientes`}</span> : null}
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-2xl text-[var(--text-muted)] transition group-hover:translate-x-0.5">›</span>
    </Link>
  );
}
