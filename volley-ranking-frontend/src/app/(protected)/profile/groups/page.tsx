"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

type GroupItem = {
  id: string;
  nombre: string;
  descripcion?: string;
  memberIds?: string[];
};

export default function ProfileGroupsPage() {
  const { firebaseUser } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser) return;

      const byMember = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", firebaseUser.uid)
      );

      const byAdmin = query(
        collection(db, "groups"),
        where("adminIds", "array-contains", firebaseUser.uid)
      );

      const [memberSnap, adminSnap] = await Promise.all([getDocs(byMember), getDocs(byAdmin)]);
      const merged = new Map<string, GroupItem>();

      [...memberSnap.docs, ...adminSnap.docs].forEach((docItem) => {
        const data = docItem.data();
        merged.set(docItem.id, {
          id: docItem.id,
          nombre: data.nombre || "Grupo sin nombre",
          descripcion: data.descripcion || "",
          memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
        });
      });

      setGroups(Array.from(merged.values()));
      setLoading(false);
    };

    load();
  }, [firebaseUser]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-36" />
        {[...Array(3)].map((_, idx) => (
          <SkeletonSoft key={idx} className="h-20 rounded-xl" />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900">Mis grupos</h1>

      {groups.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no formas parte de ningún grupo.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <article key={group.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="text-base font-semibold text-neutral-900">{group.nombre}</h2>
              <p className="text-sm text-neutral-600 mt-1">{group.descripcion || "Sin descripción"}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span>Integrantes: {group.memberIds?.length || 0}</span>
                <Link href={`/profile/groups/${group.id}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
                  Ver detalle →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
