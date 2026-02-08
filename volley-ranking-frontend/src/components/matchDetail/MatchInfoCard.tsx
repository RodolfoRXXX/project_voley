import MatchStatusBadge from "@/components/matchCard/MatchStatusBadge";
import { formatDateTime } from "@/lib/date";
import UserAvatar from "@/components/ui/avatar/UserAvatar";

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
  return (
    <section className="border rounded p-4 space-y-2">
      <p className="flex items-center gap-2">
        <span className="flex-1">
          <b>Inicio:</b>{" "}
          {match.horaInicio
            ? formatDateTime(match.horaInicio)
            : "Sin definir"}
        </span>

        <MatchStatusBadge estado={match.estado} />
      </p>

      <p><b>Formación:</b> {match.formacion}</p>
      <p><b>Equipos:</b> {match.cantidadEquipos}</p>
      <p><b>Suplentes:</b> {match.cantidadSuplentes}</p>

      {adminUser && (
        <div className="flex items-center gap-3 pt-3 border-t">
          <UserAvatar
            nombre={adminUser.nombre}
            photoURL={adminUser.photoURL}
            size={34}
          />
          <div>
            <p className="font-medium">{adminUser.nombre}</p>
            <p className="text-xs text-gray-500">Admin del match</p>
          </div>
        </div>
      )}
    </section>
  );
}
