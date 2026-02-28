"use client";

import { useMemo, useState } from "react";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { AddMemberModalProps, SearchableMember } from "./AddMemberModal.types";

export default function AddMemberModal({
  open,
  onClose,
  onSearch,
  onAddMember,
}: AddMemberModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  const canSearch = query.trim().length >= 2;

  const hintMessage = useMemo(() => {
    if (!canSearch) return "Escribí al menos 2 letras para buscar usuarios.";
    if (isSearching) return "Buscando usuarios...";
    if (!results.length) return "No se encontraron usuarios con ese criterio.";
    return null;
  }, [canSearch, isSearching, results.length]);

  if (!open) return null;

  const handleSearch = async (value: string) => {
    setQuery(value);
    setError(null);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const payload = await onSearch(value.trim());
      setResults(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo buscar usuarios");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (userId: string) => {
    try {
      setAddingUserId(userId);
      await onAddMember(userId);
      setQuery("");
      setResults([]);
      onClose();
    } finally {
      setAddingUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900">Agregar integrante</h2>
            <p className="text-xs text-neutral-500">Buscá usuarios por nombre para sumarlos al grupo</p>
          </div>

          <button
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-2">
          <input
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Ej: Ma, Ju, Lu..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {hintMessage && <p className="text-sm text-neutral-500">{hintMessage}</p>}
        </div>

        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {results.map((member) => (
              <li
                key={member.id}
                className="rounded-xl border border-neutral-200 p-3 text-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar nombre={member.name} photoURL={member.photoURL} size={36} />
                  <div>
                    <p className="font-medium text-neutral-900">{member.name}</p>
                    <p className="text-xs text-neutral-500">
                      {member.positions?.length
                        ? member.positions.join(" · ")
                        : member.email || "Sin posiciones cargadas"}
                    </p>
                  </div>
                </div>

                <ActionButton
                  onClick={() => handleAdd(member.id)}
                  variant="secondary"
                  compact
                  loading={addingUserId === member.id}
                  disabled={addingUserId !== null}
                >
                  + Agregar
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
