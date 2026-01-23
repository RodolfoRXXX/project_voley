"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db, app } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { getFunctions, httpsCallable } from "firebase/functions";

/* =====================
   Firebase functions
===================== */
const functions = getFunctions(app);
const getFormaciones = httpsCallable(functions, "getFormaciones");
const joinMatch = httpsCallable(functions, "joinMatch");
const leaveMatch = httpsCallable(functions, "leaveMatch");

/* =====================
   Types
===================== */
type Match = {
  id: string;
  estado: string;
  horaInicio: Date | null;
  formacion: string;
  cantidadEquipos: number;
  cantidadSuplentes: number;
  posicionesObjetivo: Record<string, number>;
  groupId: string;
};

type Group = {
  id: string;
  nombre: string;
  descripcion?: string;
};

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { firebaseUser, userDoc, loading } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [participations, setParticipations] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  const [formaciones, setFormaciones] = useState<
    Record<string, Record<string, number>>
  >({});

  const [formData, setFormData] = useState({
    cantidadEquipos: 0,
    cantidadSuplentes: 0,
    formacion: "",
    horaInicio: "",
  });

  const isAdmin = userDoc?.roles === "admin";

  /* =====================
     Guards
  ===================== */
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, loading, router]);

  /* =====================
     Load formaciones
  ===================== */
  useEffect(() => {
    const loadFormaciones = async () => {
      const res: any = await getFormaciones();
      setFormaciones(res.data.formaciones);
    };
    loadFormaciones();
  }, []);

  /* =====================
     Helper
  ===================== */
  const calcularPosicionesObjetivo = (
    formacion: string,
    cantidadEquipos: number
  ) => {
    const base = formaciones[formacion];
    if (!base) return {};
    const resultado: Record<string, number> = {};
    Object.entries(base).forEach(([pos, cant]) => {
      resultado[pos] = cant * cantidadEquipos;
    });
    return resultado;
  };

  /* =====================
     Match realtime
  ===================== */
  useEffect(() => {
    if (!matchId) return;

    const ref = doc(db, "matches", matchId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        router.replace("/dashboard");
        return;
      }
      const data = snap.data();
      setMatch({
        id: snap.id,
        estado: data.estado,
        formacion: data.formacion,
        cantidadEquipos: data.cantidadEquipos,
        cantidadSuplentes: data.cantidadSuplentes,
        posicionesObjetivo: data.posicionesObjetivo,
        groupId: data.groupId,
        horaInicio: data.horaInicio?.toDate
          ? data.horaInicio.toDate()
          : null,
      });
      setFormData({
        cantidadEquipos: data.cantidadEquipos,
        cantidadSuplentes: data.cantidadSuplentes,
        formacion: data.formacion,
        horaInicio: data.horaInicio?.toDate
          ? data.horaInicio.toDate().toISOString().slice(0, 16)
          : "",
      });
    });

    return () => unsub();
  }, [matchId, router]);

  /* =====================
     Group load
  ===================== */
  useEffect(() => {
    if (!match?.groupId) return;
    const loadGroup = async () => {
      const ref = doc(db, "groups", match.groupId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setGroup({
          id: snap.id,
          nombre: snap.data().nombre,
          descripcion: snap.data().descripcion,
        });
      }
    };
    loadGroup();
  }, [match?.groupId]);

  /* =====================
     Participations realtime
  ===================== */
  useEffect(() => {
    if (!matchId) return;

    const q = query(
      collection(db, "participations"),
      where("matchId", "==", matchId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setParticipations(list);
    });

    return () => unsub();
  }, [matchId]);

  const myParticipation = participations.find(
    (p) =>
      p.userId === firebaseUser?.uid &&
      p.estado !== "eliminado"
  );
  const isJoined = !!myParticipation;

  const handleToggleParticipation = async () => {
    if (!match || !firebaseUser) return;
    if (isJoined) {
      await leaveMatch({ matchId: match.id });
    } else {
      await joinMatch({ matchId: match.id });
    }
  };

  /* =====================
     nombre participations
  ===================== */

  useEffect(() => {
    if (participations.length === 0) return;

    const userIds = Array.from(
      new Set(participations.map((p) => p.userId))
    );

    const unsubs = userIds.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        if (!snap.exists()) return;

        setUsersMap((prev) => ({
          ...prev,
          [uid]: snap.data(),
        }));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [participations]);

  /* =====================
     Save
  ===================== */
  const handleSave = async () => {
    if (!match) return;

    const posicionesObjetivo = calcularPosicionesObjetivo(
      formData.formacion,
      formData.cantidadEquipos
    );

    const fn = httpsCallable(functions, "editMatch");
    await fn({
      matchId: match.id,
      cantidadEquipos: formData.cantidadEquipos,
      cantidadSuplentes: formData.cantidadSuplentes,
      formacion: formData.formacion,
      horaInicio: formData.horaInicio,
    });

    setMatch({
      ...match,
      ...formData,
      posicionesObjetivo,
      horaInicio: new Date(formData.horaInicio),
    });
    setEditMode(false);
  };

  if (loading || !match) return <p>Cargando...</p>;

  /* =====================
    Cupos ocupados
  ===================== */
      // Titulares ordenados por ranking
  const titulares = participations
    .filter((p) => p.estado === "titular" && p.rankingTitular !== null)
    .sort((a, b) => a.rankingTitular - b.rankingTitular);

    const suplentes = participations
  .filter((p) => p.estado === "suplente" && p.rankingSuplente !== null)
  .sort((a, b) => a.rankingSuplente - b.rankingSuplente);

  // Cupos ocupados por posiciónAsignada titular
  const ocupadosPorPosicion: Record<string, number> = {};

  titulares.forEach((p) => {
    if (!p.posicionAsignada) return;

    ocupadosPorPosicion[p.posicionAsignada] =
      (ocupadosPorPosicion[p.posicionAsignada] || 0) + 1;
  });

  // Cupos ocupados por posiciónAsignada suplente
  const ocupadosPorPosicionSuplente: Record<string, number> = {};

  suplentes.forEach((p) => {
    if (!p.posicionAsignada) return;

    ocupadosPorPosicionSuplente[p.posicionAsignada] =
      (ocupadosPorPosicionSuplente[p.posicionAsignada] || 0) + 1;
  });

  /* =====================
     Render
  ===================== */
  return (
    <main className="max-w-4xl mx-auto mt-10 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">
            {group?.nombre ?? "Grupo"}
          </h1>
          {match.estado === "abierto" && (
            <span className="text-sm text-green-600">🟢 activo</span>
          )}
        </div>
        {group?.descripcion && (
          <p className="text-gray-600">{group.descripcion}</p>
        )}
      </div>

      <section className="border rounded p-4 space-y-2">
        <p><b>Formación:</b> {match.formacion}</p>
        <p><b>Equipos:</b> {match.cantidadEquipos}</p>
        <p><b>Suplentes:</b> {match.cantidadSuplentes}</p>
      </section>

      {isAdmin && match.estado !== "jugado" && (
        <section className="border rounded p-4 space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Editar match</h2>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="border px-3 py-1 rounded"
              >
                Editar
              </button>
            )}
          </div>

          {editMode && (
            <div className="grid gap-4">
              <input
                type="number"
                value={formData.cantidadEquipos}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cantidadEquipos: Number(e.target.value),
                  })
                }
                className="border px-2 py-1 rounded"
              />

              <input
                type="number"
                value={formData.cantidadSuplentes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cantidadSuplentes: Number(e.target.value),
                  })
                }
                className="border px-2 py-1 rounded"
              />

              <select
                value={formData.formacion}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    formacion: e.target.value,
                  })
                }
                className="border px-2 py-1 rounded"
              >
                {Object.keys(formaciones).map((f) => (
                  <option key={f} value={f}>
                    {f.replace("_", " ")}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                value={formData.horaInicio}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    horaInicio: e.target.value,
                  })
                }
                className="border px-2 py-1 rounded"
              />

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="bg-black text-white px-4 py-2 rounded"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="border px-4 py-2 rounded"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">
          Cupos por posición
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(match.posicionesObjetivo).map(
            ([pos, total]) => {
              const ocupados = ocupadosPorPosicion[pos] || 0;

              return (
                <div
                  key={pos}
                  className="border rounded p-3 flex justify-between"
                >
                  <span className="capitalize">{pos}</span>
                  <span>
                    {ocupados} / {total}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Titulares</h2>

        {titulares.length === 0 ? (
          <p className="text-gray-500">Todavía no hay titulares.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-100 px-3 py-2 text-sm font-semibold">
              <span>Ranking</span>
              <span>Nombre</span>
              <span>Posición</span>
              <span>Pago</span>
            </div>

            {titulares.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-4 px-3 py-2 border-t text-sm"
              >
                <span>{p.rankingTitular}</span>
                <span>
                  {usersMap[p.userId]?.nombre ?? "—"}
                </span>
                <span className="capitalize">
                  {p.posicionAsignada}
                </span>
                <span
                  className={
                    p.pagoEstado === "pago"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {p.pagoEstado}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Suplentes</h2>

        {suplentes.length === 0 ? (
          <p className="text-gray-500">Todavía no hay suplentes.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-100 px-3 py-2 text-sm font-semibold">
              <span>Ranking</span>
              <span>Nombre</span>
              <span>Posición</span>
              <span>Pago</span>
            </div>

            {suplentes.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-4 px-3 py-2 border-t text-sm"
              >
                <span>{p.rankingSuplente}</span>
                <span>
                  {usersMap[p.userId]?.nombre ?? "—"}
                </span>
                <span className="capitalize">
                  {p.posicionAsignada}
                </span>
                <span
                  className={
                    p.pagoEstado === "pago"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {p.pagoEstado}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-3">
          Acciones
        </h2>
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleToggleParticipation}
            className={`px-4 py-2 rounded ${
              isJoined
                ? "border border-red-500 text-red-500"
                : "bg-green-600 text-white"
            }`}
          >
            {isJoined ? "Desunirme" : "Unirme"}
          </button>

          {isAdmin && (
            <div className="flex gap-4">
              {match.estado === "abierto" && (
                <button className="bg-black text-white px-4 py-2 rounded">
                  Cerrar match
                </button>
              )}
              {match.estado !== "abierto" && (
                <button className="border px-4 py-2 rounded">
                  Reabrir
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
