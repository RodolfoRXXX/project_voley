"use client";

import { Spinner } from "@/components/ui/spinner/spinner";
import React from "react";

type Variant = "default" | "success" | "danger" | "warning";

type ActionButtonProps = {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  variant?: Variant;
  round?: boolean;
  title?: string;
  className?: string;
};

export function ActionButton({
  onClick,
  loading,
  disabled,
  children,
  variant = "default",
  round = false,
  title,
  className,
}: ActionButtonProps) {
  const base =
    "relative inline-flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed";

  const size = round
    ? "w-7 h-7 rounded-full text-sm" // 🔽 30% más chico
    : "h-9 px-3 rounded-md text-sm min-w-[120px]";

  const variants: Record<Variant, string> = {
    default: "bg-black text-white",
    success: "bg-green-600 text-white",
    danger: "bg-red-600 text-white",
    warning: "bg-yellow-500 text-black",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${base} ${size} ${variants[variant]} ${className ?? ""}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
