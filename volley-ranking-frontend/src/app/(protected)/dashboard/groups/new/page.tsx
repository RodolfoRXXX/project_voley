"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { createOwnGroup, getGroupErrorMessage, getGroupErrorReason } from "@/services/groupsService";
import type { GroupErrorReason, GroupSport } from "@/types/OwnGroup";

function newIdempotencyKey(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure UUID generation is unavailable");
  return globalThis.crypto.randomUUID();
}

export default function NewOwnGroupPage() {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const [nombre, setNombre] = useState("");
  const [deporte] = useState<GroupSport>("voleibol");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [attemptedValues, setAttemptedValues] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ reason: GroupErrorReason; message: string } | null>(null);

  const normalizedLength = Array.from(nombre.normalize("NFC").trim().replace(/\s+/gu, " ")).length;
  const validName = normalizedLength >= 1 && normalizedLength <= 80 && !/\p{Cc}/u.test(nombre);

  function updateName(value: string) {
    setNombre(value);
    setError(null);
    if (attemptedValues !== null && attemptedValues !== `${value}\u0000${deporte}`) {
      setIdempotencyKey(null);
      setAttemptedValues(null);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validName || sendingRef.current) {
      if (!validName) {
        setError({ reason: "VALIDATION_FAILED", message: "El nombre debe tener entre 1 y 80 caracteres y no contener controles." });
        queueMicrotask(() => errorRef.current?.focus());
      }
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const key = idempotencyKey ?? newIdempotencyKey();
      if (!idempotencyKey) setIdempotencyKey(key);
      setAttemptedValues(`${nombre}\u0000${deporte}`);
      const result = await createOwnGroup({ nombre, deporte, idempotencyKey: key });
      router.replace(`/dashboard/groups/${result.group.id}`);
    } catch (cause) {
      const reason = cause instanceof Error && cause.message === "Secure UUID generation is unavailable"
        ? "DEPENDENCY_UNAVAILABLE"
        : getGroupErrorReason(cause);
      setError({ reason, message: getGroupErrorMessage(reason) });
      queueMicrotask(() => errorRef.current?.focus());
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <GroupPageShell backHref="/dashboard/groups" title="Crear Grupo" description="El nombre y el deporte son los únicos datos organizativos necesarios para comenzar.">
      <form className="max-w-2xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7" onSubmit={submit} noValidate>
        {error ? <div ref={errorRef} tabIndex={-1} role="alert" aria-live="assertive" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900" data-error-reason={error.reason}>{error.message}</div> : null}
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="group-name">Nombre del Grupo</label>
          <input id="group-name" name="nombre" value={nombre} onChange={(event) => updateName(event.target.value)} aria-invalid={!!error && error.reason === "VALIDATION_FAILED"} aria-describedby="group-name-help" maxLength={160} autoComplete="organization" className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-orange-500" placeholder="Vóley de los martes" />
          <p id="group-name-help" className="mt-2 text-xs text-[var(--text-muted)]">Entre 1 y 80 caracteres. Conservaremos mayúsculas y acentos.</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="group-sport">Deporte</label>
          <select id="group-sport" value={deporte} disabled className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 disabled:opacity-100">
            <option value="voleibol">Vóley</option>
          </select>
          <p className="mt-2 text-xs text-[var(--text-muted)]">El catálogo inicial admite únicamente Vóley.</p>
        </div>
        <button type="submit" disabled={!validName || sending} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {sending ? "Creando…" : "Crear Grupo"}
        </button>
        <p aria-live="polite" className="sr-only">{sending ? "Creación en curso. Los controles están bloqueados." : ""}</p>
      </form>
    </GroupPageShell>
  );
}
