"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { GroupContextNavigation } from "@/components/groups/GroupContextNavigation";
import { GroupActionsMenu } from "@/components/groups/GroupActionsMenu";
import { GroupLoading } from "@/components/groups/GroupLoading";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { GroupSwitcher } from "@/components/groups/GroupSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { administrativeReceiptErrorReason, getMyDirectPaymentRecordContext } from "@/services/administrativeReceiptsService";
import { getGroupErrorReason, getOwnGroup } from "@/services/groupsService";
import { getMyCurrentGroupMembershipContext } from "@/services/membershipsService";
import { deliveryErrorReason, getMyPaymentReviewContext } from "@/services/paymentDeliveriesService";
import { getMyGroupTreasuryContext, getTreasuryErrorReason } from "@/services/treasuryService";
import type { MyCurrentGroupMembershipContext } from "@/types/MyCurrentGroupMembership";
import type { OwnGroup, OwnGroupActive } from "@/types/OwnGroup";

type GroupAccess = {
  owner: boolean;
  treasury: boolean;
  review: boolean;
  record: boolean;
  membership: boolean;
  membershipContext: MyCurrentGroupMembershipContext | null;
  capabilitiesFailed: boolean;
  group: OwnGroup | null;
  groupName: string;
};

type GroupFrameValue = GroupAccess & {
  groupId: string;
  setOwnerGroup: (group: OwnGroup) => void;
  setNavigationProtection: (pending: boolean, recoveryBlocked: boolean) => void;
  loseAccess: (message?: string) => void;
  retryAccess: () => void;
};

type FrameState = {
  token: object;
  access: GroupAccess | null;
  resolvedGroupId: string | null;
  status: "loading" | "ready" | "error";
  error: string;
};

const GroupFrameContext = createContext<GroupFrameValue | null>(null);

async function resolveAccess(groupId: string, includeCapabilities: boolean): Promise<GroupAccess> {
  try {
    const { group } = await getOwnGroup(groupId);
    const membershipContext = await getMyCurrentGroupMembershipContext(groupId).then((context) => context, () => null);
    return { owner: true, treasury: false, review: false, record: false, membership: membershipContext !== null, membershipContext, capabilitiesFailed: false, group, groupName: group.nombre };
  } catch (cause) {
    const ownerReason = getGroupErrorReason(cause);
    if (!["GROUP_NOT_ACCESSIBLE", "NOT_AUTHORIZED", "NOT_FOUND"].includes(ownerReason)) throw cause;
    const [membership, treasury, review, record] = await Promise.allSettled([
      getMyCurrentGroupMembershipContext(groupId),
      includeCapabilities ? getMyGroupTreasuryContext(groupId).then(() => true) : Promise.resolve(false),
      includeCapabilities ? getMyPaymentReviewContext(groupId).then(() => true) : Promise.resolve(false),
      includeCapabilities ? getMyDirectPaymentRecordContext(groupId).then(() => true) : Promise.resolve(false),
    ]);
    const hasMembership = membership.status === "fulfilled";
    const hasTreasury = treasury.status === "fulfilled" && treasury.value;
    const hasReview = review.status === "fulfilled" && review.value;
    const hasRecord = record.status === "fulfilled" && record.value;
    const capabilityUnavailable = (treasury.status === "rejected" && getTreasuryErrorReason(treasury.reason) !== "GROUP_TREASURY_NOT_AUTHORIZED")
      || (review.status === "rejected" && deliveryErrorReason(review.reason) !== "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED")
      || (record.status === "rejected" && administrativeReceiptErrorReason(record.reason) !== "ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED");
    if (!hasMembership && !hasTreasury && !hasReview && !hasRecord && capabilityUnavailable) {
      throw new Error("GROUP_CAPABILITIES_UNAVAILABLE");
    }
    if (!hasMembership && !hasTreasury && !hasReview && !hasRecord) throw new Error("GROUP_NOT_AUTHORIZED");
    return {
      owner: false,
      treasury: hasTreasury,
      review: hasReview,
      record: hasRecord,
      membership: hasMembership,
      membershipContext: hasMembership ? membership.value : null,
      capabilitiesFailed: capabilityUnavailable,
      group: null,
      groupName: hasMembership ? membership.value.group.nombre : "Grupo",
    };
  }
}

export function GroupFrame({ children }: { children: React.ReactNode }) {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { firebaseUser } = useAuth();
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
    void resolveAccess(groupId, true).then((resolved) => {
      if (!active) return;
      setFrame((current) => current.token === token
        ? { token, access: resolved, resolvedGroupId: groupId, status: "ready", error: "" }
        : current);
    }, (cause) => {
      if (!active) return;
      const unavailable = cause instanceof Error && cause.message === "GROUP_CAPABILITIES_UNAVAILABLE";
      setFrame((current) => current.token === token
        ? { token, access: null, resolvedGroupId: null, status: "error", error: unavailable
          ? "No pudimos verificar tus accesos para este Grupo. Reintentá la consulta."
          : "No tenés un acceso vigente para este Grupo." }
        : current);
    });
    return () => { active = false; };
  }, [firebaseUser?.uid, groupId, reloadVersion]);

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
    retryAccess: () => setReloadVersion((current) => current + 1),
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
  const condition = currentAccess?.owner && currentAccess.membership
    ? "Administrás e integrás este Grupo"
    : currentAccess?.owner
      ? "Administrás este Grupo"
      : currentAccess?.membership
        ? "Integrás este Grupo"
        : currentAccess
          ? "Acceso económico delegado"
          : "Cargando contexto del Grupo";
  const seasonName = currentAccess?.membershipContext?.season.nombre;
  const headerDescription = seasonName ? `Temporada ${seasonName} · ${condition}` : condition;

  return (
    <GroupPageShell
      backHref="/dashboard/groups"
      title={currentAccess ? <GroupSwitcher groupId={groupId} groupName={currentAccess.groupName} owner={currentAccess.owner} membership={currentAccess.membership} hasPendingOperation={pendingOperation} blockContextChange={recoveryBlocked} /> : "Grupo"}
      description={headerDescription}
      badge={headerBadge}
      actions={headerActions}
    >
      <div className="sr-only" aria-live="polite">{notice}</div>
      {frame.status === "loading" ? <GroupLoading label="Cargando contexto del Grupo" /> : null}
      {frame.status === "error" ? <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5"><p>{frame.error}</p><div className="mt-3 flex flex-wrap gap-2"><button className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => setReloadVersion((value) => value + 1)}>Reintentar</button><button className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => router.replace("/dashboard/groups")}>Volver a Mis grupos</button></div></section> : null}
      {frame.status === "ready" && value ? <GroupFrameContext.Provider value={value}>
        <GroupContextNavigation groupId={groupId} owner={value.owner} membership={value.membership} capabilities={{ treasury: value.treasury, review: value.review, record: value.record }} activeGroup={value.group?.estado !== "archivado"} />
        {value.capabilitiesFailed ? <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"><p>No pudimos verificar todas tus autorizaciones económicas. No asumimos que estén ausentes.</p><button type="button" className="mt-2 min-h-11 rounded-lg border border-amber-500 px-3 font-semibold" onClick={value.retryAccess}>Reintentar verificación</button></div> : null}
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
