"use client";

import { useState, useRef, useEffect } from "react";
import { FilterMenu } from "@/components/ui/FilterMenu";

export type TournamentTypeFilter = "all" | "liga" | "eliminacion" | "mixto";
export type TournamentStatusFilter = "all" | "activo" | "draft" | "inscripciones_abiertas" | "inscripciones_cerradas" | "finalizado" | "cancelado";

type TournamentFiltersDropdownProps = {
  typeFilter: TournamentTypeFilter;
  statusFilter: TournamentStatusFilter;
  onTypeFilterChange: (value: TournamentTypeFilter) => void;
  onStatusFilterChange: (value: TournamentStatusFilter) => void;
};

export function TournamentFiltersDropdown({
  typeFilter,
  statusFilter,
  onTypeFilterChange,
  onStatusFilterChange,
}: TournamentFiltersDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menú de filtros"
        aria-expanded={isOpen}
        className="
          inline-flex h-9 w-9 shrink-0 items-center justify-center
          rounded-lg text-neutral-600
          hover:bg-neutral-100 hover:text-neutral-900
          transition-colors
        "
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>

      <FilterMenu isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">
              Tipo de torneo
            </label>
            <select
              value={typeFilter}
              onChange={(event) => {
                onTypeFilterChange(event.target.value as TournamentTypeFilter);
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              <option value="all">Todos</option>
              <option value="liga">Liga</option>
              <option value="eliminacion">Eliminación</option>
              <option value="mixto">Grupos y eliminatorias</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">
              Estado del torneo
            </label>
            <select
              value={statusFilter}
              onChange={(event) => {
                onStatusFilterChange(event.target.value as TournamentStatusFilter);
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              <option value="activo">Activos</option>
              <option value="all">Todos</option>
              <option value="draft">Borrador</option>
              <option value="inscripciones_abiertas">Inscripciones abiertas</option>
              <option value="inscripciones_cerradas">Inscripciones cerradas</option>
              <option value="finalizado">Finalizados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>
      </FilterMenu>
    </div>
  );
}
