"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RegisteredIncomeMovementsSection } from "@/components/registeredIncomeMovements/RegisteredIncomeMovementsSection";
import type { RegisteredIncomeMovementResponse } from "@/types/RegisteredIncomeMovement";

type Result = { passed: boolean; assertions: Record<string, boolean>; measurements: Record<string, unknown> };
const waitFor = async (predicate: () => boolean, timeout = 5000) => {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > timeout) throw new Error("browser gate timeout");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
const rows = () => document.querySelectorAll("tbody tr").length;
const button = (label: string) => [...document.querySelectorAll("button")]
  .find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const setInput = (label: string, value: string) => {
  const input = [...document.querySelectorAll("label")].find((item) => item.textContent?.includes(label))
    ?.querySelector("input") as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

export default function BrowserGatePage() {
  const [result, setResult] = useState<Result | null>(null);
  const callbacks = useRef(new Set<() => void>());
  const driverStarted = useRef(false);
  const [requests, setRequests] = useState(0);
  const requestCount = useRef(0);
  const loader = useMemo(() => async (query: { groupId: string; from?: string; to?: string }) => {
    const requestNumber = requestCount.current + 1;
    requestCount.current = requestNumber;
    setRequests(requestNumber);
    const response = await fetch(`/api/e3-browser-data?from=${query.from}&to=${query.to}&request=${requestNumber}`);
    return await response.json() as RegisteredIncomeMovementResponse;
  }, []);
  const observe = useCallback((callback: () => void) => {
    callbacks.current.add(callback);
    return () => { callbacks.current.delete(callback); };
  }, []);
  const accessLost = useCallback(() => {}, []);

  useEffect(() => {
    if (driverStarted.current) return;
    driverStarted.current = true;
    let active = true;
    void (async () => {
      let stage = "initial-render";
      try {
        await waitFor(() => rows() === 20);
        const assertions: Record<string, boolean> = { initialRows20: rows() === 20 };
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        const heapAfterInitialParse = memory?.usedJSHeapSize ?? null;
        const initialRequests = Number(document.querySelector("[data-requests]")?.textContent ?? "0");
        button("Siguiente")!.focus();
        button("Siguiente")!.click();
        stage = "page-20";
        await waitFor(() => document.body.textContent?.includes("página 2 de 50") === true);
        assertions.keyboardFocus = document.activeElement?.textContent?.trim() === "Siguiente";
        assertions.page20NoRequest = rows() === 20
          && Number(document.querySelector("[data-requests]")?.textContent ?? "0") === initialRequests;
        const select = document.querySelector("select") as HTMLSelectElement;
        select.value = "50";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        stage = "page-50";
        await waitFor(() => rows() === 50);
        assertions.page50NoRequest = Number(document.querySelector("[data-requests]")?.textContent ?? "0") === initialRequests;
        assertions.onlyVisibleRowsRendered = document.querySelectorAll("tbody tr").length === 50;
        const oldCutoff = document.body.textContent;
        button("Actualizar")!.click();
        stage = "refresh-request";
        await waitFor(() => Number(document.querySelector("[data-requests]")?.textContent ?? "0") > initialRequests);
        stage = "refresh-response";
        await waitFor(() => rows() === 50);
        assertions.refreshReplacesSet = oldCutoff !== document.body.textContent;

        setInput("Desde", "2026-09-01"); setInput("Hasta", "2026-09-30");
        (document.querySelector("form") as HTMLFormElement).requestSubmit();
        await new Promise((resolve) => setTimeout(resolve, 40));
        setInput("Desde", "2026-08-01"); setInput("Hasta", "2026-08-31");
        (document.querySelector("form") as HTMLFormElement).requestSubmit();
        stage = "late-response-fast";
        await waitFor(() => document.body.textContent?.includes("2026-08-01 Persona") === true);
        await new Promise((resolve) => setTimeout(resolve, 700));
        assertions.lateResponseDiscarded = document.body.textContent?.includes("2026-09-01 Persona") === false;
        for (const callback of callbacks.current) callback();
        stage = "signed-out-cleanup";
        await waitFor(() => rows() === 0);
        assertions.signedOutClearsView = !document.body.textContent?.includes("Ingreso neto registrado");
        assertions.accessibleFeedback = Boolean(document.querySelector("[aria-live='polite'][tabindex='-1']"));
        const resources = performance.getEntriesByType("resource")
          .filter((entry) => entry.name.includes("/api/e3-browser-data"));
        if (active) setResult({ passed: Object.values(assertions).every(Boolean), assertions,
          measurements: { browser: navigator.userAgent, heapAfterInitialParse,
            heapObserved: heapAfterInitialParse !== null, transportRequests: resources.length,
            transferDurationMs: resources.map((entry) => Number(entry.duration.toFixed(3))),
            rowsInDto: 1000, renderedRows20: 20, renderedRows50: 50 } });
      } catch (error) {
        if (active) setResult({ passed: false, assertions: {}, measurements: { error: String(error), stage,
          rows: rows(), text: document.body.textContent?.slice(0, 500) } });
      }
    })();
    return () => { active = false; };
  }, []);

  return <main><output data-requests>{requests}</output><RegisteredIncomeMovementsSection
    groupId="browser-group" onAccessLost={accessLost} loadMovements={loader} observeSignedOut={observe} />
    <pre id="e3-browser-results">{result ? JSON.stringify(result) : "PENDING"}</pre></main>;
}
