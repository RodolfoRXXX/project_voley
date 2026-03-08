"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

type GroupDoc = {
  nombre: string;
  descripcion?: string;
  memberIds?: string[];
  adminIds?: string[];
};

type MatchItem = {
  id: string;
  estado?: string;
  horaInicio?: { seconds: number };
  visibility?: string;
};

export default function ProfileGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { firebaseUser } = useAuth();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isMember = useMemo(() => {
    if (!firebaseUser || !group) return false;

    return (
      group.memberIds?.includes(firebaseUser.uid) ||
      group.adminIds?.includes(firebaseUser.uid)
    );
  }, [firebaseUser, group]);

  useEffect(() => {
    const load = async () => {
      if (!groupId) return;

      const groupSnap = await getDocs(query(collection(db, "groups"), where("__name__", "==", groupId)));
      const groupRow = groupSnap.docs[0];

      if (!groupRow) {
        setLoading(false);
        return;
      }

      setGroup(groupRow.data() as GroupDoc);

      const matchesSnap = await getDocs(query(collection(db, "matches"), where("groupId", "==", groupId)));
      const matchesRows = matchesSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<MatchItem, "id">),
      }));

      setMatches(matchesRows);
      setLoading(false);
    };

    load();
  }, [groupId]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <SkeletonSoft className="h-24 rounded-xl" />
        <SkeletonSoft className="h-32 rounded-xl" />
      </section>
    );
  }

  if (!group || !isMember) {
    return <p className="text-sm text-neutral-500">No tienes acceso a este grupo.</p>;
  }

  return (
    <section className="space-y-5">
      <Link href="/profile/groups" className="text-sm text-neutral-600 hover:underline">← Volver a mis grupos</Link>
      <header className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{group.nombre}</h1>
        <p className="text-sm text-neutral-600">{group.descripcion || "Sin descripción"}</p>
      </header>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Partidos del grupo</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay partidos registrados.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {matches.map((match) => (
              <li key={match.id} className="rounded-lg border border-neutral-200 p-3">
                <p><b>ID:</b> {match.id}</p>
                <p><b>Estado:</b> {match.estado || "-"}</p>
                <p><b>Visibilidad:</b> {match.visibility || "-"}</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
