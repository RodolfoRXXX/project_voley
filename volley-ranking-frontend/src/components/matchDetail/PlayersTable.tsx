import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { ReactNode } from "react";

export type Player = {
  id: string;
  userId: string;
  [key: string]: any;
};

type PlayersTableProps<T extends Player> = {
  title: string;
  players: T[];
  columns: string; // ej: "grid-cols-5"
  highlightUserId?: string;
  usersMap: Record<
    string,
    {
      nombre?: string;
      photoURL?: string;
      posicionesPreferidas?: string[];
    }
  >;
  renderHeader: () => ReactNode;
  renderRow: (player: T, isMe: boolean) => ReactNode;
};

export default function PlayersTable<T extends Player>({
  title,
  players,
  columns,
  highlightUserId,
  usersMap,
  renderHeader,
  renderRow,
}: PlayersTableProps<T>) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {players.length === 0 ? (
        <p className="text-gray-500">No hay jugadores.</p>
      ) : (
        <div className="border rounded overflow-hidden">
          <div
            className={`grid ${columns} bg-gray-100 px-3 py-2 text-sm font-semibold`}
          >
            {renderHeader()}
          </div>

          {players.map((p) => {
            const isMe = p.userId === highlightUserId;

            return (
              <div
                key={p.id}
                className={`grid ${columns} px-3 py-2 border-t text-sm ${
                  isMe ? "bg-blue-100 font-semibold" : ""
                }`}
              >
                {renderRow(p, isMe)}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
