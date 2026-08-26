import Link from "next/link";
import type { OwnGroup } from "@/types/OwnGroup";

export function GroupCard({ group }: { group: OwnGroup }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Vóley · Activo</p>
          <h2 className="mt-1 text-xl font-semibold">{group.nombre}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Sos Owner de este Grupo.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2" href={`/dashboard/groups/${group.id}`}>
          Ver Grupo
        </Link>
      </div>
    </article>
  );
}
