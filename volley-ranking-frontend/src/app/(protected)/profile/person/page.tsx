"use client";

import PersonBootstrapForm from "@/components/person/PersonBootstrapForm";
import { usePerson } from "@/hooks/usePerson";

export default function MyPersonPage() {
  const { person, personStatus, personError, personOutcome, retryPerson } = usePerson();

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <p className="text-sm font-medium text-orange-600">Mi perfil</p>
        <h1 className="text-2xl font-bold">Ficha personal</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Estos datos identifican tu persona dentro de Sportexa.</p>
      </header>

      {(personStatus === "idle" || personStatus === "loading") && (
        <p className="rounded-md border border-[var(--border)] p-5 text-sm">Cargando tu ficha…</p>
      )}

      {personStatus === "empty" && <PersonBootstrapForm />}

      {personStatus === "ready" && person && (
        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
          <p role="status" className="text-sm font-medium text-emerald-700">
            {personOutcome === "created" ? "Tu ficha fue creada correctamente." : "Esta es tu ficha vinculada."}
          </p>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Nombre y apellido</p>
            <p className="text-lg font-semibold">{person.firstName} {person.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Email de contacto</p>
            <p>{person.contactEmail}</p>
          </div>
        </div>
      )}

      {(personStatus === "error" || personStatus === "inconsistent" || personStatus === "sessionInvalid") && (
        <div role="alert" className="space-y-3 rounded-md border border-red-200 bg-red-50 p-5 text-red-900">
          <p>{personError}</p>
          {personStatus === "error" && (
            <button type="button" onClick={retryPerson} className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white">
              Intentar nuevamente
            </button>
          )}
        </div>
      )}
    </section>
  );
}
