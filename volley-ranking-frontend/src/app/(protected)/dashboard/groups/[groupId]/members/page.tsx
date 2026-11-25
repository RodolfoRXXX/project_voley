"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdministrativePersonModal, type AdministrativePersonDraft } from "@/components/administrativePersons/AdministrativePersonModal";
import { AdministrativeNonMembersSection } from "@/components/administrativePersons/AdministrativeNonMembersSection";
import { PendingGroupJoinRequestsSection } from "@/components/groupJoinRequests/PendingGroupJoinRequestsSection";
import { OwnedGroupInvitationsSection } from "@/components/groupInvitations/OwnedGroupInvitationsSection";
import { CopyGroupJoinLinkButton } from "@/components/groups/CopyGroupJoinLinkButton";
import { useGroupFrame } from "@/components/groups/GroupFrame";
import { GroupSectionHeader } from "@/components/groups/GroupSectionHeader";
import { ActiveGroupMembersSection } from "@/components/memberships/ActiveGroupMembersSection";
import type { ActiveGroupMember } from "@/types/ActiveGroupMember";
import type { AdministrativePersonItem } from "@/services/administrativePersonsService";

type MembersView = "members" | "non-members" | "invitations";
const views: { id: MembersView; label: string }[] = [{ id: "members", label: "Integrantes" }, { id: "non-members", label: "No integrantes" }, { id: "invitations", label: "Invitaciones" }];

export default function GroupMembersPage() {
  const router = useRouter(), searchParams = useSearchParams();
  const { owner, group, loseAccess } = useGroupFrame();
  const requested = searchParams.get("membersView") as MembersView | null;
  const activeView: MembersView = searchParams.get("invitationId") ? "invitations" : searchParams.get("joinRequestId") ? "members" : views.some((item) => item.id === requested) ? requested! : "members";
  const [editing, setEditing] = useState<AdministrativePersonDraft>(), [refresh, setRefresh] = useState(0), [notice, setNotice] = useState("");
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const handleAccessLost = useCallback((message: string) => { loseAccess(message); router.replace("/dashboard/groups"); }, [loseAccess, router]);
  function select(view: MembersView) { const next = new URLSearchParams(searchParams.toString()); next.set("membersView", view); if (view !== "members") next.delete("joinRequestId"); if (view !== "invitations") next.delete("invitationId"); router.push(`?${next.toString()}`); }
  function openRosterEdit(item: ActiveGroupMember, trigger: HTMLButtonElement) { if (!item.administrativeCustody || item.person.status !== "AVAILABLE") return; editTrigger.current = trigger; setEditing({ personId: item.administrativeCustody.personId, firstName: item.person.firstName, lastName: item.person.lastName, contactEmail: item.administrativeCustody.contactEmail, revision: item.administrativeCustody.revision }); }
  function openNonMemberEdit(item: AdministrativePersonItem, trigger: HTMLButtonElement) { editTrigger.current = trigger; setEditing(item); }
  function closeEdit() { setEditing(undefined); queueMicrotask(() => editTrigger.current?.focus()); }
  function changed(message = "Ficha actualizada.") { setNotice(message); setRefresh((value) => value + 1); window.dispatchEvent(new CustomEvent("group-membership-changed", { detail: { groupId: group?.id } })); }

  if (!owner || !group) return <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5">Integrantes sólo está disponible para el Owner vigente.</section>;
  return <div className="space-y-5">
    <GroupSectionHeader title="Integrantes" actions={group.estado === "activo" ? <div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-11 items-center rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white" href={`/dashboard/groups/${group.id}/members/add`}>Agregar integrantes</Link><CopyGroupJoinLinkButton key={group.id} groupId={group.id} /></div> : null} />
    {notice ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]" aria-label="Gestión de integrantes">
      <div role="tablist" aria-label="Vistas de integrantes" className="flex overflow-x-auto border-b border-[var(--border)] px-2 pt-2 sm:px-4">{views.map((item) => <button key={item.id} id={`members-tab-${item.id}`} role="tab" aria-selected={activeView === item.id} aria-controls={`members-panel-${item.id}`} tabIndex={activeView === item.id ? 0 : -1} onClick={() => select(item.id)} className={`min-h-11 shrink-0 cursor-pointer border-b-2 px-3 font-semibold transition-colors hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange-600 ${activeView === item.id ? "border-orange-600 text-orange-700" : "border-transparent text-[var(--text-muted)]"}`}>{item.label}</button>)}</div>
      <div id={`members-panel-${activeView}`} role="tabpanel" aria-labelledby={`members-tab-${activeView}`} className="min-w-0 bg-[var(--background)] p-4 sm:p-5">
        {activeView === "members" && group.estado === "activo" ? <div className="grid gap-5"><ActiveGroupMembersSection key={`roster-${refresh}`} groupId={group.id} onAccessLost={handleAccessLost} onEditAdministrativePerson={openRosterEdit} /><PendingGroupJoinRequestsSection groupId={group.id} requestedRequestId={searchParams.get("joinRequestId") ?? undefined} onAccessLost={handleAccessLost} /></div> : null}
        {activeView === "members" && group.estado !== "activo" ? <p className="rounded-xl border border-dashed p-4 text-sm text-[var(--text-muted)]">El Grupo archivado conserva su historia, pero no tiene un padrón activo editable.</p> : null}
        {activeView === "non-members" ? <AdministrativeNonMembersSection key={`non-members-${refresh}`} groupId={group.id} archived={group.estado === "archivado"} onEdit={openNonMemberEdit} onChanged={() => changed("Ficha reincorporada.")} /> : null}
        {activeView === "invitations" ? <OwnedGroupInvitationsSection key={`invitations-${refresh}`} groupId={group.id} requestedInvitationId={searchParams.get("invitationId") ?? undefined} /> : null}
      </div>
    </section>
    {editing ? <AdministrativePersonModal groupId={group.id} initial={editing} onClose={closeEdit} onSaved={() => changed()} /> : null}
  </div>;
}
