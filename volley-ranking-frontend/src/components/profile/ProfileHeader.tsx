"use client";

import UserAvatar from "@/components/ui/avatar/UserAvatar";
import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import { UserDoc } from "@/types/User";

type Props = {
  user: UserDoc;
  onToggleEdit?: () => void;
  isEditing?: boolean;
};

function getCommitmentPill(value: number): { label: string; variant: StatusVariant } {
  if (value >= 3) {
    return { label: "🤝 Compromiso alto", variant: "success" };
  }

  if (value < 0) {
    return { label: "🤝 Compromiso bajo", variant: "danger" };
  }

  return { label: "🤝 Compromiso normal", variant: "warning" };
}

export default function ProfileHeader({ user, onToggleEdit, isEditing = false }: Props) {
  const roleLabel = user.roles === "admin" ? "Administrador" : "Jugador";
  const roleVariant: StatusVariant =
    user.roles === "admin" ? "warning" : "success";
  const commitment = getCommitmentPill(user.estadoCompromiso ?? 0);

  return (
    <section
      className="
        relative
        bg-white
        rounded-md
        p-6
        border border-neutral-200
        flex flex-col sm:flex-row
        items-center sm:items-start
        gap-6
      "
    >
      {onToggleEdit && (
        <button
          type="button"
          onClick={onToggleEdit}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          aria-label="Editar perfil"
          title="Editar perfíl"
        >
          ✏️
        </button>
      )}

      <UserAvatar
        nombre={user.nombre}
        photoURL={user.photoURL}
        size={112}
        className="ring-2 ring-orange-200"
      />

      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-2xl font-semibold tracking-tight">
          {user.nombre}
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          {user.email}
        </p>

        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-3">
          <StatusPill label={roleLabel} variant={roleVariant} />
          <StatusPill label={commitment.label} variant={commitment.variant} />
        </div>

        <div className="mt-3 flex flex-wrap justify-center sm:justify-start items-center gap-2">
          {(user.posicionesPreferidas || []).map((position) => (
            <span
              key={position}
              className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
            >
              {position}
            </span>
          ))}
        </div>

        {user.createdAt && (
          <p className="text-xs text-gray-400 mt-4">
            Miembro desde{" "}
            {user.createdAt.toDate().toLocaleDateString("es-AR")}
          </p>
        )}
      </div>
    </section>
  );
}
