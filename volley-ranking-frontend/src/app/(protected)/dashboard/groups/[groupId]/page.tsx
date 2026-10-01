"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { EditGroupNameDialog } from "@/components/groups/EditGroupNameDialog";
import { GroupLoading } from "@/components/groups/GroupLoading";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { OwnMembershipSection } from "@/components/memberships/OwnMembershipSection";
import { ActiveGroupMembersSection } from "@/components/memberships/ActiveGroupMembersSection";
import { PendingGroupJoinRequestsSection } from "@/components/groupJoinRequests/PendingGroupJoinRequestsSection";
import { SeasonHistorySection } from "@/components/seasons/SeasonHistorySection";
import { getGroupErrorMessage, getGroupErrorReason, getOwnGroup } from "@/services/groupsService";
import type { OwnGroup } from "@/types/OwnGroup";

export default function OwnGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<OwnGroup | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleAccessLost = useCallback((message: string) => {
    setGroup(null);
    setStatus("loading");
    setNotice(message);
    router.replace("/dashboard/groups");
  }, [router]);

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
      <div className="sr-only" aria-live="polite">{notice}</div>
      {status === "error" ? <section role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><p>{error}</p><button className="mt-4 min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold" onClick={() => { setStatus("loading"); setError(""); void load(); }}>Reintentar</button></section> : null}
      {status === "ready" && group ? (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Vóley · {group.estado}</p>
            <h2 className="mt-2 text-xl font-semibold">Organización activa</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Este estado expresa vigencia organizativa. No implica una Temporada abierta ni operaciones deportivas.</p>
            <EditGroupNameDialog
              group={group}
              onUpdated={(current, message) => { setGroup(current); setNotice(message); }}
              onAccessLost={handleAccessLost}
            />
          </section>
          <aside className="rounded-2xl border border-[var(--border)] p-5">
            <h2 className="font-semibold">Tu acceso</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Podés administrar este Grupo como Owner. Las funciones que requieren integrantes estarán disponibles cuando se incorporen Membresías.</p>
          </aside>
          <SeasonHistorySection groupId={group.id} />
          <OwnMembershipSection groupId={group.id} />
          <ActiveGroupMembersSection
            groupId={group.id}
            onAccessLost={handleAccessLost}
          />
          <PendingGroupJoinRequestsSection groupId={group.id} />
        </div>
      ) : null}
    </GroupPageShell>
  );
}
