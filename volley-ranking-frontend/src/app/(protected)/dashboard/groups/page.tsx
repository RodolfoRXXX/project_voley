"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { GroupCard } from "@/components/groups/GroupCard";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { OwnPendingGroupJoinRequestsSection } from "@/components/groupJoinRequests/OwnPendingGroupJoinRequestsSection";
import { OwnGroupMembershipHistorySection } from "@/components/memberships/OwnGroupMembershipHistorySection";
import { useAuth } from "@/hooks/useAuth";
import { usePerson } from "@/hooks/usePerson";
import { createDashboardTasksClient, dashboardTaskQueryReason } from "@/services/dashboardTasksService";
import { collectCurrentMembershipPages, filterPresentableGroups, mergePresentableGroups, type GroupFilter } from "@/services/groupsPresentation.mjs";
import { getGroupErrorMessage, getGroupErrorReason, listOwnGroups } from "@/services/groupsService";
import { getMembershipErrorMessage, getMembershipErrorReason, listMyCurrentGroupMemberships } from "@/services/membershipsService";
import type { MyCurrentGroupMembership } from "@/types/MyCurrentGroupMembership";
import type { OwnGroup } from "@/types/OwnGroup";

type SourceStatus = "loading" | "ready" | "error" | "person-required";
type TaskStatus = "loading" | "ready" | "unavailable";
const PROVISIONAL_GROUP_LIMIT = 1;
const CURRENT_GROUP_PAGE_SIZE = 5;

export default function OwnGroupsPage() {
  const { firebaseUser } = useAuth();
  const { personStatus, personAccountId, personError, retryPerson } = usePerson();
  const searchParams = useSearchParams();
  const generation = useRef(0);
  const [owned, setOwned] = useState<OwnGroup[]>([]);
  const [memberships, setMemberships] = useState<MyCurrentGroupMembership[]>([]);
  const [ownedStatus, setOwnedStatus] = useState<SourceStatus>("loading");
  const [membershipStatus, setMembershipStatus] = useState<SourceStatus>("loading");
  const [ownedError, setOwnedError] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("loading");
  const [taskCounts, setTaskCounts] = useState<Map<string, number>>(new Map());
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [visibleCurrentGroups, setVisibleCurrentGroups] = useState(CURRENT_GROUP_PAGE_SIZE);
  const taskClient = useMemo(() => createDashboardTasksClient(() => firebaseUser?.uid ?? null), [firebaseUser?.uid]);

  const loadOwned = useCallback(async () => {
    const requestGeneration = generation.current;
    setOwnedStatus("loading"); setOwnedError("");
    try {
      const result = await listOwnGroups();
      if (generation.current !== requestGeneration) return;
      setOwned(result.items); setOwnedStatus("ready");
    } catch (cause) {
      if (generation.current !== requestGeneration) return;
      setOwnedError(getGroupErrorMessage(getGroupErrorReason(cause))); setOwnedStatus("error");
    }
  }, []);

  const loadMemberships = useCallback(async () => {
    const requestGeneration = generation.current;
    setMembershipStatus("loading"); setMembershipError("");
    try {
      const result = await collectCurrentMembershipPages(
        (cursor) => listMyCurrentGroupMemberships({ pageSize: 20, ...(cursor ? { cursor } : {}) }),
        () => generation.current === requestGeneration,
        setMemberships,
      );
      if (result.cancelled) return;
      setMembershipStatus("ready");
    } catch (cause) {
      if (generation.current !== requestGeneration) return;
      const reason = getMembershipErrorReason(cause);
      setMembershipError(reason === "INTERNAL_ERROR" && cause instanceof Error && cause.message === "MEMBERSHIP_CURSOR_REPEATED"
        ? "No pudimos completar la cobertura de tus participaciones. Reintentá la consulta."
        : getMembershipErrorMessage(reason));
      setMembershipStatus(reason === "PERSON_REQUIRED" ? "person-required" : "error");
    }
  }, []);

  const retryMemberships = useCallback(async () => {
    if (personStatus === "error" || personStatus === "inconsistent" || personStatus === "sessionInvalid") {
      retryPerson();
      return;
    }
    await loadMemberships();
  }, [loadMemberships, personStatus, retryPerson]);

  const loadTaskCounts = useCallback(async () => {
    const requestGeneration = generation.current;
    setTaskStatus("loading"); setTaskCounts(new Map());
    try {
      const page = await taskClient.list();
      if (generation.current !== requestGeneration) return;
      if (!page.coverage.complete || page.coverage.health !== "READY" || !page.groupTaskCounts) {
        setTaskStatus("unavailable"); return;
      }
      setTaskCounts(new Map(page.groupTaskCounts.map(({ groupId, count }) => [groupId, count])));
      setTaskStatus("ready");
    } catch (cause) {
      if (generation.current !== requestGeneration || dashboardTaskQueryReason(cause) === "STALE_RESPONSE") return;
      setTaskCounts(new Map()); setTaskStatus("unavailable");
    }
  }, [taskClient]);

  useEffect(() => {
    generation.current += 1;
    const requestGeneration = generation.current;
    queueMicrotask(() => {
      if (generation.current !== requestGeneration) return;
      setOwned([]); setMemberships([]); setTaskCounts(new Map()); setFilter("all"); setVisibleCurrentGroups(CURRENT_GROUP_PAGE_SIZE);
      setOwnedStatus("loading"); setMembershipStatus("loading"); setOwnedError(""); setMembershipError(""); setTaskStatus("loading");
      if (!firebaseUser?.uid) return;
      void loadOwned(); void loadTaskCounts();
    });
    return () => { generation.current += 1; taskClient.invalidate(); };
  }, [firebaseUser?.uid, loadOwned, loadTaskCounts, taskClient]);

  useEffect(() => {
    const requestGeneration = generation.current;
    if (!firebaseUser?.uid) return;
    if (personAccountId !== firebaseUser.uid) return;
    if (personStatus === "empty") {
      queueMicrotask(() => {
        if (generation.current !== requestGeneration) return;
        setMemberships([]); setMembershipError(""); setMembershipStatus("person-required");
      });
      return;
    }
    if (personStatus === "error" || personStatus === "inconsistent" || personStatus === "sessionInvalid") {
      queueMicrotask(() => {
        if (generation.current !== requestGeneration) return;
        setMembershipError(personError || "No pudimos verificar tu ficha personal. Reintentá la consulta.");
        setMembershipStatus("error");
      });
      return;
    }
    if (personStatus === "ready") {
      queueMicrotask(() => void loadMemberships());
    }
  }, [firebaseUser?.uid, loadMemberships, personAccountId, personError, personStatus]);

  const activeOwned = useMemo(() => owned.filter((group) => group.estado === "activo"), [owned]);
  const groups = useMemo(() => mergePresentableGroups(activeOwned, memberships), [activeOwned, memberships]);
  const filtered = useMemo(() => filterPresentableGroups(groups, filter), [filter, groups]);
  const visibleFiltered = useMemo(() => filtered.slice(0, visibleCurrentGroups), [filtered, visibleCurrentGroups]);
  const membershipComplete = membershipStatus === "ready" || membershipStatus === "person-required";
  const coverageComplete = ownedStatus === "ready" && membershipComplete;
  const trueEmpty = coverageComplete && groups.length === 0;

  return (
    <GroupPageShell title="Mis grupos" description="">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="status" className="min-h-6 text-sm text-[var(--text-muted)]">{!coverageComplete ? "Mostrando resultados acreditados hasta ahora. La cobertura todavía es parcial." : ""}</div>
        <div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 py-2 text-sm font-semibold text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2" href="/dashboard/groups/explore">Explorar grupos</Link><Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 py-2 text-sm font-semibold text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2" href="/dashboard/groups/new">Crear grupo</Link></div>
      </div>
      <Notices notice={searchParams.get("notice")} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SourceState label="Administración" status={ownedStatus} error={ownedError} onRetry={loadOwned} value={ownedStatus === "ready" ? `${owned.length}/${PROVISIONAL_GROUP_LIMIT}` : undefined} help="Límite técnico provisional" />
        <SourceState label="Participación" status={membershipStatus} error={membershipError} onRetry={retryMemberships} value={membershipStatus === "ready" ? String(new Set(memberships.map((item) => item.group.id)).size) : membershipStatus === "person-required" ? "—" : undefined} help={membershipStatus === "person-required" ? "Completá tu ficha para participar en grupos" : "Grupos actuales únicos"} />
      </div>
      {membershipStatus === "person-required" ? <p className="mb-5 text-sm text-[var(--text-muted)]">Si querés participar en otros grupos, <Link className="font-semibold text-orange-700 underline underline-offset-2" href="/profile/person">completá tu ficha personal</Link>.</p> : null}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar grupos">
        {([["all", "Todos"], ["admin", "Administro"], ["member", "Integro"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${filter === value ? "border-orange-500 bg-orange-50 text-orange-800" : "border-[var(--border)]"}`} onClick={() => { setFilter(value); setVisibleCurrentGroups(CURRENT_GROUP_PAGE_SIZE); }}>{label}</button>)}
      </div>
      <h2 className="mb-3 text-xl font-semibold">Grupos actuales</h2>
      {trueEmpty ? <section className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center"><p className="font-semibold">Todavía no tenés grupos actuales</p></section> : null}
      {!trueEmpty && !coverageComplete && visibleFiltered.length === 0 ? <section role="status" className="mb-4 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]"><p>Estamos verificando tus grupos actuales. El filtro todavía no tiene cobertura completa.</p></section> : null}
      {!trueEmpty && coverageComplete && filter === "admin" && filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center"><p className="font-semibold">No administrás ningún grupo actual</p></section> : null}
      {!trueEmpty && coverageComplete && filter === "member" && filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center"><p className="font-semibold">No integrás ningún grupo</p></section> : null}
      {visibleFiltered.length > 0 ? <section aria-label="Listado de grupos" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleFiltered.map((group) => <GroupCard key={group.groupId} group={group} actionableTaskCount={taskStatus === "ready" ? taskCounts.get(group.groupId) : undefined} />)}</section> : null}
      {visibleCurrentGroups < filtered.length ? <button type="button" className="mt-4 min-h-11 rounded-lg border border-orange-500 px-4 font-semibold text-orange-700" onClick={() => setVisibleCurrentGroups((current) => current + CURRENT_GROUP_PAGE_SIZE)}>Cargar más grupos actuales</button> : null}
      <OwnPendingGroupJoinRequestsSection available={membershipStatus !== "person-required"} onChanged={loadMemberships} />
      <OwnGroupMembershipHistorySection available={membershipStatus !== "person-required"} />
    </GroupPageShell>
  );
}

function SourceState({ label, status, error, onRetry, value, help }: { label: string; status: SourceStatus; error: string; onRetry: () => Promise<void>; value?: string; help: string }) {
  return <section className="rounded-xl border border-[var(--border)] p-3 text-sm" aria-label={label}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{help}</p></div>{value !== undefined ? <p className="text-2xl font-bold tabular-nums">{value}</p> : null}</div>{status === "loading" ? <p role="status" className="mt-2 text-[var(--text-muted)]">Cargando…</p> : null}{status === "error" ? <div role="alert" className="mt-2 text-red-800"><p>{error}</p><button type="button" className="mt-2 min-h-11 rounded-lg border border-red-400 px-3 font-semibold" onClick={() => void onRetry()}>Reintentar</button></div> : null}</section>;
}

function Notices({ notice }: { notice: string | null }) {
  if (notice === "legacy-group-capability-retired") return <p role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">La vista anterior ya no está disponible. Usá los Grupos y Membresías vigentes.</p>;
  if (notice === "created-group-was-deleted") return <p role="status" className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950">La creación anterior fue confirmada y el Grupo se eliminó después. Iniciá una creación nueva si querés otro Grupo.</p>;
  if (notice === "group-deleted") return <p role="status" className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">El Grupo fue eliminado definitivamente y el cupo quedó disponible para una creación nueva.</p>;
  return null;
}
