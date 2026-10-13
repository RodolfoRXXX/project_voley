"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listActiveGroupMembersForOwnedGroup } from "@/services/membershipsService";
import {
  deliveryErrorReason,
  grantPaymentReview,
  listPaymentReviewGrants,
  newDeliveryKey,
  reviewAccessErrorMessage,
  revokePaymentReview,
} from "@/services/paymentDeliveriesService";
import type { ActiveGroupMember } from "@/types/ActiveGroupMember";
import type { ReviewGrant } from "@/types/PaymentDelivery";
import { ownerPaymentReviewAccessRequests } from "@/services/paymentReviewAccessRequests.mjs";

type Intent =
  | { kind: "grant"; membershipId: string; name: string; idempotencyKey: string }
  | { kind: "revoke"; grantId: string; name: string; idempotencyKey: string };

const label = (member?: ActiveGroupMember, grant?: ReviewGrant) =>
  member?.person.status === "AVAILABLE"
    ? `${member.person.firstName} ${member.person.lastName}`
    : grant?.person?.status === "AVAILABLE"
      ? `${grant.person.firstName} ${grant.person.lastName}`
      : "Persona no disponible";

const stateLabel = (state: ReviewGrant["state"]) => ({ ACTIVE: "Vigente", REVOKED: "Revocada", LAPSED: "Sin vigencia" })[state];

async function readAccess(groupId: string) {
  const requests = ownerPaymentReviewAccessRequests(groupId);
  const [roster, history] = await Promise.all([
    listActiveGroupMembersForOwnedGroup(requests.roster).catch((cause: unknown) => Promise.reject({ source: "roster" as const, cause })),
    listPaymentReviewGrants(requests.history).catch((cause: unknown) => Promise.reject({ source: "history" as const, cause })),
  ]);
  return { members: roster.items.filter((item) => !item.isOwner), grants: history.items };
}

function loadFailure(cause: unknown) {
  if (typeof cause === "object" && cause && "source" in cause && "cause" in cause) {
    const tagged = cause as { source: "roster" | "history"; cause: unknown };
    return { source: tagged.source, reason: deliveryErrorReason(tagged.cause) };
  }
  return { source: "history" as const, reason: deliveryErrorReason(cause) };
}

function loadMessage(cause: unknown) {
  const failure = loadFailure(cause);
  if (failure.reason === "VALIDATION_FAILED") return failure.source === "roster" ? "No pudimos validar la consulta de integrantes elegibles." : "No pudimos validar la consulta de la historia de revisión.";
  const base = reviewAccessErrorMessage(failure.reason, "load");
  return failure.source === "roster" ? `Integrantes elegibles: ${base}` : `Historia de revisión: ${base}`;
}

export function OwnerPaymentReviewAccessSection({ groupId }: { groupId: string }) {
  const [members, setMembers] = useState<ActiveGroupMember[]>([]);
  const [grants, setGrants] = useState<ReviewGrant[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  const accept = useCallback((result: Awaited<ReturnType<typeof readAccess>>) => {
    setMembers(result.members);
    setGrants(result.grants);
    setStatus("ready");
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      accept(await readAccess(groupId));
    } catch (cause) {
      setError(loadMessage(cause));
      setStatus("error");
    }
  }, [accept, groupId]);

  useEffect(() => {
    let active = true;
    void readAccess(groupId).then(
      (result) => { if (active) accept(result); },
      (cause) => {
        if (!active) return;
        setError(loadMessage(cause));
        setStatus("error");
      },
    );
    return () => { active = false; };
  }, [accept, groupId]);

  useEffect(() => { if (intent) queueMicrotask(() => cancel.current?.focus()); }, [intent]);

  async function confirmIntent() {
    if (!intent || busy.current) return;
    busy.current = true;
    setSending(true);
    setError("");
    const operation = intent.kind;
    try {
      if (intent.kind === "grant") {
        await grantPaymentReview({ groupId, membershipId: intent.membershipId, idempotencyKey: intent.idempotencyKey });
        setNotice(`Concediste revisión de entregas a ${intent.name}.`);
      } else {
        await revokePaymentReview({ groupId, grantId: intent.grantId, idempotencyKey: intent.idempotencyKey });
        setNotice(`Revocaste la revisión de entregas de ${intent.name}; la historia se conserva.`);
      }
      setIntent(null);
      accept(await readAccess(groupId));
      queueMicrotask(() => feedback.current?.focus());
    } catch (cause) {
      setError(reviewAccessErrorMessage(deliveryErrorReason(cause), operation));
      queueMicrotask(() => feedback.current?.focus());
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="payment-review-access-title">
      <div>
        <h2 id="payment-review-access-title" className="text-xl font-semibold">Acceso para revisar entregas</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Permiso independiente de Tesorería: permite ver pendientes de terceros y confirmarlos o rechazarlos. No habilita la consulta económica general.</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">El cargo es descriptivo y no concede permisos.</p>
      </div>
      <div ref={feedback} tabIndex={-1} aria-live="polite">
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        {error && !intent ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      </div>
      {status === "loading" ? <p role="status">Cargando accesos de revisión…</p> : null}
      {status === "error" ? <button type="button" className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => void load()}>Reintentar carga</button> : null}
      {status === "ready" ? <>
        <div>
          <h3 className="font-semibold">Integrantes elegibles</h3>
          {members.length ? <ul className="mt-2 grid gap-2 sm:grid-cols-2">{members.map((member) => {
            const name = label(member);
            return <li key={member.membershipId} className="rounded-xl border p-3"><strong>{name}</strong><p className="mt-1 text-xs text-[var(--text-muted)]">Cargo descriptivo: {member.cargo ?? "Sin cargo"} — no concede permisos</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={() => setIntent({ kind: "grant", membershipId: member.membershipId, name, idempotencyKey: newDeliveryKey() })}>Conceder revisión</button></li>;
          })}</ul> : <p className="mt-2 text-sm text-[var(--text-muted)]">No hay integrantes elegibles en la Temporada abierta.</p>}
        </div>
        <div>
          <h3 className="font-semibold">Historia de concesiones</h3>
          {grants.length ? <ul className="mt-2 divide-y rounded-xl border">{grants.map((item) => {
            const name = label(members.find((member) => member.membershipId === item.membershipId), item);
            return <li key={item.grantId} className="flex flex-wrap items-center justify-between gap-3 p-3"><div><strong>{name}</strong><p className="text-sm text-[var(--text-muted)]">{stateLabel(item.state)} · concedida {new Date(item.grantedAt).toLocaleString("es-AR")}{item.revokedAt ? ` · revocada ${new Date(item.revokedAt).toLocaleString("es-AR")}` : ""}</p></div>{item.state === "ACTIVE" ? <button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800" onClick={() => setIntent({ kind: "revoke", grantId: item.grantId, name, idempotencyKey: newDeliveryKey() })}>Revocar revisión</button> : null}</li>;
          })}</ul> : <p className="mt-2 text-sm text-[var(--text-muted)]">Todavía no hay concesiones de revisión.</p>}
        </div>
      </> : null}
      {intent ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="review-access-confirm-title" aria-describedby="review-access-confirm-description" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h3 id="review-access-confirm-title" className="text-lg font-semibold">{intent.kind === "grant" ? "Conceder revisión de entregas" : "Revocar revisión de entregas"}</h3><p id="review-access-confirm-description" className="mt-3 text-sm leading-6">{intent.kind === "grant" ? `${intent.name} podrá revisar pendientes de terceros y confirmar o rechazar entregas. Este acceso no concede Tesorería.` : `${intent.name} dejará de recibir pendientes y de tomar nuevas decisiones. La historia se conservará.`}</p>{error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}<div className="mt-5 flex justify-end gap-2"><button ref={cancel} type="button" disabled={sending} className="min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50" onClick={() => { setIntent(null); setError(""); }}>Cancelar</button><button type="button" disabled={sending} className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => void confirmIntent()}>{sending ? "Confirmando…" : intent.kind === "grant" ? "Sí, conceder revisión" : "Sí, revocar revisión"}</button></div></div></div> : null}
    </section>
  );
}
