"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { tournamentStatusLabel, type Tournament } from "@/types/tournament";
import { ActionButton } from "@/components/ui/action/ActionButton";

type EntrySource = "registration" | "team";
type RegistrationStatus = "pendiente" | "aceptado" | "rechazado";
type PaymentStatus = "pendiente" | "parcial" | "pagado";

type EntryDoc = {
  id: string;
  tournamentId: string;
  groupId: string;
  registrationId?: string;
  name?: string;
  nameTeam?: string;
  playersIds?: string[];
  status?: RegistrationStatus;
  paymentStatus?: PaymentStatus;
  paymentAmount?: number;
  expectedAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  playerIds?: string[];
  groupLabel?: string;
};

type GroupDoc = {
  nombre?: string;
  descripcion?: string;
  memberIds?: string[];
  adminIds?: string[];
};

type UserDoc = {
  nombre?: string;
  photoURL?: string;
  posicionesPreferidas?: string[];
};

type TournamentEntryDetailProps = {
  source: EntrySource;
  entryId: string;
};

const registrationStatusClass: Record<RegistrationStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  aceptado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
};

const registrationStatusLabel: Record<RegistrationStatus, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

const paymentStatusClass: Record<PaymentStatus, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  parcial: "bg-orange-100 text-orange-700",
  pagado: "bg-green-100 text-green-700",
};

const paymentStatusLabel: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagado: "Pagado",
};

export default function TournamentEntryDetail({ source, entryId }: TournamentEntryDetailProps) {
  const { firebaseUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [entry, setEntry] = useState<EntryDoc | null>(null);
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [members, setMembers] = useState<Array<UserDoc & { id: string }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!entryId || !firebaseUser) return;

      const collectionName = source === "registration" ? "tournamentRegistrations" : "tournamentTeams";
      const entryRef = doc(db, collectionName, entryId);
      const entrySnap = await getDoc(entryRef);

      if (!entrySnap.exists()) {
        setLoading(false);
        return;
      }

      const entryData = { id: entrySnap.id, ...(entrySnap.data() as Omit<EntryDoc, "id">) };
      const normalizedPlayers = Array.isArray(entryData.playerIds)
        ? entryData.playerIds
        : Array.isArray(entryData.playersIds)
          ? entryData.playersIds
          : [];
      const safeStatus = entryData.status || (source === "team" ? "aceptado" : "pendiente");
      setEntry({
        ...entryData,
        nameTeam: entryData.nameTeam || entryData.name || "",
        playerIds: normalizedPlayers,
        playersIds: normalizedPlayers,
        status: safeStatus,
      });

      const [groupSnap, tournamentSnap] = await Promise.all([
        getDoc(doc(db, "groups", entryData.groupId)),
        getDoc(doc(db, "tournaments", entryData.tournamentId)),
      ]);

      if (!groupSnap.exists() || !tournamentSnap.exists()) {
        setLoading(false);
        return;
      }

      const groupData = groupSnap.data() as GroupDoc;
      const isAllowed =
        groupData.adminIds?.includes(firebaseUser.uid) || groupData.memberIds?.includes(firebaseUser.uid);

      if (!isAllowed) {
        setLoading(false);
        return;
      }

      setGroup(groupData);
      setTournament({ id: tournamentSnap.id, ...(tournamentSnap.data() as Omit<Tournament, "id">) });

      const uniqueMemberIds = Array.from(new Set([...(groupData.adminIds || []), ...(groupData.memberIds || [])]));
      const users = await Promise.all(
        uniqueMemberIds.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          return {
            id: uid,
            ...(userSnap.exists() ? (userSnap.data() as UserDoc) : {}),
          };
        })
      );

      setMembers(users);
      setLoading(false);
    };

    load();
  }, [entryId, firebaseUser, source]);

  const selectedCount = entry?.playerIds?.length || 0;

  const isCountValid = useMemo(() => {
    if (!tournament) return false;
    return selectedCount >= Number(tournament.minPlayers || 0) && selectedCount <= Number(tournament.maxPlayers || 0);
  }, [selectedCount, tournament]);

  const expectedAmount = useMemo(() => {
    if (!tournament) return 0;
    return selectedCount * Number(tournament.paymentForPlayer || 0);
  }, [selectedCount, tournament]);

  const togglePlayer = async (playerId: string) => {
    if (!entry || !tournament) return;

    const current = Array.isArray(entry.playerIds) ? entry.playerIds : [];
    const exists = current.includes(playerId);
    const minPlayers = Number(tournament.minPlayers || 0);
    const maxPlayers = Number(tournament.maxPlayers || 0);

    if (!exists && current.length >= maxPlayers) return;
    if (exists && current.length <= minPlayers) return;

    const next = exists ? current.filter((id) => id !== playerId) : [...current, playerId];
    const nextExpectedAmount = next.length * Number(tournament.paymentForPlayer || 0);
    const paidAmount = Number(entry.paidAmount ?? entry.paymentAmount ?? 0);
    const pendingAmount = Math.max(nextExpectedAmount - paidAmount, 0);

    let paymentStatus: PaymentStatus = paidAmount <= 0 ? "pendiente" : pendingAmount === 0 ? "pagado" : "parcial";
    if (nextExpectedAmount > paidAmount) {
      paymentStatus = "pendiente";
    }

    setSaving(playerId);

    const collectionName = source === "registration" ? "tournamentRegistrations" : "tournamentTeams";
    await updateDoc(doc(db, collectionName, entry.id), {
      playerIds: next,
      playersIds: next,
      expectedAmount: nextExpectedAmount,
      pendingAmount,
      paymentStatus,
      updatedAt: serverTimestamp(),
    });

    setEntry((prev) => (prev ? {
      ...prev,
      playerIds: next,
      playersIds: next,
      expectedAmount: nextExpectedAmount,
      pendingAmount,
      paymentStatus,
    } : prev));
    setSaving(null);
  };

  if (loading) {
    return <p className="text-sm text-neutral-500">Cargando detalle...</p>;
  }

  if (!entry || !tournament || !group) {
    return <p className="text-sm text-neutral-500">No tienes acceso a este detalle o no existe.</p>;
  }

  const registrationStatus = entry.status || "pendiente";
  const paymentStatus = entry.paymentStatus || "pendiente";
  const paidAmount = Number(entry.paidAmount ?? entry.paymentAmount ?? 0);
  const storedExpectedAmount = Number(entry.expectedAmount ?? expectedAmount);
  const pendingAmount = Number(entry.pendingAmount ?? Math.max(storedExpectedAmount - paidAmount, 0));

  return (
    <section className="space-y-5">
      <Link href="/profile/tournaments" className="text-sm text-neutral-600 hover:underline">← Volver a mis torneos</Link>

      <header className="relative rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <span className={`absolute right-4 top-4 text-xs rounded-full px-2 py-1 ${registrationStatusClass[registrationStatus]}`}>
          {registrationStatusLabel[registrationStatus]}
        </span>
        <h1 className="pr-28 text-2xl font-bold text-neutral-900">{tournament.name}</h1>
        <p className="text-sm text-neutral-600">{tournament.description || "Sin descripción"}</p>
        <p className="text-sm text-neutral-700">Estado del torneo: {tournamentStatusLabel[tournament.status]}</p>
      </header>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2 text-sm">
        <h2 className="text-base font-semibold text-neutral-900">Información del torneo y equipo</h2>
        <p><b>Tipo de registro:</b> {source === "registration" ? "Inscripción" : "Equipo"}</p>
        <p><b>Nombre del equipo:</b> {entry.nameTeam || entry.name || group.nombre || "Sin nombre"}</p>
        <p><b>Grupo:</b> {group.nombre || entry.groupLabel || entry.groupId}</p>
        <p><b>Jugadores permitidos:</b> min {tournament.minPlayers} / max {tournament.maxPlayers}</p>
        {source === "team" && entry.registrationId && <p><b>Registration ID:</b> {entry.registrationId}</p>}
      </article>

      <article className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-neutral-900">Integrantes del equipo</h2>
          <div className="text-sm text-neutral-700 flex items-center gap-2">
            <span>{selectedCount} seleccionados</span>
            <span>{isCountValid ? "✅" : "⚠️"}</span>
          </div>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay integrantes para mostrar.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const inTeam = entry.playerIds?.includes(member.id);

              return (
                <li key={member.id} className="rounded-lg border border-neutral-200 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar nombre={member.nombre} photoURL={member.photoURL || null} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{member.nombre || member.id}</p>
                      <p className="text-xs text-neutral-500 truncate">
                        {(member.posicionesPreferidas && member.posicionesPreferidas.length > 0)
                          ? member.posicionesPreferidas.join(", ")
                          : "Sin posiciones preferidas"}
                      </p>
                    </div>
                  </div>

                  <ActionButton
                    onClick={() => togglePlayer(member.id)}
                    loading={saving === member.id}
                    disabled={(!inTeam && selectedCount >= Number(tournament.maxPlayers || 0)) || (inTeam && selectedCount <= Number(tournament.minPlayers || 0))}
                    variant={inTeam ? "danger_outline" : "success_outline"}
                    compact
                  >
                    {inTeam ? "- quitar" : "+ agregar"}
                  </ActionButton>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      {source === "registration" && (
        <article className="relative rounded-xl border border-neutral-200 bg-white p-5 space-y-2 text-sm">

          <span
            className={`absolute top-4 right-4 text-xs rounded-full px-2 py-1 ${paymentStatusClass[paymentStatus]}`}
          >
            {paymentStatusLabel[paymentStatus]}
          </span>

          <h2 className="text-base font-semibold text-neutral-900">
            Pago de inscripción
          </h2>

          <p>
            <b>Pago por jugador:</b> ${Number(tournament.paymentForPlayer || 0)}
          </p>

          <p>
            <b>Monto total:</b> ${storedExpectedAmount}
          </p>

          <p>
            <b>Pagado:</b> ${paidAmount}
          </p>

          <p>
            <b>Falta pagar:</b> ${pendingAmount}
          </p>

        </article>
      )}
    </section>
  );
}
