

type Props = {
  nombre: string;
  jugadores: string[];
  usersMap: Record<string, any>;
  participations: any[];
};

const getPosicion = (uid: string, participations: any[]) =>
  participations.find(
    (p) => p.userId === uid && p.estado === "titular"
  )?.posicionAsignada;

export default function TeamColumn({
  nombre,
  jugadores,
  usersMap,
  participations,
}: Props) {
  return (
    <div className="border rounded-lg p-3">
      <h3 className="font-semibold mb-2 text-center">
        {nombre}
      </h3>

      <ul className="space-y-2">
        {jugadores.map((uid) => (
          <li
            key={uid}
            className="flex items-center gap-2 border rounded px-2 py-1 text-sm"
          >
            <img
              src={usersMap[uid]?.photoURL ?? "/avatar.png"}
              className="w-6 h-6 rounded-full"
            />
            <span className="flex-1">
              {usersMap[uid]?.nombre ?? "—"}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {getPosicion(uid, participations)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
