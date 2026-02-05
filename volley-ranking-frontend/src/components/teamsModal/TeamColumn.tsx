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
    <div className="border rounded-lg p-3">
      <h3 className="font-semibold mb-2">{nombre}</h3>

      <ul className="space-y-1">
        {jugadores.map((userId) => {
          const user = usersMap[userId];
          const participation = participations[userId];

          return (
            <li key={userId} className="flex items-center gap-2 text-sm">
              <UserAvatar
                nombre={user?.nombre || "user"}
                photoURL={user?.photoURL}
                size={28}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="flex-1">{user?.nombre}</span>
              <span className="text-gray-500">
                {participation?.position ?? "-"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
