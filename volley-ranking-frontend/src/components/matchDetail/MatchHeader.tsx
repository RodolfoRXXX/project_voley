
// -------------------
// Header del Match
// -------------------

import type { ReactNode } from "react";

type MatchHeaderProps = {
  group: {
    nombre: string;
    descripcion?: string;
  } | null;
  shareAction?: ReactNode;
};

export default function MatchHeader({ group, shareAction }: MatchHeaderProps) {

  return (
    <header className="rounded-md border border-neutral-200 bg-white p-5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {group?.nombre ?? "Grupo"}
          </h1>

          {group?.descripcion && (
            <p className="text-gray-600 max-w-2xl">
              {group.descripcion}
            </p>
          )}
        </div>
        {shareAction}
      </div>
    </header>
  );
}
