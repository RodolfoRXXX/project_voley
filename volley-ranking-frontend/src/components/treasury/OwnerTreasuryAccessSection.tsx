"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listActiveGroupMembersForOwnedGroup } from "@/services/membershipsService";
import { getTreasuryErrorMessage, getTreasuryErrorReason, grantGroupTreasury, listGroupTreasuryGrants, newTreasuryKey, revokeGroupTreasury } from "@/services/treasuryService";
import type { ActiveGroupMember } from "@/types/ActiveGroupMember";
import type { TreasuryGrant } from "@/types/Treasury";

type Intent = { kind: "grant"; membershipId: string; name: string; idempotencyKey: string } | { kind: "revoke"; grantId: string; name: string; idempotencyKey: string };
const nameOf = (person: ActiveGroupMember["person"] | TreasuryGrant["person"]) => person.status === "AVAILABLE" ? `${person.firstName} ${person.lastName}` : "Persona no disponible";
const stateLabel = (state: TreasuryGrant["state"]) => ({ ACTIVE: "Vigente", REVOKED: "Revocado", LAPSED: "Sin vigencia" })[state];

export function OwnerTreasuryAccessSection({ groupId }: { groupId: string }) {
  const [members, setMembers] = useState<ActiveGroupMember[]>([]); const [memberCursor, setMemberCursor] = useState<string | null>(null);
  const [grants, setGrants] = useState<TreasuryGrant[]>([]); const [grantCursor, setGrantCursor] = useState<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading"); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null); const busy = useRef(false); const feedback = useRef<HTMLDivElement>(null); const cancel = useRef<HTMLButtonElement>(null);
  const load = useCallback(async () => { setStatus("loading"); setError(""); try { const [roster, history] = await Promise.all([listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20 }), listGroupTreasuryGrants({ groupId, pageSize: 20 })]); setMembers(roster.items.filter((item) => !item.isOwner)); setMemberCursor(roster.nextCursor); setGrants(history.items); setGrantCursor(history.nextCursor); setStatus("ready"); } catch (cause) { setError(getTreasuryErrorMessage(getTreasuryErrorReason(cause))); setStatus("error"); } }, [groupId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (intent) queueMicrotask(() => cancel.current?.focus()); }, [intent]);

  async function confirm() {
    if (!intent || busy.current) return; busy.current = true; setError("");
    try {
      if (intent.kind === "grant") { await grantGroupTreasury({ groupId, membershipId: intent.membershipId, idempotencyKey: intent.idempotencyKey }); setNotice(`Concediste acceso de sólo consulta a ${intent.name}.`); }
      else { await revokeGroupTreasury({ groupId, grantId: intent.grantId, idempotencyKey: intent.idempotencyKey }); setNotice(`Revocaste el acceso de ${intent.name}.`); }
      setIntent(null); await load(); queueMicrotask(() => feedback.current?.focus());
    } catch (cause) { setError(getTreasuryErrorMessage(getTreasuryErrorReason(cause))); queueMicrotask(() => feedback.current?.focus()); }
    finally { busy.current = false; }
  }
  async function loadMoreMembers() { if (!memberCursor || busy.current) return; const page = await listActiveGroupMembersForOwnedGroup({ groupId, pageSize: 20, cursor: memberCursor }); setMembers((items) => [...items, ...page.items.filter((item) => !item.isOwner)]); setMemberCursor(page.nextCursor); }
  async function loadMoreGrants() { if (!grantCursor || busy.current) return; try { const page = await listGroupTreasuryGrants({ groupId, pageSize: 20, cursor: grantCursor }); setGrants((items) => [...items, ...page.items]); setGrantCursor(page.nextCursor); } catch (cause) { setGrants([]); setGrantCursor(undefined); setError(getTreasuryErrorMessage(getTreasuryErrorReason(cause))); } }

  return <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 lg:col-span-2" aria-labelledby="treasury-access-title">
    <div><h2 id="treasury-access-title" className="text-xl font-semibold">Acceso a Tesorería</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Permiso independiente del cargo · sólo consulta económica.</p></div>
    <div ref={feedback} tabIndex={-1} aria-live="polite">{notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}</div>
    {status === "loading" ? <p role="status">Cargando accesos…</p> : null}
    {status === "error" ? <button type="button" className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => void load()}>Reintentar</button> : null}
    {status === "ready" ? <><div><h3 className="font-semibold">Integrantes elegibles</h3>{members.length ? <ul className="mt-2 grid gap-2 sm:grid-cols-2">{members.map((member) => <li key={member.membershipId} className="rounded-xl border p-3"><p className="font-semibold">{nameOf(member.person)}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Cargo descriptivo: {member.cargo ?? "Sin cargo"} — no concede permisos</p><button type="button" className="mt-3 min-h-11 rounded-lg border border-orange-500 px-4 py-2 font-semibold" onClick={() => setIntent({ kind: "grant", membershipId: member.membershipId, name: nameOf(member.person), idempotencyKey: newTreasuryKey() })}>Conceder acceso de consulta</button></li>)}</ul> : <p className="mt-2 text-sm text-[var(--text-muted)]">No hay integrantes elegibles en la Temporada abierta.</p>}{memberCursor ? <button type="button" className="mt-3 min-h-11 underline" onClick={() => void loadMoreMembers()}>Cargar más integrantes</button> : null}</div>
    <div><h3 className="font-semibold">Historia de concesiones</h3>{grants.length ? <ul className="mt-2 divide-y rounded-xl border">{grants.map((grant) => { const name = nameOf(grant.person); return <li key={grant.grantId} className="flex flex-wrap items-center justify-between gap-3 p-3"><div><p className="font-semibold">{name}</p><p className="text-sm text-[var(--text-muted)]">{stateLabel(grant.state)} · concedido {new Date(grant.grantedAt).toLocaleString("es-AR")}{grant.revokedAt ? ` · revocado ${new Date(grant.revokedAt).toLocaleString("es-AR")}` : ""}</p></div>{grant.state === "ACTIVE" ? <button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold text-red-800" onClick={() => setIntent({ kind: "revoke", grantId: grant.grantId, name, idempotencyKey: newTreasuryKey() })}>Revocar acceso</button> : null}</li>; })}</ul> : <p className="mt-2 text-sm text-[var(--text-muted)]">Todavía no hay concesiones.</p>}{grantCursor ? <button type="button" className="mt-3 min-h-11 underline" onClick={() => void loadMoreGrants()}>Cargar más historia</button> : null}</div></> : null}
    {intent ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="treasury-confirm-title" aria-describedby="treasury-confirm-description" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onKeyDown={(event) => { if (event.key === "Escape" && !busy.current) setIntent(null); }}><h3 id="treasury-confirm-title" className="text-lg font-semibold">{intent.kind === "grant" ? "Conceder acceso a Tesorería" : "Revocar acceso a Tesorería"}</h3><p id="treasury-confirm-description" className="mt-3 text-sm leading-6">{intent.kind === "grant" ? `${intent.name} podrá consultar conceptos, ocurrencias y obligaciones del Grupo. No podrá crear, editar, generar ni validar información económica.` : `${intent.name} dejará de poder realizar nuevas consultas económicas. La historia de la concesión se conservará.`}</p>{error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}<div className="mt-5 flex justify-end gap-2"><button ref={cancel} type="button" className="min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => setIntent(null)}>Cancelar</button><button type="button" className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white" onClick={() => void confirm()}>Confirmar</button></div></div></div> : null}
  </section>;
}
