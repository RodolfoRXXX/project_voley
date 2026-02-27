"use client";

import CommitmentBadge from "./commitmentBadge";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { UserDoc } from "@/types/User";

type Props = {
  user: UserDoc;
};

export default function ProfileHeader({ user }: Props) {
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
      {/* Avatar */}
      <UserAvatar
        nombre={user.nombre}
        photoURL={user.photoURL}
        size={112}
        className="ring-2 ring-orange-200"
      />

      {/* Info */}
      <div className="flex-1 text-center sm:text-left">
        <h2 className="text-2xl font-semibold tracking-tight">
          {user.nombre}
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          {user.email}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-3">
          <span
            className="
              text-xs font-medium
              px-2.5 py-1
              rounded-full
              bg-gray-100 text-gray-700
            "
          >
            {user.roles}
          </span>

          <CommitmentBadge value={user.estadoCompromiso ?? 0} />
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
