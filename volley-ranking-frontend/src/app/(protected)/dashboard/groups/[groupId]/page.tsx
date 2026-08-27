"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { GroupLoading } from "@/components/groups/GroupLoading";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { OpenSeasonSection } from "@/components/seasons/OpenSeasonSection";
import { getGroupErrorMessage, getGroupErrorReason, getOwnGroup } from "@/services/groupsService";
import type { OwnGroup } from "@/types/OwnGroup";

export default function OwnGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<OwnGroup | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setGroup((await getOwnGroup(params.groupId)).group);
      setStatus("ready");
    } catch (cause) {
      setError(getGroupErrorMessage(getGroupErrorReason(cause)));
      setStatus("error");
    }
  }, [params.groupId]);

  useEffect(() => {
    let active = true;
    void getOwnGroup(params.groupId).then(
      (result) => {
        if (!active) return;
        setGroup(result.group);
        setStatus("ready");
      },
      (cause) => {
        if (!active) return;
        setError(getGroupErrorMessage(getGroupErrorReason(cause)));
        setStatus("error");
      }
    );
    return () => { active = false; };
  }, [params.groupId]);

  return (
    <GroupPageShell backHref="/dashboard/groups" title={group?.nombre ?? "Detalle del Grupo"} description="Vista organizativa básica del Grupo propio.">
      {status === "loading" ? <GroupLoading label="Cargando detalle del Grupo" /> : null}
      {status === "error" ? <section role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><p>{error}</p><button className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold" onClick={() => { setStatus("loading"); setError(""); void load(); }}>Reintentar</button></section> : null}
      {status === "ready" && group ? (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Vóley · {group.estado}</p>
            <h2 className="mt-2 text-xl font-semibold">Organización activa</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Este estado expresa vigencia organizativa. No implica una Temporada abierta ni operaciones deportivas.</p>
          </section>
          <aside className="rounded-2xl border border-[var(--border)] p-5">
            <h2 className="font-semibold">Tu acceso</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Podés administrar este Grupo como Owner. Las funciones que requieren integrantes estarán disponibles cuando se incorporen Membresías.</p>
          </aside>
          <section className="rounded-2xl border border-dashed border-[var(--border)] p-5 sm:p-7 lg:col-span-2">
            <h2 className="font-semibold">Membresías todavía vacías</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">El Grupo puede funcionar organizativamente sin Membresías. No hace falta completar posición, dorsal, cargo o rol para administrarlo como Owner.</p>
          </section>
          <OpenSeasonSection groupId={group.id} />
        </div>
      ) : null}
    </GroupPageShell>
  );
}
