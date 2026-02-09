import UserAvatar from "../ui/avatar/UserAvatar";


interface Props {
  nombre: string;
  jugadores: string[];
  usersMap: Record<string, any>;
  participations: Record<string, { position: string }>;
}

export default function TeamColumn({
  nombre,
  jugadores,
  usersMap,
  participations,
}: Props) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 bg-neutral-50">
      <div className="mb-3 pb-2 border-b border-neutral-200">
        <h3 className="font-semibold text-sm">
          {nombre}
        </h3>
      </div>

      <ul className="space-y-2">
        {jugadores.map((userId) => {
          const user = usersMap[userId];
          const participation = participations[userId];

          return (
            <li
              key={userId}
              className="flex items-center gap-2 text-sm bg-white rounded-lg px-2 py-1.5 border"
            >
              <UserAvatar
                nombre={user?.nombre || "user"}
                photoURL={user?.photoURL}
                size={28}
              />

              <span className="flex-1 text-neutral-900 truncate">
                {user?.nombre}
              </span>

              <span className="text-xs text-neutral-500">
                {participation?.position ?? "-"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
