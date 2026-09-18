"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type PublicGroup = { id: string; name: string; description: string; visibility: "public"; active: true };
type PublicMatch = { id: string; title: string; visibility: "public"; startsAt: string | null; status: string | null };

export default function PublicLegacyGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [payload, setPayload] = useState<{ group: PublicGroup; matches: PublicMatch[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/groups/${encodeURIComponent(groupId)}/public`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "No se pudo cargar el grupo");
      return body as { group: PublicGroup; matches: PublicMatch[] };
    }).then((body) => { if (active) setPayload(body); }).catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [groupId]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link href="/groups" className="text-sm">← Volver a grupos</Link>
      {error ? <p role="alert" className="text-red-600">{error}</p> : null}
      {!payload && !error ? <p role="status">Cargando…</p> : null}
      {payload ? <>
        <header><h1 className="text-3xl font-bold">{payload.group.name}</h1><p className="mt-2 text-[var(--text-muted)]">{payload.group.description || "Sin descripción"}</p></header>
        <section aria-labelledby="public-matches-title"><h2 id="public-matches-title" className="text-xl font-semibold">Partidos públicos</h2>
          {payload.matches.length === 0 ? <p className="mt-3">No hay partidos públicos.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2">{payload.matches.map((match) => <article key={match.id} className="rounded-lg border border-[var(--border)] p-4"><h3 className="font-semibold">{match.title}</h3><p className="mt-1 text-sm">Estado: {match.status || "—"}</p><Link className="mt-3 inline-flex text-sm text-blue-700" href={`/groups/${payload.group.id}/matches/${match.id}`}>Ver partido →</Link></article>)}</div>}
        </section>
      </> : null}
    </main>
  );
}
