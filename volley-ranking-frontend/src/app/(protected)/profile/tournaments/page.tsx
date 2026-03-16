"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { tournamentStatusLabel, type Tournament } from "@/types/tournament";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";

type RegistrationStatus = "pendiente" | "aceptado" | "rechazado";

type TournamentEntryRecord = {
  id: string;
  tournamentId: string;
  groupId: string;
  name?: string;
  nameTeam?: string;
  status?: RegistrationStatus;
  playerIds?: string[];
  source: "registration" | "team";
};

type Row = {
  id: string;
  tournament: Tournament;
  nameTeam: string;
  registrationStatus: RegistrationStatus;
  source: "registration" | "team";
  entryId: string;
};

const registrationStatusLabel: Record<RegistrationStatus, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

const registrationStatusClass: Record<RegistrationStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  aceptado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
};

export default function ProfileTournamentsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!firebaseUser) return;

      const groupIds = new Set<string>();

      if (userDoc?.roles === "admin") {
        const byAdminQ = query(collection(db, "groups"), where("adminIds", "array-contains", firebaseUser.uid));
        const adminSnap = await getDocs(byAdminQ);
        adminSnap.docs.forEach((row) => groupIds.add(row.id));
      }

      const records: TournamentEntryRecord[] = [];

      if (userDoc?.roles === "admin") {
        await Promise.all(
          Array.from(groupIds).map(async (groupId) => {
            const [registrationSnap, teamsSnap] = await Promise.all([
              getDocs(query(collection(db, "tournamentRegistrations"), where("groupId", "==", groupId))),
              getDocs(query(collection(db, "tournamentTeams"), where("groupId", "==", groupId))),
            ]);

            registrationSnap.docs.forEach((item) => {
              records.push({
                id: item.id,
                ...(item.data() as Omit<TournamentEntryRecord, "id" | "source">),
                source: "registration",
              });
            });

            teamsSnap.docs.forEach((item) => {
              const data = item.data() as Omit<TournamentEntryRecord, "id" | "source">;
              records.push({
                id: item.id,
                ...data,
                source: "team",
                status: data.status || "aceptado",
              });
            });
          })
        );
      } else {
        const [registrationSnap, teamsSnap] = await Promise.all([
          getDocs(query(collection(db, "tournamentRegistrations"), where("playerIds", "array-contains", firebaseUser.uid))),
          getDocs(query(collection(db, "tournamentTeams"), where("playerIds", "array-contains", firebaseUser.uid))),
        ]);

        registrationSnap.docs.forEach((item) => {
          records.push({
            id: item.id,
            ...(item.data() as Omit<TournamentEntryRecord, "id" | "source">),
            source: "registration",
          });
        });

        teamsSnap.docs.forEach((item) => {
          const data = item.data() as Omit<TournamentEntryRecord, "id" | "source">;
          records.push({
            id: item.id,
            ...data,
            source: "team",
            status: data.status || "aceptado",
          });
        });
      }

      const tournamentIds = Array.from(new Set(records.map((record) => record.tournamentId).filter(Boolean)));

      const tournamentsById = new Map<string, Tournament>();
      await Promise.all(
        tournamentIds.map(async (tournamentId) => {
          const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
          if (!tournamentSnap.exists()) return;

          tournamentsById.set(tournamentId, {
            id: tournamentSnap.id,
            ...(tournamentSnap.data() as Omit<Tournament, "id">),
          });
        })
      );

      const acceptedTeamKeys = new Set(
        records
          .filter((record) => record.source === "team")
          .map((record) => `${record.tournamentId}::${record.groupId}`)
      );

      const nextRows: Row[] = records
        .filter((record) => {
          if (record.source !== "registration") return true;
          const status = record.status || "pendiente";
          if (status !== "aceptado") return true;

          return !acceptedTeamKeys.has(`${record.tournamentId}::${record.groupId}`);
        })
        .map((record) => {
          const tournament = tournamentsById.get(record.tournamentId);
          if (!tournament) return null;

          const status = record.status || "pendiente";

          return {
            id: `${record.source}-${record.id}`,
            tournament,
            nameTeam: record.nameTeam || record.name || "Equipo sin nombre",
            registrationStatus: status,
            source: record.source,
            entryId: record.id,
          };
        })
        .filter(Boolean) as Row[];

      setRows(nextRows);
      setLoading(false);
    };

    load();
  }, [firebaseUser, userDoc?.roles]);

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-40" />
        {[...Array(3)].map((_, idx) => (
          <SkeletonSoft key={idx} className="h-24 rounded-xl" />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900">Mis torneos</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No tienes inscripciones o equipos de torneos todavía.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <article key={row.id} className="relative rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
              <span
                className={`absolute right-4 top-4 text-xs rounded-full px-2 py-1 ${registrationStatusClass[row.registrationStatus]}`}
              >
                {registrationStatusLabel[row.registrationStatus]}
              </span>

              <h2 className="pr-24 text-base font-semibold text-neutral-900">{row.tournament.name}</h2>
              <p className="text-sm text-neutral-600">{tournamentStatusLabel[row.tournament.status]}</p>
              <p className="text-sm text-neutral-800">{row.nameTeam}</p>

              {row.registrationStatus === "rechazado" ? (
                <span className="inline-block text-sm font-medium text-neutral-400 cursor-not-allowed">
                  Ver detalle
                </span>
              ) : (
                <Link
                  href={
                    row.source === "registration"
                      ? `/profile/tournaments/registrations/${row.entryId}`
                      : `/profile/tournaments/teams/${row.entryId}`
                  }
                  className="inline-block text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Ver detalle
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
