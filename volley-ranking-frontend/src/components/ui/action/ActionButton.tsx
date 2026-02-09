"use client";

import { Spinner } from "@/components/ui/spinner/spinner";

type Variant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "orange"
  | "success_outline"
  | "danger_outline";

type ActionButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  round?: boolean;
  compact?: boolean;
  className?: string;
};

export function ActionButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  variant = "default",
  round = false,
  compact = false,
  className = "",
}: ActionButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium text-sm transition-all \
     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 \
     disabled:opacity-50 disabled:pointer-events-none";

  const sizes = round
  ? "h-10 w-10 rounded-full"
  : compact
    ? "h-10 px-4 rounded-full" // 👈 sin min-width
    : "h-10 min-w-[140px] px-4 rounded-full";


  const variants: Record<Variant, string> = {
    default:
      "bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-900 focus-visible:ring-gray-400",

    primary:
      "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 focus-visible:ring-blue-400",

    secondary:
      "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-300",

    success:
      "bg-green-600 text-white hover:bg-green-500 active:bg-green-700 focus-visible:ring-green-400",

    warning:
      "bg-yellow-400 text-black hover:bg-yellow-300 active:bg-yellow-500 focus-visible:ring-yellow-300",

    danger:
      "bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-400",

    danger_outline:
      "border border-red-300 text-red-600 bg-transparent hover:bg-red-50",
    
    success_outline:
      "border border-green-300 text-green-600 bg-transparent hover:bg-green-50",

    orange: 
      "bg-orange-500 text-white hover:bg-orange-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <Spinner />
      ) : (
        children
      )}
    </button>
  );
}
