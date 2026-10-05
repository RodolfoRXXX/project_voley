"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { GroupActionsMenu } from "@/components/groups/GroupActionsMenu";
import { GroupLoading } from "@/components/groups/GroupLoading";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { OwnMembershipSection } from "@/components/memberships/OwnMembershipSection";
import { ActiveGroupMembersSection } from "@/components/memberships/ActiveGroupMembersSection";
import { PendingGroupJoinRequestsSection } from "@/components/groupJoinRequests/PendingGroupJoinRequestsSection";
import { SeasonHistorySection } from "@/components/seasons/SeasonHistorySection";
import { getGroupErrorMessage, getGroupErrorReason, getOwnGroup } from "@/services/groupsService";
import type { OwnGroup, OwnGroupActive } from "@/types/OwnGroup";

export default function OwnGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<OwnGroup | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const archivedStatus = useRef<HTMLHeadingElement>(null);

  const handleAccessLost = useCallback((message: string) => {
    generation.current += 1;
    setGroup(null);
    setStatus("loading");
    setNotice(message);
    router.replace("/dashboard/groups");
  }, [router]);
  const handlePrepared = useCallback((current: OwnGroupActive) => { setGroup(current); }, []);

  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await getOwnGroup(params.groupId);
      if (current !== generation.current) return;
      setGroup(result.group);
      setStatus("ready");
    } catch (cause) {
      if (current !== generation.current) return;
      setGroup(null);
      setError(getGroupErrorMessage(getGroupErrorReason(cause)));
      setStatus("error");
    }
  }, [params.groupId]);

  useEffect(() => {
    const current = ++generation.current;
    queueMicrotask(() => {
      if (current !== generation.current) return;
      setGroup(null);
      setStatus("loading");
      setError("");
      setNotice("");
    });
    void getOwnGroup(params.groupId).then(
      (result) => {
        if (current !== generation.current) return;
        setGroup(result.group);
        setStatus("ready");
      },
      (cause) => {
        if (current !== generation.current) return;
        setGroup(null);
        setError(getGroupErrorMessage(getGroupErrorReason(cause)));
        setStatus("error");
      }
    );
    return () => { if (current === generation.current) generation.current += 1; };
  }, [params.groupId]);

  return (
    <GroupPageShell backHref="/dashboard/groups" title={group?.nombre ?? "Detalle del Grupo"} description="Vista organizativa básica del Grupo propio." actions={status === "ready" && group?.estado === "activo" ? <GroupActionsMenu
      key={group.id} group={group}
      onPrepared={handlePrepared}
      onUpdated={(current, message) => { setGroup(current); setNotice(message); }}
      onArchived={(current, message) => { setGroup(current); setNotice(message); queueMicrotask(() => archivedStatus.current?.focus()); }}
      onDeleted={(message) => { generation.current += 1; setGroup(null); setNotice(message); setStatus("loading"); router.replace("/dashboard/groups?notice=group-deleted"); }}
      onAccessLost={handleAccessLost}
    /> : null}>
      {status === "loading" ? <GroupLoading label="Cargando detalle del Grupo" /> : null}
      <div className="sr-only" aria-live="polite">{notice}</div>
      {status === "error" ? <section role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><p>{error}</p><button className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold" onClick={() => { setStatus("loading"); setError(""); void load(); }}>Reintentar</button></section> : null}
      {status === "ready" && group ? (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Vóley · {group.estado === "archivado" ? "Archivado" : "Activo"}</p>
            <h2 ref={group.estado === "archivado" ? archivedStatus : undefined} tabIndex={group.estado === "archivado" ? -1 : undefined} className="mt-2 text-xl font-semibold">{group.estado === "archivado" ? "Organización archivada" : "Organización activa"}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{group.estado === "archivado" ? `Archivado el ${new Date(group.archivedAt).toLocaleString("es-AR")}. La información se conserva en modo de consulta y no existe desarchivo.` : "Este estado expresa vigencia organizativa. No implica una Temporada abierta ni operaciones deportivas."}</p>
          </section>
          <aside className="rounded-2xl border border-[var(--border)] p-5">
            <h2 className="font-semibold">Tu acceso</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{group.estado === "archivado" ? "Conservás acceso como Owner para consultar el Grupo y su historia." : "Podés administrar este Grupo como Owner. Las funciones que requieren integrantes estarán disponibles cuando se incorporen Membresías."}</p>
          </aside>
          <SeasonHistorySection groupId={group.id} readOnly={group.estado === "archivado"} onAccessLost={handleAccessLost} />
          {group.estado === "activo" ? <><OwnMembershipSection groupId={group.id} onAccessLost={handleAccessLost} />
          <ActiveGroupMembersSection
            groupId={group.id}
            onAccessLost={handleAccessLost}
          />
          <PendingGroupJoinRequestsSection groupId={group.id} onAccessLost={handleAccessLost} /></> : null}
        </div>
      ) : null}
    </GroupPageShell>
  );
}
