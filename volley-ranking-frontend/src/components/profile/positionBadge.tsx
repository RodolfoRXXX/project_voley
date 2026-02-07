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
     PLACEHOLDER
  ===================== */
  if (isPlaceholder) {
    return (
      <div className="
        inline-flex items-center gap-2
        border border-dashed border-neutral-300
        rounded-lg px-3 py-2
        text-sm text-neutral-500
        hover:border-neutral-400
      ">
        <span className="text-lg leading-none">＋</span>

        <select
          disabled={disabled}
          defaultValue=""
          onChange={(e) => onSelect?.(e.target.value)}
          className="
            bg-transparent text-sm
            focus:outline-none cursor-pointer
          "
        >
          <option value="" disabled>
            Agregar posición
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
        inline-flex items-center gap-2
        px-3 py-1.5
        rounded-lg text-sm
        border
        ${
          isPrimary
            ? "bg-blue-50 border-blue-200 text-blue-800 font-semibold"
            : "bg-neutral-100 border-neutral-200 text-neutral-700"
        }
      `}
    >
      {/* Label */}
      <span className="flex items-center gap-1">
        {isPrimary && (
          <span className="text-blue-600">★</span>
        )}
        {index}. {label}
      </span>

      {/* Controls */}
      {editable && (
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onMoveUp}
            disabled={disabled}
            className="
              w-6 h-6 rounded-full
              flex items-center justify-center
              text-xs
              text-neutral-500
              hover:bg-neutral-200 hover:text-neutral-800
              disabled:opacity-40
            "
          >
            ↑
          </button>

          <button
            onClick={onMoveDown}
            disabled={disabled}
            className="
              w-6 h-6 rounded-full
              flex items-center justify-center
              text-xs
              text-neutral-500
              hover:bg-neutral-200 hover:text-neutral-800
              disabled:opacity-40
            "
          >
            ↓
          </button>

          <button
            onClick={onRemove}
            disabled={disabled}
            className="
              w-6 h-6 rounded-full
              flex items-center justify-center
              text-xs
              text-red-500
              hover:bg-red-100 hover:text-red-700
              disabled:opacity-40
            "
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
