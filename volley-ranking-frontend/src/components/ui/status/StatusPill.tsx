
// -------------------
// Badge Pill
// -------------------

"use client";

export type StatusVariant =
  | "warning"
  | "success"
  | "info"
  | "danger"
  | "neutral";

type Size = "sm" | "md";

type Props = {
  label: string;
  variant?: StatusVariant;
  icon?: string;
  size?: Size;
  onClick?: () => void;
  inline?: boolean;
  responsive?: boolean;
};

const variants: Record<
  StatusVariant,
  { desktop: string; mobile: string }
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

const sizes: Record<Size, string> = {
  sm: "text-xs px-2.5 py-0.5",
  md: "text-sm px-3 py-1",
};

export default function StatusPill({
  label,
  variant = "neutral",
  icon = "•",
  size = "sm",
  onClick,
  inline = false,
  responsive = false,
}: Props) {
  const cfg = variants[variant];

  const base =
    "items-center justify-center rounded-full font-medium transition whitespace-nowrap";

  const Wrapper = inline ? "span" : "div";

  return (
    <Wrapper className={inline ? "" : "flex justify-center"}>
      {/* Desktop */}
      <button
        onClick={onClick}
        className={`
          ${base}
          ${responsive ? "hidden sm:inline-flex" : ""}
          ${sizes[size]}
          ${cfg.desktop}
        `}
      >
        {label}
      </button>

      {/* Mobile icon-only */}
      {responsive && (
        <button
          onClick={onClick}
          className={`
            ${base}
            inline-flex sm:hidden
            h-7 w-7 text-xs
            ${cfg.mobile}
          `}
          aria-label={label}
        >
          {icon}
        </button>
      )}
    </Wrapper>
  );
}
