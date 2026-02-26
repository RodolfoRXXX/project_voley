// -------------------
// Info de un Match
// -------------------

import { formatDateTime } from "@/lib/date";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import StatusPill from "../ui/status/StatusPill";
import { matchStatusMap } from "@/components/ui/status/matchStatusMap";

type GroupAdminProfile = {
  userId: string;
  role: "owner" | "admin";
  order: number;
  nombre: string;
  photoURL?: string | null;
};

type MatchInfoCardProps = {
  match: {
    estado: string;
    horaInicio?: any;
    formacion: string;
    cantidadEquipos: number;
    cantidadSuplentes: number;
  };
  groupAdmins?: GroupAdminProfile[];
};

export default function MatchInfoCard({
  match,
  groupAdmins = [],
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
        <div>
          <p className="text-neutral-500">Formación</p>
          <p className="font-medium text-neutral-900">
            {match.formacion}
          </p>
        </div>

        <div className="grid grid-cols-2">
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
      </div>

      {groupAdmins.length > 0 && (
        <div className="pt-4 border-t border-neutral-200">
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
            Administradores del grupo
          </p>

          <div className="flex flex-wrap gap-4">
            {groupAdmins.map((admin) => (
              <div key={admin.userId} className="flex flex-col items-center w-20 text-center">
                <UserAvatar
                  nombre={admin.nombre}
                  photoURL={admin.photoURL}
                  size={44}
                />
                <p className="text-xs text-neutral-900 mt-2 leading-tight">{admin.nombre}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
