"use client";

import { Spinner } from "@/components/ui/spinner/spinner";

type Variant = "default" | "success" | "danger" | "warning" | "primary" | "secondary";

type ActionButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  round?: boolean;
};

export function ActionButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  variant = "default",
  round = false,
}: ActionButtonProps) {
  const base =
    "h-10 min-w-[140px] px-4 flex items-center justify-center rounded transition disabled:opacity-50";

  const variants: Record<Variant, string> = {
    default: "bg-gray-800 text-white",
    success: "bg-green-600 text-white",
    danger: "bg-red-600 text-white",
    warning: "bg-yellow-500 text-black",
    primary: "bg-blue-500 text-white",
    secondary: "bg-gray-200 text-black",
  };

  const shape = round ? "rounded-full w-10 p-0" : "rounded";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${shape}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
