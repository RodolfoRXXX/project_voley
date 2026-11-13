"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GroupEconomyTabs, type GroupEconomyTabId } from "@/components/groups/GroupEconomyTabs";
import { MembershipSelfExitControl } from "@/components/memberships/MembershipSelfExitControl";
import { OwnerPaymentReceiptHistorySection } from "@/components/administrativeReceipts/OwnerPaymentReceiptHistorySection";
import { GroupSectionHeader } from "@/components/groups/GroupSectionHeader";

const tabs = [
  { id: "debts" as const, label: "Deudas" },
  { id: "notices" as const, label: "Pagos informados" },
  { id: "history" as const, label: "Historial" },
  { id: "concepts" as const, label: "Conceptos" },
];
const waitFor = async (predicate: () => boolean) => {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > 5000) throw new Error("browser navigation timeout");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const selected = () => document.querySelector("[role='tab'][aria-selected='true']")?.textContent?.trim();
const clickTab = (label: string) => ([...document.querySelectorAll("[role='tab']")].find((node) => node.textContent?.trim() === label) as HTMLElement).click();

export default function Iux06dBrowserPage() {
  const params = useSearchParams();
  const requested = params.get("tab") as GroupEconomyTabId | null;
  const active = tabs.some((tab) => tab.id === requested) ? requested! : "debts";
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const saved = sessionStorage.getItem("iux06d-browser-state");
      if (saved) {
        const assertions = { ...JSON.parse(saved), reloadKeepsTab: selected() === "Pagos informados" && location.search === "?tab=notices" };
        sessionStorage.removeItem("iux06d-browser-state");
        setResult({ passed: Object.values(assertions).every(Boolean), assertions, viewport: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth } });
        return;
      }
      const assertions: Record<string, boolean> = {
        integratedOrder: [...document.querySelectorAll("[role='tab']")].map((node) => node.textContent?.trim()).join("|") === "Deudas|Pagos informados|Historial|Conceptos",
        noHorizontalOverflow: document.documentElement.scrollWidth === document.documentElement.clientWidth,
        sharedHeader: document.querySelector("h1")?.className.includes("text-2xl") === true,
      };
      const leaveTrigger = document.querySelector("button") as HTMLButtonElement;
      leaveTrigger.click(); await waitFor(() => Boolean(document.querySelector("[role='alertdialog']")));
      assertions.exitConfirmation = Boolean([...document.querySelectorAll("button")].find((node) => node.textContent === "Confirmar salida"));
      (document.querySelector("[role='alertdialog']") as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await waitFor(() => !document.querySelector("[role='alertdialog']") && document.activeElement?.textContent === "Salir del grupo"); assertions.exitCancellationRestoresFocus = true;
      const historyToggle = [...document.querySelectorAll("button")].find((node) => node.textContent === "Ver historia") as HTMLButtonElement;
      assertions.paymentHistoryStartsCollapsed = historyToggle?.getAttribute("aria-expanded") === "false";
      historyToggle.click(); await waitFor(() => historyToggle.getAttribute("aria-expanded") === "true");
      historyToggle.click(); await waitFor(() => historyToggle.getAttribute("aria-expanded") === "false"); assertions.paymentHistoryToggles = true;
      clickTab("Conceptos"); await waitFor(() => selected() === "Conceptos" && location.search === "?tab=concepts");
      clickTab("Pagos informados"); await waitFor(() => selected() === "Pagos informados" && location.search === "?tab=notices");
      history.back(); await waitFor(() => selected() === "Conceptos" && location.search === "?tab=concepts"); assertions.backRestoresTab = true;
      history.forward(); await waitFor(() => selected() === "Pagos informados" && location.search === "?tab=notices"); assertions.forwardRestoresTab = true;
      sessionStorage.setItem("iux06d-browser-state", JSON.stringify(assertions));
      location.reload();
    })().catch((error) => setResult({ passed: false, error: String(error), selected: selected(), search: location.search }));
  }, []);
  return <main className="space-y-5 p-4"><GroupSectionHeader title="Mi participación" /><MembershipSelfExitControl groupId="uat-group" membershipId="uat-membership" groupName="Grupo UAT" viewerIsOwner onConfirmed={() => {}} /><OwnerPaymentReceiptHistorySection groupId="uat-group" /><section className="overflow-hidden rounded-2xl border"><GroupEconomyTabs tabs={tabs} activeTab={active} /><div id={`group-economy-panel-${active}`} role="tabpanel" aria-labelledby={`group-economy-tab-${active}`} className="p-4">{tabs.find((tab) => tab.id === active)?.label}</div></section><pre id="iux06d-browser-results">{result ? JSON.stringify(result) : "PENDING"}</pre></main>;
}
