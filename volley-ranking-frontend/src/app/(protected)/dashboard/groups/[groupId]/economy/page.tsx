"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OwnerAccessManagementSection } from "@/components/access/OwnerAccessManagementSection";
import { AdministrativeReceiptsSection } from "@/components/administrativeReceipts/AdministrativeReceiptsSection";
import { OwnerPaymentReceiptHistorySection } from "@/components/administrativeReceipts/OwnerPaymentReceiptHistorySection";
import { useGroupFrame } from "@/components/groups/GroupFrame";
import { PaymentDeliveriesAdminSection } from "@/components/paymentDeliveries/PaymentDeliveriesAdminSection";
import { OwnerEconomySection } from "@/components/payments/OwnerEconomySection";
import { TreasuryDebtSection } from "@/components/treasury/TreasuryDebtSection";

type Tab = "debts" | "notices" | "history";

export default function GroupEconomyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const access = useGroupFrame();
  const { groupId, setNavigationProtection, loseAccess } = access;
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [pendingOperation, setPendingOperation] = useState(false);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [requestedDeliveryId, setRequestedDeliveryId] = useState<string>();
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
    ...(access.owner ? [{ id: "history" as const, label: "Historial" }] : []),
  ], [access.owner, access.record, access.review, access.treasury]);
  const requestedTab = searchParams.get("tab") as Tab | null;
  const tab = tabs.some((item) => item.id === requestedTab) ? requestedTab! : tabs[0]?.id;
  const lost = useCallback(() => loseAccess("Tu acceso económico ya no está vigente. Se limpiaron los datos del Grupo."), [loseAccess]);

  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      {access.owner ? <Link className="font-semibold text-orange-700 underline" href={`/dashboard/groups/${groupId}`}>← Volver al resumen</Link> : <span className="text-sm text-[var(--text-muted)]">Acceso delegado validado para este Grupo.</span>}
      {access.owner && access.group?.estado === "activo" ? <OwnerAccessManagementSection groupId={groupId} compact /> : null}
    </div>
    <nav className="mb-5 flex gap-2 overflow-x-auto" aria-label="Vistas de Economía" role="tablist">{tabs.map((item) => <Link key={item.id} role="tab" aria-selected={tab === item.id} className={`shrink-0 rounded-lg border px-4 py-2 font-semibold ${tab === item.id ? "border-orange-500 bg-orange-50 text-orange-800" : ""}`} href={`?tab=${item.id}`}>{item.label}</Link>)}</nav>
    {tab === "debts" && access.owner ? <OwnerEconomySection groupId={groupId} readOnly={access.group?.estado === "archivado"} refreshVersion={refreshVersion} onPendingChange={setPendingOperation} onRecoveryChange={setRecoveryBlocked} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} onReviewPayment={(deliveryId, trigger) => { reviewTrigger.current = trigger ?? null; setRequestedDeliveryId(deliveryId); router.push("?tab=notices"); }} /> : null}
    {tab === "debts" && !access.owner && access.treasury ? <TreasuryDebtSection groupId={groupId} onAccessLost={lost} /> : null}
    {tab === "debts" && !access.owner && access.record ? <div className={access.treasury ? "mt-5" : ""}><AdministrativeReceiptsSection groupId={groupId} owner={false} onPendingChange={setPendingOperation} onRecoveryChange={setRecoveryBlocked} /></div> : null}
    {tab === "notices" ? <PaymentDeliveriesAdminSection groupId={groupId} owner={access.owner} requestedDeliveryId={requestedDeliveryId} onRequestHandled={() => setRequestedDeliveryId(undefined)} onDetailClosed={() => queueMicrotask(() => reviewTrigger.current?.focus())} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} /> : null}
    {tab === "history" && access.owner ? <OwnerPaymentReceiptHistorySection groupId={groupId} refreshVersion={refreshVersion} initiallyExpanded onEconomyChanged={() => setRefreshVersion((value) => value + 1)} /> : null}
  </>;
}
