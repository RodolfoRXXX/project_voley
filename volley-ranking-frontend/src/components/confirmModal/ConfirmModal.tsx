"use client";

import { ActionButton } from "@/components/ui/action/ActionButton";

type Props = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "warning" | "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
};

const headerVariants = {
  default: "text-blue-600",
  danger: "text-red-600",
  warning: "text-yellow-600",
  success: "text-green-600",
};

export default function ConfirmModal({
  title = "Confirmar acción",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-neutral-200 shadow-lg p-6 space-y-4">
        <h2
          className={`text-lg font-semibold ${
            headerVariants[variant]
          }`}
        >
          {title}
        </h2>

        <p className="text-sm text-neutral-600 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end gap-2 pt-4">
          <ActionButton
            variant="secondary"
            compact
            onClick={onCancel}
          >
            {cancelText}
          </ActionButton>

          <ActionButton
            variant={
              variant === "danger"
                ? "danger"
                : variant === "success"
                ? "success"
                : variant === "warning"
                ? "warning"
                : "primary"
            }
            onClick={onConfirm}
          >
            {confirmText}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
