
// -------------------
// Status Pill
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

const variants: Record<StatusVariant, { desktop: string; mobile: string; dot: string }> = {
  warning: {
    desktop: "border border-slate-200/80 bg-slate-100/90 text-slate-700 hover:bg-slate-200",
    mobile: "border border-slate-200/80 bg-slate-100/90 text-slate-700",
    dot: "bg-amber-500",
  },
  success: {
    desktop: "border border-slate-200/80 bg-slate-100/90 text-slate-700 hover:bg-slate-200",
    mobile: "border border-slate-200/80 bg-slate-100/90 text-slate-700",
    dot: "bg-emerald-500",
  },
  info: {
    desktop: "border border-slate-200/80 bg-slate-100/90 text-slate-700 hover:bg-slate-200",
    mobile: "border border-slate-200/80 bg-slate-100/90 text-slate-700",
    dot: "bg-sky-500",
  },
  danger: {
    desktop: "border border-slate-200/80 bg-slate-100/90 text-slate-700 hover:bg-slate-200",
    mobile: "border border-slate-200/80 bg-slate-100/90 text-slate-700",
    dot: "bg-rose-500",
  },
  neutral: {
    desktop: "border border-slate-200/80 bg-slate-100/90 text-slate-700 hover:bg-slate-200",
    mobile: "border border-slate-200/80 bg-slate-100/90 text-slate-700",
    dot: "bg-slate-500",
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
    "inline-flex items-center justify-center rounded-full font-medium transition whitespace-nowrap shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

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
        <span className="mr-1.5 inline-flex items-center" aria-hidden="true">
          <span
            className={`h-2.5 w-2.5 rounded-full ${cfg.dot} motion-safe:animate-pulse motion-reduce:animate-none`}
          />
        </span>
        <span>{label}</span>
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
