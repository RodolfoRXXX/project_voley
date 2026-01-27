"use client";

type Props = {
  label?: string;
  index?: number;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;

  // nuevo
  options?: string[];
  onSelect?: (value: string) => void;

  isPlaceholder?: boolean;
  disabled?: boolean;
};

export default function PositionBadge({
  label,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  options,
  onSelect,
  isPlaceholder,
  disabled,
}: Props) {
  if (isPlaceholder) {
    return (
      <div className="flex items-center gap-2 border border-dashed rounded px-3 py-2">
        <select
          disabled={disabled}
          defaultValue=""
          onChange={(e) => onSelect?.(e.target.value)}
          className="flex-1 border rounded px-2 py-1 text-sm"
        >
          <option value="" disabled>
            Seleccionar posición
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

  return (
    <div className="flex items-center justify-between border rounded px-3 py-2 bg-gray-50">
      <span className="text-sm font-semibold">
        {index}. {label}
      </span>

      <div className="flex items-center gap-1">
        <button onClick={onMoveUp} disabled={disabled}>↑</button>
        <button onClick={onMoveDown} disabled={disabled}>↓</button>
        <button
          onClick={onRemove}
          disabled={disabled}
          className="text-red-500"
        >
          ×
        </button>
      </div>
    </div>
  );
}
