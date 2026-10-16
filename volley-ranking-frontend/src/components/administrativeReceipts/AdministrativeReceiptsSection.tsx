"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  administrativeReceiptErrorMessage,
  administrativeReceiptErrorReason,
  searchDirectPaymentSubjects,
} from "@/services/administrativeReceiptsService";
import type { PersonPresentation } from "@/types/Payment";
import {
  AdministrativeReceiptDialog,
  type AdministrativeReceiptSubject,
} from "./AdministrativeReceiptDialog";

const personName = (person: PersonPresentation) =>
  person.status === "AVAILABLE" ? `${person.firstName} ${person.lastName}` : "Persona sin datos presentables";

export function AdministrativeReceiptsSection({
  groupId,
  owner,
  onEconomyChanged,
  onPendingChange,
  onRecoveryChange,
}: {
  groupId: string;
  owner: boolean;
  onEconomyChanged?: () => void;
  onPendingChange?: (pending: boolean) => void;
  onRecoveryChange?: (pending: boolean) => void;
}) {
  const [subjects, setSubjects] = useState<AdministrativeReceiptSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<AdministrativeReceiptSubject | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const searching = useRef(false);

  const find = useCallback(async () => {
    if (searching.current) return;
    searching.current = true;
    setStatus("loading");
    setError("");
    try {
      const result = await searchDirectPaymentSubjects({ groupId, query: query || undefined, pageSize: 20 });
      setSubjects(result.items);
    } catch (cause) {
      setError(administrativeReceiptErrorMessage(administrativeReceiptErrorReason(cause)));
    } finally {
      searching.current = false;
      setStatus("idle");
    }
  }, [groupId, query]);

  useEffect(() => { void find(); }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeDialog() {
    setSelectedSubject(null);
    queueMicrotask(() => trigger.current?.focus());
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" aria-labelledby="administrative-receipts-title">
      <div ref={feedback} tabIndex={-1} aria-live="polite">
        <h2 id="administrative-receipts-title" className="text-xl font-semibold">Registrar pagos</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Elegí una Persona y abrí el mismo modal multiobligación usado por Owner. Tu capability de registro no concede economía, historia ni revisión.
        </p>
        {notice ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
      </div>
      <div className="mt-5 flex gap-2">
        <input className="min-h-11 flex-1 rounded-lg border px-3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Persona" aria-label="Buscar Persona" />
        <button type="button" className="min-h-11 rounded-lg border px-4 font-semibold" disabled={status !== "idle"} onClick={() => void find()}>
          {status === "loading" ? "Buscando…" : "Buscar"}
        </button>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {subjects.map((subject) => (
          <li key={subject.membershipId}>
            <button
              type="button"
              className="min-h-11 w-full rounded-lg border p-3 text-left"
              onClick={(event) => { trigger.current = event.currentTarget; setSelectedSubject(subject); }}
            >
              <span className="font-semibold">{personName(subject.person)}</span>
              <span className="block text-xs text-[var(--text-muted)]">Membresía {subject.state === "activa" ? "activa" : "finalizada"}</span>
            </button>
          </li>
        ))}
      </ul>
      {selectedSubject ? (
        <AdministrativeReceiptDialog
          groupId={groupId}
          owner={owner}
          subject={selectedSubject}
          onClose={closeDialog}
          onPendingChange={onPendingChange}
          onRecoveryChange={onRecoveryChange}
          onRecorded={(message) => {
            setNotice(message);
            onEconomyChanged?.();
            queueMicrotask(() => feedback.current?.focus());
          }}
        />
      ) : null}
    </section>
  );
}
