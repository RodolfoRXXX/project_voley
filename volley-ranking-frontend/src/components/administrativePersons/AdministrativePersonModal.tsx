"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { administrativePersonError, createAdministrativePerson, newAdministrativePersonKey, updateAdministrativePerson, type AdministrativePersonItem } from "@/services/administrativePersonsService";

export type AdministrativePersonDraft = Pick<AdministrativePersonItem, "personId" | "firstName" | "lastName" | "contactEmail" | "revision">;

export function AdministrativePersonModal({ groupId, initial, onClose, onSaved }: { groupId: string; initial?: AdministrativePersonDraft; onClose: () => void; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const intent = useRef(newAdministrativePersonKey()); const dialog = useRef<HTMLDivElement>(null); const first = useRef<HTMLInputElement>(null);

  useEffect(() => { queueMicrotask(() => first.current?.focus()); }, []);
  function revise(setter: (value: string) => void, value: string) { setter(value); if (error) { intent.current = newAdministrativePersonKey(); setError(""); } }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !busy) { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)") ?? []);
    if (!focusable.length) return; const head = focusable[0], tail = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === head) { event.preventDefault(); tail.focus(); }
    else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      const base = { groupId, firstName, lastName, contactEmail: contactEmail.trim() || null, idempotencyKey: intent.current };
      if (initial) await updateAdministrativePerson({ ...base, personId: initial.personId, expectedRevision: initial.revision });
      else await createAdministrativePerson(base);
      onSaved(); onClose();
    } catch (cause) { setError(administrativePersonError(cause)); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 sm:p-8" role="presentation">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="administrative-person-title" aria-describedby="administrative-person-help" onKeyDown={keyDown} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-7">
      <h2 id="administrative-person-title" className="text-xl font-semibold">{initial ? "Editar ficha" : "Crear integrante"}</h2>
      <p id="administrative-person-help" className="mt-2 text-sm text-[var(--text-muted)]">{initial ? "Podés corregirla mientras conserve la custodia administrativa." : "Crearemos una ficha con sus datos y lo incorporaremos al grupo en la temporada actual. Podrás administrar su ficha mientras no esté vinculada a una cuenta."}</p>
      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label className="text-sm font-semibold">Nombre<input ref={first} required maxLength={80} value={firstName} onChange={(event) => revise(setFirstName, event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3 font-normal" /></label>
        <label className="text-sm font-semibold">Apellido<input required maxLength={80} value={lastName} onChange={(event) => revise(setLastName, event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3 font-normal" /></label>
        <label className="text-sm font-semibold">Correo (opcional)<input type="email" maxLength={254} value={contactEmail} onChange={(event) => revise(setContactEmail, event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3 font-normal" /></label>
        {!initial ? <p className="text-sm text-[var(--text-muted)]">Cargar el correo no envía una invitación ni vincula una cuenta.</p> : null}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 cursor-pointer rounded-lg border px-4 font-semibold transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-60">Cancelar</button><button disabled={busy} className="min-h-11 cursor-pointer rounded-lg bg-orange-600 px-4 font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300 disabled:opacity-60">{busy ? "Guardando…" : initial ? "Guardar corrección" : "Crear integrante"}</button></div>
      </form>
    </div>
  </div>;
}
