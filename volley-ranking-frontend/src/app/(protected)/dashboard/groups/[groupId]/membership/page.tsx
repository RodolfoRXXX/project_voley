"use client";

import Link from "next/link";
import { groupSportLabel } from "@/lib/groups/groupSports";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useGroupFrame } from "@/components/groups/GroupFrame";
import { MembershipSelfExitControl } from "@/components/memberships/MembershipSelfExitControl";

export default function GroupMembershipPage() {
  const { groupId, membershipContext: context, treasury, review, record, retryAccess } = useGroupFrame();
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyEconomyLink = searchParams.has("economy");
  useEffect(() => {
    if (!legacyEconomyLink) return;
    const query = searchParams.toString();
    const hash = window.location.hash;
    router.replace(`/dashboard/groups/${groupId}/personal-economy${query ? `?${query}` : ""}${hash}`, { scroll: false });
  }, [groupId, legacyEconomyLink, router, searchParams]);
  const hasCapabilities = treasury || review || record;

  if (legacyEconomyLink) return <p role="status" className="rounded-xl border p-5">Abriendo Economía personal…</p>;

  return <section aria-labelledby="membership-title" className="min-w-0">
    <h1 id="membership-title" className="text-2xl font-bold tracking-tight">Mi participación</h1>
    {!context ? <div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5"><p>No pudimos acreditar una Membresía vigente para esta vista.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg border border-amber-500 px-4 font-semibold" onClick={retryAccess}>Reintentar</button><Link href="/dashboard/groups" className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold">Volver a Mis grupos</Link></div></div> : null}
    {context ? <>
      <dl className="mt-5 grid gap-4 rounded-2xl border border-[var(--border)] p-5 sm:grid-cols-3">
        <div><dt className="text-sm text-[var(--text-muted)]">Grupo</dt><dd className="mt-1 break-words font-semibold">{context.group.nombre}</dd><dd className="mt-1 text-sm text-[var(--text-muted)]">{groupSportLabel(context.group.deporte)} · {context.group.estado === "activo" ? "Activo" : context.group.estado}</dd></div>
        <div><dt className="text-sm text-[var(--text-muted)]">Temporada</dt><dd className="mt-1 break-words font-semibold">{context.season.nombre}</dd></div>
        <div><dt className="text-sm text-[var(--text-muted)]">Vínculo</dt><dd className="mt-1 font-semibold">Membresía activa</dd><dd className="mt-1 text-sm text-[var(--text-muted)]">Desde {new Date(context.membership.fechaIngreso).toLocaleDateString("es-AR", { timeZone: "UTC" })}</dd></div>
      </dl>
      {hasCapabilities ? <section aria-labelledby="economic-access-title" className="mt-5 rounded-2xl border border-[var(--border)] p-5">
        <h2 id="economic-access-title" className="font-semibold">Economía del Grupo</h2>
        {hasCapabilities ? <div className="mt-3 flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center rounded-lg border border-orange-500 px-4 font-semibold" href={`/dashboard/groups/${groupId}/economy`}>Abrir Economía del Grupo</Link>{treasury ? <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold" href={`/dashboard/treasury/${groupId}`}>Consultar Tesorería</Link> : null}{review ? <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold" href={`/dashboard/payment-review/${groupId}`}>Revisar entregas</Link> : null}{record ? <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold" href={`/dashboard/direct-payment/${groupId}`}>Registrar recepciones</Link> : null}</div> : null}
      </section> : null}
      <MembershipSelfExitControl groupId={groupId} membershipId={context.membership.id} groupName={context.group.nombre} viewerIsOwner={context.group.viewerIsOwner} onConfirmed={() => { router.replace("/dashboard/groups"); router.refresh(); }} />
    </> : null}
  </section>;
}
