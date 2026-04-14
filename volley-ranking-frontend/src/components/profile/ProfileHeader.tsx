"use client";

import UserAvatar from "@/components/ui/avatar/UserAvatar";
import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import { UserDoc } from "@/types/User";

type Props = {
  user: UserDoc;
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

export default function ProfileHeader({ user }: Props) {
  const roleLabel = user.roles === "admin" ? "Administrador" : "Jugador";
  const roleVariant: StatusVariant =
    user.roles === "admin" ? "warning" : "success";
  const commitment = getCommitmentPill(user.estadoCompromiso ?? 0);

  return (
    <section
      className="
        bg-white
        rounded-md
        p-6
        border border-neutral-200
        flex flex-col sm:flex-row
        items-center sm:items-start
        gap-6
      "
    >
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
