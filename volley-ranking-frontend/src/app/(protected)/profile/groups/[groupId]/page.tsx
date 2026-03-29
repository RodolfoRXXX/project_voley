"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { tournamentStatusLabel } from "@/types/tournaments";

type GroupDoc = {
  nombre?: string;
  name?: string;
  descripcion?: string;
  description?: string;
  memberIds?: string[];
  adminIds?: string[];
};

type GroupMemberRow = {
  id: string;
  nombre: string;
  photoURL: string | null;
  posicionesPreferidas: string[];
};

type GroupTournamentRow = {
  id: string;
  name: string;
  description: string;
  format: string;
  status: string;
  podiumPlace: 1 | 2 | 3 | null;
};

const podiumBadgeByPlace: Record<1 | 2 | 3, string> = {
  1: "bg-amber-100 text-amber-800 border border-amber-300",
  2: "bg-slate-100 text-slate-700 border border-slate-300",
  3: "bg-orange-100 text-orange-700 border border-orange-300",
};

const podiumLabelByPlace: Record<1 | 2 | 3, string> = {
  1: "1er lugar",
  2: "2do lugar",
  3: "3er lugar",
};

export default function ProfileGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { firebaseUser } = useAuth();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [tournaments, setTournaments] = useState<GroupTournamentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isMember = useMemo(() => {
    if (!firebaseUser || !group) return false;

    return (
      group.memberIds?.includes(firebaseUser.uid)
      || group.adminIds?.includes(firebaseUser.uid)
    );
  }, [firebaseUser, group]);

  useEffect(() => {
    const load = async () => {
      if (!groupId) return;

      setLoading(true);
      const groupSnap = await getDoc(doc(db, "groups", groupId));

      if (!groupSnap.exists()) {
        setGroup(null);
        setMembers([]);
        setTournaments([]);
        setLoading(false);
        return;
      }

      const nextGroup = groupSnap.data() as GroupDoc;
      setGroup(nextGroup);

      const memberIds = Array.from(new Set([
        ...(Array.isArray(nextGroup.memberIds) ? nextGroup.memberIds : []),
        ...(Array.isArray(nextGroup.adminIds) ? nextGroup.adminIds : []),
      ]));

      const users = await Promise.all(
        memberIds.map(async (userId) => {
          const userSnap = await getDoc(doc(db, "users", userId));
          const userData = userSnap.exists() ? userSnap.data() : {};

          return {
            id: userId,
            nombre: String((userData as { nombre?: string; displayName?: string }).nombre || (userData as { displayName?: string }).displayName || "Integrante"),
            photoURL: typeof (userData as { photoURL?: string }).photoURL === "string" ? (userData as { photoURL?: string }).photoURL || null : null,
            posicionesPreferidas: Array.isArray((userData as { posicionesPreferidas?: string[] }).posicionesPreferidas)
              ? (userData as { posicionesPreferidas: string[] }).posicionesPreferidas
              : [],
          };
        })
      );

      setMembers(users.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })));

      const [registrationsSnap, teamsSnap] = await Promise.all([
        getDocs(query(collection(db, "tournamentRegistrations"), where("groupId", "==", groupId))),
        getDocs(query(collection(db, "tournamentTeams"), where("groupId", "==", groupId))),
      ]);

      const allRows = [...registrationsSnap.docs, ...teamsSnap.docs];
      const tournamentIds = Array.from(new Set(allRows.map((row) => String(row.data().tournamentId || "")).filter(Boolean)));

      const tournamentRows = await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
          if (!tournamentSnap.exists()) return null;

          const tournamentData = tournamentSnap.data() as {
            name?: string;
            description?: string;
            format?: string;
            status?: string;
            podiumTeamIds?: string[] | null;
          };

          const relatedTeams = teamsSnap.docs
            .map((row) => ({ id: row.id, ...row.data() as { tournamentId?: string } }))
            .filter((row) => row.tournamentId === tournamentId);

          const podiumIds = Array.isArray(tournamentData.podiumTeamIds)
            ? tournamentData.podiumTeamIds.filter(Boolean)
            : [];

          const podiumTeamId = relatedTeams.find((team) => podiumIds.includes(team.id))?.id || null;
          const podiumPlace = podiumTeamId ? (podiumIds.indexOf(podiumTeamId) + 1) as 1 | 2 | 3 : null;

          return {
            id: tournamentSnap.id,
            name: tournamentData.name || "Torneo",
            description: tournamentData.description || "Sin descripción",
            format: tournamentData.format || "-",
            status: tournamentData.status || "draft",
            podiumPlace: podiumPlace && podiumPlace <= 3 ? podiumPlace : null,
          };
        })
      );

      setTournaments(
        tournamentRows
          .filter((row): row is GroupTournamentRow => Boolean(row))
          .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
      );
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
        <h1 className="text-2xl font-bold text-neutral-900">{group.nombre || group.name || "Grupo"}</h1>
        <p className="text-sm text-neutral-600">{group.descripcion || group.description || "Sin descripción"}</p>
      </header>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Integrantes del grupo</h2>
        {members.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay integrantes registrados.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li key={member.id} className="rounded-lg border border-neutral-200 p-3 flex items-center gap-3">
                <UserAvatar
                  nombre={member.nombre}
                  photoURL={member.photoURL}
                  size={36}
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{member.nombre}</p>
                  <p className="text-xs text-neutral-500">
                    Posición: {member.posicionesPreferidas.length ? member.posicionesPreferidas.join(" · ") : "Sin posición definida"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-neutral-900">Torneos en los que participó el grupo</h2>
        {tournaments.length === 0 ? (
          <p className="text-sm text-neutral-500">Este grupo no tiene torneos asociados aún.</p>
        ) : (
          <ul className="space-y-2 text-sm text-neutral-700">
            {tournaments.map((tournament) => (
              <li key={tournament.id} className="rounded-lg border border-neutral-200 p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-neutral-900">{tournament.name}</p>
                  {tournament.podiumPlace ? (
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${podiumBadgeByPlace[tournament.podiumPlace]}`}>
                      {podiumLabelByPlace[tournament.podiumPlace]}
                    </span>
                  ) : null}
                </div>
                <p><b>Descripción:</b> {tournament.description}</p>
                <p><b>Tipo:</b> {tournament.format}</p>
                <p><b>Estado:</b> {tournamentStatusLabel[tournament.status] || tournament.status}</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
