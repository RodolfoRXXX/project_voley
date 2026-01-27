"use client";

type Props = {
  label?: string;
  index?: number;
  editable: boolean
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAdd?: () => void;
  isPlaceholder?: boolean;
  disabled?: boolean;
};

export default function PositionBadge({
  label,
  index,
  editable = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAdd,
  isPlaceholder,
}: Props) {
  /* =====================
     Placeholder (+)
  ===================== */
  if (isPlaceholder) {
    return (
      <button
        onClick={onAdd}
        className="flex items-center justify-center gap-2 border border-dashed rounded px-3 py-2 text-gray-500 hover:bg-gray-100"
      >
        ➕ Agregar posición
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between border rounded px-3 py-2 bg-gray-50">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">
          {index}. {label}
        </span>
      </div>

      {/* CONTROLES SOLO EN MODO EDICIÓN */}
      {editable && (
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            className="px-1 text-xs hover:text-blue-600"
            title="Subir prioridad"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            className="px-1 text-xs hover:text-blue-600"
            title="Bajar prioridad"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="px-1 text-xs text-red-500 hover:text-red-700"
            title="Eliminar posición"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
