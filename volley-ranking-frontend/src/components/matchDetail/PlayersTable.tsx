// -------------------
// Listas de un Match
// -------------------

import { ReactNode } from "react";

export type Player = {
  id: string;
  userId: string;
  [key: string]: any;
};

type PlayersTableProps<T extends Player> = {
  title: string;
  players: T[];
  columns: string;
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
  renderHeader,
  renderRow,
}: PlayersTableProps<T>) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium text-neutral-900">
        {title}
      </h2>

      {players.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No hay jugadores.
        </p>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-md overflow-hidden">
          {/* HEADER (solo desktop) */}
          <div
            className={`
              hidden sm:grid ${columns}
              px-3 py-2
              text-xs font-medium
              text-neutral-500
              border-b border-neutral-200
            `}
          >
            {renderHeader()}
          </div>

          {/* ROWS */}
          {players.map((p) => {
            const isMe = p.userId === highlightUserId;

            return (
              <div
                key={p.id}
                className={`
                  grid ${columns}
                  px-3 py-3
                  text-sm
                  items-center
                  border-b border-neutral-100
                  transition
                  ${
                    isMe
                      ? "bg-blue-50 font-medium"
                      : "hover:bg-neutral-50"
                  }
                `}
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
