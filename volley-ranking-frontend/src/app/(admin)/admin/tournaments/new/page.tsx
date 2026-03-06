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
  rules: {
    setsToWin: number;
    allowDraws: boolean;
    pointsWin: number;
    pointsDraw: number;
    pointsLose: number;
  };
  structure: {
    groupStage: {
      enabled: boolean;
      groupCount: number;
    };
    knockoutStage: {
      enabled: boolean;
      startFrom: "octavos" | "cuartos" | "semi" | "final";
    };
  };
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
    rules: {
      setsToWin: 3,
      allowDraws: false,
      pointsWin: 3,
      pointsDraw: 1,
      pointsLose: 0,
    },
    structure: {
      groupStage: {
        enabled: true,
        groupCount: 2,
      },
      knockoutStage: {
        enabled: false,
        startFrom: "semi",
      },
    },
  });

  const isLeague = form.format === "liga";
  const isKnockout = form.format === "eliminacion";

  const updateFormat = (format: TournamentForm["format"]) => {
    setForm((prev) => ({
      ...prev,
      format,
      rules: {
        ...prev.rules,
        allowDraws: format === "eliminacion" ? false : prev.rules.allowDraws,
      },
      structure: {
        groupStage: {
          ...prev.structure.groupStage,
          enabled: format !== "eliminacion",
        },
        knockoutStage: {
          ...prev.structure.knockoutStage,
          enabled: format !== "liga",
        },
      },
    }));
  };

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
        rules: {
          setsToWin: Number(form.rules.setsToWin),
          allowDraws: isKnockout ? false : form.rules.allowDraws,
          pointsWin: isKnockout ? 0 : Number(form.rules.pointsWin),
          pointsDraw: isKnockout ? 0 : Number(form.rules.pointsDraw),
          pointsLose: isKnockout ? 0 : Number(form.rules.pointsLose),
        },
        structure: {
          groupStage: {
            enabled: !isKnockout,
            ...(isKnockout ? {} : { groupCount: Number(form.structure.groupStage.groupCount) }),
          },
          knockoutStage: {
            enabled: !isLeague,
            ...(!isLeague ? { startFrom: form.structure.knockoutStage.startFrom } : {}),
          },
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
            <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.format} onChange={(e)=>updateFormat(e.target.value as TournamentForm["format"])}>
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

        <div>
          <div>
            <label className="text-sm font-medium">Inicio</label>
            <input type="datetime-local" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required value={form.startDate} onChange={(e)=>setForm((prev)=>({...prev,startDate:e.target.value}))} />
          </div>
        </div>

        <section className="space-y-3 border-t border-neutral-200 pt-4">
          <h2 className="text-sm font-semibold text-neutral-800">Reglas</h2>
          <div>
            <label className="text-sm font-medium">Sets para ganar</label>
            <input type="number" min={1} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={form.rules.setsToWin} onChange={(e)=>setForm((prev)=>({...prev,rules:{...prev.rules,setsToWin:Number(e.target.value)}}))} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={form.rules.allowDraws} disabled={isKnockout} onChange={(e)=>setForm((prev)=>({...prev,rules:{...prev.rules,allowDraws:e.target.checked}}))} />
              Permitir empates
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Puntos por victoria</label>
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" disabled={isKnockout} value={form.rules.pointsWin} onChange={(e)=>setForm((prev)=>({...prev,rules:{...prev.rules,pointsWin:Number(e.target.value)}}))} />
            </div>
            <div>
              <label className="text-sm font-medium">Puntos por empate</label>
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" disabled={isKnockout} value={form.rules.pointsDraw} onChange={(e)=>setForm((prev)=>({...prev,rules:{...prev.rules,pointsDraw:Number(e.target.value)}}))} />
            </div>
            <div>
              <label className="text-sm font-medium">Puntos por derrota</label>
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" disabled={isKnockout} value={form.rules.pointsLose} onChange={(e)=>setForm((prev)=>({...prev,rules:{...prev.rules,pointsLose:Number(e.target.value)}}))} />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-neutral-200 pt-4">
          <h2 className="text-sm font-semibold text-neutral-800">Estructura</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={form.structure.groupStage.enabled} disabled={isKnockout} readOnly />
              Fase de grupos
            </label>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={form.structure.knockoutStage.enabled} disabled={isLeague} readOnly />
              Fase eliminatoria
            </label>
          </div>

          <div>
            <label className="text-sm font-medium">Cantidad de grupos</label>
            <input type="number" min={1} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" disabled={isKnockout} value={form.structure.groupStage.groupCount} onChange={(e)=>setForm((prev)=>({...prev,structure:{...prev.structure,groupStage:{...prev.structure.groupStage,groupCount:Number(e.target.value)}}}))} />
          </div>

          <div>
            <label className="text-sm font-medium">Inicio de eliminación</label>
            <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" disabled={isLeague} value={form.structure.knockoutStage.startFrom} onChange={(e)=>setForm((prev)=>({...prev,structure:{...prev.structure,knockoutStage:{...prev.structure.knockoutStage,startFrom:e.target.value as TournamentForm["structure"]["knockoutStage"]["startFrom"]}}}))}>
              <option value="octavos">Octavos</option>
              <option value="cuartos">Cuartos</option>
              <option value="semi">Semifinal</option>
              <option value="final">Final</option>
            </select>
          </div>
        </section>

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
