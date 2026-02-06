
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
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    if (!userId) {
      router.push("/");
      return;
    }

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

  const isLogged = !!userId;

  /* =====================
     RENDER
  ===================== */

  return (
    <div className="
      relative
      rounded-xl
      border border-neutral-200
      bg-white
      p-5
      space-y-3
      shadow-sm
      hover:shadow-md
      transition-shadow
    ">
        {/* BADGE ESTADO */}
      <div className="absolute top-3 right-3">
        <MatchStatusBadge estado={match.estado} />
      </div>
      <p className="text-lg font-semibold text-neutral-800">
        {groupNombre ?? "—"}
      </p>

      {adminUser && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <UserAvatar
            nombre={adminUser.nombre}
            photoURL={adminUser.photoURL}
            size={24}
            className="ring-1 ring-neutral-300"
          />
          <span>
            Admin: <b>{adminUser.nombre}</b>
          </span>
        </div>
      )}

      <div className="text-sm text-neutral-600 space-y-1">
        <p>
          <span className="font-medium">Formación:</span> {match.formacion}
        </p>

        <p>
          <span className="font-medium">Fecha:</span>{" "}
          {formatDateTime(match.horaInicio)}
        </p>
      </div>

      <div className="flex gap-4 text-sm text-neutral-600 pt-1">
        <p>
          Titulares: <b>{titulares}</b>/{titularesTotales}
        </p>
        <p>
          Suplentes: <b>{suplentes}</b>/{suplentesTotales}
        </p>
      </div>

      <div className="pt-4 border-t border-neutral-200">
          {!isLogged ? (
            <p className="text-sm text-gray-500 italic">
              Iniciá sesión para unirte o ver el detalle del juego
            </p>
          ) : (
            <div className="flex gap-3 items-center">
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
                className="text-sm text-orange-600 hover:underline"
              >
                Ver detalle →
              </Link>
            </div>
          )}
      </div>
    </div>
  );
}
