"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { administrativeReceiptErrorMessage, administrativeReceiptErrorReason, listMyMembershipRegisteredPayments } from "@/services/administrativeReceiptsService";
import { deliveryErrorMessage, deliveryErrorReason, getMyPaymentDelivery, listMyMembershipPaymentNotices, listMyPaymentObligationApplications } from "@/services/paymentDeliveriesService";
import { formatArs, getMyPaymentObligationDetail, getPaymentErrorMessage, getPaymentErrorReason, listMyMembershipObligations, listPaymentPrincipalCorrections, listPaymentWaiverHistory } from "@/services/paymentsService";
import type { OwnRegisteredPayment } from "@/types/AdministrativeReceipt";
import type { MembershipObligation, MyPaymentObligationDetail, Obligation, PendingNoticeEvidence } from "@/types/Payment";
import type { MembershipPaymentNotice, PaymentDelivery } from "@/types/PaymentDelivery";
import { appliedPaymentLabel, correctionReasonLabel, noticeStateLabel, obligationStateLabel, registeredPaymentLabel, rejectionReasonLabel, waiverEventLabel } from "./paymentPresentation";

type Page<T> = { items: T[]; nextCursor?: string; pendingNoticeCoverage?: "COMPLETE" | "PARTIAL" | "FAILED" };
type BlockStatus = "loading" | "ready" | "error";
type EconomyTab = "obligations" | "notices" | "payments";

const tabs: ReadonlyArray<{ id: EconomyTab; label: string }> = [
  { id: "obligations", label: "Obligaciones" },
  { id: "notices", label: "Avisos" },
  { id: "payments", label: "Pagos" },
];

function isEconomyTab(value: string | null): value is EconomyTab { return tabs.some((tab) => tab.id === value); }

function usePagedBlock<T>(key: string, loader: (cursor?: string) => Promise<Page<T>>, errorMessage: (cause: unknown) => string) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursorState] = useState<string | undefined>();
  const cursorRef = useRef<string | undefined>(undefined);
  const [status, setStatus] = useState<BlockStatus>("loading");
  const [error, setError] = useState("");
  const [supplementFailed, setSupplementFailed] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const load = useCallback(async (append = false) => {
    if (busy.current) return;
    busy.current = true;
    const request = ++generation.current;
    setStatus("loading"); setError("");
    try {
      const page = await loader(append ? cursorRef.current : undefined);
      if (request !== generation.current) return;
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setSupplementFailed((current) => append ? current || page.pendingNoticeCoverage === "FAILED" : page.pendingNoticeCoverage === "FAILED");
      cursorRef.current = page.nextCursor;
      setCursorState(page.nextCursor);
      setStatus("ready");
    } catch (cause) {
      if (request !== generation.current) return;
      setError(errorMessage(cause));
      setStatus("error");
    } finally {
      if (request === generation.current) busy.current = false;
    }
  }, [errorMessage, loader]);
  useEffect(() => {
    queueMicrotask(() => void load(false));
    return () => { generation.current += 1; busy.current = false; };
  }, [key, load]);
  return { items, cursor, status, error, supplementFailed, refresh: () => load(false), more: () => load(true) };
}

const dateTime = (value?: string) => value ? new Date(value).toLocaleString("es-AR") : "—";
const civilDate = (value?: string) => value ? new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(`${value}T00:00:00Z`)) : "—";
const obligationPeriod = (item: Obligation) => item.periodKey ? `Período ${item.periodKey}` : `Vence ${civilDate(item.dueDate)}`;
type EconomicLine = { paymentId: string; amountMinor: number; conceptName?: string; dueDate?: string };

function RelatedLines({ lines, amountLabel }: { lines: EconomicLine[]; amountLabel: string }) {
  if (!lines.length) return <p className="mt-2 text-sm text-[var(--text-muted)]">No hay una descripción histórica disponible para este movimiento.</p>;
  const renderLine = (line: EconomicLine) => <li key={line.paymentId} className="grid gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
    <span className="min-w-0"><strong className="block break-words">{line.conceptName?.trim() || "Obligación sin descripción disponible"}</strong><span className="text-[var(--text-muted)]">{line.dueDate ? `Vencimiento ${civilDate(line.dueDate)}` : "Período no informado"}</span></span>
    <span className="tabular-nums sm:text-right"><span className="block text-xs text-[var(--text-muted)]">{amountLabel}</span>{formatArs(line.amountMinor)}</span>
  </li>;
  if (lines.length === 1) return <ul className="mt-2 divide-y border-y">{lines.map(renderLine)}</ul>;
  return <details className="mt-2 rounded-lg border p-3"><summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">{lines[0].conceptName?.trim() || "Obligación sin descripción disponible"} y {lines.length - 1} más · Ver desglose</summary><ul className="mt-2 divide-y">{lines.map(renderLine)}</ul></details>;
}

function BlockShell({ title, status, error, empty, hasItems, onRetry, onRefresh, children, cursor, onMore }: { title: string; status: BlockStatus; error: string; empty: string; hasItems: boolean; onRetry: () => void; onRefresh: () => void; children: React.ReactNode; cursor?: string; onMore: () => void }) {
  const headingId = `economy-${title.toLocaleLowerCase("es-AR").replaceAll(" ", "-")}`;
  return <section aria-labelledby={headingId}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 id={headingId} className="font-semibold">{title}</h3><RefreshButton loading={status === "loading"} onClick={onRefresh} label={`Actualizar ${title.toLocaleLowerCase("es-AR")}`} /></div>
    {status === "loading" && !hasItems ? <p role="status" className="mt-3 text-sm text-[var(--text-muted)]">Cargando {title.toLocaleLowerCase("es-AR")}…</p> : null}
    {status === "error" ? <div role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"><p>{error}</p><button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-lg border border-red-400 px-3 font-semibold">Reintentar</button></div> : null}
    {status === "ready" && !hasItems ? <p className="mt-3 text-sm text-[var(--text-muted)]">{empty}</p> : null}
    {children}
    {cursor ? <button type="button" disabled={status === "loading"} onClick={onMore} className="mt-3 min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50">Cargar más</button> : null}
  </section>;
}

function PendingNoticeEvidenceView({ evidence, noticeHref }: { evidence: PendingNoticeEvidence; noticeHref: (deliveryId?: string) => string }) {
  if (evidence.state === "NONE") return null;
  if (evidence.state === "FOUND") return <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs"><strong className="block text-amber-950">Pago informado · En revisión</strong><span className="block text-amber-900">{formatArs(evidence.notice.requestedAmountMinor)} · {civilDate(evidence.notice.declaredPaidOn)}</span><Link href={noticeHref(evidence.notice.deliveryId)} className="mt-1 inline-flex min-h-11 items-center font-semibold text-orange-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">Ver aviso</Link></div>;
  if (evidence.reason === "PARTIAL_COVERAGE") return <Link href={noticeHref()} className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-orange-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">Consultá tus avisos de pago</Link>;
  return null;
}

function ObligationsBlock({ groupId, membershipId, reportHref, noticeHref }: { groupId: string; membershipId: string; reportHref: (paymentId: string) => string; noticeHref: (deliveryId?: string) => string }) {
  const key = `${groupId}\u0000${membershipId}`;
  const loader = useCallback((cursor?: string) => listMyMembershipObligations({ groupId, membershipId, pageSize: 20, ...(cursor === undefined ? {} : { cursor }) }), [groupId, membershipId]);
  const errorMessage = useCallback((cause: unknown) => { const reason = getPaymentErrorReason(cause); return reason === "VALIDATION_FAILED" ? "No pudimos consultar las obligaciones de esta Membresía. Actualizá la vista o reintentá." : getPaymentErrorMessage(reason); }, []);
  const block = usePagedBlock<MembershipObligation>(key, loader, errorMessage);
  const [detail, setDetail] = useState<MyPaymentObligationDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<BlockStatus>("ready");
  const [detailError, setDetailError] = useState("");
  const detailGeneration = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeDetail = useCallback(() => { detailGeneration.current += 1; setDetail(null); setDetailError(""); setDetailStatus("ready"); queueMicrotask(() => returnFocus.current?.focus()); }, []);
  async function openDetail(paymentId: string, trigger: HTMLElement) {
    const request = ++detailGeneration.current; returnFocus.current = trigger; setDetail(null); setDetailError(""); setDetailStatus("loading");
    try { const response = await getMyPaymentObligationDetail(paymentId); if (request !== detailGeneration.current) return; setDetail(response); setDetailStatus("ready"); queueMicrotask(() => closeButton.current?.focus()); }
    catch (cause) { if (request !== detailGeneration.current) return; setDetailError(errorMessage(cause)); setDetailStatus("error"); }
  }
  useEffect(() => { if (!detail && detailStatus === "ready") return; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeDetail(); }; window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, [closeDetail, detail, detailStatus]);
  async function moreApplications() { if (!detail?.applicationNextCursor) return; try { const page = await listMyPaymentObligationApplications({ paymentId: detail.paymentId, pageSize: 20, cursor: detail.applicationNextCursor }); setDetail((current) => current ? { ...current, applications: [...current.applications, ...page.items], applicationNextCursor: page.nextCursor } : current); } catch (cause) { const reason = deliveryErrorReason(cause); setDetailError(reason === "VALIDATION_FAILED" ? "No pudimos continuar las aplicaciones de esta obligación. Recargá el detalle." : deliveryErrorMessage(reason)); } }
  async function moreCorrections() { if (!detail?.correctionNextCursor) return; try { const page = await listPaymentPrincipalCorrections({ paymentId: detail.paymentId, pageSize: 20, cursor: detail.correctionNextCursor }); setDetail((current) => current ? { ...current, principalCorrections: [...current.principalCorrections, ...page.items], correctionNextCursor: page.nextCursor } : current); } catch (cause) { setDetailError(errorMessage(cause)); } }
  async function moreWaivers() { if (!detail?.waiverNextCursor) return; try { const page = await listPaymentWaiverHistory({ paymentId: detail.paymentId, pageSize: 20, cursor: detail.waiverNextCursor }); setDetail((current) => current ? { ...current, waiverHistory: [...current.waiverHistory, ...page.items], waiverNextCursor: page.nextCursor } : current); } catch (cause) { setDetailError(errorMessage(cause)); } }
  const detailEvidence = detail ? block.items.find((item) => item.paymentId === detail.paymentId)?.pendingNoticeEvidence : undefined;
  return <>
    <BlockShell title="Obligaciones pendientes" status={block.status} error={block.error} empty="No hay obligaciones con saldo en esta Membresía." hasItems={block.items.length > 0} onRetry={block.refresh} onRefresh={block.refresh} cursor={block.cursor} onMore={block.more}>
      {block.supplementFailed ? <div role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p>No pudimos comprobar los avisos de pago en revisión. Las obligaciones y sus saldos siguen disponibles.</p><button type="button" disabled={block.status === "loading"} onClick={block.refresh} className="mt-2 min-h-11 rounded-lg border border-amber-500 px-3 font-semibold disabled:opacity-50">Reintentar comprobación</button></div> : null}
      <div className="mt-3 hidden md:block"><table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
        <thead><tr className="text-[var(--text-muted)]"><th scope="col" className="w-[34%] border-b px-3 py-2 font-medium">Concepto y período</th><th scope="col" className="w-[17%] border-b px-3 py-2 text-right font-medium">Importe actual</th><th scope="col" className="w-[17%] border-b px-3 py-2 text-right font-medium">Saldo pendiente</th><th scope="col" className="w-[16%] border-b px-3 py-2 font-medium">Estado</th><th scope="col" className="w-[16%] border-b px-3 py-2 text-right font-medium">Acciones</th></tr></thead>
        <tbody>{block.items.map((item) => <tr key={item.paymentId}>
          <td className="border-b px-3 py-3 align-top"><strong className="break-words">{item.concept.name}</strong><span className="mt-1 block text-[var(--text-muted)]">{obligationPeriod(item)}</span><PendingNoticeEvidenceView evidence={item.pendingNoticeEvidence} noticeHref={noticeHref} /></td>
          <td className="border-b px-3 py-3 text-right align-top font-medium tabular-nums">{formatArs(item.currentPrincipalMinor)}</td>
          <td className="border-b px-3 py-3 text-right align-top font-semibold tabular-nums">{formatArs(item.balanceMinor)}</td>
          <td className="border-b px-3 py-3 align-top"><span className="inline-flex rounded-full border px-2 py-1 font-semibold">{obligationStateLabel(item.estado)}</span></td>
          <td className="border-b px-3 py-2 text-right align-top"><button type="button" className="min-h-11 rounded-lg border px-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500" onClick={(event) => void openDetail(item.paymentId, event.currentTarget)}>Ver detalle</button></td>
        </tr>)}</tbody>
      </table></div>
      <ul className="mt-3 divide-y rounded-xl border md:hidden">{block.items.map((item) => <li key={item.paymentId} className="p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><strong className="break-words">{item.concept.name}</strong><p className="mt-1 text-sm text-[var(--text-muted)]">{obligationPeriod(item)} · {obligationStateLabel(item.estado)}</p><PendingNoticeEvidenceView evidence={item.pendingNoticeEvidence} noticeHref={noticeHref} /></div><strong className="text-right tabular-nums">{formatArs(item.balanceMinor)}<span className="block text-xs font-normal text-[var(--text-muted)]">pendiente</span></strong></div><button type="button" className="mt-2 min-h-11 rounded-lg border px-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500" onClick={(event) => void openDetail(item.paymentId, event.currentTarget)}>Ver detalle</button></li>)}</ul>
    </BlockShell>
    {detail || detailStatus !== "ready" ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3 sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="personal-obligation-detail-title" className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3"><h2 id="personal-obligation-detail-title" className="text-lg font-semibold">Detalle de la obligación</h2><button ref={closeButton} type="button" onClick={closeDetail} className="min-h-11 rounded-lg border px-3 font-semibold">Cerrar</button></div>
      {detailStatus === "loading" ? <p role="status" className="mt-4">Cargando detalle…</p> : null}
      {detailStatus === "error" ? <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-900">{detailError}</p> : null}
      {detail ? <>
        <p className="mt-3 text-sm text-[var(--text-muted)]">{detail.context.groupName} · {detail.context.seasonName}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt>Concepto</dt><dd className="font-semibold">{detail.concept.name}</dd></div>
          <div><dt>Saldo pendiente</dt><dd className="font-semibold">{formatArs(detail.balanceMinor)}</dd></div>
          <div><dt>Importe actual</dt><dd>{formatArs(detail.currentPrincipalMinor)}</dd></div>
          {detail.amountMinor !== detail.currentPrincipalMinor ? <div><dt>Importe original</dt><dd>{formatArs(detail.amountMinor)}</dd></div> : null}
          {detail.netConfirmedIncomeMinor > 0 ? <div><dt>Pagos confirmados aplicados</dt><dd>{formatArs(detail.netConfirmedIncomeMinor)}</dd></div> : null}
          {detail.currentWaivedAmountMinor > 0 ? <div><dt>Deuda perdonada vigente</dt><dd>{formatArs(detail.currentWaivedAmountMinor)}</dd></div> : null}
          <div><dt>Estado</dt><dd>{obligationStateLabel(detail.estado)}</dd></div>
        </dl>
        {detailEvidence?.state === "FOUND" ? <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><strong>Ya informaste un pago que está en revisión.</strong><p>Podés revisar ese aviso antes de informar otro. Esto no modifica el saldo hasta su confirmación.</p><Link href={noticeHref(detailEvidence.notice.deliveryId)} className="mt-2 inline-flex min-h-11 items-center font-semibold text-orange-800 underline">Ver aviso informado</Link></div> : null}
        {detail.estado === "PENDING" || detail.estado === "PARTIAL" ? detail.balanceMinor > 0 && detail.lifecycle !== "VOIDED" ? <Link href={reportHref(detail.paymentId)} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">Informar un pago</Link> : <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">No hay saldo disponible para informar.</p> : <p className="mt-5 rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">{detail.estado === "SETTLED" ? "La obligación ya está saldada." : detail.estado === "VOIDED" || detail.lifecycle === "VOIDED" ? "La obligación está anulada y no admite avisos de pago." : "Esta obligación no admite avisos de pago en su estado actual."}</p>}
        <section className="mt-5"><h3 className="font-semibold">Pagos aplicados</h3>{detail.applications.length ? <ul className="mt-2 space-y-2">{detail.applications.map((item) => <li key={`${item.origin}-${item.applicationId}`} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{formatArs(item.amountMinor)}</strong><span>{appliedPaymentLabel(item)}</span></div><p>Aplicado: {dateTime(item.appliedAt)} · Fecha efectiva: {item.effectiveOn}</p>{item.reversedAt ? <p>Revertido: {dateTime(item.reversedAt)}</p> : null}</li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-muted)]">No hay pagos aplicados.</p>}{detail.applicationNextCursor ? <button type="button" className="mt-3 min-h-11 rounded-lg border px-3 font-semibold" onClick={() => void moreApplications()}>Cargar más pagos aplicados</button> : null}</section>
        <section className="mt-5"><h3 className="font-semibold">Ajustes de la obligación</h3>
          {detail.principalCorrections.length ? <><h4 className="mt-3 text-sm font-semibold">Cambios de importe</h4><ul className="mt-2 space-y-2">{detail.principalCorrections.map((item) => <li key={item.correctionId} className="rounded-lg border p-3 text-sm"><strong>Importe ajustado de {formatArs(item.fromPrincipalMinor)} a {formatArs(item.toPrincipalMinor)}</strong><p>{correctionReasonLabel(item.reasonCode)} · {dateTime(item.correctedAt)}</p></li>)}</ul></> : null}
          {detail.waiverHistory.length ? <><h4 className="mt-3 text-sm font-semibold">Perdón de deuda</h4><ul className="mt-2 space-y-2">{detail.waiverHistory.map((item) => <li key={item.eventId} className="rounded-lg border p-3 text-sm"><strong>{waiverEventLabel(item)} · {formatArs(item.amountMinor)}</strong>{item.kind === "WAIVER_CREATED" ? <p>Esta condonación redujo la deuda. {item.reasonLabel ? `Motivo: ${item.reasonLabel}.` : ""}</p> : <p>La reducción de deuda fue revertida.</p>}<p>{dateTime(item.occurredAt)}</p></li>)}</ul></> : null}
          {!detail.principalCorrections.length && !detail.waiverHistory.length ? <p className="mt-2 text-sm text-[var(--text-muted)]">No hay ajustes.</p> : null}
          {detail.correctionNextCursor ? <button type="button" className="mt-3 min-h-11 rounded-lg border px-3 font-semibold" onClick={() => void moreCorrections()}>Cargar más cambios de importe</button> : null}
          {detail.waiverNextCursor ? <button type="button" className="mt-3 min-h-11 rounded-lg border px-3 font-semibold" onClick={() => void moreWaivers()}>Cargar más ajustes de deuda</button> : null}
        </section>
        {detail.lifecycle === "VOIDED" ? <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">Obligación anulada el {dateTime(detail.voidedAt)}.</p> : null}
        {detailError ? <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{detailError}</p> : null}
      </> : null}
    </div></div> : null}
  </>;
}

type NoticeListItem = MembershipPaymentNotice | PaymentDelivery;

function NoticeRow({ item, selected, localized, paymentHref, closeSelectedHref }: { item: NoticeListItem; selected: boolean; localized: boolean; paymentHref: (receiptId: string) => string; closeSelectedHref: string }) {
  const related = item.decisionState === "CONFIRMED" ? item.deliveryId : item.resolution?.administrativeReceiptId;
  const lines = (item.lines ?? []).map((line) => ({ paymentId: line.paymentId, amountMinor: line.requestedAmountMinor, conceptName: line.conceptName, dueDate: line.dueDate }));
  return <li id={`notice-${item.deliveryId}`} tabIndex={selected ? -1 : undefined} aria-current={selected ? "true" : undefined} className={`scroll-mt-24 rounded-xl border p-3 text-sm ${selected ? "border-2 border-orange-500 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500" : ""}`}>
    {selected ? <p className="mb-2 font-semibold text-orange-900">Aviso seleccionado</p> : null}
    {localized ? <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-950">Resultado localizado fuera de la página cargada. Cargar más conserva la paginación original.</p> : null}
    <div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-base">{formatArs(item.declaredTotalMinor)}</strong><p className="text-[var(--text-muted)]">Importe informado · Fecha declarada {civilDate(item.declaredPaidOn)}</p></div><span className="rounded-full border px-2 py-1 font-semibold">{noticeStateLabel(item.decisionState)}</span></div>
    <RelatedLines lines={lines} amountLabel="Importe informado" />
    <p className="mt-3">Informado: {dateTime(item.reportedAt)}</p>
    {item.confirmedAt ? <p>Confirmado: {dateTime(item.confirmedAt)}</p> : null}
    {item.rejectedAt ? <p>Rechazado: {dateTime(item.rejectedAt)}</p> : null}
    {item.rejection ? <p>Motivo: {rejectionReasonLabel(item.rejection.reasonCode)}{item.rejection.reasonNote ? ` · ${item.rejection.reasonNote}` : ""}</p> : null}
    {item.resolution ? <p>Resuelto: {dateTime(item.resolution.resolvedAt)}</p> : null}
    <div className="flex flex-wrap gap-3">{related ? <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-orange-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500" href={paymentHref(related)}>{item.decisionState === "CONFIRMED" ? "Aviso confirmado — ver pago registrado" : "Ver pago registrado relacionado"}</Link> : null}{selected ? <Link href={closeSelectedHref} className="mt-2 inline-flex min-h-11 items-center font-semibold text-orange-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">Cerrar selección</Link> : null}</div>
  </li>;
}

function NoticesBlock({ groupId, membershipId, paymentHref, selectedNoticeId, closeSelectedHref }: { groupId: string; membershipId: string; paymentHref: (receiptId: string) => string; selectedNoticeId: string | null; closeSelectedHref: string }) {
  const loader = useCallback((cursor?: string) => listMyMembershipPaymentNotices({ groupId, membershipId, pageSize: 20, ...(cursor === undefined ? {} : { cursor }) }), [groupId, membershipId]);
  const errorMessage = useCallback((cause: unknown) => { const reason = deliveryErrorReason(cause); return reason === "VALIDATION_FAILED" ? "No pudimos consultar los avisos de pago de esta Membresía. Actualizá la vista o reintentá." : deliveryErrorMessage(reason); }, []);
  const block = usePagedBlock(`${groupId}\u0000${membershipId}`, loader, errorMessage);
  const [selectedResult, setSelectedResult] = useState<{ id: string; notice: PaymentDelivery } | null>(null);
  const [selectedErrorResult, setSelectedErrorResult] = useState<{ id: string; message: string } | null>(null);
  const selectedGeneration = useRef(0);
  useEffect(() => {
    const request = ++selectedGeneration.current;
    if (!selectedNoticeId) return;
    void getMyPaymentDelivery(selectedNoticeId).then((notice) => {
      if (request !== selectedGeneration.current) return;
      if (notice.groupId !== groupId || notice.membershipId !== membershipId || notice.deliveryId !== selectedNoticeId) { setSelectedErrorResult({ id: selectedNoticeId, message: "El aviso no corresponde a esta Membresía." }); return; }
      setSelectedResult({ id: selectedNoticeId, notice });
    }, (cause) => { if (request === selectedGeneration.current) setSelectedErrorResult({ id: selectedNoticeId, message: deliveryErrorMessage(deliveryErrorReason(cause)) }); });
    return () => { selectedGeneration.current += 1; };
  }, [groupId, membershipId, selectedNoticeId]);
  const selected = selectedResult?.id === selectedNoticeId ? selectedResult.notice : null;
  const selectedError = selectedErrorResult?.id === selectedNoticeId ? selectedErrorResult.message : "";
  const loaded = new Map<string, NoticeListItem>();
  for (const item of block.items) if (!loaded.has(item.deliveryId)) loaded.set(item.deliveryId, item);
  const selectedIsLoaded = selectedNoticeId ? loaded.has(selectedNoticeId) : false;
  if (selected && selectedNoticeId) loaded.set(selectedNoticeId, selected);
  const rendered = [...loaded.values()].map((item) => ({ item, localized: false }));
  if (selected && !selectedIsLoaded) rendered.unshift({ item: selected, localized: true });
  useEffect(() => {
    if (!selectedNoticeId || (!selectedIsLoaded && !selected)) return;
    const target = document.getElementById(`notice-${selectedNoticeId}`);
    if (!target) return;
    target.scrollIntoView({ block: "center" }); target.focus({ preventScroll: true });
  }, [block.items.length, block.status, selected, selectedIsLoaded, selectedNoticeId]);
  return <BlockShell title="Avisos informados" status={block.status} error={block.error} empty="No hay avisos informados para esta Membresía." hasItems={rendered.length > 0 || Boolean(selectedNoticeId && !selectedError)} onRetry={block.refresh} onRefresh={block.refresh} cursor={block.cursor} onMore={block.more}>
    {selectedNoticeId && !selected && !selectedError && !selectedIsLoaded ? <p role="status" className="mt-3 rounded-lg border p-3 text-sm">Localizando aviso…</p> : null}
    {selectedError ? <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{selectedError}</p> : null}
    <ul className="mt-3 space-y-3">{rendered.map(({ item, localized }) => <NoticeRow key={item.deliveryId} item={item} selected={item.deliveryId === selectedNoticeId} localized={localized} paymentHref={paymentHref} closeSelectedHref={closeSelectedHref} />)}</ul>
  </BlockShell>;
}

function RegisteredPaymentsBlock({ groupId, membershipId }: { groupId: string; membershipId: string }) {
  const loader = useCallback((cursor?: string) => listMyMembershipRegisteredPayments({ groupId, membershipId, pageSize: 20, ...(cursor === undefined ? {} : { cursor }) }), [groupId, membershipId]);
  const errorMessage = useCallback((cause: unknown) => { const reason = administrativeReceiptErrorReason(cause); return reason === "VALIDATION_FAILED" ? "No pudimos consultar los pagos registrados de esta Membresía. Actualizá la vista o reintentá." : administrativeReceiptErrorMessage(reason); }, []);
  const block = usePagedBlock(`${groupId}\u0000${membershipId}`, loader, errorMessage);
  useEffect(() => {
    if (block.status !== "ready" || !window.location.hash.startsWith("#registered-")) return;
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
  }, [block.items, block.status]);
  return <BlockShell title="Pagos registrados" status={block.status} error={block.error} empty="No hay pagos registrados para esta Membresía." hasItems={block.items.length > 0} onRetry={block.refresh} onRefresh={block.refresh} cursor={block.cursor} onMore={block.more}>
    <ul className="mt-3 space-y-3">{block.items.map((item: OwnRegisteredPayment) => <li id={`registered-${item.receiptId}`} tabIndex={-1} key={`${item.origin}-${item.receiptId}`} className="scroll-mt-24 rounded-xl border p-3 text-sm focus:outline focus:outline-2 focus:outline-orange-500"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-base">{formatArs(item.totalMinor)}</strong><p className="text-[var(--text-muted)]">Aplicación confirmada · Fecha efectiva {civilDate(item.effectiveOn)}</p></div><span className={`rounded-full border px-2 py-1 font-semibold ${item.applicationState === "REVERSED" ? "border-amber-400 bg-amber-50" : ""}`}>{registeredPaymentLabel(item)}</span></div><RelatedLines lines={item.lines} amountLabel="Importe aplicado" /><p className="mt-3">{item.origin === "INFORMED" ? "Confirmado" : "Registrado"}: {dateTime(item.registeredAt)}</p>{item.reversedAt ? <p className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-2">Revertido: {dateTime(item.reversedAt)}. La aplicación dejó de reducir el saldo.</p> : null}</li>)}</ul>
  </BlockShell>;
}

function PersonalMembershipEconomyContent({ groupId, membershipId, groupName, seasonName, showHeading }: { groupId: string; membershipId: string; groupName?: string; seasonName?: string; showHeading: boolean }) {
  const pathname = usePathname(); const router = useRouter(); const searchParams = useSearchParams();
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const requestedTab = searchParams.get("economy"); const activeTab: EconomyTab = isEconomyTab(requestedTab) ? requestedTab : "obligations";
  const [visited, setVisited] = useState<Set<EconomyTab>>(() => new Set([activeTab]));
  const hrefFor = useCallback((tab: EconomyTab, receiptId?: string) => { const params = new URLSearchParams(searchParams.toString()); params.set("economy", tab); params.delete("notice"); return `${pathname}?${params.toString()}${receiptId ? `#registered-${encodeURIComponent(receiptId)}` : ""}`; }, [pathname, searchParams]);
  const noticeHref = useCallback((deliveryId?: string) => { const params = new URLSearchParams(searchParams.toString()); params.set("economy", "notices"); if (deliveryId) params.set("notice", deliveryId); else params.delete("notice"); return `${pathname}?${params.toString()}`; }, [pathname, searchParams]);
  const reportHref = useCallback((paymentId: string) => { const params = new URLSearchParams({ paymentId, groupId, membershipId, returnTo: hrefFor("obligations") }); return `/dashboard/obligations?${params.toString()}`; }, [groupId, hrefFor, membershipId]);
  useEffect(() => { if (requestedTab === activeTab) return; router.replace(hrefFor(activeTab), { scroll: false }); }, [activeTab, hrefFor, requestedTab, router]);
  function activate(tab: EconomyTab) { setVisited((current) => new Set(current).add(tab)); router.push(hrefFor(tab), { scroll: false }); }
  function moveTabFocus(event: React.KeyboardEvent<HTMLAnchorElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    activate(tabs[next].id);
    queueMicrotask(() => tabRefs.current[next]?.focus());
  }
  return <section aria-labelledby={showHeading ? "personal-economy-title" : undefined} aria-label={showHeading ? undefined : "Consultas de Economía personal"} className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
    <div className="p-4 pb-3 sm:p-5 sm:pb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div>{showHeading ? <h2 id="personal-economy-title" className="text-lg font-semibold">Economía personal</h2> : null}<p className={`${showHeading ? "mt-1 " : ""}text-sm text-[var(--text-muted)]`}>{groupName && seasonName ? `${groupName} · ${seasonName}` : "Consultá obligaciones, avisos y pagos de esta Membresía."}</p></div><Link href="/dashboard/obligations" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">Ver todas mis obligaciones</Link></div></div>
    <nav className="grid grid-cols-3 border-b border-[var(--border)] px-2 sm:px-4" aria-label="Secciones de Economía personal" role="tablist">{tabs.map((tab, index) => <Link id={`economy-tab-${tab.id}`} ref={(node) => { tabRefs.current[index] = node; }} key={tab.id} href={hrefFor(tab.id)} role="tab" tabIndex={activeTab === tab.id ? 0 : -1} aria-selected={activeTab === tab.id} aria-controls={`economy-panel-${tab.id}`} onKeyDown={(event) => moveTabFocus(event, index)} onClick={() => setVisited((current) => new Set(current).add(tab.id))} className={`relative -mb-px inline-flex min-h-11 min-w-0 items-center justify-center border-b-2 px-1 py-2 text-center text-sm font-semibold focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 sm:px-4 ${activeTab === tab.id ? "border-orange-500 bg-[var(--background)] text-orange-800" : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}>{tab.label}</Link>)}</nav>
    <div className="bg-[var(--background)] p-4 sm:p-5">
      {(visited.has("obligations") || activeTab === "obligations") ? <div id="economy-panel-obligations" role="tabpanel" aria-labelledby="economy-tab-obligations" hidden={activeTab !== "obligations"}><ObligationsBlock groupId={groupId} membershipId={membershipId} reportHref={reportHref} noticeHref={noticeHref} /></div> : null}
      {(visited.has("notices") || activeTab === "notices") ? <div id="economy-panel-notices" role="tabpanel" aria-labelledby="economy-tab-notices" hidden={activeTab !== "notices"}><NoticesBlock groupId={groupId} membershipId={membershipId} paymentHref={(receiptId) => hrefFor("payments", receiptId)} selectedNoticeId={searchParams.get("notice")} closeSelectedHref={hrefFor("notices")} /></div> : null}
      {(visited.has("payments") || activeTab === "payments") ? <div id="economy-panel-payments" role="tabpanel" aria-labelledby="economy-tab-payments" hidden={activeTab !== "payments"}><RegisteredPaymentsBlock groupId={groupId} membershipId={membershipId} /></div> : null}
    </div>
  </section>;
}

export function PersonalMembershipEconomy({ groupId, membershipId, groupName, seasonName, showHeading = true }: { groupId: string; membershipId: string; groupName?: string; seasonName?: string; showHeading?: boolean }) {
  const { firebaseUser } = useAuth();
  return <PersonalMembershipEconomyContent key={`${firebaseUser?.uid ?? "anonymous"}\u0000${groupId}\u0000${membershipId}`} groupId={groupId} membershipId={membershipId} groupName={groupName} seasonName={seasonName} showHeading={showHeading} />;
}
