// Detalle del match

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
const cerrarMatchFn = httpsCallable(functions, "cerrarMatch");
const eliminarMatchFn = httpsCallable(functions, "eliminarMatch");
const updatePagoEstadoFn = httpsCallable(
  functions,
  "updatePagoEstado"
);
const eliminarJugadorFn = httpsCallable(
  functions,
  "eliminarJugador"
);
const reincorporarJugadorFn = httpsCallable(
  functions,
  "reincorporarJugador"
);

/* =====================
   BADGES ESTADO MATCH
===================== */

function MatchStatusBadge({ estado }: any) {
  if (estado === "abierto") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        🟢 Abierto
      </span>
    );
  }
  if (estado === "verificando") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        ✔️ Verificando
      </span>
    );
  }
  if (estado === "cerrado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        🔒 Cerrado
      </span>
    );
  }
  if (estado === "eliminado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        ❌ Eliminado
      </span>
    );
  }
  if (estado === "jugado") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        ✅ Jugado
      </span>
    );
  }

  return null;
}

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

/* =====================
   Pagos
===================== */

const pagoColor = (estado: string) => {
  switch (estado) {
    case "confirmado":
      return "bg-green-600 text-white";
    case "pendiente":
      return "bg-yellow-400 text-black";
    case "pospuesto":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-300 text-black";
  }
};

const pagoStyles: Record<string, string> = {
  confirmado: "bg-green-100 text-green-700 border-green-400",
  pendiente: "bg-yellow-100 text-yellow-700 border-yellow-400",
  pospuesto: "bg-blue-100 text-blue-700 border-blue-400",
};

/* =====================
   Eliminar jugador
===================== */

const handleEliminarJugador = async (participationId: string) => {
  if (!confirm("¿Eliminar jugador del match?")) return;

  await eliminarJugadorFn({ participationId });
};

/* =====================
   Reincorporar jugador
===================== */

const handleReincorporarJugador = async (participationId: string) => {
  if (!confirm("¿Reincorporar jugador al match?")) return;

  await reincorporarJugadorFn({ participationId });
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
  const [pagoModal, setPagoModal] = useState<null | any>(null);

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

  const updatePagoEstado = async (
    participationId: string,
    estado: "confirmado" | "pendiente" | "pospuesto"
  ) => {
    await updatePagoEstadoFn({
      participationId,
      estado,
    });

    setPagoModal(null);
  };

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
      p.userId === firebaseUser?.uid
  );

  const isEliminado = myParticipation?.estado === "eliminado";
  const isJoined = !!myParticipation && myParticipation.estado !== "eliminado";

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

  // Cupos de eliminados
  const eliminados = participations.filter(
    (p) => p.estado === "eliminado"
  );

  /* =====================
     PAGOS PENDIENTES
  ===================== */

  const titularesConPagoPendiente = titulares.filter(
    (p) =>
      p.pagoEstado !== "confirmado" &&
      p.pagoEstado !== "pospuesto"
  );

  const hayPagosPendientes = titularesConPagoPendiente.length > 0;

  const accionesJugadorBloqueadas =
  match.estado !== "abierto";

  const handleCerrarMatch = async () => {
    await cerrarMatchFn({ matchId: match.id });
  };

  const handleEliminarMatch = async () => {
    if (!confirm("¿Eliminar el match? No se jugará.")) return;
    await eliminarMatchFn({ matchId: match.id });
  };


  /* =====================
     Render
  ===================== */
  return (
  <main className="max-w-4xl mx-auto mt-10 space-y-8">

    {/* ================== TITULO ================== */}

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

    {/* ================= DETALLES ================= */}

    <section className="border rounded p-4 space-y-2">
      <p className="flex items-center gap-2">
        <span className="flex-1">
          <b>Inicio:</b>{" "}
          <span className="font-medium">
            {match.horaInicio
              ? match.horaInicio.toLocaleString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Sin definir"}
          </span>
        </span>

        <MatchStatusBadge estado={match.estado} />
      </p>

      <p><b>Formación:</b> {match.formacion}</p>
      <p><b>Equipos:</b> {match.cantidadEquipos}</p>
      <p><b>Suplentes:</b> {match.cantidadSuplentes}</p>
    </section>

    {/* =============== EDITAR MATCH =============== */}

    {isAdmin && match.estado !== "jugado" && (
      <section className="border rounded p-4 space-y-4">
        <div className="flex justify-between items-center">
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
              placeholder="Cantidad de equipos"
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
              placeholder="Cantidad de suplentes"
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

    {/* ============ CUPOS POR POSICION ============ */}

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

    {/* ================= TITULARES ================= */}

    <section>
      <h2 className="text-xl font-semibold mb-4">Titulares</h2>

      {titulares.length === 0 ? (
        <p className="text-gray-500">Todavía no hay titulares.</p>
      ) : (
        <div className="border rounded overflow-hidden">
          <div className="grid grid-cols-5 bg-gray-100 px-3 py-2 text-sm font-semibold">
            <span>Ranking</span>
            <span>Nombre</span>
            <span>Posición</span>
            <span>Pago</span>
            {isAdmin && <span></span>}
          </div>

          {titulares.map((p) => {
            const isMe = p.userId === firebaseUser?.uid;

            return (
              <div
                key={p.id}
                className={`grid grid-cols-5 px-3 py-2 border-t text-sm ${
                  isMe ? "bg-blue-100 font-semibold" : ""
                }`}
              >
                <span>{p.rankingTitular}</span>
                <span>
                  {usersMap[p.userId]?.nombre ?? "—"}
                  {isMe && (
                    <span className="ml-2 text-xs text-blue-600">(vos)</span>
                  )}
                </span>
                <span className="capitalize">
                  {p.posicionAsignada}
                </span>
                <span>
                  <button
                    disabled={!isAdmin}
                    onClick={() => setPagoModal(p)}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      pagoColor(p.pagoEstado)
                    }`}
                  >
                    {p.pagoEstado}
                  </button>
                </span>
                {isAdmin && (
                  <button
                    onClick={() => handleEliminarJugador(p.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-full border border-red-500 text-red-500 hover:bg-red-100"
                    title="Eliminar jugador"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {match.estado === "verificando" && hayPagosPendientes && (
        <p className="mt-2 text-sm text-red-600">
          Todos los titulares deben tener un pago confirmado o pospuesto
          para cerrar el match.
        </p>
      )}

    </section>

    {/* ================= SUPLENTES ================= */}

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

          {suplentes.map((p) => {
            const isMe = p.userId === firebaseUser?.uid;

            return (
              <div
                key={p.id}
                className={`grid grid-cols-4 px-3 py-2 border-t text-sm ${
                  isMe ? "bg-orange-100 font-semibold" : ""
                }`}
              >
                <span>{p.rankingSuplente}</span>
                <span>
                  {usersMap[p.userId]?.nombre ?? "—"}
                  {isMe && (
                    <span className="ml-2 text-xs text-orange-600">(vos)</span>
                  )}
                </span>
                <span className="capitalize">
                  {p.posicionAsignada ?? "—"}
                </span>
                <button
                  onClick={() => setPagoModal(p)}
                  className={`px-2 py-1 rounded text-xs font-medium border ${pagoStyles[p.pagoEstado]}`}
                >
                  {p.pagoEstado}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>

    {/* ================= ELIMINADOS ================ */}

    <section>
      <h2 className="text-xl font-semibold mb-4">
        Eliminados
      </h2>

      {eliminados.length === 0 ? (
        <p className="text-gray-500">
          No hay jugadores eliminados.
        </p>
      ) : (
        <div className="border rounded overflow-hidden">
          <div className="grid grid-cols-5 bg-gray-100 px-3 py-2 text-sm font-semibold">
            <span>Nombre</span>
            <span>Posiciones</span>
            <span>Ranking</span>
            <span>Pago</span>
            <span></span>
          </div>

          {eliminados.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-5 px-3 py-2 border-t text-sm items-center"
            >
              <span>{usersMap[p.userId]?.nombre ?? "—"}</span>
              <span className="text-xs text-gray-500">
                {usersMap[p.userId]?.posicionesPreferidas?.join(", ")}
              </span>
              <span>—</span>
              <span className="capitalize">{p.pagoEstado}</span>

              {isAdmin && (
                <button
                  onClick={() => handleReincorporarJugador(p.id)}
                  className="w-8 h-8 rounded-full bg-green-600 text-white font-bold flex items-center justify-center hover:bg-green-700"
                  title="Reincorporar jugador"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>

    {/* ================== ACCIONES ================= */}

    <section className="border-t pt-6">
      <h2 className="text-xl font-semibold mb-3">
        Acciones
      </h2>
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleToggleParticipation}
          disabled={isEliminado || accionesJugadorBloqueadas}
          className={`px-4 py-2 rounded ${
            isEliminado || accionesJugadorBloqueadas
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : isJoined
              ? "border border-red-500 text-red-500"
              : "bg-green-600 text-white"
          }`}
        >
          {accionesJugadorBloqueadas
            ? "No disponible"
            : isJoined
            ? "Desunirme"
            : "Unirme"}
        </button>

        {isAdmin && (
          <div className="flex gap-3">
            {/* ELIMINAR MATCH */}
            <button
              onClick={handleEliminarMatch}
              disabled={["eliminado", "jugado"].includes(match.estado)}
              className="border border-red-600 text-red-600 px-4 py-2 rounded disabled:opacity-50"
            >
              Eliminar match
            </button>

            {/* CIERRE / CONFIRMACIÓN */}
            {match.estado === "abierto" && (
              <button
                onClick={handleCerrarMatch}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Cerrar match
              </button>
            )}

            {match.estado === "verificando" && (
              <button
                onClick={handleCerrarMatch}
                disabled={hayPagosPendientes}
                className={`px-4 py-2 rounded ${
                  hayPagosPendientes
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white"
                }`}
              >
                Confirmar cierre
              </button>
            )}
          </div>
        )}

      </div>
    </section>

    {/* ================ MODAL PAGOS ================ */}

    {pagoModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
          <h3 className="text-xl font-semibold">
            Estado de pago
          </h3>

          {/* Info jugador */}
          <div className="text-sm space-y-1">
            <p><b>Nombre:</b> {usersMap[pagoModal.userId]?.nombre}</p>
            <p><b>Posición:</b> {pagoModal.posicionAsignada}</p>
            <p><b>Ranking:</b> {pagoModal.rankingTitular}</p>
            <p><b>Puntaje:</b> {pagoModal.puntaje}</p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-semibold">Estado actual</p>

            <div
              className={`border rounded px-3 py-2 text-sm text-center font-medium opacity-60 ${pagoStyles[pagoModal.pagoEstado]}`}
            >
              {pagoModal.pagoEstado}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Cambiar a
            </p>

            {["confirmado", "pendiente", "pospuesto"]
              .filter((e) => e !== pagoModal.pagoEstado)
              .map((estado) => (
                <button
                  key={estado}
                  onClick={() =>
                    updatePagoEstado(pagoModal.id, estado as any)
                  }
                  className={`w-full border rounded px-3 py-2 text-sm hover:opacity-80 ${pagoStyles[estado]}`}
                >
                  {estado}
                </button>
              ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setPagoModal(null)}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
  </main>
);
}
