"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db, app } from "@/lib/firebase";
import Link from "next/link";
import { getFunctions, httpsCallable } from "firebase/functions";

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
  const [yaAnotado, setYaAnotado] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const valores: number[] = Object.values(match.posicionesObjetivo || {});
  const titularesTotales = valores.reduce(
    (total, value) => total + value,
    0
  );
  const suplentesTotales = match.cantidadSuplentes;

  const functions = getFunctions(app);
  const joinMatch = httpsCallable(functions, "joinMatch");
  const leaveMatch = httpsCallable(functions, "leaveMatch");

  const isJoined = yaAnotado;
  const lleno = titulares >= titularesTotales;

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
      let anotado = false;

      snap.docs.forEach((d) => {
        const p = d.data();

        if (p.estado === "titular") t++;
        if (p.estado === "suplente") s++;
        if (
          p.userId === userId &&
          p.estado !== "eliminado"
        ) {
          anotado = true;
        }
      });

      setTitulares(t);
      setSuplentes(s);
      setYaAnotado(anotado);
    });

    return () => unsubscribe();
  }, [match.id, userId]);

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

  return (
    <div className="border rounded p-4 space-y-2">
      <p className="font-semibold">
        <b>{groupNombre ?? "—"}</b>
      </p>

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
          disabled={loadingAction || (!isJoined && lleno)}
          className={`px-4 py-2 rounded transition ${
            isJoined
              ? "border border-red-500 text-red-500"
              : "bg-green-600 text-white"
          } disabled:opacity-50`}
        >
          {isJoined ? "Desunirme" : "Unirme"}
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
