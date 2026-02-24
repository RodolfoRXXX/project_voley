"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type GroupMember = {
  id: string;
  name: string;
  email?: string | null;
};

type GroupMatch = {
  id: string;
  title: string;
  visibility: "public" | "group_only";
  startsAt: string | null;
  status?: string | null;
};

type GroupDetail = {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  joinApproval: boolean;
  members: GroupMember[];
};

export default function GrupoPublicDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { firebaseUser } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        let token: string | null = null;
        if (firebaseUser) token = await firebaseUser.getIdToken();

        const res = await fetch(`/api/groups/${groupId}/public`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || "No se pudo cargar el grupo");

        setGroup(payload.group || null);
        setMatches(payload.matches || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el grupo");
      } finally {
        setLoading(false);
      }
    };

    if (groupId) load();
  }, [firebaseUser, groupId]);

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <Link href="/grupos" className="text-sm text-neutral-600 hover:underline">
        ← Volver a grupos
      </Link>

      {loading && <p className="text-gray-500">Cargando detalle del grupo...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && group && (
        <>
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-2">
            <h1 className="text-2xl font-bold text-neutral-900">{group.name}</h1>
            <p className="text-neutral-600">{group.description || "Sin descripción"}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className={`px-2 py-1 rounded-full ${group.visibility === "public" ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700"}`}>
                {group.visibility === "public" ? "Público" : "Privado"}
              </span>
              {group.joinApproval && (
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">Aprobación requerida</span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-neutral-900">Partidos del grupo</h2>
            {matches.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay partidos para mostrar.</p>
            ) : (
              <ul className="space-y-2">
                {matches.map((match) => (
                  <li key={match.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
                    <p className="font-medium text-neutral-900">{match.title}</p>
                    <p className="text-neutral-600">Estado: {match.status || "—"}</p>
                    <p className="text-neutral-600">
                      Inicio: {match.startsAt ? new Date(match.startsAt).toLocaleString("es-AR") : "Sin fecha"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-neutral-900">Integrantes</h2>
            {group.members.length === 0 ? (
              <p className="text-sm text-neutral-500">Aún no hay integrantes en este grupo.</p>
            ) : (
              <ul className="space-y-2">
                {group.members.map((member) => (
                  <li key={member.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
                    <p className="font-medium text-neutral-900">{member.name}</p>
                    {member.email && <p className="text-neutral-600">{member.email}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
