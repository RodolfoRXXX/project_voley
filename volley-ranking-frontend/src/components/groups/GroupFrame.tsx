"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { GroupContextNavigation } from "@/components/groups/GroupContextNavigation";
import { GroupActionsMenu } from "@/components/groups/GroupActionsMenu";
import { GroupLoading } from "@/components/groups/GroupLoading";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { getMyDirectPaymentRecordContext } from "@/services/administrativeReceiptsService";
import { getOwnGroup } from "@/services/groupsService";
import { listMyCurrentGroupMemberships } from "@/services/membershipsService";
import { getMyPaymentReviewContext } from "@/services/paymentDeliveriesService";
import { getMyGroupTreasuryContext } from "@/services/treasuryService";
import type { OwnGroup, OwnGroupActive } from "@/types/OwnGroup";

type GroupAccess = {
  owner: boolean;
  treasury: boolean;
  review: boolean;
  record: boolean;
  group: OwnGroup | null;
  groupName: string;
};

type GroupFrameValue = GroupAccess & {
  groupId: string;
  setOwnerGroup: (group: OwnGroup) => void;
  setNavigationProtection: (pending: boolean, recoveryBlocked: boolean) => void;
  loseAccess: (message?: string) => void;
};

type FrameState = {
  token: object;
  access: GroupAccess | null;
  resolvedGroupId: string | null;
  status: "loading" | "ready" | "error";
  error: string;
};

const GroupFrameContext = createContext<GroupFrameValue | null>(null);

async function membershipGroupName(groupId: string) {
  let cursor: string | undefined;
  do {
    const page = await listMyCurrentGroupMemberships({ pageSize: 50, ...(cursor ? { cursor } : {}) });
    const found = page.items.find((item) => item.group.id === groupId);
    if (found) return found.group.nombre;
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return "Grupo";
}

async function resolveAccess(groupId: string): Promise<GroupAccess> {
  try {
    const { group } = await getOwnGroup(groupId);
    return { owner: true, treasury: false, review: false, record: false, group, groupName: group.nombre };
  } catch {
    const [treasury, review, record, groupName] = await Promise.all([
      getMyGroupTreasuryContext(groupId).then(() => true, () => false),
      getMyPaymentReviewContext(groupId).then(() => true, () => false),
      getMyDirectPaymentRecordContext(groupId).then(() => true, () => false),
      membershipGroupName(groupId),
    ]);
    if (!treasury && !review && !record) throw new Error("GROUP_ECONOMY_NOT_AUTHORIZED");
    return { owner: false, treasury, review, record, group: null, groupName };
  }
}

export function GroupFrame({ children }: { children: React.ReactNode }) {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [frame, setFrame] = useState<FrameState>({ token: {}, access: null, resolvedGroupId: null, status: "loading", error: "" });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [pendingOperation, setPendingOperation] = useState(false);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [notice, setNotice] = useState("");
  const archivedStatus = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let active = true;
    const token = {};
    queueMicrotask(() => {
      if (!active) return;
      setFrame({ token, access: null, resolvedGroupId: null, status: "loading", error: "" });
      setPendingOperation(false);
      setRecoveryBlocked(false);
      setNotice("");
    });
    void resolveAccess(groupId).then((resolved) => {
      if (!active) return;
      setFrame((current) => current.token === token
        ? { token, access: resolved, resolvedGroupId: groupId, status: "ready", error: "" }
        : current);
    }, () => {
      if (!active) return;
      setFrame((current) => current.token === token
        ? { token, access: null, resolvedGroupId: null, status: "error", error: "No tenés un acceso vigente para este Grupo." }
        : current);
    });
    return () => { active = false; };
  }, [groupId, reloadVersion]);

  const loseAccess = useCallback((message = "Tu acceso ya no está vigente. Se limpiaron los datos del Grupo.") => {
    setFrame({ token: {}, access: null, resolvedGroupId: null, status: "error", error: message });
    setPendingOperation(false);
    setRecoveryBlocked(false);
  }, []);

  const setOwnerGroup = useCallback((group: OwnGroup) => {
    setFrame((current) => current.access?.owner ? { ...current, access: { ...current.access, group, groupName: group.nombre } } : current);
  }, []);

  const handlePrepared = useCallback((group: OwnGroupActive) => { setOwnerGroup(group); }, [setOwnerGroup]);
  const handleAccessLost = useCallback((message: string) => {
    loseAccess(message);
    router.replace("/dashboard/groups");
  }, [loseAccess, router]);

  const currentAccess = frame.resolvedGroupId === groupId ? frame.access : null;
  const value = useMemo<GroupFrameValue | null>(() => currentAccess ? {
    ...currentAccess,
    groupId,
    setOwnerGroup,
    setNavigationProtection: (pending, blocked) => { setPendingOperation(pending); setRecoveryBlocked(blocked); },
    loseAccess,
  } : null, [currentAccess, groupId, loseAccess, setOwnerGroup]);

  const groupState = currentAccess?.group?.estado ?? (currentAccess ? "activo" : null);
  const headerBadge = groupState ? <span ref={groupState === "archivado" ? archivedStatus : undefined} tabIndex={groupState === "archivado" ? -1 : undefined} className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${groupState === "archivado" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{groupState === "archivado" ? "Archivado" : "Activo"}</span> : null;
  const headerActions = currentAccess?.owner && currentAccess.group?.estado === "activo" ? <GroupActionsMenu
    key={currentAccess.group.id}
    group={currentAccess.group}
    onPrepared={handlePrepared}
    onUpdated={(group, message) => { setOwnerGroup(group); setNotice(message); }}
    onArchived={(group, message) => { setOwnerGroup(group); setNotice(message); queueMicrotask(() => archivedStatus.current?.focus()); }}
    onDeleted={() => { router.replace("/dashboard/groups?notice=group-deleted"); }}
    onAccessLost={handleAccessLost}
  /> : null;

  return (
    <GroupPageShell
      backHref="/dashboard/groups"
      title={currentAccess?.groupName ?? "Grupo"}
      description={currentAccess?.owner
        ? currentAccess.group?.estado === "archivado" ? "Grupo archivado, disponible en modo de consulta." : "Administración contextual del Grupo."
        : "Consulta económica con autorización validada por cada operación."}
      badge={headerBadge}
      actions={headerActions}
    >
      <div className="sr-only" aria-live="polite">{notice}</div>
      {frame.status === "loading" ? <GroupLoading label="Cargando contexto del Grupo" /> : null}
      {frame.status === "error" ? <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5"><p>{frame.error}</p><div className="mt-3 flex flex-wrap gap-2"><button className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => setReloadVersion((value) => value + 1)}>Reintentar</button><button className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => router.replace("/dashboard/groups")}>Volver a Mis grupos</button></div></section> : null}
      {frame.status === "ready" && value ? <GroupFrameContext.Provider value={value}>
        <GroupContextNavigation groupId={groupId} groupName={value.groupName} owner={value.owner} activeGroup={value.group?.estado !== "archivado"} hasPendingOperation={pendingOperation} blockContextChange={recoveryBlocked} />
        {children}
      </GroupFrameContext.Provider> : null}
    </GroupPageShell>
  );
}

export function useGroupFrame() {
  const value = useContext(GroupFrameContext);
  if (!value) throw new Error("useGroupFrame must be used inside GroupFrame");
  return value;
}
