"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useGroupFrame } from "@/components/groups/GroupFrame";
import { MembershipSelfExitControl } from "@/components/memberships/MembershipSelfExitControl";
import { administrativeReceiptErrorReason, getMyDirectPaymentRecordContext } from "@/services/administrativeReceiptsService";
import { getMembershipErrorMessage, getMembershipErrorReason, getMyCurrentGroupMembershipContext } from "@/services/membershipsService";
import { deliveryErrorReason, getMyPaymentReviewContext } from "@/services/paymentDeliveriesService";
import { getMyGroupTreasuryContext, getTreasuryErrorReason } from "@/services/treasuryService";
import type { MyCurrentGroupMembershipContext } from "@/types/MyCurrentGroupMembership";

type CapabilityState = "loading" | "ready" | "error";
type Capabilities = { treasury: boolean; review: boolean; record: boolean };
const CAPABILITY_TIMEOUT_MS = 12_000;

function withCapabilityTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("CAPABILITY_CHECK_TIMEOUT")), CAPABILITY_TIMEOUT_MS);
    void operation.then(
      (value) => { window.clearTimeout(timeout); resolve(value); },
      (cause) => { window.clearTimeout(timeout); reject(cause); },
    );
  });
}

async function resolveCapabilities(groupId: string): Promise<{ capabilities: Capabilities; failed: boolean }> {
  const [treasury, review, record] = await Promise.allSettled([
    withCapabilityTimeout(getMyGroupTreasuryContext(groupId)),
    withCapabilityTimeout(getMyPaymentReviewContext(groupId)),
    withCapabilityTimeout(getMyDirectPaymentRecordContext(groupId)),
  ]);
  const treasuryDenied = treasury.status === "rejected" && getTreasuryErrorReason(treasury.reason) === "GROUP_TREASURY_NOT_AUTHORIZED";
  const reviewDenied = review.status === "rejected" && deliveryErrorReason(review.reason) === "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED";
  const recordDenied = record.status === "rejected" && administrativeReceiptErrorReason(record.reason) === "ADMINISTRATIVE_RECEIPT_NOT_AUTHORIZED";
  return {
    capabilities: { treasury: treasury.status === "fulfilled", review: review.status === "fulfilled", record: record.status === "fulfilled" },
    failed: (treasury.status === "rejected" && !treasuryDenied) || (review.status === "rejected" && !reviewDenied) || (record.status === "rejected" && !recordDenied),
  };
}

export default function GroupMembershipPage() {
  const { groupId } = useGroupFrame();
  const router = useRouter();
  const generation = useRef(0);
  const [context, setContext] = useState<MyCurrentGroupMembershipContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [capabilityState, setCapabilityState] = useState<CapabilityState>("loading");
  const [capabilities, setCapabilities] = useState<Capabilities>({ treasury: false, review: false, record: false });

  const load = useCallback(async () => {
    const request = ++generation.current;
    setStatus("loading"); setError(""); setCapabilityState("loading");
    const contextPromise = getMyCurrentGroupMembershipContext(groupId);
    const capabilitiesPromise = resolveCapabilities(groupId);
    try {
      const response = await contextPromise;
      if (request !== generation.current) return;
      setContext(response); setStatus("ready");
    } catch (cause) {
      if (request !== generation.current) return;
      setContext(null); setError(getMembershipErrorMessage(getMembershipErrorReason(cause))); setStatus("error");
    }
    try {
      const response = await capabilitiesPromise;
      if (request !== generation.current) return;
      setCapabilities(response.capabilities); setCapabilityState(response.failed ? "error" : "ready");
    } catch {
      if (request !== generation.current) return;
      setCapabilities({ treasury: false, review: false, record: false }); setCapabilityState("error");
    }
  }, [groupId]);

  useEffect(() => {
    queueMicrotask(() => void load());
    return () => { generation.current += 1; };
  }, [load]);
  const hasCapabilities = useMemo(() => capabilities.treasury || capabilities.review || capabilities.record, [capabilities]);

  return <section aria-labelledby="membership-title" className="min-w-0">
    <h1 id="membership-title" className="text-2xl font-bold tracking-tight">Mi participación</h1>
    {status === "loading" ? <p role="status" className="mt-5 rounded-xl border p-5">Cargando tu participación…</p> : null}
    {status === "error" ? <div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><p>{error}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 font-semibold" onClick={() => void load()}>Reintentar</button><Link href="/dashboard/groups" className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold">Volver a Mis grupos</Link></div></div> : null}
    {status === "ready" && context ? <>
      <dl className="mt-5 grid gap-4 rounded-2xl border border-[var(--border)] p-5 sm:grid-cols-3">
        <div><dt className="text-sm text-[var(--text-muted)]">Grupo</dt><dd className="mt-1 break-words font-semibold">{context.group.nombre}</dd><dd className="mt-1 text-sm text-[var(--text-muted)]">{context.group.deporte === "voleibol" ? "Vóley" : context.group.deporte} · {context.group.estado === "activo" ? "Activo" : context.group.estado}</dd></div>
        <div><dt className="text-sm text-[var(--text-muted)]">Temporada</dt><dd className="mt-1 break-words font-semibold">{context.season.nombre}</dd></div>
        <div><dt className="text-sm text-[var(--text-muted)]">Vínculo</dt><dd className="mt-1 font-semibold">Membresía activa</dd><dd className="mt-1 text-sm text-[var(--text-muted)]">Desde {new Date(context.membership.fechaIngreso).toLocaleDateString("es-AR", { timeZone: "UTC" })}</dd></div>
      </dl>
      <section aria-labelledby="economic-access-title" className="mt-5 rounded-2xl border border-[var(--border)] p-5">
        <h2 id="economic-access-title" className="font-semibold">Economía personal</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Tus obligaciones son personales y no dependen de permisos administrativos del Grupo.</p>
        <Link className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 font-semibold" href="/dashboard/obligations">Ver mis obligaciones</Link>
        <h3 className="mt-5 font-semibold">Accesos administrativos delegados</h3>
        {capabilityState === "loading" ? <p role="status" className="mt-2 text-sm text-[var(--text-muted)]">Verificando autorizaciones vigentes…</p> : null}
        {capabilityState === "error" ? <div role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><p>No pudimos verificar todas tus autorizaciones. No asumimos que estén ausentes.</p><button type="button" className="mt-2 min-h-11 rounded-lg border border-amber-500 px-3 font-semibold" onClick={() => void load()}>Reintentar verificación</button></div> : null}
        {capabilityState === "ready" && !hasCapabilities ? <p className="mt-2 text-sm text-[var(--text-muted)]">No tenés accesos económicos vigentes para este Grupo.</p> : null}
        {hasCapabilities ? <div className="mt-3 flex flex-wrap gap-2">{capabilities.treasury ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 font-semibold" href={`/dashboard/treasury/${groupId}`}>Consultar Tesorería</Link> : null}{capabilities.review ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 font-semibold" href={`/dashboard/payment-review/${groupId}`}>Revisar entregas</Link> : null}{capabilities.record ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 font-semibold" href={`/dashboard/direct-payment/${groupId}`}>Registrar recepciones</Link> : null}</div> : null}
      </section>
      <MembershipSelfExitControl groupId={groupId} membershipId={context.membership.id} groupName={context.group.nombre} viewerIsOwner={context.group.viewerIsOwner} onConfirmed={() => { generation.current += 1; router.replace("/dashboard/groups"); router.refresh(); }} />
    </> : null}
  </section>;
}
