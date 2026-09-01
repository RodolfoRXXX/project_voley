"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getMembershipErrorMessage, getMembershipErrorReason, listMyCurrentGroupMemberships } from "@/services/membershipsService";
import type { MyCurrentGroupMembership } from "@/types/MyCurrentGroupMembership";
import type { MembershipErrorReason } from "@/types/OwnMembership";

type Status = "loading" | "ready" | "error" | "person-required";

export function MyCurrentGroupMembershipsSection() {
  const [items, setItems] = useState<MyCurrentGroupMembership[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reason, setReason] = useState<MembershipErrorReason | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [emptyContinuation, setEmptyContinuation] = useState(false);

  const acceptResult = useCallback((result: Awaited<ReturnType<typeof listMyCurrentGroupMemberships>>, continuing: boolean) => {
    setItems((current) => continuing ? [...current, ...result.items] : result.items);
    setNextCursor(result.nextCursor);
    setEmptyContinuation(result.items.length === 0 && result.nextCursor !== null);
    setStatus("ready");
  }, []);

  const acceptError = useCallback((cause: unknown) => {
    const nextReason = getMembershipErrorReason(cause);
    setReason(nextReason);
    setStatus(nextReason === "PERSON_REQUIRED" ? "person-required" : "error");
  }, []);

  const load = useCallback(async (cursor?: string) => {
    const continuing = Boolean(cursor);
    if (continuing) setLoadingNext(true); else setStatus("loading");
    setReason(null);
    try {
      acceptResult(await listMyCurrentGroupMemberships(cursor ? { cursor } : {}), continuing);
    } catch (cause) {
      acceptError(cause);
    } finally {
      setLoadingNext(false);
    }
  }, [acceptError, acceptResult]);

  useEffect(() => {
    let active = true;
    void listMyCurrentGroupMemberships().then(
      (result) => { if (active) acceptResult(result, false); },
      (cause) => { if (active) acceptError(cause); }
    );
    return () => { active = false; };
  }, [acceptError, acceptResult]);

  return (
    <section aria-labelledby="member-groups-title" className="space-y-4">
      <div>
        <h2 id="member-groups-title" className="text-2xl font-semibold">Grupos que integrás</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Pertenencias operativas confirmadas por tu Membresía y la Temporada abierta actual.</p>
      </div>
      <div aria-live="polite" aria-busy={status === "loading" || loadingNext} className="min-w-0">
        {status === "loading" ? <p className="rounded-xl border border-[var(--border)] p-5">Cargando tus pertenencias…</p> : null}
        {status === "person-required" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
            <p>Necesitás vincular tu Persona para consultar los Grupos que integrás.</p>
            <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-500 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" href="/profile/person">Ir a mi Persona</Link>
          </div>
        ) : null}
        {status === "error" ? (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
            <p>{reason ? getMembershipErrorMessage(reason) : "No pudimos cargar tus pertenencias."}</p>
            {reason === "INCOMPATIBLE_STATE" ? <p className="mt-2 text-sm">La información requiere revisión y no se mostrará parcialmente.</p> : null}
            <button className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load()}>Reintentar</button>
          </div>
        ) : null}
        {status === "ready" && items.length === 0 && !nextCursor ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center sm:p-10">
            <h3 className="text-lg font-semibold">No tenés Grupos operativos para mostrar</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Una Membresía aparece cuando está íntegra y coincide con la Temporada abierta actual.</p>
          </div>
        ) : null}
        {items.length > 0 ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {items.map(({ membership, group }) => (
              <article key={membership.id} className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] p-5">
                <h3 className="break-words text-lg font-semibold">{group.nombre}</h3>
                <p className="mt-2 text-sm capitalize text-[var(--text-muted)]">{group.deporte}</p>
                <p className="mt-3 text-sm">Integrás este Grupo mediante una Membresía activa.</p>
              </article>
            ))}
          </div>
        ) : null}
        {status === "ready" && emptyContinuation ? <p className="mt-4 rounded-xl border border-[var(--border)] p-4 text-sm">Esta página no contiene pertenencias operativas, pero todavía hay resultados para revisar.</p> : null}
        {status === "ready" && nextCursor ? (
          <button className="mt-4 min-h-11 rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60" disabled={loadingNext} onClick={() => void load(nextCursor)}>
            {loadingNext ? "Cargando…" : "Ver página siguiente"}
          </button>
        ) : null}
        {status === "ready" && !nextCursor && items.length > 0 ? <p className="mt-4 text-sm text-[var(--text-muted)]">Llegaste al fin de los resultados.</p> : null}
      </div>
    </section>
  );
}
