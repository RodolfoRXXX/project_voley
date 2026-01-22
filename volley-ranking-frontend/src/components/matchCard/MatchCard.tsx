"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

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

  const valores: number[] = Object.values(match.posicionesObjetivo || {});

  const titularesTotales = valores.reduce(
    (total, value) => total + value,
    0
  );

  const suplentesTotales = match.cantidadSuplentes;

  useEffect(() => {
    const load = async () => {
      const q = query(
        collection(db, "participations"),
        where("matchId", "==", match.id)
      );

      const snap = await getDocs(q);

      let t = 0;
      let s = 0;
      let anotado = false;

      snap.docs.forEach((d) => {
        const p = d.data();

        if (p.estado === "titular") t++;
        if (p.estado === "suplente") s++;
        if (p.userId === userId) anotado = true;
      });

      setTitulares(t);
      setSuplentes(s);
      setYaAnotado(anotado);
    };

    load();
  }, [match.id, userId]);

  const lleno = titulares >= titularesTotales;

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

      <div className="flex gap-3 pt-2">
        <button
          disabled={lleno && !yaAnotado}
          className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          {yaAnotado ? "Desunirme" : "Unirme"}
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
