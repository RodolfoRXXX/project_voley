"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createAndOpenSeason, getOpenSeasonContext, getOwnSeason, getSeasonErrorMessage, getSeasonErrorReason } from "@/services/seasonsService";
import type { OwnSeason, SeasonErrorReason } from "@/types/OwnSeason";

function newIdempotencyKey(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure UUID generation is unavailable");
  return globalThis.crypto.randomUUID();
}

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

function intentSignature(nombre: string, fechaInicio: string): string {
  return `${nombre.normalize("NFC").trim().replace(/\s+/gu, " ")}\u0000${fechaInicio}`;
}

export function OpenSeasonForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [attemptedPayload, setAttemptedPayload] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [contextAttempt, setContextAttempt] = useState(0);
  const [contextError, setContextError] = useState<{ reason: SeasonErrorReason; message: string } | null>(null);
  const [existing, setExisting] = useState<OwnSeason | null>(null);
  const [confirmed, setConfirmed] = useState<OwnSeason | null>(null);
  const [error, setError] = useState<{ reason: SeasonErrorReason; message: string; field?: "nombre" | "fechaInicio" } | null>(null);

  useEffect(() => {
    let active = true;
    void getOpenSeasonContext(groupId).then(
      ({ openSeason }) => { if (active) { setExisting(openSeason); setChecking(false); } },
      (cause) => { if (active) { const reason = getSeasonErrorReason(cause); setContextError({ reason, message: getSeasonErrorMessage(reason) }); setChecking(false); } }
    );
    return () => { active = false; };
  }, [groupId, contextAttempt]);

  const normalizedName = nombre.normalize("NFC").trim().replace(/\s+/gu, " ");
  const validName = Array.from(normalizedName).length >= 1 && Array.from(normalizedName).length <= 80 && !/\p{Cc}/u.test(nombre);
  const validDate = isRealIsoDate(fechaInicio);

  function updateIntent(nombreValue: string, dateValue: string) {
    setError(null);
    if (attemptedPayload !== null && attemptedPayload !== intentSignature(nombreValue, dateValue)) {
      setIdempotencyKey(null);
      setAttemptedPayload(null);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    if (!validName) {
      setError({ reason: "VALIDATION_FAILED", message: "El nombre debe tener entre 1 y 80 puntos de código y no contener controles.", field: "nombre" });
      queueMicrotask(() => nameRef.current?.focus());
      return;
    }
    if (!validDate) {
      setError({ reason: "VALIDATION_FAILED", message: "Ingresá una fecha real con formato YYYY-MM-DD.", field: "fechaInicio" });
      queueMicrotask(() => dateRef.current?.focus());
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const key = idempotencyKey ?? newIdempotencyKey();
      if (!idempotencyKey) setIdempotencyKey(key);
      setAttemptedPayload(intentSignature(nombre, fechaInicio));
      const result = await createAndOpenSeason({ groupId, nombre, fechaInicio, idempotencyKey: key });
      const persisted = (await getOwnSeason(groupId, result.season.id)).season;
      setConfirmed(persisted);
      queueMicrotask(() => feedbackRef.current?.focus());
      globalThis.setTimeout(() => router.replace(`/dashboard/groups/${groupId}`), 700);
    } catch (cause) {
      const reason = cause instanceof Error && cause.message === "Secure UUID generation is unavailable"
        ? "DEPENDENCY_UNAVAILABLE"
        : getSeasonErrorReason(cause);
      if (reason === "OPEN_SEASON_ALREADY_EXISTS") {
        try { setExisting((await getOpenSeasonContext(groupId)).openSeason); } catch { /* preserve the stable public error */ }
      }
      setError({ reason, message: getSeasonErrorMessage(reason) });
      queueMicrotask(() => feedbackRef.current?.focus());
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  if (checking) return <p role="status" className="text-sm text-[var(--text-muted)]">Verificando el contexto de Temporada…</p>;
  if (contextError) return <div ref={feedbackRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900"><p>{contextError.message}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-lg border border-red-400 px-4 py-2 font-semibold" onClick={() => { setContextError(null); setChecking(true); setContextAttempt((value) => value + 1); }}>Reintentar</button><Link className="inline-flex min-h-11 items-center px-2 font-semibold underline" href={`/dashboard/groups/${groupId}`}>Volver al Grupo</Link></div></div>;
  if (existing) return <div ref={feedbackRef} tabIndex={-1} role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold text-emerald-950">El Grupo ya tiene una Temporada abierta</h2><p className="mt-2 text-sm text-emerald-900">{existing.nombre} · {existing.fechaInicio} · {existing.estado}</p><Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={`/dashboard/groups/${groupId}`}>Volver al Grupo</Link></div>;
  if (confirmed) return <div ref={feedbackRef} tabIndex={-1} role="status" aria-live="assertive" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold text-emerald-950">Temporada creada y abierta</h2><p className="mt-2 text-sm text-emerald-900">{confirmed.nombre} · {confirmed.fechaInicio}. Volviendo al Grupo…</p></div>;

  return (
    <form className="max-w-2xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" onSubmit={submit} noValidate>
      {error ? <div ref={feedbackRef} tabIndex={-1} role="alert" aria-live="assertive" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900" data-error-reason={error.reason}>{error.message}</div> : null}
      <div className="rounded-lg bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-muted)]">Abrir la Temporada establece el ciclo temporal del Grupo. No incorpora integrantes ni habilita por sí sola operaciones deportivas. Podés administrarla como Owner aunque todavía no tengas Persona o Membresía.</div>
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="season-name">Nombre de la Temporada</label>
        <input ref={nameRef} id="season-name" name="nombre" value={nombre} onChange={(event) => { setNombre(event.target.value); updateIntent(event.target.value, fechaInicio); }} aria-invalid={error?.field === "nombre"} aria-describedby="season-name-help" maxLength={160} autoComplete="off" className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-orange-500" placeholder="Temporada 2026" />
        <p id="season-name-help" className="mt-2 text-xs text-[var(--text-muted)]">Entre 1 y 80 puntos de código; conservamos mayúsculas y acentos.</p>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="season-start-date">Fecha de inicio</label>
        <input ref={dateRef} id="season-start-date" name="fechaInicio" type="date" value={fechaInicio} onChange={(event) => { setFechaInicio(event.target.value); updateIntent(nombre, event.target.value); }} aria-invalid={error?.field === "fechaInicio"} aria-describedby="season-start-help" className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-orange-500" />
        <p id="season-start-help" className="mt-2 text-xs text-[var(--text-muted)]">Es una fecha civil; no se compara con hoy.</p>
      </div>
      <button type="submit" disabled={sending} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{sending ? "Creando y abriendo…" : "Crear y abrir temporada"}</button>
      <p aria-live="polite" className="sr-only">{sending ? "Operación en curso. Los controles están bloqueados y se conserva la intención." : ""}</p>
    </form>
  );
}
