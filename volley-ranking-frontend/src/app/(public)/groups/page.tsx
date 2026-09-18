"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PublicLegacyGroup = {
  id: string;
  name: string;
  description: string;
  visibility: "public";
  active: true;
  totalMatches: number;
};

export default function PublicLegacyGroupsPage() {
  const [groups, setGroups] = useState<PublicLegacyGroup[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    void fetch("/api/groups/public").then(async (response) => {
      if (!response.ok) throw new Error("No se pudieron cargar los grupos");
      return response.json() as Promise<{ groups?: PublicLegacyGroup[] }>;
    }).then((payload) => {
      if (!active) return;
      setGroups(payload.groups || []);
      setStatus("ready");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <header><h1 className="text-3xl font-bold">Grupos históricos públicos</h1><p className="mt-2 text-sm text-[var(--text-muted)]">Consulta temporal de partidos públicos asociados.</p></header>
      {status === "loading" ? <p role="status">Cargando…</p> : null}
      {status === "error" ? <p role="alert" className="text-red-600">No se pudieron cargar los grupos.</p> : null}
      {status === "ready" && groups.length === 0 ? <p>No hay grupos públicos disponibles.</p> : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <article key={group.id} className="rounded-lg border border-[var(--border)] p-4">
            <h2 className="font-semibold">{group.name}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{group.description || "Sin descripción"}</p>
            <p className="mt-3 text-xs">Partidos públicos: {group.totalMatches}</p>
            <Link className="mt-4 inline-flex text-sm font-medium text-blue-700" href={`/groups/${encodeURIComponent(group.id)}`}>Ver partidos →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
