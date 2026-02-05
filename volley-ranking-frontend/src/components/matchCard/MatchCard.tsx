
// -------------------
// CARD DE UN MATCH
// -------------------

"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
} from "firebase/firestore";
import { db, app } from "@/lib/firebase";
import Link from "next/link";
import { getFunctions, httpsCallable } from "firebase/functions";
import MatchStatusBadge from "./MatchStatusBadge";
import { formatDateTime } from "@/lib/date";
import { useAction } from "@/components/ui/action/useAction";
import { ActionButton } from "../ui/action/ActionButton";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import UserAvatar from "@/components/ui/avatar/UserAvatar";

/* =====================
     FUNCTION
  ===================== */

export default function MatchCard({
  match,
  userId,
  groupNombre,
}: {
  match: any;
  userId?: string;
  groupNombre?: string;
}) {
  const [titulares, setTitulares] = useState(0);
  const [suplentes, setSuplentes] = useState(0);
  const { run, isLoading } = useAction();
  const [miParticipacion, setMiParticipacion] = useState<any | null>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const { showToast } = useToast();

  const valores: number[] = Object.values(match.posicionesObjetivo || {});
  const titularesTotales = valores.reduce(
    (total, value) => total + value,
    0
  );
  const suplentesTotales = match.cantidadSuplentes;

  const functions = getFunctions(app);
  const joinMatch = httpsCallable(functions, "joinMatch");
  const leaveMatch = httpsCallable(functions, "leaveMatch");
  const lleno = titulares >= titularesTotales;

  const isEliminado = miParticipacion?.estado === "eliminado";
  const isJoined = !!miParticipacion && miParticipacion.estado !== "eliminado";

  const accionesJugadorBloqueadas =
  match.estado !== "abierto" || isEliminado;

const loadingJoinLeave =
  isLoading("join") || isLoading("leave");

const puedeUnirse =
  !accionesJugadorBloqueadas &&
  !loadingJoinLeave &&
  (isJoined || !lleno);


  /* =====================
     Real-time participations
  ===================== */
  useEffect(() => {
    if (!match?.id) return;

    const q = query(
      collection(db, "participations"),
      where("matchId", "==", match.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      let t = 0;
      let s = 0;
      let mine: any = null;

      snap.docs.forEach((d) => {
        const p = d.data();

        if (p.estado === "titular") t++;
        if (p.estado === "suplente") s++;

        if (p.userId === userId) {
          mine = p;
        }
      });

      setTitulares(t);
      setSuplentes(s);
      setMiParticipacion(mine);
    });

    return () => unsubscribe();
  }, [match.id, userId]);

  /* =====================
   Admin del match
===================== */
useEffect(() => {
  if (!match?.adminId) return;

  const ref = doc(db, "users", match.adminId);

  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    setAdminUser(snap.data());
  });

  return () => unsub();
}, [match.adminId]);

  /* =====================
     Join / Leave
  ===================== */

  const handleToggleParticipation = () => {
    if (!userId) return;

    if (isJoined) {
      run(
        "leave",
        async () => {
          try {
            await leaveMatch({ matchId: match.id });
          } catch (err: any) {
            handleFirebaseError(
              err,
              showToast,
              "No se pudo salir del partido"
            );
            throw err;
          }
        },
        {
          confirm: {
            message: "¿Querés abandonar el partido?",
            confirmText: "Abandonar",
            variant: "danger",
          },
          successMessage: "Saliste del partido"
        }
      );
    } else {
      run(
        "join",
        async () => {
          try {
            await joinMatch({ matchId: match.id });
          } catch (err: any) {
            handleFirebaseError(
              err,
              showToast,
              "No se pudo unir al partido"
            );
            throw err; // 🔑 para que useAction sepa que falló
          }
        },
        {
          successMessage: "Te uniste al partido"
        }
      );
    }
  };

  /* =====================
     RENDER
  ===================== */

  return (
    <div className="relative border rounded p-4 space-y-2">
        {/* BADGE ESTADO */}
      <div className="absolute top-2 right-2">
        <MatchStatusBadge estado={match.estado} />
      </div>
      <p className="font-semibold">
        <b>{groupNombre ?? "—"}</b>
      </p>

      {adminUser && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UserAvatar
            nombre={adminUser.nombre}
            photoURL={adminUser.photoURL}
            size={24}
            className="ring-1 ring-blue-500"
          />
          <span>
            Admin: <b>{adminUser.nombre}</b>
          </span>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Formación – {match.formacion}
      </p>

      <p className="text-sm text-gray-600">
        {formatDateTime(match.horaInicio)}
      </p>

      <p className="text-sm">
        Titulares: {titulares}/{titularesTotales}
      </p>

      <p className="text-sm">
        Suplentes: {suplentes}/{suplentesTotales}
      </p>

      <div className="flex gap-3 pt-2 items-center">
      <ActionButton
        onClick={handleToggleParticipation}
        loading={loadingJoinLeave}
        disabled={!puedeUnirse}
        variant={isJoined ? "danger" : "success"}
      >
        {accionesJugadorBloqueadas
          ? "No disponible"
          : isEliminado
          ? "Eliminado"
          : isJoined
          ? "Desunirme"
          : "Unirme"}
      </ActionButton>

      <Link
        href={`/groups/${match.groupId}/matches/${match.id}`}
        className="text-blue-600 text-sm"
      >
        Ver detalle →
      </Link>
    </div>
    </div>
  );
}
