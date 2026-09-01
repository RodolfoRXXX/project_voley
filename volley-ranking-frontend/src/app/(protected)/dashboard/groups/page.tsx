"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { GroupCard } from "@/components/groups/GroupCard";
import { GroupLoading } from "@/components/groups/GroupLoading";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { MyCurrentGroupMembershipsSection } from "@/components/memberships/MyCurrentGroupMembershipsSection";
import { getGroupErrorMessage, getGroupErrorReason, listOwnGroups } from "@/services/groupsService";
import type { OwnGroup } from "@/types/OwnGroup";

export default function OwnGroupsPage() {
  const [items, setItems] = useState<OwnGroup[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

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

  return (
    <GroupPageShell title="Mis Grupos" description="Administrá los Grupos que te pertenecen por ownership, sin depender de roles globales.">
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
      {status === "ready" && items.length > 0 ? <div className="grid gap-4">{items.map((group) => <GroupCard key={group.id} group={group} />)}</div> : null}
      </section>
      <MyCurrentGroupMembershipsSection />
    </GroupPageShell>
  );
}
