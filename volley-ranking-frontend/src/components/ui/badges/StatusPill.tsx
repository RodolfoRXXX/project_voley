"use client";

type StatusVariant =
  | "warning"
  | "success"
  | "info"
  | "danger"
  | "neutral";

type Props = {
  label: string;
  variant?: StatusVariant;
  icon?: string;
  onClick?: () => void;
};

const variants: Record<
  StatusVariant,
  {
    desktop: string;
    mobile: string;
  }
> = {
  warning: {
    desktop: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    mobile: "bg-yellow-100 text-yellow-700",
  },
  success: {
    desktop: "bg-green-100 text-green-800 hover:bg-green-200",
    mobile: "bg-green-100 text-green-700",
  },
  info: {
    desktop: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    mobile: "bg-blue-100 text-blue-700",
  },
  danger: {
    desktop: "bg-red-100 text-red-800 hover:bg-red-200",
    mobile: "bg-red-100 text-red-700",
  },
  neutral: {
    desktop: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
    mobile: "bg-neutral-100 text-neutral-600",
  },
};

export default function StatusPill({
  label,
  variant = "neutral",
  icon = "•",
  onClick,
}: Props) {
  const cfg = variants[variant];

  const base =
    "inline-flex items-center justify-center transition rounded-full";

  return (
    <div className="flex justify-center">
      {/* Desktop */}
      <button
        onClick={onClick}
        className={`
          ${base}
          hidden sm:inline-flex
          px-3 py-1
          text-xs font-medium
          ${cfg.desktop}
        `}
      >
        {label}
      </button>

      {/* Mobile */}
      <button
        onClick={onClick}
        className={`
          ${base}
          sm:hidden
          h-7 w-7
          text-xs
          ${cfg.mobile}
        `}
        aria-label={label}
      >
        {icon}
      </button>
    </div>
  );
}
