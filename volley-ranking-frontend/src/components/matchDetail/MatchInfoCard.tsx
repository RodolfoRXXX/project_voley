
// -------------------
// Info de un Match
// -------------------

import { formatDateTime } from "@/lib/date";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import StatusPill from "../ui/status/StatusPill";
import { matchStatusMap } from "@/components/ui/status/matchStatusMap";

type MatchInfoCardProps = {
  match: {
    estado: string;
    horaInicio?: any;
    formacion: string;
    cantidadEquipos: number;
    cantidadSuplentes: number;
  };
  adminUser?: {
    nombre: string;
    photoURL?: string | null;
  } | null;
};

export default function MatchInfoCard({
  match,
  adminUser,
}: MatchInfoCardProps) {
  const cfg = matchStatusMap[match.estado];
  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Inicio
          </p>
          <p className="font-medium text-neutral-900">
            {match.horaInicio
              ? formatDateTime(match.horaInicio)
              : "Sin definir"}
          </p>
        </div>

        <StatusPill
          label={cfg.label}
          variant={cfg.variant}
          icon={cfg.icon}
          inline
        />
      </div>

      {/* DATOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <p className="text-neutral-500">Formación</p>
          <p className="font-medium text-neutral-900">
            {match.formacion}
          </p>
        </div>

        <div>
          <p className="text-neutral-500">Equipos</p>
          <p className="font-medium text-neutral-900">
            {match.cantidadEquipos}
          </p>
        </div>

        <div>
          <p className="text-neutral-500">Suplentes</p>
          <p className="font-medium text-neutral-900">
            {match.cantidadSuplentes}
          </p>
        </div>
      </div>

      {/* ADMIN */}
      {adminUser && (
        <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
          <UserAvatar
            nombre={adminUser.nombre}
            photoURL={adminUser.photoURL}
            size={32}
          />

          <div>
            <p className="text-sm font-medium text-neutral-900">
              {adminUser.nombre}
            </p>
            <p className="text-xs text-neutral-500">
              Admin del match
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

