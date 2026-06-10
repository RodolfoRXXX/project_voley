"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import MatchHeader from "@/components/matchDetail/MatchHeader";
import MatchInfoCard from "@/components/matchDetail/MatchInfoCard";
import MatchPositions from "@/components/matchDetail/MatchPositions";
import PlayersTable from "@/components/matchDetail/PlayersTable";
import ShareOptionsButton from "@/components/ui/share/ShareOptionsButton";
import { Skeleton, SkeletonSoft } from "@/components/ui/skeleton/Skeleton";
import StatusPill from "@/components/ui/status/StatusPill";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { db } from "@/lib/firebase";
import { getPublicMatchDetailUrl } from "@/lib/share/publicShareUrls";
import type { Match, MatchEstado } from "@/types/match";

type GroupAdmin = {
  userId: string;
  role: "owner" | "admin";
  order: number;
};

type Group = {
  id: string;
  nombre: string;
  descripcion?: string;
  admins?: GroupAdmin[];
};

type GroupAdminProfile = GroupAdmin & {
  nombre: string;
  photoURL?: string | null;
};

type Participation = {
  id: string;
  userId: string;
  estado?: string;
  rankingTitular?: number | null;
  rankingSuplente?: number | null;
  posicionAsignada?: string | null;
  pagoEstado?: string | null;
};

type UserProfile = {
  nombre?: string;
  photoURL?: string;
  posicionesPreferidas?: string[];
};

type FirestoreTimestampLike = {
  toDate?: () => Date;
};

function PublicMatchSkeleton() {
  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 px-4 pb-12 space-y-8">
      <SkeletonSoft className="h-4 w-32" />
      <section className="rounded-md border border-neutral-200 bg-white p-5 space-y-3">
        <Skeleton className="h-8 w-48" />
        <SkeletonSoft className="h-4 w-full max-w-lg" />
      </section>
      <section className="border border-neutral-200 bg-white p-4 space-y-4">
        <Skeleton className="h-5 w-40" />
        <SkeletonSoft className="h-20 w-full" />
      </section>
    </main>
  );
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;

  const timestamp = value as FirestoreTimestampLike | null;
  if (timestamp?.toDate) return timestamp.toDate();

  return null;
}

function normalizeMatchEstado(value: unknown): MatchEstado {
  if (
    value === "abierto" ||
    value === "verificando" ||
    value === "cerrado" ||
    value === "jugado" ||
    value === "cancelado"
  ) {
    return value;
  }

  return "abierto";
}

function mapMatch(snap: QueryDocumentSnapshot<DocumentData>, groupId: string): Match | null {
  const data = snap.data();
  const matchGroupId = typeof data.groupId === "string" ? data.groupId : "";

  if (matchGroupId !== groupId) return null;

  return {
    id: snap.id,
    estado: normalizeMatchEstado(data.estado),
    groupId: matchGroupId,
    visibility: data.visibility === "public" ? "public" : "group_only",
    formacion: typeof data.formacion === "string" ? data.formacion : "—",
    cantidadEquipos: Number(data.cantidadEquipos ?? 0),
    cantidadSuplentes: Number(data.cantidadSuplentes ?? 0),
    horaInicio: toDate(data.horaInicio),
    posicionesObjetivo:
      data.posicionesObjetivo && typeof data.posicionesObjetivo === "object"
        ? data.posicionesObjetivo as Record<string, number>
        : {},
  };
}

function mapGroup(id: string, data: DocumentData): Group {
  return {
    id,
    nombre: typeof data.nombre === "string" ? data.nombre : "Grupo",
    descripcion: typeof data.descripcion === "string" ? data.descripcion : undefined,
    admins: Array.isArray(data.admins) ? data.admins as GroupAdmin[] : [],
  };
}

function mapParticipation(snap: QueryDocumentSnapshot<DocumentData>): Participation {
  const data = snap.data();

  return {
    id: snap.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    estado: typeof data.estado === "string" ? data.estado : undefined,
    rankingTitular: typeof data.rankingTitular === "number" ? data.rankingTitular : null,
    rankingSuplente: typeof data.rankingSuplente === "number" ? data.rankingSuplente : null,
    posicionAsignada: typeof data.posicionAsignada === "string" ? data.posicionAsignada : null,
    pagoEstado: typeof data.pagoEstado === "string" ? data.pagoEstado : null,
  };
}

function formatMatchDate(date: Date) {
  const fecha = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const hora = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${fecha} · ${hora} hs`;
}

async function getUsersByIds(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const usersMap: Record<string, UserProfile> = {};

  for (let index = 0; index < uniqueIds.length; index += 10) {
    const batchIds = uniqueIds.slice(index, index + 10);
    if (batchIds.length === 0) continue;

    const usersSnap = await getDocs(
      query(collection(db, "users"), where(documentId(), "in", batchIds))
    );

    usersSnap.forEach((snap) => {
      const data = snap.data();
      usersMap[snap.id] = {
        nombre: typeof data.nombre === "string" ? data.nombre : "Sin nombre",
        photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
        posicionesPreferidas: Array.isArray(data.posicionesPreferidas)
          ? data.posicionesPreferidas.map(String)
          : [],
      };
    });
  }

  return usersMap;
}

export default function PublicMatchDetailPage() {
  const { groupId, matchId } = useParams<{ groupId: string; matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [groupAdminProfiles, setGroupAdminProfiles] = useState<GroupAdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMatch = async () => {
      if (!groupId || !matchId) return;

      try {
        setLoading(true);
        setError(null);

        const matchSnap = await getDoc(doc(db, "matches", matchId));
        if (!matchSnap.exists()) {
          setError("Partido no encontrado");
          return;
        }

        const nextMatch = mapMatch(matchSnap, groupId);
        if (!nextMatch) {
          setError("El partido no pertenece a este grupo");
          return;
        }

        const groupSnap = await getDoc(doc(db, "groups", groupId));
        if (!groupSnap.exists()) {
          setError("Grupo no encontrado");
          return;
        }

        const nextGroup = mapGroup(groupSnap.id, groupSnap.data());
        const participationsSnap = await getDocs(
          query(collection(db, "participations"), where("matchId", "==", matchId))
        );
        const nextParticipations = participationsSnap.docs
          .map(mapParticipation)
          .filter((participation) => participation.userId);
        const adminIds = (nextGroup.admins || []).map((admin) => admin.userId);
        const nextUsersMap = await getUsersByIds([
          ...nextParticipations.map((participation) => participation.userId),
          ...adminIds,
        ]);
        const nextAdminProfiles = (nextGroup.admins || [])
          .map((admin) => ({
            ...admin,
            nombre: nextUsersMap[admin.userId]?.nombre || "Sin nombre",
            photoURL: nextUsersMap[admin.userId]?.photoURL || null,
          }))
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        setMatch(nextMatch);
        setGroup(nextGroup);
        setParticipations(nextParticipations);
        setUsersMap(nextUsersMap);
        setGroupAdminProfiles(nextAdminProfiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el partido");
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [groupId, matchId]);

  const titulares = useMemo(
    () => participations
      .filter((participation) => participation.estado === "titular")
      .sort((a, b) => (a.rankingTitular ?? 9999) - (b.rankingTitular ?? 9999)),
    [participations]
  );

  const suplentes = useMemo(
    () => participations
      .filter((participation) => participation.estado === "suplente")
      .sort((a, b) => (a.rankingSuplente ?? 9999) - (b.rankingSuplente ?? 9999)),
    [participations]
  );

  const ocupadosPorPosicion = useMemo(() => {
    return titulares.reduce<Record<string, number>>((acc, participation) => {
      if (!participation.posicionAsignada) return acc;
      acc[participation.posicionAsignada] = (acc[participation.posicionAsignada] || 0) + 1;
      return acc;
    }, {});
  }, [titulares]);

  if (loading) return <PublicMatchSkeleton />;

  if (error || !match || !group) {
    return (
      <main className="max-w-4xl mx-auto mt-6 sm:mt-10 px-4 pb-12 space-y-4">
        <Link href={`/groups/${groupId}`} className="text-sm text-neutral-600 hover:underline">
          ← Volver al grupo
        </Link>
        <section className="rounded-md border border-neutral-200 bg-white p-5 space-y-2">
          <h1 className="text-xl font-semibold text-neutral-900">No se pudo mostrar el partido</h1>
          <p className="text-sm text-neutral-600">{error || "El partido no está disponible."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 px-4 pb-12 space-y-8">
      <Link href={`/groups/${groupId}`} className="text-sm text-neutral-600 hover:underline">
        ← Volver al grupo
      </Link>

      <MatchHeader
        group={group}
        shareAction={
          <ShareOptionsButton
            buttonLabel="Compartir partido"
            copySuccessMessage="Se copió el link del partido."
            getShareUrl={() => getPublicMatchDetailUrl(groupId, matchId)}
            whatsappMessage={(url) => `¡Sumate al partido!\n${group.nombre}\n${
              match.horaInicio ? formatMatchDate(match.horaInicio) : ""
            }\n${url}`}
          />
        }
      />

      {match.visibility !== "public" ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este partido está marcado como solo grupo. Si necesitás sumarte o gestionarlo,
          ingresá con tu cuenta desde el detalle privado.
        </section>
      ) : null}

      <MatchInfoCard match={match} groupAdmins={groupAdminProfiles} />
      <MatchPositions posiciones={match.posicionesObjetivo} ocupados={ocupadosPorPosicion} />

      <PlayersTable
        title="Titulares"
        players={titulares}
        columns="grid-cols-[1fr_80px] sm:grid-cols-[72px_1fr_128px_96px]"
        usersMap={usersMap}
        renderHeader={() => (
          <>
            <span className="hidden sm:block">Ranking</span>
            <span>Nombre</span>
            <span className="hidden sm:block">Posición</span>
            <span className="flex justify-center">Pago</span>
          </>
        )}
        renderRow={(participation) => (
          <>
            <span className="hidden sm:block text-sm text-neutral-500">
              {participation.rankingTitular ?? "—"}
            </span>
            <span className="flex items-center gap-2">
              <UserAvatar
                nombre={usersMap[participation.userId]?.nombre}
                photoURL={usersMap[participation.userId]?.photoURL}
                size={28}
              />
              <span>{usersMap[participation.userId]?.nombre ?? "—"}</span>
            </span>
            <span className="hidden sm:block capitalize">
              {participation.posicionAsignada || "—"}
            </span>
            <div className="flex justify-center">
              <StatusPill
                label={participation.pagoEstado === "confirmado" ? "Confirmado" : "Pendiente"}
                variant={participation.pagoEstado === "confirmado" ? "success" : "warning"}
                icon={participation.pagoEstado === "confirmado" ? "✓" : "$"}
                responsive
              />
            </div>
          </>
        )}
      />

      <PlayersTable
        title="Suplentes"
        players={suplentes}
        columns="grid-cols-[1fr_80px] sm:grid-cols-[72px_1fr_128px_96px]"
        usersMap={usersMap}
        renderHeader={() => (
          <>
            <span className="hidden sm:block">Ranking</span>
            <span>Nombre</span>
            <span className="hidden sm:block">Posiciones</span>
            <span className="flex justify-center">Pago</span>
          </>
        )}
        renderRow={(participation) => (
          <>
            <span className="hidden sm:block text-sm text-neutral-500">
              {participation.rankingSuplente ?? "—"}
            </span>
            <span className="flex items-center gap-2">
              <UserAvatar
                nombre={usersMap[participation.userId]?.nombre}
                photoURL={usersMap[participation.userId]?.photoURL}
                size={28}
              />
              <span>{usersMap[participation.userId]?.nombre ?? "—"}</span>
            </span>
            <span className="hidden sm:block text-xs capitalize text-neutral-500">
              {usersMap[participation.userId]?.posicionesPreferidas?.join(", ") || "—"}
            </span>
            <div className="flex justify-center">
              <StatusPill
                label={participation.pagoEstado === "confirmado" ? "Confirmado" : "Pendiente"}
                variant={participation.pagoEstado === "confirmado" ? "success" : "warning"}
                icon={participation.pagoEstado === "confirmado" ? "✓" : "$"}
                responsive
              />
            </div>
          </>
        )}
      />

      <section className="rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        Para anotarte, modificar tu participación o gestionar pagos, ingresá desde tu cuenta.
      </section>
    </main>
  );
}
