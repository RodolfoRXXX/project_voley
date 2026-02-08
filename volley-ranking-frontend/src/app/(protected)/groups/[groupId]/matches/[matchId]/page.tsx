
// -------------------
// DETALLE DE UN MATCH
// -------------------

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
import { formatForDateTimeLocal } from "@/lib/date";
import { useAction } from "@/components/ui/action/useAction";
import { ActionButton } from "@/components/ui/action/ActionButton";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import TeamsModal from "@/components/teamsModal/TeamsModal";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import PagoModal from "@/components/pagoModal/pagoModal";
import MatchHeader from "@/components/matchDetail/MatchHeader";
import MatchInfoCard from "@/components/matchDetail/MatchInfoCard";
import MatchEditForm from "@/components/matchDetail/MatchEditForm";
import MatchPositions from "@/components/matchDetail/MatchPositions";
import PlayersTable from "@/components/matchDetail/PlayersTable";
import MatchActions from "@/components/matchDetail/MatchActions";
import type { Match } from "@/types/match";

/* =====================
   Firebase functions
===================== */
const functions = getFunctions(app);
const getFormaciones = httpsCallable(functions, "getFormaciones");
const joinMatch = httpsCallable(functions, "joinMatch");
const leaveMatch = httpsCallable(functions, "leaveMatch");
const cerrarMatchFn = httpsCallable(functions, "cerrarMatch");
const eliminarMatchFn = httpsCallable(functions, "eliminarMatch");
const reabrirMatchFn = httpsCallable(functions, "reabrirMatch");
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
   Types
===================== */

type Group = {
  id: string;
  nombre: string;
  descripcion?: string;
};

/* =====================
   Pagos Estilos
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
   FUNCTION
===================== */

export default function MatchDetailPage() {
  const { run, isLoading } = useAction();
  const { showToast } = useToast();
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const { firebaseUser, userDoc, loading: authLoading } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [participations, setParticipations] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [pagoModal, setPagoModal] = useState<null | any>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);

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
    await updatePagoEstadoFn({ participationId, estado });
    setPagoModal(null);
  };

  /* =====================
     Guards
  ===================== */
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, authLoading, router]);

  /* =====================
     Load formaciones
  ===================== */
  useEffect(() => {
  const loadFormaciones = async () => {
    try {
      const res: any = await getFormaciones();
      setFormaciones(res.data.formaciones);
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudieron cargar las formaciones");
    }
  };

  loadFormaciones();
}, [showToast]);

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
        adminId: data.adminId,
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
        horaInicio: data.horaInicio
          ? formatForDateTimeLocal(data.horaInicio)
          : "",
      });
    });

    return () => unsub();
  }, [matchId, router]);

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
}, [match?.adminId]);

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

  const handleToggleParticipation = () => {
  if (!match || !firebaseUser) return;

  if (isJoined) {
    run(
      "leave",
      () => leaveMatch({ matchId: match.id }),
      {
        confirm: {
          message: "¿Querés abandonar el partido?",
          confirmText: "Abandonar",
          variant: "danger",
        },
        successMessage: "Saliste del partido",
        errorMessage: "No se pudo salir del partido",
      }
    );
  } else {
    run(
      "join",
      () => joinMatch({ matchId: match.id }),
      {
        successMessage: "Te uniste al partido",
        errorMessage: "No se pudo unir al partido",
      }
    );
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
  const handleSave = () => {
    if (!match) return;

    run(
      "save-match",
      async () => {
        const posicionesObjetivo = calcularPosicionesObjetivo(
          formData.formacion,
          formData.cantidadEquipos
        );

        const fn = httpsCallable(functions, "editMatch");
        const date = new Date(formData.horaInicio);
        const horaInicioMillis = date.getTime();

        await fn({
          matchId: match.id,
          cantidadEquipos: formData.cantidadEquipos,
          cantidadSuplentes: formData.cantidadSuplentes,
          formacion: formData.formacion,
          horaInicioMillis,
        });

        setMatch({
          ...match,
          ...formData,
          posicionesObjetivo,
          horaInicio: new Date(formData.horaInicio),
        });

        setEditMode(false);
      },
      {
        successMessage: "Match actualizado correctamente",
        errorMessage: "No se pudo guardar el match",
      }
    );
  };

  if (authLoading || !match) return <p>Cargando...</p>;

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

  /* =====================
    HANDLERS
  ===================== */

  // Eliminar jugador

  const handleEliminarJugador = (participationId: string) => {
    run(
      "remove",
      async () => {
        await eliminarJugadorFn({ participationId });
      },
      {
        confirm: {
          message: "¿Eliminar jugador del partido?",
        },
        successMessage: "El jugador se ha eliminado correctamente",
        errorMessage: "No se pudo eliminar al jugador",
      }
    );
  };

  // Reincorporar jugador

  const handleReincorporarJugador = (participationId: string) => {
    run(
      "insert",
      async () => {
        await reincorporarJugadorFn({ participationId });
      },
      {
        confirm: {
          message: "¿Reincorporar jugador al partido?",
        },
        successMessage: "El jugador se ha reincorporado correctamente",
        errorMessage: "No se pudo reincorporar al jugador",
      }
    );
  };

  // Reabrir Match

  const handleReabrirMatch = () => {
    if (!match) return;

    run(
      "reopen",
      async () => {
        await reabrirMatchFn({ matchId: match.id });
      },
      {
        confirm: {
          message: "¿Reabrir el juego? Volverá a estado abierto.",
        },
        successMessage: "Juego reabierto correctamente",
        errorMessage: "No se pudo reabrir el juego",
      }
    );
  };

  // Cerrar Match

  const handleCerrarMatch = () => {
    if (!match) return;

    run(
      "close",
      async () => {
        await cerrarMatchFn({ matchId: match.id });
      },
      {
        confirm: {
          message: "¿Desea cerrar el juego?",
        },
        successMessage: "Juego cerrado correctamente",
        errorMessage: "No se pudo cerrar el juego",
      }
    );
  };

  // Eliminar Match

  const handleEliminarMatch = () => {
    if (!match) return;

    run(
      "cancel",
      async () => {
        await eliminarMatchFn({ matchId: match.id });
      },
      {
        confirm: {
          message: "¿Cancelar el juego? No se podrá volver a abrir.",
        },
        successMessage: "Juego cancelado correctamente",
        errorMessage: "No se pudo cancelar el juego",
      }
    );
  };

  /* =====================
     Render
  ===================== */
  return (
  <main className="max-w-4xl mx-auto mt-10 space-y-8">

    {/* ================== TITULO ================== */}

    <MatchHeader
      match={match}
      group={group}
    />

    {/* ================= DETALLES ================= */}

    <MatchInfoCard
      match={match}
      adminUser={adminUser}
    />

    {/* =============== EDITAR MATCH =============== */}

    {isAdmin &&
      !["jugado", "cancelado", "cerrado"].includes(match.estado) && (
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

          <MatchEditForm
            editMode={editMode}
            setEditMode={setEditMode}
            formData={formData}
            setFormData={setFormData}
            formaciones={formaciones}
            onSave={handleSave}
            loading={isLoading("save-match")}
          />
        </section>
    )}

    {/* ============ CUPOS POR POSICION ============ */}

    <MatchPositions
      posiciones={match.posicionesObjetivo}
      ocupados={ocupadosPorPosicion}
    />

    {/* ================= TITULARES ================= */}

    <section>
      {titulares.length === 0 ? (
        <><h2 className="text-xl font-semibold mb-3">Titulares</h2><p className="text-gray-500">Todavía no hay titulares.</p></>
      ) : (
        <PlayersTable
          title="Titulares"
          players={titulares}
          columns="grid-cols-5"
          highlightUserId={firebaseUser?.uid}
          usersMap={usersMap}
          renderHeader={() => (
            <>
              <span>Ranking</span>
              <span>Nombre</span>
              <span>Posición</span>
              <span>Pago</span>
              {isAdmin && <span></span>}
            </>
          )}
          renderRow={(p, isMe) => (
            <>
              <span>{p.rankingTitular}</span>

              <span className="flex items-center gap-2">
                <UserAvatar
                  nombre={usersMap[p.userId]?.nombre}
                  photoURL={usersMap[p.userId]?.photoURL}
                  size={28}
                />
                <span>
                  {usersMap[p.userId]?.nombre ?? "—"}
                  {isMe && (
                    <span className="ml-1 text-xs text-blue-600">(vos)</span>
                  )}
                </span>
              </span>

              <span className="capitalize">{p.posicionAsignada}</span>

              <button
                disabled={!isAdmin}
                onClick={() => setPagoModal(p)}
                className={`px-2 py-1 rounded text-xs font-semibold ${pagoColor(
                  p.pagoEstado
                )}`}
              >
                {p.pagoEstado}
              </button>

              {isAdmin && (
                <ActionButton
                  round
                  variant="danger"
                  loading={isLoading("remove")}
                  disabled={match.estado === "jugado"}
                  onClick={() => handleEliminarJugador(p.id)}
                >
                  ×
                </ActionButton>
              )}
            </>
          )}
        />
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
      {suplentes.length === 0 ? (
        <><h2 className="text-xl font-semibold mb-3">Suplentes</h2><p className="text-gray-500">Todavía no hay suplentes.</p></>
      ) : (
        <PlayersTable
          title="Suplentes"
          players={suplentes}
          columns="grid-cols-4"
          highlightUserId={firebaseUser?.uid}
          usersMap={usersMap}
          renderHeader={() => (
            <>
              <span>Ranking</span>
              <span>Nombre</span>
              <span>Posición</span>
              <span>Pago</span>
            </>
          )}
          renderRow={(p, isMe) => (
            <>
              <span>{p.rankingSuplente}</span>

              <span className="flex items-center gap-2">
                <UserAvatar
                  nombre={usersMap[p.userId]?.nombre}
                  photoURL={usersMap[p.userId]?.photoURL}
                  size={28}
                />
                <span>
                  {usersMap[p.userId]?.nombre ?? "—"}
                  {isMe && (
                    <span className="ml-1 text-xs text-orange-600">(vos)</span>
                  )}
                </span>
              </span>

              <span className="text-xs text-gray-500">
                {usersMap[p.userId]?.posicionesPreferidas?.join(", ")}
              </span>

              <button
                disabled={!isAdmin}
                onClick={() => setPagoModal(p)}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  pagoStyles[p.pagoEstado]
                }`}
              >
                {p.pagoEstado}
              </button>
            </>
          )}
        />
      )}
    </section>

    {/* ================= ELIMINADOS ================ */}

    <section>
      {eliminados.length === 0 ? (
        <><h2 className="text-xl font-semibold mb-3">Eliminados</h2><p className="text-gray-500">No hay jugadores eliminados.</p></>
      ) : (
        <PlayersTable
          title="Eliminados"
          players={eliminados}
          columns="grid-cols-5"
          usersMap={usersMap}
          renderHeader={() => (
            <>
              <span>Nombre</span>
              <span>Posiciones</span>
              <span>Ranking</span>
              <span>Pago</span>
              {isAdmin && <span></span>}
            </>
          )}
          renderRow={(p) => (
            <>
              <span className="flex items-center gap-2">
                <UserAvatar
                  nombre={usersMap[p.userId]?.nombre}
                  photoURL={usersMap[p.userId]?.photoURL}
                  size={28}
                />
                <span>{usersMap[p.userId]?.nombre ?? "—"}</span>
              </span>

              <span className="text-xs text-gray-500">
                {usersMap[p.userId]?.posicionesPreferidas?.join(", ")}
              </span>

              <span>—</span>
              <span className="capitalize">{p.pagoEstado}</span>

              {isAdmin && (
                <ActionButton
                  round
                  variant="success"
                  loading={isLoading("insert")}
                  disabled={
                    match.estado === "cancelado" ||
                    match.estado === "cerrado"
                  }
                  onClick={() => handleReincorporarJugador(p.id)}
                >
                  +
                </ActionButton>
              )}
            </>
          )}
        />
      )}
    </section>

    {/* ================== ACCIONES ================= */}

    <MatchActions
      isAdmin={isAdmin}
      isJoined={isJoined}
      isEliminado={isEliminado}
      match={match}
      hayPagosPendientes={hayPagosPendientes}
      loadingJoinLeave={isLoading("join") || isLoading("leave")}
      onJoin={handleToggleParticipation}
      onCancel={handleEliminarMatch}
      onClose={handleCerrarMatch}
      onReopen={handleReabrirMatch}
      onTeams={() => setTeamsModalOpen(true)}
    />

    {/* ================ MODALES ================ */}

    <PagoModal
      open={!!pagoModal}
      onClose={() => setPagoModal(null)}
      participation={pagoModal}
      user={usersMap[pagoModal?.userId]}
      isAdmin={isAdmin}
      matchEstado={match.estado}
      pagoStyles={pagoStyles}
      onUpdatePago={updatePagoEstado}
    />

    <TeamsModal
      open={teamsModalOpen}
      onClose={() => setTeamsModalOpen(false)}
      matchId={matchId}
      usersMap={usersMap}
      participations={Object.fromEntries(
        participations.map((p) => [
          p.userId,
          { position: p.posicionAsignada || "" }
        ])
      )}
      isAdmin={isAdmin}
      matchEstado={match.estado} 
    />

  </main>
);
}
