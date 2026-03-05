"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { AdminBreadcrumb } from "@/components/ui/crumbs/AdminBreadcrumb";

const createTournamentFn = httpsCallable(functions, "createTournament");

type TournamentForm = {
  name: string;
  description: string;
  format: "liga" | "eliminacion" | "mixto";
  minTeams: number;
  maxTeams: number;
  startDate: string;
  endDate: string;
};

export default function NewTournamentPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TournamentForm>({
    name: "",
    description: "",
    format: "liga",
    minTeams: 4,
    maxTeams: 12,
    startDate: "",
    endDate: "",
  });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createTournamentFn({
        name: form.name,
        description: form.description,
        sport: "voley",
        format: form.format,
        minTeams: Number(form.minTeams),
        maxTeams: Number(form.maxTeams),
        startDateMillis: new Date(form.startDate).getTime(),
        endDateMillis: new Date(form.endDate).getTime(),
        rules: {
          pointsWin: 3,
          pointsDraw: 1,
          pointsLose: 0,
          setsToWin: 3,
          allowDraws: false,
        },
        structure: {
          groupStage: { enabled: false },
          knockoutStage: { enabled: true, startFrom: "semi" },
        },
      });

      const tournamentId = (result.data as { tournamentId: string }).tournamentId;

      showToast({ type: "success", message: "Torneo creado en borrador" });
      router.push(`/admin/tournaments/${tournamentId}`);
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo crear el torneo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto mt-6 sm:mt-10 pb-12 space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Gestión", href: "/admin/groups" },
          { label: "Torneos", href: "/admin/tournaments" },
          { label: "Nuevo torneo" },
        ]}
      />

      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-900">Crear torneo</h1>
        <p className="text-sm text-neutral-500">El torneo inicia en estado draft.</p>
      </div>

      <form onSubmit={onSubmit} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Nombre</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required value={form.name} onChange={(e)=>setForm((prev)=>({...prev,name:e.target.value}))} />
        </div>

        <div>
          <label className="text-sm font-medium">Descripción</label>
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e)=>setForm((prev)=>({...prev,description:e.target.value}))} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Formato</label>
            <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.format} onChange={(e)=>setForm((prev)=>({...prev,format:e.target.value as TournamentForm["format"]}))}>
              <option value="liga">Liga</option>
              <option value="eliminacion">Eliminación</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Mín. equipos</label>
            <input type="number" min={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.minTeams} onChange={(e)=>setForm((prev)=>({...prev,minTeams:Number(e.target.value)}))} />
          </div>
          <div>
            <label className="text-sm font-medium">Máx. equipos</label>
            <input type="number" min={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.maxTeams} onChange={(e)=>setForm((prev)=>({...prev,maxTeams:Number(e.target.value)}))} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Inicio</label>
            <input type="datetime-local" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required value={form.startDate} onChange={(e)=>setForm((prev)=>({...prev,startDate:e.target.value}))} />
          </div>
          <div>
            <label className="text-sm font-medium">Fin</label>
            <input type="datetime-local" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required value={form.endDate} onChange={(e)=>setForm((prev)=>({...prev,endDate:e.target.value}))} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button disabled={loading} className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60">
            {loading ? "Creando..." : "Crear torneo"}
          </button>
          <Link href="/admin/tournaments" className="text-sm text-neutral-600 hover:text-neutral-800">Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
