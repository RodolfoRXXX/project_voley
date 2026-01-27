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
  const [loadingAction, setLoadingAction] = useState(false);
  const [miParticipacion, setMiParticipacion] = useState<any | null>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);

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
  const accionesBloqueadas = match.estado !== "abierto";


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

  const handleToggleParticipation = async () => {
    if (!userId || loadingAction) return;

    try {
      setLoadingAction(true);

      if (isJoined) {
        await leaveMatch({ matchId: match.id });
      } else {
        await joinMatch({ matchId: match.id });
      }
    } catch (err) {
      console.error("Error al unirse/desunirse", err);
    } finally {
      setLoadingAction(false);
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
          <img
            src={adminUser.photoURL || "/avatar-default.png"}
            alt={adminUser.nombre}
            className="w-6 h-6 rounded-full object-cover"
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
        {new Date(
          match.horaInicio.seconds * 1000
        ).toLocaleString()}
      </p>

      <p className="text-sm">
        Titulares: {titulares}/{titularesTotales}
      </p>

      <p className="text-sm">
        Suplentes: {suplentes}/{suplentesTotales}
      </p>

      <div className="flex gap-3 pt-2 items-center">
        <button
          onClick={handleToggleParticipation}
          disabled={
            loadingAction ||
            accionesBloqueadas ||
            isEliminado ||
            (!isJoined && lleno)
          }
          className={`px-4 py-2 rounded transition ${
            accionesBloqueadas || isEliminado
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : isJoined
              ? "border border-red-500 text-red-500"
              : "bg-green-600 text-white"
          } disabled:opacity-50`}
        >
          {accionesBloqueadas
            ? "No disponible"
            : isEliminado
            ? "Eliminado"
            : isJoined
            ? "Desunirme"
            : "Unirme"}
        </button>

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
