
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
} from "firebase/firestore";
import { db, app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { formatDateTime } from "@/lib/date";
import { useAction } from "@/components/ui/action/useAction";
import { ActionButton } from "../ui/action/ActionButton";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { useAuth } from "@/hooks/useAuth";
import StatusPill from "../ui/status/StatusPill";
import { matchStatusMap } from "@/components/ui/status/matchStatusMap";

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
  const { showToast } = useToast();
  const { userDoc } = useAuth();
  const isOnboarded = !!userDoc?.onboarded;
  const cfg = matchStatusMap[match.estado];

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
     Redirect Onboarding
  ===================== */

  const requireOnboarding = () => {
  if (!userId) {
    router.push("/");
    return false;
  }

  if (!isOnboarded) {
    router.push("/onboarding");
    return false;
  }

  return true;
};

  /* =====================
     Join / Leave
  ===================== */

  const handleToggleParticipation = () => {
    if (!requireOnboarding()) return;

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
    <div
      className="
        flex flex-col
        bg-white
        border border-neutral-200
        rounded-md
        px-4 py-4
        h-full
        shadow-xs
      "
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-m font-medium text-neutral-900 dark:text-[var(--foreground)] leading-tight">
            {groupNombre ?? "—"}
          </p>
          <p className="text-sm text-neutral-500 dark:text-[var(--text-muted)]">
            Formación {match.formacion}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
  <StatusPill
    label={cfg.label}
    variant={cfg.variant}
    icon={cfg.icon}
    inline
  />

  {match.visibility && (
    <StatusPill
      label={
        match.visibility === "public"
          ? "Público"
          : "Solo grupo"
      }
      variant={
        match.visibility === "public"
          ? "info"
          : "success"
      }
      inline
    />
  )}
</div>
      </div>

      {/* INFO */}
      <div className="mt-4 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
        <p>{formatDateTime(match.horaInicio)}</p>
        <p className="text-sm text-neutral-500">
          Titulares {titulares}/{titularesTotales} · Suplentes {suplentes}/{suplentesTotales}
        </p>
      </div>

      {/* FOOTER */}
      <div className="mt-auto pt-4 flex items-center gap-4">
        {!isLogged ? (
          <p className="text-sm text-neutral-400 italic">
            Iniciá sesión para unirte
          </p>
        ) : (
          <>
            <ActionButton
              onClick={handleToggleParticipation}
              disabled={!puedeUnirse}
              loading={loadingJoinLeave}
              variant={isJoined ? "danger" : "orange"}
              compact
            >
              <span className="text-lg leading-none">
                {isJoined ? "−" : "+"}
              </span>
              <span>
                {isJoined ? "Salir" : "Unirme"}
              </span>
            </ActionButton>

            <button
              onClick={() => {
                if (!requireOnboarding()) return;
                router.push(`/groups/${match.groupId}/matches/${match.id}`);
              }}
              className="text-sm text-neutral-500 dark:text-[var(--text-muted)] hover:text-neutral-800 dark:hover:text-[var(--foreground)]"
            >
              Ver detalle →
            </button>

          </>
        )}
      </div>
    </div>
  );
}
