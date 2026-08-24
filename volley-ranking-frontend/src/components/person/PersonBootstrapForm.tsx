"use client";

import { FormEvent, useState } from "react";

import { usePerson } from "@/hooks/usePerson";

export default function PersonBootstrapForm() {
  const { ensureMyPerson, personError, savingPerson } = usePerson();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingPerson) return;
    setSubmitted(true);
    try {
      await ensureMyPerson({ firstName, lastName, contactEmail });
    } catch {
      // El provider conserva el error estable para esta pantalla.
    }
  };

  const missingRequired = !firstName.trim() || !lastName.trim() || !contactEmail.trim();

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          Nombre
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            maxLength={80}
            autoComplete="given-name"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Apellido
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            maxLength={80}
            autoComplete="family-name"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Email de contacto
        <input
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          maxLength={254}
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
        />
      </label>
      {submitted && missingRequired && <p className="text-sm text-red-600">Completá todos los campos.</p>}
      {personError && <p role="alert" className="text-sm text-red-600">{personError}</p>}
      <button
        type="submit"
        disabled={savingPerson || missingRequired}
        className="rounded-md bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {savingPerson ? "Guardando…" : "Crear mi ficha"}
      </button>
    </form>
  );
}
