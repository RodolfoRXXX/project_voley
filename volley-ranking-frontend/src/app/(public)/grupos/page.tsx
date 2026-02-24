"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type PublicGroup = {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  joinApproval: boolean;
  totalMatches: number;
  owner: {
    name: string;
    email?: string | null;
  } | null;
};

function getGroupsEndpoint() {
  const rawBase = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");
  if (!rawBase) return "/api/groups/public";

  const functionsApiBaseUrl = rawBase.endsWith("/api") ? rawBase : `${rawBase}/api`;
  return `${functionsApiBaseUrl}/groups/public`;
}

export default function GruposPage() {
  const { firebaseUser } = useAuth();
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(getGroupsEndpoint, []);

  useEffect(() => {
    const load = async () => {
      try {
        let token: string | null = null;
        if (firebaseUser) token = await firebaseUser.getIdToken();

        const res = await fetch(endpoint, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) throw new Error("No se pudieron cargar los grupos");

        const json = await res.json();
        setGroups(json.groups || []);
      } catch (err: any) {
        setError(err?.message || "No se pudieron cargar los grupos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [endpoint, firebaseUser]);

  return (
    <main className="max-w-6xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <h1 className="text-sm uppercase tracking-wide text-slate-400">Comunidad</h1>
      <h2 className="text-3xl font-bold text-neutral-800 dark:text-[var(--foreground)]">Grupos</h2>

      {loading && <p className="text-gray-500">Cargando grupos...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p className="text-gray-500">No hay grupos disponibles.</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <article key={group.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${group.visibility === "public" ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700"}`}>
                {group.visibility === "public" ? "Público" : "Privado"}
              </span>
              {group.joinApproval && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Aprobación requerida</span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-neutral-900">{group.name}</h3>
              <p className="text-sm text-neutral-600 mt-1">{group.description || "Sin descripción"}</p>
            </div>

            <div className="text-sm text-neutral-600 space-y-1">
              <p>Partidos: <b>{group.totalMatches}</b></p>
              <p>Owner: <b>{group.owner?.name || "No disponible"}</b></p>
              {group.owner?.email && <p>Email: {group.owner.email}</p>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
