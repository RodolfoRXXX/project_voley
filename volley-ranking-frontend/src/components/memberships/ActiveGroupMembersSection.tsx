"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getMembershipErrorMessage, getMembershipErrorReason, listActiveGroupMembersForOwnedGroup } from "@/services/membershipsService";
import type { ActiveGroupMember, ActiveGroupMembersScope } from "@/types/ActiveGroupMember";
import type { MembershipErrorReason } from "@/types/OwnMembership";

type Status = "loading" | "ready" | "error";

export function ActiveGroupMembersSection({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<ActiveGroupMember[]>([]);
  const [scope, setScope] = useState<ActiveGroupMembersScope | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [retryCursor, setRetryCursor] = useState<string | undefined>();
  const [status, setStatus] = useState<Status>("loading");
  const [reason, setReason] = useState<MembershipErrorReason | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const region = useRef<HTMLDivElement>(null);

  const focusRegion = useCallback(() => queueMicrotask(() => region.current?.focus()), []);

  const load = useCallback(async (cursor?: string, append = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (append) setLoadingNext(true); else setStatus("loading");
    setReason(null);
    setNotice("");
    setRetryCursor(cursor);
    try {
      let result;
      try {
        result = await listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20, ...(cursor ? { cursor } : {}) });
      } catch (cause) {
        const nextReason = getMembershipErrorReason(cause);
        if (cursor && nextReason === "ROSTER_CONTEXT_CHANGED") {
          result = await listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20 });
          append = false;
          setNotice("La Temporada abierta cambió. Reiniciamos el listado desde la primera página.");
        } else {
          throw cause;
        }
      }
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setScope(result.scope);
      setNextCursor(result.nextCursor);
      setRetryCursor(undefined);
      setStatus("ready");
      if (append && result.items.length) setNotice(`Se agregaron ${result.items.length} integrantes.`);
    } catch (cause) {
      const nextReason = getMembershipErrorReason(cause);
      if (nextReason === "GROUP_NOT_ACCESSIBLE") {
        setItems([]);
        setScope(null);
        setNextCursor(null);
      }
      setReason(nextReason);
      setStatus("error");
    } finally {
      inFlight.current = false;
      setLoadingNext(false);
      focusRegion();
    }
  }, [focusRegion, groupId]);

  useEffect(() => {
    let active = true;
    void listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20 }).then(
      (result) => {
        if (!active) return;
        setItems(result.items);
        setScope(result.scope);
        setNextCursor(result.nextCursor);
        setStatus("ready");
      },
      (cause) => {
        if (!active) return;
        setReason(getMembershipErrorReason(cause));
        setStatus("error");
      }
    );
    return () => { active = false; };
  }, [groupId]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="active-members-heading">
      <h2 id="active-members-heading" className="text-lg font-semibold">Integrantes</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">Lista informativa de la Temporada abierta.</p>
      <div ref={region} tabIndex={-1} aria-live="polite" aria-busy={status === "loading" || loadingNext} className="mt-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
        {notice ? <p role="status" className="mb-3 text-sm text-emerald-700">{notice}</p> : null}
        {status === "loading" ? <div role="status" aria-label="Cargando integrantes" className="grid gap-3"><span>Cargando integrantes…</span>{[0, 1, 2].map((value) => <span key={value} aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}
        {status === "error" && reason ? <div role="alert"><p className="text-sm text-red-700">{getMembershipErrorMessage(reason)}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load(retryCursor, Boolean(retryCursor))}>Reintentar</button></div> : null}
        {status === "ready" && scope?.status === "NO_OPEN_SEASON" ? <p className="text-sm leading-6 text-[var(--text-muted)]">No hay un roster actual porque el Grupo no posee una Temporada abierta.</p> : null}
        {status === "ready" && scope?.status === "OPEN_SEASON" && items.length === 0 ? <p className="text-sm leading-6 text-[var(--text-muted)]">Todavía no hay integrantes activos en la Temporada abierta.</p> : null}
        {items.length ? <ul className="grid gap-3 sm:grid-cols-2">{items.map((item) => {
          const name = item.person.status === "AVAILABLE"
            ? `${item.person.firstName} ${item.person.lastName}`
            : "Identidad no disponible";
          return <li key={item.membershipId} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold">{name}</p>{item.isOwner ? <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">Owner</span> : null}</div><p className="mt-2 text-sm text-[var(--text-muted)]">Primera incorporación: <time dateTime={item.joinedAt}>{new Date(item.joinedAt).toLocaleDateString("es-AR")}</time></p></li>;
        })}</ul> : null}
        {status === "ready" && nextCursor ? <button type="button" disabled={loadingNext} className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load(nextCursor, true)}>{loadingNext ? "Cargando más…" : "Cargar más"}</button> : null}
      </div>
    </section>
  );
}
