"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { administrativePersonLinkError, getAdministrativePersonLink, listAdministrativePersonLinks, recognizeAdministrativePersonLink, reconsiderAdministrativePersonLink, rejectAdministrativePersonLink } from "@/services/administrativePersonLinksService";
import type { AdministrativePersonLinkBucket, AdministrativePersonLinkCandidate, AdministrativePersonLinkDetail } from "@/types/AdministrativePersonLink";

const labels: Record<AdministrativePersonLinkBucket, string> = { PENDING: "Por revisar", REJECTED: "Descartadas", PENDING_MERGE: "Pendientes de fusión" };

export function AdministrativePersonLinkingSection({ accountId, onAdopted }: { accountId: string; onAdopted: () => Promise<unknown> }) {
  const [bucket, setBucket] = useState<AdministrativePersonLinkBucket>("PENDING");
  const [items, setItems] = useState<AdministrativePersonLinkCandidate[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [detail, setDetail] = useState<{ candidate: AdministrativePersonLinkDetail; previewToken: string }>();
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const intentions = useRef(new Map<string, string>());

  const intentionKey = (action: string, candidateRef: string) => {
    const reference = `${action}:${candidateRef}`;
    const existing = intentions.current.get(reference);
    if (existing) return existing;
    const created = crypto.randomUUID();
    intentions.current.set(reference, created);
    return created;
  };
  const completeIntention = (action: string, candidateRef: string) => intentions.current.delete(`${action}:${candidateRef}`);

  const load = useCallback(async (append = false) => {
    const request = ++generation.current; setLoading(true); setError(""); if (!append) { setDetail(undefined); setNotice(""); }
    try {
      const result = await listAdministrativePersonLinks(bucket, append ? nextCursor : undefined);
      if (request !== generation.current) return;
      setItems((current) => append ? [...current, ...result.items] : result.items); setNextCursor(result.nextCursor);
    } catch (cause) { if (request === generation.current) { setItems([]); setNextCursor(undefined); setError(administrativePersonLinkError(cause)); } }
    finally { if (request === generation.current) setLoading(false); }
  }, [bucket, nextCursor]);

  useEffect(() => { void load(false); return () => { generation.current += 1; }; }, [accountId, bucket]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (candidateRef: string) => { setLoading(true); setError(""); setNotice(""); try { setDetail(await getAdministrativePersonLink(candidateRef)); } catch (cause) { setError(administrativePersonLinkError(cause)); } finally { setLoading(false); } };
  const reject = async () => { if (!detail || !window.confirm("¿Confirmás que esta ficha no es tuya? Podrás reconsiderarla más adelante.")) return; const candidateRef = detail.candidate.candidateRef; setSaving(true); setError(""); try { await rejectAdministrativePersonLink(detail.candidate, intentionKey("reject", candidateRef)); completeIntention("reject", candidateRef); setDetail(undefined); setNotice("La ficha se movió a Descartadas."); await load(false); } catch (cause) { setError(administrativePersonLinkError(cause)); } finally { setSaving(false); } };
  const reconsider = async (candidate: AdministrativePersonLinkCandidate) => { const candidateRef = candidate.candidateRef; setSaving(true); setError(""); try { await reconsiderAdministrativePersonLink(candidate, intentionKey("reconsider", candidateRef)); completeIntention("reconsider", candidateRef); setNotice("La ficha volvió a Por revisar."); await load(false); } catch (cause) { setError(administrativePersonLinkError(cause)); } finally { setSaving(false); } };
  const recognize = async () => { if (!detail) return; const candidateRef = detail.candidate.candidateRef; setSaving(true); setError(""); try { const result = await recognizeAdministrativePersonLink(detail.candidate, detail.previewToken, intentionKey("recognize", candidateRef)); completeIntention("recognize", candidateRef); setDetail(undefined); if (result.outcome === "ADOPTED") { setNotice("La ficha quedó vinculada como tu ficha personal."); await onAdopted(); } else setNotice("Reconocimos la ficha. La fusión estará disponible en otro corte; por ahora no cambian tus datos ni permisos."); await load(false); } catch (cause) { setError(administrativePersonLinkError(cause)); } finally { setSaving(false); } };

  return <section aria-labelledby="administrative-person-links-title" className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="administrative-person-links-title" className="font-semibold">Fichas administrativas que podrían ser tuyas</h2><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Sólo aparecen fichas cuyo correo vigente coincide con tu correo primario verificado. Revisá cada una antes de reconocerla.</p></div><button type="button" disabled={loading || saving} onClick={() => void load(false)} className="min-h-11 rounded-md border px-3 text-sm font-medium">Actualizar</button></div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Estado de las fichas">{(Object.keys(labels) as AdministrativePersonLinkBucket[]).map((value) => <button type="button" role="tab" aria-selected={bucket === value} key={value} onClick={() => setBucket(value)} className={`min-h-11 rounded-full border px-3 text-sm ${bucket === value ? "bg-orange-600 text-white" : "bg-transparent"}`}>{labels[value]}</button>)}</div>
    {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}{notice ? <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
    {loading && items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Buscando fichas…</p> : null}
    {!loading && !error && items.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No hay fichas en esta sección.</p> : null}
    <ul className="space-y-3">{items.map((candidate) => <li key={candidate.candidateRef} className="rounded-md border border-[var(--border)] p-4"><p className="font-medium">{candidate.firstName} {candidate.lastName}</p><p className="text-sm text-[var(--text-muted)]">Correo coincidente: {candidate.maskedEmail}</p><div className="mt-3 flex flex-wrap gap-2">{bucket === "REJECTED" ? <button type="button" disabled={saving} onClick={() => void reconsider(candidate)} className="min-h-11 rounded-md border px-3 text-sm font-medium">Reconsiderar</button> : <button type="button" disabled={loading || saving} onClick={() => void review(candidate.candidateRef)} className="min-h-11 rounded-md bg-orange-600 px-3 text-sm font-semibold text-white">Revisar datos</button>}</div></li>)}</ul>
    {nextCursor ? <button type="button" disabled={loading || saving} onClick={() => void load(true)} className="min-h-11 rounded-md border px-3 text-sm font-medium">Ver más</button> : null}
    {detail ? <div role="dialog" aria-modal="false" aria-labelledby="link-review-title" className="space-y-3 rounded-md border-2 border-orange-300 p-4"><h3 id="link-review-title" className="font-semibold">Revisá esta ficha</h3><dl className="grid gap-2 text-sm"><div><dt className="text-[var(--text-muted)]">Nombre y apellido</dt><dd>{detail.candidate.firstName} {detail.candidate.lastName}</dd></div><div><dt className="text-[var(--text-muted)]">Correo coincidente</dt><dd>{detail.candidate.maskedEmail}</dd></div><div><dt className="text-[var(--text-muted)]">Grupo de procedencia</dt><dd>{detail.candidate.originGroup.name}{detail.candidate.originGroup.archived ? " (archivado)" : ""}</dd></div>{detail.candidate.participation ? <div><dt className="text-[var(--text-muted)]">Participación registrada</dt><dd>{detail.candidate.participation.seasonName || "Temporada"} · {detail.candidate.participation.status}</dd></div> : null}</dl><p className="text-sm leading-6 text-[var(--text-muted)]">Si ya tenés ficha personal, reconocer ésta no fusionará ni cambiará nada ahora. Quedará pendiente hasta que la fusión esté disponible en otro corte.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => setDetail(undefined)} className="min-h-11 rounded-md border px-3 text-sm font-medium">Ahora no</button><button type="button" disabled={saving} onClick={() => void reject()} className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-medium text-red-800">Esta ficha no es mía</button><button type="button" disabled={saving} onClick={() => void recognize()} className="min-h-11 rounded-md bg-orange-600 px-3 text-sm font-semibold text-white">Reconocer ficha</button></div></div> : null}
  </section>;
}
