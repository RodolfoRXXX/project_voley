"use client";

import Image from "next/image";
import CompromisoBadge from "./CompromisoBadge";

import { UserDoc } from "@/types/User";

type Props = {
  user: UserDoc;
};

export default function ProfileHeader({ user }: Props) {
  return (
    <section className="flex items-center gap-6 border rounded p-6">
      {/* Avatar */}
      {/*<Image
        src={user.photoURL || "/avatar-placeholder.png"}
        alt="Avatar"
        width={112}
        height={112}
        className="rounded-full object-cover"
      /> */}

      <img
        src={user.photoURL || "/avatar-placeholder.png"}
        alt="Avatar"
        className="w-28 h-28 rounded-full object-cover"
        />

      {/* Info */}
      <div className="flex-1">
        <h2 className="text-2xl font-bold">{user.nombre}</h2>
        <p className="text-gray-600">{user.email}</p>

        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 text-xs rounded bg-gray-200">
            {user.roles}
          </span>
          <CompromisoBadge value={user.estadoCompromiso ?? 0} />
        </div>

        {user.createdAt && (
          <p className="text-xs text-gray-500 mt-2">
            Miembro desde{" "}
            {user.createdAt.toDate().toLocaleDateString("es-AR")}
          </p>
        )}
      </div>
    </section>
  );
}
