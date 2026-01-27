"use client";

import PreferredPositionsEditor from "./PreferredPositionsEditor";

type Props = {
  posicionesPreferidas: string[];
};

export default function ProfileGame({
  posicionesPreferidas,
}: Props) {
  return (
    <section className="border rounded p-6 space-y-4">
      <h2 className="text-lg font-semibold">🎮 Perfil de juego</h2>

      {/* POSICIONES PREFERIDAS */}
      <div>
        <PreferredPositionsEditor
          initial={posicionesPreferidas || []}
        />
      </div>
    </section>
  );
}

