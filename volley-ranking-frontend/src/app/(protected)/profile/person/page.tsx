"use client";

import { useEffect } from "react";
import PersonBootstrapForm from "@/components/person/PersonBootstrapForm";
import { GroupPageShell } from "@/components/groups/GroupPageShell";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { usePerson } from "@/hooks/usePerson";
import { DiscoverabilityPreference } from "@/components/person/DiscoverabilityPreference";

export default function MyPersonPage() {
  const { person, personStatus, personError, personOutcome, refreshMyPerson, retryPerson } = usePerson();

  useEffect(() => {
    void refreshMyPerson().catch(() => undefined);
  }, [refreshMyPerson]);

  return (
    <GroupPageShell
      backHref="/profile/info"
      title="Ficha personal"
      description="Estos datos identifican tu persona dentro de Sportexa."
      actions={<RefreshButton loading={personStatus === "loading"} onClick={() => void refreshMyPerson().catch(() => undefined)} label="Actualizar ficha personal" />}
    >
      <section className="w-full max-w-2xl space-y-5">

      {(personStatus === "idle" || personStatus === "loading") && (
        <p className="rounded-md border border-[var(--border)] p-5 text-sm">Cargando tu ficha…</p>
      )}

      {personStatus === "empty" && <div className="space-y-4"><p className="text-sm leading-6 text-[var(--text-muted)]">La ficha personal te identifica dentro de SPORTEXA y habilita tus recorridos personales.</p><PersonBootstrapForm /></div>}

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
      {personStatus === "ready" && person ? <DiscoverabilityPreference key={person.personId} /> : null}
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
    </GroupPageShell>
  );
}
