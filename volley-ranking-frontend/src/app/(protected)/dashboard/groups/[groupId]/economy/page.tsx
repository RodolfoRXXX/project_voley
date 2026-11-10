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
import { RegisteredIncomeMovementsSection } from "@/components/registeredIncomeMovements/RegisteredIncomeMovementsSection";
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
  const linkedDeliveryId = searchParams.get("deliveryId") ?? undefined;
  const reviewTrigger = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);

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
  function moveTabFocus(event: React.KeyboardEvent<HTMLAnchorElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    router.push(`?tab=${tabs[next].id}`, { scroll: false });
    queueMicrotask(() => tabRefs.current[next]?.focus());
  }

  if (!access.owner && !access.treasury && !access.review && !access.record) return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5"><h1 className="font-semibold">Economía no disponible</h1><p className="mt-2 text-sm">Integrar el Grupo no concede acceso económico. Volvé a Mi participación.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-500 px-4 font-semibold" href={`/dashboard/groups/${groupId}/membership`}>Ir a Mi participación</Link></section>;

  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      {access.owner ? <Link className="font-semibold text-orange-700 underline" href={`/dashboard/groups/${groupId}`}>← Volver al resumen</Link> : <span className="text-sm text-[var(--text-muted)]">Acceso delegado validado para este Grupo.</span>}
      {access.owner && access.group?.estado === "activo" ? <OwnerAccessManagementSection groupId={groupId} compact /> : null}
    </div>
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-label="Economía del Grupo">
      <nav className="grid border-b border-[var(--border)] px-2 sm:px-4" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} aria-label="Vistas de Economía" role="tablist">{tabs.map((item, index) => <Link id={`group-economy-tab-${item.id}`} ref={(node) => { tabRefs.current[index] = node; }} key={item.id} role="tab" tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`group-economy-panel-${item.id}`} onKeyDown={(event) => moveTabFocus(event, index)} className={`relative -mb-px inline-flex min-h-12 min-w-0 items-center justify-center border-b-2 px-1 py-2 text-center text-sm font-semibold leading-tight focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:px-4 ${tab === item.id ? "border-orange-500 bg-[var(--background)] text-orange-800" : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"}`} href={`?tab=${item.id}`}>{item.label}</Link>)}</nav>
      <div id={`group-economy-panel-${tab}`} role="tabpanel" aria-labelledby={`group-economy-tab-${tab}`} className="min-w-0 bg-[var(--background)] p-4 sm:p-5">
        {tab === "debts" && (access.owner || access.treasury) ? <div className="mb-5"><RegisteredIncomeMovementsSection key={groupId} groupId={groupId} onAccessLost={lost} /></div> : null}
        {tab === "debts" && access.owner ? <OwnerEconomySection groupId={groupId} readOnly={access.group?.estado === "archivado"} refreshVersion={refreshVersion} onPendingChange={setPendingOperation} onRecoveryChange={setRecoveryBlocked} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} onReviewPayment={(deliveryId, trigger) => { reviewTrigger.current = trigger ?? null; setRequestedDeliveryId(deliveryId); router.push("?tab=notices"); }} /> : null}
        {tab === "debts" && !access.owner && access.treasury ? <TreasuryDebtSection groupId={groupId} onAccessLost={lost} /> : null}
        {tab === "debts" && !access.owner && access.record ? <div className={access.treasury ? "mt-5" : ""}><AdministrativeReceiptsSection groupId={groupId} owner={false} onPendingChange={setPendingOperation} onRecoveryChange={setRecoveryBlocked} /></div> : null}
        {tab === "notices" ? <PaymentDeliveriesAdminSection groupId={groupId} owner={access.owner} requestedDeliveryId={requestedDeliveryId ?? linkedDeliveryId} onRequestHandled={() => setRequestedDeliveryId(undefined)} onDetailClosed={() => queueMicrotask(() => reviewTrigger.current?.focus())} onEconomyChanged={() => setRefreshVersion((value) => value + 1)} /> : null}
        {tab === "history" && access.owner ? <OwnerPaymentReceiptHistorySection groupId={groupId} refreshVersion={refreshVersion} initiallyExpanded onEconomyChanged={() => setRefreshVersion((value) => value + 1)} /> : null}
      </div>
    </section>
  </>;
}
