"use client";

type Props = {
  label?: string;
  index?: number;

  editable?: boolean;

  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;

  options?: string[];
  onSelect?: (value: string) => void;

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
  options,
  onSelect,
  isPlaceholder,
  disabled,
}: Props) {
  /* =====================
     Placeholder
  ===================== */
  if (isPlaceholder) {
    return (
      <div className="inline-flex items-center gap-2 border border-dashed rounded-full px-3 py-1 text-sm text-gray-500">
        <select
          disabled={disabled}
          defaultValue=""
          onChange={(e) => onSelect?.(e.target.value)}
          className="bg-transparent focus:outline-none"
        >
          <option value="" disabled>
            + Agregar posición
          </option>
          {options?.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const isPrimary = index === 1;

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm
        ${isPrimary ? "bg-blue-100 text-blue-800 font-semibold" : "bg-gray-100"}
      `}
    >
      <span>
        {isPrimary && "➤ "}
        {index}. {label}
      </span>

      {editable && (
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={onMoveUp}
            disabled={disabled}
            className="text-xs hover:text-black disabled:opacity-40"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={disabled}
            className="text-xs hover:text-black disabled:opacity-40"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            disabled={disabled}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
