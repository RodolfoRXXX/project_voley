"use client";

type Props = {
  theme: "light" | "dark";
  onToggle: () => void;
  className?: string;
};

export default function ThemeSwitch({ theme, onToggle, className = "" }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
        theme === "light"
          ? "border-neutral-300 bg-white"
          : "border-slate-600 bg-slate-900"
      } ${className}`}
      aria-label="Cambiar tema"
      title={`Cambiar a modo ${theme === "light" ? "dark" : "light"}`}
      role="switch"
      aria-checked={theme === "dark"}
    >
      <span
        className={`absolute text-xs leading-none transition-all ${
          theme === "light" ? "right-1.5 text-amber-500" : "left-1.5 text-slate-400"
        }`}
        aria-hidden
      >
        {theme === "light" ? "☀️" : "🌙"}
      </span>

      <span
        className={`ml-1 h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
          theme === "light" ? "translate-x-0 bg-neutral-700" : "translate-x-7 bg-neutral-200"
        }`}
        aria-hidden
      />
    </button>
  );
}
