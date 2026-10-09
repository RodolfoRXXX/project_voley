"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { TreasuryEconomyView } from "@/components/treasury/TreasuryEconomyView";
import { getMyGroupTreasuryContext, getTreasuryErrorMessage, getTreasuryErrorReason } from "@/services/treasuryService";

export default function TreasuryEconomyPage() {
  const { groupId } = useParams<{ groupId: string }>(); const router = useRouter(); const [status, setStatus] = useState<"loading" | "ready" | "error" | "lost">("loading"); const [error, setError] = useState("");
  const lost = useCallback(() => { setStatus("lost"); setError("Tu acceso de consulta a Tesorería ya no está vigente."); }, []);
  const load = useCallback(async () => { setStatus("loading"); setError(""); try { await getMyGroupTreasuryContext(groupId); setStatus("ready"); } catch (cause) { const reason = getTreasuryErrorReason(cause); if (reason === "GROUP_TREASURY_NOT_AUTHORIZED" || reason === "GROUP_NOT_OPERATIONAL") lost(); else { setError(getTreasuryErrorMessage(reason)); setStatus("error"); } } }, [groupId, lost]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  return <GroupPageShell backHref="/profile/groups" title="Economía del Grupo" description="Acceso delegado de Tesorería, exclusivamente de consulta.">{status === "loading" ? <p role="status">Comprobando acceso…</p> : null}{status === "ready" ? <TreasuryEconomyView groupId={groupId} onAccessLost={lost} /> : null}{status === "error" ? <div role="alert" className="rounded-xl border border-red-300 p-5"><p>{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => void load()}>Reintentar</button></div> : null}{status === "lost" ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5"><p>{error}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 py-2 font-semibold" onClick={() => router.replace("/profile/groups")}>Volver a mis Grupos</button></div> : null}</GroupPageShell>;
}
