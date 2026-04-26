"use client";

import PreferredPositionsEditor from "./PreferredPositionsEditor";

type Props = {
  posicionesPreferidas: string[];
  role: "player" | "admin";
  onClose: () => void;
};

export default function EditionProfile({ posicionesPreferidas, role, onClose }: Props) {
  return (
    <section
      id="edicion-perfil-usuario"
      className="
        bg-white
        border border-neutral-200
        rounded-md
        p-6
        space-y-4
      "
    >
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span className="text-base">✏️</span>
        Edición del perfil del usuario
      </h2>

      <PreferredPositionsEditor
        initial={posicionesPreferidas || []}
        initialRole={role}
        onClose={onClose}
      />
    </section>
  );
}
