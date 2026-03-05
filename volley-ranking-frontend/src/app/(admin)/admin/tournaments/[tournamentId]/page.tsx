"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";
import { Tournament, tournamentStatusLabel } from "@/types/tournament";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";

const openRegistrationsFn = httpsCallable(functions, "openTournamentRegistrations");
const addTournamentAdminFn = httpsCallable(functions, "addTournamentAdmin");

export default function AdminTournamentDetailPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params?.tournamentId;

  const { showToast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  const loadTournament = useCallback(async () => {
    if (!tournamentId) return;
    const ref = doc(db, "tournaments", tournamentId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setTournament({ id: snap.id, ...(snap.data() as Omit<Tournament, "id">) });
    } else {
      setTournament(null);
    }

    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  const openRegistrations = async () => {
    if (!tournamentId) return;
    setOpening(true);
    try {
      await openRegistrationsFn({ tournamentId });
      showToast({ type: "success", message: "Inscripciones abiertas" });
      await loadTournament();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudieron abrir inscripciones");
    } finally {
      setOpening(false);
    }
  };

  const onAddAdmin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tournamentId || !adminUserId.trim()) return;

    setAddingAdmin(true);
    try {
      await addTournamentAdminFn({
        tournamentId,
        adminUserId: adminUserId.trim(),
      });
      showToast({ type: "success", message: "Admin agregado al torneo" });
      setAdminUserId("");
      await loadTournament();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo agregar admin");
    } finally {
      setAddingAdmin(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando torneo...</p>;
  }

  if (!tournament) {
    return <p className="text-sm text-neutral-500">Torneo no encontrado.</p>;
  }

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 pb-12 space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Gestión", href: "/admin/groups" },
          { label: "Torneos", href: "/admin/tournaments" },
          { label: tournament.name },
        ]}
      />

      <header className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-neutral-900">{tournament.name}</h1>
          <span className="text-xs rounded-full px-2 py-1 bg-orange-100 text-orange-700">
            {tournamentStatusLabel[tournament.status]}
          </span>
        </div>
        <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>

        {tournament.status === "draft" && (
          <button
            onClick={openRegistrations}
            disabled={opening}
            className="mt-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {opening ? "Abriendo..." : "Abrir inscripciones"}
          </button>
        )}
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <h2 className="text-base font-semibold text-neutral-900">Información del torneo</h2>
        <div className="text-sm text-neutral-600 grid sm:grid-cols-2 gap-2">
          <p>Formato: <b>{tournament.format}</b></p>
          <p>Deporte: <b>{tournament.sport}</b></p>
          <p>Equipos mínimos: <b>{tournament.minTeams}</b></p>
          <p>Equipos máximos: <b>{tournament.maxTeams}</b></p>
          <p>Equipos aceptados: <b>{tournament.acceptedTeamsCount || 0}</b></p>
          <p>Admins asignados: <b>{tournament.adminIds?.length || 0}</b></p>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Agregar admin al torneo</h2>
        <p className="text-sm text-neutral-500">Ingresá el UID del admin a sumar a la gestión de este torneo.</p>

        <form onSubmit={onAddAdmin} className="flex flex-col sm:flex-row gap-2">
          <input
            value={adminUserId}
            onChange={(e) => setAdminUserId(e.target.value)}
            placeholder="UID del admin"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            disabled={addingAdmin}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {addingAdmin ? "Agregando..." : "Agregar admin"}
          </button>
        </form>
      </section>
    </main>
  );
}
