"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useConfirm } from "@/components/confirmModal/ConfirmProvider";
import { getMyDirectPaymentRecordContext } from "@/services/administrativeReceiptsService";
import { listOwnGroups } from "@/services/groupsService";
import { listMyCurrentGroupMemberships } from "@/services/membershipsService";
import { getMyPaymentReviewContext } from "@/services/paymentDeliveriesService";
import { getMyGroupTreasuryContext } from "@/services/treasuryService";

type Capability = "treasury" | "review" | "record";
type ContextOption = { groupId: string; groupName: string; owner: boolean; capabilities: Capability[] };

async function loadContexts(): Promise<ContextOption[]> {
  const owned = (await listOwnGroups()).items.map((group) => ({ groupId: group.id, groupName: group.nombre, owner: true, capabilities: [] as Capability[] }));
  const memberships = [] as Awaited<ReturnType<typeof listMyCurrentGroupMemberships>>["items"];
  let cursor: string | undefined;
  do {
    const page = await listMyCurrentGroupMemberships({ pageSize: 50, ...(cursor ? { cursor } : {}) });
    memberships.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  const ownedIds = new Set(owned.map((item) => item.groupId));
  const delegated = await Promise.all(memberships.filter((item) => !ownedIds.has(item.group.id)).map(async (item) => {
    const checks = await Promise.all([
      getMyGroupTreasuryContext(item.group.id).then(() => "treasury" as const, () => null),
      getMyPaymentReviewContext(item.group.id).then(() => "review" as const, () => null),
      getMyDirectPaymentRecordContext(item.group.id).then(() => "record" as const, () => null),
    ]);
    return { groupId: item.group.id, groupName: item.group.nombre, owner: false, capabilities: checks.filter((value): value is Capability => value !== null) };
  }));
  return [...owned, ...delegated.filter((item) => item.capabilities.length)].sort((a, b) => a.groupName.localeCompare(b.groupName, "es"));
}

export function GroupContextNavigation({ groupId, groupName, owner, activeGroup = true, hasPendingOperation = false, blockContextChange = false }: { groupId: string; groupName: string; owner: boolean; activeGroup?: boolean; hasPendingOperation?: boolean; blockContextChange?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirm } = useConfirm();
  const [contexts, setContexts] = useState<ContextOption[]>([{ groupId, groupName, owner, capabilities: [] }]);
  const [switchError, setSwitchError] = useState("");
  const [hash, setHash] = useState("");

  useEffect(() => {
    let active = true;
    void loadContexts().then((items) => {
      if (!active) return;
      const present = items.some((item) => item.groupId === groupId);
      setContexts(present ? items : [{ groupId, groupName, owner, capabilities: [] }, ...items]);
    }, () => undefined);
    return () => { active = false; };
  }, [groupId, groupName, owner]);

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => { window.removeEventListener("hashchange", update); window.removeEventListener("popstate", update); };
  }, [pathname]);

  const links = useMemo(() => owner ? [
    { label: "Resumen", href: `/dashboard/groups/${groupId}` },
    ...(activeGroup ? [{ label: "Integrantes", href: `/dashboard/groups/${groupId}#integrantes` }] : []),
    { label: "Temporadas", href: `/dashboard/groups/${groupId}/seasons` },
    { label: "Economía", href: `/dashboard/groups/${groupId}/economy` },
  ] : [{ label: "Economía", href: `/dashboard/groups/${groupId}/economy` }], [activeGroup, groupId, owner]);

  async function changeGroup(nextGroupId: string) {
    if (nextGroupId === groupId) return;
    if (blockContextChange) { setSwitchError("Hay una operación con resultado incierto. Recuperala antes de cambiar de Grupo."); return; }
    if (hasPendingOperation && !await confirm({ message: "Hay un borrador o una operación pendiente. Si cambiás de Grupo, se descartarán los datos locales.", confirmText: "Cambiar y descartar", cancelText: "Permanecer", variant: "warning" })) return;
    const target = contexts.find((item) => item.groupId === nextGroupId);
    router.push(target?.owner ? `/dashboard/groups/${nextGroupId}` : `/dashboard/groups/${nextGroupId}/economy`);
  }

  return (
    <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Contexto del Grupo">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Grupo seleccionado</p>
          <p className="text-xs text-[var(--text-muted)]">{owner ? "Owner" : "Acceso delegado; cada capacidad se valida por separado"}</p>
        </div>
        <label className="text-sm font-medium">
          Cambiar de Grupo
          <select className="mt-1 block min-h-11 w-full rounded-lg border bg-[var(--background)] px-3 sm:w-72" value={groupId} onChange={(event) => void changeGroup(event.target.value)}>
            {contexts.map((item) => <option key={item.groupId} value={item.groupId}>{item.groupName}{item.owner ? " · Owner" : " · Acceso delegado"}</option>)}
          </select>
        </label>
      </div>
      {switchError ? <p role="alert" className="mt-3 text-sm text-red-700">{switchError}</p> : null}
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Secciones del Grupo">
        {links.map((link) => {
          const base = `/dashboard/groups/${groupId}`;
          const active = link.label === "Integrantes"
            ? pathname === base && hash === "#integrantes"
            : link.label === "Resumen"
              ? pathname === base && hash !== "#integrantes"
              : link.label === "Temporadas"
                ? pathname.startsWith(`${base}/seasons`)
                : pathname === link.href;
          return <Link key={link.label} href={link.href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold ${active ? "border-orange-500 bg-orange-50 text-orange-800" : "border-[var(--border)]"}`}>{link.label}</Link>;
        })}
      </nav>
    </section>
  );
}
