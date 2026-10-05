"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { GroupCard } from "@/components/groups/GroupCard";
import { GroupLoading } from "@/components/groups/GroupLoading";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { MyCurrentGroupMembershipsSection } from "@/components/memberships/MyCurrentGroupMembershipsSection";
import { OwnGroupMembershipHistorySection } from "@/components/memberships/OwnGroupMembershipHistorySection";
import { getGroupErrorMessage, getGroupErrorReason, listOwnGroups } from "@/services/groupsService";
import type { OwnGroup } from "@/types/OwnGroup";

export default function OwnGroupsPage() {
  const searchParams = useSearchParams();
  const showRetirementNotice = searchParams.get("notice") === "legacy-group-capability-retired";
  const showDeletedRetryNotice = searchParams.get("notice") === "created-group-was-deleted";
  const showDeletionNotice = searchParams.get("notice") === "group-deleted";
  const resultNotice = useRef<HTMLParagraphElement>(null);
  const [items, setItems] = useState<OwnGroup[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const activeItems = items.filter((group) => group.estado === "activo");
  const archivedItems = items.filter((group) => group.estado === "archivado");

  const load = useCallback(async () => {
    try {
      setItems((await listOwnGroups()).items);
      setStatus("ready");
    } catch (cause) {
      setError(getGroupErrorMessage(getGroupErrorReason(cause)));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listOwnGroups().then(
      (result) => {
        if (!active) return;
        setItems(result.items);
        setStatus("ready");
      },
      (cause) => {
        if (!active) return;
        setError(getGroupErrorMessage(getGroupErrorReason(cause)));
        setStatus("error");
      }
    );
    return () => { active = false; };
  }, []);
  useEffect(() => { if (showDeletionNotice) resultNotice.current?.focus(); }, [showDeletionNotice]);

  return (
    <GroupPageShell title="Mis Grupos" description="Administrá los Grupos que te pertenecen por ownership, sin depender de roles globales.">
      {showRetirementNotice ? (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          La vista anterior ya no está disponible. Usá los Grupos y Membresías vigentes.
        </p>
      ) : null}
      {showDeletedRetryNotice ? <p role="status" tabIndex={-1} className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950">La creación anterior fue confirmada y el Grupo se eliminó después. Iniciá una creación nueva si querés otro Grupo.</p> : null}
      {showDeletionNotice ? <p ref={resultNotice} role="status" tabIndex={-1} className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">El Grupo fue eliminado definitivamente y el cupo quedó disponible para una creación nueva.</p> : null}
      <section aria-labelledby="owned-groups-title" className="space-y-4">
      <div>
        <h2 id="owned-groups-title" className="text-2xl font-semibold">Grupos que administrás</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Organizaciones que te pertenecen por ownership.</p>
      </div>
      {status === "loading" ? <GroupLoading /> : null}
      {status === "error" ? (
        <section aria-live="polite" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
          <p>{error}</p>
          <button className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold" onClick={() => { setStatus("loading"); setError(""); void load(); }}>Reintentar</button>
        </section>
      ) : null}
      {status === "ready" && items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center sm:p-10">
          <h2 className="text-xl font-semibold">Todavía no tenés un Grupo propio</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">Podés crear una organización válida sin Persona, integrantes ni Temporada. Vas a administrarla como Owner.</p>
          <Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700" href="/dashboard/groups/new">Crear Grupo</Link>
        </section>
      ) : null}
      {status === "ready" && activeItems.length > 0 ? <div className="grid gap-4">{activeItems.map((group) => <GroupCard key={group.id} group={group} />)}</div> : null}
      </section>
      {status === "ready" && archivedItems.length > 0 ? <section aria-labelledby="archived-groups-title" className="space-y-4"><div><h2 id="archived-groups-title" className="text-2xl font-semibold">Archivados</h2><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Grupos conservados para consulta, sin acciones operativas.</p></div><div className="grid gap-4">{archivedItems.map((group) => <GroupCard key={group.id} group={group} />)}</div></section> : null}
      <MyCurrentGroupMembershipsSection />
      <OwnGroupMembershipHistorySection />
    </GroupPageShell>
  );
}
