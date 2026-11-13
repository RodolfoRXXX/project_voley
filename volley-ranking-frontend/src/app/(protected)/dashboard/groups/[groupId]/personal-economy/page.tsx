"use client";

import Link from "next/link";

import { useGroupFrame } from "@/components/groups/GroupFrame";
import { GroupSectionHeader } from "@/components/groups/GroupSectionHeader";
import { PersonalMembershipEconomy } from "@/components/payments/PersonalMembershipEconomy";
export default function PersonalGroupEconomyPage() {
  const { groupId, membershipContext: context, retryAccess } = useGroupFrame();
  return <section aria-label="Economía personal" className="min-w-0">
    <GroupSectionHeader title="Economía personal" />
    {!context ? <div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5"><p>No pudimos acreditar una Membresía vigente para esta vista.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg border border-amber-500 px-4 font-semibold" onClick={retryAccess}>Reintentar</button><Link href={`/dashboard/groups/${groupId}/membership`} className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold">Volver a Mi participación</Link></div></div> : null}
    {context ? <PersonalMembershipEconomy groupId={groupId} membershipId={context.membership.id} groupName={context.group.nombre} seasonName={context.season.nombre} showHeading={false} /> : null}
  </section>;
}
