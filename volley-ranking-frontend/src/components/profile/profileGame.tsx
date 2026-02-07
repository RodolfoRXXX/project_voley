"use client";

import PreferredPositionsEditor from "./PreferredPositionsEditor";

type Props = {
  posicionesPreferidas: string[];
};

export default function ProfileGame({ posicionesPreferidas }: Props) {
  return (
    <section
      className="
        bg-white
        rounded-xl
        p-6
        shadow-sm
        space-y-4
      "
    >
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span className="text-base">🎮</span>
        Perfil de juego
      </h2>

      <PreferredPositionsEditor
        initial={posicionesPreferidas || []}
      />
    </section>
  );
}
