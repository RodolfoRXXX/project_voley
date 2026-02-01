"use client";

import { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner/spinner";

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
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex items-center justify-center gap-2
        px-4 py-2 rounded min-w-[120px]
        ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black hover:bg-gray-800"
        }
        text-white transition
      `}
    >
      {loading && <Spinner />}
      <span>{children}</span>
    </button>
  );
}
