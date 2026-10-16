"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  administrativeReceiptErrorMessage,
  administrativeReceiptErrorReason,
  listDirectPaymentObligations,
  newAdministrativeReceiptKey,
  previewAdministrativeReceipt,
  recordAdministrativeReceipt,
} from "@/services/administrativeReceiptsService";
import { formatArs } from "@/services/paymentsService";
import type { AdministrativePreview } from "@/types/AdministrativeReceipt";
import type { PersonPresentation } from "@/types/Payment";
import {
  administrativeAmountInput,
  buildAdministrativeReceiptLine,
  resolveAdministrativeAmountMinor,
} from "./administrativeReceiptAmounts.mjs";

export type AdministrativeReceiptSubject = {
  membershipId: string;
  seasonId: string;
  state: string;
  person: PersonPresentation;
};

type Obligation = {
  paymentId: string;
  balanceMinor: number;
  economicRevision: number;
  dueDate: string;
  concept: { name: string };
  estado: string;
};
type DraftAmount = { mode: "FULL" | "PARTIAL"; amount: string };
type Relation =
  | "DISTINCT_REAL_RECEIPT"
  | "SAME_CONFIRMABLE_NOTICE"
  | "SAME_REQUIRES_ADMINISTRATIVE_RECORD"
  | "UNDETERMINED";
type ClassificationChoice = Relation | "SAME" | "";

const personName = (person: PersonPresentation) =>
  person.status === "AVAILABLE" ? `${person.firstName} ${person.lastName}` : "Persona sin datos presentables";

export function AdministrativeReceiptDialog({
  groupId,
  owner,
  subject,
  onClose,
  onRecorded,
  onPendingChange,
  onRecoveryChange,
}: {
  groupId: string;
  owner: boolean;
  subject: AdministrativeReceiptSubject;
  onClose: () => void;
  onRecorded?: (message: string) => void;
  onPendingChange?: (pending: boolean) => void;
  onRecoveryChange?: (pending: boolean) => void;
}) {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [selected, setSelected] = useState<Record<string, DraftAmount>>({});
  const [initialReceivedOn] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
  );
  const [receivedOn, setReceivedOn] = useState(initialReceivedOn);
  const [preview, setPreview] = useState<AdministrativePreview | null>(null);
  const [relations, setRelations] = useState<Record<string, ClassificationChoice>>({});
  const [status, setStatus] = useState<"loading" | "idle" | "saving">("loading");
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const intent = useRef<{ key: string; input: Record<string, unknown> } | null>(null);
  const busy = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    void listDirectPaymentObligations({ groupId, membershipId: subject.membershipId, pageSize: 50 }).then(
      (result) => {
        if (!active) return;
        setObligations(result.items);
        setNextCursor(result.nextCursor);
        setStatus("idle");
        queueMicrotask(() => closeButton.current?.focus());
      },
      (cause) => {
        if (!active) return;
        setError(administrativeReceiptErrorMessage(administrativeReceiptErrorReason(cause)));
        setStatus("idle");
      },
    );
    return () => { active = false; };
  }, [groupId, subject.membershipId]);

  const selectedCount = Object.keys(selected).length;
  const lines = useMemo(
    () => obligations.flatMap((obligation) => {
      const draft = selected[obligation.paymentId];
      if (!draft) return [];
      const line = buildAdministrativeReceiptLine(obligation, draft.mode, draft.amount);
      return line ? [line] : [];
    }),
    [obligations, selected],
  );
  const dirty = selectedCount > 0 || preview !== null || receivedOn !== initialReceivedOn;
  useEffect(() => {
    onPendingChange?.(dirty || recoveryPending);
    return () => onPendingChange?.(false);
  }, [dirty, onPendingChange, recoveryPending]);
  useEffect(() => {
    onRecoveryChange?.(recoveryPending);
    return () => onRecoveryChange?.(false);
  }, [onRecoveryChange, recoveryPending]);

  async function loadMoreObligations() {
    if (!nextCursor || busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError("");
    try {
      const result = await listDirectPaymentObligations({
        groupId,
        membershipId: subject.membershipId,
        pageSize: 50,
        cursor: nextCursor,
      });
      setObligations((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (cause) {
      const reason = administrativeReceiptErrorReason(cause);
      setError(administrativeReceiptErrorMessage(reason));
      if (reason === "ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED") {
        setObligations([]);
        setSelected({});
        setNextCursor(undefined);
      }
      queueMicrotask(() => feedback.current?.focus());
    } finally {
      busy.current = false;
      setStatus("idle");
    }
  }

  function requestClose() {
    if (busy.current) return;
    if (recoveryPending) {
      setError("Hay una intención incierta pendiente. Recuperala antes de cerrar este registro.");
      queueMicrotask(() => feedback.current?.focus());
      return;
    }
    if (dirty) setDiscard(true);
    else onClose();
  }

  async function prepare() {
    if (busy.current || selectedCount !== lines.length || lines.length < 1 || lines.length > 20) return;
    busy.current = true;
    setStatus("loading");
    setError("");
    try {
      const result = await previewAdministrativeReceipt({
        groupId,
        membershipId: subject.membershipId,
        receivedOn,
        lines,
      });
      setPreview(result);
      setRelations(Object.fromEntries(result.candidates.map((candidate) => [candidate.deliveryId, ""])));
      intent.current = null;
      setRecoveryPending(false);
    } catch (cause) {
      setError(administrativeReceiptErrorMessage(administrativeReceiptErrorReason(cause)));
      queueMicrotask(() => feedback.current?.focus());
    } finally {
      busy.current = false;
      setStatus("idle");
    }
  }

  function corrected(candidate: AdministrativePreview["candidates"][number]) {
    const expected = new Map(lines.map((line) => [line.paymentId, line.amountMinor]));
    const actual = new Map(candidate.lines.map((line) => [line.paymentId, line.amountMinor]));
    const amount = expected.size !== actual.size || [...expected].some(([key, value]) => actual.get(key) !== value);
    return [
      ...(amount ? ["AMOUNT_OR_ALLOCATION"] : []),
      ...(receivedOn !== candidate.declaredPaidOn ? ["RECEIVED_DATE"] : []),
    ] as string[];
  }

  async function commit() {
    if (!preview || busy.current) return;
    const choices = preview.candidates.map((candidate) => relations[candidate.deliveryId] ?? "");
    if (choices.some((choice) => choice === "" || choice === "SAME")) {
      setError("Clasificá todos los avisos pendientes.");
      return;
    }
    const decisions = preview.candidates.map((candidate) => ({
      deliveryId: candidate.deliveryId,
      expectedDeliveryRevision: candidate.expectedDeliveryRevision,
      relation: relations[candidate.deliveryId] as Relation,
      ...(relations[candidate.deliveryId] === "SAME_REQUIRES_ADMINISTRATIVE_RECORD"
        ? { correctedFields: corrected(candidate) }
        : {}),
    }));
    if (decisions.some((decision) => decision.relation === "UNDETERMINED")) {
      setError("Clasificá todos los avisos pendientes.");
      return;
    }
    if (decisions.some((decision) => decision.relation === "SAME_CONFIRMABLE_NOTICE")) {
      setError("El aviso correcto debe confirmarse desde Revisar pagos informados; no se creará un registro nuevo.");
      return;
    }
    if (!intent.current) {
      intent.current = {
        key: newAdministrativeReceiptKey(),
        input: {
          groupId,
          membershipId: preview.membershipId,
          receivedOn,
          lines,
          candidateRevision: preview.candidateRevision,
          candidateDigest: preview.candidateDigest,
          relatedNoticeDecisions: decisions,
          idempotencyKey: "",
        },
      };
    }
    intent.current.input.idempotencyKey = intent.current.key;
    busy.current = true;
    setStatus("saving");
    setError("");
    try {
      const result = await recordAdministrativeReceipt(intent.current.input);
      const message = result.outcome === "EXISTING"
        ? "Recuperamos el resultado original sin volver a aplicar importes."
        : "Recepción administrativa registrada y aplicada.";
      intent.current = null;
      setRecoveryPending(false);
      onRecorded?.(message);
      onClose();
    } catch (cause) {
      const reason = administrativeReceiptErrorReason(cause);
      setError(administrativeReceiptErrorMessage(reason));
      setRecoveryPending(reason === "PENDING_RECOVERY");
      if (reason !== "PENDING_RECOVERY") intent.current = null;
      queueMicrotask(() => feedback.current?.focus());
    } finally {
      busy.current = false;
      setStatus("idle");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="presentation"
      onKeyDown={(event) => { if (event.key === "Escape") requestClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="administrative-receipt-title" className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-[var(--surface)] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="administrative-receipt-title" className="text-xl font-semibold">Registrar pago</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {personName(subject.person)}
            </p>
          </div>
          <button ref={closeButton} type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={requestClose} aria-label="Cerrar registro de pago">
            Cerrar
          </button>
        </div>
        <div ref={feedback} tabIndex={-1} aria-live="polite">
          {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
        </div>
        <fieldset disabled={preview !== null}>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Seleccioná entre 1 y 20 obligaciones. Los importes se validan contra saldos canónicos al preparar y registrar.
        </p>
        <p role="note" className="mt-3 text-sm text-[var(--text-muted)]">
          La lista se carga por páginas y no se interpreta como deuda completa. Las selecciones se conservan al cargar más.
        </p>
        {status === "loading" && obligations.length === 0 ? <p role="status" className="mt-4">Cargando obligaciones…</p> : null}
        {status !== "loading" && obligations.length === 0 ? <p className="mt-4 text-sm">No hay obligaciones con saldo en la lista autorizada.</p> : null}
        {obligations.length ? (
          <ul className="mt-4 space-y-2">
            {obligations.map((obligation) => {
              const draft = selected[obligation.paymentId];
              const resolved = draft ? resolveAdministrativeAmountMinor(obligation.balanceMinor, draft.mode, draft.amount) : null;
              return (
                <li key={obligation.paymentId} className="rounded-lg border p-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(draft)}
                      disabled={!draft && selectedCount >= 20}
                      onChange={(event) => setSelected((old) => {
                        const next = { ...old };
                        if (event.target.checked) next[obligation.paymentId] = { mode: "FULL", amount: administrativeAmountInput(obligation.balanceMinor) };
                        else delete next[obligation.paymentId];
                        return next;
                      })}
                    />
                    <span className="flex-1">
                      <strong>{obligation.concept.name}</strong>
                      <span className="block text-sm">Saldo {formatArs(obligation.balanceMinor)} · vence {obligation.dueDate}</span>
                    </span>
                  </label>
                  {draft ? (
                    <div className="mt-2 flex flex-wrap gap-2 pl-7">
                      <select
                        className="min-h-11 rounded border px-2"
                        aria-label={`Modalidad para ${obligation.concept.name}`}
                        value={draft.mode}
                        onChange={(event) => setSelected((old) => ({
                          ...old,
                          [obligation.paymentId]: {
                            mode: event.target.value as DraftAmount["mode"],
                            amount: administrativeAmountInput(obligation.balanceMinor),
                          },
                        }))}
                      >
                        <option value="FULL">Total</option>
                        <option value="PARTIAL">Parcial</option>
                      </select>
                      <input
                        className="min-h-11 w-40 rounded border px-2"
                        inputMode="decimal"
                        disabled={draft.mode === "FULL"}
                        value={draft.mode === "FULL" ? administrativeAmountInput(obligation.balanceMinor) : draft.amount}
                        onChange={(event) => setSelected((old) => ({ ...old, [obligation.paymentId]: { ...draft, amount: event.target.value } }))}
                        aria-invalid={draft.mode === "PARTIAL" && resolved === null}
                        aria-label={`Importe para ${obligation.concept.name}`}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {nextCursor ? (
          <button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50" disabled={status !== "idle"} onClick={() => void loadMoreObligations()}>
            {status === "loading" ? "Cargando…" : "Cargar más obligaciones"}
          </button>
        ) : null}
        <label className="mt-4 block text-sm font-semibold">
          Fecha de recepción
          <input className="mt-1 block min-h-11 rounded-lg border px-3" type="date" value={receivedOn} onChange={(event) => { setReceivedOn(event.target.value); setPreview(null); intent.current = null; setRecoveryPending(false); }} />
        </label>
        <p className="mt-3 font-semibold">Total derivado: {formatArs(lines.reduce((total, line) => total + line.amountMinor, 0))}</p>
        <button
          type="button"
          className="mt-3 min-h-11 rounded-lg bg-orange-600 px-4 font-semibold text-white disabled:opacity-50"
          disabled={selectedCount !== lines.length || lines.length < 1 || lines.length > 20 || status !== "idle"}
          onClick={() => void prepare()}
        >
          Revisar registro
        </button>
        </fieldset>

        {preview ? (
          <div className="mt-6 rounded-xl border border-orange-300 p-4" aria-labelledby="receipt-summary-title">
            <h3 id="receipt-summary-title" className="text-lg font-semibold">Resumen y clasificación</h3>
            <p className="mt-2">{preview.receivedOn} · <strong>{formatArs(preview.totalMinor)}</strong></p>
            <ul className="mt-3 space-y-1 text-sm">
              {preview.lines.map((line) => <li key={line.paymentId}>{line.conceptName}: {formatArs(line.amountMinor)} · {line.allocationMode === "FULL" ? "Total" : "Parcial"}</li>)}
            </ul>
            <h4 className="mt-5 font-semibold">Pagos informados pendientes ({preview.candidates.length})</h4>
            {preview.candidates.length === 0 ? <p className="text-sm">No hay avisos candidatos.</p> : preview.candidates.map((candidate) => (
              <div key={candidate.deliveryId} className="mt-2 rounded-lg border p-3">
                <p className="text-sm">Aviso del {candidate.declaredPaidOn}, total {formatArs(candidate.declaredTotalMinor)}</p>
                <fieldset className="mt-3 space-y-3" disabled={recoveryPending}>
                  <legend className="font-semibold">¿Este aviso corresponde al dinero que estás registrando?</legend>
                  <label className="block rounded-lg border p-3">
                    <span className="flex items-start gap-2">
                      <input type="radio" className="mt-1" name={`notice-${candidate.deliveryId}`} checked={relations[candidate.deliveryId] === "DISTINCT_REAL_RECEIPT"} onChange={() => setRelations((old) => ({ ...old, [candidate.deliveryId]: "DISTINCT_REAL_RECEIPT" }))} />
                      <span className="font-medium">No, es otro pago.</span>
                    </span>
                    <span className="mt-1 block pl-6 text-sm text-[var(--text-muted)]">El aviso permanece pendiente.</span>
                  </label>
                  <div className="rounded-lg border p-3">
                    <label className="flex items-start gap-2">
                      <input type="radio" className="mt-1" name={`notice-${candidate.deliveryId}`} checked={["SAME", "SAME_CONFIRMABLE_NOTICE", "SAME_REQUIRES_ADMINISTRATIVE_RECORD"].includes(relations[candidate.deliveryId] ?? "")} onChange={() => setRelations((old) => ({ ...old, [candidate.deliveryId]: "SAME" }))} />
                      <span className="font-medium">Sí.</span>
                    </label>
                    {["SAME", "SAME_CONFIRMABLE_NOTICE", "SAME_REQUIRES_ADMINISTRATIVE_RECORD"].includes(relations[candidate.deliveryId] ?? "") ? (
                      <div className="mt-3 space-y-3 border-l-2 pl-4">
                        <label className="block">
                          <span className="flex items-start gap-2">
                            <input type="radio" className="mt-1" name={`same-notice-${candidate.deliveryId}`} checked={relations[candidate.deliveryId] === "SAME_CONFIRMABLE_NOTICE"} onChange={() => setRelations((old) => ({ ...old, [candidate.deliveryId]: "SAME_CONFIRMABLE_NOTICE" }))} />
                            <span className="font-medium">El aviso es correcto.</span>
                          </span>
                          <span className="mt-1 block pl-6 text-sm text-[var(--text-muted)]">Debe confirmarse por E3-03; este registro no crea otro ingreso.</span>
                        </label>
                        <label className="block">
                          <span className="flex items-start gap-2">
                            <input type="radio" className="mt-1" name={`same-notice-${candidate.deliveryId}`} checked={relations[candidate.deliveryId] === "SAME_REQUIRES_ADMINISTRATIVE_RECORD"} onChange={() => setRelations((old) => ({ ...old, [candidate.deliveryId]: "SAME_REQUIRES_ADMINISTRATIVE_RECORD" }))} />
                            <span className="font-medium">Necesito corregir importe, distribución o fecha.</span>
                          </span>
                          <span className="mt-1 block pl-6 text-sm text-[var(--text-muted)]">La declaración original se conserva y queda vinculada al registro administrativo.</span>
                        </label>
                      </div>
                    ) : null}
                  </div>
                  <label className="block rounded-lg border p-3">
                    <span className="flex items-start gap-2">
                      <input type="radio" className="mt-1" name={`notice-${candidate.deliveryId}`} checked={relations[candidate.deliveryId] === "UNDETERMINED"} onChange={() => setRelations((old) => ({ ...old, [candidate.deliveryId]: "UNDETERMINED" }))} />
                      <span className="font-medium">No estoy seguro.</span>
                    </span>
                    <span className="mt-1 block pl-6 text-sm text-[var(--text-muted)]">No se registra mientras exista incertidumbre.</span>
                  </label>
                </fieldset>
                {relations[candidate.deliveryId] === "SAME_REQUIRES_ADMINISTRATIVE_RECORD" ? (
                  <p className="mt-2 text-xs">Correcciones reales: {corrected(candidate).length ? corrected(candidate).map((item) => item === "RECEIVED_DATE" ? "fecha" : "importe o desglose").join(" y ") : "ninguna; esta clasificación no es válida"}.</p>
                ) : null}
                {relations[candidate.deliveryId] === "SAME_CONFIRMABLE_NOTICE" ? (
                  <p className="mt-2 text-sm"><Link className="font-semibold text-orange-700 underline" href={owner ? `#payment-deliveries` : `/dashboard/payment-review/${groupId}`}>Ir a Revisar pagos informados</Link>. Este flujo no concede permiso de revisión.</p>
                ) : null}
              </div>
            ))}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="min-h-11 rounded-lg border px-4 disabled:opacity-50" disabled={status !== "idle" || recoveryPending} onClick={() => { setPreview(null); intent.current = null; setRecoveryPending(false); }}>Volver al borrador</button>
              <button
                type="button"
                className="min-h-11 rounded-lg bg-orange-600 px-4 font-semibold text-white disabled:opacity-50"
                  disabled={status !== "idle" || preview.candidates.some((candidate) => !relations[candidate.deliveryId] || ["SAME", "UNDETERMINED", "SAME_CONFIRMABLE_NOTICE"].includes(relations[candidate.deliveryId]))}
                onClick={() => void commit()}
              >
                {status === "saving" ? "Registrando…" : recoveryPending ? "Recuperar misma intención" : "Registrar"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {discard ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="discard-receipt-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="discard-receipt-title" className="text-lg font-semibold">Descartar borrador</h3>
            <p className="mt-2 text-sm">Se perderán la selección, fecha y clasificación todavía no registradas.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button autoFocus type="button" className="min-h-11 rounded-lg border px-4 font-semibold" onClick={() => setDiscard(false)}>Seguir editando</button>
              <button type="button" className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white" onClick={onClose}>Descartar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
