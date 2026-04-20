"use client";

import { useState } from "react";

type AdminGroupOption = {
  id: string;
  nombre: string;
};

type Props = {
  open: boolean;
  groups: AdminGroupOption[];
  onClose: () => void;
  onCreateMatch: (groupId: string) => void;
  onCreateGroup: () => void;
};

export default function CreateMatchQuickActionModal({
  open,
  groups,
  onClose,
  onCreateMatch,
  onCreateGroup,
}: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState("");

  if (!open) return null;

  const disableCreateMatch = groups.length === 0 || selectedGroupId.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Crear partido</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="groupSelector" className="text-sm text-neutral-700">
            Elegí un grupo que administres
          </label>
          <select
            id="groupSelector"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
          >
            <option value="">Seleccioná un grupo</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.nombre}
              </option>
            ))}
          </select>
          {groups.length === 0 && (
            <p className="text-xs text-neutral-500">No tenés grupos creados todavía.</p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCreateGroup}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            Crear grupo
          </button>

          <button
            type="button"
            disabled={disableCreateMatch}
            onClick={() => onCreateMatch(selectedGroupId)}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            Crear partido
          </button>
        </div>
      </div>
    </div>
  );
}
