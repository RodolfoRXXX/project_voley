"use client";

import PreferredPositionsEditor from "./PreferredPositionsEditor";

type Props = {
  posicionesPreferidas: string[];
  role: "player" | "admin";
};

export default function ProfileGame({ posicionesPreferidas, role }: Props) {
  return (
    <section
      className="
        bg-white
        border border-neutral-200
        rounded-md
        p-6
        space-y-4
      "
    >
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span className="text-base">🎮</span>
        Perfil de partido
      </h2>

      <PreferredPositionsEditor
        initial={posicionesPreferidas || []}
        initialRole={role}
      />
    </section>
  );
}
