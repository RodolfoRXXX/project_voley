"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { groupSportLabel } from "@/lib/groups/groupSports";
import { getGroupErrorMessage, getGroupErrorReason, listExploreGroups, type ExploreGroup } from "@/services/groupsService";

export default function ExploreGroupsPage() {
  const [items, setItems] = useState<ExploreGroup[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [personRequired, setPersonRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextCursor?: string) => {
    setLoading(true); setError("");
    try {
      const page = await listExploreGroups({ pageSize: 12, ...(nextCursor ? { cursor: nextCursor } : {}) });
      setItems((current) => nextCursor ? [...current, ...page.items.filter((candidate) => !current.some((item) => item.id === candidate.id))] : page.items);
      setCursor(page.nextCursor);
      setPersonRequired(page.viewer.personStatus === "required");
    } catch (cause) { setError(getGroupErrorMessage(getGroupErrorReason(cause))); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <GroupPageShell backHref="/dashboard/groups" title="Explorar grupos" description="Grupos activos publicados que todavía no administrás ni integrás.">
    {personRequired ? <section className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p>Podés explorar los grupos, pero necesitás completar tu ficha personal antes de solicitar ingreso.</p><Link href="/profile/person" className="mt-2 inline-flex min-h-11 items-center font-semibold text-orange-800 underline underline-offset-2">Completar ficha personal</Link></section> : null}
    {error ? <section role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-11 rounded-lg border border-red-400 px-4 font-semibold">Reintentar</button></section> : null}
    {!error && !loading && items.length === 0 ? <section className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center"><h2 className="text-lg font-semibold">No hay grupos disponibles para explorar</h2><p className="mt-2 text-sm text-[var(--text-muted)]">Los grupos propios, los que ya integrás y los no publicados no aparecen acá.</p></section> : null}
    {items.length ? <section aria-label="Grupos publicados" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((group) => <article key={group.id} className="flex min-h-44 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{groupSportLabel(group.deporte)}</p><h2 className="mt-2 break-words text-lg font-semibold">{group.nombre}</h2><div className="mt-auto pt-5">{group.ownRequestStatus === "pending" ? <><p role="status" className="mb-2 text-sm font-semibold text-red-700">Tu solicitud de ingreso está pendiente</p><Link href={`/join/groups/${group.id}?source=explore`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-orange-500 px-4 text-center font-semibold text-orange-800 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">Ver solicitud</Link></> : personRequired ? <><button type="button" disabled className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-orange-600 px-4 font-semibold text-white opacity-50">Solicitar ingreso</button><Link href="/profile/person" className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-orange-800 underline">Completá tu ficha para solicitar</Link></> : <Link href={`/join/groups/${group.id}?source=explore`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-orange-600 px-4 font-semibold text-white hover:bg-orange-700">Ver y solicitar ingreso</Link>}</div></article>)}</section> : null}
    {loading ? <p role="status" aria-live="polite" className="mt-5 text-sm text-[var(--text-muted)]">Cargando grupos publicados…</p> : null}
    {!loading && cursor ? <button type="button" onClick={() => void load(cursor)} className="mt-6 min-h-11 rounded-lg border border-orange-500 px-5 font-semibold text-orange-800">Cargar más</button> : null}
  </GroupPageShell>;
}
