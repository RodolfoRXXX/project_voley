"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { useAuth } from "@/hooks/useAuth";
import { usePerson } from "@/hooks/usePerson";
import { formatArs, getPaymentErrorMessage, getPaymentErrorReason, listMyObligations } from "@/services/paymentsService";
import type { Obligation } from "@/types/Payment";

type PreviewStatus = "idle" | "loading" | "ready" | "error";
const obligationState = (state: Obligation["estado"]) => state === "PARTIAL" ? "Pago parcial" : "Pendiente";

function formatAccountDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(date);
}

export default function ProfileSummary() {
  const { account } = useAuth();
  const { person, personAccountId, personError, personStatus, refreshMyPerson } = usePerson();
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewItems, setPreviewItems] = useState<Obligation[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const createdLabel = useMemo(() => formatAccountDate(account?.accountCreatedAt ?? null), [account?.accountCreatedAt]);

  useEffect(() => { void refreshMyPerson().catch(() => undefined); }, [refreshMyPerson]);

  useEffect(() => {
    let active = true;
    const accountId = account?.userId ?? null;
    queueMicrotask(() => {
      if (!active) return;
      setPreviewItems([]);
      setPreviewError("");
      if (!accountId || personStatus !== "ready" || !person || personAccountId !== accountId) {
        setPreviewStatus("idle");
        return;
      }
      setPreviewStatus("loading");
      void listMyObligations({ status: "OPEN", pageSize: 3 })
        .then((page) => {
          if (!active) return;
          setPreviewItems(page.items);
          setPreviewStatus("ready");
        })
        .catch((cause) => {
          if (!active) return;
          setPreviewError(getPaymentErrorMessage(getPaymentErrorReason(cause)));
          setPreviewStatus("error");
        });
    });
    return () => { active = false; };
  }, [account?.userId, person, personAccountId, personStatus, previewVersion]);

  if (!account) return null;

  return (
    <GroupPageShell title="Resumen" description="Tu Cuenta, tu ficha personal y una vista breve de obligaciones pendientes.">
      <div className="space-y-6">
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="account-summary-title">
          <h2 id="account-summary-title" className="text-lg font-semibold">Cuenta</h2>
          <div className="mt-4 flex min-w-0 items-center gap-4"><UserAvatar nombre={account.displayName || "Cuenta"} photoURL={account.accountPhotoUrl} size={64} className="h-16 w-16 shrink-0" /><dl className="min-w-0 space-y-3"><div><dt className="text-xs text-[var(--text-muted)]">Nombre de la cuenta</dt><dd className="break-words font-semibold">{account.displayName || "Cuenta"}</dd></div><div><dt className="text-xs text-[var(--text-muted)]">Correo de acceso</dt><dd className="break-all">{account.accessEmail}</dd></div>{createdLabel ? <div><dt className="text-xs text-[var(--text-muted)]">Cuenta creada el</dt><dd>{createdLabel}</dd></div> : null}</dl></div>
        </section>
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="person-summary-title">
          <h2 id="person-summary-title" className="text-lg font-semibold">Ficha personal</h2>
          {(personStatus === "idle" || personStatus === "loading") ? <p role="status" className="mt-4 text-sm">Cargando ficha personal…</p> : null}
          {personStatus === "ready" && person ? <div className="mt-4 space-y-3"><dl className="space-y-3"><div><dt className="text-xs text-[var(--text-muted)]">Nombre y apellido</dt><dd className="break-words font-semibold">{person.firstName} {person.lastName}</dd></div><div><dt className="text-xs text-[var(--text-muted)]">Correo de contacto</dt><dd className="break-all">{person.contactEmail}</dd></div></dl><Link className="inline-flex min-h-11 items-center font-semibold text-orange-700 underline underline-offset-4" href="/profile/person">Ver ficha personal</Link></div> : null}
          {personStatus === "empty" ? <div className="mt-4 space-y-3"><p className="text-sm leading-6 text-[var(--text-muted)]">La ficha personal te identifica dentro de SPORTEXA y habilita tus recorridos personales.</p><Link className="inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white" href="/profile/person">Crear mi ficha personal</Link></div> : null}
          {["error", "inconsistent", "sessionInvalid"].includes(personStatus) ? <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"><p>{personError ?? "No pudimos comprobar tu ficha personal."}</p>{personStatus === "error" ? <button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-3 font-semibold" onClick={() => void refreshMyPerson().catch(() => undefined)}>Reintentar</button> : null}</div> : null}
        </section>
      </div>
      <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="obligations-preview-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="obligations-preview-title" className="text-lg font-semibold">Vista parcial de obligaciones pendientes</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Se muestran hasta tres resultados de la primera página, sin total.</p></div><Link className="inline-flex min-h-11 items-center font-semibold text-orange-700 underline underline-offset-4" href="/dashboard/obligations">Ver todas mis obligaciones</Link></div>
        {(personStatus === "idle" || personStatus === "loading") ? <p role="status" className="mt-4 text-sm">Esperando la ficha personal…</p> : null}
        {personStatus === "empty" ? <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Creá tu ficha personal para consultar obligaciones asociadas a vos.</p> : null}
        {["error", "inconsistent", "sessionInvalid"].includes(personStatus) ? <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">No pudimos verificar la ficha necesaria para consultar obligaciones.</p> : null}
        {personStatus === "ready" && previewStatus === "loading" ? <p role="status" className="mt-4 text-sm">Cargando obligaciones pendientes…</p> : null}
        {personStatus === "ready" && previewStatus === "error" ? <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900"><p>No pudimos cargar tus obligaciones pendientes. {previewError}</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-red-400 px-3 font-semibold" onClick={() => setPreviewVersion((value) => value + 1)}>Reintentar</button></div> : null}
        {personStatus === "ready" && previewStatus === "ready" && previewItems.length === 0 ? <p className="mt-4 rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">No encontramos obligaciones pendientes en esta vista parcial. Consultá el listado completo para revisar tu situación.</p> : null}
        {personStatus === "ready" && previewStatus === "ready" && previewItems.length > 0 ? <ul className="mt-4 divide-y rounded-xl border border-[var(--border)]">{previewItems.map((item) => <li key={item.paymentId} className="min-w-0 p-4"><div className="flex min-w-0 flex-wrap justify-between gap-2"><div className="min-w-0"><strong className="break-words">{item.concept.name}</strong>{item.groupName ? <p className="break-words text-sm text-[var(--text-muted)]">{item.groupName}</p> : null}</div><strong className="shrink-0">{formatArs(item.balanceMinor)}</strong></div><p className="mt-2 text-sm text-[var(--text-muted)]">Vence {item.dueDate} · {obligationState(item.estado)}</p></li>)}</ul> : null}
      </section>
      </div>
    </GroupPageShell>
  );
}
