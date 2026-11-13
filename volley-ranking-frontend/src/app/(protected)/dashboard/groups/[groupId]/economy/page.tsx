"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OwnerAccessManagementSection } from "@/components/access/OwnerAccessManagementSection";
import { AdministrativeReceiptsSection } from "@/components/administrativeReceipts/AdministrativeReceiptsSection";
import { OwnerPaymentReceiptHistorySection } from "@/components/administrativeReceipts/OwnerPaymentReceiptHistorySection";
import { useGroupFrame } from "@/components/groups/GroupFrame";
import { GroupEconomyTabs, type GroupEconomyTabId } from "@/components/groups/GroupEconomyTabs";
import { GroupSectionHeader } from "@/components/groups/GroupSectionHeader";
import { PaymentDeliveriesAdminSection } from "@/components/paymentDeliveries/PaymentDeliveriesAdminSection";
import { OwnerEconomySection } from "@/components/payments/OwnerEconomySection";
import { RegisteredIncomeMovementsSection } from "@/components/registeredIncomeMovements/RegisteredIncomeMovementsSection";
import { TreasuryDebtSection } from "@/components/treasury/TreasuryDebtSection";

export default function GroupEconomyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const access = useGroupFrame();
  const { groupId, setNavigationProtection, loseAccess } = access;
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [pendingOperation, setPendingOperation] = useState(false);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [requestedDeliveryId, setRequestedDeliveryId] = useState<string>();
  const linkedDeliveryId = searchParams.get("deliveryId") ?? undefined;
  const reviewTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setRefreshVersion(0);
      setPendingOperation(false);
      setRecoveryBlocked(false);
      setRequestedDeliveryId(undefined);
    });
    return () => { active = false; };
  }, [groupId]);
  useEffect(() => {
    setNavigationProtection(pendingOperation, recoveryBlocked);
    return () => setNavigationProtection(false, false);
  }, [pendingOperation, recoveryBlocked, setNavigationProtection]);
  useEffect(() => {
    if (!pendingOperation) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = true; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pendingOperation]);

  const tabs = useMemo(() => [
    ...((access.owner || access.treasury || access.record) ? [{ id: "debts" as const, label: "Deudas" }] : []),
    ...((access.owner || access.review) ? [{ id: "notices" as const, label: "Pagos informados" }] : []),
    ...((access.owner || access.treasury) ? [{ id: "history" as const, label: "Historial" }] : []),
    ...(access.owner ? [{ id: "concepts" as const, label: "Conceptos" }] : []),
  ], [access.owner, access.record, access.review, access.treasury]);
  const requestedTab = searchParams.get("tab") as GroupEconomyTabId | null;
  const tab = tabs.some((item) => item.id === requestedTab) ? requestedTab! : tabs[0]?.id;
  const lost = useCallback(() => loseAccess("Tu acceso económico ya no está vigente. Se limpiaron los datos del Grupo."), [loseAccess]);

  if (!access.owner && !access.treasury && !access.review && !access.record) return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5"><h1 className="font-semibold">Economía no disponible</h1><p className="mt-2 text-sm">Integrar el Grupo no concede acceso económico. Volvé a Mi participación.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-500 px-4 font-semibold" href={`/dashboard/groups/${groupId}/membership`}>Ir a Mi participación</Link></section>;

  return <>
    <GroupSectionHeader title="Economía del grupo" actions={access.owner && access.group?.estado === "activo" ? <OwnerAccessManagementSection groupId={groupId} compact /> : null} />
    {!access.owner ? <p className="-mt-4 mb-5 text-sm text-[var(--text-muted)]">Acceso delegado validado para este Grupo.</p> : null}
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-label="Economía del Grupo">
      <GroupEconomyTabs tabs={tabs} activeTab={tab} />
      <div id={`group-economy-panel-${tab}`} role="tabpanel" aria-labelledby={`group-economy-tab-${tab}`} className="min-w-0 bg-[var(--background)] p-4 sm:p-5">
        {tab === "concepts" && access.owner ? <OwnerEconomySection groupId={groupId} view="concepts" readOnly={access.group?.estado === "archivado"} refreshVersion={refreshVersion} onPendingChange={setPendingOperation} onRecoveryChange={setRecoveryBlocked} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} /> : null}
        {tab === "debts" && access.owner ? <OwnerEconomySection groupId={groupId} view="debts" readOnly={access.group?.estado === "archivado"} refreshVersion={refreshVersion} onPendingChange={setPendingOperation} onRecoveryChange={setRecoveryBlocked} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} onReviewPayment={(deliveryId, trigger) => { reviewTrigger.current = trigger ?? null; setRequestedDeliveryId(deliveryId); router.push("?tab=notices"); }} /> : null}
        {tab === "debts" && !access.owner && access.treasury ? <TreasuryDebtSection groupId={groupId} onAccessLost={lost} /> : null}
        {tab === "debts" && !access.owner && access.record ? <div className={access.treasury ? "mt-5" : ""}><AdministrativeReceiptsSection groupId={groupId} owner={false} onPendingChange={setPendingOperation} onRecoveryChange={setRecoveryBlocked} /></div> : null}
        {tab === "notices" ? <PaymentDeliveriesAdminSection groupId={groupId} owner={access.owner} refreshVersion={refreshVersion} requestedDeliveryId={requestedDeliveryId ?? linkedDeliveryId} onRequestHandled={() => setRequestedDeliveryId(undefined)} onDetailClosed={() => queueMicrotask(() => reviewTrigger.current?.focus())} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} /> : null}
        {tab === "history" && (access.owner || access.treasury) ? <div className="space-y-5"><RegisteredIncomeMovementsSection key={groupId} groupId={groupId} onAccessLost={lost} />{access.owner ? <OwnerPaymentReceiptHistorySection groupId={groupId} refreshVersion={refreshVersion} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} /> : null}</div> : null}
      </div>
    </section>
  </>;
}
