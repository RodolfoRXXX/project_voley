"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
};

export default function SubmitButton({
  children,
  loading = false,
  disabled = false,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded
        ${
          disabled || loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black hover:bg-gray-800"
        }
        text-white transition`}
    >
      {loading && (
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      )}
      <span>{children}</span>
    </button>
  );
}
